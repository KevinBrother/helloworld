import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { Task } from './entities/task.entity';
import { TaskStatusHistory } from './entities/task-status-history.entity';
import { TaskExecutionLog } from './entities/task-execution-log.entity';
import { ExecutionUnit } from '../execution-unit/entities/execution-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskStatusHistory,
      TaskExecutionLog,
      ExecutionUnit,
    ]),
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService, TypeOrmModule],
})
export class TaskModule {}