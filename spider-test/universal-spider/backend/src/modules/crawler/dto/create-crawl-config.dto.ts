import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CrawlMethod, BrowserType } from '../../../entities/mysql/crawl-config.entity';

export class CreateCrawlConfigDto {
  @ApiProperty({ description: '配置名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '配置描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '起始URL' })
  @IsString()
  startUrl: string;

  @ApiPropertyOptional({ description: '允许的域名列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({ description: '禁止的域名列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deniedDomains?: string[];

  @ApiPropertyOptional({ description: 'URL模式列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  urlPatterns?: string[];

  @ApiPropertyOptional({ description: '最大爬取深度', default: 1 })
  @IsOptional()
  @IsNumber()
  maxDepth?: number;

  @ApiPropertyOptional({ description: '最大页面数', default: 1000 })
  @IsOptional()
  @IsNumber()
  maxPages?: number;

  @ApiPropertyOptional({ description: '请求延迟(毫秒)', default: 1000 })
  @IsOptional()
  @IsNumber()
  requestDelay?: number;

  @ApiPropertyOptional({ description: '请求超时(毫秒)', default: 30000 })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: '重试次数', default: 3 })
  @IsOptional()
  @IsNumber()
  retries?: number;

  @ApiPropertyOptional({ description: 'HTTP方法', enum: CrawlMethod, default: CrawlMethod.GET })
  @IsOptional()
  @IsEnum(CrawlMethod)
  method?: CrawlMethod;

  @ApiPropertyOptional({ description: '请求头' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Cookies' })
  @IsOptional()
  @IsObject()
  cookies?: Record<string, string>;

  @ApiPropertyOptional({ description: '用户代理' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: '是否使用代理', default: false })
  @IsOptional()
  @IsBoolean()
  useProxy?: boolean;

  @ApiPropertyOptional({ description: '代理配置' })
  @IsOptional()
  @IsObject()
  proxyConfig?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };

  @ApiPropertyOptional({ description: '是否启用JavaScript', default: true })
  @IsOptional()
  @IsBoolean()
  enableJavaScript?: boolean;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsNumber()
  userId?: number;
}