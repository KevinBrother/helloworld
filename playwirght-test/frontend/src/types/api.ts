// API 响应类型定义
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 爬虫相关类型
export interface CrawlRequest {
  url: string;
  options?: {
    waitFor?: number;
    screenshot?: boolean;
    fullPage?: boolean;
    quality?: number;
    format?: 'png' | 'jpeg';
  };
}

export interface CrawlResponse {
  sessionId: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  screenshots?: string[];
  media?: MediaFile[];
}

// 媒体文件类型
export interface MediaFile {
  fileName: string;
  originalUrl: string;
  localPath: string;
  fileSize: number;
  mimeType: string;
  downloadTime: string;
  sessionId: string;
}

// 会话类型
export interface Session {
  id: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  mediaCount: number;
  totalSize: number;
}

// 文件下载类型
export interface FileDownloadResponse {
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
}

// 媒体统计类型
export interface MediaStats {
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  recentFiles: MediaFile[];
}

// 搜索参数类型
export interface SearchParams {
  query?: string;
  fileType?: string;
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}