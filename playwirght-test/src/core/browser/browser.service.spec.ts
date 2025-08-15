import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserService } from './browser.service';
import { chromium } from 'playwright';

// Mock Playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

describe('BrowserService', () => {
  let service: BrowserService;
  let module: TestingModule;
  let mockBrowser: any;
  let mockContext: any;
  let mockPage: any;

  beforeEach(async () => {
    // 创建 Mock 对象
    mockPage = {
      goto: vi.fn(),
      title: vi.fn(),
      content: vi.fn(),
      screenshot: vi.fn(),
      close: vi.fn(),
      setDefaultTimeout: vi.fn(),
      on: vi.fn(),
      waitForLoadState: vi.fn(),
      waitForSelector: vi.fn(),
      evaluate: vi.fn(),
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
      on: vi.fn(),
    };

    mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
    };

    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser);

    module = await Test.createTestingModule({
      providers: [BrowserService],
    }).compile();

    service = module.get<BrowserService>(BrowserService);
  });

  afterEach(async () => {
    await service.close();
    await module.close();
    vi.clearAllMocks();
  });

  describe('基础功能测试', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('浏览器生命周期管理', () => {
    it('should launch browser successfully', async () => {
      await service.launch();
      expect(chromium.launch).toHaveBeenCalled();
    });

    it('should close browser successfully', async () => {
      await service.launch();
      await service.close();
      expect(mockBrowser.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
    });
  });

  describe('页面爬取功能', () => {
    beforeEach(async () => {
      await service.launch();
    });

    it('should crawl page successfully', async () => {
      const testUrl = 'https://example.com';
      const testTitle = 'Test Page';
      const testContent = '<html><body>Test Content</body></html>';

      mockPage.goto.mockResolvedValue({ status: () => 200 });
      mockPage.title.mockResolvedValue(testTitle);
      mockPage.content.mockResolvedValue(testContent);

      const result = await service.crawlPage(testUrl);

      expect(mockPage.goto).toHaveBeenCalledWith(testUrl, expect.any(Object));
      expect(result.title).toBe(testTitle);
      expect(result.html).toBe(testContent);
    }, 10000);

    it('should take screenshot when requested', async () => {
        const testUrl = 'https://example.com';
        const screenshotBuffer = Buffer.from('fake-screenshot-data');
  
        mockPage.goto.mockResolvedValue({ status: () => 200 });
        mockPage.title.mockResolvedValue('Test Page');
        mockPage.content.mockResolvedValue('<html></html>');
        mockPage.screenshot.mockResolvedValue(screenshotBuffer);
  
        const result = await service.crawlPage(testUrl, { takeScreenshot: true });
  
        expect(mockPage.screenshot).toHaveBeenCalledWith({
          fullPage: true,
          type: 'png',
        });
        expect(result.screenshot).toEqual(screenshotBuffer);
      }, 10000);
  });

  describe('错误处理', () => {
    it('should handle browser not launched error', async () => {
      await service.close(); // Ensure browser is not launched
      await expect(service.crawlPage('https://example.com'))
        .rejects.toThrow('浏览器未启动，请先调用launch()');
    });
  });
});