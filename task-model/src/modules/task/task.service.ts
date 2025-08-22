import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, In } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskStatusHistory } from './entities/task-status-history.entity';
import { TaskExecutionLog } from './entities/task-execution-log.entity';
import { ExecutionUnit } from '../execution-unit/entities/execution-unit.entity';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto, UpdateTaskStatusDto } from '../../common/dto/task.dto';
import { TaskStatus, LogLevel, TaskOperation, isValidStateTransition, OPERATION_ALLOWED_STATES } from '../../common/enums/task-status.enum';
import { ITaskPaginationResult, ITaskStatistics, IApiResponse } from '../../common/interfaces/task.interface';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskStatusHistory)
    private readonly statusHistoryRepository: Repository<TaskStatusHistory>,
    @InjectRepository(TaskExecutionLog)
    private readonly executionLogRepository: Repository<TaskExecutionLog>,
    @InjectRepository(ExecutionUnit)
    private readonly executionUnitRepository: Repository<ExecutionUnit>,
  ) {}

  /**
   * 创建任务
   */
  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      // 验证任务配置
      this.validateTaskConfig(createTaskDto.config);

      const task = this.taskRepository.create({
        ...createTaskDto,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedTask = await this.taskRepository.save(task);

      // 记录状态历史
      await this.createStatusHistory(savedTask.id, null, TaskStatus.PENDING, 'SYSTEM', '任务创建');

      // 记录日志
      await this.createExecutionLog(savedTask.id, LogLevel.INFO, `任务创建成功: ${savedTask.taskName}`);

      this.logger.log(`任务创建成功: ID=${savedTask.id}, Name=${savedTask.taskName}`);
      return savedTask;
    } catch (error) {
      this.logger.error(`创建任务失败: ${error.message}`, error.stack);
      throw new BadRequestException(`创建任务失败: ${error.message}`);
    }
  }

  /**
   * 根据ID获取任务
   */
  async getTaskById(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['statusHistory', 'executionLogs'],
    });

    if (!task) {
      throw new NotFoundException(`任务不存在: ID=${id}`);
    }

    return task;
  }

  /**
   * 查询任务列表
   */
  async getTasks(queryDto: TaskQueryDto): Promise<ITaskPaginationResult> {
    const {
      page = 1,
      limit = 10,
      status,
      taskType,
      priority,
      executionUnitId,
      createdAfter,
      createdBefore,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    // 添加查询条件
    if (status) {
      if (Array.isArray(status)) {
        queryBuilder.andWhere('task.status IN (:...status)', { status });
      } else {
        queryBuilder.andWhere('task.status = :status', { status });
      }
    }

    if (taskType) {
      queryBuilder.andWhere('task.taskType = :taskType', { taskType });
    }

    if (priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority });
    }

    if (executionUnitId) {
      queryBuilder.andWhere('task.executionUnitId = :executionUnitId', { executionUnitId });
    }

    if (createdAfter) {
      queryBuilder.andWhere('task.createdAt >= :createdAfter', { createdAfter });
    }

    if (createdBefore) {
      queryBuilder.andWhere('task.createdAt <= :createdBefore', { createdBefore });
    }

    // 排序
    queryBuilder.orderBy(`task.${sortBy}`, sortOrder);

    // 分页
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 更新任务
   */
  async updateTask(id: number, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.getTaskById(id);

    // 检查任务是否可以更新
    if (task.isInFinalState) {
      throw new BadRequestException('任务已完成，无法更新');
    }

    // 验证配置
    if (updateTaskDto.config) {
      this.validateTaskConfig(updateTaskDto.config);
    }

    Object.assign(task, updateTaskDto, { updatedAt: new Date() });
    const updatedTask = await this.taskRepository.save(task);

    await this.createExecutionLog(id, LogLevel.INFO, '任务信息已更新');
    this.logger.log(`任务更新成功: ID=${id}`);

    return updatedTask;
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(id: number, updateStatusDto: UpdateTaskStatusDto): Promise<Task> {
    const task = await this.getTaskById(id);
    const { status, reason, changedBy = 'SYSTEM' } = updateStatusDto;

    // 验证状态转换
    if (!isValidStateTransition(task.status, status)) {
      throw new BadRequestException(`无效的状态转换: ${task.status} -> ${status}`);
    }

    const oldStatus = task.status;
    task.status = status;
    task.updatedAt = new Date();

    // 根据状态更新相关字段
    if (status === TaskStatus.RUNNING) {
      task.markAsStarted();
    } else if ([TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED].includes(status)) {
      task.markAsCompleted(undefined, undefined);
    }

    const updatedTask = await this.taskRepository.save(task);

    // 记录状态历史
    await this.createStatusHistory(id, oldStatus, status, changedBy, reason);

    // 记录日志
    await this.createExecutionLog(id, LogLevel.INFO, `任务状态变更: ${oldStatus} -> ${status}`);

    this.logger.log(`任务状态更新: ID=${id}, ${oldStatus} -> ${status}`);
    return updatedTask;
  }

  /**
   * 执行任务操作
   */
  async performTaskOperation(id: number, operation: TaskOperation, operatedBy: string = 'SYSTEM'): Promise<Task> {
    const task = await this.getTaskById(id);

    // 检查操作是否允许
    const allowedStates = OPERATION_ALLOWED_STATES[operation];
    if (!allowedStates || !allowedStates.includes(task.status)) {
      throw new BadRequestException(`当前状态 ${task.status} 不允许执行操作 ${operation}`);
    }

    let newStatus: TaskStatus;
    let reason: string;

    switch (operation) {
      case TaskOperation.START:
        newStatus = TaskStatus.RUNNING;
        reason = '任务启动';
        break;
      case TaskOperation.PAUSE:
        newStatus = TaskStatus.PAUSED;
        reason = '任务暂停';
        break;
      case TaskOperation.RESUME:
        newStatus = TaskStatus.RUNNING;
        reason = '任务恢复';
        break;
      case TaskOperation.CANCEL:
        newStatus = TaskStatus.CANCELLED;
        reason = '任务取消';
        break;
      case TaskOperation.RETRY:
        newStatus = TaskStatus.PENDING;
        reason = '任务重试';
        task.incrementRetryCount();
        break;
      case TaskOperation.RESET:
        task.reset();
        newStatus = TaskStatus.PENDING;
        reason = '任务重置';
        break;
      default:
        throw new BadRequestException(`不支持的操作: ${operation}`);
    }

    return this.updateTaskStatus(id, { status: newStatus, reason, changedBy: operatedBy });
  }

  /**
   * 删除任务
   */
  async deleteTask(id: number): Promise<void> {
    const task = await this.getTaskById(id);

    // 检查任务是否可以删除
    if (task.isRunning) {
      throw new BadRequestException('正在运行的任务无法删除');
    }

    await this.taskRepository.remove(task);
    this.logger.log(`任务删除成功: ID=${id}`);
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(): Promise<ITaskStatistics> {
    const [total, pending, running, completed, failed, cancelled, paused] = await Promise.all([
      this.taskRepository.count(),
      this.taskRepository.count({ where: { status: TaskStatus.PENDING } }),
      this.taskRepository.count({ where: { status: TaskStatus.RUNNING } }),
      this.taskRepository.count({ where: { status: TaskStatus.COMPLETED } }),
      this.taskRepository.count({ where: { status: TaskStatus.FAILED } }),
      this.taskRepository.count({ where: { status: TaskStatus.CANCELLED } }),
      this.taskRepository.count({ where: { status: TaskStatus.PAUSED } }),
    ]);

    return {
      total,
      pending,
      running,
      completed,
      success: completed, // 将completed作为success
      failed,
      cancelled,
      paused,
      averageExecutionTime: 0, // 暂时设为0，后续可以计算平均执行时间
      successRate: total > 0 ? (completed / total) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
    };
  }

  /**
   * 创建状态历史记录
   */
  private async createStatusHistory(
    taskId: number,
    fromStatus: TaskStatus | null,
    toStatus: TaskStatus,
    changedBy: string,
    reason?: string
  ): Promise<void> {
    const history = this.statusHistoryRepository.create({
      taskId,
      fromStatus,
      toStatus,
      changedBy,
      reason,
      changedAt: new Date(),
    });

    await this.statusHistoryRepository.save(history);
  }

  /**
   * 创建执行日志
   */
  private async createExecutionLog(
    taskId: number,
    logLevel: LogLevel,
    message: string,
    executionUnitId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const log = this.executionLogRepository.create({
      taskId,
      logLevel,
      message,
      executionUnitId,
      metadata,
      timestamp: new Date(),
    });

    await this.executionLogRepository.save(log);
  }

  /**
   * 验证任务配置
   */
  private validateTaskConfig(config: Record<string, any>): void {
    if (!config || typeof config !== 'object') {
      throw new BadRequestException('任务配置必须是有效的JSON对象');
    }

    // 可以根据需要添加更多验证逻辑
    // 例如：检查必需的配置项、验证配置值的格式等
  }
}