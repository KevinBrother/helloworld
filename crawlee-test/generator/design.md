# 爬虫任务管理系统设计文档

## 系统概述

基于 PlaywrightCrawler 和 Fastify 的双进程爬虫任务管理系统，采用完全解耦的架构设计。API 服务层和爬虫工作进程层互相独立，仅通过文件系统进行异步通信，实现高度可扩展的分布式爬虫系统。

## 架构设计

### 系统分层

- **API 层 (api.ts)**: 负责接收请求，创建爬虫任务，查询任务状态
- **Worker 层 (worker.ts)**: 负责执行爬虫任务，处理爬取的页面，保存结果
- **存储层**: 使用文件级别的 RequestQueue 管理任务队列

### 进程通信

- **完全解耦架构**: API 层与 Worker 层互相不知道对方的存在，不进行任何直接通信
- **唯一联系方式**: 
  - RequestQueue 文件作为任务传递媒介
  - 共享存储文件系统进行状态同步
- **异步工作模式**: Worker 独立运行，持续监听和处理队列中的任务

## 核心数据结构

### IJob 接口

```typescript
interface IJob {
    jobId: string;                  // Job 唯一标识 (UUID)
    url: string;                    // 任务对应的 URL
    status: 'pending' | 'in-progress' | 'completed' | 'failed'; // 任务状态
    title?: string;                 // 任务爬取的页面标题
    taskId: string;                 // 所属任务 ID
    createdAt: Date;                // 任务创建时间
    startedAt?: Date;               // 任务开始时间
    completedAt?: Date;             // 任务完成时间
    error?: string;                 // 如果任务失败，记录错误信息
    pageData?: {
        content?: string;           // 页面内容
        links?: string[];           // 提取的链接
        metadata?: Record<string, any>; // 其他元数据
    };
}
```

### ITaskStatus 接口

```typescript
interface ITaskStatus {
    totalUrls: number;              // 总 URL 数量
    completedCount: number;         // 已完成数量
    failedCount: number;            // 失败数量
    pendingCount: number;           // 待处理数量
    jobs: IJob[];                   // 任务列表
}
```

### ITask 接口

```typescript
interface ITask {
    taskId: string;                 // 任务唯一标识
    entryUrl: string;               // 入口 URL
    status: 'active' | 'completed' | 'failed'; // 任务整体状态
    createdAt: Date;                // 任务创建时间
    queuePath: string;              // RequestQueue 文件路径
    storagePath: string;            // 存储路径
}
```

## API 层设计 (api.ts)

### 核心函数

#### startCrawler

```typescript
function startCrawler(url: string): Promise<string>
```

- **功能**: 创建新的爬虫任务
- **参数**:
  - `url`: 爬取入口 URL
- **返回值**: 任务 ID (UUID)
- **实现逻辑**:
  1. 生成唯一的 taskId 和 jobId
  2. 创建任务存储目录
  3. 初始化 RequestQueue
  4. 将入口 URL 添加到队列
  5. 创建任务记录文件
  6. Worker 进程会自动发现并处理新任务

#### getCrawlerStatus

```typescript
function getCrawlerStatus(taskId: string): Promise<ITaskStatus>
```

- **功能**: 获取任务当前状态
- **参数**:
  - `taskId`: 任务 ID
- **返回值**: 任务状态对象
- **实现逻辑**:
  1. 读取任务存储文件
  2. 统计各状态的 job 数量
  3. 返回聚合状态信息

```typescript
// 伪代码实现
async function getCrawlerStatus(taskId: string): Promise<ITaskStatus> {
    // 1. 验证 taskId 是否存在
    const taskFilePath = path.join(CONFIG.TASKS_BASE_PATH, `task-${taskId}.json`);
    if (!await fs.pathExists(taskFilePath)) {
        throw new TaskNotFoundError(taskId);
    }

    // 2. 读取 jobs 文件
    const jobsFilePath = path.join(CONFIG.TASKS_BASE_PATH, `jobs-${taskId}.json`);
    const jobsData = await storageManager.readJSON<{jobs: IJob[]}>(jobsFilePath);
    const jobs = jobsData?.jobs || [];

    // 3. 统计各状态数量
    const totalUrls = jobs.length;
    const completedCount = jobs.filter(job => job.status === 'completed').length;
    const failedCount = jobs.filter(job => job.status === 'failed').length;
    const pendingCount = jobs.filter(job => job.status === 'pending').length;
    const inProgressCount = jobs.filter(job => job.status === 'in-progress').length;

    // 4. 返回状态信息
    return {
        totalUrls,
        completedCount,
        failedCount,
        pendingCount: pendingCount + inProgressCount, // 合并待处理状态
        jobs: jobs.slice(0, 50) // 只返回前50个job，避免响应过大
    };
}
```

