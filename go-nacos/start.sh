#!/bin/bash

# Nacos 微服务启动脚本
# 启动顺序：用户服务 -> 支付服务 -> 订单服务 -> 网关服务

echo "启动 Nacos 微服务系统..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Go 是否安装
if ! command -v go &> /dev/null; then
    echo -e "${RED}错误: Go 未安装或不在 PATH 中${NC}"
    exit 1
fi

# 检查 Nacos 是否运行
echo "检查 Nacos 服务..."
if ! curl -s http://localhost:8848/nacos/actuator/health > /dev/null; then
    echo -e "${YELLOW}警告: Nacos 服务似乎没有运行，请先执行: docker compose up -d${NC}"
    echo -e "${YELLOW}继续启动服务...${NC}"
fi

# 创建日志目录
mkdir -p logs

# 启动服务的函数
start_service() {
    local service_name=$1
    local config_file=$2
    local log_file="logs/${service_name}.log"

    echo -e "${GREEN}启动 ${service_name}...${NC}"

    cd services/${service_name}

    # 检查配置文件是否存在
    if [ ! -f "${config_file}" ]; then
        echo -e "${RED}错误: 配置文件 ${config_file} 不存在${NC}"
        cd ../..
        return 1
    fi

    # 后台启动服务
    nohup go run main.go ${config_file} > "../../${log_file}" 2>&1 &
    local pid=$!

    # 保存 PID
    echo $pid > "../../logs/${service_name}.pid"

    echo -e "${GREEN}${service_name} 已启动 (PID: ${pid}), 日志: ${log_file}${NC}"

    cd ../..
    sleep 2
}

# 停止服务的函数
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"

    if [ -f "${pid_file}" ]; then
        local pid=$(cat ${pid_file})
        if kill -0 $pid 2>/dev/null; then
            echo -e "${YELLOW}停止 ${service_name} (PID: ${pid})...${NC}"
            kill $pid
            sleep 2
            if kill -0 $pid 2>/dev/null; then
                echo -e "${RED}强制终止 ${service_name}...${NC}"
                kill -9 $pid
            fi
        fi
        rm -f ${pid_file}
    fi
}

# 解析命令行参数
case "$1" in
    start)
        echo "开始启动所有服务..."

        # 启动用户服务实例1
        start_service "user" "config.yaml"

        # 启动用户服务实例2
        start_service "user" "config2.yaml"

        # 启动支付服务
        start_service "payment" "config.yaml"

        # 启动订单服务
        start_service "order" "config.yaml"

        # 启动网关服务
        start_service "gateway" "config.yaml"

        echo -e "${GREEN}所有服务启动完成！${NC}"
        echo -e "${GREEN}网关服务地址: http://localhost:8080${NC}"
        echo -e "${GREEN}Nacos 控制台: http://localhost:8848${NC}"
        ;;

    stop)
        echo "停止所有服务..."

        # 按相反顺序停止
        stop_service "gateway"
        stop_service "order"
        stop_service "payment"
        stop_service "user"

        echo -e "${GREEN}所有服务已停止${NC}"
        ;;

    restart)
        echo "重启所有服务..."
        $0 stop
        sleep 3
        $0 start
        ;;

    status)
        echo "服务状态:"

        services=("user" "payment" "order" "gateway")

        for service in "${services[@]}"; do
            pid_file="logs/${service}.pid"
            if [ -f "${pid_file}" ]; then
                pid=$(cat ${pid_file})
                if kill -0 $pid 2>/dev/null; then
                    echo -e "${GREEN}✓ ${service} 运行中 (PID: ${pid})${NC}"
                else
                    echo -e "${RED}✗ ${service} 已停止 (PID: ${pid})${NC}"
                fi
            else
                echo -e "${RED}✗ ${service} 未启动${NC}"
            fi
        done

        # 检查端口
        echo ""
        echo "端口检查:"
        ports=(8082 8085 8083 8081 8080)
        services=("user-1" "user-2" "payment" "order" "gateway")

        for i in "${!ports[@]}"; do
            if lsof -Pi :${ports[$i]} -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo -e "${GREEN}✓ ${services[$i]} 端口 ${ports[$i]} 开放${NC}"
            else
                echo -e "${RED}✗ ${services[$i]} 端口 ${ports[$i]} 未开放${NC}"
            fi
        done
        ;;

    logs)
        service_name=$2
        if [ -z "$service_name" ]; then
            echo "查看所有服务日志..."
            tail -f logs/*.log
        else
            log_file="logs/${service_name}.log"
            if [ -f "${log_file}" ]; then
                echo "查看 ${service_name} 日志..."
                tail -f ${log_file}
            else
                echo -e "${RED}日志文件不存在: ${log_file}${NC}"
            fi
        fi
        ;;

    clean)
        echo "清理日志和 PID 文件..."
        rm -rf logs/
        echo -e "${GREEN}清理完成${NC}"
        ;;

    *)
        echo "用法: $0 {start|stop|restart|status|logs [service_name]|clean}"
        echo ""
        echo "命令说明:"
        echo "  start   - 启动所有服务"
        echo "  stop    - 停止所有服务"
        echo "  restart - 重启所有服务"
        echo "  status  - 查看服务状态"
        echo "  logs    - 查看日志 (可选指定服务名)"
        echo "  clean   - 清理日志文件"
        echo ""
        echo "服务列表:"
        echo "  user    - 用户服务 (实例1: 8082, 实例2: 8085)"
        echo "  payment - 支付服务 (8083)"
        echo "  order   - 订单服务 (8081)"
        echo "  gateway - 网关服务 (8080)"
        exit 1
        ;;
esac