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
    } catch {
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
    const startTime = Date.now();
    try {
      // 获取页面基本信息
      const url = page.url();
      
      // 提取页面元数据和内容
      const extractedData = await page.evaluate(() => {
        const data: Record<string, unknown> = {};

        // 提取页面标题（优先级：h1 > title > meta title）
        const h1Title = document.querySelector('h1')?.textContent?.trim();
        const pageTitle = document.title?.trim();
        const metaTitle = document
          .querySelector('meta[property="og:title"], meta[name="title"]')
          ?.getAttribute('content')
          ?.trim();
        data.title = h1Title || metaTitle || pageTitle || '';

        // 提取页面描述
        const metaDescription = document
          .querySelector(
            'meta[name="description"], meta[property="og:description"]',
          )
          ?.getAttribute('content')
          ?.trim();
        const firstParagraph = document.querySelector('p')?.textContent?.trim();
        data.description =
          metaDescription || firstParagraph?.substring(0, 200) || '';

        // 提取关键词
        const metaKeywords = document
          .querySelector('meta[name="keywords"]')
          ?.getAttribute('content');
        data.keywords = metaKeywords
          ? metaKeywords.split(',').map((k) => k.trim())
          : [];

        // 提取作者信息
        const author =
          document
            .querySelector(
              'meta[name="author"], meta[property="article:author"], .author, .byline',
            )
            ?.textContent?.trim() ||
          document
            .querySelector(
              'meta[name="author"], meta[property="article:author"]',
            )
            ?.getAttribute('content')
            ?.trim();
        if (author) data.author = author;

        // 提取发布日期
        const publishDate =
          document
            .querySelector(
              'meta[property="article:published_time"], meta[name="date"], time[datetime], .date, .publish-date',
            )
            ?.getAttribute('datetime') ||
          document
            .querySelector(
              'meta[property="article:published_time"], meta[name="date"]',
            )
            ?.getAttribute('content') ||
          document
            .querySelector('time, .date, .publish-date')
            ?.textContent?.trim();
        if (publishDate) data.publishDate = publishDate;

        // 提取页面语言
        const language =
          document.documentElement.lang ||
          document
            .querySelector('meta[http-equiv="content-language"]')
            ?.getAttribute('content') ||
          'unknown';
        data.language = language;

        // 提取内容（增强版）
        const contentSelectors = [
          'article',
          'main',
          '.content',
          '#content',
          '.post-content',
          '.entry-content',
          '.article-content',
          '.post-body',
          '.content-body',
          '.main-content',
        ];
        let content = '';
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            // 移除脚本和样式标签
            const clonedElement = element.cloneNode(true) as Element;
            clonedElement
              .querySelectorAll(
                'script, style, nav, header, footer, aside, .ad, .advertisement',
              )
              .forEach((el) => el.remove());
            content = clonedElement.textContent?.trim() || '';
            if (content.length > 100) break; // 确保内容有意义
          }
        }
        // 如果没有找到主要内容，提取body文本（排除导航等）
        if (!content) {
          const bodyClone = document.body.cloneNode(true) as Element;
          bodyClone
            .querySelectorAll(
              'script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar',
            )
            .forEach((el) => el.remove());
          content = bodyClone.textContent?.trim() || '';
        }
        data.content = content;

        // 提取图片信息（增强版）
        const images = Array.from(document.querySelectorAll('img'))
          .map((img) => ({
            src: img.src,
            alt: img.alt || '',
            title: img.title || '',
            width: img.naturalWidth || img.width || 0,
            height: img.naturalHeight || img.height || 0,
            loading: img.loading || 'eager',
          }))
          .filter(
            (img) =>
              img.src &&
              !img.src.includes('data:image') &&
              img.width > 50 &&
              img.height > 50,
          ); // 过滤小图标
        data.images = images;

        // 提取链接信息（增强版）
        const links = Array.from(document.querySelectorAll('a[href]'))
          .map((link) => {
            const href = (link as HTMLAnchorElement).href;
            const text = link.textContent?.trim() || '';
            const title = link.getAttribute('title') || '';
            const target = link.getAttribute('target') || '';
            const rel = link.getAttribute('rel') || '';
            return { href, text, title, target, rel };
          })
          .filter(
            (link) =>
              link.href &&
              link.text &&
              !link.href.startsWith('javascript:') &&
              !link.href.startsWith('mailto:'),
          );
        data.links = links;

        // 提取结构化数据（JSON-LD）
        const jsonLdScripts = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]'),
        );
        const structuredData = jsonLdScripts
          .map((script) => {
            try {
              return JSON.parse(script.textContent || '{}');
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        if (structuredData.length > 0) data.structuredData = structuredData;

        // 提取Open Graph数据
        const ogData: Record<string, string> = {};
        document.querySelectorAll('meta[property^="og:"]').forEach((meta) => {
          const property = meta.getAttribute('property')?.replace('og:', '');
          const content = meta.getAttribute('content');
          if (property && content) ogData[property] = content;
        });
        if (Object.keys(ogData).length > 0) data.openGraph = ogData;

        // 提取Twitter Card数据
        const twitterData: Record<string, string> = {};
        document.querySelectorAll('meta[name^="twitter:"]').forEach((meta) => {
          const name = meta.getAttribute('name')?.replace('twitter:', '');
          const content = meta.getAttribute('content');
          if (name && content) twitterData[name] = content;
        });
        if (Object.keys(twitterData).length > 0) data.twitterCard = twitterData;

        return data;
      });

      // 获取页面性能数据
      const performanceData = await this.extractPerformanceData(page);
      
      // 获取页面响应信息
      const response = page.context().pages()[0]?.url()
        ? await page
            .goto(page.url(), { waitUntil: 'domcontentloaded', timeout: 5000 })
            .catch(() => null)
        : null;
      
      const endTime = Date.now();
      
      return {
        url,
        title: extractedData.title as string,
        content: extractedData.content as string,
        links: extractedData.links as any[],
        images: extractedData.images as any[],
        metadata: {
          description: extractedData.description as string | undefined,
          keywords: extractedData.keywords as string[] | undefined,
          author: extractedData.author as string | undefined,
          publishDate: extractedData.publishDate
            ? new Date(extractedData.publishDate as string)
            : undefined,
          language: extractedData.language as string | undefined,
          charset: await page.evaluate(() => document.characterSet || 'UTF-8'),
          contentType: response?.headers()['content-type'] || 'text/html',
          statusCode: response?.status() || 200,
          responseTime: endTime - startTime,
          headers: response?.headers() || {},
        },
        performance: performanceData,
        extractionTime: endTime - startTime,
        crawledAt: new Date(),
        structuredData: extractedData.structuredData as Array<{
          type: string;
          data: Record<string, unknown>;
        }> | undefined,
        openGraph: extractedData.openGraph as {
          [key: string]: unknown;
          title?: string;
          description?: string;
          image?: string;
          url?: string;
          type?: string;
          siteName?: string;
        } | undefined,
        twitterCard: extractedData.twitterCard as {
          [key: string]: unknown;
          card?: string;
          title?: string;
          description?: string;
          image?: string;
          creator?: string;
          site?: string;
        } | undefined,
      };
    } catch (error) {
      this.logger.error('数据提取失败', error);
      return {
        url: page.url(),
        title: await page.title().catch(() => ''),
        content: '',
        links: [],
        images: [],
        metadata: {},
        error: error instanceof Error ? error.message : String(error),
        extractionTime: Date.now() - startTime,
        crawledAt: new Date()
      };
    }
  }

  /**
   * 提取页面性能数据
   */
  private async extractPerformanceData(page: Page): Promise<Record<string, any>> {
    try {
      return await page.evaluate(() => {
        const performance = window.performance;
        const timing = performance.timing;
        const navigation = performance.navigation;
        
        // 计算各个阶段的时间
        const loadTimes = {
          // DNS查询时间
          dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
          // TCP连接时间
          tcpTime: timing.connectEnd - timing.connectStart,
          // 请求时间
          requestTime: timing.responseStart - timing.requestStart,
          // 响应时间
          responseTime: timing.responseEnd - timing.responseStart,
          // DOM解析时间
          domParseTime: timing.domContentLoadedEventEnd - timing.domLoading,
          // 资源加载时间
          resourceLoadTime: timing.loadEventEnd - timing.domContentLoadedEventEnd,
          // 总加载时间
          totalLoadTime: timing.loadEventEnd - timing.navigationStart,
          // 首字节时间
          ttfb: timing.responseStart - timing.navigationStart,
          // DOM就绪时间
          domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
          // 页面完全加载时间
          pageLoad: timing.loadEventEnd - timing.navigationStart
        };

        // 获取资源性能数据
        const resources = performance.getEntriesByType('resource').map((entry: any) => ({
          name: entry.name,
          type: entry.initiatorType,
          size: entry.transferSize || 0,
          duration: entry.duration,
          startTime: entry.startTime
        }));

        // 获取内存使用情况（如果支持）
        const memory = (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;

        return {
          loadTimes,
          resources: resources.slice(0, 20), // 限制资源数量
          memory,
          navigationType: navigation.type,
          redirectCount: navigation.redirectCount,
          timestamp: Date.now()
        };
      });
    } catch (error) {
      this.logger.warn('性能数据提取失败', error);
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
