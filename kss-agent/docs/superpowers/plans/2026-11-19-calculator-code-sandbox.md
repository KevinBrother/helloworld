# Calculator + Code Executor 实现计划（2026-11-19）

> **执行方式**：native 在当前工作树执行（用户已批准），遵循 superpowers:executing-plans 与 test-driven-development。
> **设计文档**：`docs/superpowers/specs/2026-11-19-calculator-code-sandbox-design.md`

## Global Constraints

- 非 worktree：**不 commit、不 push**，完成后由用户人工核验。
- 不读 `.env` 值、不在日志/错误/测试输出里打印 API key。
- 测试默认零真实网络；真实沙箱测试只在 `SANDBOX_E2E=1` 且 `SANDBOX_DOMAIN` 可达时运行，否则 `t.Skip`。
- `run_code` 只在 `--allow-code` 且 runner 构建成功时注册；失败**不回退**本机执行。
- 工具名固定：`calculate`、`run_code`。
- 不升级 Eino、不迁移 Typed API、不新增除 OpenSandbox SDK 外的依赖。
- 手动版只加 `calculate`，不加 `run_code`。

## Review Focus

1. `run_code` 的沙箱真的隔离了吗（代码/工作区/凭证都不进沙箱）？Close 是否幂等、会不会泄漏容器？
2. 失败语义是否与 Eino 一致（工具错误终止整轮、只保留用户消息、不写半截工具链）？
3. 输出截断是否 UTF-8 安全、上限是否可测；错误信息是否含 key。
4. 计算器边界：除零、溢出、NaN/Inf、深度/长度限制、右结合与一元负号。
5. 注册开关与启动信息是否准确（不需要沙箱的入口不显示「代码执行已启用」）。

## Task 1：`internal/calculator` 求值器

- [x] 1.1 先写 `internal/calculator/calculator_test.go` 表驱动用例：`1+2*3`、`(1+2)*3`、`2^3^2`（右结合 512）、`-2^2`（按 `-(2^2)` 还是 `(-2)^2` 明确写死并测试）、`10%3`、`sqrt(9)`、`min(3,1,2)`、`pi`、`e`、嵌套 64 层、512 字节上限、除零、`sqrt(-1)`、溢出 `1e308*10`、非法字符、括号不匹配、未知函数、空表达式。RED：`undefined: Evaluate`。
- [x] 1.2 实现 `internal/calculator/calculator.go`：tokenizer（数字/标识符/运算符/括号/逗号）+ 递归下降（`expr → term → unary → power → primary`），错误信息带 byte 偏移，如 `unexpected token ")" at 7`。GREEN。
- [x] 1.3 `gofmt`、`go test ./internal/calculator`。

## Task 2：`calculate` 工具与两个入口注册

- [x] 2.1 先写 `internal/calculator/tool_test.go`：Info 名 `calculate`、参数 schema 有 `expression`、空/空白表达式报错、正常表达式返回 `2*(3+4) = 14`、错误透传。RED。
- [x] 2.2 实现 `internal/calculator/tool.go`：`const ToolName = "calculate"`、`NewTool() (tool.BaseTool, error)`（`utils.InferTool`）。GREEN。
- [x] 2.3 接入 `internal/toolfilesystem/agent.go` 与 `manual_agent.go`（`newManualTools` 或 `newManualAgent` 追加），补注册断言：两个入口的工具列表都含 `calculate`（先改测试 RED，再接线 GREEN）。
- [x] 2.4 `go test ./internal/toolfilesystem ./internal/calculator`、`gofmt`。

## Task 3：`internal/sandbox` 接口、校验、格式化

- [x] 3.1 先写 `internal/sandbox/sandbox_test.go`：`Validate`（空 code、超 16 KiB、语言非法字符、默认 python）、`FormatResult`（exit code/stdout/stderr/result 顺序、截断标记、UTF-8 安全）、`truncateUTF8`。RED。
- [x] 3.2 实现 `internal/sandbox/sandbox.go`：`Request{Language, Code}`、`Result{Stdout, Stderr, Result string; ExitCode *int; Truncated bool}`、`Runner interface{ Run(ctx, Request) (Result, error); Close() error }`、`Validate`、`FormatResult`、`truncateUTF8`；常量 `MaxCodeBytes = 16<<10`、`MaxOutputBytes = 32<<10`、`DefaultLanguage = "python"`。GREEN。
- [x] 3.3 先写 `internal/sandbox/tool_test.go`：nil runner 报错、空 code 报错（不调 runner）、语言透传、输出格式化、runner 错误透传、Info 名 `run_code`。RED。
- [x] 3.4 实现 `internal/sandbox/tool.go`：`const CodeToolName = "run_code"`、`NewTool(runner Runner) (tool.BaseTool, error)`。GREEN。