### Fastify 路由设计

#### POST /crawler/start

- **请求体**: `{ url: string }`
- **响应**: `{ taskId: string }`
- **Schema 验证**: 使用 Zod + @fastify/type-provider-zod

#### GET /crawler/status/:taskId

- **路径参数**: taskId
- **响应**: `ITaskStatus`
- **Schema 验证**: Zod 路径参数验证

#### GET /crawler/tasks

- **功能**: 获取所有任务列表
- **响应**: `ITask[]`
- **Schema 验证**: Zod 查询参数分页验证

### 任务管理器类

```typescript
class TaskManager {
    private tasksStoragePath: string;
    private tasks: Map<string, ITask>;

    constructor(storagePath: string);
    
    async createTask(entryUrl: string): Promise<string>;
    async getTask(taskId: string): Promise<ITask | null>;
    async getAllTasks(): Promise<ITask[]>;
    async updateTaskStatus(taskId: string, status: ITask['status']): Promise<void>;
    async getTaskStatus(taskId: string): Promise<ITaskStatus>;
    
    private async saveTasksToFile(): Promise<void>;
    private async loadTasksFromFile(): Promise<void>;
}
```

## Worker 层设计 (worker.ts)

### 核心类设计

#### CrawlerWorker

```typescript
class CrawlerWorker {
    private crawler: PlaywrightCrawler;
    private taskManager: TaskManager;
    private isRunning: boolean;

    constructor();
    
    async start(): Promise<void>;
    async stop(): Promise<void>;
    async processTask(taskId: string): Promise<void>;
    
    private async setupCrawler(): Promise<void>;
    private async handleRequest(context: PlaywrightCrawlingContext): Promise<void>;
    private async updateJobStatus(jobId: string, status: IJob['status'], data?: Partial<IJob>): Promise<void>;
}
```

### 爬虫配置

```typescript
const crawlerConfig = {
    requestQueue: new RequestQueue({ storageDir: './storage/queues' }),
    requestHandler: async (context: PlaywrightCrawlingContext) => {
        // 处理页面逻辑
    },
    failedRequestHandler: async (context: PlaywrightCrawlingContext) => {
        // 失败处理逻辑
    },
    maxRequestsPerCrawl: 100,
    headless: true,
    launchContext: {
        useChrome: true,
    }
};
```

### 请求处理器

```typescript
async function handleRequest(context: PlaywrightCrawlingContext): Promise<void> {
    const { request, page, enqueueLinks } = context;
    
    // 1. 提取页面信息
    const title = await page.title();
    const url = request.loadedUrl || request.url;
    
    // 2. 更新 job 状态
    await updateJobStatus(request.userData.jobId, 'in-progress', {
        title,
        startedAt: new Date()
    });
    
    // 3. 提取链接并加入队列
    await enqueueLinks({
        selector: 'a[href]',
        userData: { 
            taskId: request.userData.taskId
        }
    });
    
    // 4. 保存页面数据
    await savePageData(url, title, request.userData.taskId);
    
    // 5. 标记完成
    await updateJobStatus(request.userData.jobId, 'completed', {
        completedAt: new Date()
    });
}
```

## 存储设计

### 目录结构

```
storage/
├── tasks/
│   ├── task-{taskId}.json          # 任务元信息
│   └── jobs-{taskId}.json          # 任务的所有 jobs 记录
├── queues/
│   └── queue-{taskId}/             # RequestQueue 存储目录 (Crawlee自动管理)
└── data/
    └── task-{taskId}/              # 爬取数据存储
        ├── pages/
        │   ├── page-{jobId}.json   # 单个页面详细数据
        │   ├── page-{jobId}.html   # 页面HTML内容(可选)
        │   └── ...
        └── summary.json            # 任务汇总信息
```

