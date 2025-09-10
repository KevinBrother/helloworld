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

### ITaskStatusResponse 接口

```typescript
interface ITaskStatusResponse {
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
function getCrawlerStatus(taskId: string): Promise<ITaskStatusResponse>
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
async function getCrawlerStatus(taskId: string): Promise<ITaskStatusResponse> {
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
- **响应**: `ITaskStatusResponse`
- **Schema 验证**: Zod 路径参数验证

#### GET /crawler/tasks

- **功能**: 获取所有任务列表
- **响应**: `ITask[]`
- **Schema 验证**: Zod 查询参数分页验证

## 优化后的分层架构设计

### 设计思路：分离关注点

1. **TaskService**: 任务业务逻辑层
2. **TaskRepository**: 任务数据存储层  
3. **JobRepository**: Job 数据存储层
4. **QueueService**: 队列操作服务
5. **StorageService**: 文件存储服务

### 核心服务类设计

#### 1. TaskService - 任务业务逻辑层

```typescript
export class TaskService {
    constructor(
        private taskRepo: TaskRepository,
        private jobRepo: JobRepository,
        private queueService: QueueService,
        private storageService: StorageService
    ) {}

    async createTask(entryUrl: string): Promise<string> {
        const taskId = generateUUID();
        
        // 1. 创建任务实体
        const task = TaskEntity.create({
            taskId,
            entryUrl,
            status: 'active',
            createdAt: new Date()
        });
        
        // 2. 保存任务到存储
        await this.taskRepo.save(task);
        
        // 3. 创建存储目录
        await this.storageService.createTaskDirectories(taskId);
        
        // 4. 添加到队列 - 解耦队列操作
        await this.queueService.addTaskRequest(taskId, entryUrl);
        
        return taskId;
    }

    async getTaskStatus(taskId: string): Promise<ITaskStatusResponse> {
        // 1. 获取任务基本信息
        const task = await this.taskRepo.findById(taskId);
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }
        
        // 2. 获取所有相关 Job
        const jobs = await this.jobRepo.findByTaskId(taskId);
        
        // 3. 统计状态
        return TaskStatusCalculator.calculate(task, jobs);
    }

    async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
        const task = await this.taskRepo.findById(taskId);
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }
        
        task.updateStatus(status);
        await this.taskRepo.save(task);
    }
}
```

#### 2. TaskRepository - 任务存储层

```typescript
export class TaskRepository {
    constructor(private storageService: StorageService) {}
    
    async save(task: TaskEntity): Promise<void> {
        const filePath = path.join(CONFIG.TASKS_BASE_PATH, 'tasks.json');
        
        // 读取现有任务
        const existingTasks = await this.findAll();
        
        // 更新或添加
        const updatedTasks = existingTasks.filter(t => t.taskId !== task.taskId);
        updatedTasks.push(task.toJSON());
        
        await this.storageService.writeJSON(filePath, { tasks: updatedTasks });
    }
    
    async findById(taskId: string): Promise<TaskEntity | null> {
        const tasks = await this.findAll();
        const taskData = tasks.find(t => t.taskId === taskId);
        
        return taskData ? TaskEntity.fromJSON(taskData) : null;
    }
    
    async findAll(): Promise<ITask[]> {
        const filePath = path.join(CONFIG.TASKS_BASE_PATH, 'tasks.json');
        const data = await this.storageService.readJSON<{tasks: ITask[]}>(filePath);
        
        return data?.tasks || [];
    }
    
    async findByStatus(status: TaskStatus): Promise<ITask[]> {
        const tasks = await this.findAll();
        return tasks.filter(task => task.status === status);
    }
}
```

#### 3. JobRepository - Job 存储层

```typescript
export class JobRepository {
    constructor(private storageService: StorageService) {}
    
    async save(job: JobEntity): Promise<void> {
        const filePath = path.join(CONFIG.TASKS_BASE_PATH, `jobs-${job.taskId}.json`);
        
        // 读取现有 Jobs
        const existingJobs = await this.findByTaskId(job.taskId);
        
        // 更新或添加
        const updatedJobs = existingJobs.filter(j => j.jobId !== job.jobId);
        updatedJobs.push(job.toJSON());
        
        await this.storageService.writeJSON(filePath, { jobs: updatedJobs });
    }
    
    async findByTaskId(taskId: string): Promise<IJob[]> {
        const filePath = path.join(CONFIG.TASKS_BASE_PATH, `jobs-${taskId}.json`);
        const data = await this.storageService.readJSON<{jobs: IJob[]}>(filePath);
        
        return data?.jobs || [];
    }
    
    async findById(taskId: string, jobId: string): Promise<JobEntity | null> {
        const jobs = await this.findByTaskId(taskId);
        const jobData = jobs.find(j => j.jobId === jobId);
        
        return jobData ? JobEntity.fromJSON(jobData) : null;
    }
    
    async countByStatus(taskId: string, status: JobStatus): Promise<number> {
        const jobs = await this.findByTaskId(taskId);
        return jobs.filter(job => job.status === status).length;
    }
}
```

#### 4. QueueService - 队列操作服务

```typescript
export class QueueService {
    private globalQueue: RequestQueue;
    
    async initialize(): Promise<void> {
        this.globalQueue = await RequestQueue.open(CONFIG.GLOBAL_QUEUE_NAME, {
            storageDir: CONFIG.GLOBAL_QUEUE_STORAGE_DIR
        });
    }
    
    async addTaskRequest(taskId: string, url: string): Promise<void> {
        await this.globalQueue.addRequest({
            url,
            userData: {
                taskId,
                isEntryUrl: true,
                createdAt: new Date().toISOString()
            }
        });
        
        Logger.info('Request added to queue', { taskId, url });
    }
    
