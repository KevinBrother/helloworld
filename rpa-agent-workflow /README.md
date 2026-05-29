# RPA Agent Workflow

一个契约优先的 RPA 工作流原型，用于定义、校验、编译、执行和可视化工作流。

## 模块

- `contracts/` — AST、Block、UI Node、Edit Operation 的 Go 模型和 JSON Schema。
- `compiler/go/schema` — JSON Schema 校验和 AST 加载。
- `compiler/go/compiler` — 工作流和 Block 绑定的语义校验。
- `compiler/go/codegen/python` — 根据 `ast.json` 和 `block.json` 生成 Python 工作流代码。
- `compiler/go/executor` — 直接执行 `ast.json` 的 Go 执行器，`callBlock` 通过 Host adapter 调用。
- `compiler/go/transform` — AST 到 UI Node 的投影，以及 Edit Operation 应用。
- `apps/cli/rpawf` — CLI，提供编译、直接执行、UI 投影等命令。
- `apps/web` — React 可视化编辑器原型。
- `runtimes/python` — Python runtime 和内置 Block 实现。
- `examples/sample-workflow` — 示例 `ast.json`、`block.json` 和运行脚本。

## 命令

运行全部 Go 测试：

```sh
go test ./...
```

把示例工作流编译成 Python：

```sh
go run ./apps/cli/rpawf compile examples/sample-workflow/ast.json examples/sample-workflow/block.json > output/workflow.py
```

运行生成的 Python 工作流：

```sh
uv --project runtimes/python run python output/workflow.py
```

用 Go 执行器直接执行 `ast.json`：

```sh
go run ./apps/cli/rpawf exec examples/sample-workflow/ast.json examples/sample-workflow/block.json
```

把 AST 投影成 UI Node：

```sh
go run ./apps/cli/rpawf project-ui examples/sample-workflow/ast.json
```

构建 Web 应用：

```sh
pnpm build:web
```
