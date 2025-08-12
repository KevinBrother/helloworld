# Docker 端口访问故障排除指南

## 问题描述

Docker 容器中的端口（如 5173、3001 等）无法从外部访问。

## 常见原因和解决方案

### 1. 前端开发服务器未绑定到 0.0.0.0

**问题**: Vite 开发服务器默认只绑定到 localhost，容器外部无法访问。

**症状**: 
- 容器日志显示 "Network: use --host to expose"
- `curl http://localhost:5173` 返回连接失败

**解决方案**:
```bash
# 在 docker-compose.dev.yml 中修改前端服务的启动命令
command: npm run dev -- --host 0.0.0.0
```

### 2. 使用错误的 Docker Compose 配置

**问题**: 使用生产配置而非开发配置启动服务。

**解决方案**:
```bash
# 停止当前服务
docker-compose down

# 使用开发配置启动
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 3. 端口映射配置错误

**检查端口映射**:
```bash
# 查看容器端口映射
docker-compose ps

# 查看具体容器的端口配置
docker port spider-frontend
```

### 4. 防火墙或网络问题

**检查端口是否被占用**:
```bash
# macOS/Linux
lsof -i :5173
netstat -tulpn | grep 5173

# 检查 Docker 网络
docker network ls
docker network inspect docker_spider-network
```

### 5. 容器内服务未正常启动

**检查容器日志**:
```bash
# 查看前端容器日志
docker logs spider-frontend -f

# 查看后端容器日志
docker logs spider-backend -f
```

## 验证步骤

### 1. 检查容器状态
```bash
docker-compose ps
```

### 2. 测试端口连通性
```bash
# 测试前端
curl -I http://localhost:5173

# 测试后端
curl -I http://localhost:3001

# 测试其他服务
curl -I http://localhost:3000  # Grafana
curl -I http://localhost:9090  # Prometheus
```

### 3. 检查容器内网络配置
```bash
# 进入容器检查
docker exec -it spider-frontend sh
# 在容器内执行
netstat -tulpn
ps aux
```

## 快速修复脚本

使用提供的启动脚本:
```bash
cd docker
./start-dev.sh
```

## 常用端口列表

| 服务 | 端口 | 描述 |
|------|------|------|
| Frontend (Dev) | 5173 | Vite 开发服务器 |
| Frontend (Prod) | 80 | Nginx 生产服务器 |
| Backend | 3001 | NestJS API 服务 |
| Backend Debug | 9229 | Node.js 调试端口 |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |
| MongoDB | 27017 | 文档数据库 |
| Elasticsearch | 9200 | 搜索引擎 |
| Kibana | 5601 | 日志可视化 |
| MinIO | 9000 | 对象存储 API |
| MinIO Console | 9001 | 对象存储控制台 |
| Prometheus | 9090 | 监控系统 |
| Grafana | 3000 | 监控仪表板 |

## 预防措施

1. **使用正确的配置文件**: 开发环境使用 `docker-compose.dev.yml`
2. **检查服务依赖**: 确保基础服务先启动
3. **监控容器状态**: 定期检查容器健康状态
4. **查看日志**: 及时发现和解决问题

## 联系支持

如果问题仍然存在，请提供以下信息:
- 操作系统版本
- Docker 版本
- 容器日志
- 网络配置
- 错误信息截图