# Crawlee 功能实现清单

## 项目目标

使用 TypeScript + Crawlee + Playwright + pnpm + Vitest，通过TDD方式全面体验Crawlee的核心功能和高级特性。

**🔬 纯测试驱动开发模式：所有功能点通过 Vitest 测试用例实现和验证，无需实际项目代码实现。**

## 核心模块功能清单

### 1. 基础爬虫功能 (Core)

- [ ] 基本页面请求和响应处理

```typescript
import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
    requestHandler: async ({ request, $ }) => {
        // 处理页面内容
        const title = $('title').text();
    }
});
```

- [ ] HTML内容提取和解析

```typescript
requestHandler: async ({ page, request }) => {
    const data = {
        title: $('h1').text(),
        description: $('.description').text(),
        links: $('a').map((_, el) => $(el).attr('href')).get()
    };
}
```

- [ ] 链接发现和跟踪

```typescript
import { enqueueLinks } from 'crawlee';

requestHandler: async ({ $, enqueueLinks, request }) => {
    await enqueueLinks({
        selector: 'a[href]',
        baseUrl: request.loadedUrl,
    });
}
```

- [ ] 请求队列管理

```typescript
import { RequestQueue } from 'crawlee';

const requestQueue = await RequestQueue.open();
await requestQueue.addRequest({
    url: 'https://example.com',
    userData: { category: 'product' }
});
```

- [ ] 数据存储（JSON/CSV格式）

```typescript
import { Dataset } from 'crawlee';

const dataset = await Dataset.open();
await dataset.pushData({
    title: 'Product Name',
    price: '$99.99',
    url: request.loadedUrl
});
```

### 2. 浏览器自动化 (Playwright Integration)

- [ ] 无头浏览器页面操作

```typescript
import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: { headless: true }
    },
    requestHandler: async ({ page, request }) => {
        await page.waitForLoadState('networkidle');
        const title = await page.title();
    }
});
```

- [ ] JavaScript渲染页面处理

```typescript
requestHandler: async ({ page }) => {
    // 等待JavaScript加载完成
    await page.waitForSelector('.dynamic-content');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    const content = await page.textContent('.loaded-content');
}
```

- [ ] 表单填写和提交

```typescript
requestHandler: async ({ page }) => {
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
}
```

- [ ] 页面截图功能

```typescript
import { Dataset } from 'crawlee';

requestHandler: async ({ page, request }) => {
    const screenshot = await page.screenshot({ 
        fullPage: true,
        type: 'png'
    });
    
    await Dataset.pushData({
        url: request.loadedUrl,
        screenshot: screenshot.toString('base64')
    });
}
```

- [ ] Cookie和会话管理

```typescript
const crawler = new PlaywrightCrawler({
    persistCookiesPerSession: true,
    sessionPoolOptions: {
        maxPoolSize: 10,
        sessionOptions: {
            maxUsageCount: 50,
        }
    },
    preNavigationHooks: [
        async ({ page, session }) => {
            await page.context().addCookies(session.getCookies());
        }
    ]
});
```

### 3. 并发和性能优化

- [ ] 并发请求控制

```typescript
const crawler = new PlaywrightCrawler({
    maxConcurrency: 5,
    maxRequestsPerCrawl: 1000,
    maxRequestsPerMinute: 120,
    requestHandler: async ({ request, page }) => {
        // 处理逻辑
    }
});
```

- [ ] 请求限流和速率控制

```typescript
import { AutoscaledPool } from 'crawlee';

const pool = new AutoscaledPool({
    minConcurrency: 1,
    maxConcurrency: 10,
    desiredConcurrency: 5,
    scaleUpStepRatio: 0.1,
    scaleDownStepRatio: 0.05
});
```

- [ ] 内存使用优化

```typescript
const crawler = new PlaywrightCrawler({
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,
    navigationTimeoutSecs: 30,
    memoryMbytes: 1024,
    systemInfoIntervalSecs: 10
});
```

- [ ] 错误重试机制

```typescript
import { Configuration } from 'crawlee';

Configuration.getGlobalConfig().set('defaultRequestOptions', {
    retryOnBlocked: true,
    maxRetries: 5,
    retryOnFailure: true,
    retryDelayRange: [1000, 5000]
});
```

- [ ] 请求缓存策略

