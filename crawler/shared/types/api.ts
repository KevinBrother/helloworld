// 共享的API类型定义

// 通用API响应包装器
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// 爬虫相关类型 - 统一的爬取请求接口
export interface CrawlRequest {
  url: string;
  options: {
    waitFor?: number;
    screenshot?: boolean;
    fullPage?: boolean;
    maxDepth?: number;
    maxPages?: number;
    enableMediaCrawl?: boolean;
    userAgent?: string;
    headers?: Record<string, string>;
    cookies?: Array<{
      name: string;
      value: string;
      domain?: string;
      path?: string;
    }>;
    allowedDomains?: string[];
    excludePatterns?: string[];
    mediaTypes?: Record<string, {
      mode: 'inherit' | 'override';
      extensions?: string[];
    }>;
    downloadLimits?: {
      maxFileSize?: number;
      maxTotalSize?: number;
      downloadTimeout?: number;
      maxConcurrent?: number;
      skipDuplicates?: boolean;
    };
  };
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
  id: string; // 会话ID（用于列表显示）
  sessionId: string;
  config: CrawlRequest; // 爬取配置
  startTime: Date | string;
  endTime?: Date | string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  pagesProcessed: number;
  totalPages: number;
  errors: string[];
  // 为了向后兼容，保留一些常用字段
  startUrl: string; // 等同于 config.url
  maxDepth: number; // 等同于 config.options.maxDepth
  maxPages: number; // 等同于 config.options.maxPages
  isCompleteCrawl: boolean;
  takeScreenshots: boolean; // 等同于 config.options.screenshot
  userAgent?: string; // 等同于 config.options.userAgent
  allowedDomains: string[]; // 等同于 config.options.allowedDomains
  excludePatterns: string[]; // 等同于 config.options.excludePatterns
  mediaOptions?: MediaCrawlOptions; // 从 config.options 派生
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
  originalUrl: string; // 原始URL
  type: 'image' | 'video' | 'audio' | 'document' | 'archive';
  extension: string;
  fileName: string;
  sourceUrl: string;
  size?: number;
  fileSize: number; // 文件大小
  downloadedAt?: string;
  downloadTime: string; // 下载时间
  storagePath?: string;
  md5Hash?: string;
  sessionId: string; // 会话ID
  mimeType: string; // MIME类型
  metadata?: {
    [key: string]: any;
  };
}

export interface MediaStats {
  totalFiles: number;
  totalSessions: number;
  totalSize: number; // 总大小（字节）
  filesByType: Record<string, number>;
  filesBySession: Record<string, number>;
  fileTypes: Record<string, number>; // 按文件类型统计
}

// 搜索和分页相关类型
export interface SearchParams {
  query?: string;
  sessionId?: string;
  type?: string;
  fileType?: string; // 文件类型过滤
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

// 爬取配置类型 - 与CrawlRequest保持一致
export type CrawlConfig = CrawlRequest;