### 文件用途说明

- **tasks/jobs-{taskId}.json**: 只存储 job 的基本信息(jobId, url, status, 时间戳等)，用于快速查询状态
- **data/pages/page-{jobId}.json**: 存储具体的页面爬取数据(标题、内容、链接等)
- **data/summary.json**: 存储任务级别的汇总信息

### 数据持久化

#### 任务文件 (task-{taskId}.json)

```json
{
    "taskId": "uuid",
    "entryUrl": "https://example.com",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "queuePath": "./storage/queues/queue-uuid",
    "storagePath": "./storage/data/task-uuid"
}
```

#### Jobs 文件 (jobs-{taskId}.json)

存储 job 的基本状态信息，用于快速查询：

```json
{
    "jobs": [
        {
            "jobId": "job-uuid-001",
            "url": "https://example.com",
            "status": "completed",
            "taskId": "task-uuid",
            "createdAt": "2023-01-01T00:00:00.000Z",
            "startedAt": "2023-01-01T00:00:30.000Z",
            "completedAt": "2023-01-01T00:01:00.000Z"
        }
    ]
}
```

#### 页面数据文件 (data/pages/page-{jobId}.json)

存储具体的页面爬取数据：

```json
{
    "jobId": "job-uuid-001",
    "url": "https://example.com",
    "title": "Example Page Title",
    "content": "页面文本内容...",
    "links": [
        "https://example.com/page1",
        "https://example.com/page2"
    ],
    "metadata": {
        "description": "页面描述",
        "keywords": "关键词",
        "images": ["https://example.com/image1.jpg"]
    },
    "crawledAt": "2023-01-01T00:01:00.000Z"
}
```

#### 任务汇总文件 (data/summary.json)

```json
{
    "taskId": "task-uuid",
    "entryUrl": "https://example.com",
    "totalPages": 25,
    "uniqueDomains": ["example.com"],
    "avgProcessingTime": 1200,
    "lastUpdated": "2023-01-01T00:05:00.000Z"
}
```

## 实用工具类

### StorageManager

```typescript
class StorageManager {
    private basePath: string;

    constructor(basePath: string);
    
    async ensureDirectoryExists(path: string): Promise<void>;
    async writeJSON(filePath: string, data: any): Promise<void>;
    async readJSON<T>(filePath: string): Promise<T | null>;
    async appendToFile(filePath: string, content: string): Promise<void>;
    getTaskStoragePath(taskId: string): string;
    getJobsFilePath(taskId: string): string;
}
```

### JobManager

```typescript
class JobManager {
    private storageManager: StorageManager;

    constructor(storageManager: StorageManager);
    
    async createJob(taskId: string, url: string): Promise<string>;
    async updateJob(taskId: string, jobId: string, updates: Partial<IJob>): Promise<void>;
    async getJob(taskId: string, jobId: string): Promise<IJob | null>;
    async getAllJobs(taskId: string): Promise<IJob[]>;
    async getJobsByStatus(taskId: string, status: IJob['status']): Promise<IJob[]>;
}
```

## 配置和常量

### 配置文件 (config.ts)

```typescript
export const CONFIG = {
    STORAGE_BASE_PATH: './storage',
    QUEUE_BASE_PATH: './storage/queues',
    DATA_BASE_PATH: './storage/data',
    TASKS_BASE_PATH: './storage/tasks',
    
    API_PORT: 3000,
    
    CRAWLER_OPTIONS: {
        maxRequestsPerCrawl: 100,
        maxConcurrency: 5,
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 30
    }
};
```

## 错误处理

### 自定义错误类

```typescript
class CrawlerError extends Error {
    constructor(message: string, public code: string, public taskId?: string) {
        super(message);
        this.name = 'CrawlerError';
    }
}

class TaskNotFoundError extends CrawlerError {
    constructor(taskId: string) {
        super(`Task ${taskId} not found`, 'TASK_NOT_FOUND', taskId);
    }
}

class InvalidUrlError extends CrawlerError {
    constructor(url: string) {
        super(`Invalid URL: ${url}`, 'INVALID_URL');
    }
}
```

## 部署和启动

### 独立进程架构

