import { Injectable } from '@nestjs/common';
import { FileDownloadService } from './file-download.service';
import { MinioService } from './minio.service';
import { MediaProcessingService } from './media-processing.service';

export interface MediaFile {
  id: string;
  url: string;
  originalName: string;
  fileName: string;
  filePath?: string;
  localPath?: string;
  minioPath?: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
  checksum: string;
  downloadedAt: Date;
  processedAt?: Date;
  metadata?: Record<string, any>;
}

export interface MediaDownloadOptions {
  enableDownload: boolean;
  storageType: 'local' | 'minio' | 'both';
  allowedTypes: string[];
  maxFileSize: number;
  enableProcessing: boolean;
  enableThumbnails: boolean;
  enableCompression: boolean;
  compressionQuality: number;
}

export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  sizeByType: Record<string, number>;
  downloadSuccess: number;
  downloadFailed: number;
  processingSuccess: number;
  processingFailed: number;
}

@Injectable()
export class MediaService {
  private mediaFiles = new Map<string, MediaFile>();
  private downloadQueue: string[] = [];
  private processingQueue: string[] = [];
  private stats: MediaStats = {
    totalFiles: 0,
    totalSize: 0,
    filesByType: {},
    sizeByType: {},
    downloadSuccess: 0,
    downloadFailed: 0,
    processingSuccess: 0,
    processingFailed: 0,
  };

  constructor(
    private readonly fileDownloadService: FileDownloadService,
    private readonly minioService: MinioService,
    private readonly mediaProcessingService: MediaProcessingService,
  ) {}

  async downloadMediaFile(
    url: string,
    options: MediaDownloadOptions,
  ): Promise<MediaFile | null> {
    try {
      // 检查文件类型是否允许
      const mimeType = await this.fileDownloadService.getMimeType(url);
      if (!this.isAllowedType(mimeType, options.allowedTypes)) {
        console.log(`File type ${mimeType} not allowed for URL: ${url}`);
        return null;
      }

      // 检查文件是否已存在
      const existingFile = this.findFileByUrl(url);
      if (existingFile) {
        return existingFile;
      }

      // 下载文件
      const downloadResult = await this.fileDownloadService.downloadFile(
        url,
        options.maxFileSize,
      );

      if (!downloadResult) {
        this.stats.downloadFailed++;
        return null;
      }

      // 创建媒体文件记录
      const mediaFile: MediaFile = {
        id: this.generateFileId(),
        url,
        originalName: downloadResult.originalName,
        fileName: downloadResult.fileName,
        filePath: downloadResult.filePath,
        type: this.getFileType(downloadResult.mimeType),
        mimeType: downloadResult.mimeType,
        size: downloadResult.size,
        checksum: downloadResult.checksum,
        downloadedAt: new Date(),
        metadata: downloadResult.metadata,
      };

      // 存储到MinIO（如果配置了）
      if (options.storageType === 'minio' || options.storageType === 'both') {
        const minioPath = await this.minioService.uploadFile(
          downloadResult.filePath,
          downloadResult.fileName,
          downloadResult.mimeType,
        );
        mediaFile.minioPath = minioPath || undefined;
      }

      // 添加到处理队列
      if (options.enableProcessing) {
        this.processingQueue.push(mediaFile.id);
      }

      // 保存文件记录
      this.mediaFiles.set(mediaFile.id, mediaFile);
      this.updateStats(mediaFile, 'download_success');

      // 异步处理文件
      if (options.enableProcessing) {
        this.processMediaFileAsync(mediaFile.id, options);
      }

      return mediaFile;
    } catch (error) {
      console.error(`Failed to download media file from ${url}:`, error);
      this.stats.downloadFailed++;
      return null;
    }
  }

