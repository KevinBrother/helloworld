# AST Debugger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `rpawf debug` as a real AST debugger with breakpoints, stepping, pause/continue, state inspection, source mapping, and a DAP adapter.

**Architecture:** The Go executor stays the runtime engine and gains small statement-boundary hooks plus structured snapshots. `compiler/go/astdbg` owns debugger sessions, stop reasons, breakpoint logic, stepping, and source maps; `apps/cli/rpawf` becomes the terminal and DAP front-end. Parallel branches are debugged at statement boundaries only, not through a separate scheduling model.

**Tech Stack:** Go stdlib, existing `compiler/go/executor`, existing CLI entrypoint, stdio JSON-RPC for DAP.

---

### Task 1: Add executor debug hooks and runtime snapshots

**Files:**
- Modify: `compiler/go/executor/types.go`
- Modify: `compiler/go/executor/state.go`
- Modify: `compiler/go/executor/execute.go`
- Modify: `compiler/go/executor/control_flow.go`
- Modify: `compiler/go/executor/parallel.go`
- Create: `compiler/go/executor/debug_hooks_test.go`

- [ ] **Step 1: Write the failing test**

```go
func TestRunWorkflowCallsDebugHookOnStatementBoundaries(t *testing.T) {
    // Run a small workflow with sequence, if, and parallel branches.
    // Assert the hook sees before/after events for:
    // - root sequence
    // - chosen if branch
    // - both parallel branches
    // - return statement
    // Assert the hook receives workflow id, statement id, statement kind,
    // current frame locals, and current workflow variables.
}
```

Run:
```sh
go test ./compiler/go/executor -run TestRunWorkflowCallsDebugHookOnStatementBoundaries -v
```
Expected: FAIL because the hook types and callbacks do not exist yet.

- [ ] **Step 2: Add the minimal hook surface**

Add these executor types:
```go
type DebugHook interface {
    BeforeStatement(context.Context, StatementSnapshot) error
    AfterStatement(context.Context, StatementSnapshot) error
    OnError(context.Context, StatementSnapshot, error) error
}

type StatementSnapshot struct {
    WorkflowID    string
    StatementID   string
    StatementKind string
    BranchID      string
    Frames        []FrameSnapshot
    Variables     map[string]any
}

type FrameSnapshot struct {
    WorkflowID string
    Locals     map[string]any
}
```

Wire `Options` to accept the hook, store it in `state`, and call it at statement boundaries. Copy the hook into `cloneForParallel()` so branch goroutines share the same debugger session safely.

- [ ] **Step 3: Make the test pass**

Verify the hook sees:
- `BeforeStatement` before every statement start
- `AfterStatement` after successful completion
- `OnError` for runtime failures and returned errors
- all parallel branch statements

Run:
```sh
go test ./compiler/go/executor -run TestRunWorkflowCallsDebugHookOnStatementBoundaries -v
go test -race ./compiler/go/executor
```
Expected: PASS.

- [ ] **Step 4: Verify the wider executor still works**

Run:
```sh
go test ./compiler/go/executor -v
go test ./...
```
Expected: PASS.

---

### Task 2: Implement the `astdbg` session core

**Files:**
- Create: `compiler/go/astdbg/session.go`
- Create: `compiler/go/astdbg/types.go`
- Create: `compiler/go/astdbg/session_test.go`
- Create: `compiler/go/astdbg/breakpoint_test.go`
- Create: `compiler/go/astdbg/stepping_test.go`
- Create: `compiler/go/astdbg/errors_test.go`

- [ ] **Step 1: Write the failing tests**

Add tests for these behaviors:

```go
func TestSessionStopsOnStatementBreakpoint(t *testing.T)
func TestSessionStepsOverNestedStatements(t *testing.T)
func TestSessionStepsOutOfCallWorkflow(t *testing.T)
func TestSessionReportsRuntimeErrorAsExceptionStop(t *testing.T)
func TestSessionTerminatesCleanly(t *testing.T)
```

Each test should drive a tiny workflow through the executor hook interface and assert:
- the stop reason is correct (`entry`, `breakpoint`, `step`, `exception`, `terminated`, `end`)
- the snapshot includes workflow id, statement id, locals, variables, and frame stack
- `continue`, `next`, `stepIn`, `stepOut`, `pause`, and `terminate` change the session state correctly