```typescript
const crawler = new PlaywrightCrawler({
    useSessionPool: true,
    sessionPoolOptions: {
        maxPoolSize: 100,
        sessionOptions: {
            maxUsageCount: 20,
            maxErrorScore: 3
        }
    }
});
```

- [ ] URL去重机制

```typescript
import { RequestQueue } from 'crawlee';

const crawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request, enqueueLinks }) => {
        // Crawlee 自动处理 URL 去重
        await enqueueLinks({
            selector: 'a[href]',
            baseUrl: request.loadedUrl,
            // 相同的URL不会被重复添加到队列
        });
        
        // 手动检查是否已处理过该URL
        const queue = await RequestQueue.open();
        const isHandled = await queue.isFinished();
        
        console.log(`URL ${request.url} handled: ${isHandled}`);
    }
});
```

- [ ] 页面内容缓存复用

```typescript
import { KeyValueStore } from 'crawlee';

const crawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request }) => {
        const cacheKey = `page-${Buffer.from(request.url).toString('base64')}`;
        const cache = await KeyValueStore.open('page-cache');
        
        // 检查缓存
        const cachedContent = await cache.getValue(cacheKey);
        
        if (cachedContent && !isExpired(cachedContent.timestamp)) {
            console.log(`Using cached content for ${request.url}`);
            await Dataset.pushData(cachedContent.data);
            return;
        }
        
        // 获取新内容
        const content = await page.textContent('body');
        const data = { url: request.url, content, timestamp: new Date().toISOString() };
        
        // 缓存内容（24小时有效期）
        await cache.setValue(cacheKey, {
            data,
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
        
        await Dataset.pushData(data);
    }
});

const isExpired = (timestamp: string) => {
    const expireTime = new Date(timestamp).getTime() + (24 * 60 * 60 * 1000); // 24小时
    return Date.now() > expireTime;
};
```

- [ ] 请求指纹去重

```typescript
import { createHash } from 'crypto';

const crawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request }) => {
        // 创建请求指纹（基于URL和关键参数）
        const requestFingerprint = createHash('md5')
            .update(`${request.url}-${JSON.stringify(request.userData)}`)
            .digest('hex');
            
        const fingerprintStore = await KeyValueStore.open('request-fingerprints');
        const existingFingerprint = await fingerprintStore.getValue(requestFingerprint);
        
        if (existingFingerprint) {
            console.log(`Duplicate request detected: ${request.url}`);
            return; // 跳过重复请求
        }
        
        // 标记该请求已处理
        await fingerprintStore.setValue(requestFingerprint, {
            url: request.url,
            processedAt: new Date().toISOString()
        });
        
        // 处理页面内容
        const content = await page.textContent('body');
        await Dataset.pushData({ url: request.url, content });
    }
});
```

### 4. 反检测机制

- [ ] User-Agent轮换

```typescript
const crawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: {
            args: [
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    preNavigationHooks: [
        async ({ page }) => {
            await page.setUserAgent('Custom User Agent');
        }
    ]
});
```

- [ ] 代理服务器支持

```typescript
import { ProxyConfiguration } from 'crawlee';

const proxyConfiguration = new ProxyConfiguration({
    proxyUrls: [
        'http://proxy1.example.com:8080',
        'http://proxy2.example.com:8080'
    ],
    newUrlFunction: ({ sessionId }) => {
        return `http://session-${sessionId}:password@proxy.example.com:8080`;
    }
});

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    sessionPoolOptions: { maxPoolSize: 50 }
});
```

- [ ] 请求间隔随机化

```typescript
import { sleep } from 'crawlee';

const crawler = new PlaywrightCrawler({
    requestHandler: async ({ request, page }) => {
        // 随机延时 1-3 秒
        await sleep(Math.random() * 2000 + 1000);
        
        // 处理页面内容
    },
    minConcurrency: 1,
    maxConcurrency: 1 // 单线程确保间隔
});
```

- [ ] 浏览器指纹伪装

```typescript
const crawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: {
            viewport: { width: 1920, height: 1080 },
            locale: 'en-US',
            timezoneId: 'America/New_York'
        }
    },
    preNavigationHooks: [
        async ({ page }) => {
            // 伪装浏览器特征
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            });
        }
    ]
});
```

- [ ] 验证码处理策略

```typescript
requestHandler: async ({ page, request }) => {
    try {
        // 检测验证码
        const captcha = await page.locator('.captcha-container');
        if (await captcha.isVisible()) {
            // 添加到特殊队列或标记为需要人工处理
            await Dataset.pushData({
                url: request.loadedUrl,
                status: 'captcha_detected',
                timestamp: new Date().toISOString()
            });
            throw new Error('Captcha detected, skipping');
        }
    } catch (error) {
        // 处理验证码相关错误
    }
}
```

### 5. 数据处理和存储

- [ ] 结构化数据提取

```typescript
import { Dataset } from 'crawlee';

