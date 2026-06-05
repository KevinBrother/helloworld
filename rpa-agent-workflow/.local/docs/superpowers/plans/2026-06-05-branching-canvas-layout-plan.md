# Branching Canvas Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render and edit `if` / `parallel` as real branch containers with fan-out controls, branch-local insertion controls, visual joins, and scalable branch counts.

**Architecture:** Add a normalized branch view model that converts legacy `if`, canonical multi-branch `if`, and `parallel` into a common canvas tree. Extend edit operations for adding branches and branch-local insertion anchors. Keep execution backward compatible by supporting legacy `if` while preferring canonical `if.branches` when present.

**Tech Stack:** Go AST/contracts/executor/transform, React + TypeScript workbench, Vitest, Go tests, Vite build.

---

## File Map

- `contracts/ast/types.go`: add conditional branch fields to `ast.Branch`.
- `contracts/schemas/ast.schema.json`: allow branch `label`, `condition`, and `default`.
- `compiler/go/executor/control_flow.go`: execute canonical `if.branches` when present.
- `compiler/go/compiler/validate.go`: validate branch conditions and default branch placement.
- `compiler/go/transform/project.go`: project legacy and canonical branches into UI branches.
- `compiler/go/transform/edit.go`: support branch add and branch-local node insertion.
- `contracts/edit-operation/types.go`: add `insertBranch`.
- `contracts/schemas/edit-operation.schema.json`: allow `insertBranch`.
- `apps/web/src/editOperations.ts`: add branch add operation builder and richer insert anchors.
- `apps/web/src/workbenchModel.ts`: replace linear-only canvas layout with branch-aware layout.
- `apps/web/src/workbench/components/WorkflowCanvas.tsx`: render branch heads, lanes, joins, and different `+` controls.
- `apps/web/src/styles.css`: style branch lanes, join nodes, and insertion controls.
- Tests alongside the files above.

---

### Task 1: Canonical Conditional Branch Contract

**Files:**
- Modify: `contracts/ast/types.go`
- Modify: `contracts/schemas/ast.schema.json`
- Test: `contracts/ast/types_test.go`
- Test: `contracts/ast/schema_test.go`

- [ ] **Step 1: Write failing contract tests**

Add tests asserting that an `if` statement can carry `branches` with condition and default metadata:

```go
func TestIfBranchContractSupportsConditionsAndDefault(t *testing.T) {
	branch := ast.Branch{
		ID:        "condition_1",
		Label:     "条件 1",
		Condition: &ast.Expression{Kind: "literal", Value: true},
		Body:      []ast.Statement{{ID: "log", Kind: "callBlock", Block: "core.log"}},
	}
	if branch.ID != "condition_1" || branch.Label != "条件 1" || branch.Condition == nil || len(branch.Body) != 1 {
		t.Fatalf("branch = %#v", branch)
	}
}
```

Run: `go test ./contracts/ast`
Expected: FAIL because `ast.Branch` does not have `Label` or `Condition`.

- [ ] **Step 2: Add branch fields**

Update `contracts/ast/types.go`:

```go
type Branch struct {
	ID        string      `json:"id"`
	Label     string      `json:"label,omitempty"`
	Condition *Expression `json:"condition,omitempty"`
	Default   bool        `json:"default,omitempty"`
	Body      []Statement `json:"body,omitempty"`
}
```

- [ ] **Step 3: Update JSON schema**

In `contracts/schemas/ast.schema.json`, update `$defs.branch.properties` with:

```json
"label": { "type": "string" },
"condition": { "$ref": "#/$defs/expression" },
"default": { "type": "boolean" }
```

Run: `go test ./contracts/ast ./compiler/go/schema`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add contracts/ast/types.go contracts/schemas/ast.schema.json contracts/ast/types_test.go
git commit -m "feat: add conditional branch contract"
```

### Task 2: Execute Canonical If Branches

**Files:**
- Modify: `compiler/go/executor/control_flow.go`
- Test: `compiler/go/executor/control_flow_test.go`

- [ ] **Step 1: Write failing executor test**

Add a test where an `if` statement uses `Branches` with two conditional branches and one default branch. The first false branch must be skipped, the second true branch must run, and the default branch must not run.

Run: `go test ./compiler/go/executor -run TestRunWorkflowIfCanonicalBranches`
Expected: FAIL because executor currently ignores `if.Branches`.

- [ ] **Step 2: Implement branch execution**

In `runStatementBody`, for `case "if"`, delegate to `runIf`. `runIf` should:

```go
if len(stmt.Branches) > 0 {
	for _, branch := range stmt.Branches {
		if branch.Default {
			continue
		}
		value, err := s.evalExpression(branch.Condition)
		if err != nil {
			return err
		}
		if isTruthy(value) {
			return s.runStatements(ctx, branch.Body)
		}
	}
	for _, branch := range stmt.Branches {
		if branch.Default {
			return s.runStatements(ctx, branch.Body)
		}
	}
	return nil
}
```

Then keep existing legacy `condition` / `then` / `else` behavior.

- [ ] **Step 3: Run executor tests**

Run: `go test ./compiler/go/executor`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add compiler/go/executor/control_flow.go compiler/go/executor/control_flow_test.go
git commit -m "feat: execute canonical if branches"
```

