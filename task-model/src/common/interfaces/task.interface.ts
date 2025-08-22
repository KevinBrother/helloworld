import { TaskStatus, TaskType, LogLevel, ExecutionUnitStatus } from '../enums/task-status.enum';

/**
 * 任务基础接口
 */
export interface ITask {
  id: number;
  taskName: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: number;
  config: Record<string, any>;
  executionUnitId?: string;
  executionUnitType?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  progress: number;
  result?: Record<string, any>;
}

/**
 * 创建任务请求接口
 */
export interface ICreateTaskRequest {
  taskName: string;
  taskType: TaskType;
  priority?: number;
  config: Record<string, any>;
  maxRetries?: number;
}

/**
 * 更新任务请求接口
 */
export interface IUpdateTaskRequest {
  taskName?: string;
  priority?: number;
  config?: Record<string, any>;
  maxRetries?: number;
}

/**
 * 任务查询参数接口
 */
export interface ITaskQueryParams {
  status?: TaskStatus;
  taskType?: TaskType;
  priority?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * 任务状态历史接口
 */
export interface ITaskStatusHistory {
  id: number;
  taskId: number;
  fromStatus?: string;
  toStatus: string;
  changedAt: Date;
  changedBy?: string;
  reason?: string;
  additionalData?: Record<string, any>;
}

/**
 * 执行单元接口
 */
export interface IExecutionUnit {
  id: string;
  unitType: string;
  unitName: string;
  status: ExecutionUnitStatus;
  capacity: number;
  currentLoad: number;
  endpoint?: string;
  config?: Record<string, any>;
  lastHeartbeat?: Date;
  createdAt: Date;
  updatedAt: Date;
  version?: string;
  description?: string;
}

/**
 * 注册执行单元请求接口
 */
export interface IRegisterExecutionUnitRequest {
  id: string;
  unitType: string;
  unitName: string;
  capacity?: number;
  endpoint?: string;
  config?: Record<string, any>;
  version?: string;
  description?: string;
}

/**
 * 执行单元心跳接口
 */
export interface IExecutionUnitHeartbeat {
  unitId: string;
  status: ExecutionUnitStatus;
  currentLoad: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 任务执行日志接口
 */
export interface ITaskExecutionLog {
  id: number;
  taskId: number;
  executionUnitId?: string;
  logLevel: LogLevel;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 任务执行状态接口
 */
export interface ITaskExecutionStatus {
  taskId: number;
  status: TaskStatus;
  progress: number;
  message?: string;
  checkpoint?: Record<string, any>;
  estimatedTimeRemaining?: number;
  lastUpdated: Date;
}

/**
 * 执行单元控制接口
 */
export interface IExecutionUnitControl {
  /**
   * 开始执行任务
   */
  start(taskId: number, config: Record<string, any>): Promise<void>;
  
  /**
   * 暂停任务执行
   */
  pause(taskId: number): Promise<void>;
  
  /**
   * 恢复任务执行
   */
  resume(taskId: number): Promise<void>;
  
  /**
   * 取消任务执行
   */
  cancel(taskId: number): Promise<void>;
  
  /**
   * 获取任务执行状态
   */
  getStatus(taskId: number): Promise<ITaskExecutionStatus>;
}

/**
 * 任务统计信息接口
 */
export interface ITaskStatistics {
  total: number;
  pending: number;
  running: number;
  completed: number;
  success: number;
  failed: number;
  paused: number;
  cancelled: number;
  averageExecutionTime: number;
  successRate: number;
  failureRate: number;
}

/**
 * 执行单元统计信息接口
 */
export interface IExecutionUnitStatistics {
  total: number;
  available: number;
  busy: number;
  offline: number;
  totalCapacity: number;
  totalLoad: number;
  currentLoad: number;
  utilizationRate: number;
  averageLoadRate: number;
}

/**
 * 任务分页结果接口
 */
export interface ITaskPaginationResult {
  data: ITask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * API响应基础接口
 */
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

/**
 * 任务配置验证接口
 */
export interface ITaskConfigValidator {
  /**
   * 验证任务配置
   */
  validate(taskType: TaskType, config: Record<string, any>): Promise<IValidationResult>;
}

/**
 * 验证结果接口
 */
export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 任务调度器接口
 */
export interface ITaskScheduler {
  /**
   * 调度任务
   */
  schedule(task: ITask): Promise<void>;
  
  /**
   * 获取下一个待执行任务
   */
  getNextTask(): Promise<ITask | null>;
  
  /**
   * 释放执行单元
   */
  releaseExecutionUnit(unitId: string): Promise<void>;
}

/**
 * 任务事件接口
 */
export interface ITaskEvent {
  taskId: number;
  eventType: string;
  timestamp: Date;
  data?: Record<string, any>;
}

/**
 * 任务监听器接口
 */
export interface ITaskEventListener {
  /**
   * 处理任务事件
   */
  handleEvent(event: ITaskEvent): Promise<void>;
}