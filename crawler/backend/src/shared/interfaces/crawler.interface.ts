// 导入共享的API类型定义
export * from '@crawler/shared-types';

// 重新导出类型，使用统一名称
export type {
  PageData,
  MediaTypeConfig,
  MediaCrawlOptions,
  CrawlRequest,
  CrawlResponse,
  CrawSession,
  LinkInfo,
  MediaFileInfo,
  MediaDownloadResult
} from '@crawler/shared-types';