import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { AntiDetectionConfig } from '../dto/crawl-request.dto';

@Injectable()
export class AntiDetectionService {
  private readonly logger = new Logger(AntiDetectionService.name);

  private readonly defaultUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  async applyAntiDetection(
    page: Page,
    config?: AntiDetectionConfig,
  ): Promise<void> {
    this.logger.debug('应用反检测策略...');

    try {
      // 设置用户代理
      const userAgent = config?.userAgent || this.getRandomUserAgent();
      // await page.setUserAgent(userAgent); // 暂时注释掉，需要检查正确的API

      // 设置视口
      const viewport = config?.viewport || { width: 1920, height: 1080 };
      await page.setViewportSize(viewport);

      // 设置额外请求头
      if (config?.headers) {
        await page.setExtraHTTPHeaders(config.headers);
      }

      // 隐藏自动化特征
      await this.hideAutomationFeatures(page);

      // 模拟人类行为
      await this.simulateHumanBehavior(page);

      // 应用延迟
      if (config?.delay) {
        const delay = this.getRandomDelay(config.delay.min, config.delay.max);
        await page.waitForTimeout(delay);
      }

      this.logger.debug('反检测策略应用完成');
    } catch (error) {
      this.logger.error('应用反检测策略失败', error);
      throw error;
    }
  }

  private getRandomUserAgent(): string {
    const randomIndex = Math.floor(
      Math.random() * this.defaultUserAgents.length,
    );
    return this.defaultUserAgents[randomIndex];
  }

  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async hideAutomationFeatures(page: Page): Promise<void> {
    // 隐藏webdriver属性
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // 修改Chrome对象
    await page.addInitScript(() => {
      (window as any).chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };
    });

    // 修改权限查询
    await page.addInitScript(() => {
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({
            state: Notification.permission,
            name: 'notifications',
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as PermissionStatus);
        }
        return originalQuery(parameters);
      };
    });

    // 修改插件信息
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: 'application/x-google-chrome-pdf',
              suffixes: 'pdf',
              description: 'Portable Document Format',
              enabledPlugin: Plugin,
            },
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            length: 1,
            name: 'Chrome PDF Plugin',
          },
        ],
      });
    });
  }

  private async simulateHumanBehavior(page: Page): Promise<void> {
    // 模拟鼠标移动
    await page.mouse.move(Math.random() * 100, Math.random() * 100);

    // 随机滚动
    await page.evaluate(() => {
      window.scrollTo(0, Math.random() * 100);
    });

    // 随机等待
    await page.waitForTimeout(Math.random() * 1000 + 500);
  }

  async handleCaptcha(page: Page): Promise<boolean> {
    this.logger.log('检测到验证码，尝试处理...');

    // 检测常见验证码类型
    const captchaSelectors = [
      'img[src*="captcha"]',
      '.captcha',
      '#captcha',
      '[data-sitekey]', // reCAPTCHA
      '.cf-challenge-form', // Cloudflare
    ];

    for (const selector of captchaSelectors) {
      const element = await page.$(selector);
      if (element) {
        this.logger.warn(`发现验证码: ${selector}`);
        // 这里可以集成验证码识别服务
        // 目前返回false表示无法处理
        return false;
      }
    }

    return true;
  }

  async detectBlocking(page: Page): Promise<boolean> {
    const blockingIndicators = [
      'Access Denied',
      'Blocked',
      'Rate Limited',
      'Too Many Requests',
      'Cloudflare',
      '403 Forbidden',
      '429 Too Many Requests',
    ];

    const pageContent = await page.textContent('body').catch(() => '');

    return blockingIndicators.some((indicator) =>
      pageContent?.toLowerCase().includes(indicator.toLowerCase()),
    );
  }

  async waitForPageLoad(page: Page, timeout = 30000): Promise<void> {
    try {
      // 等待网络空闲
      await page.waitForLoadState('networkidle', { timeout });

      // 等待DOM内容加载
      await page.waitForLoadState('domcontentloaded', { timeout });

      // 额外等待确保动态内容加载
      await page.waitForTimeout(1000);
    } catch (error) {
      this.logger.warn('页面加载等待超时', error);
    }
  }
}
