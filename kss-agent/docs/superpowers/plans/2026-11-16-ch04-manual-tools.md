# ChatModelAgent 手动文件工具对照案例

> 历史方案：用户后续要求并批准改为两个独立入口，现由 [双入口计划](2026-11-16-ch04-separate-entries.md) 取代；下文保留原实施记录。

用户要求在第四章 DeepAgent 外增加手动注册各个 Tool 的 ChatModelAgent 案例，并要求继续执行。不提交、不推送，不改变已有暂存状态。

## 方案 / 短设计

采用同一个 CLI 的 `--agent deep|chat-model`（默认 deep），复用控制台、路径上下文和完整消息持久化。工具组装独立在 manual_agent.go 与 manual_tools.go，明确展示 `utils.InferTool / InferStreamTool → compose.ToolsNodeConfig.Tools → adk.NewChatModelAgent`。

不另复制一套控制台（避免错误处理与会话逻辑漂移），也不使用文件系统 Middleware 自动注册（不符合逐个注册的学习目标）。Eino v0.9.5 的单工具构造函数未导出，因此手写轻量适配器，将 JSON 参数映射到现有 LocalBackend，而非重新实现文件 I/O。

手动版提供 ls/read_file/write_file/edit_file/glob/grep，execute 只在 --allow-shell 时注册，调用 StreamingShell。无 write_todos、task、大结果自动卸载等预构建行为；grep 简化为返回匹配内容，不声称与 DeepAgent 完全等价。权限边界与 DeepAgent 一致：不是沙箱，写入默认启用。恢复命令包含 agent 模式；错误模式在创建会话和调用模型前拒绝。

## 实施计划（原生执行，测试优先）

- [x] 新增红灯测试：chat-model 模式真实读写/编辑/列目录/glob/grep，工具集合及 execute 开关，完整协议和恢复命令，模式非法值，默认仍为 deep。
- [x] 在 Options 增加 AgentType，集中校验模式。提取公共 instruction；新增 newManualAgent 和 newManualTools，逐项检查构造错误，传 ToolsConfig/MaxIterations=50。
- [x] 新增 CLI --agent，输出当前模式并在恢复命令保留；Make 与 F5 增加便捷手动入口。
- [x] 扩充第四章笔记：两种运行命令、逐工具代码、Schema/Backend/注册关系，区分自动能力和手动责任，澄清 ChatModelAgent 本身可提供工具/任务/子 Agent 扩展。
- [x] make test、make build、CGO_ENABLED=0 go vet ./...、help smoke、git diff --check；独立审查本次增量并处理反馈。

## 审查重点

- 两个模式不共用 tool 状态，空输入不调用模型，DeepAgent 默认工具集合不变。
- JSON 参数显式 snake_case，schema 和实际调用一致；错误透传，不把失败写成成功结果。
- stream reader 转换关闭上游，输出带退出码；离线测试不执行真实 Shell。
- 原有未提交/暂存代码保留，不调用模型和读取密钥。

## 实际验证与审查

- 全量 make test / make build / CGO_ENABLED=0 go vet ./... / --help / git diff --check 全部通过。
- 独立审查无 Critical / Important；一条 Minor 建议补齐 execute 流错误与关闭测试，已增加 manual_stream_test.go，验证启动错误、接收错误、Close 级联与 nil 分片跳过，测试通过。
- 集成测试以真实 ChatModelAgent + Runner + LocalBackend 完成 write/edit/read 和完整历史恢复，另验证 ls/glob/grep；Shell 只替换边界，不执行真实命令。未验证真实模型服务。
