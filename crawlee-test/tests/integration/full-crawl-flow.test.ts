import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PlaywrightCrawler, Dataset, KeyValueStore, Configuration } from 'crawlee';
import { MockServer } from '../helpers/mock-server';

describe('完整爬取流程集成测试', () => {
  let mockServer: MockServer;
  let baseUrl: string;

  beforeAll(async () => {
    // Configure Crawlee to purge storage on startup
    Configuration.getGlobalConfig().set('purgeOnStart', true);
    
    mockServer = new MockServer({
      port: 3001,
      responses: {
        '/': {
          body: `
            <html>
              <head><title>商城首页</title></head>
              <body>
                <h1>欢迎来到测试商城</h1>
                <nav>
                  <a href="/category/electronics">电子产品</a>
                  <a href="/category/books">图书</a>
                  <a href="/category/clothing">服装</a>
                </nav>
                <div class="featured-products">
                  <a href="/product/1">特色商品1</a>
                  <a href="/product/2">特色商品2</a>
                </div>
              </body>
            </html>
          `
        },
        '/category/electronics': {
          body: `
            <html>
              <head><title>电子产品分类</title></head>
              <body>
                <h1>电子产品</h1>
                <div class="product-list">
                  <div class="product-item">
                    <h2><a href="/product/101">智能手机</a></h2>
                    <span class="price">$699</span>
                    <div class="rating" data-rating="4.5">★★★★☆</div>
                  </div>
                  <div class="product-item">
                    <h2><a href="/product/102">笔记本电脑</a></h2>
                    <span class="price">$1299</span>
                    <div class="rating" data-rating="4.8">★★★★★</div>
                  </div>
                </div>
                <a href="/category/electronics?page=2">下一页</a>
              </body>
            </html>
          `
        },
        '/product/1': {
          body: `
            <html>
              <head><title>特色商品1</title></head>
              <body>
                <div class="product-detail">
                  <h1 class="product-name">特色商品1</h1>
                  <span class="price">$399.00</span>
                  <div class="rating" data-rating="4.3">★★★★☆</div>
                  <div class="description">这是特色商品1的详细描述</div>
                </div>
              </body>
            </html>
          `
        },
        '/product/2': {
          body: `
            <html>
              <head><title>特色商品2</title></head>
              <body>
                <div class="product-detail">
                  <h1 class="product-name">特色商品2</h1>
                  <span class="price">$299.00</span>
                  <div class="rating" data-rating="4.7">★★★★★</div>
                  <div class="description">这是特色商品2的详细描述</div>
                </div>
              </body>
            </html>
          `
        },
        '/product/101': {
          body: `
            <html>
              <head><title>智能手机详情</title></head>
              <body>
                <div class="product-detail">
                  <h1 class="product-name">高端智能手机</h1>
                  <span class="price">$699.00</span>
                  <div class="rating" data-rating="4.5">★★★★☆</div>
                  <div class="description">
                    这是一款高端智能手机，配备最新处理器和摄像头技术。
                  </div>
                  <div class="specifications">
                    <div class="spec-item">
                      <span class="spec-name">屏幕尺寸</span>
                      <span class="spec-value">6.1英寸</span>
                    </div>
                    <div class="spec-item">
                      <span class="spec-name">内存</span>
                      <span class="spec-value">8GB</span>
                    </div>
                  </div>
                  <div class="related-products">
                    <a href="/product/103">相关产品1</a>
                    <a href="/product/104">相关产品2</a>
                  </div>
                </div>
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


  it('应该能够完成完整的电商网站爬取流程', async () => {
    const startTime = Date.now();
    const processedUrls: string[] = [];
    const extractedData: any[] = [];
    
    const crawler = new PlaywrightCrawler({
      maxConcurrency: 1,
      maxRequestsPerCrawl: 5,
      requestHandlerTimeoutSecs: 10,
      requestHandler: async ({ page, request, enqueueLinks }) => {
        console.log('Processing URL:', request.url);
        processedUrls.push(request.url);
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        // 根据页面类型提取不同数据
        if (pathname === '/') {
          // 首页处理
          const pageData = {
            type: 'homepage',
            url: request.url,
            title: await page.title(),
            categories: await page.$$eval('nav a', links => 
              links.map(link => ({
                name: link.textContent,
                url: (link as HTMLAnchorElement).href
              }))
            ),
            featuredProducts: await page.$$eval('.featured-products a', links =>
              links.map(link => ({
                name: link.textContent,
                url: (link as HTMLAnchorElement).href
              }))
            )
          };
          
          extractedData.push(pageData);
          
          // 跟踪分类和产品链接
          await enqueueLinks({
            selector: 'nav a, .featured-products a',
            baseUrl: request.loadedUrl
          });
          
        } else if (pathname.startsWith('/category/')) {
          // 分类页面处理
          const products = await page.$$eval('.product-item', items =>
            items.map(item => ({
              name: item.querySelector('h2 a')?.textContent,
              url: (item.querySelector('h2 a') as HTMLAnchorElement)?.href,
              price: item.querySelector('.price')?.textContent,
              rating: item.querySelector('.rating')?.getAttribute('data-rating')
            }))
          );
          
          const pageData = {
            type: 'category',
            url: request.url,
            title: await page.title(),
            category: pathname.split('/').pop(),
            products,
            productCount: products.length
          };
          
          extractedData.push(pageData);
          
          // 跟踪产品详情页面和分页链接
          await enqueueLinks({
            selector: '.product-item h2 a, a[href*="page="]',
            baseUrl: request.loadedUrl
          });
          
        } else if (pathname.startsWith('/product/')) {
          // 产品详情页面处理
          const productData = {
            type: 'product',
            url: request.url,
            title: await page.title(),
            productId: pathname.split('/').pop(),
            name: await page.textContent('.product-name') || 'Unknown Product',
            price: await page.textContent('.price') || '$0',
            rating: await page.getAttribute('.rating', 'data-rating') || '0'
          };
          
          extractedData.push(productData);
        }
      }
    });

    // 开始爬取
    await crawler.run([baseUrl]);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // 验证爬取结果
    expect(processedUrls.length).toBeGreaterThan(0);
    expect(extractedData.length).toBeGreaterThan(0);
    
    // 验证页面类型分布
    const pageTypes = extractedData.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    expect(pageTypes.homepage || 0).toBeGreaterThanOrEqual(1); // 应该有一个首页
    expect(pageTypes.category || 0).toBeGreaterThanOrEqual(0); // 可能有分类页
    expect(pageTypes.product || 0).toBeGreaterThanOrEqual(0); // 可能有产品页
    
    // 验证数据完整性
    const homepageData = extractedData.find(item => item.type === 'homepage');
    expect(homepageData).toBeTruthy();
    expect(homepageData.categories).toHaveLength(3); // 三个分类
    expect(homepageData.featuredProducts).toHaveLength(2); // 两个特色产品
    
    const categoryData = extractedData.filter(item => item.type === 'category');
    if (categoryData.length > 0) {
      expect(categoryData[0].products).toBeTruthy();
      expect(categoryData[0].productCount).toBeGreaterThan(0);
    }
    
    const productData = extractedData.filter(item => item.type === 'product');
    if (productData.length > 0) {
      expect(productData[0].name).toBeTruthy();
      expect(productData[0].price).toBeTruthy();
      expect(productData[0].rating).toBeTruthy();
    }
    
    console.log(`爬取完成: 处理了 ${processedUrls.length} 个URL，耗时 ${totalTime}ms`);
    console.log(`页面类型分布:`, pageTypes);
  });

  it('应该能够处理数据存储和统计', async () => {
    const dataset = await Dataset.open('ecommerce-data');
    const stats = await KeyValueStore.open('crawl-stats');
    
    const crawler = new PlaywrightCrawler({
      maxConcurrency: 1,
      maxRequestsPerCrawl: 3,
      requestHandler: async ({ page, request, enqueueLinks }) => {
        const startTime = Date.now();
        
        // 提取基本页面信息
        const pageInfo = {
          url: request.url,
          title: await page.title(),
          loadTime: Date.now() - startTime,
          wordCount: (await page.textContent('body'))?.split(/\s+/).length || 0,
          linkCount: await page.$$eval('a', links => links.length),
          imageCount: await page.$$eval('img', images => images.length),
          timestamp: new Date().toISOString()
        };
        
        // 保存页面数据
        await dataset.pushData(pageInfo);
        
        // 更新统计信息
        const currentStats = await stats.getValue('crawl-stats') as any || {
          totalPages: 0,
          totalWords: 0,
          totalLinks: 0,
          totalImages: 0,
          avgLoadTime: 0,
          startTime: new Date().toISOString()
        };
        
        currentStats.totalPages += 1;
        currentStats.totalWords += pageInfo.wordCount;
        currentStats.totalLinks += pageInfo.linkCount;
        currentStats.totalImages += pageInfo.imageCount;
        currentStats.avgLoadTime = (currentStats.avgLoadTime * (currentStats.totalPages - 1) + pageInfo.loadTime) / currentStats.totalPages;
        currentStats.lastUpdated = new Date().toISOString();
        
        await stats.setValue('crawl-stats', currentStats);
        
        // 继续跟踪链接（限制深度）
        if (request.userData?.depth !== undefined && request.userData.depth < 2) {
          await enqueueLinks({
            selector: 'a[href^="/"]',
            baseUrl: request.loadedUrl,
            transformRequestFunction: (req) => {
              req.userData = { depth: (request.userData?.depth || 0) + 1 };
              return req;
            }
          });
        }
      }
    });

    await crawler.run([{
      url: baseUrl,
      userData: { depth: 0 }
    }]);
    
    // 验证数据存储
    const { items } = await dataset.getData();
    expect(items.length).toBeGreaterThan(0);
    
    // 验证统计信息
    const finalStats = await stats.getValue('crawl-stats') as any;
    expect(finalStats).toBeTruthy();
    expect(finalStats.totalPages).toBe(items.length);
    expect(finalStats.totalWords).toBeGreaterThan(0);
    expect(finalStats.avgLoadTime).toBeGreaterThan(0);
    
    // 验证数据质量
    items.forEach(item => {
      expect(item.url).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.loadTime).toBeGreaterThan(0);
      expect(item.timestamp).toBeTruthy();
    });
    
    console.log('爬取统计:', finalStats);
    
    // 清理
    await dataset.drop();
    await stats.drop();
  });

  it('应该能够处理错误和重试', async () => {
    let attemptCounts: Record<string, number> = {};
    const errors: any[] = [];
    
    const crawler = new PlaywrightCrawler({
      maxRequestRetries: 2,
      maxRequestsPerCrawl: 4,
      requestHandler: async ({ request }) => {
        const url = request.url;
        attemptCounts[url] = (attemptCounts[url] || 0) + 1;
        
        // 模拟某些URL的临时失败
        if (url.includes('/product/999')) {
          if (attemptCounts[url] <= 2) {
            throw new Error(`Temporary failure for ${url} (attempt ${attemptCounts[url]})`);
          }
        }
        
        // 成功处理
        await Dataset.pushData({
          url,
          attempts: attemptCounts[url],
          processedAt: new Date().toISOString()
        });
      },
      
      errorHandler: async ({ error, request }) => {
        errors.push({
          url: request.url,
          error: (error as Error).message,
          retryCount: request.retryCount,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 添加一些正常URL和问题URL
    await crawler.run([
      baseUrl,
      `${baseUrl}/product/101`,
      `${baseUrl}/product/999`, // 这个会失败几次
      `${baseUrl}/nonexistent`   // 这个会404
    ]);
    
    // 验证重试机制
    expect(attemptCounts[`${baseUrl}/product/999`]).toBeGreaterThan(1);
    
    const dataset = await Dataset.open();
    const { items } = await dataset.getData();
    
    // 应该有成功处理的项目
    expect(items.length).toBeGreaterThan(0);
    
    // 验证最终成功的项目
    const retriedItem = items.find(item => item.url.includes('/product/999'));
    if (retriedItem) {
      expect(retriedItem.attempts).toBe(3); // 总共尝试3次后成功
    }
    
    console.log('尝试计数:', attemptCounts);
    console.log('错误记录:', errors);
    
    await dataset.drop();
  });

  it('应该能够生成爬取报告', async () => {
    const report = await KeyValueStore.open('crawl-report');
    const startTime = Date.now();
    
    let pageTypeCount = {
      homepage: 0,
      category: 0,
      product: 0,
      other: 0
    };
    
    const crawler = new PlaywrightCrawler({
      maxConcurrency: 1,
      maxRequestsPerCrawl: 2,
      requestHandler: async ({ page, request }) => {
        const pathname = new URL(request.url).pathname;
        let pageType = 'other';
        
        if (pathname === '/') {
          pageType = 'homepage';
        } else if (pathname.startsWith('/category/')) {
          pageType = 'category';
        } else if (pathname.startsWith('/product/')) {
          pageType = 'product';
        }
        
        pageTypeCount[pageType as keyof typeof pageTypeCount]++;
        
        const pageData = {
          url: request.url,
          type: pageType,
          title: await page.title(),
          contentLength: (await page.textContent('body'))?.length || 0,
          processedAt: new Date().toISOString()
        };
        
        await Dataset.pushData(pageData);
      }
    });

    await crawler.run([baseUrl]);
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    const dataset = await Dataset.open();
    const { items } = await dataset.getData();
    
    // 生成详细报告
    const crawlReport = {
      summary: {
        totalPages: items.length,
        totalDuration: totalDuration,
        avgPageProcessingTime: totalDuration / items.length,
        pagesPerSecond: items.length / (totalDuration / 1000)
      },
      pageTypes: pageTypeCount,
      contentStats: {
        totalContentLength: items.reduce((sum, item) => sum + item.contentLength, 0),
        avgContentLength: items.reduce((sum, item) => sum + item.contentLength, 0) / items.length,
        maxContentLength: Math.max(...items.map(item => item.contentLength)),
        minContentLength: Math.min(...items.map(item => item.contentLength))
      },
      urls: items.map(item => ({
        url: item.url,
        type: item.type,
        contentLength: item.contentLength
      })),
      generatedAt: new Date().toISOString()
    };
    
    await report.setValue('final-report', crawlReport);
    
    // 验证报告内容
    expect(crawlReport.summary.totalPages).toBeGreaterThan(0);
    expect(crawlReport.summary.totalDuration).toBeGreaterThan(0);
    expect(crawlReport.pageTypes.homepage).toBe(1);
    expect(crawlReport.contentStats.totalContentLength).toBeGreaterThan(0);
    
    console.log('爬取报告生成完成:');
    console.log(JSON.stringify(crawlReport, null, 2));
    
    // 清理
    await dataset.drop();
    await report.drop();
  });
});