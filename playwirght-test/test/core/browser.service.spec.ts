import { BrowserService } from '../../src/core/browser/browser.service';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import { chromium } from 'playwright';

// Mock Playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

const mockChromium = chromium as any;
const mockBrowser = {
  newContext: vi.fn(),
  close: vi.fn(),
};
const mockContext = {
  newPage: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
};
const mockPage = {
  goto: vi.fn(),
  content: vi.fn(),
  title: vi.fn(),
  screenshot: vi.fn(),
  close: vi.fn(),
  setDefaultTimeout: vi.fn(),
  on: vi.fn(),
  waitForLoadState: vi.fn(),
  waitForSelector: vi.fn(),
  evaluate: vi.fn(),
};

describe('BrowserService', () => {
  let service: BrowserService;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock implementations
    mockChromium.launch.mockResolvedValue(mockBrowser);
    mockBrowser.newContext.mockResolvedValue(mockContext);
    mockContext.newPage.mockResolvedValue(mockPage);
    mockPage.content.mockResolvedValue('<html><body>Test</body></html>');
    mockPage.title.mockResolvedValue('Test Page');
    mockPage.screenshot.mockResolvedValue(Buffer.from('screenshot'));
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.waitForLoadState.mockResolvedValue(undefined);
    mockPage.waitForSelector.mockRejectedValue(new Error('Selector not found')); // Mock selector timeout
    mockPage.evaluate.mockResolvedValue(undefined);

    // 直接创建服务实例，避免 NestJS 依赖注入问题
    service = new BrowserService();
  });

  afterEach(async () => {
    // Clean up service if needed
    if (service) {
      await service.close();
    }
  });

  describe('launch', () => {
    it('should launch browser successfully', async () => {
      await service.launch();
      expect(mockChromium.launch).toHaveBeenCalledWith({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      expect(mockBrowser.newContext).toHaveBeenCalled();
    });

    it('should launch browser with custom user agent', async () => {
      const userAgent = 'Custom User Agent';
      await service.launch({ userAgent });
      expect(mockBrowser.newContext).toHaveBeenCalledWith({ userAgent });
    });

    it('should handle browser launch failure', async () => {
      mockChromium.launch.mockRejectedValue(new Error('Launch failed'));
      await expect(service.launch()).rejects.toThrow('Launch failed');
    });
  });

  describe('crawlPage', () => {
    beforeEach(async () => {
      await service.launch();
    });

    it('should crawl page successfully', async () => {
      const url = 'https://example.com';
      const result = await service.crawlPage(url);

      expect(mockContext.newPage).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(url, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });
      expect(result.html).toBe('<html><body>Test</body></html>');
      expect(result.title).toBe('Test Page');
      expect(mockPage.close).toHaveBeenCalled();
    }, 10000);

    it('should take screenshot when requested', async () => {
      const url = 'https://example.com';
      const result = await service.crawlPage(url, { takeScreenshot: true });

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        fullPage: true,
        type: 'png',
      });
      expect(result.screenshot).toEqual(Buffer.from('screenshot'));
    }, 10000);

    it('should handle page navigation failure', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));
      
      await expect(service.crawlPage('https://example.com')).rejects.toThrow('Navigation failed');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should throw error when browser not launched', async () => {
      const newService = new BrowserService();
      await expect(newService.crawlPage('https://example.com')).rejects.toThrow('浏览器未启动，请先调用launch()');
    });

    it('should handle screenshot failure gracefully', async () => {
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));
      
      const result = await service.crawlPage('https://example.com', { takeScreenshot: true });
      expect(result.screenshot).toBeUndefined();
    }, 10000);
  });

  describe('close', () => {
    it('should close browser and context', async () => {
      await service.launch();
      await service.close();

      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle close when browser not launched', async () => {
      await expect(service.close()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle context creation failure', async () => {
      mockBrowser.newContext.mockRejectedValue(new Error('Context failed'));
      await expect(service.launch()).rejects.toThrow('Context failed');
    });

    it('should handle page creation failure', async () => {
      await service.launch();
      mockContext.newPage.mockRejectedValue(new Error('Page creation failed'));
      
      await expect(service.crawlPage('https://example.com')).rejects.toThrow('Page creation failed');
    });
  });

  describe('configuration', () => {
    it('should set page timeout correctly', async () => {
      await service.launch();
      await service.crawlPage('https://example.com');
      
      expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(60000);
    }, 10000);

    it('should wait for load state', async () => {
      await service.launch();
      await service.crawlPage('https://example.com');
      
      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('domcontentloaded');
    }, 10000);
  });
});