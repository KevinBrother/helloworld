import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../../entities/mysql/task.entity';
import { TaskStatus } from '../../../entities/mysql/task.entity';
import { ScheduleType } from '../dto/create-task.dto';
import { TaskExecutorService } from './task-executor.service';

interface ScheduledTask {
  taskId: number;
  nextExecution: Date;
  cronExpression?: string;
  interval?: number;
  maxExecutions?: number;
  executionCount: number;
}

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);
  private scheduledTasks: Map<number, ScheduledTask> = new Map();
  private intervalTimers: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private taskExecutorService: TaskExecutorService,
  ) {
    this.loadScheduledTasks();
  }

  async scheduleTask(task: Task): Promise<void> {
    if (!task.scheduleType || !task.scheduleConfig) {
      return;
    }

    const scheduledTask: ScheduledTask = {
      taskId: task.id,
      nextExecution: new Date(),
      executionCount: 0,
    };

    switch (task.scheduleType) {
      case ScheduleType.CRON:
        if (task.scheduleConfig.cronExpression) {
          scheduledTask.cronExpression = task.scheduleConfig.cronExpression;
          scheduledTask.nextExecution = this.getNextCronExecution(
            task.scheduleConfig.cronExpression,
          );
        }
        break;

      case ScheduleType.INTERVAL:
        if (task.scheduleConfig.interval) {
          scheduledTask.interval = task.scheduleConfig.interval;
          scheduledTask.nextExecution = new Date(
            Date.now() + task.scheduleConfig.interval,
          );
          this.scheduleIntervalTask(task.id, task.scheduleConfig.interval);
        }
        break;

      case ScheduleType.ONCE:
        if (task.scheduleConfig.startTime) {
          scheduledTask.nextExecution = new Date(task.scheduleConfig.startTime);
        }
        break;
    }

    if (task.scheduleConfig.maxExecutions) {
      scheduledTask.maxExecutions = task.scheduleConfig.maxExecutions;
    }

    this.scheduledTasks.set(task.id, scheduledTask);
    this.logger.log(
      `任务 ${task.id} 已加入调度，下次执行时间: ${scheduledTask.nextExecution}`,
    );
  }

  async unscheduleTask(taskId: number): Promise<void> {
    this.scheduledTasks.delete(taskId);

    const timer = this.intervalTimers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.intervalTimers.delete(taskId);
    }

    this.logger.log(`任务 ${taskId} 已从调度中移除`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledTasks(): Promise<void> {
    const now = new Date();

    for (const [taskId, scheduledTask] of this.scheduledTasks.entries()) {
      if (scheduledTask.nextExecution <= now) {
        await this.executeScheduledTask(taskId, scheduledTask);
      }
    }
  }

  private async executeScheduledTask(
    taskId: number,
    scheduledTask: ScheduledTask,
  ): Promise<void> {
    try {
      const task = await this.taskRepository.findOne({ where: { id: taskId } });
      if (!task) {
        this.scheduledTasks.delete(taskId);
        return;
      }

      // 检查是否达到最大执行次数
      if (
        scheduledTask.maxExecutions &&
        scheduledTask.executionCount >= scheduledTask.maxExecutions
      ) {
        this.logger.log(`任务 ${taskId} 已达到最大执行次数，从调度中移除`);
        this.unscheduleTask(taskId);
        return;
      }

      // 执行任务
      await this.taskExecutorService.addToQueue(task);
      scheduledTask.executionCount++;

      // 计算下次执行时间
      if (
        task.scheduleType === ScheduleType.CRON &&
        scheduledTask.cronExpression
      ) {
        scheduledTask.nextExecution = this.getNextCronExecution(
          scheduledTask.cronExpression,
        );
      } else if (task.scheduleType === ScheduleType.ONCE) {
        // 一次性任务执行后移除
        this.unscheduleTask(taskId);
      }
      // INTERVAL 类型的任务由定时器处理
    } catch (error) {
      this.logger.error(`执行调度任务 ${taskId} 失败:`, error);
    }
  }

  private scheduleIntervalTask(taskId: number, interval: number): void {
    const timer = setInterval(async () => {
      const scheduledTask = this.scheduledTasks.get(taskId);
      if (scheduledTask) {
        await this.executeScheduledTask(taskId, scheduledTask);
      } else {
        clearInterval(timer);
        this.intervalTimers.delete(taskId);
      }
    }, interval);

    this.intervalTimers.set(taskId, timer);
  }

  private getNextCronExecution(cronExpression: string): Date {
    // 这里应该使用 cron 解析库来计算下次执行时间
    // 暂时返回一分钟后的时间
    return new Date(Date.now() + 60000);
  }

  private async loadScheduledTasks(): Promise<void> {
    try {
      const tasks = await this.taskRepository.find({
        where: {
          status: TaskStatus.PENDING,
        },
      });

      for (const task of tasks) {
        if (task.scheduleType && task.scheduleConfig) {
          await this.scheduleTask(task);
        }
      }

      this.logger.log(`加载了 ${tasks.length} 个调度任务`);
    } catch (error) {
      this.logger.error('加载调度任务失败:', error);
    }
  }

  getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  getTaskScheduleInfo(taskId: number): ScheduledTask | undefined {
    return this.scheduledTasks.get(taskId);
  }
}
