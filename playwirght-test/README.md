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
├── crawlers/
│   ├── website-crawler.service.ts  # 主爬虫服务
│   ├── playwright.service.ts        # Playwright 浏览器服务
│   ├── knowledge-base.service.ts    # 知识库服务
│   ├── minio.service.ts            # MinIO 存储服务
│   └── crawlers.module.ts          # 爬虫模块
├── interfaces/
│   └── crawler.interface.ts        # 接口定义
├── app.module.ts                   # 应用主模块
└── main.ts                         # 应用入口
```

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

### 爬虫配置

在 `src/main.ts` 中可以配置爬虫参数：

```typescript
await crawlerService.startCrawling(targetUrl, {
  maxDepth: 3,           // 最大爬取深度
  maxPages: 50,          // 最大爬取页面数量
  delay: 1500,           // 每个请求之间的延迟(毫秒)
  takeScreenshots: true  // 启用截图功能
});
```

## 存储结构

### MinIO 存储桶结构

```
crawler-data/
├── pages/
│   └── {url-hash}.json     # 页面数据
└── screenshots/
    └── {url-hash}.png      # 页面截图
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

- **MinIO 控制台**: http://localhost:9001
  - 用户名: `minioadmin`
  - 密码: `minioadmin123`

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