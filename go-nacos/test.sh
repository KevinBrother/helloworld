#!/bin/bash

# Nacos 微服务测试脚本

echo "开始测试 Nacos 微服务系统..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 测试函数
test_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3

    echo -n "测试 ${description}... "

    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url")
    body=$(echo "$response" | sed 's/HTTPSTATUS.*//')
    status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 成功${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败 (状态码: $status)${NC}"
        echo "响应: $body"
        return 1
    fi
}

# 等待服务启动
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo -n "等待 ${service_name} 启动... "

    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 就绪${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        ((attempt++))
    done

    echo -e "${RED}✗ 超时${NC}"
    return 1
}

echo "=== 检查服务状态 ==="

# 检查 Nacos
if curl -s http://localhost:8848/nacos/actuator/health > /dev/null; then
    echo -e "${GREEN}✓ Nacos 服务运行正常${NC}"
else
    echo -e "${RED}✗ Nacos 服务未运行${NC}"
    echo "请先执行: docker compose up -d"
    exit 1
fi

# 等待各个服务启动
wait_for_service "http://localhost:8082/health" "用户服务1"
wait_for_service "http://localhost:8085/health" "用户服务2"
wait_for_service "http://localhost:8083/health" "支付服务"
wait_for_service "http://localhost:8081/health" "订单服务"
wait_for_service "http://localhost:8080/health" "网关服务"

echo ""
echo "=== 测试 API 接口 ==="

# 测试网关首页
test_endpoint "http://localhost:8080/" 200 "网关首页"

# 测试用户服务
test_endpoint "http://localhost:8082/user/1" 200 "用户服务 - 获取用户1"
test_endpoint "http://localhost:8085/user/2" 200 "用户服务2 - 获取用户2"

# 测试支付服务
test_endpoint "http://localhost:8083/payment/1" 200 "支付服务 - 获取支付1"

# 测试订单服务 (包含用户服务调用)
test_endpoint "http://localhost:8081/order/1" 200 "订单服务 - 获取订单1"

# 测试网关代理
test_endpoint "http://localhost:8080/api/orders/1" 200 "网关代理 - 获取订单1"

# 测试创建订单
echo -n "测试创建订单... "
response=$(curl -s -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "amount": 150.0}')

if echo "$response" | grep -q '"id"'; then
    echo -e "${GREEN}✓ 成功${NC}"
else
    echo -e "${RED}✗ 失败${NC}"
    echo "响应: $response"
fi

echo ""
echo "=== 测试完成 ==="
echo -e "${GREEN}Nacos 控制台: http://localhost:8848${NC}"
echo -e "${GREEN}网关服务: http://localhost:8080${NC}"
echo ""
echo "常用测试命令:"
echo "  curl http://localhost:8080/api/orders/1"
echo "  curl -X POST http://localhost:8080/api/orders -H 'Content-Type: application/json' -d '{\"user_id\": 1, \"amount\": 100.0}'"
echo "  curl http://localhost:8082/user/1"
echo "  curl http://localhost:8083/payment/1"