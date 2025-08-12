import { Injectable, Logger } from '@nestjs/common';

export interface LogEvent {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  action: string;
  message?: string;
  data?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

export interface LogQuery {
  level?: 'debug' | 'info' | 'warn' | 'error';
  category?: string;
  action?: string;
  startTime?: string;
  endTime?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private logs: LogEvent[] = [];
  private maxLogs = 10000; // 最大日志条数

  /**
   * 记录事件日志
   */
  logEvent(
    category: string,
    action: string,
    data?: Record<string, unknown>,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    userId?: string,
    sessionId?: string,
  ): void {
    const logEvent: LogEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      data,
      userId,
      sessionId,
    };

    this.logs.push(logEvent);

    // 清理旧日志
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 输出到控制台
    const message = `[${category}] ${action}`;
    switch (level) {
      case 'debug':
        this.logger.debug(message, data);
        break;
      case 'info':
        this.logger.log(message, data);
        break;
      case 'warn':
        this.logger.warn(message, data);
        break;
      case 'error':
        this.logger.error(message, data);
        break;
    }
  }

  /**
   * 记录错误日志
   */
  logError(
    category: string,
    action: string,
    error: Error | string,
    data?: Record<string, unknown>,
    userId?: string,
    sessionId?: string,
  ): void {
    const errorData = {
      ...data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : { message: error },
    };

    this.logEvent(category, action, errorData, 'error', userId, sessionId);
  }

  /**
   * 记录性能日志
   */
  logPerformance(
    category: string,
    action: string,
    duration: number,
    data?: Record<string, unknown>,
    userId?: string,
    sessionId?: string,
  ): void {
    const performanceData = {
      ...data,
      duration,
      timestamp: new Date().toISOString(),
    };

    this.logEvent(category, action, performanceData, 'info', userId, sessionId);
  }

  /**
   * 记录用户操作日志
   */
  logUserAction(
    userId: string,
    action: string,
    data?: Record<string, unknown>,
    sessionId?: string,
  ): void {
    this.logEvent('user', action, data, 'info', userId, sessionId);
  }

  /**
   * 记录系统事件日志
   */
  logSystemEvent(
    action: string,
    data?: Record<string, unknown>,
  ): void {
    this.logEvent('system', action, data, 'info');
  }

  /**
   * 记录爬虫事件日志
   */
  logCrawlerEvent(
    action: string,
    data?: Record<string, unknown>,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
  ): void {
    this.logEvent('crawler', action, data, level);
  }

  /**
   * 查询日志
   */
  queryLogs(query: LogQuery = {}): LogEvent[] {
    let filteredLogs = [...this.logs];

    // 按级别过滤
    if (query.level) {
      filteredLogs = filteredLogs.filter(log => log.level === query.level);
    }

    // 按分类过滤
    if (query.category) {
      filteredLogs = filteredLogs.filter(log => log.category === query.category);
    }

    // 按操作过滤
    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action === query.action);
    }

    // 按用户ID过滤
    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }

    // 按时间范围过滤
    if (query.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endTime!);
    }

    // 排序（最新的在前）
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 分页
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return filteredLogs.slice(offset, offset + limit);
  }

  /**
   * 获取日志统计信息
   */
  getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    recentErrors: LogEvent[];
  } {
    const byLevel: Record<string, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    const byCategory: Record<string, number> = {};

    for (const log of this.logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    }

    // 获取最近的错误日志
    const recentErrors = this.logs
      .filter(log => log.level === 'error')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      recentErrors,
    };
  }

  /**
   * 清理日志
   */
  clearLogs(olderThan?: string): number {
    const initialCount = this.logs.length;

    if (olderThan) {
      this.logs = this.logs.filter(log => log.timestamp > olderThan);
    } else {
      this.logs = [];
    }

    const clearedCount = initialCount - this.logs.length;
    this.logger.log(`清理了 ${clearedCount} 条日志`);

    return clearedCount;
  }

  /**
   * 导出日志
   */
  exportLogs(query: LogQuery = {}): string {
    const logs = this.queryLogs(query);
    
    const csvHeader = 'ID,Timestamp,Level,Category,Action,Message,Data,UserID,SessionID\n';
    const csvRows = logs.map(log => {
      const data = log.data ? JSON.stringify(log.data).replace(/"/g, '""') : '';
      return [
        log.id,
        log.timestamp,
        log.level,
        log.category,
        log.action,
        log.message || '',
        `"${data}"`,
        log.userId || '',
        log.sessionId || '',
      ].join(',');
    }).join('\n');

    return csvHeader + csvRows;
  }

  /**
   * 设置最大日志数量
   */
  setMaxLogs(maxLogs: number): void {
    this.maxLogs = maxLogs;
    
    // 如果当前日志数量超过新的限制，进行清理
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.logger.log(`设置最大日志数量为: ${maxLogs}`);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 获取日志服务状态
   */
  getServiceStatus(): {
    isRunning: boolean;
    currentLogCount: number;
    maxLogCount: number;
    memoryUsage: string;
  } {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

    return {
      isRunning: true,
      currentLogCount: this.logs.length,
      maxLogCount: this.maxLogs,
      memoryUsage: `${memoryUsageMB} MB`,
    };
  }
}