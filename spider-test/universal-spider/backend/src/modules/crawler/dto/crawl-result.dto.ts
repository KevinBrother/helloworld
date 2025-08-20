import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface PageInfo {
  title: string;
  description?: string;
  keywords?: string[];
  url: string;
  statusCode: number;
  contentType: string;
  size: number;
  loadTime: number;
}

export interface ExtractedData {
  [key: string]: unknown;
  
  // 基础字段
  taskId?: string | number;
  userId?: string | number;
  url?: string;
  title?: string;
  content?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  publishDate?: string | Date;
  language?: string;
  
  // 元数据
  metadata?: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishDate?: string | Date;
    language?: string;
    charset?: string;
    contentType?: string;
    statusCode?: number;
    responseTime?: number;
    headers?: Record<string, unknown>;
    [key: string]: unknown;
  };
  
  // 媒体和链接
  images?: Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    size?: number;
  }>;
  
  links?: Array<{
    href: string;
    text?: string;
    title?: string;
    rel?: string;
    target?: string;
  }>;
  
  // 结构化数据
  structuredData?: Array<{
    type: string;
    data: Record<string, unknown>;
  }>;
  
  // Open Graph数据
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
    [key: string]: unknown;
  };
  
  // Twitter Card数据
  twitterCard?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    creator?: string;
    site?: string;
    [key: string]: unknown;
  };
  
  // 原始数据
  rawData?: {
    html?: string;
    text?: string;
    json?: unknown;
    [key: string]: unknown;
  };
  
  // 爬虫相关
  depth?: number;
  parentUrl?: string;
  tags?: string[];
  crawlConfig?: Record<string, unknown>;
  
  // 性能数据
  performance?: {
    loadTime?: number;
    domContentLoaded?: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
    transferSize?: number;
    encodedBodySize?: number;
    decodedBodySize?: number;
    extractionTime?: number;
    [key: string]: unknown;
  };
  
  // 状态和错误
  errors?: Array<{
    type: string;
    message: string;
    stack?: string;
    timestamp?: Date;
  }>;
  
  isProcessed?: boolean;
  isExported?: boolean;
  contentHash?: string;
  crawledAt?: string | Date;
  extractionTime?: number;
}

export class CrawlResultDto {
  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '目标URL' })
  url: string;

  @ApiPropertyOptional({ description: '提取的数据' })
  data?: ExtractedData;

  @ApiPropertyOptional({ description: '页面信息' })
  pageInfo?: PageInfo;

  @ApiPropertyOptional({ description: '截图（Base64编码）' })
  screenshot?: string;

  @ApiPropertyOptional({ description: '错误信息' })
  error?: string;

  @ApiProperty({ description: '执行时间戳' })
  timestamp: Date;

  @ApiProperty({ description: '执行耗时（毫秒）' })
  executionTime: number;

  @ApiPropertyOptional({ description: '发现的API接口' })
  discoveredApis?: Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    params: Record<string, unknown>;
    response: Record<string, unknown>;
  }>;

  @ApiPropertyOptional({ description: '下载的媒体文件' })
  mediaFiles?: Array<{
    url: string;
    type: string;
    size: number;
    localPath?: string;
  }>;
}
