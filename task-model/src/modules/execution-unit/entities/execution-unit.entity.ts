import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ExecutionUnitStatus } from '../../../common/enums/task-status.enum';

/**
 * 执行单元实体
 */
@Entity('execution_units')
@Index(['status'])
@Index(['unitType'])
@Index(['lastHeartbeat'])
export class ExecutionUnit {
  @PrimaryColumn({ type: 'varchar', length: 255, comment: '执行单元ID' })
  id: string;

  @Column({ type: 'varchar', length: 100, comment: '执行单元类型' })
  unitType: string;

  @Column({ type: 'varchar', length: 255, comment: '执行单元名称' })
  unitName: string;

  @Column({ 
    type: 'enum', 
    enum: ExecutionUnitStatus, 
    default: ExecutionUnitStatus.AVAILABLE,
    comment: '执行单元状态'
  })
  status: ExecutionUnitStatus;

  @Column({ type: 'int', default: 1, comment: '执行容量' })
  capacity: number;

  @Column({ type: 'int', default: 0, comment: '当前负载' })
  currentLoad: number;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '执行单元端点' })
  endpoint: string;

  @Column({ type: 'json', nullable: true, comment: '执行单元配置' })
  config: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true, comment: '最后心跳时间' })
  lastHeartbeat: Date;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '版本号' })
  version: string;

  @Column({ type: 'text', nullable: true, comment: '描述信息' })
  description: string;

  /**
   * 计算负载率
   */
  get loadRate(): number {
    if (this.capacity === 0) return 0;
    return Math.round((this.currentLoad / this.capacity) * 100);
  }

  /**
   * 检查是否可用
   */
  get isAvailable(): boolean {
    return this.status === ExecutionUnitStatus.AVAILABLE && this.currentLoad < this.capacity;
  }

  /**
   * 检查是否忙碌
   */
  get isBusy(): boolean {
    return this.status === ExecutionUnitStatus.BUSY || this.currentLoad >= this.capacity;
  }

  /**
   * 检查是否离线
   */
  get isOffline(): boolean {
    return this.status === ExecutionUnitStatus.OFFLINE;
  }

  /**
   * 检查心跳是否超时
   */
  isHeartbeatTimeout(timeoutMs: number = 180000): boolean {
    if (!this.lastHeartbeat) return true;
    const now = new Date();
    return (now.getTime() - this.lastHeartbeat.getTime()) > timeoutMs;
  }

  /**
   * 获取状态的中文描述
   */
  get statusDescription(): string {
    const statusMap = {
      [ExecutionUnitStatus.AVAILABLE]: '可用',
      [ExecutionUnitStatus.BUSY]: '忙碌',
      [ExecutionUnitStatus.OFFLINE]: '离线',
    };
    return statusMap[this.status] || '未知状态';
  }

  /**
   * 更新心跳
   */
  updateHeartbeat(currentLoad?: number, metadata?: Record<string, any>): void {
    this.lastHeartbeat = new Date();
    this.updatedAt = new Date();
    
    if (currentLoad !== undefined) {
      this.currentLoad = Math.max(0, Math.min(this.capacity, currentLoad));
    }
    
    // 根据负载自动更新状态
    if (this.currentLoad >= this.capacity) {
      this.status = ExecutionUnitStatus.BUSY;
    } else if (this.status === ExecutionUnitStatus.BUSY && this.currentLoad < this.capacity) {
      this.status = ExecutionUnitStatus.AVAILABLE;
    }
    
    // 合并元数据到配置中
    if (metadata) {
      this.config = { ...this.config, ...metadata };
    }
  }

  /**
   * 分配任务（增加负载）
   */
  allocateTask(): boolean {
    if (!this.isAvailable) {
      return false;
    }
    
    this.currentLoad += 1;
    this.updatedAt = new Date();
    
    if (this.currentLoad >= this.capacity) {
      this.status = ExecutionUnitStatus.BUSY;
    }
    
    return true;
  }

  /**
   * 释放任务（减少负载）
   */
  releaseTask(): void {
    if (this.currentLoad > 0) {
      this.currentLoad -= 1;
      this.updatedAt = new Date();
      
      if (this.currentLoad < this.capacity && this.status === ExecutionUnitStatus.BUSY) {
        this.status = ExecutionUnitStatus.AVAILABLE;
      }
    }
  }

  /**
   * 标记为离线
   */
  markAsOffline(): void {
    this.status = ExecutionUnitStatus.OFFLINE;
    this.updatedAt = new Date();
  }

  /**
   * 标记为在线
   */
  markAsOnline(): void {
    if (this.currentLoad >= this.capacity) {
      this.status = ExecutionUnitStatus.BUSY;
    } else {
      this.status = ExecutionUnitStatus.AVAILABLE;
    }
    this.lastHeartbeat = new Date();
    this.updatedAt = new Date();
  }

  /**
   * 重置负载
   */
  resetLoad(): void {
    this.currentLoad = 0;
    this.status = ExecutionUnitStatus.AVAILABLE;
    this.updatedAt = new Date();
  }

  /**
   * 获取剩余容量
   */
  get remainingCapacity(): number {
    return Math.max(0, this.capacity - this.currentLoad);
  }

  /**
   * 检查是否支持指定的任务类型
   */
  supportsTaskType(taskType: string): boolean {
    // 简单的类型匹配，可以根据需要扩展
    return this.unitType === taskType || 
           this.unitType === 'UNIVERSAL' || 
           (this.config?.supportedTaskTypes && this.config.supportedTaskTypes.includes(taskType));
  }
}