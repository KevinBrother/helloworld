import { describe, it, expect } from 'vitest';
import { PlaywrightCrawler, Dataset } from 'crawlee';
import { withMockServer } from '../helpers/test-utils';

describe('浏览器自动化 (Playwright Integration)', () => {
  
  describe('无头浏览器页面操作', () => {
    it('应该能够在无头模式下运行', async () => {
      await withMockServer(async (helper) => {
        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          launchContext: {
            launchOptions: { 
              headless: true,
              args: ['--no-sandbox', '--disable-dev-shm-usage']
            }
          },
          requestHandler: async ({ page, request }) => {
            await page.waitForLoadState('networkidle');
            const title = await page.title();
            const userAgent = await page.evaluate(() => navigator.userAgent);
            
            results.push({
              url: request.url,
              title,
              userAgent: userAgent.includes('HeadlessChrome')
            });
          }
        });

        await crawler.run([helper.getServerUrl()]);
        
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Test Page');
        expect(results[0].userAgent).toBe(true); // 确认在无头模式
      });
    });

    it('应该能够等待页面加载完成', async () => {
      await withMockServer(async (helper) => {
        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page, request }) => {
            const startTime = Date.now();
            
            // 等待网络空闲
            await page.waitForLoadState('networkidle');
            
            // 等待特定元素
            await page.waitForSelector('h1');
            
            const endTime = Date.now();
            const loadTime = endTime - startTime;
            
            results.push({
              url: request.url,
              loadTime,
              hasTitle: await page.locator('h1').count() > 0
            });
          }
        });

        await crawler.run([helper.getServerUrl()]);
        
        expect(results).toHaveLength(1);
        expect(results[0].loadTime).toBeGreaterThan(0);
        expect(results[0].hasTitle).toBe(true);
      });
    });
  });

  describe('JavaScript渲染页面处理', () => {
    it('应该能够处理动态内容', async () => {
      await withMockServer(async (helper) => {
        // 添加带JavaScript的响应
        helper['mockServer'].addResponse('/dynamic', {
          status: 200,
          body: `
            <html>
              <head><title>Dynamic Page</title></head>
              <body>
                <div id="content">Loading...</div>
                <script>
                  setTimeout(() => {
                    document.getElementById('content').textContent = 'Dynamic Content Loaded';
                    document.body.classList.add('loaded');
                  }, 100);
                </script>
              </body>
            </html>
          `
        });

        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page }) => {
            // 等待动态内容加载
            await page.waitForFunction(() => 
              document.querySelector('#content')?.textContent === 'Dynamic Content Loaded'
            );
            
            const content = await page.textContent('#content');
            const hasLoadedClass = await page.evaluate(() => 
              document.body.classList.contains('loaded')
            );
            
            results.push({ content, hasLoadedClass });
          }
        });

        await crawler.run([helper.getServerUrl('/dynamic')]);
        
        expect(results).toHaveLength(1);
        expect(results[0].content).toBe('Dynamic Content Loaded');
        expect(results[0].hasLoadedClass).toBe(true);
      });
    });

    it('应该能够执行页面滚动', async () => {
      await withMockServer(async (helper) => {
        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page }) => {
            // 记录初始滚动位置
            const initialScroll = await page.evaluate(() => window.scrollY);
            
            // 滚动到页面底部
            await page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
            });
            
            // 等待滚动完成
            await page.waitForTimeout(100);
            
            const finalScroll = await page.evaluate(() => window.scrollY);
            
            results.push({
              initialScroll,
              finalScroll,
              scrolled: finalScroll > initialScroll
            });
          }
        });

        await crawler.run([helper.getServerUrl()]);
        
        expect(results).toHaveLength(1);
        expect(results[0].initialScroll).toBe(0);
        expect(results[0].scrolled).toBe(true);
      });
    });
  });

  describe('表单填写和提交', () => {
    it('应该能够填写表单字段', async () => {
      await withMockServer(async (helper) => {
        // 添加带表单的页面
        helper['mockServer'].addResponse('/form', {
          status: 200,
          body: `
            <html>
              <body>
                <form id="testForm">
                  <input name="username" type="text" />
                  <input name="email" type="email" />
                  <select name="country">
                    <option value="us">US</option>
                    <option value="uk">UK</option>
                  </select>
                  <textarea name="message"></textarea>
                  <input type="checkbox" name="agree" />
                  <button type="submit">Submit</button>
                </form>
              </body>
            </html>
          `
        });

        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page }) => {
            // 填写表单字段
            await page.fill('input[name="username"]', 'testuser');
            await page.fill('input[name="email"]', 'test@example.com');
            await page.selectOption('select[name="country"]', 'uk');
            await page.fill('textarea[name="message"]', 'Test message');
            await page.check('input[name="agree"]');
            
            // 验证填写的值
            const formData = await page.evaluate(() => ({
              username: (document.querySelector('[name="username"]') as HTMLInputElement)?.value,
              email: (document.querySelector('[name="email"]') as HTMLInputElement)?.value,
              country: (document.querySelector('[name="country"]') as HTMLSelectElement)?.value,
              message: (document.querySelector('[name="message"]') as HTMLTextAreaElement)?.value,
              agree: (document.querySelector('[name="agree"]') as HTMLInputElement)?.checked
            }));
            
            results.push(formData);
          }
        });

        await crawler.run([helper.getServerUrl('/form')]);
        
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({
          username: 'testuser',
          email: 'test@example.com',
          country: 'uk',
          message: 'Test message',
          agree: true
        });
      });
    });
  });

  describe('页面截图功能', () => {
    it('应该能够截取页面屏幕截图', async () => {
      await withMockServer(async (helper) => {
        const screenshots: string[] = [];
        
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page, request }) => {
            const screenshot = await page.screenshot({ 
              fullPage: true,
              type: 'png'
            });
            
            // 验证截图数据
            expect(screenshot).toBeInstanceOf(Buffer);
            expect(screenshot.length).toBeGreaterThan(0);
            
            const base64Screenshot = screenshot.toString('base64');
            screenshots.push(base64Screenshot);
            
            await Dataset.pushData({
              url: request.loadedUrl,
              screenshot: base64Screenshot,
              screenshotSize: screenshot.length
            });
          }
        });

        await crawler.run([helper.getServerUrl()]);
        
        expect(screenshots).toHaveLength(1);
        expect(screenshots[0]).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 格式

        // 验证数据已保存到 Dataset
        const dataset = await Dataset.open();
        const { items } = await dataset.getData();
        
        expect(items).toHaveLength(1);
        expect(items[0].screenshot).toBeTruthy();
        expect(items[0].screenshotSize).toBeGreaterThan(0);

        await dataset.drop();
      });
    });

    it('应该能够截取特定元素的截图', async () => {
      await withMockServer(async (helper) => {
        const crawler = new PlaywrightCrawler({
          requestHandler: async ({ page }) => {
            // 等待元素出现
            await page.waitForSelector('h1');
            
            // 截取特定元素
            const element = page.locator('h1');
            const screenshot = await element.screenshot();
            
            expect(screenshot).toBeInstanceOf(Buffer);
            expect(screenshot.length).toBeGreaterThan(0);
            
            // 验证截图尺寸更小（只是标题元素）
            const fullPageScreenshot = await page.screenshot();
            expect(screenshot.length).toBeLessThan(fullPageScreenshot.length);
          }
        });

        await crawler.run([helper.getServerUrl()]);
      });
    });
  });

  describe('Cookie和会话管理', () => {
    it('应该能够管理Cookie', async () => {
      await withMockServer(async (helper) => {
        const results: any[] = [];
        
        const crawler = new PlaywrightCrawler({
          persistCookiesPerSession: true,
          preNavigationHooks: [
            async ({ page }) => {
              // 设置Cookie
              await page.context().addCookies([
                {
                  name: 'test_cookie',
                  value: 'test_value',
                  domain: 'localhost',
                  path: '/'
                }
              ]);
            }
          ],
          requestHandler: async ({ page }) => {
            // 验证Cookie
            const cookies = await page.context().cookies();
            const testCookie = cookies.find(c => c.name === 'test_cookie');
            
            results.push({
              cookieCount: cookies.length,
              testCookieValue: testCookie?.value
            });
          }
        });

        await crawler.run([helper.getServerUrl()]);
        
        expect(results).toHaveLength(1);
        expect(results[0].cookieCount).toBeGreaterThan(0);
        expect(results[0].testCookieValue).toBe('test_value');
      });
    });

    it('应该能够使用会话池', async () => {
      await withMockServer(async (helper) => {
        const sessionIds: string[] = [];
        
        const crawler = new PlaywrightCrawler({
          useSessionPool: true,
          sessionPoolOptions: {
            maxPoolSize: 2,
            sessionOptions: {
              maxUsageCount: 1
            }
          },
          requestHandler: async ({ session, request }) => {
            if (session) {
              sessionIds.push(session.id);
              
              // 记录会话使用情况
              await Dataset.pushData({
                url: request.url,
                sessionId: session.id,
                usageCount: session.usageCount
              });
            }
          }
        });

        const urls = [
          helper.getServerUrl('/page1'),
          helper.getServerUrl('/page2')
        ];

        await crawler.run(urls);
        
        expect(sessionIds).toHaveLength(2);
        
        const dataset = await Dataset.open();
        const { items } = await dataset.getData();
        
        expect(items).toHaveLength(2);
        expect(items.every(item => item.sessionId)).toBe(true);

        await dataset.drop();
      });
    });
  });
});