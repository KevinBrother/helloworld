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
  Res,
} from '@nestjs/common';
import { WebsiteCrawlerService } from '../services/crawler/website-crawler.service';
import { StorageService } from '../core/storage/storage.service';
import { MediaStorageService } from '../services/media/media-storage.service';
import {
  CrawlRequest,
  CrawlResponse,
  CrawlSession,
  MediaFileInfo,
} from '../shared/interfaces/crawler.interface';

@Controller('api/crawler')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(
    private readonly crawlerService: WebsiteCrawlerService,
    private readonly storageService: StorageService,
    private readonly mediaStorageService: MediaStorageService,
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
      // 返回通过后端代理的下载链接，而不是直接的MinIO预签名URL
      const downloadUrl = `http://localhost:3000/api/crawler/files/${encodeURIComponent(fileName)}/stream`;
      
      this.logger.log(`生成文件下载链接: ${fileName}`);
      return { downloadUrl };
    } catch (error) {
      this.logger.error(`生成下载链接失败: ${error.message}`);
      throw new BadRequestException(`生成下载链接失败: ${error.message}`);
    }
  }

  /**
   * 直接流式传输文件内容
   */
  @Get('files/:fileName/stream')
  async streamFile(@Param('fileName') fileName: string, @Res() res: any): Promise<void> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      // 获取文件对象
      const dataStream = await client.getObject(bucketName, fileName);
      
      // 获取文件信息以设置正确的Content-Type
      const stat = await client.statObject(bucketName, fileName);
      
      // 设置响应头
      res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName.split('/').pop()}"`);
      
      // 流式传输文件
      dataStream.pipe(res);
      
      this.logger.log(`流式传输文件: ${fileName}`);
    } catch (error) {
      this.logger.error(`流式传输文件失败: ${error.message}`);
      res.status(404).json({ error: `文件不存在或无法访问: ${error.message}` });
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

  /**
   * 获取会话的媒体文件
   */
  @Get('session/:sessionId/media')
  async getSessionMediaFiles(
    @Param('sessionId') sessionId: string,
    @Query('type') type?: string,
    @Query('extension') extension?: string,
  ): Promise<{ files: MediaFileInfo[]; total: number }> {
    try {
      let files: MediaFileInfo[];
      
      if (type && ['image', 'video', 'audio', 'document', 'archive'].includes(type)) {
          files = await this.mediaStorageService.getMediaFilesByType(sessionId, type as 'image' | 'video' | 'audio' | 'document' | 'archive');
        } else if (extension) {
          files = await this.mediaStorageService.getMediaFilesByExtension(sessionId, extension);
        } else {
          files = await this.mediaStorageService.getSessionMediaFiles(sessionId);
        }
      
      return {
        files,
        total: files.length,
      };
    } catch (error) {
      this.logger.error(`获取会话媒体文件失败: ${error.message}`);
      throw new BadRequestException(`获取会话媒体文件失败: ${error.message}`);
    }
  }

  /**
   * 获取所有会话的媒体文件统计
   */
  @Get('media/stats')
  async getAllMediaStats(): Promise<{
     totalFiles: number;
     totalSessions: number;
     filesByType: Record<string, number>;
     filesBySession: Record<string, number>;
   }> {
    try {
      return await this.mediaStorageService.getAllMediaFilesStats();
    } catch (error) {
      this.logger.error(`获取媒体文件统计失败: ${error.message}`);
      throw new BadRequestException(`获取媒体文件统计失败: ${error.message}`);
    }
  }

  /**
   * 搜索媒体文件
   */
  @Get('media/search')
  async searchMediaFiles(
    @Query('query') query: string,
    @Query('sessionId') sessionId?: string,
    @Query('type') type?: string,
  ): Promise<{ files: MediaFileInfo[]; total: number }> {
    if (!query) {
      throw new BadRequestException('搜索关键词不能为空');
    }
    
    try {
      const files = this.mediaStorageService.searchMediaFiles(sessionId, {
          fileName: query,
          sourceUrl: query,
          type: type
        });
      
      return {
        files,
        total: files.length,
      };
    } catch (error) {
      this.logger.error(`搜索媒体文件失败: ${error.message}`);
      throw new BadRequestException(`搜索媒体文件失败: ${error.message}`);
    }
  }

  /**
   * 获取媒体文件下载链接
   */
  @Get('media/:sessionId/:fileName/download')
  async getMediaFileDownloadUrl(
    @Param('sessionId') sessionId: string,
    @Param('fileName') fileName: string
  ): Promise<{ downloadUrl: string }> {
    try {
      // 检查文件是否存在
      const mediaFile = this.mediaStorageService.getMediaFile(sessionId, fileName);
      
      if (!mediaFile || !mediaFile.storagePath) {
        throw new BadRequestException('文件不存在或无法生成下载链接');
      }
      
      // 返回通过后端代理的下载链接
      const downloadUrl = `http://localhost:3000/api/crawler/media/${sessionId}/${encodeURIComponent(fileName)}/stream`;
      
      return {
        downloadUrl,
      };
    } catch (error) {
      this.logger.error(`获取媒体文件下载链接失败: ${error.message}`);
      throw new BadRequestException(`获取媒体文件下载链接失败: ${error.message}`);
    }
  }

  /**
   * 直接流式传输媒体文件内容
   */
  @Get('media/:sessionId/:fileName/stream')
  async streamMediaFile(
    @Param('sessionId') sessionId: string,
    @Param('fileName') fileName: string,
    @Res() res: any
  ): Promise<void> {
    try {
      // 获取媒体文件信息
      const mediaFile = this.mediaStorageService.getMediaFile(sessionId, fileName);
      
      if (!mediaFile || !mediaFile.storagePath) {
        res.status(404).json({ error: '文件不存在' });
        return;
      }
      
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      // 获取文件对象
      const dataStream = await client.getObject(bucketName, mediaFile.storagePath);
      
      // 获取文件信息以设置正确的Content-Type
      const stat = await client.statObject(bucketName, mediaFile.storagePath);
      
      // 设置响应头
      res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // 流式传输文件
      dataStream.pipe(res);
      
      this.logger.log(`流式传输媒体文件: ${sessionId}/${fileName}`);
    } catch (error) {
      this.logger.error(`流式传输媒体文件失败: ${error.message}`);
      res.status(404).json({ error: `文件不存在或无法访问: ${error.message}` });
    }
  }
}