import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Task } from './task.entity';

/**
 * 任务状态历史实体
 */
@Entity('task_status_history')
@Index(['taskId'])
@Index(['changedAt'])
@Index(['toStatus'])
export class TaskStatusHistory {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '历史记录ID' })
  id: number;

  @Column({ type: 'bigint', comment: '任务ID' })
  taskId: number;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '原状态' })
  fromStatus: string;

  @Column({ type: 'varchar', length: 50, comment: '目标状态' })
  toStatus: string;

  @CreateDateColumn({ comment: '状态变更时间' })
  changedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '变更操作者' })
  changedBy: string;

  @Column({ type: 'text', nullable: true, comment: '变更原因' })
  reason: string;

  @Column({ type: 'json', nullable: true, comment: '附加数据' })
  additionalData: Record<string, any>;

  // 关联关系
  @ManyToOne(() => Task, task => task.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  /**
   * 获取状态变更的中文描述
   */
  get changeDescription(): string {
    const statusMap = {
      'PENDING': '等待执行',
      'RUNNING': '正在执行',
      'SUCCESS': '执行成功',
      'FAILED': '执行失败',
      'PAUSED': '已暂停',
      'CANCELLED': '已取消',
    };
    
    const fromDesc = this.fromStatus ? statusMap[this.fromStatus] || this.fromStatus : '初始状态';
    const toDesc = statusMap[this.toStatus] || this.toStatus;
    
    return `从 ${fromDesc} 变更为 ${toDesc}`;
  }

  /**
   * 创建状态历史记录
   */
  static create(
    taskId: number,
    fromStatus: string | null,
    toStatus: string,
    changedBy?: string,
    reason?: string,
    additionalData?: Record<string, any>
  ): TaskStatusHistory {
    const history = new TaskStatusHistory();
    history.taskId = taskId;
    history.fromStatus = fromStatus;
    history.toStatus = toStatus;
    history.changedBy = changedBy;
    history.reason = reason;
    history.additionalData = additionalData;
    return history;
  }
}