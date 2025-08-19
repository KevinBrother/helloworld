import axios, { type AxiosResponse } from 'axios';
import type {
  ApiResponse,
  CrawlRequest,
  CrawlResponse,
  CrawSession,
  MediaFileInfo,
  MediaStats,
  SearchParams,
  PaginatedResponse,
  FileDownloadResponse
} from '@/types/api';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// 爬虫 API
export const crawlerApi = {
  // 开始爬取
  crawl: async (request: CrawlRequest): Promise<ApiResponse<CrawlResponse>> => {
    const response = await api.post('/crawler/crawl', request);
    return response.data;
  },

  // 停止爬取
  stopCrawl: async (sessionId: string): Promise<ApiResponse<void>> => {
    const response = await api.post(`/crawler/session/${sessionId}/stop`);
    return response.data;
  },

  // 获取所有会话
  getSessions: async (): Promise<ApiResponse<CrawSession[]>> => {
    const response = await api.get('/crawler/sessions');
    return response.data;
  },

  // 获取单个会话
  getSession: async (sessionId: string): Promise<ApiResponse<CrawSession>> => {
    const response = await api.get(`/crawler/session/${sessionId}`);
    return response.data;
  },

  // 获取会话媒体文件
  getSessionMedia: async (sessionId: string): Promise<ApiResponse<MediaFileInfo[]>> => {
    const response = await api.get(`/crawler/session/${sessionId}/media`);
    return response.data;
  },
};

// 媒体 API
export const mediaApi = {
  // 获取媒体统计
  getStats: async (): Promise<ApiResponse<MediaStats>> => {
    const response = await api.get('/media/stats');
    return response.data;
  },

  // 搜索媒体文件
  search: async (params: SearchParams): Promise<ApiResponse<PaginatedResponse<MediaFileInfo>>> => {
    const response = await api.get('/media/search', { params });
    return response.data;
  },

  // 下载媒体文件
  downloadMedia: async (sessionId: string, fileName: string): Promise<Blob> => {
    const response = await api.get(`/media/media/${sessionId}/${fileName}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // 流式传输媒体文件
  streamMedia: (sessionId: string, fileName: string): string => {
    return `${api.defaults.baseURL}/media/media/${sessionId}/${fileName}/stream`;
  },
};

// 文件 API
export const fileApi = {
  // 下载文件
  downloadFile: async (fileName: string): Promise<Blob> => {
    const response = await api.get(`/files/files/${encodeURIComponent(fileName)}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // 获取文件信息
  getFileInfo: async (fileName: string): Promise<ApiResponse<FileDownloadResponse>> => {
    const response = await api.get(`/files/files/${encodeURIComponent(fileName)}/info`);
    return response.data;
  },
};

// 工具函数
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default api;