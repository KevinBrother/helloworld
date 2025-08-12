import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import {
  PageAnalysisDto,
  ElementInfo,
  FormInfo,
  LinkInfo,
} from '../dto/page-analysis.dto';
import { PageInfo, ExtractedData } from '../dto/crawl-result.dto';
import { ExtractionRule } from '../dto/crawl-request.dto';

@Injectable()
export class PageAnalyzerService {
  private readonly logger = new Logger(PageAnalyzerService.name);

  async analyzePage(page: Page): Promise<PageAnalysisDto> {
    const startTime = Date.now();
    this.logger.log('开始分析页面结构...');

    try {
      const url = page.url();
      const title = await page.title();
      const description = await this.getMetaDescription(page);
      const pageType = await this.detectPageType(page);
      const mainElements = await this.extractMainElements(page);
      const forms = await this.extractForms(page);
      const links = await this.extractLinks(page);
      const images = await this.extractImages(page);
      const antiCrawlerMechanisms =
        await this.detectAntiCrawlerMechanisms(page);
      const suggestedRules = await this.generateSuggestedRules(page);

      const analysisTime = Date.now() - startTime;

      return {
        url,
        title,
        description,
        pageType,
        mainElements,
        forms,
        links,
        images,
        antiCrawlerMechanisms,
        suggestedRules,
        timestamp: new Date(),
        analysisTime,
      };
    } catch (error) {
      this.logger.error('页面分析失败', error);
      throw error;
    }
  }

  async extractData(
    page: Page,
    rules?: ExtractionRule[],
  ): Promise<ExtractedData> {
    if (!rules || rules.length === 0) {
      return await this.extractDefaultData(page);
    }

    const data: ExtractedData = {};

    for (const rule of rules) {
      try {
        const elements = await page.$$(rule.selector);

        if (rule.multiple) {
          data[rule.name] = [];
          for (const element of elements) {
            const value = await this.extractElementValue(element, rule);
            if (value !== null) {
              (data[rule.name] as unknown[]).push(value);
            }
          }
        } else {
          const element = elements[0];
          if (element) {
            data[rule.name] = await this.extractElementValue(element, rule);
          }
        }
      } catch (error) {
        this.logger.warn(`提取规则 ${rule.name} 执行失败:`, error);
        data[rule.name] = null;
      }
    }

    return data;
  }

  async getPageInfo(page: Page): Promise<PageInfo> {
    const title = await page.title();
    const url = page.url();
    const description = await this.getMetaDescription(page);

    // 获取关键词
    const keywords = await page
      .getAttribute('meta[name="keywords"]', 'content')
      .catch(() => null);

    // 获取页面响应信息
    const pageResponse = await page
      .waitForResponse(() => true, { timeout: 1000 })
      .catch(() => null);

    return {
      title,
      description,
      keywords: keywords ? keywords.split(',').map((k) => k.trim()) : undefined,
      url,
      statusCode: pageResponse?.status() || 200,
      contentType: pageResponse?.headers()['content-type'] || 'text/html',
      size: 0, // 需要实际计算
      loadTime: 0, // 需要实际测量
    };
  }

  private async getMetaDescription(page: Page): Promise<string | undefined> {
    return page
      .$eval('meta[name="description"]', (el) => el.getAttribute('content'))
      .catch(() => undefined) as Promise<string | undefined>;
  }

