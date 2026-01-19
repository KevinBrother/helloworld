# RPC 学习项目

## 项目概述

### 学习目标

本项目用于系统学习 RPC（Remote Procedure Call，远程过程调用）框架的原理与实现，通过理论学习和实践编码，深入理解：

- RPC 的核心原理和工作机制
- 主流 RPC 框架的设计思想和使用方法
- 自定义 RPC 协议的设计与实现

### 项目结构

```
rpc/
├── README.md              # 本文档，RPC 学习参考
├── krpc/                  # 自定义 RPC 框架实现
│   ├── protocol/          # 协议定义
│   ├── codec/             # 编解码器
│   ├── transport/         # 传输层
│   ├── server/            # 服务端实现
│   └── client/            # 客户端实现
├── examples/              # 示例代码
│   ├── grpc/              # gRPC 示例
│   ├── thrift/            # Thrift 示例
│   └── krpc/              # krpc 使用示例
└── docs/                  # 详细文档
    ├── design/            # 设计文档
    └── benchmark/         # 性能测试报告
```

---

## RPC 核心原理

### 什么是 RPC

RPC（Remote Procedure Call）是一种**远程过程调用**协议，允许程序调用另一台计算机上的程序，就像调用本地程序一样简单。

```
本地调用:                   RPC 调用:
┌─────────┐               ┌─────────┐           ┌─────────┐
│ Client  │               │ Client  │           │ Server  │
│         │               │   ──────┼──────────>│         │
│ Function│─────┐         │   RPC   │   Network │ Function│
└─────────┘     │         └─────────┘           └─────────┘
                 │
        ┌────────▼────────┐
        │ Direct Execution│
        └─────────────────┘
```

### RPC 核心组件

#### 1. 序列化（Serialization）

序列化是将数据结构或对象转换为可传输格式的过程。

| 方式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **JSON** | 可读性好、跨语言 | 体积大、解析慢 | Web API、配置文件 |
| **XML** | 结构清晰、支持验证 | 冗长、解析复杂 | SOAP、传统企业应用 |
| **Protobuf** | 高效、体积小 | 不可读、需 schema | 高性能内部服务 |
| **MessagePack** | 高效、二进制 | 不可读 | 实时通信 |
| **FlatBuffers** | 零拷贝、高性能 | 复杂、学习成本高 | 游戏等低延迟场景 |
| **Avro** | Schema 演化友好 | 依赖 Schema | 大数据处理 |

**序列化对比示例：**

```json
// JSON (约 45 字节)
{"name":"Alice","age":30,"active":true}
```

```protobuf
// Protobuf (二进制，约 10-15 字节)
// 定义:
message Person {
  string name = 1;
  int32 age = 2;
  bool active = 3;
}
```

#### 2. 传输协议（Transport Protocol）

| 协议 | 特点 | 适用场景 |
|------|------|----------|
| **HTTP/1.1** | 广泛支持、简单 | 通用 API |
| **HTTP/2** | 多路复用、头部压缩 | 高并发场景 |
| **HTTP/3 (QUIC)** | 基于 UDP、低延迟 | 实时应用 |
| **TCP** | 可靠传输 | 自定义协议 |
| **WebSocket** | 全双工、持久连接 | 实时通信 |
| **QUIC** | 低延迟、连接迁移 | 现代应用 |

#### 3. 服务发现（Service Discovery）

服务发现机制让客户端能够动态找到服务提供者。

**主流实现方式：**

```
┌─────────────────────────────────────────────────────────┐
│                    服务发现架构                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌──────────┐      ┌──────────────┐      ┌──────────┐ │
│   │ Provider │─────>│    Registry  │<─────>│ Consumer │ │
│   │  服务端  │ 注册  │   注册中心   │  订阅  │  客户端  │ │
│   └──────────┘      └──────────────┘      └──────────┘ │
│         │                   │                     ▲     │
│         └───────────────────┼─────────────────────┘     │
│                             │ 获取服务列表               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**常见注册中心：**

| 注册中心 | 特点 | 适用场景 |
|----------|------|----------|
| **ZooKeeper** | CP 模型、成熟稳定 | 传统分布式系统 |
| **Consul** | 支持 DNS、健康检查 | 服务网格、多云 |
| **Etcd** | 分布式 KV、强一致 | Kubernetes、配置中心 |
| **Nacos** | 功能丰富、中文友好 | Spring Cloud 生态 |
| **Eureka** | Spring Cloud 生态 | Netflix 技术栈 |

#### 4. 负载均衡（Load Balancing）

负载均衡策略决定请求分发到哪个服务实例。

| 策略 | 算法 | 优点 | 缺点 |
|------|------|------|------|
| **随机** | Random | 简单均匀 | 无状态感知 |
| **轮询** | Round Robin | 分配均匀 | 无性能差异考虑 |
| **加权轮询** | Weighted RR | 考虑实例能力 | 需要配置权重 |
| **最少连接** | Least Conn | 动态均衡 | 需要维护连接数 |
| **一致性哈希** | Consistent Hash | 会话保持 | 数据倾斜风险 |
| **自适应** | Adaptive | 实时优化 | 复杂度高 |

---

## 主流 RPC 框架对比

### gRPC

**Google 开源的高性能 RPC 框架**

```protobuf
// proto 文件定义
syntax = "proto3";

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}

