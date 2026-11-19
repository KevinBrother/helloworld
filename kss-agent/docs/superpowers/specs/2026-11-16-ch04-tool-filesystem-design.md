# 第四章：Tool 与文件系统访问

## 意图与约束

按用户“准备代码，稍后来看”的安排，在现有学习项目中准备第四章，不阻塞等待逐项讨论。沿用 Go 1.22.6、Eino v0.9.5、OpenAI 配置和 JSONL Store；不改变前三章使用方式，不 commit/push，不修改 .env。以下是实现选择，待用户回来评审，并非人工已批准。

## 方案比较

- 选择独立 `cmd/tool-filesystem` + `internal/toolfilesystem`，使用官方 LocalBackend 和 `deep.New`，复用 agentconsole 和 mem，便于按章对照。
- 不手写文件工具：避免把学习重点从 DeepAgent 配置变成 Backend 实现。
- 不替换第三章入口：保留纯对话与文件工具的对照。

## 行为与安全边界

- `--project-root` > `PROJECT_ROOT` > 当前目录，转绝对路径并验证存在且为目录。根路径上下文始终附加到 instruction。
- LocalBackend **不是沙箱**，根目录只是提示词约定。默认仍可读写主机文件；启动时和文档中明确警告。先在临时练习目录使用，不读密钥。
- 默认关闭 execute，用 `--allow-shell` 显式开启 StreamingShell。关闭通用子 Agent，保留 write_todos，聚焦本章。
- 会话默认 `data/sessions`；支持 `--session-dir`、`--session`。成功一轮保存完整 assistant tool_calls → tool results → assistant 消息。错误终止，不自动重试，不回滚已执行的副作用。
- 恢复前校验工具调用闭合，防止崩溃留下的不完整协议历史发给模型；JSONL 的多消息保存不是事务。只恢复消息，不恢复文件、TODO、权限或执行现场。
- agentconsole 保留 assistant 流式显示；工具结果用 `tool> name:` 区分。流式工具参数拼接后完整打印，保留 ID、名称、JSON。无工具时保持原输出。
- 参数与配置优先级沿用项目风格；--instruction 优先于 SYSTEM_PROMPT。空行/EOF 退出，Ctrl+C 取消运行中的模型/工具（不承诺中断终端 Scan）。
- 不引入权限沙箱、命令审批、自动克隆、Middleware 容错或 Trace。本地 Backend v0.2.4 支持 Unix/macOS，grep 依赖系统 rg；绝对路径不等于访问控制。

## 文件职责与验证

入口负责参数和取消；run.go 负责会话与循环；agent.go 负责根目录、提示词和 DeepAgent；history.go 校验历史。共享事件消费器负责展示和收集，不创建新控制台框架。补学习笔记、Makefile 和 F5 配置。

离线 fake 仅替换外部 LLM，真实使用 DeepAgent、Runner、LocalBackend 和临时目录，覆盖读取/写入、工具参数和结果、多轮/跨运行恢复、Shell 开关、路径验证、空输入与错误。执行 make test、make build、go vet、git diff --check；不使用真实 API Key 发请求。

参考：https://www.cloudwego.io/zh/docs/eino/quick_start/chapter_04_tool_and_filesystem/
最新上游示例已使用 Typed API；本项目使用 v0.9.5 可用的标准 Message API，避免无关升级。