requestHandler: async ({ page, request }) => {
    const products = [];
    $('.product-item').each((_, element) => {
        const $el = $(element);
        products.push({
            title: $el.find('.product-title').text().trim(),
            price: parseFloat($el.find('.price').text().replace(/[^\d.]/g, '')),
            rating: parseFloat($el.find('.rating').attr('data-rating') || '0'),
            availability: $el.find('.stock').hasClass('in-stock'),
            imageUrl: $el.find('img').attr('src'),
            productUrl: new URL($el.find('a').attr('href'), request.loadedUrl).href
        });
    });
    
    await Dataset.pushData(products);
}
```

- [ ] 数据清洗和格式化

```typescript
const cleanData = (rawData: any) => {
    return {
        title: rawData.title?.trim().replace(/\s+/g, ' ') || '',
        price: typeof rawData.price === 'string' 
            ? parseFloat(rawData.price.replace(/[^\d.]/g, '')) || 0
            : rawData.price || 0,
        description: rawData.description?.replace(/\n+/g, ' ').trim() || '',
        tags: Array.isArray(rawData.tags) 
            ? rawData.tags.filter(Boolean).map(tag => tag.trim())
            : [],
        crawledAt: new Date().toISOString()
    };
};
```

- [ ] 增量爬取支持

```typescript
import { KeyValueStore } from 'crawlee';

const store = await KeyValueStore.open();
const lastCrawlDate = await store.getValue<string>('last_crawl_date');

requestHandler: async ({ request, $ }) => {
    const itemDate = $('.publish-date').attr('datetime');
    
    // 只处理新内容
    if (lastCrawlDate && new Date(itemDate) <= new Date(lastCrawlDate)) {
        console.log('Skipping old content');
        return;
    }
    
    // 处理新内容...
    
    // 更新最后爬取时间
    await store.setValue('last_crawl_date', new Date().toISOString());
}
```

- [ ] 数据去重机制

```typescript
import { createHash } from 'crypto';

const generateContentHash = (data: any): string => {
    const content = `${data.title}-${data.url}`;
    return createHash('md5').update(content).digest('hex');
};

const processedHashes = new Set<string>();

requestHandler: async ({ request, $ }) => {
    const data = extractData($);
    const hash = generateContentHash(data);
    
    if (processedHashes.has(hash)) {
        console.log('Duplicate content detected, skipping');
        return;
    }
    
    processedHashes.add(hash);
    await Dataset.pushData({ ...data, contentHash: hash });
}
```

- [ ] 导出多种格式

```typescript
import { Dataset } from 'crawlee';

// 导出到不同格式
const dataset = await Dataset.open();

// 导出为 JSON
await dataset.exportToJSON('results.json');

// 导出为 CSV
await dataset.exportToCSV('results.csv', {
    columns: ['title', 'price', 'rating', 'url'],
    delimiter: ','
});

// 自定义导出格式
const items = await dataset.getData();
const xmlOutput = items.items.map(item => 
    `<product><title>${item.title}</title><price>${item.price}</price></product>`
).join('\n');
```

## 高级模块功能清单 (ADVANCE)

### 6. 分布式爬虫

- [ ] 多实例协调机制
```typescript
import { Actor } from 'crawlee';

const crawler = new PlaywrightCrawler({
    requestQueue: await RequestQueue.open('shared-queue'),
    maxConcurrency: Actor.isAtHome() ? 100 : 10,
    
    requestHandler: async ({ page, request }) => {
        const instanceId = process.env.CRAWLEE_INSTANCE_ID || 'local';
        console.log(`Processing ${request.url} on instance ${instanceId}`);
    }
});
```

- [ ] 任务分发和负载均衡
```typescript
import { RequestQueue } from 'crawlee';