message GetUserRequest {
  int64 user_id = 1;
}

message GetUserResponse {
  User user = 1;
}

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
}
```

| 特性 | 说明 |
|------|------|
| **序列化** | Protobuf |
| **传输协议** | HTTP/2 |
| **优点** | 高性能、跨语言、流式支持、双向流 |
| **缺点** | 学习曲线、调试复杂 |
| **适用场景** | 微服务、高性能场景、跨语言调用 |
| **支持语言** | Go, Java, Python, C++, C#, Node.js, Ruby, PHP 等 |

### Thrift

**Facebook 开源的 RPC 框架**

```thrift
// Thrift IDL
namespace java com.example
namespace go example

service UserService {
    User getUser(1: i64 userId),
    list<User> listUsers(),
    void createUser(1: User user)
}

struct User {
    1: i64 id,
    2: string name,
    3: string email
}
```

| 特性 | 说明 |
|------|------|
| **序列化** | Thrift Binary/Compact/JSON |
| **传输协议** | TCP/HTTP |
| **优点** | 轻量、高效、灵活传输层 |
| **缺点** | 文档较少、更新较慢 |
| **适用场景** | 高性能内部服务、遗留系统 |
| **支持语言** | Go, Java, Python, C++, C#, Node.js, Ruby, PHP 等 |

### Dubbo

**阿里巴巴开源的高性能 Java RPC 框架**

```java
// 接口定义
public interface UserService {
    User getUser(Long userId);
    List<User> listUsers();
}

// 服务提供者
@Service(version = "1.0.0")
public class UserServiceImpl implements UserService {
    @Override
    public User getUser(Long userId) {
        // 实现
    }
}
```

| 特性 | 说明 |
|------|------|
| **序列化** | Hessian2, Protobuf, JSON 等 |
| **传输协议** | TCP (Dubbo 协议), HTTP, REST |
| **优点** | 功能丰富、生态完善、易扩展 |
| **缺点** | 主要面向 Java |
| **适用场景** | Java 微服务、Spring Cloud |
| **支持语言** | Java (主要), Go, Node.js, Python (多语言支持有限) |

### JSON-RPC

**轻量级 JSON 格式的 RPC 协议**

```json
// 请求
{
  "jsonrpc": "2.0",
  "method": "getUser",
  "params": {"userId": 123},
  "id": 1
}

// 响应
{
  "jsonrpc": "2.0",
  "result": {"id": 123, "name": "Alice"},
  "id": 1
}
```

| 特性 | 说明 |
|------|------|
| **序列化** | JSON |
| **传输协议** | HTTP, WebSocket, TCP |
| **优点** | 简单、易调试、跨语言 |
| **缺点** | 性能较低、无类型检查 |
| **适用场景** | Web API、简单场景 |
| **支持语言** | 几乎所有语言 |

### 对比总结

| 框架 | 性能 | 复杂度 | 跨语言 | 生态 | 推荐场景 |
|------|------|--------|--------|------|----------|
| **gRPC** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 跨语言微服务 |
| **Thrift** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 高性能内部服务 |
| **Dubbo** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | Java 微服务 |
| **JSON-RPC** | ⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 简单场景 |

---

## krpc 自定义协议设计

### 协议规范

#### 设计目标

1. **简洁高效**: 协议头紧凑，序列化高效
2. **易于扩展**: 预留扩展字段
3. **兼容性好**: 支持多种序列化格式

#### 协议格式

```
┌─────────────────────────────────────────────────────────────┐
│                        krpc 协议帧                           │
├─────────────────────────────────────────────────────────────┤
│  魔数    │  版本  │ 类型  │  序列化  │    状态码     │       │
│ 4 bytes  │1 byte │1 byte │ 1 byte  │    4 bytes    │       │
├─────────────────────────────────────────────────────────────┤
│                    消息 ID (8 bytes)                        │
├─────────────────────────────────────────────────────────────┤
│                    数据长度 (4 bytes)                        │
├─────────────────────────────────────────────────────────────┤
│                    扩展长度 (2 bytes)                        │
├─────────────────────────────────────────────────────────────┤
│                          扩展数据                            │
├─────────────────────────────────────────────────────────────┤
│                          请求体                              │
└─────────────────────────────────────────────────────────────┘
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| Magic Number | uint32 | 固定值 `0x4B525043` ("KRPC")，用于协议识别 |
| Version | uint8 | 协议版本，当前为 `1` |
| Type | uint8 | 消息类型：1=请求, 2=响应, 3=单向, 4=心跳 |
| Codec | uint8 | 序列化类型：1=JSON, 2=Protobuf, 3=MessagePack |
| Status | uint32 | 状态码：0=成功, 其他=错误码 |
| Message ID | uint64 | 消息唯一标识，用于匹配请求响应 |
| Data Length | uint32 | 请求体长度 |
| Ext Length | uint16 | 扩展数据长度 |
| Extensions | bytes | 扩展数据（如 Trace ID、超时时间等） |
| Payload | bytes | 实际业务数据 |

