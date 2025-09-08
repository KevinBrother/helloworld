import { describe, it, expect } from 'vitest';
import { PlaywrightCrawler, Dataset, RequestQueue } from 'crawlee';
import { withMockServer } from '../helpers/test-utils';

describe('基础爬虫功能 (Core)', () => {
  
  describe('基本页面请求和响应处理', () => {
    it('应该能够访问页面并获取标题', async () => {
      await withMockServer(async (helper) => {
        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          maxConcurrency: 1,
          requestHandler: async ({ page, request }) => {
            const title = await page.title();
            results.push({ url: request.url, title });
          }
        });

        await crawler.run([helper.getServerUrl()]);
        
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Test Page');
        expect(results[0].url).toContain('localhost:3000');
      });
    });

    it('应该能够处理多个URL请求', async () => {
      await withMockServer(async (helper) => {
        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          maxConcurrency: 2,
          requestHandler: async ({ page, request }) => {
            const title = await page.title();
            results.push({ url: request.url, title });
          }
        });

        const urls = [
          helper.getServerUrl('/'),
          helper.getServerUrl('/page2'),
          helper.getServerUrl('/page3')
        ];

        await crawler.run(urls);
        
        expect(results).toHaveLength(3);
        expect(results.every(r => r.title === 'Test Page')).toBe(true);
      });
    });
  });

  describe('HTML内容提取和解析', () => {
    it('应该能够提取页面元素内容', async () => {
      await withMockServer(async (helper) => {
        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page, request }) => {
            const data = {
              url: request.url,
              title: await page.textContent('h1'),
              description: await page.textContent('p'),
              links: await page.$$eval('a', links => links.map(a => a.href))
            };
            results.push(data);
          }
        });

        await crawler.run([helper.getServerUrl()]);
        
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Test Content');
        expect(results[0].description).toContain('test page');
        expect(results[0].links).toHaveLength(2);
      });
    });

    it('应该能够提取产品页面信息', async () => {
      await withMockServer(async (helper) => {
        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page, request }) => {
            const productData = {
              url: request.url,
              name: await page.textContent('.product-title'),
              price: await page.textContent('.price'),
              rating: await page.getAttribute('.rating', 'data-rating'),
              description: await page.textContent('.description')
            };
            results.push(productData);
          }
        });

        await crawler.run([helper.getServerUrl('/product/1')]);
        
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Test Product');
        expect(results[0].price).toBe('$99.99');
        expect(results[0].rating).toBe('4.5');
        expect(results[0].description).toContain('test product description');
      });
    });
  });

  describe('链接发现和跟踪', () => {
    it('应该能够发现并跟踪页面链接', async () => {
      await withMockServer(async (helper) => {
        const processedUrls: string[] = [];
        
        const crawler = new PlaywrightCrawler({
          maxConcurrency: 1,
          requestHandler: async ({ request, enqueueLinks }) => {
            processedUrls.push(request.url);
            
            console.log('Processing URL:', request.url);
            if (request.url.includes('/product/1')) {
              await enqueueLinks({
                selector: '.related-products a',
                baseUrl: request.loadedUrl
              });
            }
          }
        });

        await crawler.run([helper.getServerUrl('/product/1')]);
        
        // 应该处理了原始URL和发现的链接
        expect(processedUrls.length).toBeGreaterThan(1);
        expect(processedUrls[0]).toContain('/product/1');
      });
    });

    it('应该能够过滤和限制跟踪的链接', async () => {
      await withMockServer(async (helper) => {
        const processedUrls: string[] = [];
        
        const crawler = new PlaywrightCrawler({
          maxRequestsPerCrawl: 3, // 限制请求数量
          requestHandler: async ({ request, enqueueLinks }) => {
            processedUrls.push(request.url);
            
            await enqueueLinks({
              selector: 'a[href]',
              baseUrl: request.loadedUrl,
              transformRequestFunction: (req) => {
                // 只跟踪包含'page'的链接
                if (req.url.includes('page')) {
                  return req;
                }
                return false;
              }
            });
          }
        });

        await crawler.run([helper.getServerUrl('/')]);
        
        expect(processedUrls.length).toBeLessThanOrEqual(3);
        expect(processedUrls.every(url => url.includes('localhost'))).toBe(true);
      });
    });
  });

  describe('请求队列管理', () => {
    it('应该能够手动管理请求队列', async () => {
      const requestQueue = await RequestQueue.open();
      
      // 添加请求到队列
      await requestQueue.addRequest({
        url: 'http://example.com/test1',
        userData: { category: 'test' }
      });
      
      await requestQueue.addRequest({
        url: 'http://example.com/test2',
        userData: { category: 'test' }
      });

      // 检查队列状态
      const queueInfo = await requestQueue.getInfo();
      expect(queueInfo?.totalRequestCount).toBe(2);
      expect(queueInfo?.handledRequestCount).toBe(0);

      // 获取请求
      const request1 = await requestQueue.fetchNextRequest();
      expect(request1).toBeTruthy();
      expect(request1?.url).toBe('http://example.com/test1');
      expect(request1?.userData.category).toBe('test');

      // 标记请求为已处理
      if (request1) {
        await requestQueue.markRequestHandled(request1);
      }

      // 检查更新后的状态
      const updatedInfo = await requestQueue.getInfo();
      expect(updatedInfo?.handledRequestCount).toBe(1);

      // 清理
      await requestQueue.drop();
    });

    it('应该能够处理请求优先级', async () => {
      const requestQueue = await RequestQueue.open();
      
      // 添加不同优先级的请求
      await requestQueue.addRequest({
        url: 'http://example.com/low',
        userData: { priority: 'low' }
      });
      
      await requestQueue.addRequest({
        url: 'http://example.com/high',
        userData: { priority: 'high' }
      }, { forefront: true }); // 高优先级

      // 获取请求应该按优先级顺序
      const firstRequest = await requestQueue.fetchNextRequest();
      expect(firstRequest?.url).toBe('http://example.com/high');

      if (firstRequest) {
        await requestQueue.markRequestHandled(firstRequest);
      }

      const secondRequest = await requestQueue.fetchNextRequest();
      expect(secondRequest?.url).toBe('http://example.com/low');

      if (secondRequest) {
        await requestQueue.markRequestHandled(secondRequest);
      }

      // 清理
      await requestQueue.drop();
    });
  });

  describe('数据存储 (JSON/CSV格式)', () => {
    it('应该能够保存数据到Dataset', async () => {
      const dataset = await Dataset.open();
      
      // 保存测试数据
      await dataset.pushData([
        {
          title: 'Product 1',
          price: 99.99,
          url: 'http://example.com/product1'
        },
        {
          title: 'Product 2', 
          price: 149.99,
          url: 'http://example.com/product2'
        }
      ]);

      // 获取保存的数据
      const { items } = await dataset.getData();
      
      expect(items).toHaveLength(2);
      expect(items[0].title).toBe('Product 1');
      expect(items[0].price).toBe(99.99);
      expect(items[1].title).toBe('Product 2');
      expect(items[1].price).toBe(149.99);

      // 清理
      await dataset.drop();
    });

    it('应该能够获取数据集信息', async () => {
      const dataset = await Dataset.open();
      
      await dataset.pushData({ test: 'data' });
      
      const info = await dataset.getInfo();
      expect(info?.itemCount).toBe(1);
      expect(info?.name).toBeTruthy();

      // 清理
      await dataset.drop();
    });

    it('应该能够处理大量数据', async () => {
      const dataset = await Dataset.open();
      
      // 生成测试数据
      const testData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.random() * 100
      }));

      await dataset.pushData(testData);
      
      const { items } = await dataset.getData();
      expect(items).toHaveLength(100);
      expect(items[0].id).toBe(1);
      expect(items[99].id).toBe(100);

      // 清理
      await dataset.drop();
    });
  });
});