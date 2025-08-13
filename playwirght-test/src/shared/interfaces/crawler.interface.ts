export interface PageData {
  url: string;
  title?: string;
  content: string;
  metadata: {
    depth: number;
    parentUrl?: string;
    crawledAt: string;
    contentType?: string;
    statusCode?: number;
    [key: string]: any;
  };
}

export interface CrawlRequest {
  startUrl: string;
  maxDepth?: number;
  maxPages?: number;
  takeScreenshots?: boolean;
  userAgent?: string;
  allowedDomains?: string[];
  excludePatterns?: string[];
}

export interface CrawlResponse {
  sessionId: string;
  status: 'started' | 'completed' | 'failed';
  message: string;
  pagesProcessed?: number;
  totalPages?: number;
  errors?: string[];
}

export interface CrawlSession {
  sessionId: string;
  startUrl: string;
  maxDepth: number;
  maxPages: number;
  takeScreenshots: boolean;
  userAgent?: string;
  allowedDomains: string[];
  excludePatterns: string[];
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  pagesProcessed: number;
  totalPages: number;
  errors: string[];
}

export interface LinkInfo {
  url: string;
  depth: number;
  parentUrl?: string;
  discovered: boolean;
  processed: boolean;
}