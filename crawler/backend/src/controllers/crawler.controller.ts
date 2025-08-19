import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { WebsiteCrawlerService } from '../services/crawler/website-crawler.service';
import {
  CrawlRequest,
  CrawlResponse,
  CrawSession,
  ApiResponse,
} from '../shared/interfaces/crawler.interface';

@Controller('api/crawler')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(
    private readonly crawlerService: WebsiteCrawlerService,
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
  async getSessionStatus(@Param('sessionId') sessionId: string): Promise<CrawSession | null> {
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
  async getActiveSessions(): Promise<CrawSession[]> {
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