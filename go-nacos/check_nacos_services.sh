#!/bin/bash

echo "=== Nacos 服务状态检查 ==="
echo

# 获取服务列表
echo "📋 已注册的服务列表:"
services=$(curl -s "http://localhost:8848/nacos/v1/ns/service/list?pageNo=1&pageSize=20" | jq -r '.doms[]' 2>/dev/null)

if [ -z "$services" ]; then
    echo "❌ 无法连接到 Nacos 或没有注册的服务"
    exit 1
fi

echo "$services"
echo

# 遍历每个服务，显示实例信息
for service in $services; do
    echo "🔍 服务: $service"
    
    # 获取实例列表
    instances=$(curl -s "http://localhost:8848/nacos/v1/ns/instance/list?serviceName=$service" 2>/dev/null)
    
    if [ $? -eq 0 ] && echo "$instances" | jq -e '.hosts' >/dev/null 2>&1; then
        instance_count=$(echo "$instances" | jq '.hosts | length')
        echo "   📊 实例数量: $instance_count"
        
        # 显示每个实例的详细信息
        echo "$instances" | jq -r '.hosts[] | "   🖥️  实例: \(.ip):\(.port) (健康: \(.healthy), 权重: \(.weight))"'
    else
        echo "   ❌ 获取实例信息失败"
    fi
    echo
done

echo "=== 检查完成 ==="
