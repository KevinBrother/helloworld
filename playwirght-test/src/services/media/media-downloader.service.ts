import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../core/storage/storage.service';
import { MediaFileInfo, MediaDownloadResult, MediaCrawlOptions } from '../../shared/interfaces/crawler.interface';
import { PathGenerator } from '../../shared/utils/path-generator.util';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class MediaDownloaderService {
  private readonly logger = new Logger(MediaDownloaderService.name);
  private readonly downloadQueue: MediaFileInfo[] = [];
  private readonly activeDownloads = new Set<string>();
  private readonly downloadedFiles = new Map<string, MediaFileInfo>();

  constructor(private readonly storageService: StorageService) {}

  /**
   * 批量下载媒体文件
   */
  async downloadMediaFiles(
    mediaFiles: MediaFileInfo[],
    sessionId: string,
    options: MediaCrawlOptions
  ): Promise<MediaDownloadResult[]> {
    const results: MediaDownloadResult[] = [];
    const maxConcurrent = options.concurrent || 3;
    const maxFileSize = (options.maxFileSize || 50) * 1024 * 1024; // Convert MB to bytes
    const timeout = (options.downloadTimeout || 30) * 1000; // Convert seconds to ms

    this.logger.log(`开始下载 ${mediaFiles.length} 个媒体文件，会话ID: ${sessionId}`);

    // 过滤重复文件
    const uniqueFiles = this.filterDuplicateFiles(mediaFiles);
    this.logger.log(`去重后剩余 ${uniqueFiles.length} 个文件`);

    // 分批处理
    const batches = this.createBatches(uniqueFiles, maxConcurrent);

    for (const batch of batches) {
      const batchPromises = batch.map(mediaFile => 
        this.downloadSingleFile(mediaFile, sessionId, maxFileSize, timeout)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: `下载失败: ${result.reason?.message || '未知错误'}`
          });
        }
      });
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(`媒体文件下载完成: ${successCount}/${results.length} 成功`);

    return results;
  }

  /**
   * 下载单个文件
   */
  private async downloadSingleFile(
    mediaFile: MediaFileInfo,
    sessionId: string,
    maxFileSize: number,
    timeout: number
  ): Promise<MediaDownloadResult> {
    const downloadKey = `${mediaFile.url}_${sessionId}`;
    
    if (this.activeDownloads.has(downloadKey)) {
      return {
        success: false,
        error: '文件正在下载中'
      };
    }

    this.activeDownloads.add(downloadKey);

    try {
      // 检查文件大小
      const headResponse = await axios.head(mediaFile.url, {
        timeout: timeout / 2,
        validateStatus: (status) => status < 400
      });

      const contentLength = parseInt(headResponse.headers['content-length'] || '0');
      if (contentLength > maxFileSize) {
        return {
          success: false,
          error: `文件过大: ${(contentLength / 1024 / 1024).toFixed(2)}MB > ${maxFileSize / 1024 / 1024}MB`
        };
      }

      // 下载文件
      const response = await axios.get(mediaFile.url, {
        responseType: 'arraybuffer',
        timeout,
        validateStatus: (status) => status < 400,
        maxContentLength: maxFileSize
      });

      const buffer = Buffer.from(response.data);
      const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');

      // 检查是否已存在相同文件
      const existingFile = Array.from(this.downloadedFiles.values())
        .find(file => file.md5Hash === md5Hash);
      
      if (existingFile) {
        this.logger.log(`文件已存在，跳过下载: ${mediaFile.url}`);
        return {
          success: true,
          mediaFile: existingFile
        };
      }

      // 生成存储路径
      const storagePath = this.generateStoragePath(sessionId, mediaFile, md5Hash);
      
      // 上传到MinIO
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      const metadata = {
        'Content-Type': response.headers['content-type'] || 'application/octet-stream',
        'X-Amz-Meta-Original-Url': this.sanitizeMetadataValue(mediaFile.url),
        'X-Amz-Meta-Source-Url': this.sanitizeMetadataValue(mediaFile.sourceUrl),
        'X-Amz-Meta-Media-Type': this.sanitizeMetadataValue(mediaFile.type),
        'X-Amz-Meta-File-Extension': this.sanitizeMetadataValue(mediaFile.extension),
        'X-Amz-Meta-Session-Id': this.sanitizeMetadataValue(sessionId),
        'X-Amz-Meta-Downloaded-At': this.sanitizeMetadataValue(new Date().toISOString()),
        'X-Amz-Meta-MD5-Hash': this.sanitizeMetadataValue(md5Hash),
      };
      
      await client.putObject(
        bucketName,
        storagePath,
        buffer,
        buffer.length,
        metadata
      );

      // 更新媒体文件信息
      const updatedMediaFile: MediaFileInfo = {
        ...mediaFile,
        size: buffer.length,
        downloadedAt: new Date().toISOString(),
        storagePath,
        md5Hash,
        metadata: {
          ...mediaFile.metadata,
          contentType: response.headers['content-type'],
          originalSize: contentLength
        }
      };

      this.downloadedFiles.set(downloadKey, updatedMediaFile);

      this.logger.log(`文件下载成功: ${mediaFile.fileName} -> ${storagePath}`);
      
      return {
        success: true,
        mediaFile: updatedMediaFile
      };

    } catch (error) {
      this.logger.error(`下载文件失败 ${mediaFile.url}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.activeDownloads.delete(downloadKey);
    }
  }

  /**
   * 过滤重复文件
   */
  private filterDuplicateFiles(mediaFiles: MediaFileInfo[]): MediaFileInfo[] {
    const seen = new Set<string>();
    return mediaFiles.filter(file => {
      if (seen.has(file.url)) {
        return false;
      }
      seen.add(file.url);
      return true;
    });
  }

  /**
   * 创建批次
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 生成存储路径
   */
  private generateStoragePath(
    sessionId: string,
    mediaFile: MediaFileInfo,
    md5Hash: string
  ): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const shortHash = md5Hash.substring(0, 8);
    const fileName = `${shortHash}_${mediaFile.fileName}`;
    
    return `sessions/${sessionId}/media/${mediaFile.type}/${timestamp}/${fileName}`;
  }

  /**
   * 获取下载统计
   */
  getDownloadStats(): {
    activeDownloads: number;
    totalDownloaded: number;
    queueSize: number;
  } {
    return {
      activeDownloads: this.activeDownloads.size,
      totalDownloaded: this.downloadedFiles.size,
      queueSize: this.downloadQueue.length
    };
  }

  /**
   * 清理会话相关的下载记录
   */
  cleanupSession(sessionId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, file] of this.downloadedFiles.entries()) {
      if (file.storagePath?.includes(`sessions/${sessionId}/`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.downloadedFiles.delete(key));
    this.logger.log(`清理会话 ${sessionId} 的下载记录: ${keysToDelete.length} 个文件`);
  }

  /**
   * 净化元数据值，处理特殊字符
   */
  private sanitizeMetadataValue(value: string): string {
    if (!value) return '';
    
    // 使用Base64编码来处理特殊字符
    try {
      return Buffer.from(value, 'utf-8').toString('base64');
    } catch (error) {
      this.logger.warn(`元数据值净化失败: ${error.message}`);
      return '';
    }
  }
}