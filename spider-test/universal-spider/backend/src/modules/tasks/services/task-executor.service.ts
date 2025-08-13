import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../../entities/mysql/task.entity';
import { TaskStatus } from '../../../entities/mysql/task.entity';
import { CrawlerService } from '../../crawler/crawler.service';
import { DataStorageService } from '../../data/services/data-storage.service';

interface TaskExecution {
  taskId: number;
  status: 'running' | 'paused' | 'stopping';
  startTime: Date;
  progress: number;
  currentUrl?: string;
  processedCount: number;
  totalCount: number;
  errors: string[];
}

@Injectable()
export class TaskExecutorService {
  private readonly logger = new Logger(TaskExecutorService.name);
  private executionQueue: Task[] = [];
  private runningTasks: Map<number, TaskExecution> = new Map();
  private maxConcurrentTasks = 5;
  private isProcessing = false;

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private crawlerService: CrawlerService,
    private dataStorageService: DataStorageService,
  ) {
    this.startQueueProcessor();
  }

  async addToQueue(task: Task): Promise<void> {
    this.executionQueue.push(task);
    this.logger.log(`任务 ${task.id} 已加入执行队列`);

    // 更新任务状态为等待中
    await this.updateTaskStatus(task.id, TaskStatus.PENDING);

    this.processQueue();
  }

  async stopTask(taskId: number): Promise<void> {
    const execution = this.runningTasks.get(taskId);
    if (execution) {
      execution.status = 'stopping';
      this.logger.log(`正在停止任务 ${taskId}`);
    }

    // 从队列中移除
    this.executionQueue = this.executionQueue.filter(
      (task) => task.id !== taskId,
    );

    await this.updateTaskStatus(taskId, TaskStatus.CANCELLED);
  }

  async pauseTask(taskId: number): Promise<void> {
    const execution = this.runningTasks.get(taskId);
    if (execution) {
      execution.status = 'paused';
      this.logger.log(`任务 ${taskId} 已暂停`);
    }
    await Promise.resolve();
  }

  async resumeTask(taskId: number): Promise<void> {
    const execution = this.runningTasks.get(taskId);
    if (execution) {
      execution.status = 'running';
      this.logger.log(`任务 ${taskId} 已恢复`);

      await this.updateTaskStatus(taskId, TaskStatus.RUNNING);
    }
  }

  private async processQueue(): Promise<void> {
    if (
      this.isProcessing ||
      this.runningTasks.size >= this.maxConcurrentTasks
    ) {
      return;
    }

    this.isProcessing = true;

    while (
      this.executionQueue.length > 0 &&
      this.runningTasks.size < this.maxConcurrentTasks
    ) {
      const task = this.executionQueue.shift();
      if (task) {
        this.executeTask(task).catch((error) => {
          this.logger.error(`执行任务 ${task.id} 失败:`, error);
        });
      }
    }

    this.isProcessing = false;
    await Promise.resolve();
  }

  private async executeTask(task: Task): Promise<void> {
    const execution: TaskExecution = {
      taskId: task.id,
      status: 'running',
      startTime: new Date(),
      progress: 0,
      processedCount: 0,
      totalCount: 1,
      errors: [],
    };

    this.runningTasks.set(task.id, execution);

    try {
      await this.updateTaskStatus(task.id, TaskStatus.RUNNING);
      this.logger.log(`开始执行任务 ${task.id}: ${task.name}`);

      // 根据任务类型执行不同的爬虫逻辑
      const result = await this.crawlerService.crawl({
        url: String(task.config.url || ''),
        extractionRules: task.config.extractionRules || [],
        // waitStrategy: task.config.waitStrategy, // 暂时注释掉不存在的属性
        timeout: Number(task.config.timeout || 30000),
        // screenshot: task.config.screenshot, // 暂时注释掉不存在的属性
        customScript: String(task.config.customScript || ''),
        // antiDetection: task.config.antiDetection, // 暂时注释掉不存在的属性
        discoverApis: Boolean(task.config.discoverApis),
        downloadMedia: Boolean(task.config.downloadMedia),
      });

      // 检查任务是否被停止
      if (execution.status === 'stopping') {
        await this.updateTaskStatus(task.id, TaskStatus.CANCELLED);
        this.logger.log(`任务 ${task.id} 已被停止`);
        return;
      }

      // 保存结果
      await this.saveTaskResult(task.id, result);

      execution.progress = 100;
      execution.processedCount = 1;

      await this.updateTaskStatus(task.id, TaskStatus.COMPLETED);
      this.logger.log(`任务 ${task.id} 执行完成`);
    } catch (error) {
      execution.errors.push(String((error as Error)?.message || '未知错误'));
      await this.updateTaskStatus(task.id, TaskStatus.FAILED);
      this.logger.error(`任务 ${task.id} 执行失败:`, error);

      // 保存错误信息
      await this.saveTaskError(task.id, error);
    } finally {
      this.runningTasks.delete(task.id);

      // 继续处理队列
      this.processQueue();
    }
  }

  private async updateTaskStatus(
    taskId: number,
    status: TaskStatus,
  ): Promise<void> {
    await this.taskRepository.update(taskId, {
      status,
      updatedAt: new Date(),
    });
  }

  private async saveTaskResult(taskId: number, result: any): Promise<void> {
    try {
      // 获取任务信息以获取任务名称
      const task = await this.taskRepository.findOne({ where: { id: taskId } });
      const taskName = task?.name || `任务${taskId}`;
      
      // 将爬取结果保存到MongoDB
      const extractedData = {
        taskId: taskId.toString(),
        url: String((result as any)?.url || ''),
        title: String((result as any)?.title || taskName),
        content: String((result as any)?.content || ''),
        metadata: (result as any)?.metadata as Record<string, any> || {},
        rawData: (result as any)?.rawData as any || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const storageResult = await this.dataStorageService.storeData(
        extractedData,
      );
      
      if (storageResult.success) {
        this.logger.log(
          `任务 ${taskId} 的结果已成功保存到MongoDB，记录ID: ${storageResult.recordId}`,
        );
      } else {
        this.logger.error(
          `任务 ${taskId} 的结果保存失败: ${storageResult.error}`,
        );
      }
    } catch (error) {
      this.logger.error(`保存任务 ${taskId} 结果时发生错误:`, error);
    }
  }

  private async saveTaskError(taskId: number, error: any): Promise<void> {
    // 这里应该将错误信息保存到数据库
    // 暂时只记录日志
    this.logger.error(`保存任务 ${taskId} 的错误:`, error);
    await Promise.resolve();
  }

  private startQueueProcessor(): void {
    // 定期检查队列
    setInterval(() => {
      this.processQueue();
    }, 5000);
  }

  getRunningTasks(): TaskExecution[] {
    return Array.from(this.runningTasks.values());
  }

  getQueueStatus(): {
    queueLength: number;
    runningCount: number;
    maxConcurrent: number;
  } {
    return {
      queueLength: this.executionQueue.length,
      runningCount: this.runningTasks.size,
      maxConcurrent: this.maxConcurrentTasks,
    };
  }

  getTaskExecution(taskId: number): TaskExecution | undefined {
    return this.runningTasks.get(taskId);
  }

  setMaxConcurrentTasks(max: number): void {
    this.maxConcurrentTasks = max;
    this.logger.log(`最大并发任务数设置为 ${max}`);
  }
}
