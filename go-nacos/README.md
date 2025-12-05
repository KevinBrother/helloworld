# Nacos 微服务演示系统

这是一个基于 Nacos 的微服务演示系统，包含服务注册发现、配置管理和服务间调用。

## 系统架构

- **网关服务 (gateway-service)**: 端口 8080，提供统一入口
- **订单服务 (order-service)**: 端口 8081/8084，处理订单业务
- **用户服务 (user-service)**: 端口 8082/8085，处理用户信息
- **支付服务 (payment-service)**: 端口 8083/8086，处理支付业务

## 快速开始

### 方法1: 使用启动脚本 (推荐)

```bash
# 启动 Nacos
docker compose up -d

# 一键启动所有服务
./start.sh start

# 查看服务状态
./start.sh status

# 查看日志
./start.sh logs

# 停止所有服务
./start.sh stop
```

### 方法2: 手动启动

按以下顺序启动服务：

```bash
# 终端1: 用户服务实例1
cd services/user && go run main.go

# 终端2: 用户服务实例2
cd services/user && go run main.go config2.yaml

# 终端3: 支付服务
cd services/payment && go run main.go

# 终端4: 订单服务实例1
cd services/order && go run main.go

# 终端5: 网关服务
cd services/gateway && go run main.go
```

### 3. 测试 API

```bash
# 查看网关首页
curl http://localhost:8080/

# 获取订单信息（包含用户信息）
curl http://localhost:8080/api/orders/1

# 创建新订单
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "amount": 200.0}'

# 直接访问用户服务
curl http://localhost:8082/user/1

# 直接访问支付服务
curl http://localhost:8083/payment/1
```

### 4. 运行自动化测试

```bash
# 运行完整测试套件
./test.sh
```

### 5. 运行交互式演示

```bash
# 完整演示 (推荐)
./demo.sh

# 快速启动模式
./demo.sh quick
```

## 服务管理

### 启动脚本命令

```bash
# 启动所有服务
./start.sh start

# 停止所有服务
./start.sh stop

# 重启所有服务
./start.sh restart

# 查看服务状态
./start.sh status

# 查看所有日志
./start.sh logs

# 查看特定服务日志
./start.sh logs user

# 清理日志文件
./start.sh clean
```

## 服务发现演示

1. 在 Nacos 控制台 (<http://localhost:8848>) 查看服务注册情况
2. 观察多个实例的负载均衡
3. 停止某个实例，测试故障转移

## 配置管理演示

1. 在 Nacos 控制台修改配置
2. 观察服务是否能监听到配置变更

## 停止服务

使用 `Ctrl+C` 停止各个服务，观察服务自动注销。

## 学习要点

- 服务注册与发现
- 配置中心动态配置
- 负载均衡
- 故障转移
- 微服务间通信

---

## 原始单体服务示例

### 启动 server，并查看管理界面

``` bash
docker compose up

# test
curl http://localhost:8848/nacos/actuator/health

# 界面访问 http://localhost:8848/nacos/
```

### 注册客服端服务与配置

``` bash

 ./start start

# 查看已注册的服务
 curl -s "http://localhost:8848/nacos/v1/ns/service/list?pageNo=1&pageSize=10" | jq .


 curl -s "http://localhost:8848/nacos/v1/cs/configs?dataId=&group=&appName=&config_tags=&pageNo=1&pageSize=10&tenant=&search=accurate" | jq .
```