    async getQueueInfo(): Promise<{ pending: number; handled: number }> {
        return {
            pending: await this.globalQueue.getPendingRequestCount(),
            handled: await this.globalQueue.getHandledRequestCount()
        };
    }
}
```

#### 5. StorageService - 文件存储服务

```typescript
export class StorageService {
    async writeJSON(filePath: string, data: any): Promise<void> {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJSON(filePath, data, { spaces: 2 });
    }
    
    async readJSON<T>(filePath: string): Promise<T | null> {
        try {
            return await fs.readJSON(filePath);
        } catch {
            return null;
        }
    }
    
    async createTaskDirectories(taskId: string): Promise<void> {
        const taskDataDir = path.join(CONFIG.DATA_BASE_PATH, `task-${taskId}`);
        const pagesDir = path.join(taskDataDir, 'pages');
        
        await fs.ensureDir(taskDataDir);
        await fs.ensureDir(pagesDir);
    }
    
    async savePageData(taskId: string, jobId: string, data: any): Promise<void> {
        const filePath = path.join(
            CONFIG.DATA_BASE_PATH, 
            `task-${taskId}`, 
            'pages', 
            `page-${jobId}.json`
        );
        
        await this.writeJSON(filePath, data);
    }
}
```

### 实体类设计

#### TaskEntity - 任务实体

```typescript
export class TaskEntity {
    constructor(
        public readonly taskId: string,
        public readonly entryUrl: string,
        public status: TaskStatus,
        public readonly createdAt: Date,
        public updatedAt?: Date
    ) {}
    
    static create(data: {
        taskId: string;
        entryUrl: string;
        status: TaskStatus;
        createdAt: Date;
    }): TaskEntity {
        return new TaskEntity(
            data.taskId,
            data.entryUrl, 
            data.status,
            data.createdAt
        );
    }
    
    static fromJSON(data: ITask): TaskEntity {
        return new TaskEntity(
            data.taskId,
            data.entryUrl,
            data.status,
            new Date(data.createdAt),
            data.updatedAt ? new Date(data.updatedAt) : undefined
        );
    }
    
    updateStatus(status: TaskStatus): void {
        this.status = status;
        this.updatedAt = new Date();
    }
    
    toJSON(): ITask {
        return {
            taskId: this.taskId,
            entryUrl: this.entryUrl,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            queuePath: CONFIG.GLOBAL_QUEUE_STORAGE_DIR,
            storagePath: path.join(CONFIG.DATA_BASE_PATH, `task-${this.taskId}`)
        };
    }
}
```

### 工具类 - TaskStatusCalculator

```typescript
export class TaskStatusCalculator {
    static calculate(task: TaskEntity, jobs: IJob[]): ITaskStatusResponse {
        const totalUrls = jobs.length;
        const completedCount = jobs.filter(job => job.status === 'completed').length;
        const failedCount = jobs.filter(job => job.status === 'failed').length;
        const pendingCount = jobs.filter(job => 
            job.status === 'pending' || job.status === 'in-progress'
        ).length;
        
        return {
            totalUrls,
            completedCount,
            failedCount,
            pendingCount,
            jobs: jobs.slice(0, 50) // 限制返回数量
        };
    }
}
```

### 依赖注入容器设计

```typescript
export class ServiceContainer {
    private static instance: ServiceContainer;
    
    private storageService: StorageService;
    private queueService: QueueService;
    private taskRepository: TaskRepository;
    private jobRepository: JobRepository;
    private taskService: TaskService;
    
    private constructor() {
        this.initializeServices();
    }
    
    static getInstance(): ServiceContainer {
        if (!this.instance) {
            this.instance = new ServiceContainer();
        }
        return this.instance;
    }
    
    private initializeServices(): void {
        // 基础服务
        this.storageService = new StorageService();
        this.queueService = new QueueService();
        
        // 数据访问层
        this.taskRepository = new TaskRepository(this.storageService);
        this.jobRepository = new JobRepository(this.storageService);
        
        // 业务逻辑层
        this.taskService = new TaskService(
            this.taskRepository,
            this.jobRepository,
            this.queueService,
            this.storageService
        );
    }
    
    async initialize(): Promise<void> {
        await this.queueService.initialize();
    }
    
    getTaskService(): TaskService {
        return this.taskService;
    }
    
    getJobRepository(): JobRepository {
        return this.jobRepository;
    }
    
    getStorageService(): StorageService {
        return this.storageService;
    }
}
```

### API 层使用示例

```typescript
// API 路由中的使用
const container = ServiceContainer.getInstance();
await container.initialize();

const taskService = container.getTaskService();

// 创建任务
fastify.post('/crawler/start', {
    schema: {
        body: CreateTaskRequestSchema,
        response: { 200: CreateTaskResponseSchema }
    }
}, async (request) => {
    const { url } = request.body;
    const taskId = await taskService.createTask(url);
    
    Logger.info('Created new crawl task', { taskId, url }, 'api');
    
    return { taskId };
});

// 获取任务状态
fastify.get('/crawler/status/:taskId', {
    schema: {
        params: GetTaskParamsSchema,
        response: { 200: ITaskStatusResponseSchema }
    }
}, async (request) => {
    const { taskId } = request.params;
    const status = await taskService.getTaskStatus(taskId);
    
    return status;
});
```

## 优化总结

### ✅ 解决的问题

1. **职责分离**：每个类只负责一个职责
   - TaskService: 业务逻辑
   - Repository: 数据访问
   - QueueService: 队列操作
   - StorageService: 文件操作

2. **依赖解耦**：通过依赖注入减少耦合
3. **可测试性**：每个服务都可以独立测试
4. **可维护性**：代码结构清晰，易于修改和扩展

### 📁 新的文件结构

```
src/
├── services/
│   ├── task.service.ts           # 任务业务逻辑
│   ├── queue.service.ts          # 队列服务
│   └── storage.service.ts        # 存储服务
├── repositories/
│   ├── task.repository.ts        # 任务数据访问
│   └── job.repository.ts         # Job 数据访问
├── entities/
│   ├── task.entity.ts            # 任务实体
│   └── job.entity.ts             # Job 实体
├── utils/
│   ├── service-container.ts      # 依赖注入容器
│   └── task-status-calculator.ts # 状态计算工具
```

这种设计遵循了 **SOLID 原则**，使代码更加清晰、可维护和可测试。

## Worker 层设计 (worker.ts)

### 核心类设计

#### CrawlerWorker

```typescript
class CrawlerWorker {
    private crawler: PlaywrightCrawler;
    private taskService: TaskService;
    private queueService: QueueService;
    private storageService: StorageService;
    private isRunning: boolean;
    private globalRequestQueue: RequestQueue;

