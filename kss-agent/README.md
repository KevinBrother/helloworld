# Eino Agent 学习项目

| 入口 | 学习内容 | 运行 |
| --- | --- | --- |
| `cmd/new-chat-model` | ChatModel 单轮调用 | `make run` |
| `cmd/new-chat-model-agent` | 第二章：ChatModelAgent、Runner、事件流、控制台多轮历史 | `make run-chat-model-agent` |
| `cmd/memory-session` | 第三章：Memory、Session、JSONL 持久化与恢复 | `make run-memory-session` |
| [tool-filesystem](cmd/tool-filesystem/main.go) | 第四章：DeepAgent 自动注册文件工具，外加 `calculate`、`web_search`/`web_fetch` 与可选沙箱 `run_code` | `make run-tool-filesystem` |
| [manual-tools](cmd/manual-tools/main.go) | 第四章对照：ChatModelAgent 逐个定义、适配并注册 Tool | `make run-manual-tools` |

在项目根目录的 `.env` 中配置 `NEW_API_BASE_URL`、`NEW_API_KEY`、`NEW_API_MODEL`，格式参考 `.env.example`。`SYSTEM_PROMPT` 可选；`USER_PROMPT` 供第一个单轮示例使用。

```bash
# 第一章：问题来自参数或 .env 的 USER_PROMPT
CGO_ENABLED=0 go run ./cmd/new-chat-model "你好"

# 第二章：启动后在 you> 后逐轮输入，空行或 Ctrl+D 退出
CGO_ENABLED=0 go run ./cmd/new-chat-model-agent

# 自定义第二章的系统提示词
CGO_ENABLED=0 go run ./cmd/new-chat-model-agent --instruction "你是 Go 和 Eino 学习助手，请用中文解释。"

# 第三章：新建、恢复和列出持久化会话
CGO_ENABLED=0 go run ./cmd/memory-session
CGO_ENABLED=0 go run ./cmd/memory-session --session <会话ID>
CGO_ENABLED=0 go run ./cmd/memory-session --list

# 第四章：文件工具（会读写真实文件；默认 Shell 关闭）
CGO_ENABLED=0 go run ./cmd/tool-filesystem
CGO_ENABLED=0 go run ./cmd/tool-filesystem --session <会话ID>
# 启用沙箱代码执行（run_code）：先启动本机 OpenSandbox 服务，见下文
CGO_ENABLED=0 go run ./cmd/tool-filesystem --allow-code

# 对照：ChatModelAgent 手动注册相同类别的文件工具
CGO_ENABLED=0 go run ./cmd/manual-tools
# 恢复手动版会话：使用独立入口
CGO_ENABLED=0 go run ./cmd/manual-tools --session <会话ID>

# 本地测试与构建
make test
make build
```

第二章入口已改为交互式，不再接受位置参数作为单轮问题，也不读取 `USER_PROMPT`。每次运行的历史独立，退出后不会保存。

在 VS Code 选择 **Debug ch02 - ChatModelAgent 多轮对话**，按 F5，在集成终端输入问题。推荐在 `internal/agentconsole/turn.go` 的 `runner.Run`、`events.Next` 和 `events.go` 的 `stream.Recv` 处设置断点。

第三章在 VS Code 选择 **Debug ch03 - 新建持久化会话** 或 **Debug ch03 - 恢复持久化会话**。默认存储于 `data/sessions`（已加入 gitignore）；可用 `SESSION_DIR` 或 `--session-dir` 自定义目录，恢复时必须使用同一目录。自定义目录需要自行加入 gitignore。

第四章先看 [工具与文件系统学习笔记](docs/ch04-tool-filesystem.md)：包括建议演示顺序、代码阅读路线、协议持久化和安全边界。**`PROJECT_ROOT` 不是沙箱；Shell 默认关闭，但文件写入默认可用。** `grep` 还需要本机安装 `rg`。第三、四章的会话统一保存在 `data/sessions`，可通过 `SESSION_DIR` 或 `--session-dir` 修改。

`calculate` 是纯 Go 表达式求值器，无额外依赖，两个入口都注册。`run_code` 通过 [OpenSandbox](https://github.com/opensandbox-group/OpenSandbox) 在一次性容器里执行代码，默认关闭，只加在 DeepAgent 版；启用前先在本机准备服务：

```bash
make sandbox-up      # 拉取 code-interpreter 镜像并生成项目内 sandbox.toml
make sandbox-server  # 启动控制面（127.0.0.1:8080），另开终端运行入口
```

本地 Docker runtime 适合学习；生产用 Kubernetes operator + Fast Sandbox（Firecracker microVM），并配合 egress 白名单与凭证托管。`SANDBOX_DOMAIN`、`SANDBOX_PROTOCOL`、`SANDBOX_API_KEY`、`SANDBOX_IMAGE`、`SANDBOX_TTL`、`SANDBOX_RUN_TIMEOUT` 可覆盖默认配置。

前序内容见 [第二章学习笔记](docs/ch02-chatmodel-agent-runner.md) 和 [第三章学习笔记](docs/ch03-memory-session.md)。

```text
cmd/                            程序入口
  new-chat-model/                第一章
  new-chat-model-agent/          第二章
  memory-session/              第三章
  tool-filesystem/             第四章：DeepAgent 自动工具
  manual-tools/                第四章对照：ChatModelAgent 手动工具
internal/
  config/                       .env 与模型配置
  shared/                       模型创建、提示词等共享逻辑
  newchatmodel/                 第一章运行逻辑
  newchatmodelagent/
    run.go                      Agent、Runner、控制台与历史
    run_test.go                 不依赖外部模型的测试
  agentconsole/                第二至四章共享事件消费和流式输出
  calculator/                  纯 Go 表达式求值器与 calculate 工具
  sandbox/                     run_code 契约、工具层与 OpenSandbox runner（含 E2E 测试）
  webtool/                     web_search（托管搜索）与 web_fetch（受限抓取）
  toolfilesystem/              第四章 DeepAgent/手动 ChatModelAgent、工具与协议校验
  memorysession/               第三章控制台与持久化编排
  mem/                         Session、Store 与 JSONL 文件
data/sessions/                 运行时会话文件（不提交）
```
