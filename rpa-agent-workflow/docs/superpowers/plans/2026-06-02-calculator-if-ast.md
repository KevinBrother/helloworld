# Calculator If AST Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `if` control-flow node to the calculator AST example without changing the calculator command contract.

**Architecture:** Update the calculator example data only. The existing executor already supports `if` and binary equality, and the existing CLI tests run the real AST through Python block manifests.

**Tech Stack:** Go tests, JSON AST fixtures, Python block runtime invoked through `uv`.

---

### Task 1: Add Calculator If Fixture Coverage

**Files:**
- Modify: `apps/cli/rpawf/main_test.go`
- Create: `examples/calculator/input-noop.json`

- [ ] Add a helper assertion in `TestExecRunsCalculatorWorkflowWithInputJSON` that reads `../../../examples/calculator/ast.json` and fails unless the root statements contain a top-level `if`.
- [ ] Add a `noop` table case using `input-noop.json`, expecting result `42`.
- [ ] Run `go test ./apps/cli/rpawf -run TestExecRunsCalculatorWorkflowWithInputJSON -count=1`; before the AST edit, this should fail because no top-level `if` exists.

### Task 2: Add the If Node to Calculator AST

**Files:**
- Modify: `examples/calculator/ast.json`

- [ ] Replace the top-level `calculate` statement with `branch_operator`.
- [ ] Use condition `input.operator == "noop"`.
- [ ] In `then`, assign `var.result` from `input.left`.
- [ ] In `else`, keep the existing `math.calculate` call and outputs.
- [ ] Leave `return_result` unchanged.

### Task 3: Verify

**Files:**
- Existing project files only

- [ ] Run `go test ./apps/cli/rpawf -run TestExecRunsCalculatorWorkflowWithInputJSON -count=1`.
- [ ] Run `go test ./apps/cli/rpawf -run TestExecCalculatorReportsDivisionByZero -count=1`.
- [ ] Run `go test ./...`.
- [ ] Regenerate the Web sample projection with `mkdir -p output && go run ./apps/cli/rpawf project-ui examples/calculator/ast.json > output/calculator-ui-node.json`.