    constructor();
    
    async start(): Promise<void>;
    async stop(): Promise<void>;
    
    private async handleRequest(context: PlaywrightCrawlingContext): Promise<void>;
    private async handleFailedRequest(context: PlaywrightCrawlingContext): Promise<void>;
    private async savePageData(taskId: string, jobId: string, data: any): Promise<void>;
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
    const { request, page } = context;
    const { jobId, taskId } = request.userData;
    
    if (!jobId || !taskId) {
        Logger.warn('Request missing jobId or taskId', { url: request.url }, 'worker');
        return;
    }
    
    // 1. 更新 job 状态为处理中
    await taskService.updateJob(taskId, jobId, {
        status: 'in-progress'
    });
    
    // 2. 提取页面信息
    const title = await page.title();
    const content = await page.textContent('body') || '';
    const url = request.loadedUrl || request.url;
    
    // 3. 提取同域名链接，为每个链接创建新 Job
    const currentDomain = new URL(url).hostname;
    const links = await page.$$eval('a[href]', anchors => 
        anchors.map(a => a.href).filter(Boolean)
    );
    
    const sameDomainLinks = links.filter(link => {
        try {
            return new URL(link).hostname === currentDomain;
        } catch {
            return false;
        }
    });
    
    // 4. 为每个发现的链接创建新 Job 并加入队列
    for (const link of sameDomainLinks) {
        const newJobId = await taskService.createJob(taskId, {
            url: link,
            status: 'pending'
        });
        await queueService.addJobRequest(newJobId, taskId, link);
    }
    
    // 5. 保存页面数据
    await savePageData(taskId, jobId, {
        title,
        content,
        url,
        links: sameDomainLinks,
        crawledAt: new Date()
    });
    
    // 6. 标记当前 Job 完成
    await taskService.updateJob(taskId, jobId, {
        status: 'completed',
        title,
        pageData: { content, links: sameDomainLinks }
    });
}
```

## 存储设计

### 目录结构

```
storage/
├── tasks/
│   └── {taskId}.json               # 任务元信息
├── queues/
│   └── global/                     # 全局 RequestQueue 存储目录 (Crawlee自动管理)
└── data/
    └── {taskId}/                   # 爬取数据存储
        ├── jobs.json               # 任务的所有 jobs 记录
        ├── pages/
        │   ├── page-{jobId}.json   # 单个页面详细数据
        │   └── ...
        └── summary.json            # 任务汇总信息(可选)
