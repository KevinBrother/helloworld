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

// 任务统计类型
export interface TaskStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}