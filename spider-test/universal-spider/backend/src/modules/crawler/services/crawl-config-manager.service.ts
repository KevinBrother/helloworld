import { Injectable, Logger } from '@nestjs/common';
import { DataStorageService } from '../../data/services/data-storage.service';

export interface CrawlConfig {
  id: string;
  name: string;
  description?: string;
  domain: string;
  urlPatterns: string[]; // 支持的URL模式
  selectors: CrawlSelectors;
  options: CrawlOptions;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  proxy?: ProxyConfig;
  rateLimit: RateLimitConfig;
  validation: ValidationConfig;
  enabled: boolean;
  priority: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface CrawlSelectors {
  title?: string;
  content?: string;
  description?: string;
  keywords?: string;
  author?: string;
  publishDate?: string;
  images?: string;
  links?: string;
  breadcrumbs?: string;
  categories?: string;
  tags?: string;
  price?: string;
  rating?: string;
  reviews?: string;
  custom?: Record<string, string>;
}

export interface CrawlOptions {
  waitForSelector?: string;
  waitTime?: number;
  scrollToBottom?: boolean;
  executeJavaScript?: string;
  removeElements?: string[];
  extractImages?: boolean;
  extractLinks?: boolean;
  followRedirects?: boolean;
  maxRedirects?: number;
  timeout?: number;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  screenshot?: {
    enabled: boolean;
    fullPage?: boolean;
    quality?: number;
  };
}

export interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  rotation?: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  delayBetweenRequests: number;
  respectRobotsTxt: boolean;
  crawlDelay?: number;
}

export interface ValidationConfig {
  requiredFields: string[];
  minContentLength: number;
  maxContentLength: number;
  allowedContentTypes: string[];
  blockedKeywords: string[];
  requiredKeywords: string[];
}

export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: Partial<CrawlConfig>;
  popularity: number;
}

@Injectable()
export class CrawlConfigManagerService {
  private readonly logger = new Logger(CrawlConfigManagerService.name);
  private readonly configs = new Map<string, CrawlConfig>();
  private readonly templates = new Map<string, ConfigTemplate>();

  constructor(private readonly dataStorage: DataStorageService) {
    this.initializeDefaultTemplates();
    this.loadConfigsFromStorage();
  }

  /**
   * 创建新配置
   */
  async createConfig(config: Omit<CrawlConfig, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<CrawlConfig> {
    const newConfig: CrawlConfig = {
      ...config,
      id: this.generateConfigId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    };

    // 验证配置
    this.validateConfig(newConfig);

    this.configs.set(newConfig.id, newConfig);
    await this.saveConfigToStorage(newConfig);
    
    this.logger.log(`配置已创建: ${newConfig.name} (${newConfig.id})`);
    return newConfig;
  }

  /**
   * 更新配置
   */
  async updateConfig(configId: string, updates: Partial<CrawlConfig>): Promise<CrawlConfig | null> {
    const config = this.configs.get(configId);
    if (!config) {
      return null;
    }

    const updatedConfig = {
      ...config,
      ...updates,
      updatedAt: new Date(),
    };

    // 验证更新后的配置
    this.validateConfig(updatedConfig);

    this.configs.set(configId, updatedConfig);
    await this.saveConfigToStorage(updatedConfig);
    
    this.logger.log(`配置已更新: ${updatedConfig.name} (${configId})`);
    return updatedConfig;
  }

  /**
   * 删除配置
   */
  async deleteConfig(configId: string): Promise<boolean> {
    const config = this.configs.get(configId);
    if (!config) {
      return false;
    }

    this.configs.delete(configId);
    await this.deleteConfigFromStorage(configId);
    
    this.logger.log(`配置已删除: ${config.name} (${configId})`);
    return true;
  }

  /**
   * 获取配置
   */
  getConfig(configId: string): CrawlConfig | null {
    return this.configs.get(configId) || null;
  }

  /**
   * 获取所有配置
   */
  getAllConfigs(): CrawlConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 根据域名查找配置
   */
  getConfigByDomain(domain: string): CrawlConfig | null {
    const configs = Array.from(this.configs.values());
    return configs.find(config => 
      config.enabled && config.domain === domain
    ) || null;
  }

  /**
   * 根据URL查找最佳配置
   */
  findBestConfigForUrl(url: string): CrawlConfig | null {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      const configs = Array.from(this.configs.values())
        .filter(config => config.enabled)
        .filter(config => {
          // 检查域名匹配
          if (config.domain !== domain) {
            return false;
          }
          
          // 检查URL模式匹配
          if (config.urlPatterns.length > 0) {
            return config.urlPatterns.some(pattern => 
              this.matchUrlPattern(url, pattern)
            );
          }
          
          return true;
        })
        .sort((a, b) => b.priority - a.priority); // 按优先级排序
      
      return configs[0] || null;
    } catch (error) {
      this.logger.error(`URL解析失败: ${url}`, error);
      return null;
    }
  }

