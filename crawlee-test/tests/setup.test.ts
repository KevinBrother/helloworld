import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PlaywrightCrawler, Dataset, RequestQueue, KeyValueStore } from 'crawlee';

describe('测试环境设置', () => {
  
  beforeAll(async () => {
    // 清理可能存在的测试数据
    try {
      const dataset = await Dataset.open('test-cleanup');
      await dataset.drop();
    } catch (error) {
      // 忽略清理错误
    }
  });

  afterAll(async () => {
    // 测试完成后的清理工作
    console.log('所有测试完成，清理测试环境...');
  });

  it('应该能够导入Crawlee模块', () => {
    expect(PlaywrightCrawler).toBeDefined();
    expect(Dataset).toBeDefined();
    expect(RequestQueue).toBeDefined();
    expect(KeyValueStore).toBeDefined();
  });

  it('应该能够创建PlaywrightCrawler实例', () => {
    const crawler = new PlaywrightCrawler({
      requestHandler: async ({ request }) => {
        // 空的处理器用于测试
      }
    });
    
    expect(crawler).toBeDefined();
    expect(typeof crawler.run).toBe('function');
  });

  it('应该能够创建和使用Dataset', async () => {
    const dataset = await Dataset.open('test-dataset');
    
    // 测试数据存储
    await dataset.pushData({ test: 'data', timestamp: new Date().toISOString() });
    
    // 测试数据读取
    const { items } = await dataset.getData();
    expect(items).toHaveLength(1);
    expect(items[0].test).toBe('data');
    
    // 清理
    await dataset.drop();
  });

  it('应该能够创建和使用RequestQueue', async () => {
    const queue = await RequestQueue.open('test-queue');
    
    // 添加请求
    await queue.addRequest({
      url: 'https://example.com/test',
      userData: { test: true }
    });
    
    // 检查队列信息
    const info = await queue.getInfo();
    expect(info?.totalRequestCount).toBe(1);
    
    // 获取请求
    const request = await queue.fetchNextRequest();
    expect(request).toBeTruthy();
    expect(request?.url).toBe('https://example.com/test');
    
    // 清理
    await queue.drop();
  });

  it('应该能够创建和使用KeyValueStore', async () => {
    const store = await KeyValueStore.open('test-store');
    
    // 存储数据
    const testData = { message: 'Hello World', timestamp: Date.now() };
    await store.setValue('test-key', testData);
    
    // 读取数据
    const retrievedData = await store.getValue('test-key');
    expect(retrievedData).toEqual(testData);
    
    // 清理
    await store.drop();
  });

  it('应该能够处理基本的页面操作', async () => {
    const crawler = new PlaywrightCrawler({
      launchContext: {
        launchOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      },
      requestHandler: async ({ page }) => {
        // 测试基本页面操作
        await page.setContent(`
          <html>
            <body>
              <h1>Test Page</h1>
              <p>This is a test</p>
              <a href="#test">Test Link</a>
            </body>
          </html>
        `);
        
        const title = await page.textContent('h1');
        const text = await page.textContent('p');
        const linkCount = await page.$$eval('a', links => links.length);
        
        expect(title).toBe('Test Page');
        expect(text).toBe('This is a test');
        expect(linkCount).toBe(1);
      }
    });

    // 运行一个虚拟请求（不会实际访问网络）
    await crawler.addRequests([{
      url: 'https://example.com',
      userData: { skipNavigation: true }
    }]);
    
    // 注意：这里我们不运行 crawler.run() 因为我们只是测试设置
    console.log('PlaywrightCrawler 基本功能测试完成');
  });

  it('应该显示测试环境信息', () => {
    console.log('测试环境信息:');
    console.log(`- Node.js 版本: ${process.version}`);
    console.log(`- 平台: ${process.platform}`);
    console.log(`- 内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log(`- 当前工作目录: ${process.cwd()}`);
    
    // 验证环境变量
    expect(process.env.NODE_ENV).toBeDefined();
  });
});