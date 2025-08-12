// 爬虫配置相关类型
export interface CrawlConfig {
  id: number;
  name: string;
  description?: string;
  userId: number;
  startUrl: string;
  allowedDomains?: string[];
  deniedDomains?: string[];
  urlPatterns?: string[];
  maxDepth: number;
  maxPages: number;
  requestDelay: number;
  timeout: number;
  retries: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  userAgent?: string;
  useProxy: boolean;
  proxyConfig?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  enableJavaScript: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfigRequest {
  name: string;
  description?: string;
  startUrl: string;
  allowedDomains?: string[];
  deniedDomains?: string[];
  urlPatterns?: string[];
  maxDepth?: number;
  maxPages?: number;
  requestDelay?: number;
  timeout?: number;
  retries?: number;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  userAgent?: string;
  useProxy?: boolean;
  proxyConfig?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  enableJavaScript?: boolean;
}

export type UpdateConfigRequest = Partial<CreateConfigRequest>;

export interface QueryConfigsRequest {
  page?: number;
  limit?: number;
  name?: string;
  userId?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}