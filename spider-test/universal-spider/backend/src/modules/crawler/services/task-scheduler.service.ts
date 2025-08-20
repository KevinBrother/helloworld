import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BatchCrawlerService, BatchCrawlRequest } from './batch-crawler.service';
import { DataStorageService } from '../../data/services/data-storage.service';

export interface CrawlTask {
  id: string;
  name: string;
  description?: string;
  request: BatchCrawlRequest;
  schedule?: string; // cron表达式
  enabled: boolean;
  priority: TaskPriority;
  maxRetries: number;
  retryCount: number;
  lastRun?: Date;
  nextRun?: Date;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  webhook?: string; // 完成后回调URL
}

export enum TaskPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export interface TaskExecutionResult {
  taskId: string;
  status: TaskStatus;
  startTime: Date;
  endTime: Date;
  executionTime: number;
  result?: any;
  error?: string;
  retryCount: number;
}

export interface SchedulerStats {
  totalTasks: number;
  runningTasks: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  pausedTasks: number;
  averageExecutionTime: number;
  successRate: number;
}

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);
  private readonly tasks = new Map<string, CrawlTask>();
  private readonly runningTasks = new Map<string, Promise<TaskExecutionResult>>();
  private readonly taskQueue: string[] = [];
  private readonly maxConcurrentTasks = 3;
  private isProcessing = false;

  constructor(
    private readonly batchCrawler: BatchCrawlerService,
    private readonly dataStorage: DataStorageService,
  ) {
    this.loadTasksFromStorage();
  }

  /**
   * 创建新任务
   */
  async createTask(task: Omit<CrawlTask, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount'>): Promise<CrawlTask> {
    const newTask: CrawlTask = {
      ...task,
      id: this.generateTaskId(),
      status: TaskStatus.PENDING,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 计算下次运行时间
    if (newTask.schedule) {
      newTask.nextRun = this.calculateNextRun(newTask.schedule);
    }

    this.tasks.set(newTask.id, newTask);
    await this.saveTaskToStorage(newTask);
    
    this.logger.log(`任务已创建: ${newTask.name} (${newTask.id})`);
    
    // 如果是立即执行的任务，加入队列
    if (!newTask.schedule) {
      this.addToQueue(newTask.id);
    }

    return newTask;
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: Partial<CrawlTask>): Promise<CrawlTask | null> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };

    // 重新计算下次运行时间
    if (updatedTask.schedule) {
      updatedTask.nextRun = this.calculateNextRun(updatedTask.schedule);
    }

    this.tasks.set(taskId, updatedTask);
    await this.saveTaskToStorage(updatedTask);
    
    this.logger.log(`任务已更新: ${updatedTask.name} (${taskId})`);
    return updatedTask;
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // 如果任务正在运行，先取消
    if (task.status === TaskStatus.RUNNING) {
      await this.cancelTask(taskId);
    }

    this.tasks.delete(taskId);
    await this.deleteTaskFromStorage(taskId);
    
    this.logger.log(`任务已删除: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): CrawlTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): CrawlTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 根据状态获取任务
   */
  getTasksByStatus(status: TaskStatus): CrawlTask[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  /**
   * 手动执行任务
   */
  async executeTask(taskId: string): Promise<TaskExecutionResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    if (task.status === TaskStatus.RUNNING) {
      throw new Error(`任务正在运行: ${taskId}`);
    }

    return this.runTask(task);
  }

  /**
   * 暂停任务
   */
  async pauseTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = TaskStatus.PAUSED;
    task.updatedAt = new Date();
    await this.saveTaskToStorage(task);
    
    this.logger.log(`任务已暂停: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * 恢复任务
   */
  async resumeTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== TaskStatus.PAUSED) {
      return false;
    }

    task.status = TaskStatus.PENDING;
    task.updatedAt = new Date();
    await this.saveTaskToStorage(task);
    
    this.addToQueue(taskId);
    this.logger.log(`任务已恢复: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.status = TaskStatus.CANCELLED;
    task.updatedAt = new Date();
    await this.saveTaskToStorage(task);
    
    // 从队列中移除
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
    }
    
    this.logger.log(`任务已取消: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * 获取调度器统计信息
   */
  getStats(): SchedulerStats {
    const tasks = Array.from(this.tasks.values());
    const totalTasks = tasks.length;
    const runningTasks = tasks.filter(t => t.status === TaskStatus.RUNNING).length;
    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING).length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED).length;
    const pausedTasks = tasks.filter(t => t.status === TaskStatus.PAUSED).length;
    
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return {
      totalTasks,
      runningTasks,
      pendingTasks,
      completedTasks,
      failedTasks,
      pausedTasks,
      averageExecutionTime: 0, // TODO: 计算平均执行时间
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  /**
   * 定时检查待执行任务
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledTasks(): Promise<void> {
    const now = new Date();
    const tasks = Array.from(this.tasks.values());
    
    for (const task of tasks) {
      if (
        task.enabled &&
        task.schedule &&
        task.nextRun &&
        task.nextRun <= now &&
        task.status !== TaskStatus.RUNNING
      ) {
        this.logger.log(`触发定时任务: ${task.name} (${task.id})`);
        this.addToQueue(task.id);
        
        // 计算下次运行时间
        task.nextRun = this.calculateNextRun(task.schedule);
        await this.saveTaskToStorage(task);
      }
    }
    
    // 处理任务队列
    this.processQueue();
  }

  /**
   * 添加任务到队列
   */
  private addToQueue(taskId: string): void {
    if (!this.taskQueue.includes(taskId)) {
      const task = this.tasks.get(taskId);
      if (task) {
        // 按优先级排序
        const insertIndex = this.taskQueue.findIndex(id => {
          const queueTask = this.tasks.get(id);
          return queueTask && queueTask.priority < task.priority;
        });
        
        if (insertIndex === -1) {
          this.taskQueue.push(taskId);
        } else {
          this.taskQueue.splice(insertIndex, 0, taskId);
        }
      }
    }
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.runningTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    this.isProcessing = true;
    
    while (this.taskQueue.length > 0 && this.runningTasks.size < this.maxConcurrentTasks) {
      const taskId = this.taskQueue.shift()!;
      const task = this.tasks.get(taskId);
      
      if (task && task.status === TaskStatus.PENDING) {
        const execution = this.runTask(task);
        this.runningTasks.set(taskId, execution);
        
        // 任务完成后从运行列表中移除
        execution.finally(() => {
          this.runningTasks.delete(taskId);
        });
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * 执行任务
   */
  private async runTask(task: CrawlTask): Promise<TaskExecutionResult> {
    const startTime = new Date();
    
    try {
      // 更新任务状态
      task.status = TaskStatus.RUNNING;
      task.lastRun = startTime;
      task.updatedAt = new Date();
      await this.saveTaskToStorage(task);
      
      this.logger.log(`开始执行任务: ${task.name} (${task.id})`);
      
      // 执行批量爬取
      const result = await this.batchCrawler.batchCrawl(task.request);
      
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();
      
      // 更新任务状态为完成
      task.status = TaskStatus.COMPLETED;
      task.retryCount = 0;
      task.updatedAt = new Date();
      await this.saveTaskToStorage(task);
      
      const executionResult: TaskExecutionResult = {
        taskId: task.id,
        status: TaskStatus.COMPLETED,
        startTime,
        endTime,
        executionTime,
        result,
        retryCount: task.retryCount,
      };
      
      this.logger.log(`任务执行完成: ${task.name} (${task.id})`, {
        executionTime,
        successCount: result.successCount,
        failureCount: result.failureCount,
      });
      
      // 发送webhook通知
      if (task.webhook) {
        this.sendWebhook(task.webhook, executionResult);
      }
      
      return executionResult;
      
    } catch (error) {
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`任务执行失败: ${task.name} (${task.id})`, error);
      
      // 检查是否需要重试
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = TaskStatus.PENDING;
        task.updatedAt = new Date();
        await this.saveTaskToStorage(task);
        
        // 延迟重试
        setTimeout(() => {
          this.addToQueue(task.id);
        }, 60000 * task.retryCount); // 递增延迟
        
        this.logger.log(`任务将重试: ${task.name} (${task.id}), 重试次数: ${task.retryCount}/${task.maxRetries}`);
      } else {
        // 重试次数用完，标记为失败
        task.status = TaskStatus.FAILED;
        task.updatedAt = new Date();
        await this.saveTaskToStorage(task);
      }
      
      const executionResult: TaskExecutionResult = {
        taskId: task.id,
        status: task.status,
        startTime,
        endTime,
        executionTime,
        error: errorMessage,
        retryCount: task.retryCount,
      };
      
      // 发送webhook通知
      if (task.webhook) {
        this.sendWebhook(task.webhook, executionResult);
      }
      
      return executionResult;
    }
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算下次运行时间
   */
  private calculateNextRun(cronExpression: string): Date {
    // 这里应该使用cron解析库，简化实现
    const now = new Date();
    return new Date(now.getTime() + 60000); // 简单示例：1分钟后
  }

  /**
   * 发送webhook通知
   */
  private async sendWebhook(webhookUrl: string, result: TaskExecutionResult): Promise<void> {
    try {
      // 这里应该实现HTTP请求发送webhook
      this.logger.log(`发送webhook通知: ${webhookUrl}`, {
        taskId: result.taskId,
        status: result.status,
      });
    } catch (error) {
      this.logger.error(`Webhook发送失败: ${webhookUrl}`, error);
    }
  }

  /**
   * 从存储加载任务
   */
  private async loadTasksFromStorage(): Promise<void> {
    try {
      // 这里应该从数据库加载任务
      this.logger.log('从存储加载任务');
    } catch (error) {
      this.logger.error('加载任务失败', error);
    }
  }

  /**
   * 保存任务到存储
   */
  private async saveTaskToStorage(task: CrawlTask): Promise<void> {
    try {
      // 这里应该保存到数据库
      this.logger.debug(`保存任务: ${task.id}`);
    } catch (error) {
      this.logger.error(`保存任务失败: ${task.id}`, error);
    }
  }

  /**
   * 从存储删除任务
   */
  private async deleteTaskFromStorage(taskId: string): Promise<void> {
    try {
      // 这里应该从数据库删除
      this.logger.debug(`删除任务: ${taskId}`);
    } catch (error) {
      this.logger.error(`删除任务失败: ${taskId}`, error);
    }
  }
}