### Task 3: Validate Branch Semantics

**Files:**
- Modify: `compiler/go/compiler/validate.go`
- Test: `compiler/go/compiler/validate_test.go`

- [ ] **Step 1: Write failing validation tests**

Add tests for:

- canonical `if` accepts condition branches plus one default branch.
- canonical `if` rejects two default branches.
- canonical `if` rejects a non-default branch missing `condition`.

Run: `go test ./compiler/go/compiler -run IfCanonicalBranch`
Expected: FAIL until validation is implemented.

- [ ] **Step 2: Implement validation**

For `stmt.Kind == "if"` and `len(stmt.Branches) > 0`:

- require at least 2 branches.
- require exactly one default branch.
- require the default branch to be the last branch.
- validate every non-default branch condition expression.
- validate every branch body statement.

- [ ] **Step 3: Run compiler tests**

Run: `go test ./compiler/go/compiler`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add compiler/go/compiler/validate.go compiler/go/compiler/validate_test.go
git commit -m "feat: validate canonical if branches"
```

### Task 4: Project Branches Into UI

**Files:**
- Modify: `compiler/go/transform/project.go`
- Test: `compiler/go/transform/project_test.go`

- [ ] **Step 1: Write failing projection tests**

Add tests asserting:

- legacy `if` projects two UI branches: `条件 1` and `否则`.
- canonical `if` projects all condition branches plus default.
- `parallel` branches preserve branch labels.

Run: `go test ./compiler/go/transform -run BranchProjection`
Expected: FAIL because current projection labels legacy branches as `Then` / `Else` and does not normalize canonical `if.branches`.

- [ ] **Step 2: Implement normalized projection**

Update `projectStatementWithContext`:

- for `if` with `Branches`, project those branches directly.
- for legacy `if`, synthesize UI branches:
  - `ID: stmt.ID + ".then"`, `Label: "条件 1"`, `Kind: "condition"`
  - `ID: stmt.ID + ".else"`, `Label: "否则"`, `Kind: "default"`
- for `parallel`, label branches as `并行 1`, `并行 2`, etc. unless branch label exists.

- [ ] **Step 3: Run transform tests**

Run: `go test ./compiler/go/transform`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add compiler/go/transform/project.go compiler/go/transform/project_test.go
git commit -m "feat: project branch lanes"
```

### Task 5: Branch-Aware Edit Operations

**Files:**
- Modify: `contracts/edit-operation/types.go`
- Modify: `contracts/schemas/edit-operation.schema.json`
- Modify: `compiler/go/transform/edit.go`
- Test: `compiler/go/transform/edit_test.go`
- Modify: `apps/web/src/editOperations.ts`
- Test: `apps/web/src/editOperations.test.ts`

- [ ] **Step 1: Add failing tests for branch add**

Test `insertBranch`:

- `if`: inserts a new condition branch immediately before default.
- `parallel`: appends a new branch.

Run: `go test ./compiler/go/transform -run InsertBranch`
Expected: FAIL.

- [ ] **Step 2: Add operation type**

Add:

```go
OperationTypeInsertBranch = "insertBranch"
```

Allow `"insertBranch"` in `contracts/schemas/edit-operation.schema.json`.

- [ ] **Step 3: Implement `applyInsertBranch`**

Payload shape:

```json
{
  "nodeId": "if_node",
  "branchKind": "condition"
}
```

For `if`, create:

```go
ast.Branch{
	ID: uniqueBranchID(stmt.Branches, "condition"),
	Label: fmt.Sprintf("条件 %d", nextConditionIndex),
	Condition: &ast.Expression{Kind: "literal", Value: true},
	Body: []ast.Statement{},
}
```

Insert it before the default branch.

For `parallel`, create:

```go
ast.Branch{
	ID: uniqueBranchID(stmt.Branches, "branch"),
	Label: fmt.Sprintf("并行 %d", len(stmt.Branches)+1),
	Body: []ast.Statement{},
}
```

Append it.

- [ ] **Step 4: Add branch-local insert anchors**

Extend web `InsertAnchor` with:

```ts
type InsertAnchor = {
  afterNodeId?: string;
  beforeNodeId?: string;
  containerNodeId?: string;
  branchId?: string;
  position?: "branchStart" | "branchEnd" | "between" | "afterJoin";
};
```

Update transform insertion to use `containerNodeId + branchId + position` for branch-local insertion.

- [ ] **Step 5: Run edit tests**

Run:

```bash
go test ./contracts/edit-operation ./compiler/go/transform
pnpm --dir apps/web test editOperations.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add contracts/edit-operation/types.go contracts/schemas/edit-operation.schema.json compiler/go/transform/edit.go compiler/go/transform/edit_test.go apps/web/src/editOperations.ts apps/web/src/editOperations.test.ts
git commit -m "feat: edit branch lanes"
```

### Task 6: Branch-Aware Canvas Layout

**Files:**
- Modify: `apps/web/src/workbenchModel.ts`
- Test: `apps/web/src/workbenchModel.test.ts`

- [ ] **Step 1: Write failing layout tests**

Add tests for:

- `if` layout produces a branch head, two branch lanes, and a join.
- `parallel` layout produces one lane per branch and a join.
- empty branch exposes one insertion anchor.
- non-empty branch exposes branch start and branch end anchors.

Run: `pnpm --dir apps/web test workbenchModel.test.ts`
Expected: FAIL.

- [ ] **Step 2: Add layout item types**

Introduce:

```ts
export type CanvasLayoutNodeRole = "statement" | "branchHeader" | "join" | "emptyBranch";
export type CanvasLayoutNode = {
  node?: WorkbenchNode;
  id: string;
  role: CanvasLayoutNodeRole;
  label?: string;
  branchId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
```

- [ ] **Step 3: Replace linear layout with recursive layout**

Implement layout functions:

- `layoutSequence(statements, x, y)`
- `layoutIf(node, x, y)`
- `layoutParallel(node, x, y)`
- `layoutBranch(branch, x, y)`

Each function returns nodes, edges, insertion anchors, width, height, and continuation point.

- [ ] **Step 4: Run model tests**

Run: `pnpm --dir apps/web test workbenchModel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/workbenchModel.ts apps/web/src/workbenchModel.test.ts
git commit -m "feat: layout branch canvas"
```

### Task 7: Branch Canvas Rendering

**Files:**
- Modify: `apps/web/src/workbench/components/WorkflowCanvas.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/src/workbench/components/WorkflowCanvas.test.tsx`

- [ ] **Step 1: Write failing rendering tests**

Render a model containing an `if` and assert static markup includes:

- `新增条件分支`
- `分支开头插入`
- `分支末尾追加`
- `汇合后继续追加`

Run: `pnpm --dir apps/web test WorkflowCanvas.test.tsx`
Expected: FAIL until rendering is implemented.

- [ ] **Step 2: Render roles**

Update `WorkflowCanvas`:

- `statement`: existing card rendering.
- `branchHeader`: compact branch label card.
- `emptyBranch`: dashed placeholder card.
- `join`: circular join marker.

Render different `+` buttons based on anchor `position`.

- [ ] **Step 3: Add CSS**

Add classes:

- `.canvas-branch-header`
- `.canvas-empty-branch`
- `.canvas-join-node`
- `.edge-insert-button.branch-add`
- `.edge-insert-button.branch-start`
- `.edge-insert-button.branch-end`

- [ ] **Step 4: Run web tests and build**

Run:

```bash
pnpm --dir apps/web test
pnpm --dir apps/web build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/workbench/components/WorkflowCanvas.tsx apps/web/src/workbench/components/WorkflowCanvas.test.tsx apps/web/src/styles.css
git commit -m "feat: render branch canvas"
```

### Task 8: Browser Verification

**Files:**
- No source changes unless verification finds a defect.

- [ ] **Step 1: Start services**

Use the existing running services when available. Otherwise run:

```bash
CGO_ENABLED=0 go run ./apps/cli/rpawf serve examples/fs-workflow/ast.json sdks/block
pnpm --dir apps/web dev
```

- [ ] **Step 2: Verify condition flow**

In the browser:

- open `http://localhost:5173/?workflow=/Volumes/doc/workspace/project/helloworld/rpa-agent-workflow/examples/fs-workflow/ast.json`.
- insert `if`.
- click fan-out `+` to add `条件 2`.
- insert one action in `条件 1`, `条件 2`, and `否则`.
- confirm every branch closes to join.

- [ ] **Step 3: Verify parallel flow**

In the browser:

- insert `parallel`.
- click fan-out `+` to add `并行 3`.
- insert one action at each branch start.
- append one action at one branch end.
- confirm every branch closes to join.

- [ ] **Step 4: Run final verification**

Run:

```bash
go test ./...
pnpm --dir apps/web test
pnpm --dir apps/web build
```

Expected: all pass.

- [ ] **Step 5: Commit verification notes if needed**

If verification needs documentation, add it under `.local/docs/superpowers/e2e/`.

---

## Self-Review

- Spec coverage: branch counts, three `+` meanings, empty branch behavior, joins, stale anchors, and tests are covered.
- Placeholder scan: no unfinished markers are present.
- Type consistency: `Branch.Condition`, `Branch.Default`, `InsertAnchor.position`, and `insertBranch` names are used consistently.