#### API 服务器启动 (api-server.ts)

```typescript
// api-server.ts - 独立启动的API服务
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider
} from 'fastify-type-provider-zod';
import { TaskManager } from './task-manager';
import { Logger, apiLogger } from './logger';
import { CreateTaskRequestSchema, CreateTaskResponseSchema, GetTaskParamsSchema } from './types/task';
import { TaskStatusSchema } from './types/job';

async function startApiServer() {
    const fastify = Fastify({
        logger: apiLogger // 直接使用配置好的 Pino 日志器
    }).withTypeProvider<ZodTypeProvider>();
    
    // 设置 Zod 类型提供器
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);
    
    const taskManager = new TaskManager();
    
    // 初始化存储目录
    await taskManager.initialize();
    
    // 注册插件
    await fastify.register(import('@fastify/cors'));
    await fastify.register(import('@fastify/helmet'));
    
    // 创建爬虫任务路由
    fastify.post('/crawler/start', {
        schema: {
            body: CreateTaskRequestSchema,
            response: {
                200: CreateTaskResponseSchema
            }
        }
    }, async (request, reply) => {
        try {
            const { url } = request.body as { url: string };
            const taskId = await taskManager.createTask(url);
            Logger.info('Created new crawl task', { taskId, url }, 'api');
            return { taskId };
        } catch (error) {
            Logger.error('Failed to create task', error as Error, {}, 'api');
            reply.status(500);
            return { error: (error as Error).message };
        }
    });
    
    // 获取任务状态路由
    fastify.get('/crawler/status/:taskId', {
        schema: {
            params: GetTaskParamsSchema,
            response: {
                200: TaskStatusSchema
            }
        }
    }, async (request, reply) => {
        try {
            const { taskId } = request.params as { taskId: string };
            const status = await getCrawlerStatus(taskId);
            return status;
        } catch (error) {
            Logger.error('Failed to get status', error as Error, { taskId }, 'api');
            reply.status(404);
            return { error: (error as Error).message };
        }
    });
    
    // 启动服务器
    try {
        await fastify.listen({ port: CONFIG.API_PORT, host: '0.0.0.0' });
        Logger.info(`API server running on port ${CONFIG.API_PORT}`, {}, 'api');
    } catch (err) {
        Logger.error('Failed to start API server', err as Error, {}, 'api');
        process.exit(1);
    }
}

if (require.main === module) {
    startApiServer().catch(console.error);
}
```

#### Worker 进程启动 (crawler-worker.ts)

```typescript
// crawler-worker.ts - 独立启动的爬虫工作进程
import { PlaywrightCrawler } from 'crawlee';
import { Logger } from './logger';

async function startCrawlerWorker() {
    Logger.info('Starting crawler worker...');
    
    // 扫描所有活跃的任务队列
    const activeTasks = await TaskManager.getActiveTasks();
    
    // 为每个活跃任务启动爬虫
    for (const task of activeTasks) {
        await startCrawlerForTask(task.taskId);
    }
    
    // 监听新任务
    setInterval(async () => {
        const newTasks = await TaskManager.getNewTasks();
        for (const task of newTasks) {
            await startCrawlerForTask(task.taskId);
        }
    }, 5000); // 每5秒检查一次新任务
    
    Logger.info('Crawler worker started, waiting for tasks...');
}

async function startCrawlerForTask(taskId: string) {
    const queuePath = path.join(CONFIG.QUEUE_BASE_PATH, `queue-${taskId}`);
    
    const crawler = new PlaywrightCrawler({
        requestQueue: await RequestQueue.open(taskId, { storageDir: queuePath }),
        requestHandler: async (context) => {
            await handleRequest(context, taskId);
        },
        failedRequestHandler: async (context) => {
            await handleFailedRequest(context, taskId);
        },
        maxRequestsPerCrawl: CONFIG.CRAWLER_OPTIONS.maxRequestsPerCrawl,
        maxConcurrency: CONFIG.CRAWLER_OPTIONS.maxConcurrency,
        headless: true
    });
    
    Logger.info(`Starting crawler for task ${taskId}`);
    await crawler.run();
    Logger.info(`Crawler completed for task ${taskId}`);
}

if (require.main === module) {
    startCrawlerWorker().catch(console.error);
}
```

