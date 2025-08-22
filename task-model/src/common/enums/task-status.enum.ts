/**
 * 任务状态枚举
 */
export enum TaskStatus {
  /** 等待执行 */
  PENDING = 'PENDING',
  /** 正在执行 */
  RUNNING = 'RUNNING',
  /** 执行成功 */
  SUCCESS = 'SUCCESS',
  /** 执行失败 */
  FAILED = 'FAILED',
  /** 已暂停 */
  PAUSED = 'PAUSED',
  /** 已取消 */
  CANCELLED = 'CANCELLED',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
}

/**
 * 执行单元状态枚举
 */
export enum ExecutionUnitStatus {
  /** 可用 */
  AVAILABLE = 'AVAILABLE',
  /** 忙碌 */
  BUSY = 'BUSY',
  /** 离线 */
  OFFLINE = 'OFFLINE',
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 任务操作枚举
 */
export enum TaskOperation {
  /** 创建 */
  CREATE = 'CREATE',
  /** 启动 */
  START = 'START',
  /** 暂停 */
  PAUSE = 'PAUSE',
  /** 恢复 */
  RESUME = 'RESUME',
  /** 取消 */
  CANCEL = 'CANCEL',
  /** 重启 */
  RESTART = 'RESTART',
  /** 删除 */
  DELETE = 'DELETE',
  /** 重试 */
  RETRY = 'RETRY',
  /** 重置 */
  RESET = 'RESET',
}

/**
 * 任务类型枚举
 */
export enum TaskType {
  /** 数据处理 */
  DATA_PROCESSING = 'DATA_PROCESSING',
  /** 视频处理 */
  VIDEO_PROCESSING = 'VIDEO_PROCESSING',
  /** 数据库备份 */
  DATABASE_BACKUP = 'DATABASE_BACKUP',
  /** 邮件发送 */
  EMAIL_SENDING = 'EMAIL_SENDING',
  /** 文件同步 */
  FILE_SYNC = 'FILE_SYNC',
  /** API调用 */
  API_CALL = 'API_CALL',
}

/**
 * 状态转换映射
 */
export const STATE_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
  [TaskStatus.RUNNING]: [TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.PAUSED, TaskStatus.CANCELLED, TaskStatus.COMPLETED],
  [TaskStatus.PAUSED]: [TaskStatus.RUNNING, TaskStatus.CANCELLED],
  [TaskStatus.FAILED]: [TaskStatus.PENDING],
  [TaskStatus.CANCELLED]: [TaskStatus.PENDING],
  [TaskStatus.SUCCESS]: [],
  [TaskStatus.COMPLETED]: [],
};

/**
 * 检查状态转换是否合法
 * @param fromStatus 原状态
 * @param toStatus 目标状态
 * @returns 是否合法
 */
export function isValidStateTransition(fromStatus: TaskStatus, toStatus: TaskStatus): boolean {
  return STATE_TRANSITIONS[fromStatus]?.includes(toStatus) || false;
}

/**
 * 获取任务的终态列表
 */
export const TERMINAL_STATES: TaskStatus[] = [TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.CANCELLED, TaskStatus.COMPLETED];

/**
 * 检查是否为终态
 * @param status 任务状态
 * @returns 是否为终态
 */
export function isTerminalState(status: TaskStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

/**
 * 获取可执行操作的状态映射
 */
export const OPERATION_ALLOWED_STATES: Record<TaskOperation, TaskStatus[]> = {
  [TaskOperation.CREATE]: [],
  [TaskOperation.START]: [TaskStatus.PENDING],
  [TaskOperation.PAUSE]: [TaskStatus.RUNNING],
  [TaskOperation.RESUME]: [TaskStatus.PAUSED],
  [TaskOperation.CANCEL]: [TaskStatus.PENDING, TaskStatus.RUNNING, TaskStatus.PAUSED],
  [TaskOperation.RESTART]: [TaskStatus.FAILED, TaskStatus.CANCELLED],
  [TaskOperation.DELETE]: [TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.CANCELLED, TaskStatus.COMPLETED],
  [TaskOperation.RETRY]: [TaskStatus.FAILED],
  [TaskOperation.RESET]: [TaskStatus.FAILED, TaskStatus.CANCELLED, TaskStatus.COMPLETED],
};

/**
 * 检查操作是否允许
 * @param operation 操作类型
 * @param currentStatus 当前状态
 * @returns 是否允许
 */
export function isOperationAllowed(operation: TaskOperation, currentStatus: TaskStatus): boolean {
  return OPERATION_ALLOWED_STATES[operation]?.includes(currentStatus) || false;
}