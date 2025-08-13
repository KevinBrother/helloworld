export interface AppConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
  cors: {
    enabled: boolean;
    origins: string[];
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'simple';
  };
}

export interface CrawlerConfig {
  browser: {
    headless: boolean;
    timeout: number;
    userAgent?: string;
    viewport: {
      width: number;
      height: number;
    };
  };
  crawler: {
    maxDepth: number;
    maxPages: number;
    maxConcurrency: number;
    requestDelay: number;
    retryAttempts: number;
    retryDelay: number;
  };
  content: {
    maxContentLength: number;
    excludeSelectors: string[];
    includeSelectors: string[];
  };
}

export interface StorageConfig {
  minio: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    region: string;
  };
  paths: {
    pages: string;
    screenshots: string;
    sessions: string;
  };
}

// 默认配置
export const defaultAppConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3000'),
  environment: (process.env.NODE_ENV as any) || 'development',
  cors: {
    enabled: process.env.CORS_ENABLED === 'true',
    origins: process.env.CORS_ORIGINS?.split(',') || ['*'],
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    format: (process.env.LOG_FORMAT as any) || 'simple',
  },
};

export const defaultCrawlerConfig: CrawlerConfig = {
  browser: {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '60000'),
    userAgent: process.env.BROWSER_USER_AGENT,
    viewport: {
      width: parseInt(process.env.BROWSER_VIEWPORT_WIDTH || '1920'),
      height: parseInt(process.env.BROWSER_VIEWPORT_HEIGHT || '1080'),
    },
  },
  crawler: {
    maxDepth: parseInt(process.env.CRAWLER_MAX_DEPTH || '3'),
    maxPages: parseInt(process.env.CRAWLER_MAX_PAGES || '10'),
    maxConcurrency: parseInt(process.env.CRAWLER_MAX_CONCURRENCY || '1'),
    requestDelay: parseInt(process.env.CRAWLER_REQUEST_DELAY || '1000'),
    retryAttempts: parseInt(process.env.CRAWLER_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.CRAWLER_RETRY_DELAY || '2000'),
  },
  content: {
    maxContentLength: parseInt(process.env.CONTENT_MAX_LENGTH || '1000000'),
    excludeSelectors: process.env.CONTENT_EXCLUDE_SELECTORS?.split(',') || [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      'aside',
      '.advertisement',
      '.ads',
      '.sidebar',
    ],
    includeSelectors: process.env.CONTENT_INCLUDE_SELECTORS?.split(',') || [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '#main',
    ],
  },
};

export const defaultStorageConfig: StorageConfig = {
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucketName: process.env.MINIO_BUCKET_NAME || 'crawler-pages',
    region: process.env.MINIO_REGION || 'us-east-1',
  },
  paths: {
    pages: process.env.STORAGE_PAGES_PATH || 'pages',
    screenshots: process.env.STORAGE_SCREENSHOTS_PATH || 'screenshots',
    sessions: process.env.STORAGE_SESSIONS_PATH || 'sessions',
  },
};