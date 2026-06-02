# RPA Agent Workflow Contract-First Design

Date: 2026-05-28

## Decision

The first implementation track is contract-first. IAST, IBlock, and the Go compiler are v1-complete from the start. The Python runtime may start with a small set of built-in blocks, but the compiler must fully understand the v1 contract and reject invalid inputs with actionable diagnostics.

This keeps `ast.json` and `block.json` useful as test surfaces. When either file is changed, compiler feedback should identify whether the issue is structural, semantic, type-related, binding-related, or a runtime capability mismatch.

## Goals

- Define IAST as the canonical workflow intermediate representation.
- Define IBlock as the canonical block capability and runtime binding contract.
- Serialize IAST as `ast.json`.
- Serialize IBlock definitions as `block.json`.
- Implement a Go compiler that fully parses, validates, type-checks, and compiles v1 IAST/IBlock into executable Python.
- Implement a Python runtime that supports the full v1 control-flow model, including parallel branches.
- Provide a small but real built-in block set for runtime verification, such as `log` and `get_os_info`.
- Preserve stable extension points for React UI, Agent generation, and debugging.

## Non-Goals

- Building the React workflow editor in the first implementation track.
- Implementing natural-language-to-IAST generation in the first implementation track.
- Implementing a full DAP adapter in the first implementation track.
- Implementing operating-system-grade sandbox isolation in the first runtime pass.
- Supporting arbitrary graph execution as the primary v1 workflow model.

## Architecture

The system has four primary layers:

1. Contract layer
   - IAST schema and model.
   - IBlock schema and model.
   - Shared type system and expression model.

2. Compiler layer in Go
   - JSON loading and schema validation.
   - Semantic validation.
   - Type checking.
   - Runtime binding resolution.
   - Python code generation.
   - Diagnostic reporting.

3. Runtime layer in Python
   - Workflow context.
   - Variable store.
   - Block registry.
   - Structured control-flow executor.
   - Parallel branch scheduler.
   - Trace/debug event emitter.

4. Future integration layers
   - React UI consumes IAST plus UI metadata.
   - Agent generation produces IAST under schema and semantic constraints.
   - Debugger consumes trace events first, then can grow into DAP.

## IAST V1

IAST is the canonical workflow IR. `ast.json` is its JSON serialization.

The root document contains:

- `schemaVersion`: contract version, for example `1.0.0`.
- `workflow`: stable workflow identity and display metadata.
- `imports`: optional referenced workflow or block namespaces.
- `inputs`: typed workflow input ports.
- `outputs`: typed workflow output ports.
- `variables`: declared workflow variables.
- `body`: structured executable statements.
- `policies`: default retry, timeout, and error behavior.
- `metadata`: extension container for UI, Agent, and debug data.

The executable model is structured rather than arbitrary DAG. V1 statement kinds are:

- `sequence`: ordered statements.
- `callBlock`: invokes one IBlock.
- `callWorkflow`: invokes a named sub-workflow.
- `assign`: writes a variable from an expression.
- `if`: conditional branch.
- `loop`: bounded, while, or foreach loop.
- `parallel`: structured parallel branches with explicit join semantics.
- `try`: structured error handling with catch/finally.
- `emit`: structured event emission for observability.
- `return`: writes workflow outputs and terminates the current workflow scope.

Each statement has:

- `id`: stable unique statement id.
- `kind`: statement kind.
- `inputs` or kind-specific fields.
- `outputs` where applicable.
- `onError`: optional local error policy override.
- `metadata`: optional `ui`, `agent`, and `debug` extension objects.

## Structured Parallel Semantics

V1 supports parallel branches as a first-class structured statement:

```json
{
  "id": "parallel_collect_system_info",
  "kind": "parallel",
  "branches": [
    {
      "id": "os_branch",
      "body": []
    },
    {
      "id": "env_branch",
      "body": []
    }
  ],
  "join": {
    "strategy": "all",
    "timeoutMs": 30000,
    "onError": "failFast"
  }
}
```

