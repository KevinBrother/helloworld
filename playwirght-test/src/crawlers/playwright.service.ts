import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

@Injectable()
export class PlaywrightService {
  private readonly logger = new Logger(PlaywrightService.name);
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  /**
   * 启动浏览器
   */
  async launch(options: { userAgent?: string } = {}): Promise<void> {
    this.logger.log('启动浏览器');
    this.browser = await chromium.launch({
      headless: true, // 无头模式，设为false可看到浏览器界面
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    
    // 创建上下文
    const contextOptions = {};
    if (options.userAgent) {
      contextOptions['userAgent'] = options.userAgent;
    }
    
    this.context = await this.browser.newContext(contextOptions);
    
    // 监听页面请求错误
    this.context.on('weberror', (error) => {
      this.logger.error(`页面错误: ${error.error()}`);
    });
  }

  /**
   * 爬取页面内容
   */
  async crawlPage(url: string, options: { takeScreenshot?: boolean } = {}): Promise<{
    html: string;
    title: string;
    contentType: string | null;
    statusCode: number | null;
    screenshot?: Buffer;
  }> {
    if (!this.browser || !this.context) {
      throw new Error('浏览器未启动，请先调用launch()');
    }

    let page: Page | null = null;
    
    try {
      // 创建新页面
      page = await this.context.newPage();
      
      // 设置页面加载超时
      page.setDefaultTimeout(60000);
      
      // 监听响应以获取状态码和内容类型
      let statusCode: number | null = null;
      let contentType: string | null = null;
      
      page.on('response', (response) => {
        if (response.url() === url) {
          statusCode = response.status();
          contentType = response.headers()['content-type'] || null;
        }
      });
      
      // 导航到页面
      await page.goto(url, {
        waitUntil: 'networkidle', // 等待网络空闲
        timeout: 60000,
      });
      
      // 等待页面加载完成
      await page.waitForLoadState('domcontentloaded');
      
      // 等待导航菜单加载（针对SPA应用）
      try {
        await page.waitForSelector('nav, .md-nav, [role="navigation"], .navigation', { timeout: 5000 });
        this.logger.debug(`导航元素已加载: ${url}`);
      } catch (error) {
        this.logger.debug(`未找到导航元素，继续处理: ${url}`);
      }
      
      // 处理可能的动态内容 - 等待额外时间让JavaScript完全执行
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 尝试滚动页面以触发懒加载内容
      try {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight / 2);
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.debug(`滚动页面失败: ${error.message}`);
      }
      
      // 获取页面内容
      const html = await page.content();
      const title = await page.title();
      
      // 可选截图
      let screenshot: Buffer | undefined;
      if (options.takeScreenshot) {
        try {
          screenshot = await page.screenshot({
            fullPage: true,
            type: 'png',
          });
          this.logger.log(`已为页面 ${url} 生成截图`);
        } catch (error) {
          this.logger.error(`生成截图失败: ${error.message}`);
        }
      }
      
      return { html, title, contentType, statusCode, screenshot };
    } finally {
      // 关闭页面
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('浏览器已关闭');
    }
  }
}
