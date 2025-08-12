# Docker 部署指南

本项目提供了完整的 Docker 容器化解决方案，包括前端、后端和所有依赖服务。

## 服务架构

### 基础设施服务
- **MySQL**: 主数据库 (端口: 3306)
- **Redis**: 缓存和消息队列 (端口: 6379)
- **MongoDB**: 文档数据库 (端口: 27017)
- **MinIO**: 对象存储 (端口: 9000, 控制台: 9001)
- **Elasticsearch**: 搜索引擎 (端口: 9200)
- **Kibana**: 日志可视化 (端口: 5601)
- **Prometheus**: 监控系统 (端口: 9090)
- **Grafana**: 监控仪表板 (端口: 3000)

### 应用服务
- **Backend**: NestJS API 服务 (端口: 3001)
- **Frontend**: React Web 应用 (端口: 80)

## 快速开始

### 生产环境部署

```bash
# 进入docker目录
cd docker

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 开发环境部署

```bash
# 启动基础设施服务
docker-compose up -d mysql redis mongodb elasticsearch minio

# 启动开发环境（包含热重载）
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up backend frontend
```

## 访问地址

- **前端应用**: http://localhost
- **后端API**: http://localhost:3001
- **API文档**: http://localhost:3001/api
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Kibana**: http://localhost:5601
- **MinIO控制台**: http://localhost:9001 (minioadmin/minioadmin123)
- **Prometheus**: http://localhost:9090

## 数据库连接信息

### MySQL
- 主机: localhost:3306
- 数据库: spider_db
- 用户: spider_user
- 密码: spider_pass
- Root密码: root123

### MongoDB
- 连接URI: mongodb://admin:admin123@localhost:27017/spider_logs?authSource=admin

### Redis
- 主机: localhost:6379
- 无密码

## 常用命令

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 重新构建镜像
docker-compose build

# 查看服务日志
docker-compose logs [service_name]

# 进入容器
docker-compose exec backend sh
docker-compose exec frontend sh

# 更新单个服务
docker-compose up -d --no-deps backend
```

## 环境变量

生产环境建议修改以下敏感信息：
- JWT_SECRET
- 数据库密码
- MinIO访问密钥
- Grafana管理员密码

## 数据持久化

所有数据都通过 Docker volumes 持久化存储：
- mysql_data: MySQL数据
- redis_data: Redis数据
- mongodb_data: MongoDB数据
- minio_data: MinIO对象存储
- elasticsearch_data: Elasticsearch索引
- prometheus_data: Prometheus监控数据
- grafana_data: Grafana配置和仪表板

## 故障排除

1. **端口冲突**: 确保所需端口未被占用
2. **内存不足**: Elasticsearch需要至少2GB内存
3. **权限问题**: 确保Docker有足够权限访问项目目录
4. **网络问题**: 检查防火墙设置

## 监控和日志

- 使用 Grafana 查看系统监控指标
- 使用 Kibana 查看应用日志
- 使用 Prometheus 查看原始监控数据