// 主控制器分发任务
const distributeUrls = async (urls: string[]) => {
    const queue = await RequestQueue.open('distributed-queue');
    
    for (const url of urls) {
        await queue.addRequest({
            url,
            userData: {
                assignedInstance: Math.floor(Math.random() * 3), // 分配到不同实例
                priority: Math.random()
            }
        });
    }
};
```

- [ ] 分布式队列管理
```typescript
const crawler = new PlaywrightCrawler({
    requestQueue: await RequestQueue.open('shared-queue', {
        persistStorage: true,
        storageClient: 'memory' // 或使用外部存储
    }),
    
    requestHandler: async ({ request }) => {
        // 检查是否由当前实例处理
        const shouldProcess = request.userData.assignedInstance === getCurrentInstanceId();
        if (!shouldProcess) {
            throw new Error('Request assigned to different instance');
        }
    }
});
```

- [ ] 状态同步机制
```typescript
import { KeyValueStore } from 'crawlee';

const syncState = async () => {
    const stateStore = await KeyValueStore.open('crawler-state');
    
    const currentState = {
        instanceId: process.env.INSTANCE_ID,
        processedCount: await getProcessedCount(),
        lastUpdate: new Date().toISOString(),
        status: 'running'
    };
    
    await stateStore.setValue(`instance-${currentState.instanceId}`, currentState);
};
```

### 7. 监控和调试

- [ ] 爬取进度监控
```typescript
import { log } from 'crawlee';

const crawler = new PlaywrightCrawler({
    requestHandler: async ({ request, page }) => {
        const stats = await crawler.getSessionPool()?.getState();
        log.info('Progress update', {
            processedRequests: crawler.stats.requestsTotal,
            failedRequests: crawler.stats.requestsFailed,
            currentUrl: request.url,
            sessionPoolStats: stats
        });
    }
});
```

- [ ] 性能指标收集
```typescript
import { Dataset, KeyValueStore } from 'crawlee';

class PerformanceMonitor {
    private startTime = Date.now();
    private metrics: any[] = [];
    
    async recordMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        const metrics = {
            timestamp: new Date().toISOString(),
            memory: memUsage,
            cpu: cpuUsage,
            runtime: Date.now() - this.startTime
        };
        
        await KeyValueStore.setValue('metrics', metrics);
    }
}
```

- [ ] 错误日志记录
```typescript
import { log } from 'crawlee';

const crawler = new PlaywrightCrawler({
    errorHandler: async ({ error, request }) => {
        log.error('Request failed', {
            url: request.url,
            error: error.message,
            stack: error.stack,
            retryCount: request.retryCount,
            timestamp: new Date().toISOString()
        });
        
        // 保存错误详情到数据集
        await Dataset.pushData({
            type: 'error',
            url: request.url,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
```

- [ ] 调试模式支持
```typescript
const crawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: {
            headless: process.env.NODE_ENV === 'production',
            slowMo: process.env.DEBUG ? 1000 : 0,
            devtools: !!process.env.DEBUG
        }
    },
    
    preNavigationHooks: [
        async ({ page, request }) => {
            if (process.env.DEBUG) {
                console.log(`Navigating to: ${request.url}`);
                await page.pause(); // 调试时暂停
            }
        }
    ]
});
```

- [ ] 统计数据展示
```typescript
const displayStats = async () => {
    const dataset = await Dataset.open();
    const info = await dataset.getInfo();
    
    const stats = {
        totalItems: info?.itemCount || 0,
        processingRate: crawler.stats.requestsPerMinute,
        successRate: (crawler.stats.requestsFinished / crawler.stats.requestsTotal) * 100,
        avgResponseTime: crawler.stats.avgRequestDurationMillis
    };
    
    console.table(stats);
};
```

### 8. 高级配置

- [ ] 自定义请求处理器
```typescript
class CustomRequestHandler {
    async handle({ request, $, page }: CrawlingContext) {
        // 预处理
        await this.preProcess(request);
        
        // 主处理逻辑
        const data = await this.extractData($);
        
        // 后处理
        return this.postProcess(data);
    }
    
    private async preProcess(request: Request) {
        console.log(`Processing: ${request.url}`);
    }
    
    private async extractData($: CheerioAPI) {
        return $('.content').text();
    }
    
    private async postProcess(data: any) {
        return { ...data, processedAt: new Date().toISOString() };
    }
}
```

- [ ] 中间件系统
```typescript
interface Middleware {
    process(context: CrawlingContext, next: () => Promise<void>): Promise<void>;
}

class LoggingMiddleware implements Middleware {
    async process(context: CrawlingContext, next: () => Promise<void>) {
        console.log(`Starting: ${context.request.url}`);
        await next();
        console.log(`Finished: ${context.request.url}`);
    }
}

class RateLimitMiddleware implements Middleware {
    private lastRequest = 0;
    
    async process(context: CrawlingContext, next: () => Promise<void>) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        const minInterval = 1000; // 1秒间隔
        
        if (timeSinceLastRequest < minInterval) {
            await sleep(minInterval - timeSinceLastRequest);
        }
        
        this.lastRequest = Date.now();
        await next();
    }
}
```

- [ ] 插件扩展机制
```typescript
interface CrawleePlugin {
    name: string;
    install(crawler: BasicCrawler): void;
}

class DataValidationPlugin implements CrawleePlugin {
    name = 'data-validation';
    
    install(crawler: BasicCrawler) {
        crawler.on('requestHandled', ({ request, response }) => {
            this.validateData(response.data);
        });
    }
    
    private validateData(data: any) {
        // 数据验证逻辑
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format');
        }
    }
}