```

### 文件用途说明

- **tasks/{taskId}.json**: 存储任务元信息(taskId, entryUrl, status, 创建时间等)
- **data/{taskId}/jobs.json**: 存储任务下所有 Job 的基本信息(jobId, url, status, 时间戳等)，用于快速查询状态
- **data/{taskId}/pages/page-{jobId}.json**: 存储具体的页面爬取数据(标题、内容、链接等)
- **queues/global/**: 全局 RequestQueue 存储目录，由 Crawlee 自动管理

### 数据持久化

#### 任务文件 ({taskId}.json)

```json
{
    "taskId": "uuid",
    "entryUrl": "https://example.com",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "queuePath": "./storage/queues/global",
    "storagePath": "./storage/data/uuid"
}
```

#### Jobs 文件 (jobs.json)

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
    
    // RequestQueue 配置
    GLOBAL_QUEUE_NAME: 'global-crawler-queue',
    GLOBAL_QUEUE_STORAGE_DIR: './storage/queues/global',
    
    API_PORT: 3000,
    
    CRAWLER_OPTIONS: {
        maxRequestsPerCrawl: Infinity, // Worker 持续运行，不限制
        maxConcurrency: 5,
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 30,
        maxRequestRetries: 3
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
import { serviceContainer } from './container/service-container';
import { TaskNotFoundError } from './errors';
import { Logger, apiLogger } from './logger';
import { CreateTaskRequestSchema, CreateTaskResponseSchema, GetTaskParamsSchema } from './types/task';
import { ITaskStatusResponseSchema } from './types/job';

async function startApiServer() {
    const fastify = Fastify({
        logger: apiLogger // 直接使用配置好的 Pino 日志器
    }).withTypeProvider<ZodTypeProvider>();
    
    // 设置 Zod 类型提供器
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(serializerCompiler);
    
    const taskService = serviceContainer.getTaskService();
    
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
            const taskId = await taskService.createTask(url);
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
                200: ITaskStatusResponseSchema
            }
        }
    }, async (request, reply) => {
        try {
            const { taskId } = request.params as { taskId: string };
            const status = await taskService.getTaskStatus(taskId);
            return status;
        } catch (error) {
            Logger.error('Failed to get status', error as Error, { taskId }, 'api');
            if (error instanceof TaskNotFoundError) {
                reply.status(404);
            } else {
                reply.status(500);
            }
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
import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { Logger, workerLogger } from './logger';
import { serviceContainer } from './container/service-container';
import { TaskService } from './services/task-service';
import { QueueService } from './services/queue-service';
import { StorageService } from './services/storage-service';
import { CONFIG } from './config';

class CrawlerWorker {
    private crawler: PlaywrightCrawler;
    private taskService: TaskService;
    private queueService: QueueService;
    private storageService: StorageService;
    private isRunning: boolean = false;
    private globalRequestQueue: RequestQueue;

    constructor() {
        this.taskService = serviceContainer.getTaskService();
        this.queueService = serviceContainer.getQueueService();
        this.storageService = serviceContainer.getStorageService();
    }

    async start(): Promise<void> {
        Logger.info('Starting crawler worker...', {}, 'worker');
        
        // 初始化全局队列 - 与 API 共享同一个队列
        this.globalRequestQueue = await RequestQueue.open(CONFIG.GLOBAL_QUEUE_NAME, {
            storageDir: CONFIG.GLOBAL_QUEUE_STORAGE_DIR
        });
        
        // 创建单个 Crawler 实例处理所有任务
        this.crawler = new PlaywrightCrawler({
            requestQueue: this.globalRequestQueue,
            requestHandler: async (context) => {
                await this.handleRequest(context);
            },
            failedRequestHandler: async (context) => {
                await this.handleFailedRequest(context);
            },
            maxRequestsPerCrawl: CONFIG.CRAWLER_OPTIONS.maxRequestsPerCrawl,
            maxConcurrency: CONFIG.CRAWLER_OPTIONS.maxConcurrency,
            maxRequestRetries: CONFIG.CRAWLER_OPTIONS.maxRequestRetries,
            requestHandlerTimeoutSecs: CONFIG.CRAWLER_OPTIONS.requestHandlerTimeoutSecs,
            headless: true,
            launchContext: {
                useChrome: true
            }
        });

        this.isRunning = true;
        
        Logger.info('Crawler worker ready, waiting for requests...', {
            queueName: CONFIG.GLOBAL_QUEUE_NAME,
            maxConcurrency: CONFIG.CRAWLER_OPTIONS.maxConcurrency
        }, 'worker');
        
        // 启动爬虫 - 会自动监听队列中的请求
        await this.crawler.run();
    }

    async stop(): Promise<void> {
        this.isRunning = false;
        if (this.crawler) {
            await this.crawler.teardown();
        }
        Logger.info('Crawler worker stopped', {}, 'worker');
    }

    private async handleRequest(context: PlaywrightCrawlingContext): Promise<void> {
        const { request, page } = context;
        const { jobId, taskId } = request.userData;
        
        if (!jobId || !taskId) {
            Logger.warn('Request missing jobId or taskId', { url: request.url }, 'worker');
            return;
        }

        const taskLogger = workerLogger.child({ taskId, jobId, url: request.url });
        
        try {
            taskLogger.info('Processing request');
            
            // 更新 Job 状态为处理中
            await this.taskService.updateJob(taskId, jobId, {
                status: 'in-progress'
            });

            // 提取页面信息
            const title = await page.title();
            const content = await page.textContent('body') || '';
            
            // 提取同域名链接，为每个链接创建新的 Job
            const currentDomain = new URL(request.url).hostname;
            const links = await page.$$eval('a[href]', anchors => 
                anchors.map(a => a.href).filter(Boolean)
            );
            
            const sameDomainLinks = links.filter(url => {
                try {
                    return new URL(url).hostname === currentDomain;
                } catch {
                    return false;
                }
            });
            
            // 为每个发现的链接创建新 Job 并添加到队列
            for (const link of sameDomainLinks) {
                const newJobId = await this.taskService.createJob(taskId, {
                    url: link,
                    status: 'pending'
                });
                await this.queueService.addJobRequest(newJobId, taskId, link);
            }

            // 保存页面数据
            await this.savePageData(taskId, jobId, {
                title,
                content,
                url: request.url,
                links: sameDomainLinks,
                crawledAt: new Date()
            });

            // 更新当前 Job 状态为完成
            await this.taskService.updateJob(taskId, jobId, {
                status: 'completed',
                title,
                pageData: { content, links: sameDomainLinks }
            });

            taskLogger.info('Request processed successfully');

        } catch (error) {
            taskLogger.error('Failed to process request', error as Error);
            
            // 更新 Job 状态为失败
            await this.taskService.updateJob(taskId, jobId, {
                status: 'failed',
                error: (error as Error).message
            });
            
            throw error; // 重新抛出错误，让 Crawlee 处理重试
        }
    }

    private async handleFailedRequest(context: PlaywrightCrawlingContext): Promise<void> {
        const { request } = context;
        const { jobId, taskId } = request.userData;
        
        Logger.error('Request failed permanently', request.errorMessages?.[0], {
            taskId,
            jobId,
            url: request.url,
            retryCount: request.retryCount
        }, 'worker');
        
        if (jobId && taskId) {
            await this.taskService.updateJob(taskId, jobId, {
                status: 'failed',
                error: request.errorMessages?.[0] || 'Unknown error'
            });
        }
    }

    private async savePageData(taskId: string, jobId: string, data: any): Promise<void> {
        // 保存页面数据到文件
        const filePath = path.join(CONFIG.DATA_BASE_PATH, taskId, 'pages', `page-${jobId}.json`);
        await this.storageService.writeJSON(filePath, data);
    }
}

// 启动入口
async function startCrawlerWorker() {
    const worker = new CrawlerWorker();
    
    // 优雅关闭处理
    process.on('SIGINT', async () => {
        Logger.info('Received SIGINT, shutting down gracefully...', {}, 'worker');
        await worker.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        Logger.info('Received SIGTERM, shutting down gracefully...', {}, 'worker');
        await worker.stop();
        process.exit(0);
    });
    
    await worker.start();
}

if (require.main === module) {
    startCrawlerWorker().catch((error) => {
        Logger.error('Failed to start crawler worker', error, {}, 'worker');
        process.exit(1);
    });
}
```

