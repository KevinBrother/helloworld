# node-server 服务端常用案例场景

[x] jwt

[x] grpc

    [ ] 直接使用编译后的 js 文件

    ``` bash
    # 安装编译工具
    brew install protobuf 
    # protobuf 不能编译 js 相关的文件，需要额外安装工具
    brew install protoc-gen-grpc-web

    # 编译
    protoc --js_out=import_style=commonjs,binary:./ helloworld.proto

    ```
    [protobufjs-cli](https://www.npmjs.com/package/protobufjs-cli)

[x] proxy 如何使用系统代理

[ ] 深入理解 event、stream、net 模块

[ ] 微服务中的rpc

[ ] 文件上传


[ ] 框架 express、koa、nestjs

[ ] 缓存

[ ] 中间件：mysql、redis、mongodb、rabbitMQ


[ ] 定时任务



