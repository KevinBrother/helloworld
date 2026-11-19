# 第四章两个独立入口实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用户已批准拆成 DeepAgent 与 ChatModelAgent 手动版两个独立程序入口，取消 --agent 选择。
**Architecture:** cmd/tool-filesystem 固定调用 toolfilesystem.Run（DeepAgent）；cmd/manual-tools 固定调用 toolfilesystem.RunManual（ChatModelAgent）。两条运行函数在各自 Agent 文件中明确绑定构造函数，再注入共享模型加载/控制台，不在共享代码中判断模式。入口参数保持短小可独立阅读；不为几十行参数定义再增加 CLI 抽象。
**Tech Stack:** Go 1.22.6、Eino v0.9.5；无需新依赖。
**Spec:** 本文件兼作用户已批准的短设计，取代上一份计划的单入口方案。

## Global Constraints

- 不兼容保留 --agent；不提交、不推送、不改变已有暂存状态。
- 保留工具适配器和权限边界，不调用真实模型或 Shell。
- DeepAgent 会话目录保持 data/sessions；手动版默认 data/sessions，均被现有 gitignore 覆盖。

## Review Focus

- 两个 CLI 不接受 --agent，且 help 各自成功退出。
- 恢复命令指向正确的程序，保留 Shell/路径/会话参数。
- 默认目录隔离，程序化 RunManual 也选择手动默认目录。
- DeepAgent 保留 write_todos，手动版无 write_todos/task。
- Make build 包含两个程序，F5 指向各自目录。

## 单任务：拆分入口并同步验证

- [x] RED：Deep CLI 拒绝 --agent；新增手动入口参数测试；手动控制台恢复命令不含 --agent、指向 cmd/manual-tools。
- [x] 实现：共享 run/runConsole 接受已确定的 agentFactory 和 command，不再解析 AgentType；Run/RunManual 分别绑定 newAgent/newManualAgent。
- [x] 新增 cmd/manual-tools/main.go 与测试；删除旧 AgentType、normalizeAgentType 与模式测试。
- [x] 更新 Make、F5、README、第四章文档；旧计划注明被本方案取代。
- [x] make test、make build、go vet、两个 help、git diff --check；独立增量审查。

原生执行。用户已在对话中批准上述双入口结构，不再等待额外批准，不使用 worktree。
