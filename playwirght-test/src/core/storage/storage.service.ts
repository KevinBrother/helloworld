import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { PageData } from '../../shared/interfaces/crawler.interface';
import { PathGenerator } from '../../shared/utils/path-generator.util';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client | null = null;
  private bucketName = 'crawler-pages';
  private initialized = false;

  constructor() {
    // 延迟初始化MinIO客户端
  }

  /**
   * 初始化MinIO客户端
   */
  private async initializeClient(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const endpoint = process.env.MINIO_ENDPOINT || 'minio';
    const port = parseInt(process.env.MINIO_PORT || '9000');
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin123';
    
    this.logger.log(`初始化MinIO客户端: ${endpoint}:${port}, SSL: ${useSSL}`);
    
    try {
      this.minioClient = new Minio.Client({
        endPoint: endpoint,
        port: port,
        useSSL: useSSL,
        accessKey: accessKey,
        secretKey: secretKey,
      });
      
      await this.initializeBucket();
      this.initialized = true;
      this.logger.log('MinIO客户端初始化成功');
    } catch (error) {
      this.logger.error(`MinIO客户端初始化失败: ${error.message}`);
      throw error;
    }
  }

  private async initializeBucket(): Promise<void> {
    if (!this.minioClient) {
      throw new Error('MinIO客户端未初始化');
    }
    
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`存储桶 ${this.bucketName} 创建成功`);
      } else {
        this.logger.log(`存储桶 ${this.bucketName} 已存在`);
      }
    } catch (error) {
      this.logger.error(`初始化存储桶失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存页面数据
   */
  async savePageData(pageData: PageData, sessionId: string): Promise<string> {
    await this.initializeClient();
    
    if (!this.minioClient) {
      throw new Error('MinIO客户端未初始化');
    }
    
    try {
      const urlHash = PathGenerator.generateUrlHash(pageData.url);
      const filePath = PathGenerator.generatePagePath(pageData.url, sessionId);
      const fileName = `${urlHash}.json`;
      const fullPath = `${filePath}/${fileName}`;

      // 准备要保存的数据
      const dataToSave = {
        url: pageData.url,
        title: pageData.title,
        content: pageData.content,
        metadata: pageData.metadata,
        crawledAt: new Date().toISOString(),
        sessionId: sessionId,
      };

      const jsonData = JSON.stringify(dataToSave, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');

      // 准备元数据
      const metadata = {
        'Content-Type': 'application/json',
        'X-Amz-Meta-Url': this.sanitizeMetadataValue(pageData.url),
        'X-Amz-Meta-Title': this.sanitizeMetadataValue(pageData.title || ''),
        'X-Amz-Meta-Session-Id': this.sanitizeMetadataValue(sessionId),
        'X-Amz-Meta-Crawled-At': this.sanitizeMetadataValue(new Date().toISOString()),
        'X-Amz-Meta-Url-Hash': this.sanitizeMetadataValue(urlHash),
      };

      // 上传到MinIO
      await this.minioClient.putObject(
        this.bucketName,
        fullPath,
        buffer,
        buffer.length,
        metadata,
      );

      this.logger.log(`页面数据已保存: ${fullPath}`);
      return fullPath;
    } catch (error) {
      this.logger.error(`保存页面数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存截图
   */
  async saveScreenshot(screenshot: Buffer, url: string, sessionId: string): Promise<string> {
    await this.initializeClient();
    
    if (!this.minioClient) {
      throw new Error('MinIO客户端未初始化');
    }
    
    try {
      const urlHash = PathGenerator.generateUrlHash(url);
      const filePath = PathGenerator.generateScreenshotPath(url, sessionId);
      const fileName = `${urlHash}.png`;
      const fullPath = `${filePath}/${fileName}`;

      const metadata = {
        'Content-Type': 'image/png',
        'X-Amz-Meta-Url': this.sanitizeMetadataValue(url),
        'X-Amz-Meta-Session-Id': this.sanitizeMetadataValue(sessionId),
        'X-Amz-Meta-Captured-At': this.sanitizeMetadataValue(new Date().toISOString()),
        'X-Amz-Meta-Url-Hash': this.sanitizeMetadataValue(urlHash),
      };

      await this.minioClient.putObject(
        this.bucketName,
        fullPath,
        screenshot,
        screenshot.length,
        metadata,
      );

      this.logger.log(`截图已保存: ${fullPath}`);
      return fullPath;
    } catch (error) {
      this.logger.error(`保存截图失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存会话元数据
   */
  async saveSessionMetadata(sessionId: string, metadata: any): Promise<string> {
    await this.initializeClient();
    
    if (!this.minioClient) {
      throw new Error('MinIO客户端未初始化');
    }
    
    try {
      const filePath = `sessions/${sessionId}/metadata.json`;
      const jsonData = JSON.stringify(metadata, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');

      const objectMetadata = {
        'Content-Type': 'application/json',
        'X-Amz-Meta-Session-Id': this.sanitizeMetadataValue(sessionId),
        'X-Amz-Meta-Created-At': this.sanitizeMetadataValue(new Date().toISOString()),
      };

      await this.minioClient.putObject(
        this.bucketName,
        filePath,
        buffer,
        buffer.length,
        objectMetadata,
      );

      this.logger.log(`会话元数据已保存: ${filePath}`);
      return filePath;
    } catch (error) {
      this.logger.error(`保存会话元数据失败: ${error.message}`);
      throw error;
    }
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

  /**
   * 获取MinIO客户端（用于高级操作）
   */
  async getClient(): Promise<Minio.Client> {
    await this.initializeClient();
    
    if (!this.minioClient) {
      throw new Error('MinIO客户端未初始化');
    }
    
    return this.minioClient;
  }

  /**
   * 获取存储桶名称
   */
  getBucketName(): string {
    return this.bucketName;
  }
}