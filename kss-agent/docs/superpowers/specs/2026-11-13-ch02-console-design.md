# 第二章：Runner 与控制台多轮对话

目标：对照官方 `quickstart/chatwitheino/cmd/ch02/main.go`，补齐现有 `new-chat-model-agent`，让学习者能运行、调试并理解事件流与消息历史。

方案：直接扩展现有入口，复用 OpenAI-compatible 模型和 `.env` 配置。独立新建 `cmd/ch02` 会重复现有案例；把所有逻辑塞进 main 会妨碍测试。采用薄入口、内部运行逻辑和独立事件消费函数。

设计：创建一次 ChatModelAgent 和启用流式的 Runner；逐行读取 `you> ` 输入；每轮传入完整内存历史；消费 AgentEvent，逐片打印并收集合并的消息；成功后追加历史。空行或 EOF 退出，读取、模型和输出错误向上传递。无工具、持久化或历史裁剪。

实现选择：使用当前项目的 `*schema.Message` API，不引入上游示例的 AgenticMessage 双类型封装；保留 `--instruction`，原来的位置参数单轮入口改为控制台交互。新增 VS Code integratedTerminal 配置和中文学习文档。

约束：CGO_ENABLED=0；不升级依赖；不创建 worktree；不 commit/push。用本地替身模型运行真实 Agent/Runner 测试，不请求外部模型。