  /**
   * 克隆配置
   */
  async cloneConfig(configId: string, newName: string): Promise<CrawlConfig | null> {
    const originalConfig = this.configs.get(configId);
    if (!originalConfig) {
      return null;
    }

    const clonedConfig = {
      ...originalConfig,
      name: newName,
      enabled: false, // 克隆的配置默认禁用
    };

    delete (clonedConfig as any).id;
    delete (clonedConfig as any).createdAt;
    delete (clonedConfig as any).updatedAt;
    delete (clonedConfig as any).usageCount;
    delete (clonedConfig as any).lastUsed;

    return this.createConfig(clonedConfig);
  }

  /**
   * 从模板创建配置
   */
  async createConfigFromTemplate(templateId: string, customizations: Partial<CrawlConfig>): Promise<CrawlConfig | null> {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    const configData = {
      ...this.getDefaultConfig(),
      ...template.config,
      ...customizations,
    };

    delete (configData as any).id;
    delete (configData as any).createdAt;
    delete (configData as any).updatedAt;
    delete (configData as any).usageCount;

    return this.createConfig(configData as Omit<CrawlConfig, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>);
  }

  /**
   * 获取配置模板
   */
  getTemplates(): ConfigTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 获取配置模板（按分类）
   */
  getTemplatesByCategory(category: string): ConfigTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.category === category);
  }

  /**
   * 测试配置
   */
  async testConfig(config: CrawlConfig, testUrl: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    performance: {
      loadTime: number;
      extractionTime: number;
      totalTime: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // 这里应该调用实际的爬虫服务进行测试
      // 简化实现，返回模拟结果
      
      const loadTime = 1000;
      const extractionTime = 500;
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          title: '测试标题',
          content: '测试内容',
          url: testUrl,
        },
        performance: {
          loadTime,
          extractionTime,
          totalTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          loadTime: 0,
          extractionTime: 0,
          totalTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * 记录配置使用
   */
  async recordConfigUsage(configId: string): Promise<void> {
    const config = this.configs.get(configId);
    if (config) {
      config.usageCount++;
      config.lastUsed = new Date();
      config.updatedAt = new Date();
      await this.saveConfigToStorage(config);
    }
  }

  /**
   * 获取配置统计信息
   */
  getConfigStats(): {
    totalConfigs: number;
    enabledConfigs: number;
    disabledConfigs: number;
    mostUsedConfigs: Array<{ id: string; name: string; usageCount: number }>;
    recentlyUsedConfigs: Array<{ id: string; name: string; lastUsed: Date }>;
  } {
    const configs = Array.from(this.configs.values());
    const totalConfigs = configs.length;
    const enabledConfigs = configs.filter(c => c.enabled).length;
    const disabledConfigs = totalConfigs - enabledConfigs;
    
    const mostUsedConfigs = configs
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(c => ({ id: c.id, name: c.name, usageCount: c.usageCount }));
    
    const recentlyUsedConfigs = configs
      .filter(c => c.lastUsed)
      .sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
      .slice(0, 10)
      .map(c => ({ id: c.id, name: c.name, lastUsed: c.lastUsed! }));
    
    return {
      totalConfigs,
      enabledConfigs,
      disabledConfigs,
      mostUsedConfigs,
      recentlyUsedConfigs,
    };
  }

  /**
   * 验证配置
   */
  private validateConfig(config: CrawlConfig): void {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('配置名称不能为空');
    }
    
    if (!config.domain || config.domain.trim().length === 0) {
      throw new Error('域名不能为空');
    }
    
    // 验证域名格式
    try {
      new URL(`https://${config.domain}`);
    } catch {
      throw new Error('域名格式无效');
    }
    
    // 验证选择器
    if (!config.selectors || Object.keys(config.selectors).length === 0) {
      throw new Error('至少需要配置一个选择器');
    }
    
    // 验证速率限制
    if (config.rateLimit.requestsPerMinute <= 0) {
      throw new Error('每分钟请求数必须大于0');
    }
    
    if (config.rateLimit.requestsPerHour <= 0) {
      throw new Error('每小时请求数必须大于0');
    }
  }

  /**
   * URL模式匹配
   */
  private matchUrlPattern(url: string, pattern: string): boolean {
    // 简单的通配符匹配实现
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(url);
  }

  /**
   * 生成配置ID
   */
  private generateConfigId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): Partial<CrawlConfig> {
    return {
      name: '',
      domain: '',
      urlPatterns: [],
      selectors: {},
      options: {
        waitTime: 3000,
        scrollToBottom: false,
        extractImages: true,
        extractLinks: true,
        followRedirects: true,
        maxRedirects: 5,
        timeout: 30000,
        viewport: {
          width: 1920,
          height: 1080,
        },
        screenshot: {
          enabled: false,
          fullPage: false,
          quality: 80,
        },
      },
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        delayBetweenRequests: 1000,
        respectRobotsTxt: true,
      },
      validation: {
        requiredFields: ['title'],
        minContentLength: 100,
        maxContentLength: 1000000,
        allowedContentTypes: ['text/html'],
        blockedKeywords: [],
        requiredKeywords: [],
      },
      enabled: true,
      priority: 1,
      tags: [],
    };
  }

  /**
   * 初始化默认模板
   */
  private initializeDefaultTemplates(): void {
    const templates: ConfigTemplate[] = [
      {
        id: 'news_site',
        name: '新闻网站',
        description: '适用于新闻网站的通用配置',
        category: '新闻',
        popularity: 100,
        config: {
          selectors: {
            title: 'h1, .title, .headline',
            content: '.content, .article-body, .post-content',
            author: '.author, .byline',
            publishDate: '.date, .publish-date, time',
          },
          options: {
            waitTime: 2000,
            extractImages: true,
            extractLinks: true,
          },
        },
      },
      {
        id: 'ecommerce_site',
        name: '电商网站',
        description: '适用于电商网站的产品页面',
        category: '电商',
        popularity: 90,
        config: {
          selectors: {
            title: 'h1, .product-title',
            description: '.product-description, .description',
            price: '.price, .product-price',
            images: '.product-images img, .gallery img',
          },
          options: {
            waitTime: 3000,
            scrollToBottom: true,
            extractImages: true,
          },
        },
      },
      {
        id: 'blog_site',
        name: '博客网站',
        description: '适用于博客和个人网站',
        category: '博客',
        popularity: 80,
        config: {
          selectors: {
            title: 'h1, .post-title, .entry-title',
            content: '.post-content, .entry-content, .article-content',
            author: '.author, .post-author',
            publishDate: '.date, .post-date',
            tags: '.tags, .post-tags',
          },
          options: {
            waitTime: 2000,
            extractImages: true,
            extractLinks: true,
          },
        },
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * 从存储加载配置
   */
  private async loadConfigsFromStorage(): Promise<void> {
    try {
      // 这里应该从数据库加载配置
      this.logger.log('从存储加载爬虫配置');
    } catch (error) {
      this.logger.error('加载爬虫配置失败', error);
    }
  }

  /**
   * 保存配置到存储
   */
  private async saveConfigToStorage(config: CrawlConfig): Promise<void> {
    try {
      // 这里应该保存到数据库
      this.logger.debug(`保存爬虫配置: ${config.id}`);
    } catch (error) {
      this.logger.error(`保存爬虫配置失败: ${config.id}`, error);
    }
  }

  /**
   * 从存储删除配置
   */
  private async deleteConfigFromStorage(configId: string): Promise<void> {
    try {
      // 这里应该从数据库删除
      this.logger.debug(`删除爬虫配置: ${configId}`);
    } catch (error) {
      this.logger.error(`删除爬虫配置失败: ${configId}`, error);
    }
  }
}