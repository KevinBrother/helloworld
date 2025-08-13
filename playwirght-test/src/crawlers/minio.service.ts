import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { PageData } from '../interfaces/crawler.interface';
import { STORAGE_CONFIG, PathGenerator, SessionManager } from '../config/storage.config';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private buckets = STORAGE_CONFIG.buckets;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('开始初始化 MinIO 客户端...');
    try {
      // 初始化 MinIO 客户端
      const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'minio:9000');
      const useSSLStr = this.configService.get<string>('MINIO_USE_SSL', 'false');
      const useSSL = useSSLStr === 'true';
      const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
      const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin123');
      
      this.logger.log(`MinIO 配置: endpoint=${endpoint}, useSSL=${useSSL}, accessKey=${accessKey}`);
      
      // 解析端点，分离主机和端口
      const [host, portStr] = endpoint.split(':');
      const port = portStr ? parseInt(portStr, 10) : (useSSL ? 443 : 9000);
      
      this.logger.log(`解析后的连接信息: host=${host}, port=${port}`);
      
      this.minioClient = new Minio.Client({
        endPoint: host,
        port,
        useSSL,
        accessKey,
        secretKey,
      });
      
      this.logger.log(`MinIO 客户端已创建: ${host}:${port}`);
      
      // 创建所有必需的存储桶
      await this.createBucketsIfNotExists();
      
      this.logger.log('MinIO 客户端初始化完成');
    } catch (error) {
      this.logger.error(`MinIO 初始化失败: ${error.message}`, error.stack);
      // 不要抛出错误，让应用继续运行
    }
  }

  /**
   * 创建所有必需的存储桶
   */
  private async createBucketsIfNotExists(): Promise<void> {
    const bucketNames = Object.values(this.buckets);
    
    for (const bucketName of bucketNames) {
      try {
        const bucketExists = await this.minioClient.bucketExists(bucketName);
        if (!bucketExists) {
          await this.minioClient.makeBucket(bucketName, 'us-east-1');
          this.logger.log(`存储桶已创建: ${bucketName}`);
        } else {
          this.logger.log(`存储桶已存在: ${bucketName}`);
        }
      } catch (error) {
        this.logger.error(`创建存储桶失败 ${bucketName}: ${error.message}`);
      }
    }
  }

  /**
   * 清理元数据值，移除 HTTP 头部不允许的字符
   */
  private sanitizeMetadataValue(value: string): string {
    if (!value) return '';
    // 使用 Base64 编码来处理包含特殊字符的值
    // 这样可以安全地存储任何字符，包括中文和特殊符号
    try {
      const encoded = Buffer.from(value, 'utf8').toString('base64');
      return encoded.substring(0, 200); // 限制长度
    } catch (error) {
      // 如果编码失败，返回安全的默认值
      return 'encoded-value';
    }
  }

  /**
   * 保存页面数据到 MinIO
   */
  async savePageData(pageData: PageData): Promise<boolean> {
    try {
      // 检查 MinIO 客户端是否已初始化
      if (!this.minioClient) {
        this.logger.error('MinIO 客户端未初始化，无法保存页面数据');
        return false;
      }

      const now = new Date();
      const urlHash = PathGenerator.generateUrlHash(pageData.url);
      const timestamp = PathGenerator.generateTimestamp(now);
      const sequence = SessionManager.getNextSequence();
      
      // 生成目录路径
      const directoryPath = PathGenerator.generateDirectoryPath(pageData.url, now);
      
      // 生成文件名
      const fileName = PathGenerator.generateFileName(
        STORAGE_CONFIG.naming.pageFile,
        {
          depth: pageData.metadata.depth,
          sequence,
          urlHash,
          timestamp
        }
      );
      
      const fullPath = `${directoryPath}/${fileName}`;

      // 准备要存储的数据
      const dataToStore = {
        ...pageData,
        storedAt: now.toISOString(),
        fileSize: JSON.stringify(pageData).length,
        sessionInfo: {
          sequence,
          sessionId: SessionManager.getCurrentSession()?.id,
          filePath: fullPath
        }
      };

      // 转换为 Buffer
      const dataBuffer = Buffer.from(JSON.stringify(dataToStore, null, 2), 'utf8');

      // 上传到 MinIO
      await this.minioClient.putObject(
        this.buckets.pages,
        fullPath,
        dataBuffer,
        dataBuffer.length,
        {
          'Content-Type': 'application/json',
          'X-Amz-Meta-Url': this.sanitizeMetadataValue(pageData.url),
          'X-Amz-Meta-Title': this.sanitizeMetadataValue(pageData.title),
          'X-Amz-Meta-Depth': pageData.metadata.depth.toString(),
          'X-Amz-Meta-Domain': this.sanitizeMetadataValue(PathGenerator.generateDomainPath(pageData.url)),
          'X-Amz-Meta-Sequence': sequence.toString(),
          'X-Amz-Meta-Session': SessionManager.getCurrentSession()?.id || 'unknown'
        }
      );

      // 记录文件到会话
      SessionManager.addFile(fullPath);

      this.logger.log(`页面数据已保存到 MinIO: ${fullPath}`);
      return true;
    } catch (error) {
      this.logger.error(`保存页面数据到 MinIO 失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 保存页面截图到 MinIO
   */
  async saveScreenshot(url: string, screenshotBuffer: Buffer): Promise<string | null> {
    try {
      // 检查 MinIO 客户端是否已初始化
      if (!this.minioClient) {
        this.logger.error('MinIO 客户端未初始化，无法保存截图');
        return null;
      }

      const now = new Date();
      const urlHash = PathGenerator.generateUrlHash(url);
      const timestamp = PathGenerator.generateTimestamp(now);
      const sequence = SessionManager.getNextSequence();
      
      // 生成目录路径
      const directoryPath = PathGenerator.generateDirectoryPath(url, now).replace('/pages', '/screenshots');
      
      // 生成文件名
      const fileName = PathGenerator.generateFileName(
        STORAGE_CONFIG.naming.screenshotFile,
        {
          depth: 0, // 截图不区分深度
          sequence,
          urlHash,
          timestamp
        }
      );
      
      const fullPath = `${directoryPath}/${fileName}`;

      await this.minioClient.putObject(
        this.buckets.screenshots,
        fullPath,
        screenshotBuffer,
        screenshotBuffer.length,
        {
          'Content-Type': 'image/png',
          'X-Amz-Meta-Url': this.sanitizeMetadataValue(url),
          'X-Amz-Meta-Domain': this.sanitizeMetadataValue(PathGenerator.generateDomainPath(url)),
          'X-Amz-Meta-Sequence': sequence.toString(),
          'X-Amz-Meta-Session': SessionManager.getCurrentSession()?.id || 'unknown'
        }
      );

      // 记录文件到会话
      SessionManager.addFile(fullPath);

      this.logger.log(`截图已保存到 MinIO: ${fullPath}`);
      return fullPath;
    } catch (error) {
      this.logger.error(`保存截图到 MinIO 失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 获取存储桶中的文件列表
   */
  async listFiles(bucketType: 'pages' | 'screenshots' | 'metadata' | 'logs' = 'pages', prefix: string = ''): Promise<string[]> {
    try {
      const files: string[] = [];
      const bucketName = this.buckets[bucketType];
      const stream = this.minioClient.listObjects(bucketName, prefix, true);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.name) {
            files.push(obj.name);
          }
        });
        
        stream.on('end', () => {
          resolve(files);
        });
        
        stream.on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error(`获取文件列表失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 开始新的爬取会话
   */
  startCrawlSession(baseUrl: string, config: any): string {
    return SessionManager.startSession(baseUrl, config);
  }

  /**
   * 结束爬取会话并保存会话元数据
   */
  async endCrawlSession(): Promise<void> {
    const session = SessionManager.endSession();
    if (!session) {
      return;
    }

    try {
      const now = new Date();
      const sessionMetadata = {
        sessionId: session.id,
        startTime: session.startTime,
        endTime: now,
        duration: now.getTime() - session.startTime.getTime(),
        baseUrl: session.baseUrl,
        config: session.config,
        totalFiles: session.files.length,
        files: session.files
      };

      const metadataPath = `sessions/${PathGenerator.generateDatePath(now)}/${session.id}.json`;
      const dataBuffer = Buffer.from(JSON.stringify(sessionMetadata, null, 2), 'utf8');

      await this.minioClient.putObject(
        this.buckets.metadata,
        metadataPath,
        dataBuffer,
        dataBuffer.length,
        {
          'Content-Type': 'application/json',
          'X-Amz-Meta-Session-Id': session.id,
          'X-Amz-Meta-Base-Url': this.sanitizeMetadataValue(session.baseUrl),
          'X-Amz-Meta-Total-Files': session.files.length.toString()
        }
      );

      this.logger.log(`会话元数据已保存: ${metadataPath}`);
    } catch (error) {
      this.logger.error(`保存会话元数据失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取 MinIO 客户端实例（用于高级操作）
   */
  getClient(): Minio.Client {
    return this.minioClient;
  }
}