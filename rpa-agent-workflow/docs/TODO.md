# TODO

## 当前未完成项

- [ ] Agent 生成闭环：自然语言 + IAST + IBlock -> `ast.json` -> 编译运行。当前还没有 Agent 根据 block catalog 自动生成 AST 的链路。
- [ ] Web 编辑器搭流程闭环：当前界面能加载流程、读取真实 block catalog、修改已有字段、运行测试；但 `insertNode`、`deleteNode`、`moveStatement`、`duplicateNode`、`replaceSubtree` 这些 edit operation 只在协议中定义，服务端 `ApplyEdit` 目前只支持 `toggleCollapsed` 和 `updateField`，因此还不能从左侧模块库新增、删除、移动节点。
- [ ] Debug CLI input JSON：`rpawf debug` 现在只接收 AST 和 block manifests，还不接收 `input.json`。依赖 `input.left`、`input.operator`、`input.right` 的 calculator 调试链路需要补齐。
- [ ] Web 画布大规模编排能力：当前布局支持线性流程和简单 `if` 分支；复杂嵌套、`parallel`、`try`、`loop` 的交互式编辑、搜索插入、节点重排、局部折叠编辑还没有形成完整闭环。
- [ ] 生产级 runtime 边界：当前 Python host 能调用 SDK block；权限隔离、资源限制、超时/重试策略、运行审计还没有工程化完成。

## 已完成验证链路

- [x] 编译运行闭环：`ast.json + SDK block manifests -> Go compiler -> Python -> SDK runtime`
- [x] 可视化编辑闭环：`ast.json -> ui-node.json -> React workflow editor`

## v1 目标

v1 聚焦编译运行闭环：

`ast.json + SDK block manifests -> Go compiler -> generated Python -> Python SDK runtime`

v1 必须完成：

- [x] IAST v1 JSON Schema
- [x] IBlock v1 JSON Schema
- [x] Go typed models
- [x] Go compiler schema validation
- [x] Go compiler semantic validation
- [x] Go compiler type/reference validation
- [x] Go compiler runtime binding validation
- [x] Go compiler Python code generation
- [x] Python runtime execution
- [x] built-in blocks: `core.log`、`system.get_os_info`
- [x] trace/debug events foundation
- [x] valid fixtures covering all statement kinds
- [x] invalid fixtures covering major diagnostics

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
- 强 sandbox 隔离
- 任意 DAG 执行模型

## v1.5 / v2

- `ast.json -> ui-node.json`
- React workflow editor
- Agent + 自然语言 + IAST + IBlock -> `ast.json`
- 更强 sandbox runtime

## 技术栈

- 前端相关：TypeScript + React + pnpm
- 编译器相关：Go
- runtime：Python