## RequestQueue 共享机制说明

### Crawlee RequestQueue 的工作原理

Crawlee 的 RequestQueue 是基于**文件系统存储**的，多个进程可以通过相同的队列名和存储目录访问同一个队列：

```typescript
// API 进程中
const globalQueue = await RequestQueue.open('global-crawler-queue', {
    storageDir: './storage/queues/global'
});

// Worker 进程中  
const globalQueue = await RequestQueue.open('global-crawler-queue', {  // 相同队列名
    storageDir: './storage/queues/global'  // 相同存储目录
});
// → 两个进程访问的是同一个队列！
```

### 队列文件结构

```
storage/queues/global/
├── __CRAWLEE_REQUEST_QUEUE__/
│   ├── requests.json           # 队列请求列表
│   ├── handled_request_count   # 已处理计数
│   ├── pending_request_count   # 待处理计数
│   └── request_lock_*          # 请求锁文件
```

### 工作流程

1. **API 进程**:

   ```typescript
   // 创建任务时直接添加到队列
   await globalQueue.addRequest({
       url: entryUrl,
       userData: { taskId, isEntryUrl: true }
   });
   ```

2. **Worker 进程**:

   ```typescript
   // Crawler 自动监听队列，无需主动扫描
   const crawler = new PlaywrightCrawler({
       requestQueue: globalQueue,  // 自动处理队列中的请求
       requestHandler: handleRequest
   });
   await crawler.run(); // 持续监听和处理
   ```

3. **自动同步**: Crawlee 通过文件锁机制确保多进程安全访问

### 优势对比

#### ❌ 之前的方案（有问题）

```typescript
// 问题：需要手动扫描和同步
setInterval(() => {
    const newTasks = await scanNewTasks();
    for (const task of newTasks) {
        await queue.addRequest(task); // 手动添加
    }
}, 5000);
```

#### ✅ 优化后的方案

```typescript
// API: 直接添加到队列
await globalQueue.addRequest(request);

// Worker: 自动处理
await crawler.run(); // Crawlee 自动监听队列
```

## Worker 架构设计说明

### 为什么使用单个 Crawler 实例而非每个 Task 一个实例？

**单机 SaaS 服务的最佳实践是使用单个 Crawler 实例**，原因如下：

#### 1. 资源效率

- **浏览器进程复用**: 避免为每个任务启动独立的浏览器实例
- **内存优化**: 单个 PlaywrightCrawler 可以高效管理浏览器池
- **连接复用**: HTTP/HTTPS 连接可以在不同任务间复用

#### 2. 并发控制

- **统一并发管理**: 通过 `maxConcurrency` 控制整个系统的并发度
- **避免资源竞争**: 防止多个 Crawler 实例争夺系统资源
- **更好的负载控制**: 单点控制所有爬虫活动

#### 3. 队列管理简化

```typescript
// ❌ 每个任务独立队列 - 复杂且资源浪费
const taskACrawler = new PlaywrightCrawler({ requestQueue: taskAQueue });
const taskBCrawler = new PlaywrightCrawler({ requestQueue: taskBQueue });

// ✅ 全局队列 - 简单高效
const globalCrawler = new PlaywrightCrawler({ 
    requestQueue: globalQueue,
    requestHandler: (ctx) => handleRequestByTaskId(ctx)
});
```

#### 4. 状态管理

- **统一生命周期**: 一个启动/停止流程管理所有任务
- **简化错误处理**: 集中的错误处理和重试机制
- **优雅关闭**: 容易实现所有任务的统一关闭

#### 5. 可观测性

```typescript
// 统一的指标收集
const metrics = {
    totalRequests: globalQueue.handledRequestCount,
    pendingRequests: globalQueue.pendingRequestCount,
    runningTasks: activeTasks.length
};
```

### 架构对比

#### 多实例架构（不推荐）

```typescript
// 问题：资源浪费、管理复杂
class TaskSpecificWorker {
    async processTask(taskId: string) {
        const crawler = new PlaywrightCrawler({ // 每个任务新实例
            requestQueue: await RequestQueue.open(taskId),
            maxConcurrency: 2 // 难以全局控制并发
        });
        await crawler.run();
        await crawler.teardown(); // 频繁创建/销毁
    }
}
```

#### 单实例架构（推荐）

```typescript
// 优势：资源高效、管理简单
class GlobalCrawlerWorker {
    private crawler: PlaywrightCrawler; // 单一实例
    
    async start() {
        this.crawler = new PlaywrightCrawler({
            requestQueue: this.globalQueue, // 全局队列
            maxConcurrency: 5, // 统一并发控制
            requestHandler: this.routeByTaskId // 智能路由
        });
        await this.crawler.run(); // 持续运行
    }
}
```

### 扩展策略

当业务增长需要扩展时：

1. **垂直扩展**: 增加单机的 `maxConcurrency`
2. **水平扩展**: 启动多个 Worker 进程共享全局队列
3. **分布式扩展**: 使用 Redis 队列 + 多机器部署

```typescript
// 水平扩展示例
// worker-1: maxConcurrency: 5
// worker-2: maxConcurrency: 5  
// 总并发: 10，共享同一个队列
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
    ITaskStatusResponseSchema as ITaskStatusResponseSchema
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
                200: ITaskStatusResponseSchema
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
    async getTaskStatus(taskId: string): Promise<ITaskStatusResponse>
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
export const ITaskStatusResponseSchema = z.enum(['active', 'completed', 'failed']);

export const TaskSchema = z.object({
    taskId: z.string().uuid(),
    entryUrl: z.string().url(),
    status: ITaskStatusResponseSchema,
    createdAt: z.date(),
    queuePath: z.string(),
    storagePath: z.string()
});

// TypeScript 类型推导
export type TaskStatus = z.infer<typeof ITaskStatusResponseSchema>;
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

export const ITaskStatusResponseSchema = z.object({
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
export type ITaskStatusResponse = z.infer<typeof ITaskStatusResponseSchema>;
```

