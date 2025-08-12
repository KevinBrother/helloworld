import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MinioConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucketName: string;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  etag: string;
}

export interface FileInfo {
  name: string;
  size: number;
  lastModified: Date;
  etag: string;
  contentType: string;
}

@Injectable()
export class MinioService {
  private config: MinioConfig = {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketName: process.env.MINIO_BUCKET_NAME || 'spider-media',
  };

  private client: any = null;
  private isInitialized = false;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      // 动态导入minio客户端
      const { Client } = await import('minio');
      
      this.client = new Client({
        endPoint: this.config.endpoint,
        port: this.config.port,
        useSSL: this.config.useSSL,
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
      });

      // 确保bucket存在
      await this.ensureBucketExists();
      this.isInitialized = true;
      
      console.log('MinIO client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MinIO client:', error);
      console.warn('MinIO functionality will be disabled');
    }
  }

  private async ensureBucketExists(): Promise<void> {
    if (!this.client) return;

    try {
      const exists = await this.client.bucketExists(this.config.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.config.bucketName);
        console.log(`Created MinIO bucket: ${this.config.bucketName}`);
      }
    } catch (error) {
      console.error('Failed to ensure bucket exists:', error);
      throw error;
    }
  }

  async uploadFile(
    filePath: string,
    fileName: string,
    contentType: string,
  ): Promise<string | null> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping upload');
      return null;
    }

    try {
      // 生成唯一的对象名称
      const objectName = this.generateObjectName(fileName);
      
      // 读取文件
      const fileBuffer = await fs.readFile(filePath);
      
      // 上传文件
      const result = await this.client.putObject(
        this.config.bucketName,
        objectName,
        fileBuffer,
        fileBuffer.length,
        {
          'Content-Type': contentType,
          'X-Amz-Meta-Original-Name': fileName,
          'X-Amz-Meta-Upload-Time': new Date().toISOString(),
        },
      );

      console.log(`File uploaded to MinIO: ${objectName}`);
      return objectName;
    } catch (error) {
      console.error(`Failed to upload file to MinIO: ${fileName}`, error);
      return null;
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string | null> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping upload');
      return null;
    }

    try {
      const objectName = this.generateObjectName(fileName);
      
      await this.client.putObject(
        this.config.bucketName,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': contentType,
          'X-Amz-Meta-Original-Name': fileName,
          'X-Amz-Meta-Upload-Time': new Date().toISOString(),
        },
      );

      console.log(`Buffer uploaded to MinIO: ${objectName}`);
      return objectName;
    } catch (error) {
      console.error(`Failed to upload buffer to MinIO: ${fileName}`, error);
      return null;
    }
  }

  async downloadFile(objectName: string, localPath: string): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping download');
      return false;
    }

    try {
      await this.client.fGetObject(this.config.bucketName, objectName, localPath);
      console.log(`File downloaded from MinIO: ${objectName} -> ${localPath}`);
      return true;
    } catch (error) {
      console.error(`Failed to download file from MinIO: ${objectName}`, error);
      return false;
    }
  }

  async getFileBuffer(objectName: string): Promise<Buffer | null> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping get');
      return null;
    }

    try {
      const stream = await this.client.getObject(this.config.bucketName, objectName);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error(`Failed to get file buffer from MinIO: ${objectName}`, error);
      return null;
    }
  }

  async deleteFile(objectName: string): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping delete');
      return false;
    }

    try {
      await this.client.removeObject(this.config.bucketName, objectName);
      console.log(`File deleted from MinIO: ${objectName}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete file from MinIO: ${objectName}`, error);
      return false;
    }
  }

  async deleteFiles(objectNames: string[]): Promise<number> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping batch delete');
      return 0;
    }

    try {
      const deleteList = objectNames.map(name => ({ name }));
      await this.client.removeObjects(this.config.bucketName, deleteList);
      console.log(`Batch deleted ${objectNames.length} files from MinIO`);
      return objectNames.length;
    } catch (error) {
      console.error('Failed to batch delete files from MinIO:', error);
      return 0;
    }
  }

  async getFileInfo(objectName: string): Promise<FileInfo | null> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping stat');
      return null;
    }

    try {
      const stat = await this.client.statObject(this.config.bucketName, objectName);
      return {
        name: objectName,
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        contentType: stat.metaData['content-type'] || 'application/octet-stream',
      };
    } catch (error) {
      console.error(`Failed to get file info from MinIO: ${objectName}`, error);
      return null;
    }
  }

  async listFiles(prefix?: string, maxKeys = 1000): Promise<FileInfo[]> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping list');
      return [];
    }

    try {
      const files: FileInfo[] = [];
      const stream = this.client.listObjects(this.config.bucketName, prefix, true);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj: any) => {
          if (files.length < maxKeys) {
            files.push({
              name: obj.name,
              size: obj.size,
              lastModified: obj.lastModified,
              etag: obj.etag,
              contentType: 'application/octet-stream', // MinIO list doesn't include content-type
            });
          }
        });
        stream.on('end', () => resolve(files));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Failed to list files from MinIO:', error);
      return [];
    }
  }

  async getFileUrl(objectName: string, expirySeconds = 3600): Promise<string | null> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping presigned URL');
      return null;
    }

    try {
      const url = await this.client.presignedGetObject(
        this.config.bucketName,
        objectName,
        expirySeconds,
      );
      return url;
    } catch (error) {
      console.error(`Failed to get presigned URL for MinIO object: ${objectName}`, error);
      return null;
    }
  }

  async getUploadUrl(objectName: string, expirySeconds = 3600): Promise<string | null> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping presigned upload URL');
      return null;
    }

    try {
      const url = await this.client.presignedPutObject(
        this.config.bucketName,
        objectName,
        expirySeconds,
      );
      return url;
    } catch (error) {
      console.error(`Failed to get presigned upload URL for MinIO object: ${objectName}`, error);
      return null;
    }
  }

  private generateObjectName(fileName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(fileName);
    const name = path.basename(fileName, ext);
    
    // 组织文件路径：年/月/日/文件名
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}/${name}_${timestamp}_${random}${ext}`;
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    if (!this.isInitialized || !this.client) {
      return false;
    }

    try {
      await this.client.bucketExists(this.config.bucketName);
      return true;
    } catch {
      return false;
    }
  }

  // 获取存储统计信息
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    bucketName: string;
    isConnected: boolean;
  }> {
    if (!this.isInitialized || !this.client) {
      return {
        totalFiles: 0,
        totalSize: 0,
        bucketName: this.config.bucketName,
        isConnected: false,
      };
    }

    try {
      const files = await this.listFiles();
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      return {
        totalFiles: files.length,
        totalSize,
        bucketName: this.config.bucketName,
        isConnected: true,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        bucketName: this.config.bucketName,
        isConnected: false,
      };
    }
  }

  // 清理旧文件
  async cleanupOldFiles(olderThanDays: number): Promise<number> {
    if (!this.isInitialized || !this.client) {
      console.warn('MinIO client not initialized, skipping cleanup');
      return 0;
    }

    try {
      const files = await this.listFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const filesToDelete = files
        .filter(file => file.lastModified < cutoffDate)
        .map(file => file.name);
      
      if (filesToDelete.length > 0) {
        return await this.deleteFiles(filesToDelete);
      }
      
      return 0;
    } catch (error) {
      console.error('Failed to cleanup old files from MinIO:', error);
      return 0;
    }
  }

  // 获取配置信息（隐藏敏感信息）
  getConfig(): Omit<MinioConfig, 'accessKey' | 'secretKey'> {
    return {
      endpoint: this.config.endpoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      bucketName: this.config.bucketName,
    };
  }

  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }
}