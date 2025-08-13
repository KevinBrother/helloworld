import { Injectable, Logger } from '@nestjs/common';
import { URL } from 'url';

interface QueueItem {
  url: string;
  depth: number;
}

@Injectable()
export class LinkManagerService {
  private readonly logger = new Logger(LinkManagerService.name);
  private baseUrl: string = '';
  private baseHostname: string = '';
  private maxDepth: number = 3;
  private urlQueue: QueueItem[] = [];
  private processedUrls: Set<string> = new Set();
  private pendingUrls: Set<string> = new Set();

  /**
   * 初始化链接管理器
   */
  initialize(baseUrl: string, maxDepth: number): void {
    this.baseUrl = baseUrl;
    this.maxDepth = maxDepth;
    
    try {
      const parsedUrl = new URL(baseUrl);
      this.baseHostname = parsedUrl.hostname;
    } catch (error) {
      this.logger.error(`无效的基础URL: ${baseUrl}`, error.stack);
      throw error;
    }
    
    this.urlQueue = [];
    this.processedUrls.clear();
    this.pendingUrls.clear();
  }

  /**
   * 添加URL到队列
   */
  addUrl(url: string, depth: number): boolean {
    // 验证URL
    let normalizedUrl: string;
    try {
      normalizedUrl = this.normalizeUrl(url);
    } catch (error) {
      this.logger.warn(`无效的URL: ${url}`);
      return false;
    }
    
    // 检查是否是同一域名
    if (!this.isSameDomain(normalizedUrl)) {
      this.logger.debug(`跳过外部链接: ${normalizedUrl}`);
      return false;
    }
    
    // 检查深度是否超过限制
    if (depth > this.maxDepth) {
      this.logger.debug(`跳过超过最大深度的URL: ${normalizedUrl}`);
      return false;
    }
    
    // 检查是否已处理或正在处理
    if (this.processedUrls.has(normalizedUrl) || this.pendingUrls.has(normalizedUrl)) {
      return false;
    }
    
    // 添加到队列
    this.urlQueue.push({ url: normalizedUrl, depth });
    this.pendingUrls.add(normalizedUrl);
    return true;
  }

  /**
   * 批量添加URL
   */
  addUrls(urls: string[], depth: number): number {
    let addedCount = 0;
    for (const url of urls) {
      if (this.addUrl(url, depth)) {
        addedCount++;
      }
    }
    return addedCount;
  }

  /**
   * 获取下一个要处理的URL
   * 使用混合策略：大部分时间处理较浅的页面，但定期处理深层页面
   */
  getNextUrl(): QueueItem | null {
    if (this.urlQueue.length === 0) {
      return null;
    }
    
    // 按深度分组
    const depthGroups = new Map<number, QueueItem[]>();
    for (const item of this.urlQueue) {
      if (!depthGroups.has(item.depth)) {
        depthGroups.set(item.depth, []);
      }
      depthGroups.get(item.depth)!.push(item);
    }
    
    // 获取所有深度并排序
    const depths = Array.from(depthGroups.keys()).sort((a, b) => a - b);
    
    let selectedItem: QueueItem | null = null;
    
    // 策略：每处理5个深度1的页面，就处理1个深度2的页面
    const depth1Count = this.processedUrls.size;
    const shouldProcessDeeper = depth1Count > 0 && depth1Count % 6 === 5;
    
    if (shouldProcessDeeper && depths.length > 1) {
      // 优先处理更深的页面
      for (let i = 1; i < depths.length; i++) {
        const depth = depths[i];
        const items = depthGroups.get(depth)!;
        if (items.length > 0) {
          selectedItem = items[0];
          break;
        }
      }
    }
    
    // 如果没有选择深层页面，选择最浅的页面
    if (!selectedItem) {
      for (const depth of depths) {
        const items = depthGroups.get(depth)!;
        if (items.length > 0) {
          selectedItem = items[0];
          break;
        }
      }
    }
    
    if (selectedItem) {
      // 从队列中移除选中的项目
      const index = this.urlQueue.findIndex(item => 
        item.url === selectedItem!.url && item.depth === selectedItem!.depth
      );
      if (index !== -1) {
        this.urlQueue.splice(index, 1);
      }
      
      this.pendingUrls.delete(selectedItem.url);
      this.processedUrls.add(selectedItem.url);
      this.logger.debug(`从队列中取出URL: ${selectedItem.url} (深度: ${selectedItem.depth})，剩余队列长度: ${this.urlQueue.length}`);
      return selectedItem;
    }
    
    return null;
  }

  /**
   * 检查队列中是否还有URL
   */
  hasUrls(): boolean {
    return this.urlQueue.length > 0;
  }

  /**
   * 标准化URL
   */
  private normalizeUrl(url: string): string {
    let parsedUrl: URL;
    
    try {
      // 尝试直接解析URL
      parsedUrl = new URL(url);
    } catch (error) {
      // 如果失败，尝试作为相对路径解析
      parsedUrl = new URL(url, this.baseUrl);
    }
    
    // 移除哈希部分
    parsedUrl.hash = '';
    
    // 规范化路径
    const pathname = parsedUrl.pathname.replace(/\/+/g, '/');
    parsedUrl.pathname = pathname.endsWith('/') && pathname.length > 1 
      ? pathname.slice(0, -1) 
      : pathname;
      
    return parsedUrl.toString();
  }

  /**
   * 检查URL是否与基础URL同域名
   */
  private isSameDomain(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === this.baseHostname || 
             parsedUrl.hostname.endsWith(`.${this.baseHostname}`);
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    pending: number;
    processed: number;
    total: number;
  } {
    return {
      pending: this.urlQueue.length,
      processed: this.processedUrls.size,
      total: this.urlQueue.length + this.processedUrls.size
    };
  }
}
