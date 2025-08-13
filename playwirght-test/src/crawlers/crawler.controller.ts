import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebsiteCrawlerService } from './website-crawler.service';

export interface CrawlRequest {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  delay?: number;
  takeScreenshots?: boolean;
}

export interface CrawlResponse {
  success: boolean;
  message: string;
  pagesProcessed?: number;
}

@Controller('crawler')
export class CrawlerController {
  private readonly logger = new Logger(CrawlerController.name);

  constructor(private readonly crawlerService: WebsiteCrawlerService) {}

  @Post('crawl')
  async crawlWebsite(@Body() crawlRequest: CrawlRequest): Promise<CrawlResponse> {
    try {
      this.logger.log(`收到爬取请求: ${crawlRequest.url}`);
      
      // 验证URL格式
      if (!crawlRequest.url || !this.isValidUrl(crawlRequest.url)) {
        return {
          success: false,
          message: '无效的URL格式'
        };
      }

      // 设置默认参数
      const options = {
        maxDepth: crawlRequest.maxDepth || 3,
        maxPages: crawlRequest.maxPages || 50,
        delay: crawlRequest.delay || 1500,
        takeScreenshots: crawlRequest.takeScreenshots !== false
      };

      this.logger.log(`开始爬取: ${crawlRequest.url}, 配置: ${JSON.stringify(options)}`);
      
      // 执行爬取
      const result = await this.crawlerService.startCrawling(crawlRequest.url, options);
      
      return {
        success: true,
        message: '爬取完成',
        pagesProcessed: result
      };
    } catch (error) {
      this.logger.error(`爬取失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: `爬取失败: ${error.message}`
      };
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }
}