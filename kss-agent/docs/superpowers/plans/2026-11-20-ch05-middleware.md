# 第五章 Middleware 实现记录（并入第四章 DeepAgent）

日期：2026-11-20
设计：`docs/superpowers/specs/2026-11-20-ch05-middleware-design.md`
状态：已实现，未提交

## 任务与结果

| 任务 | 内容 | 结果 |
| --- | --- | --- |
| T1 | 恢复第四章 `agent.go`/`run.go` 为基线，删除独立第五章入口与 `internal/middleware` 包 | 完成 |
| T2 | `safetool.go`：四个 Wrap 方法、惰性流式适配、取消与中断透传 | 完成，7 个用例 + 3 个流式用例 |
| T3 | `retry.go`：`DefaultMaxRetries`、`isRateLimited`、`newModelRetryConfig` | 完成，2 个用例 |
| T4 | `agent.go`/`run.go` 装配：Handlers、ModelRetryConfig、`middlewareHints`、横幅、恢复命令 | 完成，含 e2e 与重试接线测试 |
| T5 | `cmd/tool-filesystem` 两个开关、README、launch.json、学习笔记 | 完成，含 parse 测试 |

## 验证

```
gofmt -l .                         # 无输出
go vet ./...                       # 通过
CGO_ENABLED=0 go test ./...        # 全部通过
CGO_ENABLED=0 go test -race ./internal/toolfilesystem/
make build                         # 5 个二进制
go run ./cmd/tool-filesystem --help            # 退出 0
go run ./cmd/tool-filesystem --max-retries -1  # 拒绝
```

## 与旧方案的关系

旧方案（独立 `cmd/middleware` + `internal/middleware`）的实现与审查记录保存在分支 `feat/ch05-middleware`（提交 `bd9950d`），仅作备份，不再使用。
