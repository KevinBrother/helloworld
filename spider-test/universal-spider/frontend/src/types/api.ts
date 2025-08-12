// 用户相关类型
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'user' | 'viewer';
  isActive?: boolean;
}

export interface QueryUsersRequest {
  page?: number;
  limit?: number;
  username?: string;
  email?: string;
  role?: 'admin' | 'user' | 'viewer';
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 任务相关类型
export interface Task {
  id: number;
  name: string;
  description?: string;
  userId: number;
  configId?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  progress: number;
  pagesCrawled: number;
  pagesTotal: number;
  dataExtracted: number;
  errorCount: number;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  name: string;
  description?: string;
  configId?: number;
  priority?: number;
  scheduledAt?: string;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  priority?: number;
  scheduledAt?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface QueryTasksRequest {
  page?: number;
  limit?: number;
  status?: string;
  userId?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// 配置相关类型
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

// 监控相关类型
export interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface TaskStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface PerformanceMetrics {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeConnections: number;
}

// API 响应类型
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 认证相关类型
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}