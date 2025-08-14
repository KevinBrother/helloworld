import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { WebsiteCrawlerService } from '../services/crawler/website-crawler.service';
import { StorageService } from '../core/storage/storage.service';
import {
  CrawlRequest,
  CrawlResponse,
  CrawlSession,
} from '../shared/interfaces/crawler.interface';

@Controller('api/crawler')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(
    private readonly crawlerService: WebsiteCrawlerService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 开始爬取网站
   */
  @Post('crawl')
  @HttpCode(HttpStatus.ACCEPTED)
  async crawlWebsite(@Body() request: CrawlRequest): Promise<CrawlResponse> {
    this.logger.log(`收到爬取请求: ${JSON.stringify(request)}`);
    
    // 验证请求参数
    this.validateCrawlRequest(request);
    
    try {
      const response = await this.crawlerService.crawlWebsite(request);
      this.logger.log(`爬取任务已启动: ${response.sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(`启动爬取任务失败: ${error.message}`);
      throw new BadRequestException(`启动爬取任务失败: ${error.message}`);
    }
  }

  /**
   * 获取爬取会话状态
   */
  @Get('session/:sessionId')
  async getSessionStatus(@Param('sessionId') sessionId: string): Promise<CrawlSession | null> {
    this.logger.log(`查询会话状态: ${sessionId}`);
    
    const session = this.crawlerService.getSessionStatus(sessionId);
    
    if (!session) {
      this.logger.warn(`会话不存在: ${sessionId}`);
      return null;
    }
    
    return session;
  }

  /**
   * 获取所有活跃会话
   */
  @Get('sessions')
  async getActiveSessions(): Promise<CrawlSession[]> {
    this.logger.log('查询所有活跃会话');
    return this.crawlerService.getActiveSessions();
  }

  /**
   * 健康检查
   */
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 查询MinIO中的文件
   */
  @Get('files')
  async listFiles(
    @Query('prefix') prefix?: string,
    @Query('sessionId') sessionId?: string,
  ): Promise<{ files: any[]; total: number }> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      let searchPrefix = '';
      if (sessionId) {
        searchPrefix = `sessions/${sessionId}/`;
      } else if (prefix) {
        searchPrefix = prefix;
      }
      
      const files: any[] = [];
      
      return new Promise((resolve, reject) => {
        const stream = client.listObjects(bucketName, searchPrefix, true);
        
        stream.on('data', (obj) => {
          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
          });
        });
        
        stream.on('end', () => {
          this.logger.log(`查询到 ${files.length} 个文件，前缀: ${searchPrefix}`);
          resolve({ files, total: files.length });
        });
        
        stream.on('error', (error) => {
          this.logger.error(`查询文件失败: ${error.message}`);
          reject(new BadRequestException(`查询文件失败: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error(`查询文件失败: ${error.message}`);
      throw new BadRequestException(`查询文件失败: ${error.message}`);
    }
  }

  /**
   * 获取文件下载链接
   */
  @Get('files/:fileName/download')
  async getFileDownloadUrl(@Param('fileName') fileName: string): Promise<{ downloadUrl: string }> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      // 生成预签名URL，有效期1小时
      const downloadUrl = await client.presignedGetObject(bucketName, fileName, 3600);
      
      this.logger.log(`生成文件下载链接: ${fileName}`);
      return { downloadUrl };
    } catch (error) {
      this.logger.error(`生成下载链接失败: ${error.message}`);
      throw new BadRequestException(`生成下载链接失败: ${error.message}`);
    }
  }

  /**
   * 验证爬取请求参数
   */
  private validateCrawlRequest(request: CrawlRequest): void {
    if (!request.startUrl) {
      throw new BadRequestException('startUrl 是必需的');
    }

    try {
      new URL(request.startUrl);
    } catch (error) {
      throw new BadRequestException('startUrl 必须是有效的URL');
    }

    if (request.maxDepth !== undefined) {
      if (request.maxDepth < 1 || request.maxDepth > 10) {
        throw new BadRequestException('maxDepth 必须在 1-10 之间');
      }
    }

    if (request.maxPages !== undefined) {
      if (request.maxPages < 1 || request.maxPages > 1000) {
        throw new BadRequestException('maxPages 必须在 1-1000 之间');
      }
    }

    if (request.allowedDomains) {
      for (const domain of request.allowedDomains) {
        if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
          throw new BadRequestException(`无效的域名: ${domain}`);
        }
      }
    }
  }
}