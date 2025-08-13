import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'node-html-parser';
import { URL } from 'url';

@Injectable()
export class ContentExtractorService {
  private readonly logger = new Logger(ContentExtractorService.name);
  
  /**
   * 从HTML中提取主要内容
   */
  extractMainContent(html: string): string {
    try {
      const root = parse(html);
      
      // 移除不需要的元素
      const elementsToRemove = [
        'script', 'style', 'noscript', 'iframe', 
        'nav', 'aside', 'footer', 'header',
        'svg', 'img', 'video', 'audio'
      ];
      
      elementsToRemove.forEach(tag => {
        const elements = root.querySelectorAll(tag);
        elements.forEach(el => el.remove());
      });
      
      // 尝试找到主要内容区域
      let mainContent: any = root.querySelector('main');
      
      // 如果没有main标签，尝试其他常见内容容器
      if (!mainContent) {
        const contentSelectors = [
          'article', 
          '.content', 
          '.main-content', 
          '#content', 
          '#main-content',
          '.post',
          '.article'
        ];
        
        for (const selector of contentSelectors) {
          mainContent = root.querySelector(selector);
          if (mainContent) break;
        }
      }
      
      // 如果找不到特定的内容容器，使用body
      if (!mainContent) {
        mainContent = root.querySelector('body');
      }
      
      if (!mainContent) {
        return '';
      }
      
      // 获取文本内容并清理
      let text = mainContent.text;
      
      // 清理多余的空白
      text = text.replace(/\s+/g, ' ').trim();
      
      return text;
    } catch (error) {
      this.logger.error('提取内容失败', error.stack);
      return '';
    }
  }
  
  /**
   * 从HTML中提取链接
   */
  extractLinks(html: string, baseUrl: string, currentUrl: string): string[] {
    try {
      const root = parse(html);
      const anchorTags = root.querySelectorAll('a[href]');
      const links = new Set<string>();
      
      for (const anchor of anchorTags) {
        const href = anchor.getAttribute('href');
        
        if (!href || href.trim() === '') continue;
        
        // 跳过邮件链接和电话链接
        if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;
        
        // 解析链接
        let absoluteUrl: string;
        try {
          // 尝试相对于当前页面解析
          absoluteUrl = new URL(href, currentUrl).toString();
        } catch (error) {
          // 尝试相对于基础URL解析
          try {
            absoluteUrl = new URL(href, baseUrl).toString();
          } catch (innerError) {
            this.logger.warn(`无法解析链接: ${href}`);
            continue;
          }
        }
        
        links.add(absoluteUrl);
      }
      
      return Array.from(links);
    } catch (error) {
      this.logger.error('提取链接失败', error.stack);
      return [];
    }
  }
  
  /**
   * 提取页面标题
   */
  extractTitle(html: string): string {
    try {
      const root = parse(html);
      const titleTag = root.querySelector('title');
      return titleTag ? titleTag.text.trim() : '';
    } catch (error) {
      this.logger.error('提取标题失败', error.stack);
      return '';
    }
  }
}