## Task 4：OpenSandbox Runner

- [x] 4.1 先写 `internal/sandbox/opensandbox_test.go`：`LoadConfigFromEnv` 默认值与覆盖（用 `t.Setenv`）、`mapExecution` 纯函数（stdout/stderr/results/error/exit code 映射、错误优先、空输出）、`NewOpenSandboxRunner` 校验（domain 空报错）、Close 幂等（nil 安全）。RED（类型未定义）。
- [x] 4.2 实现 `internal/sandbox/opensandbox.go`：`Config{Domain, Protocol, APIKey, Image, TTL, RunTimeout}`；`LoadConfigFromEnv()` 读 `SANDBOX_DOMAIN/SANDBOX_PROTOCOL/SANDBOX_API_KEY/SANDBOX_IMAGE/SANDBOX_TTL/SANDBOX_RUN_TIMEOUT`（空值回退 SDK 的 `OPEN_SANDBOX_*`）；`NewOpenSandboxRunner(cfg) (*OpenSandboxRunner, error)`；`Run`（mutex → ensure（nil 创建、`IsHealthy` 失败 Kill 重建）→ 加 `RunTimeout` 超时 → `ci.Execute` → `mapExecution`）；`Close` 幂等 `Kill`，10s 超时，错误只记录。GREEN。
- [x] 4.3 真实集成测试 `internal/sandbox/opensandbox_e2e_test.go`：`SANDBOX_E2E=1` 时创建 runner，跑 `python print(1+1)`、非零退出、`typescript console.log`，断言 stdout/exit code；无 server 时 `t.Skip`。
- [x] 4.4 先 RED 再 GREEN 接入 `go.mod`：`go get github.com/alibaba/OpenSandbox/sdks/sandbox/go@v1.2.1`。

## Task 5：接线、CLI、文档与全量验证

- [x] 5.1 `internal/toolfilesystem/run.go`：`Options` 加 `AllowCode bool`、`SandboxRunner sandbox.Runner`；`run()` 在 `AllowCode` 时 `sandbox.NewOpenSandboxRunner(sandbox.LoadConfigFromEnv())`（错误 `create code runner: %w`），`runConsole` 里 `defer Close()`；启动信息增加 `代码执行: 关闭` / `代码执行: 已启用（OpenSandbox <domain>，镜像 <image>）`。测试：无 runner 时启动信息不含「代码执行已启用」；有 runner 时含 domain 不含 key。
- [x] 5.2 `cmd/tool-filesystem/main.go`：`--allow-code` 标志（默认 false），`main_test.go` 覆盖解析。
- [x] 5.3 `internal/toolfilesystem/agent.go`：`tools` 追加 `calculate`；`opts.SandboxRunner != nil` 时追加 `run_code`；Description 更新。`run_test.go`：注册开关测试（`calculate` 恒在、`run_code` 随 runner）+ scriptedModel 端到端（`run_code` → fake runner 结果 → 最终回答，持久化 4 条消息）。
- [x] 5.4 文档：`docs/ch04-tool-filesystem.md` 新增「扩展：calculate 与 run_code」；更新「先运行」（`opensandbox-server` + 镜像 + `--allow-code`）、权限边界、代码阅读路线、本地验证段落；`README.md` 章节表/命令；`Makefile` 加 `sandbox-up`（`opensandbox-server --config ~/.sandbox.toml`）与 `test-sandbox`（`SANDBOX_E2E=1 go test ./internal/sandbox -run E2E`）；`.vscode/launch.json` 加带 `--allow-code` 的调试配置。
- [x] 5.5 全量验证：`gofmt -l .`、`CGO_ENABLED=0 go vet ./...`、`make test`、`make build`、`git diff --check`、`git status --short`；真实 server 上手动跑一次 `run_code`（Python + TypeScript），记录证据；计划勾选并写执行记录。
- [x] 5.6 独立审查（subagent_fork，只读、允许 go test/vet/gofmt、禁止网络/真实模型/提交），修复 Critical/Important 后复跑验证。

## 验证命令

```bash
cd /Volumes/doc/workspace/project/helloworld/kss-agent
gofmt -l .
CGO_ENABLED=0 go vet ./...
make test
make build
SANDBOX_E2E=1 CGO_ENABLED=0 go test ./internal/sandbox -run E2E -v
git diff --check && git status --short
```

