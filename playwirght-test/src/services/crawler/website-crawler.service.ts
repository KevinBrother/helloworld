import { Injectable, Logger } from '@nestjs/common';
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
  CrawlSession,
  PageData,
} from '../../shared/interfaces/crawler.interface';
import { PathGenerator } from '../../shared/utils/path-generator.util';

@Injectable()
export class WebsiteCrawlerService {
  private readonly logger = new Logger(WebsiteCrawlerService.name);
  private readonly activeSessions = new Map<string, CrawlSession>();

  constructor(
    private readonly browserService: BrowserService,
    private readonly storageService: StorageService,
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
  getSessionStatus(sessionId: string): CrawlSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): CrawlSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * 创建爬取会话
   */
  private createSession(sessionId: string, request: CrawlRequest): CrawlSession {
    const startUrlObj = new URL(request.startUrl);
    const allowedDomains = request.allowedDomains || [startUrlObj.hostname];
    
    return {
      sessionId,
      startUrl: request.startUrl,
      maxDepth: request.maxDepth || 3,
      maxPages: request.maxPages || 10,
      takeScreenshots: request.takeScreenshots || false,
      userAgent: request.userAgent,
      allowedDomains,
      excludePatterns: request.excludePatterns || [],
      mediaOptions: request.mediaOptions,
      startTime: new Date(),
      status: 'running',
      pagesProcessed: 0,
      totalPages: 0,
      errors: [],
    };
  }

  /**
   * 执行爬取任务
   */
  private async executeCrawling(session: CrawlSession): Promise<void> {
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
      while (session.pagesProcessed < session.maxPages) {
        const nextLink = this.linkManager.getNextLink();
        
        if (!nextLink) {
          this.logger.log(`没有更多链接可处理，爬取完成`);
          break;
        }
        
        try {
          await this.processPage(nextLink.url, nextLink.depth, session);
          session.pagesProcessed++;
          
          this.logger.log(
            `已处理 ${session.pagesProcessed}/${session.maxPages} 个页面，` +
            `队列剩余: ${this.linkManager.getQueueSize()}`
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
  private async processPage(url: string, depth: number, session: CrawlSession): Promise<void> {
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
  private async processMediaFiles(url: string, session: CrawlSession): Promise<void> {
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
   * 保存会话元数据
   */
  private async saveSessionMetadata(session: CrawlSession): Promise<void> {
    try {
      const linkStats = this.linkManager.getStats();
      
      // 保存媒体文件元数据
      if (session.mediaOptions?.enabled) {
        await this.mediaStorage.saveMediaMetadata(session.sessionId);
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
            ? session.endTime.getTime() - session.startTime.getTime()
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