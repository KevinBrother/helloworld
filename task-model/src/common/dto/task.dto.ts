import { IsString, IsOptional, IsNumber, IsEnum, IsObject, IsBoolean, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, TaskStatus, TaskOperation } from '../enums/task-status.enum';

/**
 * 创建任务DTO
 */
export class CreateTaskDto {
  @ApiProperty({ description: '任务名称', example: '数据处理任务' })
  @IsString()
  taskName: string;

  @ApiProperty({ description: '任务类型', enum: TaskType, example: TaskType.DATA_PROCESSING })
  @IsEnum(TaskType)
  taskType: TaskType;

  @ApiPropertyOptional({ description: '任务优先级', example: 1, minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  priority?: number = 0;

  @ApiProperty({ description: '任务配置参数', example: { inputPath: '/data/input', outputPath: '/data/output' } })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: '最大重试次数', example: 3, minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number = 3;
}

/**
 * 更新任务DTO
 */
export class UpdateTaskDto {
  @ApiPropertyOptional({ description: '任务名称' })
  @IsOptional()
  @IsString()
  taskName?: string;

  @ApiPropertyOptional({ description: '任务优先级', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: '任务配置参数' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '最大重试次数', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;
}

/**
 * 任务查询DTO
 */
export class TaskQueryDto {
  @ApiPropertyOptional({ description: '任务状态', enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: '任务类型', enum: TaskType })
  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @ApiPropertyOptional({ description: '任务优先级', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: '执行单元ID' })
  @IsOptional()
  @IsString()
  executionUnitId?: string;

  @ApiPropertyOptional({ description: '页码', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '排序字段', example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: '排序方向', enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: '创建时间起始', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: '创建时间结束', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}

/**
 * 任务操作DTO
 */
export class TaskOperationDto {
  @ApiProperty({ description: '操作类型', enum: TaskOperation })
  @IsEnum(TaskOperation)
  operation: TaskOperation;

  @ApiPropertyOptional({ description: '操作原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '操作者' })
  @IsOptional()
  @IsString()
  operatedBy?: string;
}

/**
 * 任务状态更新DTO
 */
export class UpdateTaskStatusDto {
  @ApiProperty({ description: '新状态', enum: TaskStatus })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiPropertyOptional({ description: '进度百分比', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ description: '状态消息' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: '错误信息' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ description: '执行结果' })
  @IsOptional()
  @IsObject()
  result?: Record<string, any>;

  @ApiPropertyOptional({ description: '检查点数据' })
  @IsOptional()
  @IsObject()
  checkpoint?: Record<string, any>;

  @ApiPropertyOptional({ description: '变更原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '操作人' })
  @IsOptional()
  @IsString()
  changedBy?: string;
}

/**
 * 注册执行单元DTO
 */
export class RegisterExecutionUnitDto {
  @ApiProperty({ description: '执行单元ID', example: 'data-processor-1' })
  @IsString()
  id: string;

  @ApiProperty({ description: '执行单元类型', example: 'DATA_PROCESSING' })
  @IsString()
  unitType: string;

  @ApiProperty({ description: '执行单元名称', example: '数据处理器1' })
  @IsString()
  unitName: string;

  @ApiPropertyOptional({ description: '执行容量', example: 3, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number = 1;

  @ApiPropertyOptional({ description: '执行单元端点', example: 'http://processor:8080' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ description: '执行单元配置' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '版本号', example: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: '描述信息' })
  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * 执行单元心跳DTO
 */
export class ExecutionUnitHeartbeatDto {
  @ApiPropertyOptional({ description: '当前负载', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentLoad?: number;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * 任务执行日志DTO
 */
export class CreateTaskLogDto {
  @ApiProperty({ description: '任务ID' })
  @IsNumber()
  taskId: number;

  @ApiPropertyOptional({ description: '执行单元ID' })
  @IsOptional()
  @IsString()
  executionUnitId?: string;

  @ApiProperty({ description: '日志级别', enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'] })
  @IsEnum(['DEBUG', 'INFO', 'WARN', 'ERROR'])
  logLevel: string;

  @ApiProperty({ description: '日志消息' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: '元数据' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * API响应DTO
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiPropertyOptional({ description: '响应数据' })
  data?: T;

  @ApiPropertyOptional({ description: '响应消息' })
  message?: string;

  @ApiPropertyOptional({ description: '错误信息' })
  error?: string;

  @ApiProperty({ description: '响应时间戳' })
  timestamp: Date;

  constructor(success: boolean, data?: T, message?: string, error?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.timestamp = new Date();
  }

  static success<T>(data?: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto(true, data, message);
  }

  static error(error: string, message?: string): ApiResponseDto {
    return new ApiResponseDto(false, undefined, message, error);
  }
}

/**
 * 分页响应DTO
 */
export class PaginationResponseDto<T> {
  @ApiProperty({ description: '数据列表' })
  data: T[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}