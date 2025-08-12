// 导出基础类型定义
export * from './types/user.types';
export * from './types/monitoring.types';
export * from './types/common.types';

// 导出生成的 API 类型（包含完整的 DTO 定义）
export * from './types/generated-api.types';

// 常用类型别名
export type { User as UserType } from './types/user.types';
export type { SystemStats as StatsType } from './types/monitoring.types';
export type { ApiResponse as ResponseType } from './types/common.types';
export type { PaginatedResponse as PaginatedType } from './types/common.types';

// 从生成的 API 类型中导出常用别名
export type { LoginDto, RegisterDto, CreateTaskDto, UpdateTaskDto, Task, CrawlConfig } from './types/generated-api.types';