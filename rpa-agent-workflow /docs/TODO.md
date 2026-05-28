# TODO

## v1 目标

v1 聚焦编译运行闭环：

`ast.json + block.json -> Go compiler -> generated Python -> Python runtime`

v1 必须完成：

- IAST v1 JSON Schema
- IBlock v1 JSON Schema
- Go typed models
- Go compiler schema validation
- Go compiler semantic validation
- Go compiler type/reference validation
- Go compiler runtime binding validation
- Go compiler Python code generation
- Python runtime execution
- built-in blocks: `core.log`、`system.get_os_info`
- trace/debug events foundation
- valid fixtures covering all statement kinds
- invalid fixtures covering major diagnostics

IAST v1 statement kinds:

- `sequence`
- `callBlock`
- `callWorkflow`
- `assign`
- `if`
- `loop`
- `parallel`
- `try`
- `return`

IBlock v1 fields:

- `id`
- `namespace`
- `name`
- `version`
- `display`
- `description`
- `inputs`
- `outputs`
- `config`
- `runtime`
- `permissions`
- `sideEffects`
- `errors`
- `examples`
- `compatibility`
- `metadata`

## v1 不包含

- React workflow editor
- `ast.json -> ui-node.json`
- Agent 自然语言生成 AST
- 完整 DAP adapter
- 强 sandbox 隔离
- 任意 DAG 执行模型

## v1.5 / v2

- `ast.json -> ui-node.json`
- React workflow editor
- Agent + 自然语言 + IAST + IBlock -> `ast.json`
- DAP adapter
- 更强 sandbox runtime

## 验证链路

- [x] 编译运行闭环：`ast.json + block.json -> Go compiler -> Python -> runtime`
- [x] 可视化编辑闭环：`ast.json -> ui-node.json -> React workflow editor`
- [ ] Agent 生成闭环：自然语言 + IAST + IBlock -> `ast.json` -> 编译运行

## 技术栈

- 前端相关：TypeScript + React + pnpm
- 编译器相关：Go
- runtime：Python
