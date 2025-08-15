import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebsiteCrawlerService } from './website-crawler.service';
import { BrowserService } from '../../core/browser/browser.service';
import { StorageService } from '../../core/storage/storage.service';
import { ContentExtractorService } from '../content/content-extractor.service';
import { LinkManagerService } from './link-manager.service';
import { MediaDetectorService } from '../media/media-detector.service';
import { MediaDownloaderService } from '../media/media-downloader.service';
import { MediaStorageService } from '../media/media-storage.service';
import { CrawlRequest, CrawlSession } from '../../shared/interfaces/crawler.interface';

// Mock playwright before any imports that might use it
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        on: vi.fn(),
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn(),
          content: vi.fn().mockResolvedValue('<html><body>Test</body></html>'),
          title: vi.fn().mockResolvedValue('Test Page'),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
          close: vi.fn(),
        }),
        close: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
}));

// Mock BrowserService directly
vi.mock('../../core/browser/browser.service', () => ({
  BrowserService: vi.fn().mockImplementation(() => ({
    launch: vi.fn().mockResolvedValue(undefined),
    crawlPage: vi.fn().mockResolvedValue({
      html: '<html><body>Test content</body></html>',
      title: 'Test Page',
      contentType: 'text/html',
      statusCode: 200
    }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));



describe('WebsiteCrawlerService', () => {
  let service: WebsiteCrawlerService;
  let module: TestingModule;
  let mockBrowserService: any;
  let mockStorageService: any;
  let mockContentExtractor: any;
  let mockLinkManager: any;
  let mockMediaDetector: any;
  let mockMediaDownloader: any;
  let mockMediaStorage: any;

  beforeEach(async () => {
    // 创建mock服务
    mockBrowserService = {
      launch: vi.fn().mockImplementation(async () => {
        // Mock implementation that doesn't call real playwright
        return Promise.resolve();
      }),
      crawlPage: vi.fn().mockResolvedValue({
        html: '<html><body>Test content</body></html>',
        title: 'Test Page',
        contentType: 'text/html',
        statusCode: 200
      }),
      close: vi.fn().mockImplementation(async () => {
        // Mock implementation that doesn't call real playwright
        return Promise.resolve();
      }),
    };

    mockStorageService = {
      savePageData: vi.fn().mockResolvedValue('test-path'),
      saveScreenshot: vi.fn().mockResolvedValue('screenshot-path'),
      saveSessionMetadata: vi.fn().mockResolvedValue('metadata-path'),
      getClient: vi.fn().mockReturnValue({}),
      getBucketName: vi.fn().mockReturnValue('test-bucket'),
    };

    mockContentExtractor = {
      extractContent: vi.fn().mockReturnValue({
        title: 'Test Page',
        content: 'Test content',
        wordCount: 100,
        links: ['https://example.com/link1'],
        images: ['https://example.com/image1.jpg']
      }),
    };

    mockLinkManager = {
      addUrl: vi.fn().mockReturnValue(undefined),
      getNextUrl: vi.fn().mockReturnValue(null),
      markAsProcessed: vi.fn().mockReturnValue(undefined),
      hasUnprocessedUrls: vi.fn().mockReturnValue(false),
      getStats: vi.fn().mockReturnValue({ total: 0, processed: 0, pending: 0 }),
      clear: vi.fn().mockReturnValue(undefined),
    };

    mockMediaDetector = {
      detectMediaFiles: vi.fn().mockReturnValue([]),
    };

    mockMediaDownloader = {
      downloadMediaFiles: vi.fn().mockResolvedValue([]),
    };

    mockMediaStorage = {
      saveMediaFiles: vi.fn().mockResolvedValue(undefined),
      getMediaFilesBySession: vi.fn().mockResolvedValue([]),
      getMediaStats: vi.fn().mockResolvedValue({ totalFiles: 0, totalSize: 0 }),
    };

    module = await Test.createTestingModule({
      providers: [
        WebsiteCrawlerService,
        { provide: BrowserService, useValue: mockBrowserService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: ContentExtractorService, useValue: mockContentExtractor },
        { provide: LinkManagerService, useValue: mockLinkManager },
        { provide: MediaDetectorService, useValue: mockMediaDetector },
        { provide: MediaDownloaderService, useValue: mockMediaDownloader },
        { provide: MediaStorageService, useValue: mockMediaStorage },
      ],
    }).compile();

    service = module.get<WebsiteCrawlerService>(WebsiteCrawlerService);
  });

  afterEach(async () => {
    await module.close();
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('应该能够获取活跃会话列表', () => {
      const sessions = service.getActiveSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });

    it('应该能够获取不存在的会话状态', () => {
      const session = service.getSessionStatus('non-existent-session');
      expect(session).toBeNull();
    });
  });

  describe('爬取会话管理测试', () => {
    const mockCrawlRequest: CrawlRequest = {
      startUrl: 'https://example.com',
      maxDepth: 2,
      maxPages: 10,
      takeScreenshots: true,
      userAgent: 'Test Crawler',
      allowedDomains: ['example.com'],
      excludePatterns: ['/admin/*'],
      mediaOptions: {
        enabled: true,
        mediaTypes: [{
          type: 'image',
          mode: 'inherit',
          extensions: ['jpg', 'png']
        }],
        maxFileSize: 10,
        downloadTimeout: 30,
        concurrent: 3
      }
    };

    it('应该能够启动爬取会话', async () => {
      const response = await service.crawlWebsite(mockCrawlRequest);
      
      expect(response.status).toBe('started');
      expect(response.sessionId).toBeDefined();
      expect(response.message).toContain('爬取任务已启动');
    });

    it('应该能够获取会话状态', async () => {
      const response = await service.crawlWebsite(mockCrawlRequest);
      const session = service.getSessionStatus(response.sessionId);
      
      expect(session).toBeDefined();
      expect(session!.sessionId).toBe(response.sessionId);
      expect(session!.status).toBe('running');
      expect(session!.startUrl).toBe(mockCrawlRequest.startUrl);
      expect(session!.maxDepth).toBe(mockCrawlRequest.maxDepth);
      expect(session!.maxPages).toBe(mockCrawlRequest.maxPages);
    });

    it('应该能够停止爬取会话', async () => {
      const response = await service.crawlWebsite(mockCrawlRequest);
      const stopResponse = await service.stopCrawling(response.sessionId);
      
      expect(stopResponse.success).toBe(true);
      expect(stopResponse.message).toContain('已成功终止');
    });

    it('应该能够处理停止不存在的会话', async () => {
      const response = await service.stopCrawling('non-existent-session');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('不存在或已结束');
    });

    it('应该能够处理停止已完成的会话', async () => {
      const response = await service.crawlWebsite(mockCrawlRequest);
      const session = service.getSessionStatus(response.sessionId);
      
      // 手动设置会话状态为已完成
      if (session) {
        session.status = 'completed';
      }
      
      const stopResponse = await service.stopCrawling(response.sessionId);
      expect(stopResponse.success).toBe(false);
      expect(stopResponse.message).toContain('无法终止');
    });
  });

  describe('异常处理测试', () => {
    it('应该处理无效的起始URL', async () => {
      const invalidRequest: CrawlRequest = {
        startUrl: 'invalid-url',
        maxDepth: 1
      };

      const response = await service.crawlWebsite(invalidRequest);
      expect(response.status).toBe('failed');
      expect(response.message).toContain('失败');
    });

    it('应该处理浏览器启动失败', async () => {
      mockBrowserService.launch.mockRejectedValue(new Error('Browser launch failed'));
      
      const request: CrawlRequest = {
        startUrl: 'https://example.com',
        maxDepth: 1
      };

      const response = await service.crawlWebsite(request);
      expect(response.status).toBe('started'); // 异步执行，初始状态为started
    });
  });

  describe('配置选项测试', () => {
    it('应该正确处理默认配置', async () => {
      const minimalRequest: CrawlRequest = {
        startUrl: 'https://example.com'
      };

      const response = await service.crawlWebsite(minimalRequest);
      const session = service.getSessionStatus(response.sessionId);
      
      expect(session).toBeDefined();
      expect(session!.maxDepth).toBeDefined();
      expect(session!.maxPages).toBeDefined();
      expect(session!.isCompleteCrawl).toBeDefined();
      expect(session!.takeScreenshots).toBeDefined();
      expect(session!.allowedDomains).toBeDefined();
      expect(session!.excludePatterns).toBeDefined();
    });

    it('应该正确处理媒体选项', async () => {
      const requestWithMedia: CrawlRequest = {
        startUrl: 'https://example.com',
        mediaOptions: {
          enabled: true,
          mediaTypes: [
            { type: 'image', mode: 'inherit' },
            { type: 'video', mode: 'override', extensions: ['mp4', 'avi'] }
          ],
          maxFileSize: 50,
          downloadTimeout: 60,
          concurrent: 5
        }
      };

      const response = await service.crawlWebsite(requestWithMedia);
      const session = service.getSessionStatus(response.sessionId);
      
      expect(session).toBeDefined();
      expect(session!.mediaOptions).toBeDefined();
      expect(session!.mediaOptions!.enabled).toBe(true);
      expect(session!.mediaOptions!.mediaTypes).toHaveLength(2);
      expect(session!.mediaOptions!.maxFileSize).toBe(50);
    });

    it('应该正确处理域名限制', async () => {
      const requestWithDomains: CrawlRequest = {
        startUrl: 'https://example.com',
        allowedDomains: ['example.com', 'subdomain.example.com'],
        excludePatterns: ['/private/*', '/admin/*']
      };

      const response = await service.crawlWebsite(requestWithDomains);
      const session = service.getSessionStatus(response.sessionId);
      
      expect(session).toBeDefined();
      expect(session!.allowedDomains).toEqual(['example.com', 'subdomain.example.com']);
      expect(session!.excludePatterns).toEqual(['/private/*', '/admin/*']);
    });
  });

  describe('会话生命周期测试', () => {
    it('应该正确设置会话的开始时间', async () => {
      const request: CrawlRequest = {
        startUrl: 'https://example.com'
      };

      const beforeStart = new Date();
      const response = await service.crawlWebsite(request);
      const afterStart = new Date();
      const session = service.getSessionStatus(response.sessionId);
      
      expect(session).toBeDefined();
      expect(session!.startTime).toBeInstanceOf(Date);
      expect(session!.startTime.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
      expect(session!.startTime.getTime()).toBeLessThanOrEqual(afterStart.getTime());
    });

    it('应该正确初始化会话统计信息', async () => {
      const request: CrawlRequest = {
        startUrl: 'https://example.com'
      };

      const response = await service.crawlWebsite(request);
      const session = service.getSessionStatus(response.sessionId);
      
      expect(session).toBeDefined();
      expect(session!.pagesProcessed).toBe(0);
      expect(session!.totalPages).toBe(0);
      expect(session!.errors).toEqual([]);
      expect(session!.endTime).toBeUndefined();
    });

    it('应该在停止时设置结束时间', async () => {
      const request: CrawlRequest = {
        startUrl: 'https://example.com'
      };

      const response = await service.crawlWebsite(request);
      await service.stopCrawling(response.sessionId);
      const session = service.getSessionStatus(response.sessionId);
      
      expect(session).toBeDefined();
      expect(session!.endTime).toBeInstanceOf(Date);
      expect(session!.status).toBe('stopped');
    });
  });
});