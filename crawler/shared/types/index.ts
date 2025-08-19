// 共享类型定义的统一导出

export * from './api';

// 重新导出常用类型，提供更简洁的导入方式
export type {
  ApiResponse,
  CrawlRequest,
  CrawlResponse,
  CrawSession,
  CrawlConfig,
  MediaFileInfo,
  MediaStats,
  SearchParams,
  PaginatedResponse,
  FileDownloadResponse,
  FileInfo,
  PageData,
  LinkInfo,
  MediaDownloadResult,
  HealthCheckResponse,
  StopCrawlResponse,
  MediaTypeConfig,
  MediaCrawlOptions
} from './api';