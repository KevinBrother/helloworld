# RPA Agent Workflow

一个契约优先的 RPA 工作流原型，用于定义、校验、编译、执行和可视化工作流。

所有文档统一维护在这个根目录 `README.md`。命令默认都从项目根目录执行：

```sh
cd "/Volumes/doc/workspace/project/helloworld/rpa-agent-workflow "
```

如果你在 `apps/web` 目录里执行 `go run ./apps/cli/rpawf ...`，Go 会把路径解析成
`apps/web/apps/cli/rpawf`，会报 `directory not found`。这种情况下先回到项目根目录再执行。

## 模块

- `contracts/` — AST、Block、UI Node、Edit Operation 的 Go 模型和 JSON Schema。
- `compiler/go/schema` — JSON Schema 校验和 AST 加载。
- `compiler/go/compiler` — 工作流和 Block 绑定的语义校验。
- `compiler/go/codegen/python` — 根据 `ast.json` 和 Block catalog 生成 Python 工作流代码。
- `compiler/go/executor` — 直接执行 `ast.json` 的 Go 执行器，`callBlock` 通过 Host adapter 调用。
- `compiler/go/astdbg` — AST 调试核心，支持断点、单步、变量和帧快照。
- `compiler/go/transform` — AST 到 UI Node 的投影，以及 Edit Operation 应用。
- `apps/cli/rpawf` — CLI，提供编译、直接执行、调试、UI 投影等命令。
- `apps/web` — React 可视化编辑器原型。
- `sdks/python` — Python SDK，包含 runtime、Block 实现和对应的 `block.json` 接口描述。
- `examples/sample-workflow` — 示例 `ast.json` 和运行脚本。
- `examples/calculator` — 计算器工作流示例和运行输入 JSON。

## 核心数据流

- `ast.json` 是工作流真实源数据，页面填写的参数最终写回这里。
- `sdks/python/blocks/**/block.json` 是 Block 对 Python 实现的接口描述。
- `ui-node.json` 是由 AST 投影出来的编辑器视图模型，负责画节点、inspector 和操作能力，不作为参数值的最终存储。
- `edit-operation.json` 描述页面操作，例如 `updateField`，执行后把变更写回 AST。
- 生成的 Python workflow 是执行产物；执行器只负责运行产物或直接解释 AST，不承载具体业务逻辑。

## 开发命令

运行全部 Go 测试：

```sh
go test ./...
```

构建 Web 应用：

```sh
pnpm build:web
```

## Sample Workflow

把 sample workflow 编译成 Python：

```sh
mkdir -p output
go run ./apps/cli/rpawf compile examples/sample-workflow/ast.json sdks/python/blocks > output/workflow.py
```

运行生成的 Python：

```sh
uv --project sdks/python run python output/workflow.py
```

直接执行 AST：

```sh
go run ./apps/cli/rpawf exec examples/sample-workflow/ast.json sdks/python/blocks
```

投影 UI Node：

```sh
mkdir -p output
go run ./apps/cli/rpawf project-ui examples/sample-workflow/ast.json > output/ui-node.json
```

## Calculator Workflow

`examples/calculator/ast.json` 是计算器工作流。它声明运行时输入 `left`、`operator`、`right`，根据 `input.left > 10` 选择分支调用 SDK 里的 `math.calculate` block。block 输出通过 Node Output Reference 暴露，最后返回 `node.branch_by_threshold.result`。

`examples/calculator/input-*.json` 是这个 workflow 的运行时输入 payload，不属于 AST schema，也不属于 Block schema。

`math.calculate` 的接口和实现位置：

- `sdks/python/blocks/math/calculate/block.json`
- `sdks/python/rpa_sdk/blocks/math/calculate.py`

直接执行 calculator AST：

```sh
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-add.json
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-subtract.json
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-multiply.json
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-divide.json
```

除零错误验证：

```sh
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-divide-by-zero.json
```

编译 calculator 到 Python：

```sh
mkdir -p output
go run ./apps/cli/rpawf compile examples/calculator/ast.json sdks/python/blocks > output/calculator.py
```

投影 calculator UI Node：

```sh
mkdir -p output
go run ./apps/cli/rpawf project-ui examples/calculator/ast.json > output/calculator-ui-node.json
```

当前生成的 Python workflow 不接收 input JSON 参数，所以 calculator 这种依赖运行时输入的场景，用 `rpawf exec` 测完整链路。

## Debug

启动调试：

```sh
go run ./apps/cli/rpawf debug examples/sample-workflow/ast.json sdks/python/blocks
```

常用调试命令：`break <statementId>`、`break line <n>`、`continue`、`next`、`step`、`out`、`where`、`vars`、`locals`、`stack`、`quit`。

calculator 也可以启动 debug：

```sh
go run ./apps/cli/rpawf debug examples/calculator/ast.json sdks/python/blocks
```

当前 debug 命令接收 AST 和 block manifests，还没有接收 input JSON 参数；依赖 `input.left`、`input.operator`、`input.right` 的 calculator 调试链路需要后续补 CLI input 支持。

## Web UI

```sh
pnpm --dir apps/web dev
```

Web 目前加载 `output/calculator-ui-node.json` 作为样例 UI Node。刷新这个文件：

```sh
mkdir -p output
go run ./apps/cli/rpawf project-ui examples/calculator/ast.json > output/calculator-ui-node.json
```

## 运行方式

CGO_ENABLED=0 go run ./apps/cli/rpawf serve examples/calculator/ast.json sdks/python/blocks
pnpm --dir apps/web dev
