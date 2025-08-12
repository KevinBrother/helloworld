# 通用爬虫工具系统设计文档

## 概述

本文档描述了通用爬虫工具的系统架构设计，该工具能够智能识别和爬取静态及动态网页内容，无需手动分析界面和API。系统采用微服务架构，支持高并发、高可用性，并提供友好的可视化配置界面。

### 设计目标
- **智能化**：自动识别页面结构和API接口
- **通用性**：支持各种类型的网站和数据格式
- **可扩展性**：支持大规模并发爬取任务
- **易用性**：提供直观的可视化配置界面
- **稳定性**：具备完善的反爬虫和错误处理机制

## 系统架构

### 整体架构图

```mermaid
graph TB
    subgraph "前端层"
        UI["React + TypeScript 管理界面"]
        WS["WebSocket 实时通信"]
    end
    
    subgraph "API网关层"
        Gateway["NestJS API Gateway"]
        Auth["JWT 认证中间件"]
        RateLimit["限流中间件"]
    end
    
    subgraph "核心服务层"
        TaskService["任务管理服务"]
        SpiderService["爬虫引擎服务"]
        DataService["数据处理服务"]
        ConfigService["配置管理服务"]
        MonitorService["监控服务"]
    end
    
    subgraph "爬虫引擎层"
        Playwright["Playwright 引擎"]
        Puppeteer["Puppeteer 引擎"]
        HttpClient["HTTP 客户端"]
        ProxyPool["代理池"]
    end
    
    subgraph "数据存储层"
        MySQL[("MySQL\n配置&任务")]
        MongoDB[("MongoDB\n爬取数据")]
        Redis[("Redis\n缓存&队列")]
        MinIO[("MinIO\n文件存储")]
        ES[("Elasticsearch\n搜索&日志")]
    end
    
    subgraph "消息队列"
        Queue["Redis 任务队列"]
    end
    
    UI --> Gateway
    WS --> Gateway
    Gateway --> Auth
    Auth --> RateLimit
    RateLimit --> TaskService
    RateLimit --> SpiderService
    RateLimit --> DataService
    RateLimit --> ConfigService
    RateLimit --> MonitorService
    
    TaskService --> Queue
    SpiderService --> Playwright
    SpiderService --> Puppeteer
    SpiderService --> HttpClient
    SpiderService --> ProxyPool
    
    TaskService --> MySQL
    TaskService --> Redis
    SpiderService --> MongoDB
    SpiderService --> MinIO
    DataService --> MongoDB
    DataService --> ES
    ConfigService --> MySQL
    MonitorService --> ES
```

### 技术栈选择

基于技术调研结果 <mcreference link="https://scrapingant.com/blog/playwright-vs-puppeteer" index="1">1</mcreference> <mcreference link="https://medium.com/front-end-weekly/playwright-vs-puppeteer-choosing-the-right-browser-automation-tool-in-2024-d46d2cbadf71" index="2">2</mcreference>，我们选择以下技术栈：

#### 前端技术栈
- **React 18** + **TypeScript**：现代化的前端框架
- **Vite**：快速的构建工具
- **Tailwind CSS**：实用优先的CSS框架
- **React Query**：数据获取和状态管理
- **pnpm**：高效的包管理器

#### 后端技术栈
- **NestJS**：企业级Node.js框架
- **TypeScript**：类型安全的JavaScript
- **Playwright**（主要）：跨浏览器自动化工具 <mcreference link="https://scrapingant.com/blog/playwright-vs-puppeteer" index="1">1</mcreference>
- **Puppeteer**（备选）：Chrome自动化工具

#### 数据存储
- **MySQL**：关系型数据库，存储配置和任务信息
- **MongoDB**：文档数据库，存储爬取的非结构化数据
- **Redis**：内存数据库，用于缓存和消息队列
- **MinIO**：对象存储，用于媒体文件存储
- **Elasticsearch**：搜索引擎，用于日志分析和数据检索

### 设计决策记录 (ADR)

#### ADR-001: 选择Playwright作为主要爬虫引擎

**背景**：需要选择合适的浏览器自动化工具来实现动态页面爬取。

**考虑的方案**：
1. Playwright
2. Puppeteer
3. Selenium