Run:
```sh
go test ./compiler/go/astdbg -run TestSessionStopsOnStatementBreakpoint -v
```
Expected: FAIL because the package does not exist yet.

- [ ] **Step 2: Add the session model**

Create a session API like this:
```go
type Session struct {
    // workflow, source map, breakpoint table, current stop reason,
    // current command mode, current snapshot, and control channels
}

func NewSession(workflow ast.Workflow, opts Options) *Session
func (s *Session) SetBreakpoints(bps []Breakpoint)
func (s *Session) Continue() error
func (s *Session) Next() error
func (s *Session) StepIn() error
func (s *Session) StepOut() error
func (s *Session) Pause() error
func (s *Session) Terminate() error
func (s *Session) Snapshot() Snapshot
```

The session should implement the executor `DebugHook` interface from Task 1 and stop only at statement boundaries. For parallel branches, the session should treat each branch statement as a normal stop boundary, without inventing a separate scheduler.

- [ ] **Step 3: Make the tests pass**

Implement:
- breakpoint matching by `statementId`
- step-over by tracking the current statement depth
- step-in by entering the next nested statement or subworkflow
- step-out by running until the current frame returns
- pause by flipping a session flag that the next hook boundary observes
- terminate by canceling the session context and returning a terminated stop

Run:
```sh
go test ./compiler/go/astdbg -v
```
Expected: PASS.

- [ ] **Step 4: Verify executor integration still passes**

Run:
```sh
go test ./compiler/go/executor ./compiler/go/astdbg -v
```
Expected: PASS.

---

### Task 3: Build AST JSON source mapping

**Files:**
- Create: `compiler/go/astdbg/source_map.go`
- Create: `compiler/go/astdbg/source_map_test.go`
- Create: `compiler/go/astdbg/testdata/debuggable_ast.json`

- [ ] **Step 1: Write the failing test**

Create a tiny fixture with one `sequence`, one `if`, one `parallel`, one `callBlock`, and one `return`. Then write:

```go
func TestSourceMapResolvesNestedStatements(t *testing.T) {
    // Load testdata/debuggable_ast.json.
    // Assert each statement id resolves to:
    // - a JSON path
    // - a 1-based line number
    // - a 1-based column number when available
    // Assert line lookups return the expected statement ids.
}
```

Run:
```sh
go test ./compiler/go/astdbg -run TestSourceMapResolvesNestedStatements -v
```
Expected: FAIL because the source map does not exist yet.

- [ ] **Step 2: Implement raw JSON traversal**

Parse the AST bytes with `encoding/json.Decoder`, use token offsets to recover line and column, and walk the same structural kinds already used by the executor:
- `sequence`
- `if`
- `loop`
- `parallel`
- `try`
- `callBlock`
- `callWorkflow`
- `assign`
- `return`

Return a map keyed by `statementId` plus a reverse index by line number for `break line`.

- [ ] **Step 3: Make the mapping tests pass**

Run:
```sh
go test ./compiler/go/astdbg -run TestSourceMapResolvesNestedStatements -v
go test ./compiler/go/astdbg -v
```
Expected: PASS.

- [ ] **Step 4: Verify the line map is usable by the debugger**

Add a tiny integration test that asks the session to set a line breakpoint, resolves it through the source map, and stops on the matching statement id.

Run:
```sh
go test ./compiler/go/astdbg -run TestSessionResolvesLineBreakpoint -v
```
Expected: PASS.

---

### Task 4: Wire `rpawf debug` as an interactive CLI

**Files:**
- Modify: `apps/cli/rpawf/main.go`
- Create: `apps/cli/rpawf/debug.go`
- Create: `apps/cli/rpawf/debug_test.go`
- Create: `apps/cli/rpawf/testdata/debug-session-input.txt`

- [ ] **Step 1: Write the failing test**

Add tests for:

```go
func TestDebugHelpOutput(t *testing.T)
func TestDebugCommandRunsAScriptedSession(t *testing.T)
func TestDebugCommandPrintsLocalsVarsStackAndWhere(t *testing.T)
```

The scripted session should exercise:
- `break <statementId>`
- `break line <n>`
- `continue`
- `next`
- `step`
- `out`
- `vars`
- `locals`
- `stack`
- `where`
- `quit`

