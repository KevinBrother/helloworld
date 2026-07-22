# 01 - 应用基线与 Compose

## 目标

先在 Kubernetes 之外理解应用、数据库、迁移和健康检查的依赖关系。

## 核心概念

- Compose 用于验证容器镜像和服务依赖，不替代 Kubernetes。
- `migrate` 必须在 PostgreSQL 健康后运行。
- `/health/live` 表示进程可运行，`/health/ready` 表示依赖可服务。

## 命令

避免与其他本地服务端口冲突：

```bash
APP_PORT=18081 POSTGRES_PORT=55433 docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:18081/health/live
curl --fail http://127.0.0.1:18081/health/ready
COMPOSE_URL=http://127.0.0.1:18081 ./scripts/verify.sh --target=compose
```

运行 Go 测试：

```bash
CGO_ENABLED=0 GOTOOLCHAIN=local go test ./...
CGO_ENABLED=0 GOTOOLCHAIN=local go vet ./...
```

## 预期观察

- `postgres` 和 `app` 为 healthy。
- `migrate` 成功退出，状态为 completed。
- 自动验证完成创建、编辑、完成、查询和删除流程。
- 浏览器打开 `http://127.0.0.1:18081` 后可操作任务列表。

## 检查问题

1. 为什么 migration 是独立进程，而不是每个应用实例启动时执行？
2. 数据库停止时 live 与 ready 应分别返回什么？
3. Compose named volume 如何保证容器重建后数据仍存在？

## 重置

保留数据库 volume：

```bash
docker compose down
```

连同 Compose 数据一起删除：

```bash
docker compose down --volumes
```