#### 消息类型

```go
const (
    TypeRequest  uint8 = 1  // 请求消息
    TypeResponse uint8 = 2  // 响应消息
    TypeOneway   uint8 = 3  // 单向消息（无需响应）
    TypeHeartbeat uint8 = 4 // 心跳消息
)
```

#### 序列化类型

```go
const (
    CodecJSON       uint8 = 1  // JSON 序列化
    CodecProtobuf   uint8 = 2  // Protobuf 序列化
    CodecMsgPack    uint8 = 3  // MessagePack 序列化
)
```

#### 状态码

```go
const (
    StatusOK           uint32 = 0      // 成功
    StatusBadRequest   uint32 = 40001  // 请求格式错误
    StatusUnauthorized uint32 = 40003  // 未授权
    StatusNotFound     uint32 = 40004  // 服务/方法不存在
    StatusTimeout      uint32 = 40008  // 请求超时
    StatusInternalError uint32 = 50000 // 内部错误
)
```

### 实现路线图

#### Phase 1: 基础协议 (krpc-core)
- [x] 协议定义与编解码
- [x] 序列化接口实现 (JSON, Protobuf, MessagePack)
- [x] 消息封装

#### Phase 2: 传输层 (krpc-transport)
- [ ] TCP 传输实现
- [ ] 连接池管理
- [ ] 心跳机制

#### Phase 3: 服务端 (krpc-server)
- [ ] 服务注册与发现
- [ ] 请求路由与处理
- [ ] 负载均衡
- [ ] 优雅关闭

#### Phase 4: 客户端 (krpc-client)
- [ ] 服务调用代理
- [ ] 超时与重试
- [ ] 熔断降级

#### Phase 5: 高级特性
- [ ] 服务注册中心集成 (Consul/Nacos)
- [ ] 链路追踪
- [ ] 监控指标
- [ ] 限流与降级

---

## 学习路径建议

### 初级阶段（1-2 周）

1. **理论学习**
   - 理解 RPC 基本概念
   - 学习网络编程基础（TCP/IP、HTTP）
   - 了解序列化原理

2. **实践练习**
   - 使用 gRPC 实现一个简单的服务
   - 实现一个简单的 JSON-RPC 服务

### 中级阶段（3-4 周）

1. **深入学习**
   - 学习 HTTP/2 协议
   - 深入 Protobuf 使用
   - 了解服务治理（服务发现、负载均衡）

2. **实践练习**
   - 使用 gRPC 实现流式服务
   - 集成服务发现（如 Consul）
   - 实现自定义拦截器

### 高级阶段（4-6 周）

1. **源码学习**
   - 阅读 gRPC 源码
   - 学习主流 RPC 框架设计

2. **自主实现**
   - 设计并实现自定义 RPC 协议（krpc）
   - 实现完整的 RPC 框架

### 参考资源

**官方文档：**
- [gRPC 官方文档](https://grpc.io/docs/)
- [Thrift 官方文档](https://thrift.apache.org/docs/)
- [Protobuf 语言指南](https://protobuf.dev/programming-guides/proto3/)

**书籍推荐：**
- 《分布式系统原理与范型》
- 《微服务架构设计模式》
- 《Go 语言并发之道》

**开源项目：**
- [grpc-go](https://github.com/grpc/grpc-go)
- [apache/dubbo-go](https://github.com/apache/dubbo-go)
- [cloudwego/kitex](https://github.com/cloudwego/kitex)

---

## 附录

### 常见问题

**Q1: RPC 和 RESTful API 有什么区别？**

| 特性 | RPC | RESTful API |
|------|-----|-------------|
| 传输协议 | TCP/HTTP/HTTP/2 | HTTP |
| 数据格式 | 二进制/JSON | JSON/XML |
| 接口定义 | IDL/Schema | HTTP 方法 + 资源 |
| 性能 | 高 | 中 |
| 可调试性 | 中 | 高 |
| 耦合度 | 紧耦合 | 松耦合 |

**Q2: 如何选择合适的序列化方式？**

- 需要**高性能**：选择 Protobuf、MessagePack
- 需要**可读性**：选择 JSON
- 需要**Schema 演化**：选择 Protobuf、Avro
- 需要**零拷贝**：选择 FlatBuffers

**Q3: 什么时候应该使用 RPC？**

- 微服务架构内部通信
- 需要高性能的场景
- 跨语言服务调用
- 需要强类型接口定义

---

> 本文档持续更新中...
