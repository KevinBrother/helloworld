import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { LogLevel } from '../../../common/enums/task-status.enum';
import { Task } from './task.entity';
import { ExecutionUnit } from '../../execution-unit/entities/execution-unit.entity';

/**
 * 任务执行日志实体
 */
@Entity('task_execution_logs')
@Index(['taskId'])
@Index(['timestamp'])
@Index(['logLevel'])
export class TaskExecutionLog {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '日志ID' })
  id: number;

  @Column({ type: 'bigint', comment: '任务ID' })
  taskId: number;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '执行单元ID' })
  executionUnitId: string;

  @Column({ 
    type: 'enum', 
    enum: LogLevel, 
    default: LogLevel.INFO,
    comment: '日志级别'
  })
  logLevel: LogLevel;

  @Column({ type: 'text', comment: '日志消息' })
  message: string;

  @CreateDateColumn({ comment: '日志时间' })
  timestamp: Date;

  @Column({ type: 'json', nullable: true, comment: '元数据' })
  metadata: Record<string, any>;

  // 关联关系
  @ManyToOne(() => Task, task => task.executionLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @ManyToOne(() => ExecutionUnit, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'executionUnitId' })
  executionUnit: ExecutionUnit;

  /**
   * 获取日志级别的中文描述
   */
  get logLevelDescription(): string {
    const levelMap = {
      [LogLevel.DEBUG]: '调试',
      [LogLevel.INFO]: '信息',
      [LogLevel.WARN]: '警告',
      [LogLevel.ERROR]: '错误',
    };
    return levelMap[this.logLevel] || '未知';
  }

  /**
   * 检查是否为错误日志
   */
  get isError(): boolean {
    return this.logLevel === LogLevel.ERROR;
  }

  /**
   * 检查是否为警告日志
   */
  get isWarning(): boolean {
    return this.logLevel === LogLevel.WARN;
  }

  /**
   * 获取格式化的日志消息
   */
  get formattedMessage(): string {
    const timestamp = this.timestamp.toISOString();
    const level = this.logLevel.padEnd(5);
    const unitId = this.executionUnitId ? `[${this.executionUnitId}]` : '[SYSTEM]';
    return `${timestamp} ${level} ${unitId} ${this.message}`;
  }

  /**
   * 创建日志记录
   */
  static create(
    taskId: number,
    logLevel: LogLevel,
    message: string,
    executionUnitId?: string,
    metadata?: Record<string, any>
  ): TaskExecutionLog {
    const log = new TaskExecutionLog();
    log.taskId = taskId;
    log.logLevel = logLevel;
    log.message = message;
    log.executionUnitId = executionUnitId;
    log.metadata = metadata;
    return log;
  }

  /**
   * 创建信息日志
   */
  static info(taskId: number, message: string, executionUnitId?: string, metadata?: Record<string, any>): TaskExecutionLog {
    return this.create(taskId, LogLevel.INFO, message, executionUnitId, metadata);
  }

  /**
   * 创建警告日志
   */
  static warn(taskId: number, message: string, executionUnitId?: string, metadata?: Record<string, any>): TaskExecutionLog {
    return this.create(taskId, LogLevel.WARN, message, executionUnitId, metadata);
  }

  /**
   * 创建错误日志
   */
  static error(taskId: number, message: string, executionUnitId?: string, metadata?: Record<string, any>): TaskExecutionLog {
    return this.create(taskId, LogLevel.ERROR, message, executionUnitId, metadata);
  }

  /**
   * 创建调试日志
   */
  static debug(taskId: number, message: string, executionUnitId?: string, metadata?: Record<string, any>): TaskExecutionLog {
    return this.create(taskId, LogLevel.DEBUG, message, executionUnitId, metadata);
  }
}