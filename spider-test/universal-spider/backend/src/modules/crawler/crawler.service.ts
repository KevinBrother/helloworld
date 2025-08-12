import { Injectable, Logger } from '@nestjs/common';
import { BrowserPoolService } from './services/browser-pool.service';
import { PageAnalyzerService } from './services/page-analyzer.service';
import { AntiDetectionService } from './services/anti-detection.service';
import { ApiDiscoveryService } from './services/api-discovery.service';
import { CrawlRequestDto } from './dto/crawl-request.dto';
import { CrawlResultDto } from './dto/crawl-result.dto';
import { PageAnalysisDto } from './dto/page-analysis.dto';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private readonly browserPool: BrowserPoolService,
    private readonly pageAnalyzer: PageAnalyzerService,
    private readonly antiDetection: AntiDetectionService,
    private readonly apiDiscovery: ApiDiscoveryService,
  ) {}

  async crawl(request: CrawlRequestDto): Promise<CrawlResultDto> {
    this.logger.log(`开始爬取: ${request.url}`);
    const startTime = Date.now();

    try {
      // 获取浏览器实例
      const browser = await this.browserPool.getBrowser();
      const page = await browser.newPage();

      // 应用反检测策略
      await this.antiDetection.applyAntiDetection(
        page,
        request.antiDetectionConfig,
      );

      // 导航到目标页面
      await page.goto(request.url, {
        waitUntil: request.waitUntil || 'networkidle',
        timeout: request.timeout || 30000,
      });

      // 等待页面加载完成
      if (request.waitForSelector) {
        await page.waitForSelector(request.waitForSelector, {
          timeout: request.timeout || 30000,
        });
      }

      // 执行自定义脚本
      if (request.customScript) {
        await page.evaluate(request.customScript);
      }

      // 提取数据
      const extractedData = await this.pageAnalyzer.extractData(
        page,
        request.extractionRules,
      );

      // 截图（如果需要）
      let screenshot: string | undefined;
      if (request.takeScreenshot) {
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        screenshot = screenshotBuffer.toString('base64');
      }

      // 获取页面信息
      const pageInfo = await this.pageAnalyzer.getPageInfo(page);

      await page.close();
      this.browserPool.releaseBrowser(browser);

      const result: CrawlResultDto = {
        success: true,
        url: request.url,
        data: extractedData,
        pageInfo,
        screenshot,
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };

      this.logger.log(`爬取完成: ${request.url}`);
      return result;
    } catch (error) {
      this.logger.error(`爬取失败: ${request.url}`, error);
      return {
        success: false,
        url: request.url,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }
  }

  async analyzePage(url: string): Promise<PageAnalysisDto> {
    this.logger.log(`分析页面: ${url}`);

    try {
      const browser = await this.browserPool.getBrowser();
      const page = await browser.newPage();

      await page.goto(url, { waitUntil: 'networkidle' });

      const analysis = await this.pageAnalyzer.analyzePage(page);

      await page.close();
      this.browserPool.releaseBrowser(browser);

      return analysis;
    } catch (error) {
      this.logger.error(`页面分析失败: ${url}`, error);
      throw error;
    }
  }

  async discoverApis(taskId: number) {
    this.logger.log(`发现API: 任务ID ${taskId}`);

    try {
      return await this.apiDiscovery.discoverApis(taskId);
    } catch (error) {
      this.logger.error(`API发现失败: 任务ID ${taskId}`, error);
      throw error;
    }
  }

  async getStatus() {
    const browserStats = await this.browserPool.getStats();

    return {
      activeBrowsers: browserStats.active,
      queueSize: browserStats.queue,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }
}
