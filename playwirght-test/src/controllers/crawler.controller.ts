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
   * 终止爬取会话
   */
  @Post('session/:sessionId/stop')
  async stopCrawling(@Param('sessionId') sessionId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`请求终止爬取会话: ${sessionId}`);
    return this.crawlerService.stopCrawling(sessionId);
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
   * 流式查询MinIO中的文件 (Server-Sent Events)
   */
  @Get('files/stream')
  async streamFiles(
    @Res() res: any,
    @Query('prefix') prefix?: string,
    @Query('sessionId') sessionId?: string,
    @Query('maxKeys') maxKeys: number = 500,
    @Query('batchSize') batchSize: number = 20,
  ): Promise<void> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      let searchPrefix = '';
      if (sessionId) {
        searchPrefix = `sessions/${sessionId}/`;
      } else if (prefix) {
        searchPrefix = prefix;
      }
      
      // 设置SSE响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
      
      // 发送初始连接确认
      res.write(`data: ${JSON.stringify({ type: 'connected', message: '开始流式加载文件列表' })}\n\n`);
      
      const stream = client.listObjects(bucketName, searchPrefix, true);
      let batch: any[] = [];
      let totalCount = 0;
      let processedCount = 0;
      
      // 用于控制并发处理的队列
      const processingQueue: any[] = [];
      const concurrency = Math.min(10, batchSize);
      let isProcessing = false;
      
      const processObject = async (obj: any) => {
        isProcessing = true;
        try {
          const fileInfo = {
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
          };
          
          batch.push(fileInfo);
          processedCount++;
          
          // 当批次达到指定大小时发送数据
          if (batch.length >= batchSize) {
            res.write(`data: ${JSON.stringify({ 
              type: 'batch', 
              files: [...batch], 
              processed: processedCount,
              batchNumber: Math.ceil(processedCount / batchSize)
            })}\n\n`);
            batch = [];
          }
          
          // 模拟处理延迟，避免过快发送
          await new Promise(resolve => setTimeout(resolve, 1));
        } catch (err) {
          this.logger.error(`处理文件对象失败: ${err.message}`);
        } finally {
          // 处理完成后，检查队列是否有等待的对象
          if (processingQueue.length > 0) {
            const nextObj = processingQueue.shift();
            processObject(nextObj);
          } else {
            isProcessing = false;
            if (stream.readable) {
              stream.resume();
            }
          }
        }
      };
      
      stream.on('data', (obj) => {
        totalCount++;
        
        // 如果达到maxKeys限制，停止处理
        if (totalCount > maxKeys) {
          stream.destroy();
          return;
        }
        
        // 当处理队列未满时，直接处理对象
        if (processingQueue.length < concurrency && !isProcessing) {
          processObject(obj);
        } else {
          // 队列已满，先暂停流，避免数据堆积
          stream.pause();
          processingQueue.push(obj);
        }
      });
      
      stream.on('end', () => {
        // 发送剩余的批次数据
        if (batch.length > 0) {
          res.write(`data: ${JSON.stringify({ 
            type: 'batch', 
            files: batch, 
            processed: processedCount,
            batchNumber: Math.ceil(processedCount / batchSize)
          })}\n\n`);
        }
        
        // 发送完成信号
        res.write(`data: ${JSON.stringify({ 
          type: 'completed', 
          total: processedCount,
          message: `流式加载完成，共处理 ${processedCount} 个文件`
        })}\n\n`);
        
        res.end();
        this.logger.log(`流式文件查询完成，共处理 ${processedCount} 个文件，前缀: ${searchPrefix}`);
      });
      
      stream.on('error', (error) => {
        this.logger.error(`流式查询文件失败: ${error.message}`);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: `查询失败: ${error.message}`
        })}\n\n`);
        res.end();
      });
      
      // 处理客户端断开连接
      res.on('close', () => {
        this.logger.log('客户端断开SSE连接');
        if (stream.readable) {
          stream.destroy();
        }
      });
      
    } catch (error) {
      this.logger.error(`启动流式查询失败: ${error.message}`);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: `启动查询失败: ${error.message}`
      })}\n\n`);
      res.end();
    }
  }

  /**
   * 查询MinIO中的文件 (传统分页方式)
   */
  @Get('files')
  async listFiles(
    @Query('prefix') prefix?: string,
    @Query('sessionId') sessionId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('maxKeys') maxKeys: number = 1000,
  ): Promise<{ files: any[]; total: number; page: number; totalPages: number; hasMore: boolean }> {
    try {
      const client = await this.storageService.getClient();
      const bucketName = this.storageService.getBucketName();
      
      let searchPrefix = '';
      if (sessionId) {
        searchPrefix = `sessions/${sessionId}/`;
      } else if (prefix) {
        searchPrefix = prefix;
      }
      
      // 确保分页参数有效
      const pageNum = Math.max(1, Number(page) || 1);
      const pageSize = Math.min(Math.max(1, Number(limit) || 50), 200); // 最大限制200
      const skip = (pageNum - 1) * pageSize;
      
      const allFiles: any[] = [];
      
      return new Promise((resolve, reject) => {
        const stream = client.listObjects(bucketName, searchPrefix, true);
        let objectCount = 0;
        let isStreamPaused = false;
        
        // 流控制：当文件数量超过maxKeys时暂停流
        const checkAndPauseStream = () => {
          if (objectCount >= maxKeys && !isStreamPaused) {
            stream.pause();
            isStreamPaused = true;
            this.logger.log(`达到maxKeys限制(${maxKeys})，暂停流处理`);
          }
        };
        
        stream.on('data', (obj) => {
          objectCount++;
          
          // 检查是否超过maxKeys限制
          if (objectCount > maxKeys) {
            return; // 忽略超出限制的对象
          }
          
          allFiles.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
            etag: obj.etag,
          });
          
          // 每处理100个文件检查一次是否需要暂停
          if (objectCount % 100 === 0) {
            checkAndPauseStream();
          }
        });
        
        stream.on('end', () => {
          // 按修改时间倒序排序
          allFiles.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
          
          const total = allFiles.length;
          const totalPages = Math.ceil(total / pageSize);
          const files = allFiles.slice(skip, skip + pageSize);
          
          // 如果实际文件数达到maxKeys，说明可能还有更多文件
          const actualHasMore = pageNum < totalPages || (objectCount >= maxKeys);
          
          this.logger.log(`查询到 ${total} 个文件，处理了 ${objectCount} 个对象，返回第 ${pageNum} 页，共 ${files.length} 个文件，前缀: ${searchPrefix}`);
          
          resolve({ 
            files, 
            total, 
            page: pageNum, 
            totalPages, 
            hasMore: actualHasMore 
          });
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
      // TODO 这里 hardcode 了
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