import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface ExtractedContent {
  title: string;
  content: string;
  links: string[];
  metadata: {
    description?: string;
    keywords?: string;
    author?: string;
    publishDate?: string;
    language?: string;
    wordCount: number;
    linkCount: number;
  };
}

@Injectable()
export class ContentExtractorService {
  private readonly logger = new Logger(ContentExtractorService.name);

  /**
   * 从HTML中提取内容
   */
  extractContent(html: string, baseUrl: string): ExtractedContent {
    const $ = cheerio.load(html);
    
    // 提取标题
    const title = this.extractTitle($);
    
    // 提取主要内容
    const content = this.extractMainContent($);
    
    // 提取链接
    const links = this.extractLinks($, baseUrl);
    
    // 提取元数据
    const metadata = this.extractMetadata($, content, links);
    
    return {
      title,
      content,
      links,
      metadata,
    };
  }

  /**
   * 提取页面标题
   */
  private extractTitle($: cheerio.CheerioAPI): string {
    // 优先级：title标签 > h1标签 > og:title > 默认值
    let title = $('title').first().text().trim();
    
    if (!title) {
      title = $('h1').first().text().trim();
    }
    
    if (!title) {
      title = $('meta[property="og:title"]').attr('content')?.trim() || '';
    }
    
    return title || '无标题';
  }

  /**
   * 提取主要内容
   */
  private extractMainContent($: cheerio.CheerioAPI): string {
    // 移除不需要的元素
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar').remove();
    
    // 尝试找到主要内容区域
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '#main',
      '.markdown-body', // GitHub等平台
      '.md-content', // 文档网站
    ];
    
    let content = '';
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) { // 确保内容足够长
          break;
        }
      }
    }
    
    // 如果没有找到主要内容区域，提取body中的文本
    if (!content || content.length < 100) {
      content = $('body').text().trim();
    }
    
    // 清理内容
    content = this.cleanText(content);
    
    return content;
  }

  /**
   * 提取链接
   */
  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    const baseUrlObj = new URL(baseUrl);
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          // 处理相对链接
          const absoluteUrl = new URL(href, baseUrl).href;
          
          // 过滤掉一些不需要的链接
          if (this.isValidLink(absoluteUrl, baseUrlObj)) {
            links.push(absoluteUrl);
          }
        } catch (error) {
          // 忽略无效的URL
        }
      }
    });
    
    // 去重
    return [...new Set(links)];
  }

  /**
   * 提取元数据
   */
  private extractMetadata($: cheerio.CheerioAPI, content: string, links: string[]): ExtractedContent['metadata'] {
    const description = $('meta[name="description"]').attr('content') ||
                      $('meta[property="og:description"]').attr('content') ||
                      '';
    
    const keywords = $('meta[name="keywords"]').attr('content') || '';
    
    const author = $('meta[name="author"]').attr('content') ||
                  $('meta[property="article:author"]').attr('content') ||
                  '';
    
    const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                       $('meta[name="date"]').attr('content') ||
                       '';
    
    const language = $('html').attr('lang') ||
                    $('meta[http-equiv="content-language"]').attr('content') ||
                    '';
    
    const wordCount = this.countWords(content);
    const linkCount = links.length;
    
    return {
      description: description.trim() || undefined,
      keywords: keywords.trim() || undefined,
      author: author.trim() || undefined,
      publishDate: publishDate.trim() || undefined,
      language: language.trim() || undefined,
      wordCount,
      linkCount,
    };
  }

  /**
   * 清理文本内容
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // 合并多个空白字符
      .replace(/\n\s*\n/g, '\n') // 合并多个换行
      .trim();
  }

  /**
   * 统计单词数量
   */
  private countWords(text: string): number {
    if (!text) return 0;
    
    // 简单的单词计数（支持中英文）
    const words = text.match(/[\w\u4e00-\u9fa5]+/g);
    return words ? words.length : 0;
  }

  /**
   * 验证链接是否有效
   */
  private isValidLink(url: string, baseUrlObj: URL): boolean {
    try {
      const urlObj = new URL(url);
      
      // 过滤掉非HTTP(S)协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      // 过滤掉锚点链接（只有fragment的链接）
      if (urlObj.pathname === baseUrlObj.pathname && 
          urlObj.search === baseUrlObj.search && 
          urlObj.hash) {
        return false;
      }
      
      // 过滤掉一些常见的非内容链接
      const excludePatterns = [
        /\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|rar)$/i,
        /^mailto:/,
        /^tel:/,
        /^javascript:/,
      ];
      
      for (const pattern of excludePatterns) {
        if (pattern.test(url)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}