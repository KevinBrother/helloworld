#!/bin/bash

# Universal Spider 开发环境启动脚本
# 使用方法: ./start-dev.sh

echo "🚀 启动 Universal Spider 开发环境..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 进入 docker 目录
cd "$(dirname "$0")"

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose down

# 启动基础设施服务
echo "🔧 启动基础设施服务..."
docker-compose up -d mysql redis mongodb elasticsearch minio prometheus grafana kibana

# 等待基础服务启动
echo "⏳ 等待基础服务启动..."
sleep 10

# 启动应用服务（开发模式）
echo "🚀 启动应用服务（开发模式）..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d backend frontend

# 等待应用服务启动
echo "⏳ 等待应用服务启动..."
sleep 5

# 显示服务状态
echo "📊 服务状态:"
docker-compose ps

echo ""
echo "✅ 开发环境启动完成！"
echo ""
echo "📱 访问地址:"
echo "  前端应用:     http://localhost:5173"
echo "  后端API:      http://localhost:3001"
echo "  API文档:      http://localhost:3001/api"
echo "  Grafana:      http://localhost:3000 (admin/admin123)"
echo "  Kibana:       http://localhost:5601"
echo "  MinIO控制台:  http://localhost:9001 (minioadmin/minioadmin123)"
echo "  Prometheus:   http://localhost:9090"
echo ""
echo "📝 查看日志:"
echo "  前端: docker logs spider-frontend -f"
echo "  后端: docker logs spider-backend -f"
echo ""
echo "🛑 停止服务: docker-compose down"