Run:
```sh
go test ./apps/cli/rpawf -run TestDebugHelpOutput -v
```
Expected: FAIL because `debug` does not exist yet.

- [ ] **Step 2: Add the `debug` subcommand**

Extend `main.go` to dispatch:
```sh
go run ./apps/cli/rpawf debug <ast.json> [block.json]
go run ./apps/cli/rpawf debug --dap <ast.json> [block.json]
```

Implement the interactive loop in `debug.go` with `bufio.Scanner` and injectable input/output streams so the test can script commands without a real terminal.

- [ ] **Step 3: Make the CLI tests pass**

The CLI should print:
- current stop reason
- current statement id and kind
- frame stack
- locals
- workflow variables
- return values when stopped on a `return`

Run:
```sh
go test ./apps/cli/rpawf -v
```
Expected: PASS.

- [ ] **Step 4: Smoke test the real command**

Run:
```sh
printf 'break parallel_system_info\ncontinue\nwhere\nquit\n' | go run ./apps/cli/rpawf debug examples/sample-workflow/ast.json examples/sample-workflow/block.json
```
Expected: the session pauses on the requested statement and prints a readable location/state summary.

---

### Task 5: Add the DAP adapter on top of the same session core

**Files:**
- Create: `compiler/go/astdbg/dap/server.go`
- Create: `compiler/go/astdbg/dap/transport.go`
- Create: `compiler/go/astdbg/dap/protocol.go`
- Create: `compiler/go/astdbg/dap/server_test.go`
- Modify: `apps/cli/rpawf/debug.go`

- [ ] **Step 1: Write the failing tests**

Add protocol tests for:
```go
func TestDAPInitializeAndLaunch(t *testing.T)
func TestDAPSetBreakpointsReturnsVerifiedAndUnverifiedBreakpoints(t *testing.T)
func TestDAPContinueNextStepInStepOutAndPause(t *testing.T)
func TestDAPStackTraceScopesAndVariables(t *testing.T)
```

Run:
```sh
go test ./compiler/go/astdbg/dap -run TestDAPInitializeAndLaunch -v
```
Expected: FAIL because the adapter does not exist yet.

- [ ] **Step 2: Implement stdio JSON-RPC framing**

Add a minimal DAP transport that reads and writes `Content-Length` framed JSON messages over stdin/stdout. Keep the adapter independent from the executor so the same core session can serve both CLI and DAP clients.

- [ ] **Step 3: Implement the required requests**

Support:
- `initialize`
- `launch`
- `setBreakpoints`
- `configurationDone`
- `threads`
- `stackTrace`
- `scopes`
- `variables`
- `continue`
- `next`
- `stepIn`
- `stepOut`
- `pause`
- `disconnect`

Use the source map from Task 3 to translate line breakpoints. When a line cannot be mapped cleanly, return the breakpoint as unverified instead of rejecting it.

- [ ] **Step 4: Make the DAP tests pass**

Run:
```sh
go test ./compiler/go/astdbg/dap -v
```
Expected: PASS.

- [ ] **Step 5: Smoke test the adapter entrypoint**

Run:
```sh
go run ./apps/cli/rpawf debug --dap examples/sample-workflow/ast.json examples/sample-workflow/block.json
```
Expected: the process stays alive, speaks DAP on stdio, and can be driven by an IDE or protocol client.

---

### Task 6: Update docs and finish with repo-wide verification

**Files:**
- Modify: `README.md`
- Modify: `apps/cli/rpawf/main.go` usage text if needed
- Modify: `examples/sample-workflow/README.md` if the debug command needs a sample

- [ ] **Step 1: Write the documentation changes**

Add short Chinese command examples for:
- `go run ./apps/cli/rpawf exec ...`
- `go run ./apps/cli/rpawf debug ...`
- `go run ./apps/cli/rpawf debug --dap ...`

Keep it brief and local to the module overview and command list.

- [ ] **Step 2: Verify the full repo**

Run:
```sh
go test ./...
```
Expected: PASS.

- [ ] **Step 3: Verify the debugger with the sample workflow**

Run:
```sh
go run ./apps/cli/rpawf debug examples/sample-workflow/ast.json examples/sample-workflow/block.json
```
Expected: the workflow can be stepped, inspected, and resumed without breaking the existing exec path.

