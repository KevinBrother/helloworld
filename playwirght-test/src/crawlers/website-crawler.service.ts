import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightService } from './playwright.service';
import { LinkManagerService } from './link-manager.service';
import { ContentExtractorService } from './content-extractor.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { MinioService } from './minio.service';
import { CrawlOptions, PageData } from '../interfaces/crawler.interface';

@Injectable()
export class WebsiteCrawlerService {
  private readonly logger = new Logger(WebsiteCrawlerService.name);
  
  constructor(
    private readonly playwrightService: PlaywrightService,
    private readonly linkManager: LinkManagerService,
    private readonly contentExtractor: ContentExtractorService,
    private readonly knowledgeBase: KnowledgeBaseService,
    private readonly minioService: MinioService,
  ) {}

  /**
   * 启动爬虫
   * @param baseUrl 基础URL
   * @param options 爬取选项
   */
  async startCrawling(baseUrl: string, options: CrawlOptions = {}): Promise<number> {
    this.logger.log(`开始爬取: ${baseUrl}`);
    
    // 初始化配置
    const { 
      maxDepth = 3, 
      maxPages = 100,
      delay = 1000,
      takeScreenshots = false,
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    } = options;
    
    // 初始化链接管理器
    this.linkManager.initialize(baseUrl, maxDepth);
    this.linkManager.addUrl(baseUrl, 0);
    
    let processedPages = 0;
    
    try {
      // 启动浏览器
      await this.playwrightService.launch({ userAgent });
      
      // 处理队列中的URL
      while (this.linkManager.hasUrls() && processedPages < maxPages) {
        const { url, depth } = this.linkManager.getNextUrl();
        
        if (!url) break;
        
        try {
          this.logger.log(`爬取页面: ${url} (深度: ${depth})`);
          
          // 爬取页面内容
          const pageContent = await this.playwrightService.crawlPage(url, { takeScreenshot: takeScreenshots });
          
          // 提取页面数据
          const pageData: PageData = {
            url,
            title: pageContent.title,
            content: this.contentExtractor.extractMainContent(pageContent.html),
            metadata: {
              depth,
              crawledAt: new Date(),
              contentType: pageContent.contentType,
              statusCode: pageContent.statusCode
            }
          };
          
          // 提取并添加新链接
          if (depth < maxDepth) {
            const links = this.contentExtractor.extractLinks(pageContent.html, baseUrl, url);
            const addedCount = this.linkManager.addUrls(links, depth + 1);
            this.logger.log(`从 ${url} (深度: ${depth}) 提取到 ${links.length} 个链接，成功添加 ${addedCount} 个到队列 (目标深度: ${depth + 1})`);
          } else {
            this.logger.log(`页面 ${url} 已达到最大深度 ${maxDepth}，跳过链接提取`);
          }
          
          // 保存到知识库
          await this.knowledgeBase.savePageData(pageData);
          
          // 如果有截图，保存到 MinIO
          if (pageContent.screenshot) {
            await this.minioService.saveScreenshot(url, pageContent.screenshot);
          }
          
          processedPages++;
          this.logger.log(`已处理 ${processedPages}/${maxPages} 页面`);
        } catch (error) {
          this.logger.error(`爬取 ${url} 失败: ${error.message}`, error.stack);
        }
        
        // 添加延迟，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      this.logger.log(`爬取完成，共处理 ${processedPages} 个页面`);
      return processedPages;
    } finally {
      // 关闭浏览器
      await this.playwrightService.close();
    }
  }
}