### 启动命令

```bash
# 启动API服务器
node dist/api-server.js

# 启动爬虫工作进程 (可在不同终端或服务器)
node dist/crawler-worker.js
```

## 监控和日志

### 日志管理 (使用 Pino)

```typescript
import pino from 'pino';
import path from 'path';

// Pino 基础配置
const createLogger = (name: 'api' | 'worker') => {
    return pino({
        name,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
        },
        transport: process.env.NODE_ENV !== 'production' ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss',
                ignore: 'pid,hostname',
                messageFormat: '[{name}] {msg}'
            }
        } : undefined,
    }, pino.multistream([
        // 所有日志写入文件
        {
            level: 'debug',
            stream: pino.destination({
                dest: path.join('./logs', `${name}.log`),
                sync: false, // 异步写入提高性能
            })
        },
        // 错误日志单独文件
        {
            level: 'error',
            stream: pino.destination({
                dest: path.join('./logs', `${name}-error.log`),
                sync: false,
            })
        },
        // 生产环境控制台输出
        ...(process.env.NODE_ENV === 'production' ? [{
            level: 'info',
            stream: process.stdout
        }] : [])
    ]));
};

// API 服务日志
export const apiLogger = createLogger('api');

// Worker 服务日志
export const workerLogger = createLogger('worker');

// 通用日志工具类
export class Logger {
    private static getLogger(service?: 'api' | 'worker') {
        if (service === 'api') return apiLogger;
        if (service === 'worker') return workerLogger;
        // 默认根据进程环境判断
        return process.env.SERVICE_NAME === 'worker' ? workerLogger : apiLogger;
    }
    
    static info(message: string, meta?: any, service?: 'api' | 'worker'): void {
        this.getLogger(service).info(meta || {}, message);
    }
    
    static error(message: string, error?: Error, meta?: any, service?: 'api' | 'worker'): void {
        this.getLogger(service).error({ 
            error: error?.stack || error?.message, 
            ...meta 
        }, message);
    }
    
    static warn(message: string, meta?: any, service?: 'api' | 'worker'): void {
        this.getLogger(service).warn(meta || {}, message);
    }
    
    static debug(message: string, meta?: any, service?: 'api' | 'worker'): void {
        this.getLogger(service).debug(meta || {}, message);
    }
    
    static child(bindings: any, service?: 'api' | 'worker') {
        return this.getLogger(service).child(bindings);
    }
}

// 为不同服务创建专用日志器
export const createServiceLogger = (serviceName: 'api' | 'worker') => {
    const logger = createLogger(serviceName);
    return {
        info: (message: string, meta?: any) => logger.info(meta || {}, message),
        error: (message: string, error?: Error, meta?: any) => 
            logger.error({ error: error?.stack || error?.message, ...meta }, message),
        warn: (message: string, meta?: any) => logger.warn(meta || {}, message),
        debug: (message: string, meta?: any) => logger.debug(meta || {}, message),
        child: (bindings: any) => logger.child(bindings),
        raw: logger // 访问原始 pino 实例
    };
};
```

### 日志使用示例

```typescript
// API 服务中使用
import { apiLogger, Logger } from './utils/logger';

// 方式1: 直接使用专用日志器
apiLogger.info({ taskId: 'task-123', url: 'https://example.com' }, 'Created new crawl task');

// 方式2: 使用通用日志工具类
Logger.info('Created new crawl task', { taskId: 'task-123', url: 'https://example.com' }, 'api');

// 方式3: 创建子日志器
const taskLogger = apiLogger.child({ taskId: 'task-123' });
taskLogger.info({ url: 'https://example.com' }, 'Starting crawl task');
taskLogger.error({ error: 'Connection failed' }, 'Failed to crawl page');
```

### 标识区分 vs 文件夹区分

**为什么选择标识区分 (`{name: "api"}`) 而非文件夹区分 (`logs/api/`, `logs/worker/`)**:

1. **更好的日志聚合**: 
   - 所有日志在同一层级，便于日志收集工具（如 ELK、Fluentd）处理
   - 支持跨服务的日志关联分析

2. **灵活的过滤和搜索**:
   - 可以通过 `name` 字段轻松过滤：`grep '"name":"api"' combined.log`
   - 支持更复杂的查询：`jq 'select(.name=="api" and .level=="ERROR")' combined.log`

