import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum TaskType {
  SINGLE_PAGE = 'single_page',
  MULTI_PAGE = 'multi_page',
  SITEMAP = 'sitemap',
  API = 'api',
}

@Entity('tasks')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.SINGLE_PAGE,
  })
  type: TaskType;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({ type: 'json' })
  config: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  totalPages: number;

  @Column({ type: 'int', default: 0 })
  completedPages: number;

  @Column({ type: 'int', default: 0 })
  failedPages: number;

  @Column({ type: 'int', default: 0 })
  totalItems: number;

  @Column({ type: 'int', default: 0 })
  successItems: number;

  @Column({ type: 'int', default: 0 })
  failedItems: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<Task>) {
    Object.assign(this, partial);
  }

  get progress(): number {
    if (this.totalPages === 0) return 0;
    return Math.round((this.completedPages / this.totalPages) * 100);
  }

  get isCompleted(): boolean {
    return this.status === TaskStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === TaskStatus.FAILED;
  }

  get isRunning(): boolean {
    return this.status === TaskStatus.RUNNING;
  }
}