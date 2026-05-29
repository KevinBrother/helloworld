# Go AST Executor Deliverable Design

Date: 2026-05-29

## Decision

The Go AST executor is not accepted as an executor-core demo. The first useful deliverable must run a real `ast.json` workflow end to end through the CLI, including `callBlock` statements backed by the existing Python runtime bindings in `block.json`.

The first production slice is therefore:

- Go tree-walk execution for the current AST statement and expression contract;
- a minimal Python sync block host for `runtime.target == "python"` and `runtime.mode == "sync"`;
- `rpawf exec` as a real command that loads AST, loads block definitions, runs the executor, and prints a JSON result;
- sample workflow compatibility, so `examples/sample-workflow/ast.json` plus `examples/sample-workflow/block.json` can execute without going through Python code generation.

The existing Python code generation flow remains supported. The Go executor is additive, but it must be useful on its own.

## Goals

- Execute `ast.json` directly from Go without generating workflow Python source.
- Keep AST loading and schema validation in the existing Go schema/compiler layers.
- Keep block invocation behind an executor `Host` interface.
- Ship one concrete host: Python sync block invocation using the existing IBlock runtime binding fields.
- Support the current sample workflow end to end through `rpawf exec`.
- Preserve structured trace events and structured runtime errors.
- Add parity tests against the current Python runtime for overlapping semantics.
- Document the boundary between executor core, host adapters, and CLI integration.

## Non-Goals

- Replacing or removing `rpawf compile` or the existing Python runtime.
- Implementing all future IBlock runtime modes in the first slice.
- Supporting `runtime.mode == "async"` or `runtime.mode == "generator"` in the first slice.
- Supporting non-Python runtime targets in the first slice.
- Building a full debugger or DAP adapter.
- Implementing operating-system sandboxing around Python block execution.

Unsupported runtime modes or targets must fail with clear structured errors. They must not silently no-op.

## Architecture

The deliverable has four boundaries:

1. Executor core in `compiler/go/executor`
   - Walks AST statements.
   - Evaluates structured expressions.
   - Manages workflow frames, local inputs, variables, returns, and trace events.
   - Exposes `Host` for `callBlock`.
   - Does not import Python runtime packages directly.

2. Host adapter
   - Implements `executor.Host`.
   - Resolves `block.Definition.Runtime`.
   - For the first slice, supports Python sync bindings only.
   - Converts Go input values to JSON, invokes Python, converts JSON output back to Go, and maps failures into structured runtime errors.

3. CLI integration in `apps/cli/rpawf`
   - Adds `exec`.
   - Loads and validates `ast.json`.
   - Optionally loads one or more `block.json` files.
   - Builds the Python sync host when block definitions are supplied.
   - Runs `executor.RunWorkflow`.
   - Prints a stable JSON result.

4. Existing Python runtime
   - Remains the source for built-in block behavior such as `core.log` and `system.get_os_info`.
   - Is invoked by the host adapter, not by generated workflow code.

## CLI Contract

The primary command is:

```sh
go run ./apps/cli/rpawf exec examples/sample-workflow/ast.json examples/sample-workflow/block.json
```

`exec` accepts:

- required `ast.json` path;
- optional `block.json` path, initially one file containing either one block definition or an array of definitions;
- future-compatible flags may be added later for inputs, trace output, Python executable, and runtime project path.

The command prints JSON to stdout. The first accepted shape is the existing `executor.Result`:

```json
{
  "returns": {},
  "variables": {},
  "events": []
}
```

If a workflow fails, the command exits non-zero and prints a concise error to stderr. Detailed trace behavior should remain available through `Result.Events` for successful runs and through `Recorder` for tests and future debug plumbing.

## Python Sync Host

The first concrete host supports this binding shape:

```json
{
  "runtime": {
    "target": "python",
    "module": "rpa_runtime.blocks.core",
    "callable": "log",
    "mode": "sync"
  }
}
```

The adapter must:

- reject empty or unsupported `target`;
- reject unsupported `mode`;
- invoke the configured module and callable;
- pass statement inputs as keyword arguments;
- accept Python return values that are JSON-serializable;
- treat `None` return as no outputs;
- treat object return values as named outputs;
- expose scalar return values as `BlockResult.Value` only;
- reject named output binding from scalar return values in the first slice.

The first implementation should prefer a small Python bridge script or `python -c` invocation over generated workflow Python. The bridge receives a JSON request containing module, callable, and inputs, then prints a JSON response containing outputs or error metadata.

The default local invocation should match the repository's current Python runtime path:

```sh
uv --project runtimes/python run python <bridge>
```

