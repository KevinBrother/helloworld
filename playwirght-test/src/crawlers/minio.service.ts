import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { PageData } from '../interfaces/crawler.interface';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', 'crawler-data');
  }

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
      
      // 检查存储桶是否存在，如果不存在则创建
      this.logger.log(`检查存储桶是否存在: ${this.bucketName}`);
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        this.logger.log(`存储桶不存在，正在创建: ${this.bucketName}`);
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`存储桶创建成功: ${this.bucketName}`);
      } else {
        this.logger.log(`存储桶已存在: ${this.bucketName}`);
      }
      
      this.logger.log('MinIO 客户端初始化完成');
    } catch (error) {
      this.logger.error(`MinIO 初始化失败: ${error.message}`, error.stack);
      // 不要抛出错误，让应用继续运行
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

      // 生成文件名，使用 URL 的 hash 和时间戳
      const urlHash = this.generateUrlHash(pageData.url);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `pages/${urlHash}_${timestamp}.json`;

      // 准备要存储的数据
      const dataToStore = {
        ...pageData,
        storedAt: new Date().toISOString(),
        fileSize: JSON.stringify(pageData).length
      };

      // 转换为 Buffer
      const dataBuffer = Buffer.from(JSON.stringify(dataToStore, null, 2), 'utf8');

      // 上传到 MinIO
      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        dataBuffer,
        dataBuffer.length,
        {
          'Content-Type': 'application/json',
          'X-Amz-Meta-Url': pageData.url,
          'X-Amz-Meta-Title': pageData.title,
          'X-Amz-Meta-Depth': pageData.metadata.depth.toString(),
        }
      );

      this.logger.log(`页面数据已保存到 MinIO: ${fileName}`);
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

      const urlHash = this.generateUrlHash(url);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `screenshots/${urlHash}_${timestamp}.png`;

      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        screenshotBuffer,
        screenshotBuffer.length,
        {
          'Content-Type': 'image/png',
          'X-Amz-Meta-Url': url,
        }
      );

      this.logger.log(`截图已保存到 MinIO: ${fileName}`);
      return fileName;
    } catch (error) {
      this.logger.error(`保存截图到 MinIO 失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 获取存储桶中的文件列表
   */
  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      const files: string[] = [];
      const stream = this.minioClient.listObjects(this.bucketName, prefix, true);
      
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
   * 生成 URL 的哈希值作为文件名的一部分
   */
  private generateUrlHash(url: string): string {
    // 简单的哈希函数，将 URL 转换为安全的文件名
    return Buffer.from(url)
      .toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 16);
  }

  /**
   * 获取 MinIO 客户端实例（用于高级操作）
   */
  getClient(): Minio.Client {
    return this.minioClient;
  }
}