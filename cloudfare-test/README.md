# Cloudflare Workers Demo

这个项目演示了如何使用 Cloudflare Workers 与 D1 数据库、KV 存储和 R2 对象存储的集成。

## 功能特性

- **D1 数据库**: SQLite 数据库操作（用户管理）
- **KV 存储**: 键值对存储（会话管理、缓存）
- **R2 存储**: 对象存储（文件上传下载）
- **Worker**: HTTP API 服务
- **TypeScript**: 完整的类型支持

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 创建 Cloudflare 资源

#### 创建 D1 数据库
```bash
pnpm run db:create
# 复制输出的 database_id 到 wrangler.toml 中的 database_id 字段
```

#### 创建 KV 命名空间
```bash
pnpm run kv:create
# 复制输出的 id 到 wrangler.toml 中的 id 字段
```

#### 创建 R2 存储桶
```bash
pnpm run r2:create
```

### 3. 初始化数据库

```bash
# 本地开发环境
pnpm run db:migrate-local

# 生产环境
pnpm run db:migrate
```

### 4. 启动开发服务器

```bash
pnpm run dev
```

访问 `http://localhost:8787` 查看 API 文档。

## API 接口

### D1 数据库接口

- `POST /api/db/setup` - 初始化数据库表
- `POST /api/users` - 创建用户
- `GET /api/users` - 获取所有用户
- `GET /api/users/:id` - 获取指定用户

### KV 存储接口

- `POST /api/kv/:key` - 设置 KV 值
- `GET /api/kv/:key` - 获取 KV 值
- `DELETE /api/kv/:key` - 删除 KV 值
- `GET /api/kv` - 列出所有 KV 键

### R2 存储接口

- `POST /api/r2/upload/:filename` - 上传文件到 R2
- `GET /api/r2/:filename` - 从 R2 下载文件
- `DELETE /api/r2/:filename` - 删除 R2 文件
- `GET /api/r2` - 列出 R2 存储桶文件

### 综合演示

- `POST /api/demo` - 综合演示所有服务

## 使用示例

### 创建用户

```bash
curl -X POST http://localhost:8787/api/users \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com"}'
```

### 设置 KV 值

```bash
curl -X POST http://localhost:8787/api/kv/mykey \
  -H "Content-Type: application/json" \
  -d '{"value": {"message": "Hello World"}, "ttl": 3600}'
```

### 上传文件到 R2

```bash
curl -X POST http://localhost:8787/api/r2/upload/test.txt \
  -H "Content-Type: text/plain" \
  -d "Hello, R2 Storage!"
```

### 综合演示

```bash
curl -X POST http://localhost:8787/api/demo \
  -H "Content-Type: application/json" \
  -d '{
    "username": "demouser",
    "email": "demo@example.com",
    "message": "This is a demo message stored in R2!"
  }'
```

## 部署

```bash
pnpm run deploy
```

## 项目结构

```
cloudfare-test/
├── src/
│   └── index.ts          # 主应用文件
├── schema.sql             # 数据库 schema
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── wrangler.toml          # Wrangler 配置
└── README.md              # 项目说明
```

## 注意事项

1. 确保在 `wrangler.toml` 中正确配置了所有资源的 ID
2. 本地开发时使用 `--local` 标志来使用本地存储
3. 生产环境部署前确保所有资源都已创建并配置正确
4. R2 存储桶名称必须全局唯一

## 技术栈

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Language**: TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV + R2
- **Package Manager**: pnpm
- **CLI**: Wrangler