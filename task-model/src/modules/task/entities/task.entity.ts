import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { TaskStatus, TaskType } from '../../../common/enums/task-status.enum';
import { TaskStatusHistory } from './task-status-history.entity';
import { TaskExecutionLog } from './task-execution-log.entity';

/**
 * 任务实体
 */
@Entity('tasks')
@Index(['status'])
@Index(['taskType'])
@Index(['createdAt'])
@Index(['executionUnitId'])
export class Task {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '任务ID' })
  id: number;

  @Column({ type: 'varchar', length: 255, comment: '任务名称' })
  taskName: string;

  @Column({ 
    type: 'varchar', 
    length: 100, 
    comment: '任务类型'
  })
  taskType: TaskType;

  @Column({ 
    type: 'enum', 
    enum: TaskStatus, 
    default: TaskStatus.PENDING,
    comment: '任务状态'
  })
  status: TaskStatus;

  @Column({ type: 'int', default: 0, comment: '任务优先级' })
  priority: number;

  @Column({ type: 'json', nullable: true, comment: '任务配置参数' })
  config: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '执行单元ID' })
  executionUnitId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '执行单元类型' })
  executionUnitType: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: '开始执行时间' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: '完成时间' })
  completedAt: Date;

  @Column({ type: 'text', nullable: true, comment: '错误信息' })
  errorMessage: string;

  @Column({ type: 'int', default: 0, comment: '重试次数' })
  retryCount: number;

  @Column({ type: 'int', default: 3, comment: '最大重试次数' })
  maxRetries: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.00, comment: '执行进度(0-100)' })
  progress: number;

  @Column({ type: 'json', nullable: true, comment: '执行结果' })
  result: Record<string, any>;

  // 关联关系
  @OneToMany(() => TaskStatusHistory, history => history.task, { cascade: true })
  statusHistory: TaskStatusHistory[];

  @OneToMany(() => TaskExecutionLog, log => log.task, { cascade: true })
  executionLogs: TaskExecutionLog[];

  /**
   * 计算任务执行时长（秒）
   */
  get executionDuration(): number | null {
    if (!this.startedAt) return null;
    const endTime = this.completedAt || new Date();
    return Math.floor((endTime.getTime() - this.startedAt.getTime()) / 1000);
  }

  /**
   * 检查任务是否为终态
   */
  get isTerminal(): boolean {
    return [TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.CANCELLED].includes(this.status);
  }

  /**
   * 检查是否为终态
   */
  get isInFinalState(): boolean {
    const finalStates = [TaskStatus.SUCCESS, TaskStatus.FAILED, TaskStatus.CANCELLED];
    return finalStates.includes(this.status);
  }

  /**
   * 检查任务是否可以重试
   */
  get canRetry(): boolean {
    return this.status === TaskStatus.FAILED && this.retryCount < this.maxRetries;
  }

  /**
   * 检查任务是否正在执行
   */
  get isRunning(): boolean {
    return this.status === TaskStatus.RUNNING;
  }

  /**
   * 检查任务是否已暂停
   */
  get isPaused(): boolean {
    return this.status === TaskStatus.PAUSED;
  }

  /**
   * 获取任务状态的中文描述
   */
  get statusDescription(): string {
    const statusMap = {
      [TaskStatus.PENDING]: '等待执行',
      [TaskStatus.RUNNING]: '正在执行',
      [TaskStatus.SUCCESS]: '执行成功',
      [TaskStatus.FAILED]: '执行失败',
      [TaskStatus.PAUSED]: '已暂停',
      [TaskStatus.CANCELLED]: '已取消',
    };
    return statusMap[this.status] || '未知状态';
  }

  /**
   * 更新任务进度
   */
  updateProgress(progress: number, message?: string): void {
    this.progress = Math.max(0, Math.min(100, progress));
    this.updatedAt = new Date();
  }

  /**
   * 标记任务开始执行
   */
  markAsStarted(): void {
    this.status = TaskStatus.RUNNING;
    this.startedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 标记任务完成
   */
  markAsCompleted(status: TaskStatus.SUCCESS | TaskStatus.FAILED, result?: Record<string, any>, errorMessage?: string): void {
    this.status = status;
    this.completedAt = new Date();
    this.updatedAt = new Date();
    
    if (result) {
      this.result = result;
    }
    
    if (errorMessage) {
      this.errorMessage = errorMessage;
    }
    
    if (status === TaskStatus.SUCCESS) {
      this.progress = 100;
    }
  }



  /**
   * 增加重试次数
   */
  incrementRetryCount(): void {
    this.retryCount += 1;
    this.updatedAt = new Date();
  }

  /**
   * 重置任务状态（用于重启）
   */
  reset(): void {
    this.status = TaskStatus.PENDING;
    this.startedAt = null;
    this.completedAt = null;
    this.progress = 0;
    this.errorMessage = null;
    this.result = null;
    this.executionUnitId = null;
    this.executionUnitType = null;
    this.updatedAt = new Date();
  }
}