**决策**：选择Playwright作为主要引擎，Puppeteer作为备选。

**理由**：
- Playwright支持多浏览器（Chromium、Firefox、WebKit） <mcreference link="https://scrapingant.com/blog/playwright-vs-puppeteer" index="1">1</mcreference>
- 原生支持并行执行，提高爬取效率 <mcreference link="https://scrapingant.com/blog/playwright-vs-puppeteer" index="1">1</mcreference>
- 更现代的API设计和更好的网络拦截能力 <mcreference link="https://medium.com/front-end-weekly/playwright-vs-puppeteer-choosing-the-right-browser-automation-tool-in-2024-d46d2cbadf71" index="2">2</mcreference>
- 自动等待机制减少了时序问题

**影响**：需要学习Playwright API，但长期收益更大。

#### ADR-002: 采用微服务架构

**背景**：系统需要支持高并发和可扩展性。

**决策**：采用基于NestJS的微服务架构。

**理由**：
- 服务解耦，便于独立开发和部署
- 支持水平扩展
- 故障隔离，提高系统稳定性
- 技术栈灵活性

#### ADR-003: 使用Redis作为消息队列

**背景**：需要处理大量异步爬取任务。

**决策**：使用Redis作为轻量级消息队列，保留RabbitMQ作为企业级升级选项。

**理由**：
- Redis部署简单，运维成本低
- 性能优秀，满足当前需求
- 可以复用现有Redis实例
- 后期可平滑升级到RabbitMQ

## 组件和接口

### 核心组件设计

#### 1. 任务管理服务 (TaskService)

**职责**：
- 任务的创建、调度、监控和管理
- 任务状态跟踪和更新
- 任务优先级和依赖关系处理

**主要接口**：
```typescript
interface TaskService {
  createTask(config: TaskConfig): Promise<Task>
  scheduleTask(taskId: string, schedule: ScheduleConfig): Promise<void>
  getTaskStatus(taskId: string): Promise<TaskStatus>
  cancelTask(taskId: string): Promise<void>
  getTaskResults(taskId: string): Promise<TaskResult[]>
}
```

#### 2. 爬虫引擎服务 (SpiderService)

**职责**：
- 页面内容抓取和解析
- API接口自动发现
- 反爬虫机制处理
- 数据提取和清洗

**主要接口**：
```typescript
interface SpiderService {
  crawlPage(url: string, config: CrawlConfig): Promise<CrawlResult>
  discoverAPIs(url: string): Promise<APIEndpoint[]>
  extractData(content: string, selectors: Selector[]): Promise<ExtractedData>
  handleAntiBot(page: Page, strategy: AntiBot Strategy): Promise<void>
}
```

#### 3. 数据处理服务 (DataService)

**职责**：
- 数据格式转换和标准化
- 数据质量检查和清洗
- 数据存储和索引
- 数据导出和API提供

**主要接口**：
```typescript
interface DataService {
  processData(rawData: RawData, rules: ProcessingRule[]): Promise<ProcessedData>
  validateData(data: any, schema: ValidationSchema): Promise<ValidationResult>
  storeData(data: ProcessedData, storage: StorageConfig): Promise<void>
  exportData(query: DataQuery, format: ExportFormat): Promise<ExportResult>
}
```

#### 4. 配置管理服务 (ConfigService)

**职责**：
- 爬虫配置的创建和管理
- 模板和预设管理
- 配置验证和优化建议

**主要接口**：
```typescript
interface ConfigService {
  createConfig(template: ConfigTemplate): Promise<CrawlConfig>
  validateConfig(config: CrawlConfig): Promise<ValidationResult>
  getConfigTemplates(category: string): Promise<ConfigTemplate[]>
  optimizeConfig(config: CrawlConfig, metrics: PerformanceMetrics): Promise<CrawlConfig>
}
```

#### 5. 监控服务 (MonitorService)

**职责**：
- 系统性能监控
- 任务执行监控
- 错误追踪和告警
- 统计报表生成

