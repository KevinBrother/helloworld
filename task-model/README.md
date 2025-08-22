# 任务管理系统 (Task Management System)

基于 NestJS 和 TypeScript 构建的分布式任务管理系统，支持任务调度、执行单元管理、状态跟踪和日志记录。

## 功能特性

### 核心功能
- ✅ **任务管理**: 创建、更新、删除、查询任务
- ✅ **状态管理**: 完整的任务状态流转和历史记录
- ✅ **执行单元**: 分布式执行单元注册和负载均衡
- ✅ **日志系统**: 详细的任务执行日志和监控
- ✅ **心跳监控**: 执行单元健康检查和自动故障转移

### 技术特性
- 🚀 **高性能**: 基于 NestJS 框架，支持高并发
- 🔄 **分布式**: 支持多个执行单元分布式部署
- 📊 **监控**: 实时任务和执行单元统计信息
- 🛡️ **可靠性**: 完善的错误处理和重试机制
- 📚 **文档**: 完整的 Swagger API 文档

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0
- Docker (可选)

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 修改 `.env` 文件中的配置：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=task_management

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 数据库初始化

使用 Docker Compose 启动数据库服务：
```bash
docker-compose up -d mysql redis
```

或手动创建数据库并执行初始化脚本：
```bash
mysql -u root -p < docker/init.sql
```

### 启动应用

#### 开发模式
```bash
npm run start:dev
```

#### 生产模式
```bash
npm run build
npm run start:prod
```

#### Docker 部署
```bash
docker-compose up -d
```

### 访问应用

- **API 服务**: http://localhost:3000/api/v1
- **Swagger 文档**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/api/v1/health

## API 文档

### 任务管理 API

#### 创建任务
```http
POST /api/v1/tasks
Content-Type: application/json

{
  "name": "示例任务",
  "taskType": "DATA_PROCESSING",
  "priority": 1,
  "config": {
    "inputFile": "data.csv",
    "outputFormat": "json"
  }
}
```

#### 获取任务列表
```http
GET /api/v1/tasks?page=1&limit=10&status=PENDING
```

#### 更新任务状态
```http
PUT /api/v1/tasks/1/status
Content-Type: application/json

{
  "status": "RUNNING",
  "reason": "任务开始执行"
}
```

### 执行单元管理 API

#### 注册执行单元
```http
POST /api/v1/execution-units/register
Content-Type: application/json

{
  "id": "worker-001",
  "unitType": "DATA_PROCESSING",
  "unitName": "数据处理单元",
  "capacity": 5,
  "endpoint": "http://worker-001:8080"
}
```

#### 发送心跳
```http
POST /api/v1/execution-units/worker-001/heartbeat
Content-Type: application/json

{
  "currentLoad": 2,
  "metadata": {
    "cpuUsage": 45.2,
    "memoryUsage": 67.8
  }
}
```

## 项目结构

```
src/
├── common/                 # 公共模块
│   ├── dto/               # 数据传输对象
│   ├── enums/             # 枚举定义
│   └── interfaces/        # 接口定义
├── config/                # 配置文件
│   ├── app.config.ts      # 应用配置
│   └── database.config.ts # 数据库配置
├── modules/               # 业务模块
│   ├── task/              # 任务模块
│   │   ├── entities/      # 实体定义
│   │   ├── task.controller.ts
│   │   ├── task.service.ts
│   │   └── task.module.ts
│   └── execution-unit/     # 执行单元模块
│       ├── entities/
│       ├── execution-unit.controller.ts
│       ├── execution-unit.service.ts
│       └── execution-unit.module.ts
├── app.module.ts          # 应用主模块
└── main.ts               # 应用入口
```

## 数据库设计

### 主要表结构

- **tasks**: 任务主表
- **task_status_history**: 任务状态变更历史
- **task_execution_logs**: 任务执行日志
- **execution_units**: 执行单元信息

### 状态流转

```
PENDING → RUNNING → COMPLETED
    ↓        ↓         ↑
  PAUSED → FAILED → CANCELLED
```

## 开发指南

### 代码规范

```bash
# 代码格式化
npm run format

# 代码检查
npm run lint

# 修复 lint 问题
npm run lint:fix
```

### 测试

```bash
# 单元测试
npm run test

# 端到端测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

### 数据库迁移

```bash
# 生成迁移文件
npm run migration:generate -- -n CreateTaskTable

# 运行迁移
npm run migration:run

# 回滚迁移
npm run migration:revert
```

## 部署指南

### Docker 部署

1. 构建镜像：
```bash
docker build -t task-management .
```

2. 启动服务：
```bash
docker-compose up -d
```

### 生产环境配置

1. 设置环境变量：
```bash
export APP_ENV=production
export DB_SYNCHRONIZE=false
export LOG_LEVEL=warn
```

2. 启动应用：
```bash
npm run start:prod
```

## 监控和运维

### 健康检查

应用提供健康检查端点：
- `/health`: 应用健康状态
- `/health/database`: 数据库连接状态
- `/health/redis`: Redis 连接状态

### 日志管理

日志文件位置：
- 应用日志: `logs/app.log`
- 错误日志: `logs/error.log`
- 访问日志: `logs/access.log`

### 性能监控

推荐使用以下工具进行监控：
- **Prometheus**: 指标收集
- **Grafana**: 可视化监控
- **ELK Stack**: 日志分析

## 常见问题

### Q: 如何处理任务执行失败？
A: 系统支持自动重试机制，可以通过配置 `TASK_MAX_RETRY_COUNT` 设置最大重试次数。

### Q: 执行单元离线后如何处理？
A: 系统会自动检测心跳超时，将离线的执行单元标记为 OFFLINE 状态，并重新分配任务。

### Q: 如何扩展新的任务类型？
A: 在 `TaskType` 枚举中添加新类型，并在执行单元中实现对应的处理逻辑。

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 项目维护者: [Your Name]
- 邮箱: [your.email@example.com]
- 项目地址: [https://github.com/your-username/task-management]

---

**注意**: 这是一个示例项目，请根据实际需求进行调整和完善。