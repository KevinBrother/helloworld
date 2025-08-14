export interface PageData {
  url: string;
  title?: string;
  content: string;
  metadata: {
    depth: number;
    parentUrl?: string;
    crawledAt: string;
    contentType?: string;
    statusCode?: number;
    [key: string]: any;
  };
}

export interface MediaTypeConfig {
  type: 'image' | 'video' | 'audio' | 'document' | 'archive';
  mode: 'inherit' | 'override';
  extensions?: string[];
}

export interface MediaCrawlOptions {
  enabled: boolean;
  mediaTypes: MediaTypeConfig[];
  maxFileSize?: number; // MB
  downloadTimeout?: number; // seconds
  concurrent?: number;
}

export interface CrawlRequest {
  startUrl: string;
  maxDepth?: number;
  maxPages?: number; // 可选：用户指定页面数限制，不设置则为完全爬取模式
  takeScreenshots?: boolean;
  userAgent?: string;
  allowedDomains?: string[];
  excludePatterns?: string[];
  mediaOptions?: MediaCrawlOptions;
}

export interface CrawlResponse {
  sessionId: string;
  status: 'started' | 'completed' | 'failed';
  message: string;
  pagesProcessed?: number;
  totalPages?: number;
  errors?: string[];
}

export interface CrawlSession {
  sessionId: string;
  startUrl: string;
  maxDepth: number;
  maxPages: number;
  isCompleteCrawl: boolean; // 是否为完全爬取模式
  takeScreenshots: boolean;
  userAgent?: string;
  allowedDomains: string[];
  excludePatterns: string[];
  mediaOptions?: MediaCrawlOptions;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  pagesProcessed: number;
  totalPages: number;
  errors: string[];
}

export interface LinkInfo {
  url: string;
  depth: number;
  parentUrl?: string;
  discovered: boolean;
  processed: boolean;
}

export interface MediaFileInfo {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'archive';
  extension: string;
  fileName: string;
  sourceUrl: string;
  size?: number;
  downloadedAt?: string;
  storagePath?: string;
  md5Hash?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface MediaDownloadResult {
  success: boolean;
  mediaFile?: MediaFileInfo;
  error?: string;
}