If `uv` is unavailable, the host may fall back to a configured Python executable only when `rpa_runtime` is importable. Failure to locate a usable Python runtime must be reported as a host setup error, not as an unknown block error.

The adapter must avoid mixing user block stdout with protocol JSON. The protocol should use stdout exclusively for the machine response and route block logs to stderr, or otherwise isolate the final JSON response in a robust way. This matters because `core.log` prints.

## Statement Coverage

The Go executor must support the statement kinds in the current AST model:

- `sequence`;
- `assign`;
- `if`;
- `loop`;
- `parallel`;
- `try`;
- `callWorkflow`;
- `callBlock`;
- `return`.

For `loop`, both current runtime semantics must be handled:

- `foreach` iterates `iterable` and binds `itemVar`;
- `while` evaluates `condition` before each iteration.

For `parallel`, first-slice support must be explicit:

- `join.strategy == "all"` is required for sample compatibility;
- missing `join.strategy` defaults to `all`;
- `join.strategy == "any"` and `join.strategy == "race"` are rejected with structured unsupported-feature errors;
- `join.timeoutMs > 0` is rejected until cancellation semantics are implemented;
- `join.onError == ""` and `join.onError == "failFast"` are accepted;
- other `join.onError` values are rejected with structured unsupported-feature errors.

It is better to reject unsupported valid-looking policy combinations than to pretend they were honored.

## Expression Coverage

The executor must support current expression kinds:

- `literal`;
- `ref`;
- `binary`;
- `array`;
- `object`;
- `template`.

Binary operators must match the current Python runtime where practical:

- `+`;
- `==`;
- `!=`;
- `<`;
- `>`.

The design preference is strict compatibility over convenience. For example, `+` should not silently stringify incompatible operands if the Python runtime would fail. Any intentional divergence must be documented and covered by tests.

References must support:

- `input.<name>`;
- `var.<name>`;
- local loop variables such as `item`;
- catch bindings from `catch.as`.

Selector semantics must be documented. If selectors are supported, they should work for JSON objects returned from Python blocks as well as Go maps.

## State And Error Semantics

Runtime state consists of:

- root workflow frame;
- subworkflow frames;
- local values in each frame;
- workflow variables;
- return signal for the current workflow scope;
- trace event buffer;
- host adapter and block registry.

Errors must include:

- phase, such as load, eval, execute, or host;
- workflow id;
- statement id;
- statement kind;
- branch id when relevant;
- underlying cause.

Context cancellation must be checked at statement boundaries and around host calls.

## Validation Boundary

`rpawf exec` should validate AST schema before execution. Semantic validation should reuse existing compiler validation where it applies, especially for:

- unknown block ids;
- unsupported block runtime targets or modes;
- unknown variables;
- invalid statement kinds;
- parallel write conflicts.

Executor runtime checks still need to exist because library callers may invoke `RunWorkflow` directly.

## Compatibility Requirements

The deliverable must include tests that prove useful behavior, not only unit behavior:

- executor unit tests for expressions, control flow, host binding, parallel conflict handling, and errors;
- CLI tests for `exec --help`;
- CLI tests for executing a no-block workflow;
- CLI or integration test for executing `examples/sample-workflow/ast.json` with `examples/sample-workflow/block.json`;
- parity tests against the Python runtime for overlapping behavior, especially expression operators, loop semantics, try/finally, callWorkflow, and sample outputs.

The sample workflow acceptance test is mandatory. If it cannot run in a given environment because Python or `uv` is unavailable, the test may skip with a clear reason, but the normal local development path must pass it.

## Acceptance Criteria

The work is complete only when:

- `go test ./...` passes;
- `rpawf exec --help` is documented and tested;
- `rpawf exec examples/sample-workflow/ast.json examples/sample-workflow/block.json` executes successfully;
- the command returns the expected sample outputs, including `last_item == "second"` and `finally_ran == true`;
- `core.log` can print without corrupting the host protocol;
- `system.get_os_info` can return object outputs;
- unsupported Python modes and non-Python targets produce clear structured errors;
- the existing `rpawf compile` path still works;
- README documents both compile-and-run and direct exec paths.

## Implementation Order

1. Freeze executor API and result/error contracts.
2. Complete missing executor core semantics: `while`, comparison operators, documented output binding behavior, and explicit unsupported join policy handling.
3. Implement Python sync host adapter with a JSON bridge.
4. Add `rpawf exec` CLI and tests.
5. Add sample workflow integration coverage.
6. Add Python runtime parity coverage for overlapping semantics.
7. Update README and original plan status so future workers do not mistake the core-only implementation for a finished executor.
