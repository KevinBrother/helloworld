# 网站爬虫知识库项目

基于 NestJS 和 Playwright 的网站爬虫系统，支持将爬取的数据和截图存储到 MinIO 对象存储中。

## 功能特性

- 🕷️ **智能网站爬虫**: 使用 Playwright 进行深度网页爬取
- 📸 **页面截图**: 自动生成页面截图并存储
- 🗄️ **MinIO 存储**: 将爬取数据和截图存储到 MinIO 对象存储
- 🔄 **可配置爬取**: 支持设置爬取深度、页面数量和延迟
- 📊 **知识库集成**: 可选的外部知识库 API 集成
- 🐳 **Docker 支持**: 完整的 Docker 和 Docker Compose 配置

## 项目结构

```
src/
├── app.controller.ts           # 主应用控制器
├── app.module.ts              # 主应用模块
├── main.ts                    # 应用入口文件
├── config/                    # 配置管理
│   └── app.config.ts         # 应用配置定义
├── controllers/               # 控制器层
│   └── crawler.controller.ts # 爬虫API控制器
├── core/                      # 核心服务层
│   ├── browser/              # 浏览器服务
│   │   └── browser.service.ts
│   └── storage/              # 存储服务
│       └── storage.service.ts
├── services/                  # 业务服务层
│   ├── content/              # 内容处理服务
│   │   └── content-extractor.service.ts
│   └── crawler/              # 爬虫服务
│       ├── link-manager.service.ts
│       └── website-crawler.service.ts
├── modules/                   # 模块组织
│   └── crawler.module.ts     # 爬虫模块
└── shared/                    # 共享资源
    ├── interfaces/           # 接口定义
    │   └── crawler.interface.ts
    └── utils/                # 工具类
        └── path-generator.util.ts
```

### 架构说明

