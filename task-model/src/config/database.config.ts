import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Task } from '../modules/task/entities/task.entity';
import { TaskStatusHistory } from '../modules/task/entities/task-status-history.entity';
import { ExecutionUnit } from '../modules/execution-unit/entities/execution-unit.entity';
import { TaskExecutionLog } from '../modules/task/entities/task-execution-log.entity';

/**
 * 数据库配置工厂函数
 */
export const databaseConfigFactory = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 3306),
  username: configService.get<string>('DB_USERNAME', 'taskmanager'),
  password: configService.get<string>('DB_PASSWORD', 'password'),
  database: configService.get<string>('DB_DATABASE', 'task_management'),
  entities: [Task, TaskStatusHistory, ExecutionUnit, TaskExecutionLog],
  synchronize: configService.get<string>('NODE_ENV') === 'development',
  logging: configService.get<string>('NODE_ENV') === 'development',
  timezone: '+08:00',
  charset: 'utf8mb4',
  extra: {
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
  },
});

/**
 * TypeORM DataSource 配置（用于迁移等CLI操作）
 */
export const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'taskmanager',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'task_management',
  entities: [Task, TaskStatusHistory, ExecutionUnit, TaskExecutionLog],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  timezone: '+08:00',
  charset: 'utf8mb4',
});

export default dataSource;