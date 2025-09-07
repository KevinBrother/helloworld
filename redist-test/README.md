# Redis & BullMQ 使用案例

这是一个使用 TypeScript、pnpm、vitest 构建的 Redis 和 BullMQ 使用案例项目。

## 功能特性

- 🔧 **TypeScript** - 类型安全的开发体验
- 📦 **pnpm** - 快速、节省磁盘空间的包管理器
- 🧪 **vitest** - 快速的单元测试框架
- 🗄️ **Redis** - 高性能内存数据库
- 🔄 **BullMQ** - 基于 Redis 的任务队列系统
- 🐳 **Docker Compose** - 容器化的 Redis 服务

## 项目结构

```
├── src/
│   ├── config/
│   │   └── redis.ts          # Redis 连接配置
│   ├── examples/
│   │   ├── redis-basic.ts    # Redis 基础操作示例
│   │   └── bullmq-example.ts # BullMQ 队列示例
│   └── index.ts              # 主入口文件
├── tests/
│   ├── redis.test.ts         # Redis 测试用例
│   └── bullmq.test.ts        # BullMQ 测试用例
├── docker-compose.yml        # Docker Compose 配置
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
└── vitest.config.ts          # Vitest 配置
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动 Redis 服务

```bash
# 启动 Redis 和 Redis Commander
pnpm run docker:up

# 或者直接使用 docker-compose
docker-compose up -d
```

服务启动后：
- Redis 服务: `localhost:6379`
- Redis Commander (Web UI): `http://localhost:8081`

### 3. 运行示例

```bash
# 运行所有示例
pnpm run dev

# 或者单独运行
npx tsx src/examples/redis-basic.ts
npx tsx src/examples/bullmq-example.ts
```

### 4. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并监听文件变化
pnpm test --watch

# 运行单次测试
pnpm run test:run
```

### 5. 构建项目

```bash
pnpm run build
```

## Redis 基础操作示例

项目包含以下 Redis 操作示例：

- **字符串操作**: SET, GET, SETEX, INCR, INCRBY
- **哈希操作**: HSET, HGET, HGETALL, HEXISTS
- **列表操作**: LPUSH, RPUSH, LPOP, LRANGE, LLEN
- **集合操作**: SADD, SMEMBERS, SISMEMBER, SCARD
- **有序集合操作**: ZADD, ZRANGE, ZSCORE, ZRANK
- **键操作**: EXISTS, EXPIRE, TTL, KEYS, TYPE

## BullMQ 队列示例

项目演示了以下 BullMQ 功能：

- **邮件发送队列** - 异步邮件发送任务
- **图片处理队列** - 图片处理和转换任务
- **报告生成队列** - 数据报告生成任务

### 队列特性

- ✅ 任务优先级
- ✅ 任务延迟执行
- ✅ 任务重试机制
- ✅ 任务进度跟踪
- ✅ 任务失败处理
- ✅ 并发控制
- ✅ 事件监听

## 环境配置

复制 `.env.example` 到 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

可配置项：

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
NODE_ENV=development
LOG_LEVEL=info
```

## 测试

项目包含完整的测试套件：

- **Redis 测试**: 测试所有 Redis 基础操作
- **BullMQ 测试**: 测试队列操作、任务处理、事件监听等

测试使用真实的 Redis 连接，确保在运行测试前启动 Redis 服务。

## Docker 服务

### Redis 服务

- **镜像**: `redis:7-alpine`
- **端口**: `6379`
- **持久化**: 启用 AOF
- **健康检查**: 内置

### Redis Commander

- **镜像**: `rediscommander/redis-commander:latest`
- **端口**: `8081`
- **功能**: Redis 可视化管理界面

### 常用命令

```bash
# 启动服务
pnpm run docker:up

# 停止服务
pnpm run docker:down

# 查看日志
docker-compose logs -f

# 进入 Redis CLI
docker-compose exec redis redis-cli
```

## 开发脚本

```bash
# 开发模式运行
pnpm run dev

# 构建项目
pnpm run build

# 运行构建后的代码
pnpm start

# 运行测试
pnpm test

# 运行单次测试
pnpm run test:run

# 启动 Docker 服务
pnpm run docker:up

# 停止 Docker 服务
pnpm run docker:down
```

## 故障排除

### Redis 连接失败

如果遇到 `ECONNREFUSED` 错误：

1. 确保 Redis 服务正在运行：
   ```bash
   docker-compose ps
   ```

2. 检查 Redis 服务状态：
   ```bash
   docker-compose logs redis
   ```

3. 重启 Redis 服务：
   ```bash
   docker-compose restart redis
   ```

### 测试失败

1. 确保 Redis 服务正常运行
2. 检查 Redis 连接配置
3. 清理 Redis 数据：
   ```bash
   docker-compose exec redis redis-cli FLUSHALL
   ```

## 许可证

MIT License