- **controllers/**: API控制器，处理HTTP请求和响应
- **core/**: 核心基础服务，包括浏览器和存储服务
- **services/**: 业务逻辑服务，按功能模块组织
- **modules/**: NestJS模块，组织和管理依赖注入
- **shared/**: 共享的接口、工具类和常量
- **config/**: 配置管理，支持环境变量和默认配置

## 快速开始

### 使用 Docker Compose（推荐）

1. 克隆项目并进入目录
2. 复制环境变量配置文件：

   ```bash
   cp .env.example .env
   ```

3. 启动服务：

   ```bash
   docker-compose up --build
   ```

### 本地开发

1. 安装依赖：

   ```bash
   pnpm install
   ```

2. 安装 Playwright 浏览器：

   ```bash
   pnpm exec playwright install chromium
   ```

3. 配置环境变量（参考 `.env.example`）

4. 启动 MinIO 服务（可使用 Docker）：

   ```bash
   docker run -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin123 \
     minio/minio server /data --console-address ":9001"
   ```

5. 启动应用：

   ```bash
   pnpm run start:dev
   ```

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `MINIO_ENDPOINT` | `minio:9000` | MinIO 服务端点 |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO 访问密钥 |
| `MINIO_SECRET_KEY` | `minioadmin123` | MinIO 秘密密钥 |
| `MINIO_BUCKET_NAME` | `crawler-data` | 存储桶名称 |
| `MINIO_USE_SSL` | `false` | 是否使用 SSL |
| `KNOWLEDGE_BASE_API_URL` | - | 外部知识库 API URL（可选） |
| `KNOWLEDGE_BASE_API_TOKEN` | - | 外部知识库 API 令牌（可选） |

## API 使用

### 启动爬取任务

```bash
curl -X POST http://localhost:3000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://example.com",
    "maxDepth": 3,
    "maxPages": 10,
    "takeScreenshots": true,
    "allowedDomains": ["example.com"],
    "excludePatterns": [".*\\.(pdf|zip|rar)$"]
  }'
```

### 查询爬取状态

```bash
# 查询特定会话状态
curl http://localhost:3000/api/crawler/session/{sessionId}

# 查询所有活跃会话
curl http://localhost:3000/api/crawler/sessions
```

### 爬虫配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `startUrl` | string | - | 起始爬取URL（必需） |
| `maxDepth` | number | 3 | 最大爬取深度 |
| `maxPages` | number | 10 | 最大爬取页面数量 |
| `takeScreenshots` | boolean | false | 是否生成页面截图 |
| `userAgent` | string | - | 自定义User-Agent |
| `allowedDomains` | string[] | [起始域名] | 允许爬取的域名列表 |
| `excludePatterns` | string[] | [] | 排除URL的正则表达式模式 |

## 存储结构

### MinIO 存储桶结构

```
crawler-pages/
├── domain/
│   └── {domain}/
│       └── {year}/
│           └── {month}/
│               └── {day}/
│                   ├── pages/
│                   │   └── {sessionId}/
│                   │       └── {url-hash}.json
│                   └── screenshots/
│                       └── {sessionId}/
│                           └── {url-hash}.png
└── sessions/
    └── {year}/
        └── {month}/
            └── {day}/
                └── {sessionId}/
                    └── metadata.json
```

### 数据格式

#### 页面数据 (JSON)

```json
{
  "url": "https://example.com/page",
  "title": "页面标题",
  "content": "提取的页面内容",
  "metadata": {
    "depth": 1,
    "crawledAt": "2024-01-01T12:00:00.000Z",
    "contentType": "text/html",
    "statusCode": 200,
    "description": "页面描述",
    "keywords": "关键词",
    "wordCount": 1500,
    "linkCount": 25
  },
  "sessionId": "session-id"
}
```

#### 会话元数据 (JSON)

```json
{
  "session": {
    "sessionId": "session-id",
    "startUrl": "https://example.com",
    "status": "completed",
    "pagesProcessed": 10,
    "startTime": "2024-01-01T12:00:00.000Z",
    "endTime": "2024-01-01T12:05:00.000Z"
  },
  "linkStats": {
    "processed": 10,
    "discovered": 25,
    "queued": 0
  },
  "summary": {
    "totalPagesProcessed": 10,
    "totalLinksDiscovered": 25,
    "totalErrors": 0,
    "duration": 300000
  }
}
```

### 页面数据格式

```json
{
  "url": "https://example.com",
  "title": "页面标题",
  "content": "页面内容",
  "timestamp": "2025-01-13T02:59:18.000Z"
}
```

## 服务访问

- **MinIO 控制台**: <http://localhost:9001>
  - 用户名: `minioadmin`
  - 密码: `minioadmin123`

## 重构说明 (v2.0.0)

### 主要改进

1. **架构重构**: 采用分层架构设计，提高代码可维护性
   - 核心服务层 (core/): 基础服务如浏览器、存储
   - 业务服务层 (services/): 按功能模块组织的业务逻辑
   - 控制器层 (controllers/): API接口处理
   - 共享层 (shared/): 通用接口、工具类

2. **模块化设计**: 使用NestJS模块系统，清晰的依赖管理

3. **配置管理**: 统一的配置管理，支持环境变量和默认配置

4. **增强的内容提取**: 更智能的内容提取算法，支持多种页面结构

5. **改进的链接管理**: 更高效的链接队列管理和去重机制

6. **完善的存储结构**: 按域名和时间组织的存储路径，便于数据管理

### 迁移指南

如果您正在从v1.x版本升级：

1. API端点已更改为 `/api/crawler/*`
2. 请求格式已标准化，参考上述API文档
3. 存储结构已重新组织，旧数据需要迁移
4. 配置文件格式已更新

## 开发说明

### 添加新的爬虫功能

1. 在 `crawler.interface.ts` 中定义新的接口
2. 在相应的服务中实现功能
3. 在 `crawlers.module.ts` 中注册服务

### 自定义存储

可以通过修改 `MinioService` 来支持其他对象存储服务（如 AWS S3）。

## 故障排除

### 常见问题

1. **Playwright 浏览器未安装**

   ```bash
   pnpm exec playwright install chromium
   ```

2. **MinIO 连接失败**
   - 检查 MinIO 服务是否启动
   - 验证环境变量配置
   - 确认网络连接

3. **Docker 构建失败**
   - 清理 Docker 缓存：`docker system prune -a`
   - 重新构建：`docker-compose up --build --force-recreate`

## 许可证

MIT License
