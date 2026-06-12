# README

├── cmd/                 # 项目的各个入口程序
│   ├── new-chat-model/
│   │   └── main.go
│   └── new-chat-model-agent/
│       └── main.go
├── internal/            # 私有应用代码
│   ├── config/          # 配置加载
│   ├── newchatmodel/    # NewChatModel 案例
│   ├── newchatmodelagent/ # NewChatModelAgent 案例
│   └── shared/          # 共享初始化与提示词
└── go.mod

``` bash
# run
make run
make run-chat-model-agent

# or
CGO_ENABLED=0 go run ./cmd/new-chat-model
CGO_ENABLED=0 go run ./cmd/new-chat-model-agent
```
