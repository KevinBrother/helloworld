import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ElementInfo {
  tag: string;
  selector: string;
  text?: string;
  attributes: Record<string, string>;
  children: number;
}

export interface FormInfo {
  action: string;
  method: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
}

export interface LinkInfo {
  href: string;
  text: string;
  type: 'internal' | 'external';
}

export class PageAnalysisDto {
  @ApiProperty({ description: '页面URL' })
  url: string;

  @ApiProperty({ description: '页面标题' })
  title: string;

  @ApiPropertyOptional({ description: '页面描述' })
  description?: string;

  @ApiProperty({ description: '页面类型' })
  pageType: 'static' | 'spa' | 'dynamic';

  @ApiProperty({ description: '主要内容元素' })
  mainElements: ElementInfo[];

  @ApiPropertyOptional({ description: '表单信息' })
  forms?: FormInfo[];

  @ApiPropertyOptional({ description: '链接信息' })
  links?: LinkInfo[];

  @ApiPropertyOptional({ description: '图片信息' })
  images?: Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  }>;

  @ApiPropertyOptional({ description: '检测到的反爬虫机制' })
  antiCrawlerMechanisms?: string[];

  @ApiPropertyOptional({ description: '建议的提取规则' })
  suggestedRules?: Array<{
    name: string;
    selector: string;
    type: string;
    confidence: number;
  }>;

  @ApiProperty({ description: '分析时间戳' })
  timestamp: Date;

  @ApiProperty({ description: '分析耗时（毫秒）' })
  analysisTime: number;
}
