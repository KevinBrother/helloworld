# Go AST Executor Deliverable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `rpawf exec ast.json block.json` directly execute the current sample workflow through the Go AST executor and a minimal Python sync block host.

**Architecture:** Keep `compiler/go/executor` as the tree-walk runtime and expose block execution through `executor.Host`. Add a concrete Python sync host that invokes existing IBlock runtime bindings with a JSON bridge, then wire the host into `apps/cli/rpawf exec`. Preserve the existing Python code generation flow.

**Tech Stack:** Go 1.22, existing AST/IBlock contracts, `os/exec`, JSON bridge over stdin/stdout, `uv --project runtimes/python run python`.

---

## File Structure

- Modify: `compiler/go/executor/control_flow.go` — add `while` loop semantics.
- Modify: `compiler/go/executor/expressions.go` — add strict comparison operators and remove string fallback for incompatible `+`.
- Modify: `compiler/go/executor/parallel.go` — enforce first-slice join policy support.
- Modify: `compiler/go/executor/errors.go` — add unsupported-feature sentinel.
- Create: `compiler/go/executor/python_host.go` — Python sync host and JSON bridge invocation.
- Modify: `compiler/go/executor/control_flow_test.go` — loop coverage.
- Modify: `compiler/go/executor/executor_test.go` — expression coverage.
- Modify: `compiler/go/executor/parallel_test.go` — join policy coverage.
- Create: `compiler/go/executor/python_host_test.go` — host adapter coverage.
- Modify: `apps/cli/rpawf/main.go` — add `exec`.
- Modify: `apps/cli/rpawf/main_test.go` — CLI help, no-block exec, and sample exec tests.
- Modify: `examples/sample-workflow/README.md` — document compile and direct exec paths.

### Task 1: Executor Core Semantics

**Files:**
- Modify: `compiler/go/executor/control_flow.go`
- Modify: `compiler/go/executor/expressions.go`
- Modify: `compiler/go/executor/parallel.go`
- Modify: `compiler/go/executor/errors.go`
- Test: `compiler/go/executor/control_flow_test.go`
- Test: `compiler/go/executor/executor_test.go`
- Test: `compiler/go/executor/parallel_test.go`

- [ ] **Step 1: Add failing tests for `while`, comparisons, strict `+`, and join policy**

Add tests named:

- `TestRunWorkflowExecutesWhileLoop`
- `TestEvaluateExpressionSupportsPythonComparisonOperators`
- `TestEvaluateExpressionRejectsIncompatibleAddition`
- `TestRunWorkflowRejectsUnsupportedParallelJoinPolicy`

Run:

```sh
go test ./compiler/go/executor -run 'TestRunWorkflowExecutesWhileLoop|TestEvaluateExpressionSupportsPythonComparisonOperators|TestEvaluateExpressionRejectsIncompatibleAddition|TestRunWorkflowRejectsUnsupportedParallelJoinPolicy' -v
```

Expected: FAIL because the current executor lacks these semantics.

- [ ] **Step 2: Implement minimal core changes**

Implement:

- `loopKind == ""` and `loopKind == "while"` as while loops using `stmt.Condition`;
- binary `<` and `>` for strings and numeric values;
- strict `+`, allowing string+string and numeric+numeric only;
- `ErrUnsupportedFeature`;
- parallel policy validation accepting missing/all joins and rejecting unsupported strategy/timeout/onError.

- [ ] **Step 3: Verify executor tests**

Run:

```sh
go test ./compiler/go/executor -v
```

Expected: PASS.

### Task 2: Python Sync Host

**Files:**
- Create: `compiler/go/executor/python_host.go`
- Create: `compiler/go/executor/python_host_test.go`

- [ ] **Step 1: Add failing host tests**

Add tests named:

- `TestPythonHostInvokesSyncBlockAndReturnsOutputs`
- `TestPythonHostKeepsBlockStdoutOutOfProtocol`
- `TestPythonHostRejectsUnsupportedRuntime`

Run:

```sh
go test ./compiler/go/executor -run 'TestPythonHost' -v
```

Expected: FAIL because `NewPythonHost` does not exist.

- [ ] **Step 2: Implement Python host**

Create `PythonHostOptions`, `NewPythonHost`, and `PythonHost.Call`.

The host must:

- default to `uv --project runtimes/python run python -c <bridge>`;
- send `module`, `callable`, and `inputs` as JSON on stdin;
- capture block stdout and forward it to Python stderr inside the bridge;
- decode object return values as `BlockResult.Outputs`;
- decode scalar return values as `BlockResult.Value`;
- reject non-Python targets and non-sync modes.

- [ ] **Step 3: Verify host tests**

Run:

```sh
go test ./compiler/go/executor -run 'TestPythonHost' -v
```

Expected: PASS.

### Task 3: CLI `exec`

**Files:**
- Modify: `apps/cli/rpawf/main.go`
- Modify: `apps/cli/rpawf/main_test.go`

- [ ] **Step 1: Add failing CLI tests**

Add tests named:

- `TestExecHelpOutput`
- `TestExecRunsNoBlockWorkflow`
- `TestExecRunsSampleWorkflowWithPythonBlocks`

Run:

```sh
go test ./apps/cli/rpawf -run 'TestExec' -v
```

Expected: FAIL because `exec` is not wired.

- [ ] **Step 2: Wire `exec`**

Implement:

- `rpawf exec --help`;
- `rpawf exec <ast.json> [block.json]`;
- AST schema load through existing schema helpers;
- block decoding through existing `decodeBlocks`;
- semantic validation through `compiler.ValidateWorkflow`;
- `executor.RunWorkflow` with `executor.NewPythonHost` when block definitions are present;
- JSON output using `executor.Result`.

- [ ] **Step 3: Verify CLI tests**

Run:

```sh
go test ./apps/cli/rpawf -run 'TestExec|TestCompileHelpOutput' -v
```

Expected: PASS.

### Task 4: Sample Documentation And Whole-Repo Verification

**Files:**
- Modify: `examples/sample-workflow/README.md`

- [ ] **Step 1: Update README**

Document both paths:

```sh
go run ./apps/cli/rpawf compile examples/sample-workflow/ast.json examples/sample-workflow/block.json > output/workflow.py
uv --project runtimes/python run python output/workflow.py
go run ./apps/cli/rpawf exec examples/sample-workflow/ast.json examples/sample-workflow/block.json
```

- [ ] **Step 2: Run final verification**

Run:

```sh
go test ./...
go run ./apps/cli/rpawf exec examples/sample-workflow/ast.json examples/sample-workflow/block.json
```

Expected: all tests pass and the exec output contains `"last_item": "second"` and `"finally_ran": true`.

- [ ] **Step 3: Commit**

Run:

```sh
git add .local/docs/superpowers/specs/2026-05-29-go-ast-executor-deliverable-design.md .local/docs/superpowers/plans/2026-05-29-go-ast-executor-deliverable-plan.md compiler/go/executor apps/cli/rpawf examples/sample-workflow/README.md
git commit -m "feat: add direct ast executor"
```
