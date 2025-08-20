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
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WebsiteCrawlerService } from '../services/crawler/website-crawler.service';
import {
  CrawlRequest,
  CrawlResponse,
  CrawSession,
  ApiResponse,
} from '../shared/interfaces/crawler.interface';

@ApiTags('crawler')
@Controller('api/crawler')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(
    private readonly crawlerService: WebsiteCrawlerService,
  ) {}

  /**
   * 开始爬取网站
   */
  @ApiOperation({ summary: '开始爬取网站', description: '启动网站爬取任务，返回会话ID用于跟踪进度' })
  @ApiBody({ description: '爬取请求参数，包含URL、最大页面数、是否截图等配置' })
  @SwaggerApiResponse({ status: 202, description: '爬取任务已启动，返回会话ID和状态信息' })
  @SwaggerApiResponse({ status: 400, description: '请求参数错误' })
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
  @ApiOperation({ summary: '获取爬取会话状态', description: '根据会话ID查询爬取任务的当前状态和进度' })
  @ApiParam({ name: 'sessionId', description: '会话ID' })
  @SwaggerApiResponse({ status: 200, description: '返回会话状态信息，如果会话不存在则返回null' })
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
  @ApiOperation({ summary: '获取所有活跃会话', description: '查询当前所有正在运行的爬取会话列表' })
  @SwaggerApiResponse({ status: 200, description: '返回活跃会话列表' })
  @Get('sessions')
  async getActiveSessions(): Promise<CrawSession[]> {
    this.logger.log('查询所有活跃会话');
    return this.crawlerService.getActiveSessions();
  }

  /**
   * 终止爬取会话
   */
  @ApiOperation({ summary: '终止爬取会话', description: '停止指定的爬取任务' })
  @ApiParam({ name: 'sessionId', description: '要停止的会话ID' })
  @SwaggerApiResponse({ status: 200, description: '返回操作结果' })
  @Post('session/:sessionId/stop')
  async stopCrawling(@Param('sessionId') sessionId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`请求终止爬取会话: ${sessionId}`);
    return this.crawlerService.stopCrawling(sessionId);
  }

  /**
   * 健康检查
   */
  @ApiOperation({ summary: '健康检查', description: '检查爬虫服务的运行状态' })
  @SwaggerApiResponse({ status: 200, description: '返回服务状态和时间戳' })
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
      throw new BadRequestException('url 必须是有效的URL');
    }

    if (!request.options) {
      throw new BadRequestException('options 是必需的');
    }

    const { options } = request;

    if (options.maxDepth !== undefined) {
      if (options.maxDepth < 1 || options.maxDepth > 10) {
        throw new BadRequestException('maxDepth 必须在 1-10 之间');
      }
    }

    if (options.maxPages !== undefined) {
      if (options.maxPages < 1 || options.maxPages > 1000) {
        throw new BadRequestException('maxPages 必须在 1-1000 之间');
      }
    }

    if (options.allowedDomains) {
      for (const domain of options.allowedDomains) {
        if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
          throw new BadRequestException(`无效的域名: ${domain}`);
        }
      }
    }

    if (options.waitFor !== undefined) {
      if (options.waitFor < 0 || options.waitFor > 30000) {
        throw new BadRequestException('waitFor 必须在 0-30000 毫秒之间');
      }
    }

    if (options.downloadLimits) {
      const { downloadLimits } = options;
      if (downloadLimits.maxFileSize !== undefined && downloadLimits.maxFileSize <= 0) {
        throw new BadRequestException('maxFileSize 必须大于 0');
      }
      if (downloadLimits.maxTotalSize !== undefined && downloadLimits.maxTotalSize <= 0) {
        throw new BadRequestException('maxTotalSize 必须大于 0');
      }
    }
  }


}