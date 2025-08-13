import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CrawledDataDocument = CrawledData & Document;

@Schema({
  collection: 'crawled_data',
  timestamps: true,
  versionKey: false,
})
export class CrawledData {
  @Prop({ required: true, index: true })
  taskId: number;

  @Prop({ required: true, index: true })
  userId: number;

  @Prop({ required: true, index: true })
  url: string;

  @Prop({ required: false, default: '' })  title: string;

  @Prop({ type: String })
  content: string;

  @Prop({ type: Object })
  metadata: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishDate?: Date;
    language?: string;
    charset?: string;
    contentType?: string;
    responseTime?: number;
    statusCode?: number;
    headers?: Record<string, string>;
  };

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  links: string[];

  @Prop({ type: Object })
  extractedData: Record<string, any>;

  @Prop({ type: Object })
  rawData: {
    html?: string;
    text?: string;
    json?: Record<string, any>;
  };

  @Prop({ default: 0, index: true })
  depth: number;

  @Prop({ index: true })
  parentUrl: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  crawlConfig: {
    userAgent?: string;
    timeout?: number;
    retries?: number;
    method?: string;
    headers?: Record<string, string>;
  };

  @Prop({ type: Object })
  performance: {
    downloadTime?: number;
    parseTime?: number;
    totalTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };

  @Prop({ type: Object })
  errors: {
    message?: string;
    stack?: string;
    code?: string;
    type?: 'network' | 'parsing' | 'timeout' | 'other';
  }[];

  @Prop({ default: false, index: true })
  isProcessed: boolean;

  @Prop({ default: false, index: true })
  isExported: boolean;

  @Prop({ type: String, index: true })
  contentHash: string;

  @Prop({ type: Date, default: Date.now, index: true })
  crawledAt: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CrawledDataSchema = SchemaFactory.createForClass(CrawledData);

// 创建复合索引
CrawledDataSchema.index({ taskId: 1, url: 1 }, { unique: true });
CrawledDataSchema.index({ userId: 1, crawledAt: -1 });
CrawledDataSchema.index({ contentHash: 1 });
CrawledDataSchema.index({ isProcessed: 1, createdAt: 1 });
CrawledDataSchema.index({ tags: 1 });

// 创建文本索引用于全文搜索
CrawledDataSchema.index({
  title: 'text',
  content: 'text',
  'metadata.description': 'text',
  'metadata.keywords': 'text',
});

// TTL索引，30天后自动删除（可配置）
CrawledDataSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);