**主要接口**：
```typescript
interface MonitorService {
  trackPerformance(metrics: PerformanceMetrics): Promise<void>
  logError(error: ErrorInfo): Promise<void>
  generateReport(timeRange: TimeRange, type: ReportType): Promise<Report>
  setAlert(condition: AlertCondition, action: AlertAction): Promise<void>
}
```

### API接口设计

#### RESTful API

```typescript
// 任务管理API
POST   /api/tasks              // 创建任务
GET    /api/tasks              // 获取任务列表
GET    /api/tasks/:id          // 获取任务详情
PUT    /api/tasks/:id          // 更新任务
DELETE /api/tasks/:id          // 删除任务
POST   /api/tasks/:id/start    // 启动任务
POST   /api/tasks/:id/stop     // 停止任务

// 配置管理API
POST   /api/configs            // 创建配置
GET    /api/configs            // 获取配置列表
GET    /api/configs/:id        // 获取配置详情
PUT    /api/configs/:id        // 更新配置
DELETE /api/configs/:id        // 删除配置

// 数据管理API
GET    /api/data               // 查询数据
POST   /api/data/export        // 导出数据
GET    /api/data/stats         // 数据统计

// 监控API
GET    /api/monitor/metrics    // 获取监控指标
GET    /api/monitor/logs       // 获取日志
GET    /api/monitor/reports    // 获取报表
```

#### WebSocket API

```typescript
// 实时通信事件
interface WebSocketEvents {
  // 任务状态更新
  'task:status': (data: { taskId: string, status: TaskStatus }) => void
  
  // 爬取进度更新
  'crawl:progress': (data: { taskId: string, progress: number, current: string }) => void
  
  // 错误通知
  'error:notification': (data: { type: string, message: string, details: any }) => void
  
  // 系统状态
  'system:status': (data: { cpu: number, memory: number, activeTask s: number }) => void
}
```

## 数据模型

### 核心数据模型

#### 任务模型 (Task)

```typescript
interface Task {
  id: string
  name: string
  description?: string
  config: CrawlConfig
  status: TaskStatus
  priority: TaskPriority
  schedule?: ScheduleConfig
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  results: TaskResult[]
  metrics: TaskMetrics
}

enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

enum TaskPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}
```

#### 爬虫配置模型 (CrawlConfig)

```typescript
interface CrawlConfig {
  id: string
  name: string
  targetUrls: string[]
  crawlRules: CrawlRule[]
  dataExtraction: ExtractionRule[]
  antiBot: AntiBotConfig
  storage: StorageConfig
  performance: PerformanceConfig
  mediaFiles: MediaFileConfig
}

interface CrawlRule {
  type: 'static' | 'dynamic' | 'api'
  selector?: string
  waitCondition?: WaitCondition
  pagination?: PaginationConfig
  filters?: FilterRule[]
}

interface ExtractionRule {
  field: string
  selector: string
  type: 'text' | 'html' | 'attribute' | 'link'
  transform?: TransformRule[]
  validation?: ValidationRule
}
```

#### 数据存储模型

```typescript
// MySQL - 配置和任务信息
interface TaskEntity {
  id: string
  name: string
  config_id: string
  status: string
  priority: number
  created_at: Date
  updated_at: Date
}

interface ConfigEntity {
  id: string
  name: string
  config_json: string
  created_by: string
  created_at: Date
  updated_at: Date
}

// MongoDB - 爬取数据
interface CrawlDataDocument {
  _id: ObjectId
  taskId: string
  url: string
  data: Record<string, any>
  metadata: {
    crawledAt: Date
    userAgent: string
    responseTime: number
    statusCode: number
  }
  mediaFiles?: MediaFile[]
}

interface MediaFile {
  url: string
  localPath?: string
  type: 'image' | 'video' | 'audio' | 'document'
  size: number
  mimeType: string
}
```

### 数据流设计

```mermaid
flowchart LR
    A["用户配置"] --> B["任务创建"]
    B --> C["任务队列"]
    C --> D["爬虫引擎"]
    D --> E["数据提取"]
    E --> F["数据处理"]
    F --> G["数据存储"]
    G --> H["结果输出"]
    
    D --> I["媒体文件"]
    I --> J["文件存储"]
    
    D --> K["监控数据"]
    K --> L["日志系统"]
    
    F --> M["数据验证"]
    M --> N["质量检查"]
    N --> G
```

