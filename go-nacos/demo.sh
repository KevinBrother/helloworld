#!/bin/bash

# Nacos 微服务演示脚本
# 完整演示从启动到测试的流程

echo "🚀 Nacos 微服务完整演示"
echo "=========================="

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}检查依赖...${NC}"

    if ! command -v go &> /dev/null; then
        echo -e "${RED}❌ Go 未安装${NC}"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi

    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ curl 未安装${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ 所有依赖已安装${NC}"
}

# 启动 Nacos
start_nacos() {
    echo -e "${BLUE}启动 Nacos 服务...${NC}"

    if docker compose ps | grep -q "nacos"; then
        echo -e "${YELLOW}⚠️  Nacos 已在运行${NC}"
    else
        docker compose up -d
        echo -e "${GREEN}✅ Nacos 启动中...${NC}"
        sleep 10
    fi

    # 等待 Nacos 就绪
    echo -n "等待 Nacos 就绪..."
    for i in {1..30}; do
        if curl -s http://localhost:8848/nacos/actuator/health > /dev/null; then
            echo -e "${GREEN} ✅${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    echo -e "${RED} ❌ 超时${NC}"
    exit 1
}

# 演示服务发现
demo_service_discovery() {
    echo -e "${BLUE}演示服务发现...${NC}"

    echo "1. 查看 Nacos 控制台: http://localhost:8848"
    echo "2. 观察服务注册情况"
    echo "3. 查看服务实例列表"

    # 等待用户查看
    read -p "按回车键继续演示..."
}

# 演示负载均衡
demo_load_balancing() {
    echo -e "${BLUE}演示负载均衡...${NC}"

    echo "用户服务有两个实例 (8082 和 8085)"
    echo "多次调用用户服务，观察负载均衡效果:"

    for i in {1..5}; do
        echo -n "请求 $i: "
        curl -s http://localhost:8082/user/1 | grep -o '"name":"[^"]*"' || echo "请求失败"
        sleep 1
    done

    read -p "按回车键继续..."
}

# 演示服务调用链
demo_service_calls() {
    echo -e "${BLUE}演示服务调用链...${NC}"

    echo "订单服务会调用用户服务获取用户信息"
    echo ""
    echo "调用订单接口 (会自动调用用户服务):"
    curl -s http://localhost:8080/api/orders/1 | jq . 2>/dev/null || curl -s http://localhost:8080/api/orders/1

    echo ""
    echo "创建新订单:"
    curl -s -X POST http://localhost:8080/api/orders \
        -H "Content-Type: application/json" \
        -d '{"user_id": 1, "amount": 299.99}' | jq . 2>/dev/null || echo "订单创建完成"

    read -p "按回车键继续..."
}

# 演示配置管理
demo_config_management() {
    echo -e "${BLUE}演示配置管理...${NC}"

    echo "1. 打开 Nacos 控制台: http://localhost:8848"
    echo "2. 进入配置管理页面"
    echo "3. 找到 user-config.yaml 配置"
    echo "4. 修改配置内容，观察服务日志"

    echo ""
    echo "当前配置内容:"
    curl -s http://localhost:8848/nacos/v1/cs/configs?dataId=user-config.yaml\&group=DEFAULT_GROUP\&tenant=public 2>/dev/null || echo "无法获取配置"

    read -p "修改配置后按回车键继续..."
}

# 演示故障转移
demo_failover() {
    echo -e "${BLUE}演示故障转移...${NC}"

    echo "停止一个用户服务实例，观察其他实例接管请求"

    echo "当前运行的服务:"
    ./start.sh status

    echo ""
    echo "停止用户服务实例2 (端口 8085)..."
    ./start.sh stop 2>/dev/null || echo "停止命令执行"

    sleep 3

    echo "再次测试用户服务调用:"
    for i in {1..3}; do
        echo -n "请求 $i: "
        curl -s http://localhost:8082/user/1 | grep -o '"name":"[^"]*"' || echo "请求失败"
        sleep 1
    done

    read -p "按回车键继续..."
}

# 主演示流程
main() {
    check_dependencies
    start_nacos

    echo -e "${GREEN}启动微服务...${NC}"
    ./start.sh start

    echo ""
    echo -e "${GREEN}🎉 微服务系统启动完成！${NC}"
    echo ""
    echo "服务地址:"
    echo "  🌐 网关服务: http://localhost:8080"
    echo "  🔍 Nacos 控制台: http://localhost:8848"
    echo "  👤 用户服务1: http://localhost:8082"
    echo "  👤 用户服务2: http://localhost:8085"
    echo "  💰 支付服务: http://localhost:8083"
    echo "  📦 订单服务: http://localhost:8081"
    echo ""

    # 运行测试
    echo -e "${BLUE}运行自动化测试...${NC}"
    ./test.sh

    echo ""
    read -p "准备开始分步演示？(y/N): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        demo_service_discovery
        demo_load_balancing
        demo_service_calls
        demo_config_management
        demo_failover
    fi

    echo ""
    echo -e "${GREEN}🎊 演示完成！${NC}"
    echo ""
    echo "管理命令:"
    echo "  查看状态: ./start.sh status"
    echo "  查看日志: ./start.sh logs"
    echo "  停止服务: ./start.sh stop"
    echo "  清理日志: ./start.sh clean"
}

# 参数处理
case "$1" in
    quick)
        # 快速启动模式
        check_dependencies
        start_nacos
        ./start.sh start
        echo -e "${GREEN}快速启动完成！访问 http://localhost:8080${NC}"
        ;;
    *)
        main
        ;;
esac