  async downloadMultipleFiles(
    urls: string[],
    options: MediaDownloadOptions,
    concurrency = 5,
  ): Promise<MediaFile[]> {
    const results: MediaFile[] = [];
    const chunks = this.chunkArray(urls, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(url => this.downloadMediaFile(url, options));
      const chunkResults = await Promise.allSettled(promises);
      
      chunkResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });
    }

    return results;
  }

  private async processMediaFileAsync(
    fileId: string,
    options: MediaDownloadOptions,
  ): Promise<void> {
    try {
      const mediaFile = this.mediaFiles.get(fileId);
      if (!mediaFile || !mediaFile.filePath) {
        return;
      }

      // 提取媒体信息
      const mediaInfo = await this.mediaProcessingService.extractMediaInfo(
        mediaFile.filePath,
      );
      
      if (mediaInfo) {
        mediaFile.width = mediaInfo.width;
        mediaFile.height = mediaInfo.height;
        mediaFile.duration = mediaInfo.duration;
        mediaFile.metadata = { ...mediaFile.metadata, ...mediaInfo.metadata };
      }

      // 生成缩略图
      if (options.enableThumbnails && mediaFile.type === 'image') {
        const thumbnailPath = await this.mediaProcessingService.generateThumbnail(
          mediaFile.filePath,
          200,
          200,
        );
        if (thumbnailPath) {
          mediaFile.thumbnail = thumbnailPath;
        }
      }

      // 压缩文件
      if (options.enableCompression) {
        const compressedPath = await this.mediaProcessingService.compressFile(
          mediaFile.filePath,
          mediaFile.type,
          options.compressionQuality,
        );
        if (compressedPath) {
          mediaFile.filePath = compressedPath;
        }
      }

      mediaFile.processedAt = new Date();
      this.updateStats(mediaFile, 'processing_success');
    } catch (error) {
      console.error(`Failed to process media file ${fileId}:`, error);
      this.updateStats(null, 'processing_failed');
    }
  }

  private isAllowedType(mimeType: string, allowedTypes: string[]): boolean {
    if (allowedTypes.length === 0) {
      return true;
    }
    return allowedTypes.some(type => mimeType.startsWith(type));
  }

  private getFileType(mimeType: string): MediaFile['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  }

  private findFileByUrl(url: string): MediaFile | undefined {
    return Array.from(this.mediaFiles.values()).find(file => file.url === url);
  }

  private generateFileId(): string {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private updateStats(mediaFile: MediaFile | null, action: string): void {
    switch (action) {
      case 'download_success':
        if (mediaFile) {
          this.stats.totalFiles++;
          this.stats.totalSize += mediaFile.size;
          this.stats.filesByType[mediaFile.type] = (this.stats.filesByType[mediaFile.type] || 0) + 1;
          this.stats.sizeByType[mediaFile.type] = (this.stats.sizeByType[mediaFile.type] || 0) + mediaFile.size;
          this.stats.downloadSuccess++;
        }
        break;
      case 'download_failed':
        this.stats.downloadFailed++;
        break;
      case 'processing_success':
        this.stats.processingSuccess++;
        break;
      case 'processing_failed':
        this.stats.processingFailed++;
        break;
    }
  }

  // 查询方法
  getMediaFile(fileId: string): MediaFile | undefined {
    return this.mediaFiles.get(fileId);
  }

  getMediaFiles(filter?: {
    type?: MediaFile['type'];
    minSize?: number;
    maxSize?: number;
    processed?: boolean;
  }): MediaFile[] {
    let files = Array.from(this.mediaFiles.values());

    if (filter) {
      if (filter.type) {
        files = files.filter(file => file.type === filter.type);
      }
      if (filter.minSize !== undefined) {
        files = files.filter(file => file.size >= filter.minSize!);
      }
      if (filter.maxSize !== undefined) {
        files = files.filter(file => file.size <= filter.maxSize!);
      }
      if (filter.processed !== undefined) {
        files = files.filter(file => !!file.processedAt === filter.processed);
      }
    }

    return files;
  }

  getMediaStats(): MediaStats {
    return { ...this.stats };
  }

  // 管理方法
  async deleteMediaFile(fileId: string): Promise<boolean> {
    const mediaFile = this.mediaFiles.get(fileId);
    if (!mediaFile) {
      return false;
    }

    try {
      // 删除本地文件
      if (mediaFile.filePath) {
        await this.fileDownloadService.deleteFile(mediaFile.filePath);
      }

      // 删除缩略图
      if (mediaFile.thumbnail) {
        await this.fileDownloadService.deleteFile(mediaFile.thumbnail);
      }

      // 删除MinIO文件
      if (mediaFile.minioPath) {
        await this.minioService.deleteFile(mediaFile.minioPath);
      }

      // 从内存中删除
      this.mediaFiles.delete(fileId);
      
      // 更新统计
      this.stats.totalFiles--;
      this.stats.totalSize -= mediaFile.size;
      this.stats.filesByType[mediaFile.type]--;
      this.stats.sizeByType[mediaFile.type] -= mediaFile.size;

      return true;
    } catch (error) {
      console.error(`Failed to delete media file ${fileId}:`, error);
      return false;
    }
  }

  async cleanupOldFiles(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const filesToDelete = Array.from(this.mediaFiles.values())
      .filter(file => file.downloadedAt < cutoffDate);

    let deletedCount = 0;
    for (const file of filesToDelete) {
      const success = await this.deleteMediaFile(file.id);
      if (success) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  clearAllFiles(): void {
    this.mediaFiles.clear();
    this.downloadQueue = [];
    this.processingQueue = [];
    this.stats = {
      totalFiles: 0,
      totalSize: 0,
      filesByType: {},
      sizeByType: {},
      downloadSuccess: 0,
      downloadFailed: 0,
      processingSuccess: 0,
      processingFailed: 0,
    };
  }

  // 队列管理
  getDownloadQueueSize(): number {
    return this.downloadQueue.length;
  }

  getProcessingQueueSize(): number {
    return this.processingQueue.length;
  }

  clearQueues(): void {
    this.downloadQueue = [];
    this.processingQueue = [];
  }

  // 新增方法以匹配控制器需求
  async downloadFile(
    url: string,
    options?: {
      filename?: string;
      description?: string;
      tags?: string[];
    },
  ): Promise<MediaFile | null> {
    const downloadOptions: MediaDownloadOptions = {
      enableDownload: true,
      storageType: 'both',
      allowedTypes: ['image/*', 'video/*', 'audio/*', 'application/*'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      enableProcessing: true,
      enableThumbnails: true,
      enableCompression: false,
      compressionQuality: 80,
    };

    return this.downloadMediaFile(url, downloadOptions);
  }

  async getFiles(query: {
    page: number;
    limit: number;
    type?: string;
    tags?: string[];
  }): Promise<{
    files: MediaFile[];
    total: number;
    page: number;
    limit: number;
  }> {
    const allFiles = Array.from(this.mediaFiles.values());
    let filteredFiles = allFiles;

    if (query.type) {
      filteredFiles = filteredFiles.filter(file => file.type === query.type);
    }

    const total = filteredFiles.length;
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const files = filteredFiles.slice(startIndex, endIndex);

    return {
      files,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getFileById(id: string): Promise<MediaFile | null> {
    return this.mediaFiles.get(id) || null;
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.deleteMediaFile(id);
  }

  async getStats(): Promise<MediaStats> {
    return this.getMediaStats();
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: {
      description?: string;
      tags?: string[];
      isPublic?: boolean;
    },
  ): Promise<MediaFile | null> {
    try {
      // 生成文件ID和文件名
      const fileId = this.generateFileId();
      const fileName = `${fileId}_${originalName}`;
      
      // 上传到MinIO
      const minioPath = await this.minioService.uploadBuffer(
        buffer,
        fileName,
        mimeType,
      );

      if (!minioPath) {
        return null;
      }

      // 获取文件URL
      const fileUrl = await this.minioService.getFileUrl(minioPath);

      // 创建MediaFile对象
      const mediaFile: MediaFile = {
        id: fileId,
        url: fileUrl || '',
        originalName,
        fileName,
        minioPath,
        type: this.getFileType(mimeType),
        mimeType,
        size: buffer.length,
        checksum: require('crypto').createHash('md5').update(buffer).digest('hex'),
        downloadedAt: new Date(),
        metadata: {
          description: options?.description,
          tags: options?.tags || [],
          isPublic: options?.isPublic || false,
        },
      };

      this.mediaFiles.set(fileId, mediaFile);
      this.updateStats(mediaFile, 'upload');

      return mediaFile;
    } catch (error) {
      console.error('Failed to upload file:', error);
      return null;
    }
  }
}