## 错误处理

### 错误分类和处理策略

#### 1. 网络错误

**错误类型**：
- 连接超时
- DNS解析失败
- HTTP错误状态码
- 网络中断

**处理策略**：
```typescript
class NetworkErrorHandler {
  async handleError(error: NetworkError, context: CrawlContext): Promise<RetryResult> {
    switch (error.type) {
      case 'TIMEOUT':
        return this.retryWithBackoff(context, { maxRetries: 3, backoffMs: 1000 })
      case 'DNS_FAILURE':
        return this.switchProxy(context)
      case 'HTTP_ERROR':
        return this.handleHttpError(error.statusCode, context)
      default:
        return { shouldRetry: false, error }
    }
  }
}
```

#### 2. 反爬虫检测

**检测类型**：
- IP封禁
- 验证码挑战
- 行为检测
- 频率限制

**处理策略**：
```typescript
class AntiBotHandler {
  async handleDetection(detection: BotDetection, context: CrawlContext): Promise<void> {
    switch (detection.type) {
      case 'IP_BANNED':
        await this.rotateProxy(context)
        break
      case 'CAPTCHA':
        await this.solveCaptcha(detection.captchaData, context)
        break
      case 'RATE_LIMITED':
        await this.adjustCrawlSpeed(context)
        break
      case 'BEHAVIOR_DETECTED':
        await this.randomizeUserBehavior(context)
        break
    }
  }
}
```

#### 3. 数据处理错误

**错误类型**：
- 解析失败
- 数据验证失败
- 存储错误
- 格式转换错误

**处理策略**：
```typescript
class DataErrorHandler {
  async handleDataError(error: DataError, data: RawData): Promise<ProcessingResult> {
    try {
      switch (error.type) {
        case 'PARSE_ERROR':
          return await this.fallbackParser(data)
        case 'VALIDATION_ERROR':
          return await this.sanitizeData(data, error.validationErrors)
        case 'STORAGE_ERROR':
          return await this.retryStorage(data, error.storageConfig)
        default:
          throw error
      }
    } catch (fallbackError) {
      await this.logError(fallbackError, data)
      return { success: false, error: fallbackError }
    }
  }
}
```

### 错误恢复机制

#### 重试策略

```typescript
interface RetryConfig {
  maxRetries: number
  backoffStrategy: 'linear' | 'exponential' | 'fixed'
  baseDelayMs: number
  maxDelayMs: number
  retryCondition: (error: Error) => boolean
}

class RetryManager {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (!config.retryCondition(error) || attempt === config.maxRetries) {
          throw error
        }
        
        const delay = this.calculateDelay(attempt, config)
        await this.sleep(delay)
      }
    }
    
    throw lastError
  }
}
```

#### 断点续传

```typescript
interface CheckpointData {
  taskId: string
  currentUrl: string
  processedUrls: string[]
  extractedData: any[]
  timestamp: Date
}

class CheckpointManager {
  async saveCheckpoint(taskId: string, data: CheckpointData): Promise<void> {
    await this.redis.setex(`checkpoint:${taskId}`, 3600, JSON.stringify(data))
  }
  
  async loadCheckpoint(taskId: string): Promise<CheckpointData | null> {
    const data = await this.redis.get(`checkpoint:${taskId}`)
    return data ? JSON.parse(data) : null
  }
  
  async resumeTask(taskId: string): Promise<void> {
    const checkpoint = await this.loadCheckpoint(taskId)
    if (checkpoint) {
      // 从断点继续执行任务
      await this.continueFromCheckpoint(checkpoint)
    }
  }
}
```

## 测试策略

### 测试金字塔

```mermaid
pyramid
    title 测试金字塔
    "E2E测试" : 10
    "集成测试" : 30
    "单元测试" : 60
```

### 单元测试策略

**覆盖率要求**：≥80%

**测试框架**：Vitest + React Testing Library

**测试重点**：
- 核心业务逻辑
- 数据处理函数
- 错误处理机制
- 工具函数