3. **统一的日志格式**:
   - 所有服务使用相同的 Pino 配置和格式
   - 便于建立统一的日志监控和告警规则

4. **容器化友好**:
   - 容器环境中更容易配置日志输出
   - 支持标准输出重定向和日志驱动

5. **减少文件系统复杂度**:
   - 避免多层目录结构
   - 减少权限管理复杂性

### 日志文件结构
```
logs/
├── api.log              # API 服务所有日志
├── api-error.log        # API 服务错误日志
├── worker.log           # Worker 服务所有日志
├── worker-error.log     # Worker 服务错误日志
└── combined.log         # 所有服务聚合日志（可选）
```

### 生产环境日志轮转

```typescript
// 生产环境使用 pino-roll 进行日志轮转
import { createWriteStream } from 'pino-roll';

const logRotation = createWriteStream({
    file: path.join('./logs', `${name}.log`),
    frequency: 'daily',
    size: '10m', // 10MB
    limit: { count: 5 } // 保留5个历史文件
});
```

### 环境变量配置

```bash
# API 服务启动
SERVICE_NAME=api node dist/api-server.js

# Worker 服务启动  
SERVICE_NAME=worker node dist/crawler-worker.js
```

### 依赖包更新

需要添加到 package.json:

```json
{
  "dependencies": {
    "fastify": "^4.24.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/helmet": "^11.0.0",
    "@fastify/rate-limit": "^9.0.0",
    "fastify-type-provider-zod": "^2.0.0",
    "pino": "^8.17.0",
    "pino-pretty": "^10.2.0",
    "pino-roll": "^1.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

## Zod + TypeScript 类型安全设计

### Zod Schema 优势

1. **类型推导**: 从 Schema 自动生成 TypeScript 类型
2. **运行时验证**: 在运行时验证数据结构和类型
3. **单一数据源**: Schema 既用于验证又用于类型定义
4. **更好的错误信息**: 详细的验证错误提示
5. **编译时和运行时安全**: 双重保障

### 使用示例

```typescript
// 定义 Schema
const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    age: z.number().min(18).max(100)
});

// 自动推导类型
type User = z.infer<typeof UserSchema>; // { id: string; email: string; age: number; }

// 运行时验证
const validateUser = (data: unknown): User => {
    return UserSchema.parse(data); // 如果验证失败会抛出错误
};

// Fastify 路由中使用
fastify.post('/users', {
    schema: {
        body: UserSchema,
        response: {
            200: z.object({ success: z.boolean() })
        }
    }
}, async (request) => {
    // request.body 自动推导为 User 类型
    const user = request.body; // TypeScript 知道这是 User 类型
    // ...
});
```

### 验证错误处理

```typescript
// 自定义错误处理器
fastify.setErrorHandler((error, request, reply) => {
    if (error.validation) {
        // Zod 验证错误
        reply.status(400).send({
            error: 'Validation failed',
            details: error.validation.map(err => ({
                field: err.instancePath,
                message: err.message
            }))
        });
    } else {
        // 其他错误
        reply.status(500).send({ error: 'Internal server error' });
    }
});
```

## 项目结构设计

### src 目录文件结构

```
src/
├── api/
│   ├── server.ts                   # API 服务器主入口
│   ├── routes/
│   │   ├── crawler.ts              # 爬虫相关路由 (/crawler/*)
│   │   └── index.ts                # 路由聚合导出
│   └── middleware/
│       ├── error-handler.ts        # 全局错误处理中间件
│       ├── logger.ts               # 请求日志中间件
│       └── validator.ts            # 请求参数验证中间件
│
├── worker/
│   ├── crawler-worker.ts           # Worker 进程主入口
│   ├── handlers/
│   │   ├── request-handler.ts      # 请求处理器
│   │   └── failed-handler.ts       # 失败请求处理器
│   └── crawler-config.ts           # 爬虫配置
│
├── core/
│   ├── task-manager.ts             # 任务管理器
│   ├── job-manager.ts              # Job 管理器
│   ├── storage-manager.ts          # 存储管理器
│   └── queue-manager.ts            # 队列管理器
│
├── types/
│   ├── task.ts                     # 任务相关类型定义
│   ├── job.ts                      # Job 相关类型定义
│   ├── api.ts                      # API 接口类型定义
│   └── index.ts                    # 类型导出聚合
│
├── utils/
│   ├── logger.ts                   # Pino 日志工具
│   ├── uuid.ts                     # UUID 生成工具
│   ├── file-utils.ts               # 文件操作工具
│   ├── url-validator.ts            # URL 验证工具
│   └── date-utils.ts               # 日期处理工具
│
├── config/
│   ├── index.ts                    # 配置文件主入口
│   ├── api-config.ts               # API 服务配置
│   ├── crawler-config.ts           # 爬虫配置
│   └── storage-config.ts           # 存储配置
│
├── errors/
│   ├── base-error.ts               # 基础错误类
│   ├── task-error.ts               # 任务相关错误
│   ├── storage-error.ts            # 存储相关错误
│   └── index.ts                    # 错误类导出
│
└── scripts/
    ├── api-server.ts               # API 服务器启动脚本
    ├── crawler-worker.ts           # Worker 进程启动脚本
    └── setup-storage.ts            # 存储目录初始化脚本