  private async detectPageType(
    page: Page,
  ): Promise<'static' | 'spa' | 'dynamic'> {
    try {
      // 检测是否为SPA
      const hasReactOrVue = await page.evaluate(() => {
        return (
          !!(window as any).React ||
          !!(window as any).Vue ||
          !!(window as any).angular
        );
      });

      if (hasReactOrVue) {
        return 'spa';
      }

      // 检测是否有动态内容
      const hasDynamicContent = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          if (
            script.textContent?.includes('fetch') ||
            script.textContent?.includes('XMLHttpRequest')
          ) {
            return true;
          }
        }
        return false;
      });

      return hasDynamicContent ? 'dynamic' : 'static';
    } catch (error) {
      return 'static';
    }
  }

  private async extractMainElements(page: Page): Promise<ElementInfo[]> {
    return page.evaluate(() => {
      const elements: ElementInfo[] = [];
      const selectors = [
        'h1',
        'h2',
        'h3',
        '.content',
        '#content',
        'main',
        'article',
        '.article',
      ];

      selectors.forEach((selector) => {
        const els = document.querySelectorAll(selector);
        els.forEach((el) => {
          elements.push({
            tag: el.tagName.toLowerCase(),
            selector: selector,
            text: el.textContent?.slice(0, 100),
            attributes: Object.fromEntries(
              Array.from(el.attributes).map((attr) => [attr.name, attr.value]),
            ),
            children: el.children.length,
          });
        });
      });

      return elements;
    });
  }

  private async extractForms(page: Page): Promise<FormInfo[]> {
    return page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      return Array.from(forms).map((form) => ({
        action: form.action,
        method: form.method || 'GET',
        fields: Array.from(
          form.querySelectorAll('input, select, textarea'),
        ).map((field) => ({
          name: field.getAttribute('name') || '',
          type: field.getAttribute('type') || field.tagName.toLowerCase(),
          required: field.hasAttribute('required'),
          placeholder: field.getAttribute('placeholder') || undefined,
        })),
      }));
    });
  }

  private async extractLinks(page: Page): Promise<LinkInfo[]> {
    return page.evaluate(() => {
      const links = document.querySelectorAll('a[href]');
      const currentDomain = window.location.hostname;

      return Array.from(links).map((link) => {
        const href = link.getAttribute('href') || '';
        const url = new URL(href, window.location.href);

        return {
          href: url.href,
          text: link.textContent?.trim() || '',
          type: url.hostname === currentDomain ? 'internal' : 'external',
        };
      });
    });
  }

  private async extractImages(page: Page) {
    return page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return Array.from(images).map((img) => ({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth || undefined,
        height: img.naturalHeight || undefined,
      }));
    });
  }

  private async detectAntiCrawlerMechanisms(page: Page): Promise<string[]> {
    const mechanisms: string[] = [];

    // 检测验证码
    const hasCaptcha = await page
      .$('img[src*="captcha"], .captcha, #captcha')
      .then((el) => !!el);
    if (hasCaptcha) mechanisms.push('captcha');

    // 检测Cloudflare
    const hasCloudflare = await page.$('[data-cf-beacon]').then((el) => !!el);
    if (hasCloudflare) mechanisms.push('cloudflare');

    // 检测频率限制
    const hasRateLimit = await page.evaluate(() => {
      return (
        document.body.textContent?.includes('rate limit') ||
        document.body.textContent?.includes('too many requests')
      );
    });
    if (hasRateLimit) mechanisms.push('rate-limit');

    return mechanisms;
  }

  private async generateSuggestedRules(page: Page) {
    return page.evaluate(() => {
      const rules: Array<{
        name: string;
        selector: string;
        type: string;
        confidence: number;
      }> = [];

      // 标题规则
      if (document.querySelector('h1')) {
        rules.push({
          name: 'title',
          selector: 'h1',
          type: 'text',
          confidence: 0.9,
        });
      }

      // 内容规则
      const contentSelectors = [
        '.content',
        '#content',
        'main',
        'article',
        '.article',
      ];
      for (const selector of contentSelectors) {
        if (document.querySelector(selector)) {
          rules.push({
            name: 'content',
            selector,
            type: 'text',
            confidence: 0.8,
          });
          break;
        }
      }

      return rules;
    });
  }

  private async extractDefaultData(page: Page): Promise<ExtractedData> {
    try {
      return await page.evaluate(() => {
        const data: Record<string, unknown> = {};

        // 提取标题
        const title = document.querySelector('h1')?.textContent?.trim();
        if (title) data.title = title;

        // 提取内容
        const contentSelectors = ['.content', '#content', 'main', 'article'];
        for (const selector of contentSelectors) {
          const content = document.querySelector(selector)?.textContent?.trim();
          if (content) {
            data.content = content;
            break;
          }
        }

        // 提取链接
        const links = Array.from(document.querySelectorAll('a[href]')).map(
          (link) => ({
            text: (link as HTMLAnchorElement).textContent?.trim(),
            href: (link as HTMLAnchorElement).getAttribute('href'),
          }),
        );
        if (links.length > 0) data.links = links;

        return data;
      });
    } catch (error) {
      return {};
    }
  }

  private async extractElementValue(
    element: any,
    rule: ExtractionRule,
  ): Promise<unknown> {
    switch (rule.type) {
      case 'text':
        return await element.textContent();
      case 'html':
        return await element.innerHTML();
      case 'attribute':
        return rule.attribute
          ? await element.getAttribute(rule.attribute)
          : null;
      case 'link':
        return await element.getAttribute('href');
      case 'image':
        return await element.getAttribute('src');
      default:
        return await element.textContent();
    }
  }
}
