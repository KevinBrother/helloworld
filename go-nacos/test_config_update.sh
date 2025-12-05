#!/bin/bash

# 配置更新测试脚本

echo "=== 配置更新测试脚本 ==="
echo ""

# 获取当前配置
echo "1️⃣  获取当前 user-config.yaml 配置:"
CURRENT_CONFIG=$(curl -s "http://localhost:8848/nacos/v1/cs/configs?dataId=user-config.yaml&group=DEFAULT_GROUP&tenant=")
echo "$CURRENT_CONFIG"
echo ""

# 更新配置
echo "2️⃣  更新 user-config.yaml 配置..."
TIMESTAMP=$(date +%s)
NEW_CONTENT="service:
  name: user-service
  version: \"1.0.$TIMESTAMP\"
database:
  host: \"localhost_$TIMESTAMP\"
  port: 3306
other2:
  vale: \"updated_at_$(date '+%H:%M:%S')\""

# URL 编码内容
ENCODED_CONTENT=$(echo "$NEW_CONTENT" | jq -sRr @uri)

curl -s -X POST "http://localhost:8848/nacos/v1/cs/configs" \
  -d "dataId=user-config.yaml&group=DEFAULT_GROUP&content=$ENCODED_CONTENT&tenant=" > /dev/null

echo "✅ 配置已更新"
echo ""

# 验证更新
echo "3️⃣  验证更新后的配置:"
sleep 1
curl -s "http://localhost:8848/nacos/v1/cs/configs?dataId=user-config.yaml&group=DEFAULT_GROUP&tenant="
echo ""
echo ""

# 显示日志提示
echo "4️⃣  查看 user-1 服务日志:"
echo "运行: tail -f logs/user-1.log"
echo "应该在 5-10 秒内看到 '🔄 配置 user-config.yaml 已更新' 的消息"