// 使用插件
const crawler = new PlaywrightCrawler({ /* config */ });
new DataValidationPlugin().install(crawler);
```

- [ ] 配置文件管理
```typescript
import { readFileSync } from 'fs';
import { Configuration } from 'crawlee';

interface CrawlerConfig {
    maxConcurrency: number;
    requestDelay: number;
    userAgent: string;
    proxyUrls: string[];
}

const loadConfig = (): CrawlerConfig => {
    const configFile = process.env.CONFIG_FILE || './crawler.config.json';
    const config = JSON.parse(readFileSync(configFile, 'utf8'));
    
    return {
        maxConcurrency: config.maxConcurrency || 5,
        requestDelay: config.requestDelay || 1000,
        userAgent: config.userAgent || 'Default User Agent',
        proxyUrls: config.proxyUrls || []
    };
};
```

- [ ] 环境变量支持
```typescript
const config = {
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '5'),
    headless: process.env.HEADLESS !== 'false',
    storageDir: process.env.STORAGE_DIR || './storage',
    logLevel: process.env.LOG_LEVEL as LogLevel || LogLevel.INFO,
    proxyUrl: process.env.PROXY_URL,
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000')
};

Configuration.getGlobalConfig().set('logLevel', config.logLevel);
Configuration.getGlobalConfig().set('storageClientOptions', {
    localDataDirectory: config.storageDir
});
```

## 测试覆盖清单 (TDD)

### 9. 单元测试

- [ ] 页面解析器测试
```typescript
import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';

describe('PageParser', () => {
    it('should extract product data correctly', () => {
        const html = `
            <div class="product">
                <h1 class="title">Test Product</h1>
                <span class="price">$99.99</span>
            </div>
        `;
        
        const $ = load(html);
        const parser = new ProductParser();
        const result = parser.extract($);
        
        expect(result.title).toBe('Test Product');
        expect(result.price).toBe(99.99);
    });
});
```

- [ ] 链接提取器测试
```typescript
import { describe, it, expect } from 'vitest';
import { enqueueLinks } from 'crawlee';

