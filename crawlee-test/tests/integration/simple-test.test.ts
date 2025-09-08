import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PlaywrightCrawler } from 'crawlee';
import { MockServer } from '../helpers/mock-server';

describe('简单爬取测试', () => {
  let mockServer: MockServer;
  let baseUrl: string;

  beforeAll(async () => {
    mockServer = new MockServer({
      port: 3002,
      responses: {
        '/': {
          body: `
            <html>
              <head><title>测试首页</title></head>
              <body>
                <h1>欢迎来到测试网站</h1>
                <a href="/page1">页面1</a>
              </body>
            </html>
          `
        },
        '/page1': {
          body: `
            <html>
              <head><title>页面1</title></head>
              <body>
                <h1>这是页面1</h1>
                <p>测试内容</p>
              </body>
            </html>
          `
        }
      }
    });
    
    const port = await mockServer.start();
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  it('应该能够访问模拟服务器', async () => {
    const processedUrls: string[] = [];
    
    const crawler = new PlaywrightCrawler({
      maxConcurrency: 1,
      maxRequestsPerCrawl: 2,
      requestHandler: async ({ request }) => {
        processedUrls.push(request.url);
        console.log('Processing URL:', request.url);
      }
    });

    await crawler.run([baseUrl]);
    
    expect(processedUrls.length).toBeGreaterThan(0);
    expect(processedUrls).toContain(baseUrl);
    
    console.log('Processed URLs:', processedUrls);
  });
});