V1 join strategies are:

- `all`: all branches must complete.
- `any`: first successful branch completes the parallel statement.
- `race`: first branch to finish completes the parallel statement, success or failure.

V1 error strategies are:

- `failFast`: cancel pending branches after the first failure.
- `collectErrors`: wait for all branches and return aggregated errors.
- `ignoreBranchErrors`: record branch errors in trace output and continue.

Variable writes from parallel branches are restricted. A branch may write:

- variables declared inside that branch;
- branch output values declared on the parallel statement;
- shared variables only when the variable declaration explicitly allows concurrent writes and defines a merge strategy.

Allowed merge strategies are:

- `lastWriterWins`;
- `appendList`;
- `mergeObject`;
- `custom`, resolved through a named runtime binding.

If a parallel branch writes a shared variable without an explicit merge strategy, the compiler must reject the workflow.

## Type System

IAST and IBlock share one type system:

- primitives: `string`, `number`, `integer`, `boolean`, `null`;
- structured values: `object`, `array`, `map`;
- special values: `datetime`, `duration`, `secret`, `file`, `bytes`;
- union types;
- enum types;
- optional and nullable markers;
- generic JSON values only when explicitly declared as `any`.

The compiler must type-check:

- workflow inputs and outputs;
- variable declarations;
- assignment expressions;
- block call input bindings;
- block call output bindings;
- condition expressions;
- loop iterables;
- parallel branch outputs and merge strategies;
- sub-workflow calls.

## Expressions and Bindings

Expressions are structured data, not free-form Python. This keeps Agent output, UI editing, validation, and code generation deterministic.

Expression kinds include:

- `literal`;
- `ref`;
- `binary`;
- `unary`;
- `call`;
- `template`;
- `select`;
- `object`;
- `array`.

References use explicit scopes:

- `input.<name>`;
- `var.<name>`;
- `block.<statementId>.<outputName>`;
- `branch.<branchId>.<outputName>`;
- `workflow.<outputName>`.

The compiler must reject unresolved references, illegal scope access, ambiguous names, and type-incompatible expressions.

## IBlock V1

IBlock is the canonical block definition model. `block.json` is its JSON serialization.

Each block definition contains:

- `schemaVersion`;
- `id`;
- `namespace`;
- `name`;
- `version`;
- `display`;
- `description`;
- `inputs`;
- `outputs`;
- `config`;
- `runtime`;
- `permissions`;
- `sideEffects`;
- `errors`;
- `examples`;
- `compatibility`;
- `metadata`.

Inputs, outputs, and config fields use the shared type system.

Runtime binding describes how generated Python should invoke the block:

```json
{
  "runtime": {
    "target": "python",
    "module": "rpa_runtime.blocks.system",
    "callable": "get_os_info",
    "mode": "sync"
  }
}
```

V1 runtime modes are:

- `sync`;
- `async`;
- `generator`.

The compiler does not need a hardcoded list of blocks. It resolves calls through `block.json`. Built-in blocks are normal block definitions that happen to ship with the runtime.

## Compiler V1

The Go compiler is v1-complete. It must not silently accept unsupported valid syntax. Any valid v1 workflow must compile to Python. Any invalid workflow must produce diagnostics that point to concrete contract violations.

Pipeline:

1. Load `ast.json` and one or more `block.json` files.
2. Validate JSON syntax.
3. Validate documents against JSON Schema.
4. Decode into typed Go models.
5. Build symbol tables for workflows, variables, statements, blocks, ports, and branch scopes.
6. Resolve block references and runtime bindings.
7. Validate statement structure and control-flow rules.
8. Type-check expressions and bindings.
9. Validate error, timeout, retry, and parallel join policies.
10. Generate Python source.
11. Optionally run generated code through a compile-only Python syntax check.

Diagnostics must include:

- diagnostic code;
- severity;
- message;
- JSON path;
- related statement or block id when available;
- remediation hint.

