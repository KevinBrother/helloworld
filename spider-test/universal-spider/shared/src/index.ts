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
export type { 
  LoginDto, 
  RegisterDto, 
  CreateTaskDto, 
  UpdateTaskDto, 
  Task, 
  CrawlConfig,
  CreateUserDto,
  UpdateUserDto
} from './types/generated-api.types';

// API 请求类型别名
export type { LoginDto as LoginRequest } from './types/generated-api.types';
export type { RegisterDto as RegisterRequest } from './types/generated-api.types';
export type { CreateUserDto as CreateUserRequest } from './types/generated-api.types';
export type { UpdateUserDto as UpdateUserRequest } from './types/generated-api.types';
export type { CreateTaskDto as CreateTaskRequest } from './types/generated-api.types';
export type { UpdateTaskDto as UpdateTaskRequest } from './types/generated-api.types';

// 查询参数类型（基于通用查询参数）
export interface QueryUsersRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  role?: string;
  isActive?: boolean;
  search?: string;
}

export interface QueryTasksRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
  configId?: number;
  search?: string;
}

export interface QueryConfigsRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  isActive?: boolean;
  search?: string;
}

// 配置相关类型别名
export type CreateConfigRequest = any; // 临时类型，需要根据实际API定义
export type UpdateConfigRequest = any; // 临时类型，需要根据实际API定义