// 共享的API类型定义

// 通用API响应包装器
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// 爬虫相关类型
export interface CrawlRequest {
  startUrl: string;
  maxDepth?: number;
  maxPages?: number;
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

export interface CrawSession {
  sessionId: string;
  startUrl: string;
  maxDepth: number;
  maxPages: number;
  isCompleteCrawl: boolean;
  takeScreenshots: boolean;
  userAgent?: string;
  allowedDomains: string[];
  excludePatterns: string[];
  mediaOptions?: MediaCrawlOptions;
  startTime: Date | string;
  endTime?: Date | string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  pagesProcessed: number;
  totalPages: number;
  errors: string[];
}

// 媒体相关类型
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

export interface MediaStats {
  totalFiles: number;
  totalSessions: number;
  filesByType: Record<string, number>;
  filesBySession: Record<string, number>;
}

// 搜索和分页相关类型
export interface SearchParams {
  query?: string;
  sessionId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// 文件相关类型
export interface FileDownloadResponse {
  downloadUrl: string;
  fileName: string;
  size?: number;
  contentType?: string;
}

export interface FileInfo {
  name: string;
  size: number;
  lastModified: Date | string;
  etag: string;
  originalUrl?: string | null;
  sourcePageUrl?: string | null;
  traceability?: any;
}

// 页面数据类型
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

// 链接信息类型
export interface LinkInfo {
  url: string;
  depth: number;
  parentUrl?: string;
  discovered: boolean;
  processed: boolean;
}

// 媒体下载结果类型
export interface MediaDownloadResult {
  success: boolean;
  mediaFile?: MediaFileInfo;
  error?: string;
}

// 健康检查响应类型
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

// 停止爬取响应类型
export interface StopCrawlResponse {
  success: boolean;
  message: string;
}