## 执行记录（2026-11-19，native 非 worktree，未 commit）

- Task 1–5 全部完成；`5.6` 独立审查见下方结果。
- 偏差：
  - `calculate` 的工具测试与求值器测试同放 `internal/calculator/calculator_test.go`；`run_code` 工具测试同放 `internal/sandbox/sandbox_test.go`（未单独建 `tool_test.go`，避免测试文件碎片化）。
  - 启动信息与 `Close` 放在 `run()`（`runConsole` 返回后关闭 runner），而不是在 `runConsole` 里 `defer`，这样错误路径也能统一处理关闭错误。
  - E2E 语言覆盖 Python（`print(6*7)`、`SystemExit(3)`）与 TypeScript（`console.log('ts-ok')`），未再加 Java/Go 用例。
  - `run()` 中 `--allow-code` 的构建顺序为：先 `sandbox.LoadConfigFromEnv()`，再 `NewOpenSandboxRunner`，失败分别是 `load sandbox config: %w`、`create code runner: %w`。
- 验证证据：
  - `gofmt -l .` 无输出；`CGO_ENABLED=0 go vet ./...` 通过。
  - `make test`：internal/calculator、internal/sandbox、internal/toolfilesystem、internal/webtool 等全部 ok（toolfilesystem 0.351s）。
  - `make build` 5 个二进制；`git diff --check` 干净。
  - 真实沙箱 E2E：`SANDBOX_E2E=1 CGO_ENABLED=0 go test ./internal/sandbox -run E2E -v` → `--- PASS: TestOpenSandboxRunnerE2E (14.56s)`（本机 Docker runtime，控制面 127.0.0.1:8080，镜像 code-interpreter:v1.1.0）。
  - 单元测试默认零网络：无 `SANDBOX_E2E` 时 E2E 用例 skip，其余用 fakeRunner / 纯函数。
- 已知未处理项：`run_code` 真实命令行演示需要真实模型调用，未在自动化中执行（需人工带 `.env` 运行 `--allow-code`）；`localhost` 控制面默认 `http`，配 `https` 需自行提供可信证书。

## 独立审查与修复（2026-11-19）

审查者：subagent_fork `review-calc-sandbox`（只读，未设 SANDBOX_E2E，未联网/未调模型）。结论：无 Critical，4 项 Important + 8 项 Minor；全部处理如下。

- I1 参数校验错误终止整轮：`calculate`/`run_code` 的输入错误（空表达式、语法错误、未知语言、超长代码）改为返回 `error: ...` 普通工具结果，模型可自纠；仅基础设施错误返回 Go error。`web_*` 保持 fail-closed（安全策略相关，不自动重试）。
- I2 spec 失败语义与实现相反：重写 spec「错误语义」，并删除重复小节；plan 偏差清单由本节补齐。
- I3 SDK 输出内存无上限：`Execute` 改传 `ExecutionHandlers{SkipAccumulation:true, OnStdout/OnStderr/OnResult}`，由 `executionCollector` 有界保留 ≤32 KiB，`Truncated` 真正生效；新增 collector 单元测试，真实 E2E 复跑通过。
- I4 手动入口启动信息不实：能力提示改为入口自有的 `Options.StartupHints`，只有 DeepAgent `run()` 调用 `capabilityHints`；手动入口不打印联网/代码执行行，测试覆盖通用与真实 runner 两条分支且断言不泄露 key。
- M1 `killLocked` 先 Kill 成功再丢弃句柄（失败可重试）；M2 `Close` 错误用 `errors.Join` 合并；M3 `TTL < 1s` 直接拒绝；M5 截断 marker 计入 32 KiB 上限；M6 文档修正错误偏移说法；M7 spec 修正执行上下文说法：`Execute` 带 `language` 不带 id、复用默认内核上下文（实测变量保留），`ExecuteInContext` 属非目标；M4 `Truncated` 由 collector 赋值；M8 补 calculator 格式化边界（1e15、负数取模、2^-2、右结合）与 collector/TTL 测试。
- 未处理（记录）：E2E 未断言容器清理（依赖 TTL 兜底）。`.vscode/launch.json` 已恢复原有 4 空格格式，只追加 11 行新配置（最小 diff）。

复审结果：`gofmt -l .` 无输出、`CGO_ENABLED=0 go vet ./...` 通过、`make test` 全绿、`make build` 5 个、`git diff --check` 干净；`SANDBOX_E2E=1` 真实沙箱复跑 `PASS (14.18s)`。
