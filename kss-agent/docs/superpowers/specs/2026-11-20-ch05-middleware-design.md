# 第五章 Middleware：并入第四章 DeepAgent

日期：2026-11-20
范围：`kss-agent`（分支 `ai-agent`）
状态：已实现，未提交

## 目标

按教程实现第五章的 Middleware 能力，但不新增 `cmd` 入口：在第四章 DeepAgent（`internal/toolfilesystem`）内部注入，默认开启，可用参数关闭以对照第四章行为。

## 结构

| 文件 | 内容 |
| --- | --- |
| `internal/toolfilesystem/safetool.go` | `safeTool`、`newSafeTool()`、`shouldPropagate`、`toolError`、`toolResult`、`safeStream`、四个 Wrap 方法 |
| `internal/toolfilesystem/retry.go` | `DefaultMaxRetries = 5`、`isRateLimited`、`newModelRetryConfig` |
| `internal/toolfilesystem/agent.go` | `newAgent` 中按 `Options.SafeTools` 追加 `cfg.Handlers`，按 `Options.MaxRetries > 0` 设置 `cfg.ModelRetryConfig` |
| `internal/toolfilesystem/run.go` | `Options` 增加 `SafeTools`、`MaxRetries`；`middlewareHints`；横幅标题；恢复命令按需追加参数 |
| `cmd/tool-filesystem/main.go` | `--max-retries`（默认 5，负数拒绝）；safe-tools 无开关 |

`cmd/manual-tools` 与 `manual_agent.go` 保持第四章原样，不注入 Middleware，作为对照。

## 行为约定

- 工具普通错误 → `[tool error] <err>` 作为正常结果返回（同步字符串、增强 `schema.ToolResult`、流式单帧），模型可自纠。
- `ctx.Err() != nil` 或 `compose.IsInterruptRerunError` → 原样透传；工具自身超时但外层 ctx 存活时仍按普通错误转换。
- 流式使用 Eino 惰性适配器 `schema.StreamReaderWithConvert` + `WithErrWrapper` + `WithOnEOF`：无 goroutine，错误帧在 EOF 前输出，关闭下游即关闭上游。
- 重试用 `adk.ModelRetryConfig.ShouldRetry`，关键词 `429`、`too many requests`、`rate limit`、`qpm limit`、`tpm limit`（忽略大小写），仅限流错误重试；`MaxRetries=0` 不安装配置。
- 启动横幅标题 `DeepAgent：工具、文件系统与 Middleware`，中间件状态两行由 `middlewareHints` 生成。
- safe-tools Handler 恒定注入，不提供开关；`--max-retries 0` 不安装重试配置。
- 退出恢复命令在 `MaxRetries > 0` 时追加 `--max-retries=<n>`，否则保持第四章命令。

## 测试

`internal/toolfilesystem/middleware_test.go` 复用第四章夹具（`scriptedModel`、`toolCall`、`fixtureOptions`、`runWithModel`），覆盖：四个 Wrap 方法的成功/普通错误/取消/中断、流式提前关闭释放上游、错误帧在 EOF 结束、限流判定与重试决策、`[tool error]` 端到端自纠、hints、恢复命令、`RunConsole` 级重试接线。`cmd/tool-filesystem/main_test.go` 覆盖默认值与负数校验。

## 非目标

第六章 Trace、summarization/skill 等内置中间件、独立第五章入口、为兼容性保留旧导出。
