import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { TaskExecutorService } from './services/task-executor.service';
import { TaskQueueService } from './services/task-queue.service';
import { Task } from '../../entities/mysql/task.entity';
import { CrawlerModule } from '../crawler/crawler.module';
import { DataModule } from '../data/data.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), CrawlerModule, DataModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskSchedulerService,
    TaskExecutorService,
    TaskQueueService,
  ],
  exports: [TasksService, TaskSchedulerService],
})
export class TasksModule {}
