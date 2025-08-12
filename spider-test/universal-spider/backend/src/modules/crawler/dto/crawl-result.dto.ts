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
