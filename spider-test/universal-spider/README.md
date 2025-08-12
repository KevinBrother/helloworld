# 通用爬虫工具 (Universal Spider)

一个现代化的智能爬虫工具，支持网页爬取、API发现、数据提取和实时监控。

## 🚀 特性

- **智能爬虫引擎**: 基于Playwright/Puppeteer的现代化爬虫引擎
- **反爬虫处理**: 智能检测和绕过反爬虫机制
- **API自动发现**: 自动识别和提取网页API接口
- **可视化配置**: 拖拽式配置界面，无需编程
- **实时监控**: WebSocket实时任务状态推送
- **多格式输出**: 支持JSON、CSV、XML等多种数据格式
- **媒体文件处理**: 可选的图片、视频等媒体文件下载
- **分布式架构**: 微服务架构，支持水平扩展
- **完整监控**: Prometheus + Grafana监控体系

## 🏗️ 架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端界面      │    │   API网关       │    │   爬虫引擎      │
│  React + TS     │◄──►│   NestJS        │◄──►│  Playwright     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   数据存储      │    │   消息队列      │    │   监控系统      │
│ MySQL+MongoDB   │    │     Redis       │    │ Prometheus+ELK  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: React Query + Zustand
- **UI组件**: Headless UI + Heroicons

### 后端
- **框架**: NestJS + TypeScript
- **数据库**: MySQL 8.0 (结构化数据)
- **文档数据库**: MongoDB 7 (日志和非结构化数据)
- **缓存**: Redis 7 (缓存和消息队列)
- **文件存储**: MinIO (对象存储)
- **搜索引擎**: Elasticsearch 8 (日志搜索)

### 爬虫引擎
- **主引擎**: Playwright (多浏览器支持)
- **备选引擎**: Puppeteer (Chromium专用)
- **反爬虫**: 代理轮换、用户行为模拟、验证码识别

### 监控和运维
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack (Elasticsearch + Kibana)
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Docker & Docker Compose
- Git

### 1. 克隆项目

```bash
git clone <repository-url>
cd universal-spider
```

### 2. 启动基础服务

```bash
# 启动所有基础服务 (MySQL, Redis, MongoDB, MinIO, Elasticsearch等)
cd docker
docker-compose up -d

# 检查服务状态
docker-compose ps
```

### 3. 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

### 4. 配置环境变量

```bash
# 复制环境配置文件
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 编辑配置文件
vim backend/.env
vim frontend/.env
```

### 5. 数据库迁移

```bash
cd backend
npm run migration:run
```

### 6. 启动开发服务

```bash
# 启动后端服务 (端口: 3001)
cd backend
npm run start:dev

# 启动前端服务 (端口: 5173)
cd frontend
npm run dev
```

### 7. 访问应用

- **前端界面**: http://localhost:5173
- **后端API**: http://localhost:3001
- **API文档**: http://localhost:3001/api/docs
- **Grafana监控**: http://localhost:3000 (admin/admin123)
- **Kibana日志**: http://localhost:5601
- **MinIO控制台**: http://localhost:9001 (minioadmin/minioadmin123)

## 📖 使用指南

### 创建爬虫任务

1. 登录系统
2. 点击"新建任务"
3. 配置目标URL和爬取规则
4. 设置数据提取选择器
5. 选择输出格式和存储位置
6. 启动任务

### 监控任务状态

- **实时监控**: 任务列表页面实时显示任务状态
- **详细日志**: 点击任务查看详细执行日志
- **性能指标**: Grafana仪表板显示系统性能
- **错误追踪**: Kibana中查看错误日志和堆栈

### API使用

```bash
# 获取API Token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 创建爬虫任务
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试任务","config_id":1}'

# 查询任务状态
curl -X GET http://localhost:3001/api/tasks/1 \
  -H "Authorization: Bearer <token>"
```

## 🧪 测试

```bash
# 后端测试
cd backend
npm run test          # 单元测试
npm run test:e2e      # 端到端测试
npm run test:cov      # 测试覆盖率

# 前端测试
cd frontend
npm run test          # 单元测试
npm run test:e2e      # 端到端测试
```

## 📦 部署

### Docker部署

```bash
# 构建生产镜像
docker-compose -f docker-compose.prod.yml build

# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### 环境配置

- **开发环境**: `docker-compose.yml`
- **测试环境**: `docker-compose.test.yml`
- **生产环境**: `docker-compose.prod.yml`

## 🔧 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | MySQL连接字符串 | `mysql://spider_user:spider_pass@localhost:3306/spider_db` |
| `REDIS_URL` | Redis连接字符串 | `redis://localhost:6379` |
| `MONGODB_URL` | MongoDB连接字符串 | `mongodb://admin:admin123@localhost:27017/spider_logs` |
| `MINIO_ENDPOINT` | MinIO服务地址 | `localhost:9000` |
| `JWT_SECRET` | JWT密钥 | `your-secret-key` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 爬虫配置

```json
{
  "maxPages": 100,
  "maxDepth": 3,
  "delayMin": 1000,
  "delayMax": 3000,
  "concurrentLimit": 5,
  "userAgent": "Mozilla/5.0...",
  "antiBot": {
    "enabled": true,
    "proxyRotation": true,
    "captchaSolver": "2captcha"
  }
}
```

## 🤝 贡献

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 支持

- **文档**: [Wiki](https://github.com/your-repo/wiki)
- **问题反馈**: [Issues](https://github.com/your-repo/issues)
- **讨论**: [Discussions](https://github.com/your-repo/discussions)
- **邮箱**: support@spider.com

## 📊 项目状态

![Build Status](https://github.com/your-repo/workflows/CI/badge.svg)
![Coverage](https://codecov.io/gh/your-repo/branch/main/graph/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)