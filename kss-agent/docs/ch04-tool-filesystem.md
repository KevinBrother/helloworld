# 第四章：工具与文件系统

对应 [CloudWeGo 官方教程](https://www.cloudwego.io/zh/docs/eino/quick_start/chapter_04_tool_and_filesystem/)。保留前三章，使用当前项目 Eino v0.9.5 的 `deep.New`，而不是直接复制上游最新 Typed 示例。

## 先运行

前提：Go 1.22.6+，macOS / Unix，本地模型配置支持 **Tool Calling + Streaming**。沿用项目环境变量 `NEW_API_BASE_URL`、`NEW_API_KEY`、`NEW_API_MODEL`；不要把真实密钥写入学习材料。`grep` 工具还依赖系统的 `rg`（ripgrep），可先执行 `command -v rg` 检查。

```bash
# 在项目根目录执行。默认 Shell 关闭，
make run-tool-filesystem
# 或直接启动，并限定“路径上下文”到自己的练习目录（目录需预先存在）
CGO_ENABLED=0 go run ./cmd/tool-filesystem --project-root /absolute/path/to/practice
# 恢复：用程序退出时显示的会话 ID；自定义过目录则必须带上相同参数
CGO_ENABLED=0 go run ./cmd/tool-filesystem --session <会话ID> --project-root /absolute/path/to/practice
# 确有需要时才启用本地 Shell
CGO_ENABLED=0 go run ./cmd/tool-filesystem --allow-shell
# 参数说明（不会调用模型）
CGO_ENABLED=0 go run ./cmd/tool-filesystem --help
```

空行或 Ctrl+D 退出。Ctrl+C 会取消正在执行的模型/工具调用；终端空闲等待输入时，可能还需回车或 Ctrl+D 才结束。`--instruction` / `SYSTEM_PROMPT` 可覆盖助手提示词，但路径上下文始终追加。

路径优先级：`--project-root` > `PROJECT_ROOT` > 启动时当前目录，转换为绝对路径并验证目录存在。会话目录与第三章一致：`--session-dir` > 环境变量 / `.env` 的 `SESSION_DIR` > `data/sessions`（默认已忽略）。两个入口共用同一目录，会话文件用 ID 区分；不要把一个会话同时交给两个入口恢复，也不要让多个进程同时写。恢复时路径、提示词与 Shell 权限来自本次启动参数，不从会话自动恢复。

## 对照案例：ChatModelAgent 逐个注册 Tool

不必为了访问文件而强制切换 DeepAgent。它的优势是已经组合好了工具和提示词；普通 ChatModelAgent 可以用 `ToolsConfig` 手动接入同一个 Backend。

```bash
# A：DeepAgent，由 Backend 配置自动注册工具（独立 DeepAgent 入口）
make run-tool-filesystem
# B：ChatModelAgent，手动定义、适配并逐个注册工具
make run-manual-tools
# 等价命令，可用同一批参数指定练习目录
CGO_ENABLED=0 go run ./cmd/manual-tools --project-root /absolute/path/to/practice
# 手动版恢复：使用手动版入口，亦可直接复制程序给出的恢复命令
CGO_ENABLED=0 go run ./cmd/manual-tools --session <会话ID>
# 两个入口均需显式开启 execute；下面仅作命令示例
CGO_ENABLED=0 go run ./cmd/manual-tools --allow-shell
```

两个案例有**独立的程序入口**，不再通过 `--agent` 参数切换。DeepAgent 从 [tool-filesystem 入口](../cmd/tool-filesystem/main.go) 调用 `toolfilesystem.Run`，手动版从 [manual-tools 入口](../cmd/manual-tools/main.go) 调用 `toolfilesystem.RunManual`。两者固定绑定各自的 Agent 构造函数，只复用 Runner、流式输出和 JSONL 会话代码。

恢复命令会指向对应程序。建议各新建一个会话，给出相同问题来比较事件。

### 手动版三步

1. 在 [手写工具适配器](../internal/toolfilesystem/manual_tools.go) 定义带 `json` / `jsonschema` 标签的参数结构（模型看到的契约）。Backend 的请求类型没有这些 JSON 标签，不直接当作模型参数。
2. 每个工具分别调用 `utils.InferTool`（或 `InferStreamTool`），把模型参数映射到 Backend 方法，并将结果/错误交回工具框架。这里不是调用文件系统 Middleware 来偷偷自动注册。
3. 在 [手动 Agent 组装](../internal/toolfilesystem/manual_agent.go) 将明确列出的工具传入 `ToolsConfig`，再创建 ChatModelAgent。

以 `read_file` 为例，核心形状如下（完整错误处理、默认分页和其余工具见源代码）：

```go
read, err := utils.InferTool("read_file", "Read text from an absolute file path.",
    func(ctx context.Context, args readArgs) (string, error) {
        result, err := backend.Read(ctx, &filesystem.ReadRequest{
            FilePath: args.FilePath, Offset: args.Offset, Limit: args.Limit,
        })
        if err != nil { return "", err }
        return result.Content, nil
    })
// 检查每个构造错误后，显式列出全部工具；execute 仅按开关追加。
tools := []tool.BaseTool{ls, read, write, edit, glob, grep}
// adk.NewChatModelAgent 的配置中：
ToolsConfig: adk.ToolsConfig{
    ToolsNodeConfig: compose.ToolsNodeConfig{Tools: tools},
},
```

| Tool | 手动适配到的 Backend 方法 | 结果 |
| --- | --- | --- |
| `ls` | `LsInfo` | 文件条目 JSON |
| `read_file` | `Read` | 原始文本，默认最多 2000 行 |
| `write_file` | `Write` | 写入成功说明；失败透传 error |
| `edit_file` | `Edit` | 替换成功说明；失败透传 error |
| `glob` | `GlobInfo` | 匹配文件信息 JSON |
| `grep` | `GrepRaw` | 路径、行号、匹配内容 JSON；需要 `rg` |
| `execute`（默认不注册） | `ExecuteStreaming` | 通过 `InferStreamTool` 转换输出流，并保留退出码/截断提示 |

`Runner` 和 ChatModelAgent 仍负责“模型决定调用 → 执行 Tool → 将结果回传模型”的循环，不需要应用手写循环执行器。手动版与 DeepAgent 不是字节级等价实现：手动版没有内置的结果格式化、`grep` 输出模式/分页、大结果自动卸载或任务状态管理；大型目录可能返回过多数据，练习时请使用小型目录。

### 如何理解教程的能力对比

| 维度 | 本项目 ChatModelAgent 手动版 | 本项目 DeepAgent 版 |
| --- | --- | --- |
| 文件工具 | 逐个定义 Schema、适配 Backend、注册 Tools | 配置 Backend 自动提供 |
| Shell | 显式构造流式 execute 并注册 | 配置 StreamingShell 自动提供 |
| `write_todos` | 未加入；可自行定义/扩展，不是不能做 | 预构建默认提供 |
| 子 Agent | 本例未加入，可另行编排/工具化接入 | 预构建支持；本章为聚焦文件工具关闭了 general subagent |
| 历史/输出 | 相同的完整工具协议持久化和流式控制台 | 相同 |

所以教程表格更准确的读法是“是否开箱即用/一级配置”，而不是“ChatModelAgent 技术上不支持”。**手动版需要自己承担 Schema、描述、错误、输出大小和权限设计；DeepAgent 省掉了这些常见组合工作。** 两者在本项目都不是安全沙箱。

## 务必知道的权限边界

- **本地 Backend 不是沙箱。** `PROJECT_ROOT` 只是提示词里的路径上下文，不会限制实际访问目录，也不会改变 Shell 工作目录。绝对路径只是消除歧义，并不能带来安全隔离。
- 默认就有文件写入工具，关闭 Shell **不等于只读模式**。模型可以通过 `write_file` / `edit_file` 修改当前用户有权限访问的真实文件；没有逐次人工审批。
- `--allow-shell` 使 `execute` 可执行真实本地命令，没有命令白名单、容器隔离或目录强制限制。不要对陌生仓库或不可信提示词开启；提示词中的约束不是权限控制。
- 推荐使用不含密钥的临时练习目录；需要强隔离时请在容器/低权限账号中运行。读取仓库内容也可能遭遇提示词注入，不能把文本指令当成授权。
- 工具参数和结果会打印在终端，成功轮次的完整协议会写入 JSONL，**不做敏感信息脱敏**。不要让模型读取 `.env`、私钥或其他敏感文件，也不要把会话日志提交进 Git。
- 中途失败不会回滚已完成的文件修改；程序不会自动重放工具。先检查磁盘再决定后续动作。

## 建议演示顺序

在单独练习目录中依次输入：

1. “列出项目目录的文件，只查看不要修改。”——观察 `ls` 的参数、结果和最后总结。
2. “读取 README.md 并概括内容，不存在就说明，不要创建。”——观察 `read_file`。
3. “创建 learning-note.txt，写入今天学习 Eino 工具调用，然后读回来核对。”——观察 `write_file → read_file`。先确认同名文件不存在。
4. “把 learning-note.txt 里的‘今天学习’改成‘继续学习’，然后核对。”——观察 `edit_file`。
5. “用 glob 找出 Markdown，再用 grep 查找 Eino。”——`grep` 需要 `rg`。
6. 退出后用输出的恢复命令重启，问“刚才修改了哪个文件？”——观察历史恢复而非重复执行。

DeepAgent 版的 `write_todos` 默认保留用于任务拆解；为聚焦本章，禁用默认 general subagent（不注册 `task`）。手动 ChatModelAgent 版不注册这两个工具。TODO 运行状态不是应用持久化快照，跨进程只恢复消息，不恢复内部 TODO/执行状态。

## 代码阅读路线

1. [DeepAgent 入口](../cmd/tool-filesystem/main.go) 和 [ChatModelAgent 手动版入口](../cmd/manual-tools/main.go)：各自的参数、dotenv、信号取消和固定运行函数。
2. [Agent 组装](../internal/toolfilesystem/agent.go)：`localbk.NewBackend` → `deep.Config` → `deep.New`。传 `Backend` 自动提供 `ls/read_file/write_file/edit_file/glob/grep`，仅明确允许时传 `StreamingShell` 注册 `execute`。
3. [控制台与会话](../internal/toolfilesystem/run.go)：恢复历史 → 保存用户意图 → `Runner.Run` → 收集成功轮次 → 逐消息保存。
4. [共享事件循环](../internal/agentconsole/turn.go)：区分 `assistant>` 和 `tool>`，工具参数先合并流分片再打印。
5. [流式消息收集](../internal/agentconsole/events.go)：`Recv` 输出正文，`ConcatMessages` 保存完整 `ToolCalls`，不是只保存文字摘要。
6. [历史协议校验](../internal/toolfilesystem/history.go)：拒绝缺少结果、孤立结果、重复结果等不完整工具链，避免发给模型后报协议错误或误重放工具。
7. [DeepAgent 离线测试](../internal/toolfilesystem/run_test.go) 与 [ChatModelAgent 手动版测试](../internal/toolfilesystem/manual_agent_test.go)：只替换外部 LLM，保留真实 Agent、Runner、Backend 与 Store，在临时目录验证读写和恢复。[execute 流测试](../internal/toolfilesystem/manual_stream_test.go) 替换 Shell 边界，验证错误、跳过空分片和关闭传播，不执行真实 Shell。

典型事件序列：

```text
user → assistant(tool_calls: id/name/arguments)
     → tool(tool_call_id + result)
     → assistant(final answer)
```

终端先流式输出正文，再显示 `[tool call] read_file id=… args={…}`，随后显示 `tool> read_file: …`。工具调用参数可能跨多个流分片，不能逐片当作完整 JSON 使用。

与第三章的区别不是“多了一个接口”，而是一个用户输入会触发多次模型调用和工具执行。普通 ChatModelAgent 也可手动挂工具；DeepAgent 是现成组合，不是唯一实现工具调用的方式。

## 持久化与失败语义

用户消息先保存，只有整个轮次成功、协议完整后才追加全部 assistant/tool 消息。模型、工具或输出失败时不保存该轮的半条工具链，但用户意图仍在，磁盘副作用也可能已发生。

底层 JSONL 按消息追加，**不是跨消息事务**。保存途中崩溃可能产生不完整工具批次，重新启动时会拒绝这类会话；请新建会话并人工检查文件，不要盲目重试。会话恢复只回传已有结果给模型，不会自动恢复或重放工具执行、文件快照或 DeepAgent 内部状态。不要让多个进程同时写同一个会话。

VS Code 选择 **Debug ch04 - 工具与文件系统（Shell 关闭）** 或 **Debug ch04 - ChatModelAgent 手动注册工具（Shell 关闭）**。手动版建议先在 `newManualAgent` / `newManualTools` 的参数映射闭包处断点，观察模型 JSON 如何转为 Backend 请求。通用断点：`newAgent`、`agentconsole.RunTurn` 的 `events.Next()`、`printMessage` 的 `stream.Recv()`，以及 `session.Append`。

## 本地验证

```bash
make test
make build
CGO_ENABLED=0 go vet ./...
```

测试无需模型密钥或网络，不执行 Shell 命令。它验证了真实文件工具、分片参数、会话恢复、工具权限注册、多轮历史以及输入/输出/模型错误；真实服务端的 Tool Calling 支持还需配置模型后手工演示确认。