```

### 关键文件说明

#### API 层文件

**src/api/server.ts** - API 服务器主入口
```typescript
import Fastify, { FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider
} from 'fastify-type-provider-zod';
import { crawlerRoutes } from './routes';
import { errorHandler } from './middleware';

export async function createApiServer(): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: {
            level: 'info',
            transport: { target: 'pino-pretty' }
        }
    }).withTypeProvider<ZodTypeProvider>();
    
    // 设置 Zod 类型提供器
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);
    
    // 注册插件
    await fastify.register(import('@fastify/cors'));
    await fastify.register(import('@fastify/helmet'));
    await fastify.register(import('@fastify/rate-limit'));
    
    // 注册路由
    await fastify.register(crawlerRoutes, { prefix: '/crawler' });
    
    // 错误处理
    fastify.setErrorHandler(errorHandler);
    
    return fastify;
}
```

**src/api/routes/crawler.ts** - 爬虫路由
```typescript
import { z } from 'zod';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
    CreateTaskRequestSchema,
    CreateTaskResponseSchema,
    GetTaskParamsSchema,
    GetTasksQuerySchema,
    TaskSchema,
    TaskStatusSchema as ITaskStatusSchema
} from '../../types/task';
import { startCrawlerHandler, getStatusHandler, getTasksHandler } from '../handlers';

const crawlerRoutes: FastifyPluginAsyncZod = async (fastify) => {
    // 创建爬虫任务
    fastify.post('/start', {
        schema: {
            body: CreateTaskRequestSchema,
            response: {
                200: CreateTaskResponseSchema
            }
        }
    }, startCrawlerHandler);
    
    // 获取任务状态
    fastify.get('/status/:taskId', {
        schema: {
            params: GetTaskParamsSchema,
            response: {
                200: ITaskStatusSchema
            }
        }
    }, getStatusHandler);
    
    // 获取所有任务
    fastify.get('/tasks', {
        schema: {
            querystring: GetTasksQuerySchema,
            response: {
                200: z.object({
                    tasks: z.array(TaskSchema),
                    total: z.number(),
                    page: z.number(),
                    limit: z.number()
                })
            }
        }
    }, getTasksHandler);
};

export { crawlerRoutes };
```

#### Worker 层文件

**src/worker/crawler-worker.ts** - Worker 主入口
```typescript
export class CrawlerWorker {
    async start(): Promise<void>
    async stop(): Promise<void>
    private async scanAndProcessTasks(): Promise<void>
}
```

**src/worker/handlers/request-handler.ts** - 请求处理
```typescript
export async function handleRequest(
    context: PlaywrightCrawlingContext,
    taskId: string
): Promise<void>
```

#### 核心管理类

**src/core/task-manager.ts** - 任务管理
```typescript
export class TaskManager {
    async createTask(entryUrl: string): Promise<string>
    async getTask(taskId: string): Promise<ITask | null>
    async getTaskStatus(taskId: string): Promise<ITaskStatus>
}
```

**src/core/job-manager.ts** - Job 管理
```typescript
export class JobManager {
    async createJob(taskId: string, url: string): Promise<string>
    async updateJobStatus(jobId: string, status: JobStatus): Promise<void>
    async getJobsByTask(taskId: string): Promise<IJob[]>
}
```

**src/core/storage-manager.ts** - 存储管理
```typescript
export class StorageManager {
    async writeJSON(filePath: string, data: any): Promise<void>
    async readJSON<T>(filePath: string): Promise<T | null>
    async ensureDirectoryExists(path: string): Promise<void>
}
```

#### 类型定义文件

**src/types/task.ts**
```typescript
import { z } from 'zod';

