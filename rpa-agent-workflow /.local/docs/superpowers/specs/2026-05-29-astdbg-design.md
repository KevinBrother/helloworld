# AST Debugger Design

Date: 2026-05-29

## Decision

`astdbg` is the debugger for workflow AST execution. It is not a trace printer and not a DAP shim. The debugger core must be able to pause execution, resume execution, step across AST statements, inspect variables and frames, and expose a stable event model that can feed both a CLI and a DAP adapter.

The implementation is layered:

- a debugger core in Go owns session state and step control;
- the existing Go executor becomes the execution engine with debugger hooks;
- a CLI entrypoint provides local debugging without an IDE;
- a DAP adapter translates IDE requests into debugger commands;
- statement identity is the primary internal breakpoint key, while JSON line mappings are an adapter concern.

## Goals

- Debug `ast.json` execution directly.
- Support breakpoints, continue, next, stepIn, stepOut, pause, and terminate.
- Inspect current statement, workflow frame stack, locals, variables, inputs, and return values.
- Surface execution stops for breakpoints and runtime errors.
- Support local CLI debugging and DAP clients.
- Keep the existing executor and Python host usable for normal execution.

## Non-Goals

- Replacing the executor with a separate interpreter.
- Building a GUI debugger in this phase.
- Implementing full concurrent branch scheduling semantics for debugging.
- Making DAP the core execution model.
- Adding source-level language parsing beyond AST/JSON mapping.

## Architecture

`astdbg` is divided into four layers:

1. Debugger core
   - Owns a session, current stop reason, active command, and snapshots.
   - Stores breakpoints keyed by statement id.
   - Drives execution by issuing commands to the executor hook layer.

2. Executor hook layer
   - The Go executor calls debugger hooks before and after statement execution.
   - Hooks decide whether to stop, continue, or surface an error.
   - The executor remains unaware of DAP.

3. CLI layer
   - `rpawf debug` provides a local interactive debugger.
   - It can set breakpoints, continue, single-step, and inspect state from a terminal.

4. DAP adapter
   - Maps IDE requests to debugger core commands.
   - Translates statement breakpoints to DAP line breakpoints when possible.
   - Returns unverified breakpoints when the mapping is incomplete.

## Core Model

The debugger session must track:

- workflow id;
- current statement;
- current workflow frame;
- call stack / frame stack;
- local variables per frame;
- workflow variables;
- current stop reason;
- current command mode;
- trace events;
- breakpoint table;
- execution state.

Suggested stop reasons:

- `entry`;
- `breakpoint`;
- `step`;
- `pause`;
- `exception`;
- `terminated`;
- `end`.

## Execution Control

The debugger must support:

- `continue`: run until the next stop condition or workflow end;
- `next`: step over the current statement;
- `stepIn`: enter the next nested statement or subworkflow when available;
- `stepOut`: run until the current frame returns;
- `pause`: interrupt a running session at the next safe boundary;
- `terminate`: stop execution and close the session.

Stopping boundaries are statement boundaries, not arbitrary instruction counts. The executor should check debugger state before a statement starts and after a statement completes.

## Breakpoints

The primary internal breakpoint key is `statementId`.

Breakpoint support must include:

- exact statement id breakpoints;
- line breakpoints for DAP clients when a line map is available;
- verified and unverified breakpoint results;
- breakpoint hit events that carry statement id, kind, and workflow id.

If a line breakpoint cannot be mapped cleanly to a statement, the adapter must still accept it as unverified rather than rejecting the session outright.

## State Inspection

The debugger must expose snapshots that include:

- current workflow id;
- current statement id and kind;
- current frame stack;
- current locals and variables;
- current return values when a return is in progress;
- recent trace events;
- current stop reason.

Scopes should be structured enough for CLI and DAP to present:

- `locals`;
- `inputs`;
- `variables`;
- `returns`;
- `stack`.

## Executor Integration

The existing executor should grow a small hook interface, for example:

- `BeforeStatement`
- `AfterStatement`
- `OnError`

The hook interface must not depend on DAP types. It should only surface AST and runtime state.

The executor should remain the owner of runtime semantics such as:

- expression evaluation;
- variable assignment;
- loop semantics;
- try/catch/finally;
- call workflow;
- call block via host;
- trace emission.

Debugger control is layered on top of those semantics.

## CLI Contract

The CLI entrypoint is:

```sh
go run ./apps/cli/rpawf debug <ast.json> [block.json]
```

It should support basic terminal commands:

- `break <statementId>`;
- `break line <n>`;
- `continue`;
- `next`;
- `step`;
- `out`;
- `vars`;
- `locals`;
- `stack`;
- `where`;
- `quit`.

The CLI is a first-class debugger interface, not a hidden test harness.

## DAP Contract

The adapter should support the common minimum set:

- `initialize`;
- `launch`;
- `setBreakpoints`;
- `configurationDone`;
- `threads`;
- `stackTrace`;
- `scopes`;
- `variables`;
- `continue`;
- `next`;
- `stepIn`;
- `stepOut`;
- `pause`;
- `disconnect`.

DAP line breakpoints should map to AST statement locations when possible. `statementId` remains the authoritative internal identity.

## Source Mapping

The debugger needs a source map from AST JSON to statement locations.

Each statement location should include:

- statement id;
- statement kind;
- JSON path;
- line number;
- column number when available.

This map is required for CLI `break line` and DAP `setBreakpoints`.

## Error Handling

If execution fails, the debugger must stop with:

- workflow id;
- statement id;
- statement kind;
- phase;
- underlying cause.

Runtime errors should surface as debugger stops, not just as plain process exits.

## Acceptance Criteria

The debugger is complete when:

- `rpawf debug <ast.json> [block.json]` can run the sample workflow;
- breakpoints by statement id work;
- line breakpoints work when the source map can resolve them;
- `continue`, `next`, `stepIn`, and `stepOut` work;
- variables and frames can be inspected;
- runtime errors stop the debugger with context;
- `rpawf debug --dap ...` can speak to a DAP client with the core request set;
- existing `rpawf exec` and `rpawf compile` still pass tests.

## Implementation Order

1. Add debugger hook points to the executor.
2. Implement debugger session state and snapshots.
3. Implement statement id breakpoints and stepping.
4. Build source mapping from AST JSON.
5. Add `rpawf debug` CLI.
6. Add DAP adapter.
7. Add end-to-end tests for sample workflows.
