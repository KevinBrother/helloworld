#!/bin/bash

# 配置监听案例演示脚本

echo "=== 配置监听与业务整合案例演示 ==="
echo ""

# 1. 获取当前服务配置
echo "1️⃣  获取用户服务当前配置:"
curl -s "http://localhost:8082/config" | jq .
echo ""

# 2. 测试业务操作（使用当前配置）
echo "2️⃣  测试业务操作 (operation 端点):"
curl -s "http://localhost:8082/operation" | jq .
echo ""

# 3. 更新 Nacos 中的配置
echo "3️⃣  更新 Nacos 配置内容..."
NEW_CONFIG="service:
  name: user-service
  version: \"1.0.0\"
database:
  host: \"localhost\"
  port: 3306
max_retries: 5
timeout: 60
log_level: \"debug\"
feature_flag: true
rate_limit_qps: 500"

# URL 编码
ENCODED=$(echo "$NEW_CONFIG" | jq -sRr @uri)
curl -s -X POST "http://localhost:8848/nacos/v1/cs/configs" \
  -d "dataId=user-config.yaml&group=DEFAULT_GROUP&content=$ENCODED&tenant=" > /dev/null

echo "✅ 配置已提交到 Nacos"
echo ""

# 4. 等待轮询检测到变更
echo "4️⃣  等待服务轮询检测配置变更 (约3秒)..."
sleep 4

# 5. 查看日志中的变更通知
echo "5️⃣  查看服务日志中的配置变更
tail -15 logs/user-1.log | grep "配置"
echo ""

# 6. 再次获取服务配置（应该已更新）
echo "6️⃣  获取更新后的服务配置:"
curl -s "http://localhost:8082/config" | jq .
echo ""

# 7. 测试业务操作（使用新配置）
echo "7️⃣  再次测试业务操作 (应该使用新配置中的 max_retries=5):"
curl -s "http://localhost:8082/operation" | jq .
echo ""

echo "✅ 演示完成！配置变更已自动应用到服务业务逻辑中"
