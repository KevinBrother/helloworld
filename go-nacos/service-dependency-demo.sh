#!/bin/bash

# Nacos 微服务依赖演示脚本
# 演示支付服务如何通过 Nacos 发现并调用订单服务

echo "========================================="
echo "🎯 Nacos 微服务依赖演示"
echo "========================================="
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}📊 架构说明：${NC}"
echo "  1️⃣  用户服务 (user-service) - 端口 8082, 8085"
echo "  2️⃣  订单服务 (order-service) - 端口 8081"
echo "      └─ 依赖：通过 Nacos 调用用户服务"
echo "  3️⃣  支付服务 (payment-service) - 端口 8083"
echo "      └─ 依赖：通过 Nacos 调用订单服务"
echo "  4️⃣  网关服务 (gateway-service) - 端口 8080"
echo "      └─ 依赖：通过 Nacos 路由到各个服务"
echo ""

# 等待服务启动
echo -e "${YELLOW}⏳ 等待所有服务启动完成...${NC}"
sleep 3
echo ""

# 测试1：直接调用订单服务（订单服务会调用用户服务）
echo "========================================="
echo -e "${GREEN}测试 1: 订单服务 → 用户服务${NC}"
echo "========================================="
echo -e "${BLUE}订单服务通过 Nacos 发现用户服务，获取用户信息${NC}"
echo ""
echo "📝 请求: GET http://localhost:8081/order/1"
echo ""
response=$(curl -s http://localhost:8081/order/1)
echo -e "${GREEN}响应:${NC}"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""
echo -e "${CYAN}💡 Nacos 作用：${NC}"
echo "   - 订单服务从 Nacos 获取用户服务的实例列表"
echo "   - 动态调用用户服务获取用户详细信息"
echo ""
sleep 2

# 测试2：创建支付（支付服务会调用订单服务）
echo "========================================="
echo -e "${GREEN}测试 2: 支付服务 → 订单服务${NC}"
echo "========================================="
echo -e "${BLUE}支付服务通过 Nacos 发现订单服务，验证订单并更新状态${NC}"
echo ""
echo "📝 请求: POST http://localhost:8083/payment"
echo "📦 数据: {\"order_id\": 1, \"amount\": 100.0, \"method\": \"wechat\"}"
echo ""
response=$(curl -s -X POST http://localhost:8083/payment \
  -H "Content-Type: application/json" \
  -d '{"order_id": 1, "amount": 100.0, "method": "wechat"}')
echo -e "${GREEN}响应:${NC}"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""
echo -e "${CYAN}💡 Nacos 作用：${NC}"
echo "   - 支付服务从 Nacos 获取订单服务的实例列表"
echo "   - 调用订单服务验证订单金额是否正确"
echo "   - 支付完成后调用订单服务更新订单状态"
echo ""
sleep 2

# 测试3：再次查询订单状态（应该已更新为 paid）
echo "========================================="
echo -e "${GREEN}测试 3: 验证订单状态更新${NC}"
echo "========================================="
echo -e "${BLUE}查看订单状态是否已被支付服务更新${NC}"
echo ""
echo "📝 请求: GET http://localhost:8081/order/1"
echo ""
sleep 2  # 等待异步更新完成
response=$(curl -s http://localhost:8081/order/1)
echo -e "${GREEN}响应:${NC}"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""
status=$(echo "$response" | jq -r '.order.status' 2>/dev/null)
if [ "$status" = "paid" ]; then
    echo -e "${GREEN}✅ 订单状态已成功更新为 paid！${NC}"
else
    echo -e "${YELLOW}⚠️  订单状态: $status (可能还在异步更新中)${NC}"
fi
echo ""

# 测试4：测试金额不匹配的情况
echo "========================================="
echo -e "${GREEN}测试 4: 支付金额验证（故意错误）${NC}"
echo "========================================="
echo -e "${BLUE}尝试使用错误的金额创建支付${NC}"
echo ""
echo "📝 请求: POST http://localhost:8083/payment"
echo "📦 数据: {\"order_id\": 1, \"amount\": 999.0, \"method\": \"alipay\"}"
echo ""
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:8083/payment \
  -H "Content-Type: application/json" \
  -d '{"order_id": 1, "amount": 999.0, "method": "alipay"}')
body=$(echo "$response" | sed 's/HTTP_CODE.*//')
code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
echo -e "${RED}响应 (HTTP $code):${NC}"
echo "$body"
echo ""
echo -e "${CYAN}💡 说明：${NC}"
echo "   - 支付服务调用订单服务验证订单金额"
echo "   - 发现金额不匹配，拒绝支付请求"
echo ""

# 查看服务日志
echo "========================================="
echo -e "${CYAN}📋 查看服务调用日志${NC}"
echo "========================================="
echo ""
echo -e "${YELLOW}订单服务日志（最近10行）:${NC}"
tail -n 10 logs/order.log | grep -E "📞|✅|⚠️|📝" || echo "（无相关日志）"
echo ""
echo -e "${YELLOW}支付服务日志（最近10行）:${NC}"
tail -n 10 logs/payment.log | grep -E "📞|✅|⚠️|💳" || echo "（无相关日志）"
echo ""

# 总结
echo "========================================="
echo -e "${GREEN}✨ Nacos 在微服务中的作用总结${NC}"
echo "========================================="
echo ""
echo -e "${CYAN}🔍 服务发现：${NC}"
echo "   • 所有服务启动时注册到 Nacos"
echo "   • 服务调用时从 Nacos 动态获取目标服务的地址"
echo "   • 无需硬编码服务地址，支持动态扩缩容"
echo ""
echo -e "${CYAN}🔗 服务依赖链：${NC}"
echo "   支付服务 → Nacos → 订单服务 → Nacos → 用户服务"
echo ""
echo -e "${CYAN}⚖️  负载均衡：${NC}"
echo "   • 用户服务有2个实例（8082, 8085）"
echo "   • Nacos 返回实例列表，服务可以选择调用"
echo ""
echo -e "${CYAN}🏥 健康检查：${NC}"
echo "   • 只返回健康的服务实例（HealthyOnly: true）"
echo "   • 自动剔除故障实例"
echo ""
echo -e "${GREEN}🎉 演示完成！${NC}"
echo ""
echo "更多测试："
echo "  • Nacos 控制台: http://localhost:8848 (用户名/密码: nacos/nacos)"
echo "  • 查看所有注册服务和实例信息"
echo "  • 动态配置管理"
echo ""
