import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsNumber,
} from 'class-validator';

export interface ExtractionRule {
  name: string;
  selector: string;
  attribute?: string;
  type: 'text' | 'html' | 'attribute' | 'link' | 'image';
  multiple?: boolean;
}

export interface AntiDetectionConfig {
  userAgent?: string;
  viewport?: { width: number; height: number };
  delay?: { min: number; max: number };
  proxy?: string;
  headers?: Record<string, string>;
}

export class CrawlRequestDto {
  @ApiProperty({ description: '目标URL' })
  @IsUrl({}, { message: '请提供有效的URL' })
  url: string;

  @ApiPropertyOptional({ description: '数据提取规则', type: 'array' })
  @IsOptional()
  @IsArray()
  extractionRules?: ExtractionRule[];

  @ApiPropertyOptional({
    description: '等待页面加载策略',
    enum: ['load', 'domcontentloaded', 'networkidle'],
  })
  @IsOptional()
  @IsString()
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';

  @ApiPropertyOptional({ description: '等待特定选择器出现' })
  @IsOptional()
  @IsString()
  waitForSelector?: string;

  @ApiPropertyOptional({ description: '超时时间（毫秒）', default: 30000 })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: '是否截图', default: false })
  @IsOptional()
  @IsBoolean()
  takeScreenshot?: boolean;

  @ApiPropertyOptional({ description: '自定义JavaScript脚本' })
  @IsOptional()
  @IsString()
  customScript?: string;

  @ApiPropertyOptional({ description: '反检测配置' })
  @IsOptional()
  @IsObject()
  antiDetectionConfig?: AntiDetectionConfig;

  @ApiPropertyOptional({ description: '是否发现API接口', default: false })
  @IsOptional()
  @IsBoolean()
  discoverApis?: boolean;

  @ApiPropertyOptional({ description: '是否下载媒体文件', default: false })
  @IsOptional()
  @IsBoolean()
  downloadMedia?: boolean;

  @ApiPropertyOptional({ description: '媒体文件类型过滤器' })
  @IsOptional()
  @IsArray()
  mediaTypes?: string[];
}