```typescript
// 示例：数据提取器测试
describe('DataExtractor', () => {
  it('should extract text content correctly', async () => {
    const extractor = new DataExtractor()
    const html = '<div class="title">Test Title</div>'
    const rule: ExtractionRule = {
      field: 'title',
      selector: '.title',
      type: 'text'
    }
    
    const result = await extractor.extract(html, [rule])
    expect(result.title).toBe('Test Title')
  })
  
  it('should handle extraction errors gracefully', async () => {
    const extractor = new DataExtractor()
    const html = '<div>No title</div>'
    const rule: ExtractionRule = {
      field: 'title',
      selector: '.title',
      type: 'text'
    }
    
    const result = await extractor.extract(html, [rule])
    expect(result.title).toBeNull()
  })
})
```

### 集成测试策略

**覆盖率要求**：≥60%

**测试重点**：
- API端点测试
- 数据库集成
- 外部服务集成
- 消息队列集成

```typescript
// 示例：任务API集成测试
describe('Task API Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })
  
  it('should create and execute a crawl task', async () => {
    const taskConfig = {
      name: 'Test Task',
      targetUrls: ['https://example.com'],
      crawlRules: [/* ... */]
    }
    
    // 创建任务
    const createResponse = await request(app)
      .post('/api/tasks')
      .send(taskConfig)
      .expect(201)
    
    const taskId = createResponse.body.id
    
    // 启动任务
    await request(app)
      .post(`/api/tasks/${taskId}/start`)
      .expect(200)
    
    // 等待任务完成
    await waitForTaskCompletion(taskId)
    
    // 验证结果
    const task = await getTask(taskId)
    expect(task.status).toBe('completed')
    expect(task.results.length).toBeGreaterThan(0)
  })
})
```

### 端到端测试策略

**测试工具**：Playwright

**测试重点**：
- 关键用户流程
- 跨浏览器兼容性
- 性能测试
- 可访问性测试

```typescript
// 示例：完整爬虫流程E2E测试
test('complete crawling workflow', async ({ page }) => {
  // 登录系统
  await page.goto('/login')
  await page.fill('[data-testid="username"]', 'testuser')
  await page.fill('[data-testid="password"]', 'password')
  await page.click('[data-testid="login-button"]')
  
  // 创建爬虫配置
  await page.goto('/configs/new')
  await page.fill('[data-testid="config-name"]', 'Test Config')
  await page.fill('[data-testid="target-url"]', 'https://example.com')
  await page.click('[data-testid="save-config"]')
  
  // 创建并启动任务
  await page.goto('/tasks/new')
  await page.selectOption('[data-testid="config-select"]', 'Test Config')
  await page.click('[data-testid="create-task"]')
  await page.click('[data-testid="start-task"]')
  
  // 监控任务执行
  await page.waitForSelector('[data-testid="task-status"][data-status="running"]')
  await page.waitForSelector('[data-testid="task-status"][data-status="completed"]', {
    timeout: 30000
  })
  
  // 验证结果
  await page.click('[data-testid="view-results"]')
  await expect(page.locator('[data-testid="result-item"]')).toHaveCount.greaterThan(0)
})
```

### 性能测试

**测试指标**：
- 响应时间：API响应时间 < 500ms
- 吞吐量：支持1000并发用户
- 资源使用：CPU < 80%，内存 < 4GB
- 爬取效率：每分钟处理 > 100个页面

```typescript
// 示例：性能基准测试
describe('Performance Benchmarks', () => {
  it('should handle 100 concurrent crawl requests', async () => {
    const startTime = Date.now()
    const promises = Array.from({ length: 100 }, () => 
      createCrawlTask(testConfig)
    )
    
    const results = await Promise.all(promises)
    const endTime = Date.now()
    
    const duration = endTime - startTime
    const throughput = results.length / (duration / 1000)
    
    expect(throughput).toBeGreaterThan(10) // 每秒至少处理10个任务
    expect(results.every(r => r.success)).toBe(true)
  })
})
```

### 安全测试

**测试重点**：
- 输入验证
- 认证授权
- SQL注入防护
- XSS防护
- CSRF防护

