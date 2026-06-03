# Block Boundary Guide

本文档说明什么应该设计成 SDK block，什么应该保留为 workflow AST 的内置能力。这个边界用于支撑后续 300+ block 的规模化扩展。

## 核心原则

Block 是可复用的外部能力或业务动作。Workflow AST 是编排语言本身。

如果一个能力是在描述“流程怎么走”，它不是 block。如果一个能力是在执行“具体动作”，它是 block。

## 数据引用模型

项目采用 Node Output Reference 作为默认数据流模型。普通变量彻底取消。

只允许这四类引用：

| 引用 | 含义 | 可写性 |
| --- | --- | --- |
| `input.*` | Workflow 外部入参 | 只读 |
| `node.<statementId>.<outputName>` | Statement 输出 | 只读 |
| `loop.<loopId>.current_item` / `loop.<loopId>.index` | Loop 容器内置上下文 | 只读 |
| `state.*` | Workflow 显式全局状态 | 可读可写 |

明确禁止：

- 不存在 `var.*`。
- 不存在普通 `variables`。
- 不允许 `assign result = ...` 这类普通变量赋值。
- `assign.target` 必须是 `state.*`。
- block 输出不绑定到普通变量；有输出的 statement 自动产生 `node.<statementId>.<outputName>`。

## Start Node

Start Node 只定义 Workflow Inputs，不定义变量，不创建全局状态。

示例：

```json
{
  "inputs": [
    {
      "name": "user_id",
      "type": {
        "name": "string"
      }
    },
    {
      "name": "left",
      "type": {
        "name": "number"
      }
    }
  ]
}
```

后续节点通过 `input.user_id`、`input.left` 引用这些入参。输入就是输入，不是变量。

## Node Output Reference

每一个有输出的 statement，其 `id` 和 `outputName` 自动成为可引用数据。

示例：

```json
{
  "id": "get_os",
  "kind": "callBlock",
  "block": "system.get_os_info"
}
```

如果 `system.get_os_info` 输出 `platform`，后续节点直接引用：

```text
node.get_os.platform
```

不需要创建变量，也不需要 `assign` 中转。

## 不应该是 Block 的类型

这些能力属于 workflow runtime/compiler/editor 的内置语句、表达式系统或容器语义：

| 类型 | AST 形态 | 原因 |
| --- | --- | --- |
| 顺序执行 | `sequence` | 流程结构，不是业务动作 |
| 条件分支 | `if` | 控制流基础语法，不依赖 SDK |
| 循环 | `loop` | 控制流基础语法，并提供 loop 局部上下文 |
| 并行 | `parallel` | 调度语义，涉及 join/error/collect policy |
| 异常处理 | `try` | runtime 错误语义 |
| 返回结果 | `return` | workflow 输出语义 |
| 表达式计算 | `literal`、`ref`、`binary`、`template`、`object`、`array` | 条件、参数绑定、引用读取的基础能力 |
| 调用子流程 | `callWorkflow` | workflow 组合能力，不是 SDK 原子动作 |
| 写入全局状态 | `assign state.*` | 显式状态管理，由 runtime/compiler 统一约束 |

示例：

```json
{
  "id": "branch_by_threshold",
  "kind": "if",
  "condition": {
    "kind": "binary",
    "op": ">",
    "left": {
      "kind": "ref",
      "ref": "input.left"
    },
    "right": {
      "kind": "literal",
      "value": 10
    }
  }
}
```

这个节点不是 block。它描述的是流程分支，由 runtime 根据表达式结果选择 `then` 或 `else`。

## 应该是 Block 的类型

这些能力应该通过 `callBlock` 调用 SDK block，并由 `block.json` manifest 描述接口、runtime binding、权限和副作用：

| 类型 | 示例 | 原因 |
| --- | --- | --- |
| 浏览器动作 | click、type、navigate、screenshot | 外部系统交互，有 runtime binding 和副作用 |
| 文件动作 | read file、write file、list directory | 外部资源访问，需要权限和错误声明 |
| 网络/API 调用 | HTTP request、CRM API、Webhook | 外部系统交互，需要配置、认证和错误模型 |
| 数据处理动作 | parse JSON、CSV transform、OCR、LLM extract | 可复用原子能力 |
| 业务系统动作 | create ticket、send email、update record | 领域能力，适合 manifest 化管理 |
| 计算/转换动作 | calculate、format date、hash text | 可复用纯函数能力，也可以作为 block |

示例：

```json
{
  "id": "calculate_order_total",
  "kind": "callBlock",
  "block": "math.calculate",
  "inputs": {
    "left": {
      "kind": "ref",
      "ref": "input.subtotal"
    },
    "operator": {
      "kind": "literal",
      "value": "+"
    },
    "right": {
      "kind": "ref",
      "ref": "input.shipping_fee"
    }
  }
}
```

如果这个 block 输出 `result`，后续节点引用：

```text
node.calculate_order_total.result
```

## 判断规则

设计新能力时，按下面规则判断：

