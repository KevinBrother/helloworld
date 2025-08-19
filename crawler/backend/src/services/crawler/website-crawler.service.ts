import { Inject, Injectable, Logger } from '@nestjs/common';
import { BrowserService } from '../../core/browser/browser.service';
import { StorageService } from '../../core/storage/storage.service';
import { ContentExtractorService } from '../content/content-extractor.service';
import { LinkManagerService } from './link-manager.service';
import { MediaDetectorService } from '../media/media-detector.service';
import { MediaDownloaderService } from '../media/media-downloader.service';
import { MediaStorageService } from '../media/media-storage.service';
import {
  CrawlRequest,
  CrawlResponse,
  CrawSession,
  PageData,
} from '../../shared/interfaces/crawler.interface';
import { PathGenerator } from '../../shared/utils/path-generator.util';
import { defaultCrawlerConfig } from '../../config/app.config';

@Injectable()
export class WebsiteCrawlerService {
  private readonly logger = new Logger(WebsiteCrawlerService.name);
  private readonly activeSessions = new Map<string, CrawSession>();

  constructor(
    private readonly browserService: BrowserService,
    @Inject(StorageService) private readonly storageService: StorageService,
    private readonly contentExtractor: ContentExtractorService,
    private readonly linkManager: LinkManagerService,
    private readonly mediaDetector: MediaDetectorService,
    private readonly mediaDownloader: MediaDownloaderService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  /**
   * 开始爬取网站
   */
  async crawlWebsite(request: CrawlRequest): Promise<CrawlResponse> {
    const sessionId = PathGenerator.generateSessionId();
    
    try {
      // 创建爬取会话
      const session = this.createSession(sessionId, request);
      this.activeSessions.set(sessionId, session);
      
      this.logger.log(`开始爬取会话: ${sessionId}, 起始URL: ${request.startUrl}`);
      
      // 异步执行爬取任务
      this.executeCrawling(session).catch(error => {
        this.logger.error(`爬取会话 ${sessionId} 执行失败: ${error.message}`);
        session.status = 'failed';
        session.errors.push(error.message);
        session.endTime = new Date();
      });
      
      return {
        sessionId,
        status: 'started',
        message: `爬取任务已启动，会话ID: ${sessionId}`,
      };
    } catch (error) {
      this.logger.error(`启动爬取任务失败: ${error.message}`);
      return {
        sessionId,
        status: 'failed',
        message: `启动爬取任务失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取爬取会话状态
   */
  getSessionStatus(sessionId: string): CrawSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): CrawSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * 终止爬取会话
   */
  async stopCrawling(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        message: `会话 ${sessionId} 不存在或已结束`
      };
    }

    if (session.status !== 'running') {
      return {
        success: false,
        message: `会话 ${sessionId} 当前状态为 ${session.status}，无法终止`
      };
    }

    try {
      // 更新会话状态为已停止
      session.status = 'stopped';
      session.endTime = new Date();
      
      this.logger.log(`手动终止爬取会话: ${sessionId}`);
      
      // 保存会话元数据
      await this.saveSessionMetadata(session);
      
      return {
        success: true,
        message: `会话 ${sessionId} 已成功终止`
      };
    } catch (error) {
      this.logger.error(`终止会话 ${sessionId} 时发生错误: ${error.message}`);
      return {
        success: false,
        message: `终止会话时发生错误: ${error.message}`
      };
    }
  }

  /**
   * 创建爬取会话
   */
  private createSession(sessionId: string, request: CrawlRequest): CrawSession {
    const startUrlObj = new URL(request.startUrl);
    const { options } = request;
    const allowedDomains = options.allowedDomains || [startUrlObj.hostname];
    
    // 判断是否为完全爬取模式
    const isCompleteCrawl = !options.maxPages;
    
    // 计算有效的最大页面数
    const effectiveMaxPages = options.maxPages 
      ? Math.min(options.maxPages, defaultCrawlerConfig.crawler.maxPagesLimit)
      : defaultCrawlerConfig.crawler.maxPagesLimit;
    
    // 构建媒体选项
    const mediaOptions = options.enableMediaCrawl ? {
      enabled: true,
      mediaTypes: options.mediaTypes ? Object.entries(options.mediaTypes).map(([type, config]) => ({
        type: type as any,
        mode: config.mode,
        extensions: config.extensions
      })) : [],
      maxFileSize: options.downloadLimits?.maxFileSize,
      downloadTimeout: options.downloadLimits?.downloadTimeout,
      concurrent: options.downloadLimits?.maxConcurrent
    } : undefined;
    
    return {
      id: sessionId,
      sessionId,
      startUrl: request.startUrl,
      config: request,
      startTime: new Date(),
      status: 'running',
      pagesProcessed: 0,
      totalPages: 0,
      errors: [],
      maxDepth: options.maxDepth || defaultCrawlerConfig.crawler.maxDepth,
      maxPages: effectiveMaxPages,
      isCompleteCrawl,
      takeScreenshots: options.screenshot || false,
      userAgent: options.userAgent,
      allowedDomains,
      excludePatterns: options.excludePatterns || [],
      mediaOptions,
    };
  }

  /**
   * 执行爬取任务
   */
  private async executeCrawling(session: CrawSession): Promise<void> {
    try {
      // 启动浏览器
      await this.browserService.launch({ userAgent: session.userAgent });
      
      // 清空链接管理器
      this.linkManager.clear();
      
      // 添加起始URL到队列
      this.linkManager.addLinks(
        [session.startUrl],
        '',
        -1, // 起始URL深度为0
        session.maxDepth,
        session.allowedDomains,
        session.excludePatterns
      );
      
      // 开始爬取循环
      while (this.shouldContinueCrawling(session)) {
        // 检查会话是否被手动终止
        if (session.status === 'stopped') {
          this.logger.log(`会话 ${session.sessionId} 已被手动终止`);
          break;
        }
        
        const nextLink = this.linkManager.getNextLink();
        
        if (!nextLink) {
          this.logger.log(`没有更多链接可处理，爬取完成`);
          break;
        }
        
        // 安全检查
        if (!this.checkSafetyLimits(session)) {
          this.logger.warn(`达到安全限制，停止爬取`);
          break;
        }
        
        try {
          await this.processPage(nextLink.url, nextLink.depth, session);
          session.pagesProcessed++;
          
          const progressInfo = session.isCompleteCrawl 
            ? `已处理 ${session.pagesProcessed} 个页面（完全爬取模式）`
            : `已处理 ${session.pagesProcessed}/${session.maxPages} 个页面`;
          
          this.logger.log(
            `${progressInfo}，队列剩余: ${this.linkManager.getQueueSize()}`
          );
        } catch (error) {
          this.logger.error(`处理页面失败 ${nextLink.url}: ${error.message}`);
          session.errors.push(`处理页面失败 ${nextLink.url}: ${error.message}`);
        }
        
        // 标记为已处理
        this.linkManager.markAsProcessed(nextLink.url);
      }
      
      // 保存会话元数据
      await this.saveSessionMetadata(session);
      
      session.status = 'completed';
      session.endTime = new Date();
      session.totalPages = session.pagesProcessed;
      
      this.logger.log(
        `爬取会话 ${session.sessionId} 完成，` +
        `处理了 ${session.pagesProcessed} 个页面`
      );
    } catch (error) {
      session.status = 'failed';
      session.endTime = new Date();
      session.errors.push(error.message);
      
      this.logger.error(`爬取会话 ${session.sessionId} 失败: ${error.message}`);
    } finally {
      // 关闭浏览器
      await this.browserService.close();
    }
  }

  /**
   * 处理单个页面
   */
  private async processPage(url: string, depth: number, session: CrawSession): Promise<void> {
    this.logger.log(`处理页面: ${url} (深度: ${depth})`);
    
    try {
      // 爬取页面内容
      const pageResult = await this.browserService.crawlPage(url, {
        takeScreenshot: session.takeScreenshots,
      });
      
      // 提取内容和链接
      const extractedContent = this.contentExtractor.extractContent(
        pageResult.html,
        url
      );
      
      // 创建页面数据
      const pageData: PageData = {
        url,
        title: extractedContent.title,
        content: extractedContent.content,
        metadata: {
          depth,
          crawledAt: new Date().toISOString(),
          contentType: pageResult.contentType,
          statusCode: pageResult.statusCode,
          ...extractedContent.metadata,
        },
      };
      
      // 保存页面数据
      await this.storageService.savePageData(pageData, session.sessionId);
      
      // 保存截图（如果有）
      if (pageResult.screenshot) {
        await this.storageService.saveScreenshot(
          pageResult.screenshot,
          url,
          session.sessionId
        );
      }
      
      // 处理媒体文件（如果启用）
      if (session.mediaOptions?.enabled && session.mediaOptions.mediaTypes.length > 0) {
        await this.processMediaFiles(url, session);
      }
      
      // 添加发现的链接到队列
      const addedLinksCount = this.linkManager.addLinks(
        extractedContent.links,
        url,
        depth,
        session.maxDepth,
        session.allowedDomains,
        session.excludePatterns
      );
      
      this.logger.log(
        `页面 ${url} 处理完成，提取到 ${extractedContent.links.length} 个链接，` +
        `添加 ${addedLinksCount} 个新链接到队列`
      );
    } catch (error) {
      this.logger.error(`处理页面 ${url} 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理页面中的媒体文件
   */
  private async processMediaFiles(url: string, session: CrawSession): Promise<void> {
    if (!session.mediaOptions) {
      return;
    }
    
    let page = null;
    
    try {
      // 创建新页面用于媒体检测
      if (!this.browserService['context']) {
        this.logger.warn('浏览器上下文不可用，跳过媒体文件处理');
        return;
      }
      
      page = await this.browserService['context'].newPage();
      
      // 导航到页面
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      
      // 等待页面加载
      await page.waitForLoadState('domcontentloaded');
      
      // 检测媒体文件
      const mediaFiles = await this.mediaDetector.detectMediaFiles(
        page,
        url,
        session.mediaOptions.mediaTypes
      );
      
      if (mediaFiles.length === 0) {
        return;
      }
      
      this.logger.log(`在页面 ${url} 中检测到 ${mediaFiles.length} 个媒体文件`);
      
      // 下载媒体文件
      const downloadResults = await this.mediaDownloader.downloadMediaFiles(
        mediaFiles,
        session.sessionId,
        session.mediaOptions
      );
      
      // 保存成功下载的媒体文件信息
      const successfulFiles = downloadResults
        .filter(result => result.success && result.mediaFile)
        .map(result => result.mediaFile!);
      
      if (successfulFiles.length > 0) {
        this.mediaStorage.saveMediaFilesToSession(session.sessionId, successfulFiles);
        this.logger.log(`成功下载并保存 ${successfulFiles.length} 个媒体文件`);
      }
      
      // 记录失败的下载
      const failedDownloads = downloadResults.filter(result => !result.success);
      if (failedDownloads.length > 0) {
        this.logger.warn(`${failedDownloads.length} 个媒体文件下载失败`);
        failedDownloads.forEach(result => {
          if (result.error) {
            session.errors.push(`媒体文件下载失败: ${result.error}`);
          }
        });
      }
    } catch (error) {
      this.logger.error(`处理媒体文件失败: ${error.message}`);
      session.errors.push(`处理媒体文件失败: ${error.message}`);
    } finally {
      // 关闭页面
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * 判断是否应该继续爬取
   */
  private shouldContinueCrawling(session: CrawSession): boolean {
    // 完全爬取模式：只要没有达到系统限制就继续
    if (session.isCompleteCrawl) {
      return session.pagesProcessed < session.maxPages;
    }
    
    // 限制模式：按用户指定的页面数
    return session.pagesProcessed < session.maxPages;
  }

  /**
   * 检查安全限制
   */
  private checkSafetyLimits(session: CrawSession): boolean {
    const now = new Date();
    const startTime = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
    const runningHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // 检查运行时间限制
    if (runningHours > defaultCrawlerConfig.crawler.safetyLimits.maxDuration) {
      this.logger.warn(`运行时间超过限制: ${runningHours.toFixed(2)}h > ${defaultCrawlerConfig.crawler.safetyLimits.maxDuration}h`);
      return false;
    }
    
    // 检查内存使用（简单检查）
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 1000) { // 超过1GB内存使用
      this.logger.warn(`内存使用过高: ${memoryUsageMB.toFixed(2)}MB`);
      return false;
    }
    
    return true;
  }

  /**
   * 保存会话元数据
   */
  private async saveSessionMetadata(session: CrawSession): Promise<void> {
    try {
      const linkStats = this.linkManager.getStats();
      
      // 保存媒体文件元数据
      if (session.mediaOptions?.enabled) {
        const domain = PathGenerator.extractDomain(session.startUrl);
        await this.mediaStorage.saveMediaMetadata(session.sessionId, domain);
      }
      
      const metadata = {
        session,
        linkStats,
        mediaStats: session.mediaOptions?.enabled 
          ? this.mediaStorage.getSessionMediaFiles(session.sessionId).length
          : 0,
        summary: {
          totalPagesProcessed: session.pagesProcessed,
          totalLinksDiscovered: linkStats.discovered,
          totalLinksProcessed: linkStats.processed,
          totalErrors: session.errors.length,
          duration: session.endTime 
            ? (session.endTime instanceof Date ? session.endTime : new Date(session.endTime)).getTime() - 
              (session.startTime instanceof Date ? session.startTime : new Date(session.startTime)).getTime()
            : null,
        },
      };
      
      await this.storageService.saveSessionMetadata(session.sessionId, metadata);
      
      this.logger.log(`会话元数据已保存: ${session.sessionId}`);
    } catch (error) {
      this.logger.error(`保存会话元数据失败: ${error.message}`);
    }
  }
}