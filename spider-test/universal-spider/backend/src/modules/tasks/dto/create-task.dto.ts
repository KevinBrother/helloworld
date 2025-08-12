import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
  IsNumber,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType } from '../../../entities/mysql/task.entity';

export enum ScheduleType {
  ONCE = 'once',
  CRON = 'cron',
  INTERVAL = 'interval',
}

export class CrawlerConfigDto {
  @ApiProperty({ description: '目标URL' })
  @IsUrl({}, { message: '请输入有效的URL' })
  @IsNotEmpty({ message: 'URL不能为空' })
  url: string;

  @ApiPropertyOptional({ description: '数据提取规则' })
  @IsOptional()
  @IsObject()
  extractRules?: Record<string, any>;

  @ApiPropertyOptional({ description: '等待策略' })
  @IsOptional()
  @IsObject()
  waitStrategy?: {
    type: 'time' | 'element' | 'network';
    value: string | number;
  };

  @ApiPropertyOptional({ description: '超时时间(毫秒)', default: 30000 })
  @IsOptional()
  @IsNumber({}, { message: '超时时间必须是数字' })
  timeout?: number;

  @ApiPropertyOptional({ description: '是否截图', default: false })
  @IsOptional()
  @IsBoolean()
  screenshot?: boolean;

  @ApiPropertyOptional({ description: '自定义脚本' })
  @IsOptional()
  @IsString()
  customScript?: string;

  @ApiPropertyOptional({ description: '反检测配置' })
  @IsOptional()
  @IsObject()
  antiDetection?: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    headers?: Record<string, string>;
    proxy?: string;
  };

  @ApiPropertyOptional({ description: '是否发现API', default: false })
  @IsOptional()
  @IsBoolean()
  discoverApis?: boolean;

  @ApiPropertyOptional({ description: '是否下载媒体文件', default: false })
  @IsOptional()
  @IsBoolean()
  downloadMedia?: boolean;
}

export class ScheduleConfigDto {
  @ApiPropertyOptional({ description: 'Cron表达式' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ description: '间隔时间(毫秒)' })
  @IsOptional()
  @IsNumber()
  interval?: number;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  startTime?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  endTime?: Date;

  @ApiPropertyOptional({ description: '最大执行次数' })
  @IsOptional()
  @IsNumber()
  maxExecutions?: number;
}

export class CreateTaskDto {
  @ApiProperty({ description: '任务名称' })
  @IsString({ message: '任务名称必须是字符串' })
  @IsNotEmpty({ message: '任务名称不能为空' })
  name: string;

  @ApiPropertyOptional({ description: '任务描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '任务类型', enum: TaskType })
  @IsEnum(TaskType, { message: '无效的任务类型' })
  type: TaskType;

  @ApiProperty({ description: '爬虫配置' })
  @ValidateNested()
  @Type(() => CrawlerConfigDto)
  config: CrawlerConfigDto;

  @ApiPropertyOptional({ description: '调度类型', enum: ScheduleType })
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @ApiPropertyOptional({ description: '调度配置' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  scheduleConfig?: ScheduleConfigDto;

  @ApiPropertyOptional({ description: '是否立即执行', default: false })
  @IsOptional()
  @IsBoolean()
  executeImmediately?: boolean;

  @ApiPropertyOptional({ description: '优先级', default: 5 })
  @IsOptional()
  @IsNumber({}, { message: '优先级必须是数字' })
  priority?: number;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsNumber()
  userId?: number;
}
