import { PlaywrightCrawler, Dataset, RequestQueue } from 'crawlee';
import { MockServer } from './mock-server.js';

export interface TestCrawlerOptions {
  maxConcurrency?: number;
  maxRequestsPerCrawl?: number;
  headless?: boolean;
}

export class TestCrawlerHelper {
  private mockServer: MockServer;
  private crawler: PlaywrightCrawler;
  private isServerStarted = false;

  constructor(options: TestCrawlerOptions = {}) {
    this.mockServer = new MockServer();
    
    this.crawler = new PlaywrightCrawler({
      maxConcurrency: options.maxConcurrency || 1,
      maxRequestsPerCrawl: options.maxRequestsPerCrawl || 10,
      launchContext: {
        launchOptions: {
          headless: options.headless !== false
        }
      },
      requestHandler: async ({ page, request }) => {
        // 默认处理器，可以被覆盖
        const title = await page.title();
        const content = await page.textContent('body');
        
        await Dataset.pushData({
          url: request.url,
          title,
          content: content?.trim()
        });
      }
    });
  }

  async startServer(): Promise<void> {
    if (!this.isServerStarted) {
      await this.mockServer.start();
      this.isServerStarted = true;
    }
  }

  async stopServer(): Promise<void> {
    if (this.isServerStarted) {
      await this.mockServer.stop();
      this.isServerStarted = false;
    }
  }

  getServerUrl(path: string = ''): string {
    return this.mockServer.getUrl(path);
  }

  getCrawler(): PlaywrightCrawler {
    return this.crawler;
  }

  setRequestHandler(handler: (context: any) => Promise<void>) {
    this.crawler = new PlaywrightCrawler({
      ...this.crawler.config,
      requestHandler: handler
    });
  }

  async run(urls: string[]): Promise<void> {
    await this.crawler.run(urls);
  }

  async cleanup(): Promise<void> {
    await this.stopServer();
    // 清理存储
    await this.clearStorage();
  }

  private async clearStorage(): Promise<void> {
    try {
      const dataset = await Dataset.open();
      await dataset.drop();
    } catch (error) {
      // 忽略清理错误
    }
    
    try {
      const queue = await RequestQueue.open();
      await queue.drop();
    } catch (error) {
      // 忽略清理错误
    }
  }
}

export async function withMockServer<T>(
  testFn: (helper: TestCrawlerHelper) => Promise<T>
): Promise<T> {
  const helper = new TestCrawlerHelper();
  
  try {
    await helper.startServer();
    return await testFn(helper);
  } finally {
    await helper.cleanup();
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateTestUrls(count: number, baseUrl: string = 'http://localhost:3000'): string[] {
  return Array.from({ length: count }, (_, i) => `${baseUrl}/page${i + 1}`);
}