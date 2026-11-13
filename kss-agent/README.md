# Eino Agent 学习项目

| 入口 | 学习内容 | 运行 |
| --- | --- | --- |
| `cmd/new-chat-model` | ChatModel 单轮调用 | `make run` |
| `cmd/new-chat-model-agent` | 第二章：ChatModelAgent、Runner、事件流、控制台多轮历史 | `make run-chat-model-agent` |

在项目根目录的 `.env` 中配置 `NEW_API_BASE_URL`、`NEW_API_KEY`、`NEW_API_MODEL`，格式参考 `.env.example`。`SYSTEM_PROMPT` 可选；`USER_PROMPT` 供第一个单轮示例使用。

```bash
# 第一章：问题来自参数或 .env 的 USER_PROMPT
CGO_ENABLED=0 go run ./cmd/new-chat-model "你好"

# 第二章：启动后在 you> 后逐轮输入，空行或 Ctrl+D 退出
CGO_ENABLED=0 go run ./cmd/new-chat-model-agent

# 自定义第二章的系统提示词
CGO_ENABLED=0 go run ./cmd/new-chat-model-agent --instruction "你是 Go 和 Eino 学习助手，请用中文解释。"

# 本地测试与构建
make test
make build
```

第二章入口已改为交互式，不再接受位置参数作为单轮问题，也不读取 `USER_PROMPT`。每次运行的历史独立，退出后不会保存。

在 VS Code 选择 **Debug ch02 - ChatModelAgent 多轮对话**，按 F5，在集成终端输入问题。推荐在 `run.go` 的 `runner.Run`、`events.Next` 和 `events.go` 的 `stream.Recv` 处设置断点。

详细说明见 [第二章学习笔记](docs/ch02-chatmodel-agent-runner.md)。

```text
cmd/                            程序入口
  new-chat-model/                第一章
  new-chat-model-agent/          第二章
internal/
  config/                       .env 与模型配置
  shared/                       模型创建、提示词等共享逻辑
  newchatmodel/                 第一章运行逻辑
  newchatmodelagent/
    run.go                      Agent、Runner、控制台与历史
    events.go                   消息流显示与合并
    run_test.go                 不依赖外部模型的测试
```
