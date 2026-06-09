# Node Output Reference Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the workflow runtime from ordinary variables to `input.*`, `node.*`, `loop.*`, and `state.*` references, with calculator as the first working example.

**Architecture:** Runtime stores every statement output under `node.<statementId>.<outputName>`. Workflow inputs remain read-only `input.*`. Ordinary `variables` and `var.*` are rejected by compiler validation. `assign` is retained only for writing declared `state.*`.

**Tech Stack:** Go contracts/compiler/executor/transform tests, JSON AST fixtures, React UI projection build.

---

### Task 1: Add Node Output Runtime Tests

**Files:**
- Modify: `compiler/go/executor/executor_test.go`
- Modify: `compiler/go/executor/control_flow_test.go`

- [ ] Add a test where a `callBlock` with id `calculate` returns output `result`, and a later `return` reads `node.calculate.result`.
- [ ] Add a test where an `if` statement declares a merged output `result`; then branch reads one node output, else branch reads another node output, and `return` reads `node.branch.result`.
- [ ] Add a test where `assign` writes `state.total_count`, and `return` reads `state.total_count`.
- [ ] Run the targeted tests before implementation and confirm they fail with unknown refs.

### Task 2: Add Runtime Stores

**Files:**
- Modify: `compiler/go/executor/state.go`
- Modify: `compiler/go/executor/execute.go`
- Modify: `compiler/go/executor/host.go`
- Modify: `compiler/go/executor/control_flow.go`
- Modify: `compiler/go/executor/expressions.go`
- Modify: `compiler/go/executor/types.go`

- [ ] Replace ordinary variable writes with a `state` map for `state.*`.
- [ ] Add a `nodeOutputs map[string]map[string]any` store.
- [ ] When `callBlock` succeeds, store `result.Outputs` at `nodeOutputs[stmt.ID]`.
- [ ] When `callWorkflow` returns, store returned outputs at `nodeOutputs[stmt.ID]`.
- [ ] When `assign` executes, require `stmt.Target` to start with `state.` and write into the state map.
- [ ] Resolve refs by prefix: `input.*`, `node.*`, `loop.*`, `state.*`.
- [ ] Keep event/debug snapshots reporting state and node outputs clearly.

### Task 3: Add If Output Merging

**Files:**
- Modify: `contracts/ast/types.go`
- Modify: `contracts/schemas/ast.schema.json`
- Modify: `compiler/go/executor/execute.go`
- Modify: `compiler/go/compiler/validate.go`

- [ ] Add a statement output merge shape that supports branch expressions, e.g. `outputs.result.then` and `outputs.result.else`.
- [ ] During `if`, execute the selected branch, evaluate that branch's output expression, and store the merged result at `nodeOutputs[ifStatement.ID]`.
- [ ] Validate if merged outputs reference only expressions available in their branch.

### Task 4: Compiler Validation

**Files:**
- Modify: `compiler/go/compiler/validate.go`
- Modify: `compiler/go/compiler/validate_test.go`
- Modify: `compiler/go/compiler/fixtures/*.json`

- [ ] Reject `workflow.variables`.
- [ ] Reject `var.*` refs with `UNSUPPORTED_VARIABLE_REF`.
- [ ] Reject `assign` targets that do not start with `state.`.
- [ ] Reject `state.*` refs that are not declared in workflow top-level `state`.
- [ ] Validate `node.<statementId>.<outputName>` refs against known upstream statement outputs where the scope is statically clear.

### Task 5: Update Calculator Example

**Files:**
- Modify: `examples/calculator/ast.json`
- Modify: `apps/cli/rpawf/main_test.go`
- Regenerate: `output/calculator-ui-node.json`

- [ ] Remove `variables`.
- [ ] Remove `callBlock.outputs` bindings.
- [ ] Use `node.calculate_large_value.result` and `node.calculate_small_value.result`.
- [ ] Give the `if` node a merged `result` output.
- [ ] Return `node.branch_by_threshold.result`.

### Task 6: UI Projection and Web Output

**Files:**
- Modify: `compiler/go/transform/project.go`
- Modify: `apps/web/src/types.ts`
- Modify: `apps/web/src/App.tsx`

- [ ] Stop presenting ordinary variable outputs as the primary run result.
- [ ] Show `State` instead of `Variables` in the run panel.
- [ ] Project Start Node inputs as workflow inputs only.
- [ ] Project statement outputs as read-only node output references.

### Task 7: Verify

**Files:**
- Existing project files only

- [ ] Run `CGO_ENABLED=0 go test ./compiler/go/executor -count=1`.
- [ ] Run `CGO_ENABLED=0 go test ./compiler/go/compiler -count=1`.
- [ ] Run `CGO_ENABLED=0 go test ./apps/cli/rpawf -run 'TestExecRunsCalculatorWorkflowWithInputJSON|TestExecCalculatorReportsDivisionByZero' -count=1`.
- [ ] Run `CGO_ENABLED=0 go test ./...`.
- [ ] Run `pnpm build:web`.