```typescript
// 示例：安全测试
describe('Security Tests', () => {
  it('should prevent SQL injection attacks', async () => {
    const maliciousInput = "'; DROP TABLE tasks; --"
    
    const response = await request(app)
      .get('/api/tasks')
      .query({ search: maliciousInput })
      .expect(400)
    
    expect(response.body.error).toContain('Invalid input')
  })
  
  it('should require authentication for protected endpoints', async () => {
    await request(app)
      .post('/api/tasks')
      .send(validTaskConfig)
      .expect(401)
  })
})
```

## 部署架构

### Docker容器化

```dockerfile
# 前端Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# 后端Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Docker Compose配置

```yaml
version: '3.8'

services:
  # 前端服务
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - spider-network

  # 后端服务
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://user:password@mysql:3306/spider
      - REDIS_URL=redis://redis:6379
      - MONGODB_URL=mongodb://mongodb:27017/spider
    depends_on:
      - mysql
      - redis
      - mongodb
      - minio
      - elasticsearch
    networks:
      - spider-network

  # MySQL数据库
  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=spider
      - MYSQL_USER=user
      - MYSQL_PASSWORD=password
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - spider-network

  # Redis缓存
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - spider-network

  # MongoDB文档数据库
  mongodb:
    image: mongo:6
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongodb_data:/data/db
    networks:
      - spider-network

  # MinIO对象存储
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    networks:
      - spider-network

  # Elasticsearch搜索引擎
  elasticsearch:
    image: elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - spider-network

volumes:
  mysql_data:
  redis_data:
  mongodb_data:
  minio_data:
  elasticsearch_data:

networks:
  spider-network:
    driver: bridge
```

### 监控和日志

```yaml
# 添加监控服务
  # Prometheus监控
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - spider-network

  # Grafana可视化
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - spider-network

  # 日志收集
  filebeat:
    image: elastic/filebeat:8.8.0
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - spider-network
```

## 性能优化

### 爬取性能优化 <mcreference link="https://www.zyte.com/blog/challenges-of-scaling-playwright-and-puppeteer-for-web-scraping/" index="5">5</mcreference>

#### 1. 浏览器实例管理

```typescript
class BrowserPool {
  private browsers: Browser[] = []
  private maxBrowsers = 10
  private currentIndex = 0
  
  async getBrowser(): Promise<Browser> {
    if (this.browsers.length < this.maxBrowsers) {
      const browser = await playwright.chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      })
      this.browsers.push(browser)
      return browser
    }
    
    // 轮询使用现有浏览器
    const browser = this.browsers[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.browsers.length
    return browser
  }
  
  async cleanup(): Promise<void> {
    await Promise.all(this.browsers.map(browser => browser.close()))
    this.browsers = []
  }
}
```

#### 2. 并发控制

```typescript
class ConcurrencyManager {
  private semaphore: Semaphore
  
  constructor(maxConcurrency: number) {
    this.semaphore = new Semaphore(maxConcurrency)
  }
  
  async execute<T>(task: () => Promise<T>): Promise<T> {
    await this.semaphore.acquire()
    try {
      return await task()
    } finally {
      this.semaphore.release()
    }
  }
}
```

#### 3. 智能等待策略

```typescript
class SmartWaiter {
  async waitForContent(page: Page, selector: string): Promise<void> {
    // 组合多种等待策略
    await Promise.race([
      page.waitForSelector(selector, { timeout: 10000 }),
      page.waitForLoadState('networkidle', { timeout: 15000 }),
      page.waitForFunction(
        () => document.readyState === 'complete',
        { timeout: 20000 }
      )
    ])
  }
}
```

### 数据处理性能优化

#### 1. 流式处理

```typescript
class StreamProcessor {
  async processLargeDataset(data: AsyncIterable<RawData>): Promise<void> {
    const transform = new Transform({
      objectMode: true,
      transform(chunk: RawData, encoding, callback) {
        try {
          const processed = this.processChunk(chunk)
          callback(null, processed)
        } catch (error) {
          callback(error)
        }
      }
    })
    
    const writeStream = this.createWriteStream()
    
    pipeline(
      Readable.from(data),
      transform,
      writeStream,
      (error) => {
        if (error) {
          console.error('Pipeline failed:', error)
        } else {
          console.log('Pipeline succeeded')
        }
      }
    )
  }
}
```

#### 2. 批量处理

```typescript
class BatchProcessor {
  private batchSize = 100
  private batch: ProcessedData[] = []
  
