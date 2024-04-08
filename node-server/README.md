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



[ ] 文件上传

[ ] 缓存

[ ] 消息队列
