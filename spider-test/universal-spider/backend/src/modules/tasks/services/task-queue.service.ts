import { Injectable, Logger } from '@nestjs/common';
import { Task } from '../../../entities/mysql/task.entity';

interface QueueItem {
  task: Task;
  priority: number;
  addedAt: Date;
}

@Injectable()
export class TaskQueueService {
  private readonly logger = new Logger(TaskQueueService.name);
  private queue: QueueItem[] = [];

  addTask(task: Task, priority = 5): void {
    const queueItem: QueueItem = {
      task,
      priority,
      addedAt: new Date(),
    };

    this.queue.push(queueItem);
    this.sortQueue();

    this.logger.log(`任务 ${task.id} 已加入队列，优先级: ${priority}`);
  }

  getNextTask(): Task | null {
    const item = this.queue.shift();
    return item ? item.task : null;
  }

  removeTask(taskId: number): boolean {
    const index = this.queue.findIndex((item) => item.task.id === taskId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.logger.log(`任务 ${taskId} 已从队列中移除`);
      return true;
    }
    return false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getQueueItems(): QueueItem[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
    this.logger.log('队列已清空');
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // 优先级高的排在前面（数字越大优先级越高）
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 优先级相同时，先加入的排在前面
      return a.addedAt.getTime() - b.addedAt.getTime();
    });
  }

  getTaskPosition(taskId: number): number {
    const index = this.queue.findIndex((item) => item.task.id === taskId);
    return index === -1 ? -1 : index + 1;
  }

  updateTaskPriority(taskId: number, priority: number): boolean {
    const item = this.queue.find((item) => item.task.id === taskId);
    if (item) {
      item.priority = priority;
      this.sortQueue();
      this.logger.log(`任务 ${taskId} 优先级已更新为 ${priority}`);
      return true;
    }
    return false;
  }
}
