# test


## GRPC 调试工具 grpcurl 使用示例
``` bash
  brew install grpcurl
  # 列出所有服务
  grpcurl -plaintext localhost:50051 list

    # 列出 UserService 服务的方法
  grpcurl -plaintext localhost:50051 list user.UserService

   # 查看某个方法的详细描述
  grpcurl -plaintext localhost:50051 describe user.UserService.GetUser

  # 调用方法
  grpcurl -plaintext localhost:50051 user.UserService.ListUsers

  # 查看 user 包中的其他信息
  grpcurl -plaintext localhost:50051 describe user.GetUserRequest

  # 带参数的调用 grpcurl 对 -d 参数解析的问题。使用 stdin 传递数据：
   echo '{"id": 1}' | grpcurl -plaintext -d @ localhost:50051 user.UserService.GetUser
```

## wireshark 抓包查看 grpc 流量

 insecure.NewCredentials()，即明文 HTTP/2 连接（无 TLS 加密），所以可以直接抓包分析。

  用 Wireshark 抓 gRPC 包的方法

  1. 基本抓包

  # 方式一：用 Wireshark GUI 直接抓
  sudo wireshark

  # 方式二：命令行抓包保存到文件
  sudo tshark -i any -f "tcp port 50051" -w grpc.pcap

  2. 过滤器设置

  在 Wireshark 中使用过滤器：

  # 基本过滤
  tcp.port == 50051

  # 只看 HTTP/2 帧
  http2

  # 看特定流
  tcp.stream == 0

  3. 解析 gRPC 内容

  由于 gRPC 基于 HTTP/2 且使用 Protobuf 编码，Wireshark 需要配置才能解析：

  方法 A：启用 HTTP/2 解析
  - Edit → Preferences → Protocols → HTTP/2
  - 确保勾选 "Attempt to decode HTTP/2 headers"

  方法 B：查看原始数据
  - 右键数据包 → Follow → TCP Stream
  - 可以看到 HTTP/2 帧，但 Protobuf 消息体是二进制，不易读