// Zod Schema 定义
export const TaskStatusSchema = z.enum(['active', 'completed', 'failed']);

export const TaskSchema = z.object({
    taskId: z.string().uuid(),
    entryUrl: z.string().url(),
    status: TaskStatusSchema,
    createdAt: z.date(),
    queuePath: z.string(),
    storagePath: z.string()
});

// TypeScript 类型推导
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type ITask = z.infer<typeof TaskSchema>;

// API 请求/响应 Schema
export const CreateTaskRequestSchema = z.object({
    url: z.string().url()
});

export const CreateTaskResponseSchema = z.object({
    taskId: z.string().uuid()
});

export const GetTaskParamsSchema = z.object({
    taskId: z.string().uuid()
});

export const GetTasksQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10)
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type CreateTaskResponse = z.infer<typeof CreateTaskResponseSchema>;
export type GetTaskParams = z.infer<typeof GetTaskParamsSchema>;
export type GetTasksQuery = z.infer<typeof GetTasksQuerySchema>;
```

**src/types/job.ts**
```typescript
import { z } from 'zod';

// Zod Schema 定义
export const JobStatusSchema = z.enum(['pending', 'in-progress', 'completed', 'failed']);

export const PageDataSchema = z.object({
    content: z.string().optional(),
    links: z.array(z.string().url()).optional(),
    metadata: z.record(z.any()).optional()
});

export const JobSchema = z.object({
    jobId: z.string().uuid(),
    url: z.string().url(),
    status: JobStatusSchema,
    title: z.string().optional(),
    taskId: z.string().uuid(),
    createdAt: z.date(),
    startedAt: z.date().optional(),
    completedAt: z.date().optional(),
    error: z.string().optional(),
    pageData: PageDataSchema.optional()
});

export const TaskStatusSchema = z.object({
    totalUrls: z.number(),
    completedCount: z.number(),
    failedCount: z.number(),
    pendingCount: z.number(),
    jobs: z.array(JobSchema)
});

// TypeScript 类型推导
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type PageData = z.infer<typeof PageDataSchema>;
export type IJob = z.infer<typeof JobSchema>;
export type ITaskStatus = z.infer<typeof TaskStatusSchema>;
```

#### 启动脚本

**src/scripts/api-server.ts**
```typescript
import { createApiServer } from '../api/server';
import { CONFIG } from '../config';

async function main() {
    const fastify = await createApiServer();
    
    try {
        await fastify.listen({ 
            port: CONFIG.API_PORT, 
            host: '0.0.0.0' 
        });
        fastify.log.info(`API server running on port ${CONFIG.API_PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
```

**src/scripts/crawler-worker.ts**
```typescript
import { CrawlerWorker } from '../worker/crawler-worker';

async function main() {
    const worker = new CrawlerWorker();
    await worker.start();
}

if (require.main === module) {
    main().catch(console.error);
}
```

### package.json 脚本配置

```json
{
  "scripts": {
    "build": "tsc",
    "dev:api": "tsx src/scripts/api-server.ts",
    "dev:worker": "tsx src/scripts/crawler-worker.ts",
    "start:api": "node dist/scripts/api-server.js",
    "start:worker": "node dist/scripts/crawler-worker.js",
    "setup": "tsx src/scripts/setup-storage.ts"
  }
}
```

这个文件结构设计确保了：
1. **清晰的分层**: API、Worker、核心逻辑分离
2. **可维护性**: 每个文件职责明确
3. **可扩展性**: 模块化设计便于功能扩展
4. **类型安全**: 完整的 TypeScript 类型定义

通过这个结构，可以轻松实现完整的爬虫任务管理功能。