describe('LinkExtractor', () => {
    it('should extract and filter links correctly', async () => {
        const mockEnqueue = vi.fn();
        const html = '<a href="/page1">Link 1</a><a href="/page2">Link 2</a>';
        const $ = load(html);
        
        await enqueueLinks({
            $,
            selector: 'a[href]',
            baseUrl: 'https://example.com',
            enqueueStrategy: 'same-domain'
        });
        
        expect(mockEnqueue).toHaveBeenCalledTimes(2);
    });
});
```

- [ ] 数据存储测试
```typescript
describe('DataStorage', () => {
    it('should save data to dataset', async () => {
        const storage = new TestDataStorage();
        const testData = { title: 'Test', url: 'https://example.com' };
        
        await storage.save(testData);
        const saved = await storage.getData();
        
        expect(saved).toContainEqual(testData);
    });
});
```

- [ ] 工具函数测试
```typescript
describe('UtilityFunctions', () => {
    it('should clean text properly', () => {
        const dirtyText = '  \n  Messy   Text  \n  ';
        const cleaned = cleanText(dirtyText);
        
        expect(cleaned).toBe('Messy Text');
    });
    
    it('should parse price correctly', () => {
        expect(parsePrice('$123.45')).toBe(123.45);
        expect(parsePrice('Price: €99,99')).toBe(99.99);
    });
});
```

- [ ] 错误处理测试
```typescript
describe('ErrorHandling', () => {
    it('should retry failed requests', async () => {
        const crawler = new TestCrawler({
            maxRequestRetries: 3,
            requestHandler: async ({ request }) => {
                if (request.retryCount < 2) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            }
        });
        
        const result = await crawler.run(['http://example.com']);
        expect(result).toBe('success');
    });
});
```

### 10. 集成测试

- [ ] 完整爬取流程测试
```typescript
describe('FullCrawlFlow', () => {
    it('should complete full crawling process', async () => {
        const mockServer = createMockServer();
        const crawler = new PlaywrightCrawler({
            requestHandler: async ({ page, request, enqueueLinks }) => {
                await enqueueLinks({ selector: 'a' });
                await Dataset.pushData({ url: request.url, title: $('title').text() });
            }
        });
        
        await crawler.run(['http://localhost:3000']);
        const dataset = await Dataset.open();
        const { items } = await dataset.getData();
        
        expect(items.length).toBeGreaterThan(0);
        mockServer.close();
    });
});
```

- [ ] 多页面爬取测试
```typescript
describe('MultiPageCrawling', () => {
    it('should crawl multiple pages correctly', async () => {
        const urls = ['http://example.com/page1', 'http://example.com/page2'];
        const crawler = new TestCrawler();
        
        await crawler.run(urls);
        const processedUrls = await crawler.getProcessedUrls();
        
        expect(processedUrls).toEqual(expect.arrayContaining(urls));
    });
});
```

- [ ] 错误恢复测试
```typescript
describe('ErrorRecovery', () => {
    it('should recover from network failures', async () => {
        const crawler = new RobustCrawler({
            errorHandler: async ({ error, request }) => {
                if (error.message.includes('ECONNRESET')) {
                    await sleep(1000);
                    return; // 重试
                }
            }
        });
        
        const result = await crawler.crawlWithRetries('http://flaky-site.com');
        expect(result).toBeDefined();
    });
});
```

- [ ] 性能基准测试
```typescript
describe('PerformanceBenchmarks', () => {
    it('should meet performance requirements', async () => {
        const startTime = Date.now();
        const crawler = new OptimizedCrawler({ maxConcurrency: 10 });
        
        await crawler.run(generateTestUrls(100));
        const duration = Date.now() - startTime;
        
        expect(duration).toBeLessThan(30000); // 30秒内完成
    });
});
```

- [ ] 边界条件测试
```typescript
describe('EdgeCases', () => {
    it('should handle empty responses', async () => {
        const crawler = new TestCrawler();
        const result = await crawler.processEmptyPage();
        
        expect(result).toEqual({});
    });
    
    it('should handle malformed HTML', async () => {
        const html = '<div><p>Unclosed tags<span>';
        const $ = load(html);
        
        expect(() => extractData($)).not.toThrow();
    });
});
```

## 实际应用场景

### 11. 示例爬虫项目

- [ ] 电商产品信息爬取
```typescript
const ecommerceCrawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request, enqueueLinks }) => {
        // 等待产品信息加载
        await page.waitForSelector('.product-info');
        
        const productData = await page.evaluate(() => ({
            name: document.querySelector('.product-title')?.textContent,
            price: document.querySelector('.price')?.textContent,
            rating: document.querySelector('.rating')?.getAttribute('data-rating'),
            images: Array.from(document.querySelectorAll('.product-images img'))
                .map(img => img.src),
            description: document.querySelector('.description')?.textContent
        }));
        
        await Dataset.pushData(productData);
        
        // 获取相关产品链接
        await enqueueLinks({
            selector: '.related-products a',
            label: 'PRODUCT'
        });
    }
});
```

- [ ] 新闻网站内容抓取
```typescript
const newsCrawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request, enqueueLinks }) => {
        const article = {
            url: request.loadedUrl,
            headline: $('.headline').text().trim(),
            author: $('.author').text().trim(),
            publishDate: $('.publish-date').attr('datetime'),
            content: $('.article-content').text().trim(),
            tags: $('.tags a').map((_, el) => $(el).text()).get(),
            category: request.userData.category
        };
        
        await Dataset.pushData(article);
        
        // 抓取更多文章
        await enqueueLinks({
            selector: '.more-articles a',
            userData: { category: 'news' }
        });
    }
});
```

- [ ] 社交媒体数据收集
```typescript
const socialMediaCrawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request }) => {
        // 滚动加载更多内容
        await page.evaluate(async () => {
            for (let i = 0; i < 3; i++) {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        });
        
        const posts = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.post')).map(post => ({
                text: post.querySelector('.post-text')?.textContent,
                author: post.querySelector('.author')?.textContent,
                timestamp: post.querySelector('.timestamp')?.textContent,
                likes: parseInt(post.querySelector('.likes-count')?.textContent || '0'),
                shares: parseInt(post.querySelector('.shares-count')?.textContent || '0')
            }));
        });
        
        await Dataset.pushData(posts);
    }
});
```

- [ ] 招聘网站职位信息
```typescript
const jobCrawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request, enqueueLinks }) => {
        $('.job-listing').each(async (_, element) => {
            const $job = $(element);
            
            const jobData = {
                title: $job.find('.job-title').text().trim(),
                company: $job.find('.company-name').text().trim(),
                location: $job.find('.location').text().trim(),
                salary: $job.find('.salary').text().trim(),
                description: $job.find('.job-description').text().trim(),
                requirements: $job.find('.requirements li').map((_, li) => $(li).text()).get(),
                postedDate: $job.find('.posted-date').text().trim(),
                jobType: $job.find('.job-type').text().trim()
            };
            
            await Dataset.pushData(jobData);
        });
        
        // 翻页
        await enqueueLinks({
            selector: '.pagination a[href]',
            label: 'LIST'
        });
    }
});
```

- [ ] 房产信息聚合
```typescript
const realEstateCrawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request }) => {
        const propertyData = await page.evaluate(() => ({
            address: document.querySelector('.property-address')?.textContent,
            price: document.querySelector('.price')?.textContent,
            bedrooms: document.querySelector('.bedrooms')?.textContent,
            bathrooms: document.querySelector('.bathrooms')?.textContent,
            squareFootage: document.querySelector('.square-footage')?.textContent,
            description: document.querySelector('.description')?.textContent,
            images: Array.from(document.querySelectorAll('.property-images img'))
                .map(img => img.src),
            features: Array.from(document.querySelectorAll('.features li'))
                .map(li => li.textContent)
        }));
        
        await Dataset.pushData(propertyData);
    }
});
```

### 12. 特殊网站类型处理

- [ ] SPA (单页应用) 爬取
```typescript
const spaCrawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request }) => {
        // 等待 React/Vue 应用加载完成
        await page.waitForSelector('[data-testid="app-loaded"]');
        await page.waitForFunction(() => window.appReady === true);
        
        // 处理路由变化
        await page.evaluate(() => {
            window.history.pushState({}, '', '/products');
        });
        
        await page.waitForSelector('.product-list');
        
        const data = await page.evaluate(() => {
            return window.__APP_DATA__ || {};
        });
        
        await Dataset.pushData(data);
    }
});
```

- [ ] 需要登录的网站
```typescript
const loginCrawler = new PlaywrightCrawler({
    preNavigationHooks: [
        async ({ page, request, session }) => {
            // 检查是否需要登录
            if (request.userData.requiresLogin && !session.userData.isLoggedIn) {
                await page.goto('/login');
                await page.fill('[name="username"]', process.env.LOGIN_USER);
                await page.fill('[name="password"]', process.env.LOGIN_PASS);
                await page.click('button[type="submit"]');
                await page.waitForNavigation();
                
                session.userData.isLoggedIn = true;
            }
        }
    ],
    
    requestHandler: async ({ page, request }) => {
        // 爬取需要登录的内容
        const protectedData = await page.evaluate(() => ({
            userProfile: document.querySelector('.user-profile')?.textContent,
            privateContent: document.querySelector('.private-content')?.textContent
        }));
        
        await Dataset.pushData(protectedData);
    }
});
```

- [ ] 带有CAPTCHA的网站
```typescript
const captchaCrawler = new PlaywrightCrawler({
    requestHandler: async ({ page, request }) => {
        // 检测 CAPTCHA
        const captchaPresent = await page.locator('.captcha, .recaptcha').count() > 0;
        
        if (captchaPresent) {
            // 记录遇到 CAPTCHA 的情况
            await Dataset.pushData({
                url: request.url,
                status: 'captcha_encountered',
                timestamp: new Date().toISOString()
            });
            
            // 可以实现自动解决简单 CAPTCHA 或暂停等待人工干预
            if (process.env.MANUAL_CAPTCHA_MODE) {
                console.log(`CAPTCHA detected at ${request.url}. Please solve manually.`);
                await page.pause(); // 等待人工解决
            }
            
            return;
        }
        
        // 正常处理页面
        const content = await page.textContent('body');
        await Dataset.pushData({ url: request.url, content });
    }
});
```

- [ ] API接口数据获取
```typescript
const apiCrawler = new PlaywrightCrawler({
    requestHandler: async ({ request, json }) => {
        if (request.url.includes('/api/')) {
            // 处理 JSON API 响应
            const apiData = typeof json === 'object' ? json : JSON.parse(json);
            
            await Dataset.pushData({
                endpoint: request.url,
                data: apiData,
                timestamp: new Date().toISOString()
            });
        }
    },
    
    additionalMimeTypes: ['application/json'],
    
    preNavigationHooks: [
        async ({ request }) => {
            // 为 API 请求设置适当的头部
            if (request.url.includes('/api/')) {
                request.headers = {
                    ...request.headers,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.API_TOKEN}`
                };
            }
        }
    ]
});
```

- [ ] 移动端页面适配
```typescript
const mobileCrawler = new PlaywrightCrawler({
    launchContext: {
        launchOptions: {
            viewport: { width: 375, height: 667 }, // iPhone 尺寸
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
    },
    
    preNavigationHooks: [
        async ({ page }) => {
            // 模拟移动设备
            await page.emulate(devices['iPhone 12']);
            await page.setGeolocation({ latitude: 40.7128, longitude: -74.0060 });
        }
    ],
    
    requestHandler: async ({ page, request }) => {
        // 处理移动端特有元素
        const mobileData = await page.evaluate(() => ({
            touchElements: document.querySelectorAll('[data-touch="true"]').length,
            viewportWidth: window.innerWidth,
            userAgent: navigator.userAgent,
            isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        }));
        
        await Dataset.pushData(mobileData);
    }
});
```

## 文档和TODO清单

### 13. 不方便实现的功能（文档说明）

- [ ] 复杂反爬虫机制绕过策略
- [ ] 大规模分布式部署方案
- [ ] 商业化反检测技术
- [ ] 高级机器学习数据处理
- [ ] 企业级监控和告警系统

### 14. 学习笔记和最佳实践

- [ ] Crawlee架构原理分析
- [ ] 常见爬虫问题解决方案
- [ ] 性能优化经验总结
- [ ] 法律合规性注意事项
- [ ] 行业最佳实践指南

## 实现优先级

**⚠️ 重要说明：所有功能点均通过 Vitest 测试用例实现，不实际构建爬虫应用**

### 阶段一：基础功能测试 🧪
1. **基本页面爬取和数据提取** - 通过模拟网页测试 PlaywrightCrawler 基础功能
2. **简单的并发控制** - 测试 maxConcurrency 和队列管理
3. **基础测试覆盖** - 单元测试框架搭建

### 阶段二：进阶功能测试 🔬
1. **浏览器自动化** - 测试页面交互、表单填写、截图等功能
2. **反检测机制** - 测试代理、User-Agent、会话管理
3. **数据存储优化** - 测试缓存、去重、多格式导出

### 阶段三：高级特性测试 ⚡
1. **分布式架构** - 测试多实例协调和状态同步
2. **监控系统** - 测试性能指标收集和错误处理
3. **复杂场景处理** - 测试登录、CAPTCHA、SPA等特殊情况

### 🎯 测试实现策略
- **Mock 服务器**：使用测试服务器模拟各种网站场景
- **集成测试**：验证完整的爬取流程
- **性能测试**：基准测试和边界条件验证
- **功能测试**：每个 API 的单独功能验证

## 技术约束

- ✅ 仅使用Crawlee原生能力
- ❌ 禁用第三方库（axios、cheerio等）
- ✅ 使用TypeScript严格模式
- ✅ 100% Vitest测试覆盖
- ✅ 遵循TDD开发模式
- 🔬 **纯测试实现**：无实际项目代码，仅通过测试用例学习验证功能
- 🎯 **Mock优先**：使用测试双代替真实网站和服务
