# 第五章：Middleware

对应 [Eino 第五章官方教程](https://www.cloudwego.io/zh/docs/eino/quick_start/chapter_05_middleware/)，建议结合 [第四章笔记](ch04-tool-filesystem.md) 和代码对照阅读。Middleware 是在 Agent、Model、Tool 的固定执行点上包一层的官方扩展点；本章把它接进第四章的 DeepAgent，把工具错误与限流错误变成可恢复信息，而不是保证所有错误都能恢复。

## 先运行：与第四章对照

不新增入口，第五章就在第四章的 [cmd/tool-filesystem](../cmd/tool-filesystem/main.go) 里：默认开启安全工具包装和限流重试。在 `kss-agent` 模块根目录执行，沿用第四章的 `NEW_API_BASE_URL`、`NEW_API_KEY`、`NEW_API_MODEL`，模型需支持 Tool Calling 和 Streaming。不要把密钥放进命令或会话记录。

```bash
# 默认：safe-tools 恒定启用 + 最多 5 次限流重试
make run-tool-filesystem
CGO_ENABLED=0 go run ./cmd/tool-filesystem --project-root /absolute/path/to/practice

# 对照：关闭限流重试
CGO_ENABLED=0 go run ./cmd/tool-filesystem --max-retries 0
```

| 对照项 | 关闭 Middleware | 默认开启 |
| --- | --- | --- |
| 工具返回 error | 工具节点终止本轮，程序退出 | 转为正常工具结果 `[tool error] ...`，模型可尝试自纠；不保证成功 |
| 模型调用遇到 429 | 错误终止本轮 | 只对识别出的限流错误重试，耗尽后仍失败 |
| Agent 组装 | 无 | [agent.go](../internal/toolfilesystem/agent.go) 追加 Handler 并设置 `ModelRetryConfig` |
| 启动横幅 | 无中间件提示 | 显示 safe-tools 状态与重试上限 |

safe-tools 没有开关：Handler 恒定注入，这就是本章要学的安全默认。`--max-retries 0` 只是不安装重试配置，其余部分（DeepAgent、工具、流式控制台、JSONL 会话）与第四章完全一致；要对照无 Middleware 的行为，请查看 git 历史里的第四章版本。路径上下文不是沙箱，文件写入默认启用，Shell 和 `run_code` 仍需显式开启；失败前的文件修改不会回滚。会话与权限细节见第四章。

`internal/toolfilesystem/manual_agent.go` 的手动版入口不注入 Middleware，保留作第四章对照。

## 洋葱模型与代码映射

`adk.ChatModelAgentMiddleware` 提供 Agent/Model/Tool 生命周期的包装点，`safeTool` 嵌入 `adk.BaseChatModelAgentMiddleware`，只覆盖需要的工具调用方法。[agent.go](../internal/toolfilesystem/agent.go) 将它追加到 `deep.Config.Handlers`；模型重试通过 `deep.Config.ModelRetryConfig` 配置，而不是工具 Handler。

Handlers 中先注册的在最外层：`[A, B, C]` 包装为 `A(B(C(tool)))`。请求从外到内，返回从内到外。本例将 `safeTool` 追加在最后，因此它位于最内层，最接近真实工具。

安全工具先接住实际工具的普通错误，再让外层看到正常结果；若以后增加 Handler，应检查其加入顺序及其自身可能产生的错误，不要假设内层能捕获外层错误。

| 教程概念 | 本仓库实现 |
| --- | --- |
| 同步工具包装 | [safetool.go](../internal/toolfilesystem/safetool.go) 的 `WrapInvokableToolCall` |
| 流式工具包装 | 同文件 `WrapStreamableToolCall` 和 `safeStream` |
| 增强工具包装 | `WrapEnhancedInvokableToolCall`、`WrapEnhancedStreamableToolCall`，使用 `schema.ToolArgument` 和 `schema.ToolResult` |
| 限流判定 | [retry.go](../internal/toolfilesystem/retry.go) 的 `isRateLimited` 与 `adk.ModelRetryConfig.ShouldRetry` |
| 装配与提示 | [agent.go](../internal/toolfilesystem/agent.go)、[run.go](../internal/toolfilesystem/run.go) 的 `middlewareHints` 与恢复命令 |

## SafeTool：错误是结果，但取消不是

普通同步调用的错误转换为精确格式 `[tool error] <原始错误>`，同时返回 `nil` error；增强同步调用则把同样文本放入 `schema.ToolResult` 的文本 part。只有作为正常工具结果返回，模型才能读到并决定如何继续。

工具本来就返回的正常结果（例如 `calculate` 的 `error: ...` 文本）不会再被包装。

流式入口若立即报错，返回只含该文本的结果流；读取过程中使用 Eino 的惰性 `schema.StreamReaderWithConvert` 适配器（`schema.WithErrWrapper` + `schema.WithOnEOF`），没有 goroutine 和管道。`Recv` 报普通错误时只暂存第一个错误并继续读取，在最终 EOF 前输出一帧 `[tool error] ...`。增强流使用文本 `ToolResult`。关闭返回的 reader 会关闭包装的上游 reader，无需额外的关闭处理；由于错误帧在 EOF 时输出，上游报错后若一直不关闭，消费者会一直等待。

例外是 `compose.IsInterruptRerunError` 识别的中断和调用时 `ctx.Err() != nil`：必须原样透传，不能把取消伪装成成功。判断的是实际调用闭包收到的 ctx，不是创建 Handler 时可能已取消的 ctx。反过来，工具自己超时但外层调用 ctx 尚未取消时，即使错误是超时，也作为普通工具错误交给模型；不要只按错误类型一概透传。

`run_code` 的控制面不可达等基础设施错误、`web_search` 服务端不支持等错误也可被转换，但不会回退到宿主机执行。`web_fetch` / `web_search` 的地址校验、内网屏蔽和不可信内容策略不因此放宽；模型可能收到拒绝结果并尝试其他步骤，不能把这当作额外授权。

## 模型限流重试

[retry.go](../internal/toolfilesystem/retry.go) 用 `ShouldRetry` 检查错误文本（忽略大小写），关键词为 `429`、`too many requests`、`rate limit`、`qpm limit`、`tpm limit`。这是字符串匹配，不是可靠的状态码解析；其他错误不重试，匹配也不保证请求一定成功。Eino v0.9.5 已将教程中的 `IsRetryAble` 标记为 deprecated，`ShouldRetry` 提供更丰富的决策信息，设置后旧字段被忽略。

默认最多 **5 次重试**（加首次最多 6 次模型调用）；`--max-retries 0` 不安装重试配置，负数在命令行层被拒绝。未指定退避函数时使用 Eino 默认指数退避：基础 100ms，指数增长，基础延迟上限 10s，并加 0–50% 随机抖动。仅模型调用使用此重试，不自动重放工具。

## 试一试

1. 在不含敏感文件的练习目录，让模型调用一个确定会返回工具 error 的工具。例如端点不支持托管搜索时，请它使用 `web_search`；观察 `tool>` 结果中的 `[tool error] ...` 和后续模型回答或自纠。模型可能无法解决问题，且转成结果不代表工具成功。

   模型是否调用指定工具及服务端是否支持搜索都影响复现，不要把正常文本错误当作 Go error。
2. 对照第四章：用 `git stash`/`git show` 或历史版本运行同一请求，观察工具错误直接终止本轮，而不是交给模型。
3. 使用有授权的测试端点或代理，让它对模型请求先返回一次含 `429` 的限流错误、随后成功；断在 `ShouldRetry` 或查看服务端请求日志，确认再次请求。

   可用 `--max-retries 0` 对照；不要通过压测真实服务制造限流。启动横幅仅显示配置，不是重试发生的日志，也不保证每次都会出现 429。

横幅 `中间件: safe-tools 已启用（工具错误转为 [tool error] 交给模型自纠）` 是恒定状态提示，不是开关。

`模型重试: 最多 5 次（仅限流）` 表示上限，设为 0 则显示 `模型重试: 关闭`。

退出时的恢复命令在启用重试时追加 `--max-retries=<n>`，`--max-retries 0` 时不追加，保持第四章命令原样。

## 代码阅读与断点

按 [safetool.go](../internal/toolfilesystem/safetool.go) → [retry.go](../internal/toolfilesystem/retry.go) → [agent.go](../internal/toolfilesystem/agent.go) 的装配段 → [run.go](../internal/toolfilesystem/run.go) 的 `middlewareHints` 与恢复命令 → [cmd/tool-filesystem/main.go](../cmd/tool-filesystem/main.go) 的两个新开关阅读。

建议断在 `WrapInvokableToolCall` 返回的闭包内、`schema.WithErrWrapper` 回调、`schema.WithOnEOF` 回调、返回的 reader 的 `Recv` 和 `ShouldRetry`，观察调用 ctx、工具错误、流帧和重试决策。

网络和服务能力相关的演示需真实模型配置；离线测试可用 `make test`，完整构建用 `make build`。

## 常见坑

- `[tool error] ...` 要作为正常结果而非非 nil error 返回，否则工具节点仍会终止本轮。
- Handler 创建时的 ctx 可能已经取消；应检查每次调用实际收到的 ctx，且保留 interrupt 语义。
- 流式包装应使用惰性适配器，而不是将流复制到管道，因为消费者提前停止时复制 goroutine 可能阻塞在 `Recv`；适配器不需要 goroutine，关闭返回的 reader 即可释放上游。
- 启动横幅是配置状态，不是每次工具错误或重试的事件记录；错误文本与会话也可能包含敏感信息，应避免传入密钥。
- 恢复会话不重放工具或恢复文件快照；失败不回滚已经完成的副作用，不要盲目重复操作。