## 优化后的 TaskManager 实现 - 分层架构

### 核心概念关系

**Task 与 Job 的正确关系：**

- **1个 Task = 1个 API 请求**：每次调用 `/crawler/start` 接口创建一个 Task
- **1个 Job = 1个 URL**：每个要爬取的具体页面对应一个 Job
- **Task 管理 Job**：Task 负责跟踪和管理所属的所有 Job
- **RequestQueue 存储 Job**：往 RequestQueue 里添加的是具体的 Job，不是 Task

**工作流程：**

1. API 接收请求 → 创建 Task → 为入口 URL 创建第一个 Job → Job 进入 RequestQueue
2. Worker 从 RequestQueue 取出 Job → 处理页面 → 发现新链接 → 为每个新链接创建新 Job → 新 Job 进入 RequestQueue
3. 循环执行直到队列为空

## 优化后的 TaskManager 实现 - 分层架构

### 实体层 (Entity Layer)

**src/entities/task-entity.ts**

```typescript
export class TaskEntity {
    constructor(
        public readonly taskId: string,
        public readonly entryUrl: string,
        public status: TaskStatus,
        public readonly createdAt: Date,
        public completedAt?: Date,
        public readonly queuePath?: string,
        public readonly storagePath?: string
    ) {}

    static create(data: {
        taskId: string;
        entryUrl: string;
        status: TaskStatus;
        createdAt: Date;
    }): TaskEntity {
        return new TaskEntity(
            data.taskId,
            data.entryUrl,
            data.status,
            data.createdAt
        );
    }

    markCompleted(): void {
        this.status = 'completed';
        this.completedAt = new Date();
    }

    markFailed(): void {
        this.status = 'failed';
        this.completedAt = new Date();
    }

    toJSON(): ITask {
        return {
            taskId: this.taskId,
            entryUrl: this.entryUrl,
            status: this.status,
            createdAt: this.createdAt,
            completedAt: this.completedAt,
            queuePath: this.queuePath || '',
            storagePath: this.storagePath || ''
        };
    }
}
```

**src/entities/job-entity.ts**

```typescript
export class JobEntity {
    constructor(
        public readonly jobId: string,
        public readonly url: string,
        public readonly taskId: string,
        public status: JobStatus,
        public readonly createdAt: Date,
        public title?: string,
        public startedAt?: Date,
        public completedAt?: Date,
        public error?: string,
        public pageData?: PageData
    ) {}

    static create(data: {
        jobId: string;
        url: string;
        taskId: string;
        status: JobStatus;
        createdAt: Date;
    }): JobEntity {
        return new JobEntity(
            data.jobId,
            data.url,
            data.taskId,
            data.status,
            data.createdAt
        );
    }

    markInProgress(): void {
        this.status = 'in-progress';
        this.startedAt = new Date();
    }

    markCompleted(title: string, pageData?: PageData): void {
        this.status = 'completed';
        this.title = title;
        this.completedAt = new Date();
        this.pageData = pageData;
    }

    markFailed(error: string): void {
        this.status = 'failed';
        this.error = error;
        this.completedAt = new Date();
    }

    toJSON(): IJob {
        return {
            jobId: this.jobId,
            url: this.url,
            status: this.status,
            title: this.title,
            taskId: this.taskId,
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            error: this.error,
            pageData: this.pageData
        };
    }
}
```

### 仓储层 (Repository Layer)

**src/repositories/task-repository.ts**

```typescript
import { TaskEntity } from '../entities/task-entity';
import { StorageService } from '../services/storage-service';
import { CONFIG } from '../config';
import path from 'path';

export class TaskRepository {
    constructor(private storageService: StorageService) {}

    async save(task: TaskEntity): Promise<void> {
        const taskPath = path.join(CONFIG.TASKS_BASE_PATH, `${task.taskId}.json`);
        await this.storageService.writeJSON(taskPath, task.toJSON());
    }

    async findById(taskId: string): Promise<TaskEntity | null> {
        const taskPath = path.join(CONFIG.TASKS_BASE_PATH, `${taskId}.json`);
        const taskData = await this.storageService.readJSON<ITask>(taskPath);
        
        if (!taskData) return null;
        
        return new TaskEntity(
            taskData.taskId,
            taskData.entryUrl,
            taskData.status,
            taskData.createdAt,
            taskData.completedAt,
            taskData.queuePath,
            taskData.storagePath
        );
    }

    async findAll(): Promise<TaskEntity[]> {
        const taskFiles = await this.storageService.listFiles(CONFIG.TASKS_BASE_PATH, '*.json');
        const tasks: TaskEntity[] = [];

        for (const file of taskFiles) {
            const task = await this.findById(path.basename(file, '.json'));
            if (task) tasks.push(task);
        }

        return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async update(taskId: string, updates: Partial<ITask>): Promise<void> {
        const task = await this.findById(taskId);
        if (!task) throw new TaskNotFoundError(taskId);

        const updatedTask = { ...task.toJSON(), ...updates };
        await this.save(new TaskEntity(
            updatedTask.taskId,
            updatedTask.entryUrl,
            updatedTask.status,
            updatedTask.createdAt,
            updatedTask.completedAt,
            updatedTask.queuePath,
            updatedTask.storagePath
        ));
    }
}
```

**src/repositories/job-repository.ts**

