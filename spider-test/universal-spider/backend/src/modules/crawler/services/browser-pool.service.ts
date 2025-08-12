import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser } from 'playwright';

export interface BrowserStats {
  active: number;
  queue: number;
  total: number;
}

@Injectable()
export class BrowserPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserPoolService.name);
  private browsers: Browser[] = [];
  private availableBrowsers: Browser[] = [];
  private readonly maxBrowsers = 10;
  private readonly minBrowsers = 2;
  private isInitialized = false;

  async onModuleInit() {
    await this.initializeBrowserPool();
  }

  async onModuleDestroy() {
    await this.closeAllBrowsers();
  }

  private async initializeBrowserPool() {
    this.logger.log('初始化浏览器池...');

    try {
      // 创建最小数量的浏览器实例
      for (let i = 0; i < this.minBrowsers; i++) {
        const browser = await this.createBrowser();
        this.browsers.push(browser);
        this.availableBrowsers.push(browser);
      }

      this.isInitialized = true;
      this.logger.log(
        `浏览器池初始化完成，创建了 ${this.minBrowsers} 个浏览器实例`,
      );
    } catch (error) {
      this.logger.error('浏览器池初始化失败', error);
      throw error;
    }
  }

  private async createBrowser(): Promise<Browser> {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    // 监听浏览器关闭事件
    browser.on('disconnected', () => {
      this.handleBrowserDisconnected(browser);
    });

    return browser;
  }

  async getBrowser(): Promise<Browser> {
    if (!this.isInitialized) {
      await this.initializeBrowserPool();
    }

    // 如果有可用的浏览器，直接返回
    if (this.availableBrowsers.length > 0) {
      const browser = this.availableBrowsers.pop()!;
      this.logger.debug(
        `获取浏览器实例，剩余可用: ${this.availableBrowsers.length}`,
      );
      return browser;
    }

    // 如果没有可用浏览器且未达到最大数量，创建新的
    if (this.browsers.length < this.maxBrowsers) {
      const browser = await this.createBrowser();
      this.browsers.push(browser);
      this.logger.debug(`创建新浏览器实例，总数: ${this.browsers.length}`);
      return browser;
    }

    // 等待浏览器可用
    return new Promise((resolve) => {
      const checkAvailable = () => {
        if (this.availableBrowsers.length > 0) {
          const browser = this.availableBrowsers.pop()!;
          resolve(browser);
        } else {
          setTimeout(checkAvailable, 100);
        }
      };
      checkAvailable();
    });
  }

  releaseBrowser(browser: Browser) {
    if (
      this.browsers.includes(browser) &&
      !this.availableBrowsers.includes(browser)
    ) {
      this.availableBrowsers.push(browser);
      this.logger.debug(
        `释放浏览器实例，可用数量: ${this.availableBrowsers.length}`,
      );
    }
  }

  private handleBrowserDisconnected(browser: Browser) {
    this.logger.warn('浏览器实例意外断开连接');

    // 从池中移除断开的浏览器
    const browserIndex = this.browsers.indexOf(browser);
    if (browserIndex > -1) {
      this.browsers.splice(browserIndex, 1);
    }

    const availableIndex = this.availableBrowsers.indexOf(browser);
    if (availableIndex > -1) {
      this.availableBrowsers.splice(availableIndex, 1);
    }

    // 如果浏览器数量低于最小值，创建新的
    if (this.browsers.length < this.minBrowsers) {
      this.createBrowser()
        .then((newBrowser) => {
          this.browsers.push(newBrowser);
          this.availableBrowsers.push(newBrowser);
          this.logger.log('已创建新浏览器实例替换断开的实例');
        })
        .catch((error) => {
          this.logger.error('创建替换浏览器实例失败', error);
        });
    }
  }

  async getStats(): Promise<BrowserStats> {
    return {
      active: this.browsers.length - this.availableBrowsers.length,
      queue: this.availableBrowsers.length,
      total: this.browsers.length,
    };
  }

  private async closeAllBrowsers() {
    this.logger.log('关闭所有浏览器实例...');

    const closePromises = this.browsers.map(async (browser) => {
      try {
        await browser.close();
      } catch (error) {
        this.logger.error('关闭浏览器实例失败', error);
      }
    });

    await Promise.all(closePromises);
    this.browsers = [];
    this.availableBrowsers = [];
    this.logger.log('所有浏览器实例已关闭');
  }
}
