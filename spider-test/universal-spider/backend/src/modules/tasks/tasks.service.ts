import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/mysql/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskStatus } from '../../entities/mysql/task.entity';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { TaskExecutorService } from './services/task-executor.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private taskSchedulerService: TaskSchedulerService,
    private taskExecutorService: TaskExecutorService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepository.create({
      ...createTaskDto,
      status: TaskStatus.PENDING,
    });

    const savedTask = await this.taskRepository.save(task);

    // 如果是立即执行的任务，加入执行队列
    if (createTaskDto.executeImmediately) {
      await this.taskExecutorService.addToQueue(savedTask);
    }
    // 如果是定时任务，加入调度器
    else if (createTaskDto.scheduleType && createTaskDto.scheduleConfig) {
      await this.taskSchedulerService.scheduleTask(savedTask);
    }

    return savedTask;
  }

  async findAll(query: TaskQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      userId,
      keyword,
      startDate,
      endDate,
    } = query;

    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('task.type = :type', { type });
    }

    if (userId) {
      queryBuilder.andWhere('task.userId = :userId', { userId });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(task.name LIKE :keyword OR task.description LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (startDate) {
      queryBuilder.andWhere('task.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('task.createdAt <= :endDate', { endDate });
    }

    queryBuilder
      .orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!task) {
      throw new NotFoundException(`任务 ID ${id} 不存在`);
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    // 检查任务状态是否允许更新
    if (task.status === TaskStatus.RUNNING) {
      throw new BadRequestException('正在运行的任务不能修改');
    }

    Object.assign(task, updateTaskDto);
    task.updatedAt = new Date();

    return this.taskRepository.save(task);
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);

    // 检查任务状态是否允许删除
    if (task.status === TaskStatus.RUNNING) {
      throw new BadRequestException('正在运行的任务不能删除');
    }

    // 从调度器中移除
    await this.taskSchedulerService.unscheduleTask(id);

    await this.taskRepository.remove(task);
  }

  async startTask(id: number): Promise<void> {
    const task = await this.findOne(id);

    if (task.status === TaskStatus.RUNNING) {
      throw new BadRequestException('任务已在运行中');
    }

    await this.taskExecutorService.addToQueue(task);
  }

  async stopTask(id: number): Promise<void> {
    const task = await this.findOne(id);

    if (task.status !== TaskStatus.RUNNING) {
      throw new BadRequestException('任务未在运行中');
    }

    await this.taskExecutorService.stopTask(id);
  }

  async pauseTask(id: number): Promise<void> {
    const task = await this.findOne(id);

    if (task.status !== TaskStatus.RUNNING) {
      throw new BadRequestException('只能暂停正在运行的任务');
    }

    task.status = TaskStatus.PAUSED;
    task.updatedAt = new Date();
    await this.taskRepository.save(task);

    await this.taskExecutorService.pauseTask(id);
  }

  async resumeTask(id: number): Promise<void> {
    const task = await this.findOne(id);

    if (task.status !== TaskStatus.PAUSED) {
      throw new BadRequestException('只能恢复已暂停的任务');
    }

    await this.taskExecutorService.resumeTask(id);
  }

  async getTaskLogs(id: number, page: number, limit: number) {
    // 这里应该从日志存储中获取任务日志
    // 暂时返回模拟数据
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  async getTaskResults(id: number, page: number, limit: number) {
    // 这里应该从结果存储中获取任务结果
    // 暂时返回模拟数据
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  async getTaskStats() {
    const totalTasks = await this.taskRepository.count();
    const runningTasks = await this.taskRepository.count({
      where: { status: TaskStatus.RUNNING },
    });
    const completedTasks = await this.taskRepository.count({
      where: { status: TaskStatus.COMPLETED },
    });
    const failedTasks = await this.taskRepository.count({
      where: { status: TaskStatus.FAILED },
    });
    const pendingTasks = await this.taskRepository.count({
      where: { status: TaskStatus.PENDING },
    });

    return {
      total: totalTasks,
      running: runningTasks,
      completed: completedTasks,
      failed: failedTasks,
      pending: pendingTasks,
    };
  }

  async updateTaskStatus(id: number, status: TaskStatus): Promise<void> {
    await this.taskRepository.update(id, {
      status,
      updatedAt: new Date(),
    });
  }
}