  async addToBatch(data: ProcessedData): Promise<void> {
    this.batch.push(data)
    
    if (this.batch.length >= this.batchSize) {
      await this.flushBatch()
    }
  }
  
  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) return
    
    await this.dataService.bulkInsert(this.batch)
    this.batch = []
  }
}
```

### 缓存策略

#### 1. 多级缓存

```typescript
class CacheManager {
  private l1Cache = new Map<string, any>() // 内存缓存
  private l2Cache: Redis // Redis缓存
  
  async get(key: string): Promise<any> {
    // L1缓存查找
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key)
    }
    
    // L2缓存查找
    const value = await this.l2Cache.get(key)
    if (value) {
      this.l1Cache.set(key, JSON.parse(value))
      return JSON.parse(value)
    }
    
    return null
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // 同时写入两级缓存
    this.l1Cache.set(key, value)
    await this.l2Cache.setex(key, ttl, JSON.stringify(value))
  }
}
```

#### 2. 智能缓存失效

```typescript
class SmartCache {
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }
  
  async refreshCache(key: string, refreshFn: () => Promise<any>): Promise<any> {
    const value = await refreshFn()
    await this.set(key, value)
    return value
  }
}
```

## 安全设计

### 认证和授权

#### JWT认证

```typescript
class AuthService {
  generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roles: user.roles
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h',
        issuer: 'spider-tool',
        audience: 'spider-users'
      }
    )
  }
  
  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload
  }
}
```

#### 基于角色的访问控制 (RBAC)

```typescript
enum Permission {
  CREATE_TASK = 'create:task',
  READ_TASK = 'read:task',
  UPDATE_TASK = 'update:task',
  DELETE_TASK = 'delete:task',
  MANAGE_USERS = 'manage:users'
}

class AuthorizationService {
  hasPermission(user: User, permission: Permission): boolean {
    return user.roles.some(role => 
      role.permissions.includes(permission)
    )
  }
  
  canAccessResource(user: User, resource: Resource): boolean {
    // 资源级别的访问控制
    return resource.ownerId === user.id || 
           user.roles.some(role => role.name === 'admin')
  }
}
```

### 输入验证和清理

```typescript
class InputValidator {
  validateUrl(url: string): ValidationResult {
    try {
      const parsed = new URL(url)
      
      // 检查协议
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: 'Invalid protocol' }
      }
      
      // 检查域名白名单
      if (this.isBlacklistedDomain(parsed.hostname)) {
        return { valid: false, error: 'Domain not allowed' }
      }
      
      return { valid: true }
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' }
    }
  }
  
  sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
      ALLOWED_ATTR: []
    })
  }
}
```

### 数据加密

```typescript
class EncryptionService {
  encrypt(data: string): string {
    const cipher = crypto.createCipher('aes-256-gcm', process.env.ENCRYPTION_KEY)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
  }
  
  decrypt(encryptedData: string): string {
    const decipher = crypto.createDecipher('aes-256-gcm', process.env.ENCRYPTION_KEY)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
}
```

### 安全配置

```typescript
// 安全中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}))

// 限流配置
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: 'Too many requests from this IP'
}))
```

## 总结

本设计文档详细描述了通用爬虫工具的系统架构，包括：

1. **微服务架构**：采用NestJS构建的可扩展微服务架构
2. **智能爬虫引擎**：基于Playwright的跨浏览器爬取能力 <mcreference link="https://scrapingant.com/blog/playwright-vs-puppeteer" index="1">1</mcreference>
3. **完善的数据处理**：支持多种数据格式和存储方式
4. **强大的错误处理**：包含重试、断点续传等恢复机制
5. **全面的测试策略**：单元测试、集成测试、E2E测试全覆盖
6. **高性能优化**：浏览器池、并发控制、缓存策略等
7. **安全保障**：认证授权、输入验证、数据加密等安全措施

该设计确保了系统的可扩展性、稳定性和安全性，能够满足大规模爬虫任务的需求。下一步将基于此设计创建详细的实现计划。