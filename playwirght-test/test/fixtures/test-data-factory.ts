import { CrawlRequest, MediaFileInfo, PageData, CrawlSession } from '../../src/shared/interfaces/crawler.interface';

export function createCrawlRequest(overrides: Partial<CrawlRequest> = {}): CrawlRequest {
  return {
    url: 'https://example.com',
    maxDepth: 2,
    maxPages: 100,
    takeScreenshots: true,
    mediaOptions: {
      downloadImages: true,
      downloadVideos: false,
      downloadAudios: false,
      maxFileSize: 10485760,
      allowedExtensions: ['jpg', 'png', 'gif'],
    },
    ...overrides,
  };
}

export function createMediaFileInfo(overrides: Partial<MediaFileInfo> = {}): MediaFileInfo {
  return {
    url: 'https://example.com/image.jpg',
    type: 'image/jpeg',
    extension: 'jpg',
    fileName: 'image.jpg',
    sourceUrl: 'https://example.com',
    size: 1024,
    downloadedAt: new Date().toISOString(),
    storagePath: '/storage/images/image.jpg',
    md5Hash: 'abc123def456',
    metadata: {
      width: 800,
      height: 600,
      alt: 'Test image',
    },
    ...overrides,
  };
}

export function createPageData(overrides: Partial<PageData> = {}): PageData {
  return {
    url: 'https://example.com',
    title: 'Test Page',
    content: '<html><body>Test content</body></html>',
    metadata: {
      depth: 0,
      parentUrl: null,
      statusCode: 200,
      contentType: 'text/html',
      crawledAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

export function createCrawlSession(overrides: Partial<CrawlSession> = {}): CrawlSession {
  return {
    id: 'test-session-123',
    startUrl: 'https://example.com',
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    totalPages: 10,
    crawledPages: 10,
    failedPages: 0,
    options: {
      maxDepth: 2,
      maxPages: 100,
      takeScreenshots: true,
      mediaOptions: {
        downloadImages: true,
        downloadVideos: false,
        downloadAudios: false,
        maxFileSize: 10485760,
        allowedExtensions: ['jpg', 'png', 'gif'],
      },
    },
    ...overrides,
  };
}

/**
 * 创建模拟HTML内容
 */
export function createMockHtml(options: { title?: string; content?: string } = {}): string {
  const title = options.title || 'Test Page';
  const content = options.content || '<p>Test content</p>';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
</head>
<body>
  ${content}
</body>
</html>
  `.trim();
}

/**
 * 创建模拟错误对象
 */
export function createMockError(message: string = 'Test error', code?: string): Error {
  const error = new Error(message);
  if (code) {
    (error as any).code = code;
  }
  return error;
}

/**
 * 创建模拟Buffer数据
 */
export function createMockBuffer(content: string = 'mock data'): Buffer {
  return Buffer.from(content, 'utf-8');
}