1. 控制 workflow 执行顺序、分支、循环、并发、异常或返回值的能力，不做成 block。
2. 解析表达式、绑定输入、读取引用、生成节点输出引用的能力，不做成 block。
3. 调用 SDK、外部服务、文件系统、浏览器、模型、数据库或业务系统的能力，做成 block。
4. 有独立输入输出、权限、副作用、错误类型、runtime binding 的能力，做成 block。
5. 300+ block 都需要复用的基础能力，必须在 runtime/compiler/editor 层内置，不复制进 block catalog。

## 为什么 If 不做成 Block

如果把 `if` 做成 block，会带来几个问题：

- block SDK 需要理解 workflow 分支结构。
- UI 无法用统一方式展示 `then` / `else` 子树。
- 调试器无法稳定地在控制流节点上打断点、单步和记录分支选择。
- compiler 难以统一检查条件表达式、引用作用域和分支输出合并。

因此 `if` 是 workflow 语言的一部分，不是 block catalog 的一部分。

## 为什么创建变量和普通赋值不存在

普通变量彻底取消。原因是 Node Output Reference 已经覆盖主数据流。

不允许：

```text
var.result
assign result = node.calculate.result
return var.result
```

允许：

```text
return node.calculate.result
```

这样数据生产和消费保持在同一条管道里：

```text
input.* -> node.* -> node.* -> return
```

用户和 Agent 不需要为了中间结果创建变量，也不需要执行普通赋值。

## State 是唯一可变全局状态

如果工作流确实需要跨节点、跨循环维护动态状态，使用 `state.*`。

示例：

```json
{
  "state": {
    "total_processed_count": {
      "type": {
        "name": "number"
      },
      "initialValue": {
        "kind": "literal",
        "value": 0
      }
    }
  }
}
```

读取：

```text
state.total_processed_count
```

写入只能通过 `assign`：

```json
{
  "id": "increment_total_processed_count",
  "kind": "assign",
  "target": "state.total_processed_count",
  "value": {
    "kind": "binary",
    "op": "+",
    "left": {
      "kind": "ref",
      "ref": "state.total_processed_count"
    },
    "right": {
      "kind": "literal",
      "value": 1
    }
  }
}
```

Compiler 必须强制：

- `assign.target` 只能是 `state.*`。
- `state.*` 必须在 workflow 顶层 `state` 中声明。
- `assign state.*` 不允许出现在 `parallel` 分支内部，除非该语句声明了明确并发锁或符合 parallel 的合并策略。

## Loop 容器

Loop 容器自带只读局部引用：

```text
loop.<loopId>.current_item
loop.<loopId>.index
```

示例：

```json
{
  "id": "loop_orders",
  "kind": "loop",
  "loopKind": "foreach",
  "iterable": {
    "kind": "ref",
    "ref": "input.orders"
  }
}
```

循环体内部可以引用：

```text
loop.loop_orders.current_item
loop.loop_orders.index
```

这些引用是 loop scope 的内置上下文，不是变量，也不是 block 输出。

## Parallel / Reduce 容器

Parallel 分支内部不创建变量。如果需要收集结果，由 `parallel` 节点自己声明输出。

示例：

```json
{
  "id": "parallel_fetch",
  "kind": "parallel",
  "branches": [],
  "join": {
    "strategy": "all",
    "collectOutputs": {
      "outputName": "combined_results",
      "type": {
        "name": "array"
      }
    }
  }
}
```

后续节点引用：

```text
node.parallel_fetch.combined_results
```

不要生成额外变量 `combined_results`。

## If 分支输出

`if` 是容器节点。分支内部的节点输出只在对应分支执行时存在，因此跨出 `if` 后不应该直接引用分支内部节点。

错误模型：

```text
return node.calculate_then.result
return node.calculate_else.result
```

正确模型：由 `if` 节点声明合并后的输出。

```json
{
  "id": "branch_calculate",
  "kind": "if",
  "condition": {
    "kind": "ref",
    "ref": "input.use_discount"
  },
  "then": [],
  "else": [],
  "outputs": {
    "result": {
      "then": {
        "kind": "ref",
        "ref": "node.calculate_discounted.result"
      },
      "else": {
        "kind": "ref",
        "ref": "node.calculate_regular.result"
      }
    }
  }
}
```

后续节点统一引用：

```text
node.branch_calculate.result
```

## 300+ Block 扩展约束

后续 block 数量增加时，系统必须保持这些约束：

- block catalog 只增长原子动作，不增长控制流语法。
- 每个 block 通过 manifest 描述接口，UI 和 compiler 不为单个 block 写硬编码。
- runtime 统一处理 input、node output、loop context、state、表达式、事件和错误包装。
- block SDK 实现只关心自己的输入、输出和外部副作用。
- 新 block 不要求修改 AST statement kind。

## 推荐分层

```text
Workflow AST
  sequence / if / loop / parallel / try / return / callBlock / callWorkflow / assign state.*

Compiler
  schema validation / type validation / reference validation / scope validation / block binding validation

Runtime
  expression evaluation / node output store / loop context / state store / control flow / event tracing / block invocation

Block Catalog
  block.json manifests for 300+ reusable actions

SDK Runtime
  concrete block implementations
```

这个分层的目标是：block 可以大量增加，但 workflow 语言、调试、校验和 UI 投影仍然保持稳定。
