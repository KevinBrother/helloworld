# Calculator + Code Executor 设计（2026-11-19）

状态：待实现
范围：第四章 DeepAgent 学习项目新增两个工具；`run_code` 的执行后端接 OpenSandbox。

## 目标

1. `calculate`：纯本地算术工具，模型可以安全地做精确计算，结果可控、可测试。
2. `run_code`：在**真隔离**的沙箱里执行模型生成的代码，而不是在 agent 进程里起子进程。
3. 保持教学结构：工具层与执行后端分离，换后端不改工具契约；与已有的 `web_search`/`web_fetch` 组装方式一致。

## 决策

| 项目 | 决定 | 理由 |
| --- | --- | --- |
| 计算器实现 | 纯 Go 递归下降解析器，零依赖 | 无外部进程、无 eval、错误可带位置；正好做「纯本地工具」对照 |
| 代码执行后端 | [OpenSandbox](https://github.com/opensandbox-group/OpenSandbox) Go SDK v1.2.1 的 `CodeInterpreter` | 隔离、生命周期、网络策略、资源限制、凭据保护都是平台能力，比自己包 `docker run` 更接近生产 |
| 部署形态 | 本机 Docker runtime 开发；生产 K8s operator + Fast Sandbox（Firecracker microVM），agent 代码不变 | 一套 SDK/API 覆盖两种 runtime |
| 沙箱生命周期 | 会话内懒创建、复用；进程退出 `Kill`；TTL 到期/不健康时重建 | 复用容器降低冷启动，又不会泄漏。注意 `Execute` 的请求只带 `language`、不带 context id，execd 会复用该语言的默认内核上下文，因此**同一沙箱内跨调用变量会保留**；需要显式隔离时用 `ExecuteInContext`（属非目标） |
| 接入入口 | `calculate` 加 DeepAgent + 手动版；`run_code` 只加 DeepAgent 版 | 手动版是「纯文件 + 本地工具」对照，代码执行风险最高先收在一个入口 |
| 默认开关 | `run_code` 需显式 `--allow-code`，默认关闭 | 与 `--allow-shell` 风格一致；沙箱服务不可用时直接报错，绝不回退到本机执行 |

## 非目标

- 不自建 sandboxd / 不自己写容器编排，不实现 gVisor/Firecracker 集成（用 OpenSandbox 的 runtime）。
- 不做持久 kernel 上下文 API（`ExecuteInContext`）、不做文件上传下载、不做多租户与配额计费。
- 不支持浏览器/桌面类沙箱。
- 不改变 Eino 版本，不迁移 Typed API。

## 架构

```
Eino DeepAgent (cmd/tool-filesystem)
  ├─ calculate ────────────────► internal/calculator（纯 Go，进程内）
  └─ run_code ─► internal/sandbox.Runner（接口）
                     └─ OpenSandboxRunner ──HTTP──► opensandbox-server
                                                     └─ sandbox container / microVM
```

- 工具层只依赖 `sandbox.Runner` 接口；OpenSandbox 只是其中一个实现，测试用假 Runner 即可离线。
- `run_code` 的输入只有语言与代码；agent 的 `.env`、工作区、模型 key 都不进沙箱。

## 包与接线

新增：

- `internal/calculator/calculator.go`：`func Evaluate(expression string) (float64, error)`
- `internal/calculator/tool.go`：`const ToolName = "calculate"`、`func NewTool() (tool.BaseTool, error)`
- `internal/sandbox/sandbox.go`：`Request`、`Result`、`Runner` 接口、校验与输出格式化、UTF-8 安全截断
- `internal/sandbox/opensandbox.go`：`Config`、`LoadConfigFromEnv`、`NewOpenSandboxRunner`、`(*OpenSandboxRunner).Run/Close`
- `internal/sandbox/tool.go`：`const CodeToolName = "run_code"`、`func NewTool(runner Runner) (tool.BaseTool, error)`（runner 为 nil 报错）

修改：

- `internal/toolfilesystem/agent.go`：`tools` 追加 `calculate`；`opts.SandboxRunner != nil` 时追加 `run_code`；Description 更新。
- `internal/toolfilesystem/run.go`：`Options` 增加 `AllowCode bool`、`SandboxRunner sandbox.Runner`；`run()` 在 `AllowCode` 时构建 runner 并 `defer Close()`；启动信息增加代码执行一行（不打印 key）。
- `internal/toolfilesystem/manual_agent.go`（或 `manual_tools.go`）：追加 `calculate`，不加 `run_code`。
- `cmd/tool-filesystem/main.go`：新增 `--allow-code` 标志。
- `go.mod`：新增 `github.com/alibaba/OpenSandbox/sdks/sandbox/go v1.2.1`（间接 `golang.org/x/sync`）。

## `calculate` 契约

- 参数：`{"expression": string}`。
- 语法：`+ - * / % ^`（`^` 右结合）、一元正负、括号；常量 `pi`、`e`；函数
  `sqrt abs floor ceil round min max pow`。
- 限制：表达式 ≤ 512 字节、嵌套 ≤ 64 层；除零、溢出、NaN、非有限结果一律报错。
- 错误带位置：`unexpected token ")" at 7`。
- 输出：`expression = result`；整数值（|x| ≤ 1e15 且无小数）输出整数，否则 `strconv.FormatFloat(x, 'g', 15, 64)`。
- 纯函数、不联网、无副作用。

## `run_code` 契约

- 参数：`{"language": string, "code": string}`；`language` 为空时默认 `python`。
- 支持语言由沙箱镜像决定（code-interpreter 镜像内置 Python/TypeScript/Java/Go）；工具层只校验非空与 `^[a-z][a-z0-9-]{0,31}$`，未知语言由服务端报错。
- 上限：代码 ≤ 16 KiB，单次执行超时默认 60s（`SANDBOX_RUN_TIMEOUT` 可调）。
- 输出格式：

  ```
  language: python
  exit code: 0
  stdout:
  ...
  stderr:
  ...
  result:
  ...
  (truncated: output exceeded 32768 bytes)
  ```

- stdout/stderr/result 合计截断到 32 KiB（按 rune 边界，保证 UTF-8 合法，marker 也计入上限）。
- 非零退出与脚本异常是**正常结果**（`exit code` + stdout/stderr/traceback 返回给模型），不终止轮次。

错误如何分类（结果 / 工具错误 / 终止轮次）见下文「错误语义」。

## 沙箱实现细节

- `Config`：`Domain`、`Protocol`、`APIKey`、`Image`、`TTL`、`RunTimeout`；从环境变量读取（见下表），`ConnectionConfig` 回退到 SDK 自己的 `OPEN_SANDBOX_*` 变量。
- 创建：`opensandbox.CreateCodeInterpreter(ctx, conn, CodeInterpreterCreateOptions{Image, TimeoutSeconds, SkipHealthCheck:false})`，默认镜像 `opensandbox/code-interpreter:v1.1.0`（生产应替换为 digest），TTL 15 分钟。
- 复用：`Run` 时若 sandbox 为 nil → 创建；若 `IsHealthy(ctx)` 为 false → `Kill` 后重建一次。
- 执行：`ci.Execute(ctx, language, code, handlers)`，传 `ExecutionHandlers{SkipAccumulation:true, OnStdout/OnStderr/OnResult}`，由有界 collector 只保留 32 KiB；再从 collector 与 `Execution.Error`（`Name/Value/Traceback`）、`ExitCode` 构造 `Result`。这样打印死循环不会在 agent 进程里无界累积输出。
- 并发：进程内单 CLI 会话，`sync.Mutex` 串行化创建/执行/关闭；`Close` 幂等，带 10s 超时。
- 关闭：进程退出/会话结束时 `Kill`；`Close` 幂等，`Kill` 成功后才丢弃句柄（失败可重试）；关闭错误与轮次错误用 `errors.Join` 合并返回。
- TTL 最小 1 秒（`int(TTL.Seconds())` 截断，亚秒会变成 0 被服务端拒绝）。

## 配置

| 环境变量 | 默认 | 说明 |
| --- | --- | --- |
| `SANDBOX_DOMAIN` | `localhost:8080` | opensandbox-server 地址（兼容 SDK 的 `OPEN_SANDBOX_DOMAIN`） |
| `SANDBOX_PROTOCOL` | `http` | `http`/`https` |
| `SANDBOX_API_KEY` | 空 | 服务端开启鉴权时必填；不打印、不落日志 |
| `SANDBOX_IMAGE` | `opensandbox/code-interpreter:v1.1.0` | 生产用 digest |
| `SANDBOX_TTL` | `15m` | 沙箱存活时间 |
| `SANDBOX_RUN_TIMEOUT` | `60s` | 单次执行超时 |

命令行：`--allow-code`（默认 false）。启动信息打印 domain 与镜像，不打印 key。

沙箱创建/重建时通过 `sandbox.Config.OnCreate(id, endpoint)` 在控制台打印沙箱身份（`[代码沙箱] 已创建: id=… endpoint=…`）：这是面向人的旁路信息（side channel），endpoint 通过 `GetEndpoint(44772)` best-effort 获取，失败不影响执行，也绝不进入模型上下文。

## 安全边界

- 代码在远端沙箱内执行：读不到 agent 的 `.env`、工作区、模型 key。
- 生产用 K8s + Fast Sandbox：每个 sandbox 独立 microVM；egress 默认拒绝，需要出网时显式加 FQDN 白名单；Credential Vault 让沙箱拿到的是注入后的凭据而非真 key。
- 资源限制：默认 1 CPU / 2Gi 内存（SDK 默认），TTL 15 分钟；可后续按需调 `ResourceLimits`。
- 本机 Docker runtime 只用于开发：容器与 agent 在同一台机器，隔离强度弱于生产，文档明确说明。
- 剩余风险：OpenSandbox 项目较新（server 包 classifier 仍为 Alpha），API 可能演进；镜像 tag 可变，生产必须 pin digest；沙箱内输出仍可能包含提示注入文本，按不可信内容处理。

## 错误语义

- 参数不合法（未知语言 id、代码超过 16 KiB、空代码、表达式语法错误）→ 以 `error: ...` 文本作为普通工具结果返回，模型可自行修正；不终止轮次。
- 沙箱服务不可用 / 镜像不存在 / 创建或执行失败 / 超时 → 工具返回 Go error，Eino 工具节点终止整轮（`compose/tool_node.go:1099`），只保留用户消息，不回退本机执行。
- 脚本非零退出 / 异常 → 正常结果（exit code、stderr/traceback），不终止轮次。
- `calculate` 与 `run_code` 采用同一策略；`web_search`/`web_fetch` 保持 fail-closed：含参数不合法在内的任何失败都终止轮次，避免自动重试绕过地址屏蔽等安全策略。
- `Close` 失败用 `errors.Join` 合并到返回错误（进程非零退出）。

## 测试

- `internal/calculator`：表驱动覆盖优先级、右结合、一元负号、除零、未知函数、括号不匹配、超长、非法字符、NaN/Inf、格式化。
- `internal/sandbox`（离线）：Config 默认值/环境变量覆盖、TTL 下限、请求校验、有界 collector（截断/流分离/结果捕获）、`Execution` → `Result` 映射、截断 marker 计入上限且 UTF-8 安全、fake Runner 下的工具层参数校验（作为结果返回）与格式化。
- `internal/toolfilesystem`：工具注册开关（`calculate` 恒有、`run_code` 仅 `SandboxRunner != nil`）、scriptedModel 端到端（`run_code` 调用 → 假结果 → 最终回答并持久化）。
- 真实沙箱集成测试：设置 `SANDBOX_E2E=1` 且 server 可达时运行（`python print`、非零退出、超时），否则 `t.Skip`。
- 全量：`gofmt -l .`、`CGO_ENABLED=0 go vet ./...`、`make test`、`make build`、`git diff --check`。

## 文档

- `docs/ch04-tool-filesystem.md`：新增「扩展：calculate 与 run_code」一节，讲清工具层/后端分离、OpenSandbox 架构（本机 Docker → 生产 K8s+Firecracker）、运行前置（`opensandbox-server` + 镜像）、`--allow-code`、失败语义、成本与安全边界。
- README 的章节表与 `Makefile`/`launch.json` 同步（`--allow-code` 的调试配置）。
- 本 spec 与实现 plan 落盘在 `docs/superpowers/`。

## 验收标准

1. 不配沙箱时，两个入口都只多出 `calculate`，`run_code` 不存在；`--allow-code` 且 server 可用时 `run_code` 出现。
2. 计算器对 20+ 用例结果正确、错误可读。
3. 真实 server 上 `run_code` 能跑通 Python 与 TypeScript，输出/退出码/截断正确，会话结束后沙箱被清理。
4. 沙箱不可用时错误信息清晰且不含密钥，整轮终止、不写半截工具链。
5. 全部离线测试与全量验证通过；不 commit（非 worktree，人工核验后提交）。
