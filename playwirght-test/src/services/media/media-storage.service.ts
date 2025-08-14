import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../core/storage/storage.service';
import { MediaFileInfo } from '../../shared/interfaces/crawler.interface';

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly mediaFiles = new Map<string, MediaFileInfo[]>();

  constructor(private readonly storageService: StorageService) {}

  /**
   * 保存媒体文件信息到会话
   */
  saveMediaFilesToSession(sessionId: string, mediaFiles: MediaFileInfo[]): void {
    const existingFiles = this.mediaFiles.get(sessionId) || [];
    const allFiles = [...existingFiles, ...mediaFiles];
    
    // 去重
    const uniqueFiles = this.removeDuplicates(allFiles);
    
    this.mediaFiles.set(sessionId, uniqueFiles);
    this.logger.log(`会话 ${sessionId} 保存了 ${mediaFiles.length} 个媒体文件，总计 ${uniqueFiles.length} 个`);
  }

  /**
   * 获取会话的媒体文件
   */
  getSessionMediaFiles(sessionId: string): MediaFileInfo[] {
    return this.mediaFiles.get(sessionId) || [];
  }

  /**
   * 获取所有会话的媒体文件统计
   */
  getAllMediaFilesStats(): {
    totalSessions: number;
    totalFiles: number;
    filesByType: Record<string, number>;
    filesBySession: Record<string, number>;
  } {
    const stats = {
      totalSessions: this.mediaFiles.size,
      totalFiles: 0,
      filesByType: {} as Record<string, number>,
      filesBySession: {} as Record<string, number>
    };

    for (const [sessionId, files] of this.mediaFiles.entries()) {
      stats.totalFiles += files.length;
      stats.filesBySession[sessionId] = files.length;

      files.forEach(file => {
        stats.filesByType[file.type] = (stats.filesByType[file.type] || 0) + 1;
      });
    }

    return stats;
  }

  /**
   * 按类型查询媒体文件
   */
  getMediaFilesByType(
    sessionId: string,
    type: 'image' | 'video' | 'audio' | 'document' | 'archive'
  ): MediaFileInfo[] {
    const files = this.mediaFiles.get(sessionId) || [];
    return files.filter(file => file.type === type);
  }

  /**
   * 按扩展名查询媒体文件
   */
  getMediaFilesByExtension(sessionId: string, extension: string): MediaFileInfo[] {
    const files = this.mediaFiles.get(sessionId) || [];
    return files.filter(file => file.extension.toLowerCase() === extension.toLowerCase());
  }

  /**
   * 搜索媒体文件
   */
  searchMediaFiles(
    sessionId: string,
    query: {
      type?: string;
      extension?: string;
      fileName?: string;
      sourceUrl?: string;
      minSize?: number;
      maxSize?: number;
    }
  ): MediaFileInfo[] {
    const files = this.mediaFiles.get(sessionId) || [];
    
    return files.filter(file => {
      if (query.type && file.type !== query.type) {
        return false;
      }
      
      if (query.extension && file.extension.toLowerCase() !== query.extension.toLowerCase()) {
        return false;
      }
      
      if (query.fileName && !file.fileName.toLowerCase().includes(query.fileName.toLowerCase())) {
        return false;
      }
      
      if (query.sourceUrl && !file.sourceUrl.toLowerCase().includes(query.sourceUrl.toLowerCase())) {
        return false;
      }
      
      if (query.minSize && file.size && file.size < query.minSize) {
        return false;
      }
      
      if (query.maxSize && file.size && file.size > query.maxSize) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 获取媒体文件下载URL
   */
  async getMediaFileDownloadUrl(sessionId: string, fileName: string): Promise<string | null> {
    const files = this.mediaFiles.get(sessionId) || [];
    const file = files.find(f => f.fileName === fileName);
    
    if (!file || !file.storagePath) {
      return null;
    }
    
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      // 生成预签名URL，有效期1小时
      const downloadUrl = await client.presignedGetObject(
        bucketName,
        file.storagePath,
        60 * 60 // 1小时
      );
      
      return downloadUrl;
    } catch (error) {
      this.logger.error(`生成下载URL失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 保存媒体文件元数据到MinIO
   */
  async saveMediaMetadata(sessionId: string): Promise<string | null> {
    const mediaFiles = this.mediaFiles.get(sessionId);
    
    if (!mediaFiles || mediaFiles.length === 0) {
      return null;
    }
    
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      const metadata = {
        sessionId,
        totalFiles: mediaFiles.length,
        filesByType: this.groupFilesByType(mediaFiles),
        files: mediaFiles,
        createdAt: new Date().toISOString()
      };
      
      const jsonData = JSON.stringify(metadata, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');
      const filePath = `sessions/${sessionId}/media-metadata.json`;
      
      const objectMetadata = {
        'Content-Type': 'application/json',
        'X-Amz-Meta-Session-Id': this.sanitizeMetadataValue(sessionId),
        'X-Amz-Meta-Total-Files': this.sanitizeMetadataValue(mediaFiles.length.toString()),
        'X-Amz-Meta-Created-At': this.sanitizeMetadataValue(new Date().toISOString()),
      };
      
      await client.putObject(
        bucketName,
        filePath,
        buffer,
        buffer.length,
        objectMetadata
      );
      
      this.logger.log(`媒体文件元数据已保存: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logger.error(`保存媒体文件元数据失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 清理会话数据
   */
  cleanupSession(sessionId: string): void {
    const deleted = this.mediaFiles.delete(sessionId);
    if (deleted) {
      this.logger.log(`清理会话 ${sessionId} 的媒体文件数据`);
    }
  }

  /**
   * 去重媒体文件
   */
  private removeDuplicates(files: MediaFileInfo[]): MediaFileInfo[] {
    const seen = new Set<string>();
    return files.filter(file => {
      const key = `${file.url}_${file.sourceUrl}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 按类型分组文件
   */
  private groupFilesByType(files: MediaFileInfo[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    files.forEach(file => {
      groups[file.type] = (groups[file.type] || 0) + 1;
    });
    
    return groups;
  }

  /**
   * 净化元数据值
   */
  private sanitizeMetadataValue(value: string): string {
    if (!value) return '';
    
    try {
      return Buffer.from(value, 'utf-8').toString('base64');
    } catch (error) {
      this.logger.warn(`元数据值净化失败: ${error.message}`);
      return '';
    }
  }
}