```typescript
import { JobEntity } from '../entities/job-entity';
import { StorageService } from '../services/storage-service';
import { CONFIG } from '../config';
import path from 'path';

export class JobRepository {
    constructor(private storageService: StorageService) {}

    async save(job: JobEntity): Promise<void> {
        const jobsPath = this.getJobsFilePath(job.taskId);
        const existingJobs = await this.findByTaskId(job.taskId);
        
        // 更新或添加 job
        const jobIndex = existingJobs.findIndex(j => j.jobId === job.jobId);
        if (jobIndex >= 0) {
            existingJobs[jobIndex] = job;
        } else {
            existingJobs.push(job);
        }

        const jobsData = existingJobs.map(j => j.toJSON());
        await this.storageService.writeJSON(jobsPath, jobsData);
    }

    async findById(taskId: string, jobId: string): Promise<JobEntity | null> {
        const jobs = await this.findByTaskId(taskId);
        return jobs.find(job => job.jobId === jobId) || null;
    }

    async findByTaskId(taskId: string): Promise<JobEntity[]> {
        const jobsPath = this.getJobsFilePath(taskId);
        const jobsData = await this.storageService.readJSON<IJob[]>(jobsPath);
        
        if (!jobsData) return [];
        
        return jobsData.map(data => new JobEntity(
            data.jobId,
            data.url,
            data.taskId,
            data.status,
            data.createdAt,
            data.title,
            data.startedAt,
            data.completedAt,
            data.error,
            data.pageData
        ));
    }

    async findByStatus(taskId: string, status: JobStatus): Promise<JobEntity[]> {
        const jobs = await this.findByTaskId(taskId);
        return jobs.filter(job => job.status === status);
    }

    async getTaskStats(taskId: string): Promise<{
        totalUrls: number;
        completedCount: number;
        failedCount: number;
        pendingCount: number;
        inProgressCount: number;
    }> {
        const jobs = await this.findByTaskId(taskId);
        
        return {
            totalUrls: jobs.length,
            completedCount: jobs.filter(j => j.status === 'completed').length,
            failedCount: jobs.filter(j => j.status === 'failed').length,
            pendingCount: jobs.filter(j => j.status === 'pending').length,
            inProgressCount: jobs.filter(j => j.status === 'in-progress').length
        };
    }

    private getJobsFilePath(taskId: string): string {
        return path.join(CONFIG.DATA_BASE_PATH, taskId, 'jobs.json');
    }
}
```

### 服务层 (Service Layer)

**src/services/storage-service.ts**

```typescript
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

export class StorageService {
    async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async writeJSON(filePath: string, data: any): Promise<void> {
        await this.ensureDirectoryExists(path.dirname(filePath));
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    async readJSON<T>(filePath: string): Promise<T | null> {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content) as T;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    async appendToFile(filePath: string, content: string): Promise<void> {
        await this.ensureDirectoryExists(path.dirname(filePath));
        await fs.appendFile(filePath, content, 'utf8');
    }

    async listFiles(dirPath: string, pattern: string = '*'): Promise<string[]> {
        try {
            const fullPattern = path.join(dirPath, pattern);
            return await glob(fullPattern);
        } catch (error) {
            return [];
        }
    }

    async createTaskDirectories(taskId: string): Promise<void> {
        const taskDataPath = path.join(CONFIG.DATA_BASE_PATH, taskId);
        const taskQueuePath = path.join(CONFIG.QUEUE_BASE_PATH, taskId);
        
        await Promise.all([
            this.ensureDirectoryExists(taskDataPath),
            this.ensureDirectoryExists(taskQueuePath),
            this.ensureDirectoryExists(CONFIG.TASKS_BASE_PATH)
        ]);
    }
}
```

**src/services/queue-service.ts**

```typescript
import { RequestQueue } from 'crawlee';
import { CONFIG } from '../config';

export class QueueService {
    private globalQueue: RequestQueue | null = null;

    async getGlobalQueue(): Promise<RequestQueue> {
        if (!this.globalQueue) {
            this.globalQueue = await RequestQueue.open(CONFIG.GLOBAL_QUEUE_NAME, {
                storageDir: CONFIG.GLOBAL_QUEUE_STORAGE_DIR
            });
        }
        return this.globalQueue;
    }

    async addJobRequest(jobId: string, taskId: string, url: string): Promise<void> {
        const queue = await this.getGlobalQueue();
        await queue.addRequest({
            url,
            userData: { jobId, taskId }
        });
    }

    async getQueueInfo(): Promise<{
        totalRequestCount: number;
        handledRequestCount: number;
        pendingRequestCount: number;
    }> {
        const queue = await this.getGlobalQueue();
        return {
            totalRequestCount: await queue.getTotalCount(),
            handledRequestCount: await queue.getHandledCount(),
            pendingRequestCount: await queue.getTotalCount() - await queue.getHandledCount()
        };
    }
}
```

**src/services/task-service.ts**