Example diagnostic categories:

- `JSON_SYNTAX`;
- `SCHEMA_INVALID`;
- `UNKNOWN_BLOCK`;
- `UNKNOWN_PORT`;
- `TYPE_MISMATCH`;
- `UNRESOLVED_REFERENCE`;
- `ILLEGAL_SCOPE_ACCESS`;
- `PARALLEL_WRITE_CONFLICT`;
- `MISSING_RUNTIME_BINDING`;
- `UNSUPPORTED_RUNTIME_TARGET`.

## Python Code Generation

Generated Python should be deterministic and readable enough for debugging.

The generated file should contain:

- imports for the runtime;
- embedded workflow metadata;
- block binding table;
- async `main` workflow function;
- generated functions for sub-workflow or branch scopes;
- source map comments linking Python sections back to IAST statement ids.

The compiler should generate async Python by default so sequence, condition, loop, and parallel execution share one execution model. Sync block bindings are wrapped by the runtime.

## Python Runtime V1

The runtime supports the full v1 execution model:

- workflow context;
- typed variable store;
- block registry;
- sync and async block invocation;
- structured parallel branch execution;
- cancellation;
- timeout handling;
- error propagation;
- retry handling;
- trace/debug event emission.

Initial built-in block definitions:

- `core.log`: accepts a message and writes to runtime output.
- `system.get_os_info`: returns OS name, platform, architecture, and version fields.

The runtime can start as a trusted local process. The sandbox boundary is represented in the contract through permissions and side effects, then strengthened later with process, filesystem, network, and environment restrictions.

## Debug and Trace Model

DAP is not implemented in the first track, but the contract and runtime must emit events that a DAP adapter can consume later.

Trace events include:

- workflow start/end;
- statement start/end;
- block call start/end;
- branch start/end;
- variable write;
- error raised;
- retry scheduled;
- timeout;
- cancellation.

Each event includes:

- workflow id;
- statement id when applicable;
- branch id when applicable;
- timestamp;
- status;
- structured payload;
- correlation id.

## UI and Agent Metadata

IAST and IBlock include metadata extension points. The compiler validates that metadata is JSON, but does not assign execution semantics to unknown metadata keys.

Reserved metadata namespaces:

- `ui`: layout, node position, collapsed state, display hints.
- `agent`: generation source, prompt references, confidence, repair history.
- `debug`: breakable marker, source map labels, watch expressions.

Execution semantics must live in typed contract fields, not metadata.

## Repository Direction

The expected implementation layout is:

```text
cmd/rpawf/
internal/ast/
internal/block/
internal/schema/
internal/compiler/
internal/diagnostic/
internal/codegen/python/
runtime/python/rpa_runtime/
examples/
schemas/
```

This layout keeps the Go contract/compiler code separate from the Python runtime and leaves room for the future React application.

## Acceptance Criteria

The first implementation track is accepted when:

- IAST and IBlock schemas exist and cover the v1 contract.
- Go typed models exist for IAST and IBlock.
- The Go compiler validates structure, semantics, types, scopes, block bindings, and parallel branch rules.
- The compiler produces deterministic Python for valid workflows.
- Invalid examples fail with precise diagnostics.
- A sample workflow compiles and runs through the Python runtime.
- The sample workflow uses at least one parallel statement.
- Built-in `core.log` and `system.get_os_info` blocks are represented through IBlock definitions.
- Runtime trace events include statement and branch lifecycle events.

## Implementation Order

1. Define schemas and examples for IAST and IBlock.
2. Implement Go models and schema validation.
3. Implement semantic validation and diagnostics.
4. Implement expression and type checking.
5. Implement block binding resolution.
6. Implement Python code generation.
7. Implement Python runtime core.
8. Add built-in block definitions and runtime implementations.
9. Add compile/run examples, including a parallel workflow.
10. Add tests for valid workflows and invalid diagnostic cases.
