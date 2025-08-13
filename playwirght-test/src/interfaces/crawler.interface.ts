export interface CrawlOptions {
  /** 最大爬取深度 */
  maxDepth?: number;
  /** 最大爬取页面数量 */
  maxPages?: number;
  /** 页面请求间隔(毫秒) */
  delay?: number;
  /** 是否截图 */
  takeScreenshots?: boolean;
  /** 自定义User-Agent */
  userAgent?: string;
}

export interface PageMetadata {
  /** 爬取深度 */
  depth: number;
  /** 爬取时间 */
  crawledAt: Date;
  /** 内容类型 */
  contentType: string | null;
  /** HTTP状态码 */
  statusCode: number | null;
}

export interface PageData {
  /** 页面URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 提取的主要内容 */
  content: string;
  /** 页面元数据 */
  metadata: PageMetadata;
}
