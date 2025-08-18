import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { PageData } from '../../shared/interfaces/crawler.interface';
import { PathGenerator } from '../../shared/utils/path-generator.util';
import { METADATA_KEYS_STORAGE, FILE_TYPES } from '../../shared/constants/metadata.constants';

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
   * 保存页面数据（新的混合方案）
   */
  async savePageData(pageData: PageData, sessionId: string): Promise<string> {
    await this.initializeClient();
    
    if (!this.minioClient) {
      throw new Error('MinIO客户端未初始化');
    }
    
    try {
      const domain = PathGenerator.extractDomain(pageData.url);
      const urlPath = PathGenerator.getDirectoryPath(pageData.url);
      const basePath = PathGenerator.generatePagePath(pageData.url);
      
      // 保存页面内容文件 (index.json)
      const contentPath = `${basePath}/index.json`;
      const contentData = {
        url: pageData.url,
        title: pageData.title,
        content: pageData.content,
        metadata: pageData.metadata,
        crawledAt: new Date().toISOString(),
        sessionId: sessionId,
      };
      
      const contentBuffer = Buffer.from(JSON.stringify(contentData, null, 2), 'utf-8');
      
      await this.minioClient.putObject(
        this.bucketName,
        contentPath,
        contentBuffer,
        contentBuffer.length,
        {
          'Content-Type': 'application/json',
          [METADATA_KEYS_STORAGE.ORIGINAL_URL]: this.sanitizeMetadataValue(pageData.url),
          [METADATA_KEYS_STORAGE.SOURCE_URL]: this.sanitizeMetadataValue(pageData.url),
          [METADATA_KEYS_STORAGE.TITLE]: this.sanitizeMetadataValue(pageData.title || ''),
          [METADATA_KEYS_STORAGE.SESSION_ID]: this.sanitizeMetadataValue(sessionId),
          [METADATA_KEYS_STORAGE.CRAWLED_AT]: this.sanitizeMetadataValue(new Date().toISOString()),
          [METADATA_KEYS_STORAGE.FILE_TYPE]: FILE_TYPES.CONTENT,
        }
      );
      
      // 保存页面元数据文件 (metadata.json)
      const metadataPath = `${basePath}/metadata.json`;
      const metadataData = {
        url: pageData.url,
        title: pageData.title,
        domain: domain,
        urlPath: new URL(pageData.url).pathname,
        safePath: urlPath,
        storagePath: basePath,
        files: {
          content: 'index.json',
          screenshot: 'index.png',
          metadata: 'metadata.json'
        },
        crawledAt: new Date().toISOString(),
        sessionId: sessionId,
        depth: pageData.metadata?.depth || 0,
        parentUrl: pageData.metadata?.parentUrl || null,
        contentType: 'text/html',
        statusCode: pageData.metadata?.statusCode || 200,
        size: {
          content: contentBuffer.length,
          screenshot: 0  // 将在保存截图时更新
        }
      };
      
      const metadataBuffer = Buffer.from(JSON.stringify(metadataData, null, 2), 'utf-8');
      
      await this.minioClient.putObject(
        this.bucketName,
        metadataPath,
        metadataBuffer,
        metadataBuffer.length,
        {
          'Content-Type': 'application/json',
          [METADATA_KEYS_STORAGE.ORIGINAL_URL]: this.sanitizeMetadataValue(pageData.url),
          [METADATA_KEYS_STORAGE.SOURCE_URL]: this.sanitizeMetadataValue(pageData.url),
          [METADATA_KEYS_STORAGE.SESSION_ID]: this.sanitizeMetadataValue(sessionId),
          [METADATA_KEYS_STORAGE.FILE_TYPE]: FILE_TYPES.METADATA,
        }
      );
      
      // 更新URL索引
      await this.updateUrlIndex(pageData.url, basePath, sessionId, pageData.title);

      this.logger.log(`页面数据已保存: ${contentPath}, ${metadataPath}`);
      return contentPath;
    } catch (error) {
      this.logger.error(`保存页面数据失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存截图（新的混合方案）
   */
  async saveScreenshot(screenshot: Buffer, url: string, sessionId: string): Promise<string> {
    await this.initializeClient();
    
    if (!this.minioClient) {
      throw new Error('MinIO客户端未初始化');
    }
    
    try {
      const basePath = PathGenerator.generatePagePath(url);
      const screenshotPath = `${basePath}/index.png`;

      const metadata = {
        'Content-Type': 'image/png',
        [METADATA_KEYS_STORAGE.ORIGINAL_URL]: this.sanitizeMetadataValue(url),
        [METADATA_KEYS_STORAGE.SOURCE_URL]: this.sanitizeMetadataValue(url),
        [METADATA_KEYS_STORAGE.SESSION_ID]: this.sanitizeMetadataValue(sessionId),
        [METADATA_KEYS_STORAGE.CAPTURED_AT]: this.sanitizeMetadataValue(new Date().toISOString()),
        [METADATA_KEYS_STORAGE.FILE_TYPE]: FILE_TYPES.SCREENSHOT,
      };

      await this.minioClient.putObject(
        this.bucketName,
        screenshotPath,
        screenshot,
        screenshot.length,
        metadata,
      );
      
      // 更新元数据文件中的截图大小信息
      await this.updateScreenshotSize(url, screenshot.length);

      this.logger.log(`截图已保存: ${screenshotPath}`);
      return screenshotPath;
    } catch (error) {
      this.logger.error(`保存截图失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 保存会话元数据（新的混合方案）
   */
  async saveSessionMetadata(sessionId: string, metadata: any): Promise<string> {
    await this.initializeClient();
    
    if (!this.minioClient) {
      throw new Error('MinIO客户端未初始化');
    }
    
    try {
      // 从会话的 startUrl 中提取域名
      let domain = 'unknown-domain';
      if (metadata.session && metadata.session.startUrl) {
        domain = PathGenerator.extractDomain(metadata.session.startUrl);
      } else if (metadata.domain) {
        domain = metadata.domain;
      } else if (metadata.base_url) {
        domain = PathGenerator.extractDomain(metadata.base_url);
      }
      
      const sessionPath = PathGenerator.generateSessionPath(sessionId, domain);
      const filePath = `${sessionPath}/session-${sessionId}.json`;
      
      // 增强会话元数据
      const enhancedMetadata = {
        ...metadata,
        session_id: sessionId,
        domain: domain,
        storage_path: filePath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const jsonData = JSON.stringify(enhancedMetadata, null, 2);
      const buffer = Buffer.from(jsonData, 'utf-8');

      const objectMetadata = {
        'Content-Type': 'application/json',
        [METADATA_KEYS_STORAGE.SESSION_ID]: this.sanitizeMetadataValue(sessionId),
        [METADATA_KEYS_STORAGE.DOMAIN]: this.sanitizeMetadataValue(domain),
        [METADATA_KEYS_STORAGE.CREATED_AT]: this.sanitizeMetadataValue(new Date().toISOString()),
        [METADATA_KEYS_STORAGE.FILE_TYPE]: FILE_TYPES.SESSION,
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
   * 更新URL索引
   */
  private async updateUrlIndex(url: string, storagePath: string, sessionId: string, title?: string): Promise<void> {
    try {
      const domain = PathGenerator.extractDomain(url);
      const indexPath = PathGenerator.generateIndexPath(domain);
      const urlIndexPath = `${indexPath}/url_index.json`;
      
      // 尝试获取现有索引
      let urlIndex: any = {
        version: '1.0',
        generated_at: new Date().toISOString(),
        mappings: {}
      };
      
      try {
        const existingIndex = await this.minioClient!.getObject(this.bucketName, urlIndexPath);
        const chunks: Buffer[] = [];
        existingIndex.on('data', (chunk) => chunks.push(chunk));
        await new Promise((resolve, reject) => {
          existingIndex.on('end', resolve);
          existingIndex.on('error', reject);
        });
        const indexData = Buffer.concat(chunks).toString('utf-8');
        urlIndex = JSON.parse(indexData);
      } catch (error) {
        // 索引文件不存在，使用默认值
      }
      
      // 更新索引
      urlIndex.mappings[url] = {
        storage_path: storagePath,
        title: title || '',
        crawled_at: new Date().toISOString(),
        session_id: sessionId,
        files: {
          content: 'index.json',
          screenshot: 'index.png',
          metadata: 'metadata.json'
        }
      };
      urlIndex.generated_at = new Date().toISOString();
      
      const indexBuffer = Buffer.from(JSON.stringify(urlIndex, null, 2), 'utf-8');
      
      await this.minioClient!.putObject(
        this.bucketName,
        urlIndexPath,
        indexBuffer,
        indexBuffer.length,
        {
          'Content-Type': 'application/json',
          [METADATA_KEYS_STORAGE.DOMAIN]: this.sanitizeMetadataValue(domain),
          [METADATA_KEYS_STORAGE.FILE_TYPE]: FILE_TYPES.URL_INDEX,
        }
      );
      
      this.logger.log(`URL索引已更新: ${urlIndexPath}`);
    } catch (error) {
      this.logger.error(`更新URL索引失败: ${error.message}`);
    }
  }
  
  /**
   * 更新截图大小信息
   */
  private async updateScreenshotSize(url: string, screenshotSize: number): Promise<void> {
    try {
      const basePath = PathGenerator.generatePagePath(url);
      const metadataPath = `${basePath}/metadata.json`;
      
      // 获取现有元数据
      const existingMetadata = await this.minioClient!.getObject(this.bucketName, metadataPath);
      const chunks: Buffer[] = [];
      existingMetadata.on('data', (chunk) => chunks.push(chunk));
      await new Promise((resolve, reject) => {
        existingMetadata.on('end', resolve);
        existingMetadata.on('error', reject);
      });
      const metadataData = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      
      // 更新截图大小
      metadataData.size.screenshot = screenshotSize;
      metadataData.updated_at = new Date().toISOString();
      
      const metadataBuffer = Buffer.from(JSON.stringify(metadataData, null, 2), 'utf-8');
      
      await this.minioClient!.putObject(
        this.bucketName,
        metadataPath,
        metadataBuffer,
        metadataBuffer.length,
        {
          'Content-Type': 'application/json',
          [METADATA_KEYS_STORAGE.FILE_TYPE]: FILE_TYPES.METADATA,
        }
      );
      
    } catch (error) {
      this.logger.warn(`更新截图大小失败: ${error.message}`);
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