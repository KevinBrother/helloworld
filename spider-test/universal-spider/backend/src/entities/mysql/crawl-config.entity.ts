import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum CrawlMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export enum BrowserType {
  CHROMIUM = 'chromium',
  FIREFOX = 'firefox',
  WEBKIT = 'webkit',
}

@Entity('crawl_configs')
@Index(['userId'])
@Index(['name'])
export class CrawlConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  startUrl: string;

  @Column({ type: 'json', nullable: true })
  allowedDomains: string[];

  @Column({ type: 'json', nullable: true })
  deniedDomains: string[];

  @Column({ type: 'json', nullable: true })
  urlPatterns: string[];

  @Column({ type: 'int', default: 1 })
  maxDepth: number;

  @Column({ type: 'int', default: 1000 })
  maxPages: number;

  @Column({ type: 'int', default: 1000 })
  requestDelay: number; // 毫秒

  @Column({ type: 'int', default: 30000 })
  timeout: number; // 毫秒

  @Column({ type: 'int', default: 3 })
  retries: number;

  @Column({
    type: 'enum',
    enum: CrawlMethod,
    default: CrawlMethod.GET,
  })
  method: CrawlMethod;

  @Column({ type: 'json', nullable: true })
  headers: Record<string, string>;

  @Column({ type: 'json', nullable: true })
  cookies: Record<string, string>;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'boolean', default: false })
  useProxy: boolean;

  @Column({ type: 'json', nullable: true })
  proxyConfig: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };

  @Column({ type: 'boolean', default: true })
  enableJavaScript: boolean;

  @Column({ type: 'boolean', default: false })
  loadImages: boolean;

  @Column({ type: 'boolean', default: false })
  loadCSS: boolean;

  @Column({
    type: 'enum',
    enum: BrowserType,
    default: BrowserType.CHROMIUM,
  })
  browserType: BrowserType;

  @Column({ type: 'json', nullable: true })
  selectors: {
    title?: string;
    content?: string;
    links?: string;
    images?: string;
    custom?: Record<string, string>;
  };

  @Column({ type: 'json', nullable: true })
  dataProcessing: {
    removeHtml?: boolean;
    trimWhitespace?: boolean;
    convertToMarkdown?: boolean;
    extractEmails?: boolean;
    extractPhones?: boolean;
    customRegex?: Array<{
      name: string;
      pattern: string;
      flags?: string;
    }>;
  };

  @Column({ type: 'boolean', default: true })
  respectRobotsTxt: boolean;

  @Column({ type: 'boolean', default: false })
  followRedirects: boolean;

  @Column({ type: 'boolean', default: true })
  deduplication: boolean;

  @Column({ type: 'json', nullable: true })
  outputFormat: {
    type: 'json' | 'csv' | 'xml' | 'txt';
    fields?: string[];
    filename?: string;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(partial: Partial<CrawlConfig>) {
    Object.assign(this, partial);
  }
}