```typescript
import { v4 as generateUUID } from 'uuid';
import { TaskRepository } from '../repositories/task-repository';
import { JobRepository } from '../repositories/job-repository';
import { QueueService } from './queue-service';
import { StorageService } from './storage-service';
import { TaskEntity } from '../entities/task-entity';
import { JobEntity } from '../entities/job-entity';

export class TaskService {
    constructor(
        private taskRepo: TaskRepository,
        private jobRepo: JobRepository,
        private queueService: QueueService,
        private storageService: StorageService
    ) {}

    async createTask(entryUrl: string): Promise<string> {
        const taskId = generateUUID();
        
        const task = TaskEntity.create({
            taskId,
            entryUrl,
            status: 'active',
            createdAt: new Date()
        });

        await this.storageService.createTaskDirectories(taskId);
        await this.taskRepo.save(task);
        
        // 为入口 URL 创建第一个 Job 并添加到队列
        const jobId = await this.createJob(taskId, {
            url: entryUrl,
            status: 'pending'
        });
        await this.queueService.addJobRequest(jobId, taskId, entryUrl);

        return taskId;
    }

    async getTask(taskId: string): Promise<TaskEntity | null> {
        return await this.taskRepo.findById(taskId);
    }

    async getTaskStatus(taskId: string): Promise<ITaskStatusResponse> {
        const task = await this.taskRepo.findById(taskId);
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }

        const jobs = await this.jobRepo.findByTaskId(taskId);
        const stats = await this.jobRepo.getTaskStats(taskId);

        return {
            totalUrls: stats.totalUrls,
            completedCount: stats.completedCount,
            failedCount: stats.failedCount,
            pendingCount: stats.pendingCount + stats.inProgressCount,
            jobs: jobs.map(job => job.toJSON())
        };
    }

    async createJob(taskId: string, jobData: {
        url: string;
        status: JobStatus;
    }): Promise<string> {
        const jobId = generateUUID();
        
        const job = JobEntity.create({
            jobId,
            url: jobData.url,
            taskId,
            status: jobData.status,
            createdAt: new Date()
        });

        await this.jobRepo.save(job);
        return jobId;
    }

    async updateJob(taskId: string, jobId: string, updates: {
        status?: JobStatus;
        title?: string;
        error?: string;
        pageData?: PageData;
    }): Promise<void> {
        const job = await this.jobRepo.findById(taskId, jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        if (updates.status === 'completed' && updates.title) {
            job.markCompleted(updates.title, updates.pageData);
        } else if (updates.status === 'failed' && updates.error) {
            job.markFailed(updates.error);
        } else if (updates.status === 'in-progress') {
            job.markInProgress();
        }

        await this.jobRepo.save(job);
    }
}
```

### 依赖注入容器 (Service Container)

**src/container/service-container.ts**

```typescript
import { TaskRepository } from '../repositories/task-repository';
import { JobRepository } from '../repositories/job-repository';
import { StorageService } from '../services/storage-service';
import { QueueService } from '../services/queue-service';
import { TaskService } from '../services/task-service';

export class ServiceContainer {
    private storageService: StorageService;
    private queueService: QueueService;
    private taskRepository: TaskRepository;
    private jobRepository: JobRepository;
    private taskService: TaskService;

    constructor() {
        this.initializeServices();
    }

    private initializeServices(): void {
        // 基础服务
        this.storageService = new StorageService();
        this.queueService = new QueueService();

        // 仓储层
        this.taskRepository = new TaskRepository(this.storageService);
        this.jobRepository = new JobRepository(this.storageService);

        // 业务服务层
        this.taskService = new TaskService(
            this.taskRepository,
            this.jobRepository,
            this.queueService,
            this.storageService
        );
    }

    getTaskService(): TaskService {
        return this.taskService;
    }

    getStorageService(): StorageService {
        return this.storageService;
    }

    getQueueService(): QueueService {
        return this.queueService;
    }
}

// 全局容器实例
export const serviceContainer = new ServiceContainer();
```

### 集成使用示例

**API 服务器中的使用**

```typescript
// src/api/routes/tasks.ts
import { serviceContainer } from '../../container/service-container';

const taskService = serviceContainer.getTaskService();

export async function createTaskHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { url } = request.body as CreateTaskRequest;
        const taskId = await taskService.createTask(url);
        return { taskId };
    } catch (error) {
        reply.status(500);
        return { error: (error as Error).message };
    }
}

export async function getTaskStatusHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const { taskId } = request.params as GetTaskParams;
        const status = await taskService.getTaskStatus(taskId);
        return status;
    } catch (error) {
        if (error instanceof TaskNotFoundError) {
            reply.status(404);
        } else {
            reply.status(500);
        }
        return { error: (error as Error).message };
    }
}
```

**Worker 进程中的使用**

```typescript
// src/worker/crawler-worker.ts
import { serviceContainer } from '../container/service-container';

export class CrawlerWorker {
    private taskService = serviceContainer.getTaskService();
    private queueService = serviceContainer.getQueueService();
    
    private async handleRequest(context: PlaywrightCrawlingContext): Promise<void> {
        const { request, page, enqueueLinks } = context;
        const { jobId, taskId } = request.userData;
        
        if (!jobId || !taskId) {
            Logger.warn('Request missing jobId or taskId', { url: request.url }, 'worker');
            return;
        }
        
        try {
            // 更新 Job 状态为处理中
            await this.taskService.updateJob(taskId, jobId, {
                status: 'in-progress'
            });
            
            // 处理页面...
            const title = await page.title();
            const content = await page.textContent('body') || '';
            
            // 提取同域名链接，为每个链接创建新的 Job
            const currentDomain = new URL(request.url).hostname;
            const links = await page.$$eval('a[href]', anchors => 
                anchors.map(a => a.href).filter(Boolean)
            );
            
            const sameDomainLinks = links.filter(url => {
                try {
                    return new URL(url).hostname === currentDomain;
                } catch {
                    return false;
                }
            });
            
            // 为每个发现的链接创建新 Job 并添加到队列
            for (const link of sameDomainLinks) {
                const newJobId = await this.taskService.createJob(taskId, {
                    url: link,
                    status: 'pending'
                });
                await this.queueService.addJobRequest(newJobId, taskId, link);
            }
            
            // 更新当前 Job 状态为完成
            await this.taskService.updateJob(taskId, jobId, {
                status: 'completed',
                title,
                pageData: { content, links: sameDomainLinks }
            });
            
        } catch (error) {
            await this.taskService.updateJob(taskId, jobId, {
                status: 'failed',
                error: (error as Error).message
            });
        }
    }
}
```

### 架构优势

1. **关注点分离**: 每个层次职责明确，易于维护
2. **依赖注入**: 便于单元测试和模块替换
3. **类型安全**: 完整的 TypeScript 类型覆盖
4. **实体封装**: 业务逻辑封装在实体类中
5. **服务解耦**: 各服务通过接口交互，降低耦合
6. **扩展性**: 新增功能只需添加相应的服务和仓储

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
