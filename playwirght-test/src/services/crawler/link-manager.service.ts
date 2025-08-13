import { Injectable, Logger } from '@nestjs/common';
import { LinkInfo } from '../../shared/interfaces/crawler.interface';

@Injectable()
export class LinkManagerService {
  private readonly logger = new Logger(LinkManagerService.name);
  private readonly processedUrls = new Set<string>();
  private readonly discoveredUrls = new Map<string, LinkInfo>();
  private readonly urlQueue: LinkInfo[] = [];

  /**
   * 添加链接到队列
   */
  addLinks(
    links: string[],
    parentUrl: string,
    currentDepth: number,
    maxDepth: number,
    allowedDomains: string[],
    excludePatterns: string[]
  ): number {
    let addedCount = 0;
    
    for (const link of links) {
      if (this.shouldProcessLink(link, currentDepth, maxDepth, allowedDomains, excludePatterns)) {
        const linkInfo: LinkInfo = {
          url: link,
          depth: currentDepth + 1,
          parentUrl,
          discovered: true,
          processed: false,
        };
        
        if (!this.discoveredUrls.has(link)) {
          this.discoveredUrls.set(link, linkInfo);
          this.urlQueue.push(linkInfo);
          addedCount++;
          
          this.logger.debug(`添加链接到队列: ${link} (深度: ${linkInfo.depth})`);
        }
      }
    }
    
    this.logger.log(`从 ${parentUrl} 添加了 ${addedCount} 个链接到队列`);
    return addedCount;
  }

  /**
   * 获取下一个要处理的链接
   */
  getNextLink(): LinkInfo | null {
    // 按深度优先排序（深度小的先处理）
    this.urlQueue.sort((a, b) => a.depth - b.depth);
    
    for (let i = 0; i < this.urlQueue.length; i++) {
      const linkInfo = this.urlQueue[i];
      if (!this.processedUrls.has(linkInfo.url)) {
        this.urlQueue.splice(i, 1);
        return linkInfo;
      }
    }
    
    return null;
  }

  /**
   * 标记URL为已处理
   */
  markAsProcessed(url: string): void {
    this.processedUrls.add(url);
    
    const linkInfo = this.discoveredUrls.get(url);
    if (linkInfo) {
      linkInfo.processed = true;
    }
    
    this.logger.debug(`标记为已处理: ${url}`);
  }

  /**
   * 检查URL是否已被处理
   */
  isProcessed(url: string): boolean {
    return this.processedUrls.has(url);
  }

  /**
   * 获取队列中剩余的链接数量
   */
  getQueueSize(): number {
    return this.urlQueue.filter(link => !this.processedUrls.has(link.url)).length;
  }

  /**
   * 获取已处理的链接数量
   */
  getProcessedCount(): number {
    return this.processedUrls.size;
  }

  /**
   * 获取已发现的链接数量
   */
  getDiscoveredCount(): number {
    return this.discoveredUrls.size;
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.processedUrls.clear();
    this.discoveredUrls.clear();
    this.urlQueue.length = 0;
    this.logger.log('链接管理器已清空');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    processed: number;
    discovered: number;
    queued: number;
    processedUrls: string[];
  } {
    return {
      processed: this.getProcessedCount(),
      discovered: this.getDiscoveredCount(),
      queued: this.getQueueSize(),
      processedUrls: Array.from(this.processedUrls),
    };
  }

  /**
   * 判断是否应该处理该链接
   */
  private shouldProcessLink(
    url: string,
    currentDepth: number,
    maxDepth: number,
    allowedDomains: string[],
    excludePatterns: string[]
  ): boolean {
    try {
      // 检查深度限制
      if (currentDepth >= maxDepth) {
        this.logger.debug(`跳过链接（超过最大深度）: ${url}`);
        return false;
      }

      // 检查是否已处理或已发现
      if (this.processedUrls.has(url) || this.discoveredUrls.has(url)) {
        this.logger.debug(`跳过链接（已存在）: ${url}`);
        return false;
      }

      const urlObj = new URL(url);

      // 检查协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        this.logger.debug(`跳过链接（非HTTP协议）: ${url}`);
        return false;
      }

      // 检查允许的域名
      if (allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain => {
          return urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain);
        });
        
        if (!isAllowed) {
          this.logger.debug(`跳过链接（域名不在允许列表中）: ${url}`);
          return false;
        }
      }

      // 检查排除模式
      for (const pattern of excludePatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(url)) {
          this.logger.debug(`跳过链接（匹配排除模式）: ${url}`);
          return false;
        }
      }

      // 检查文件扩展名
      const excludeExtensions = [
        '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
        '.pdf', '.zip', '.rar', '.tar', '.gz', '.mp4', '.mp3', '.avi',
        '.mov', '.wmv', '.flv', '.swf', '.doc', '.docx', '.xls', '.xlsx',
        '.ppt', '.pptx'
      ];
      
      const pathname = urlObj.pathname.toLowerCase();
      for (const ext of excludeExtensions) {
        if (pathname.endsWith(ext)) {
          this.logger.debug(`跳过链接（文件类型）: ${url}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.debug(`跳过链接（URL解析错误）: ${url} - ${error.message}`);
      return false;
    }
  }
}