# Web Editor Node Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement explicit canvas node insertion and selected-node deletion in the Web editor through `insertNode` and `deleteNode` edit operations.

**Architecture:** Keep AST mutation authoritative in `compiler/go/transform`, expose it through the existing `/api/edit` endpoint, and refresh the UI from server projection after every accepted edit. The frontend adds line-based insertion controls, create/delete modals, and operation builders without introducing drag and drop.

**Tech Stack:** Go transform/API tests, TypeScript React/Vite/Vitest frontend tests, existing JSON contracts.

---

## File Structure

- Modify `compiler/go/transform/edit_test.go`: failing and passing unit tests for `insertNode` and `deleteNode`.
- Modify `compiler/go/transform/edit.go`: route and implement `insertNode` and `deleteNode`.
- Modify `apps/cli/rpawf/serve_test.go`: API tests for accepted insert/delete edits.
- Modify `apps/cli/rpawf/serve.go`: validate `insertNode` and `deleteNode` request shape.
- Modify `apps/web/src/workbenchModel.test.ts`: tests for insertion anchors and delete metadata.
- Modify `apps/web/src/workbenchModel.ts`: expose edge anchors and delete metadata.
- Create `apps/web/src/editOperations.ts`: small frontend operation builders for insert/delete payloads.
- Create `apps/web/src/editOperations.test.ts`: operation builder tests.
- Modify `apps/web/src/workbench/components/WorkflowCanvas.tsx`: render hover/focus `+` controls on edges.
- Modify `apps/web/src/workbench/components/ParameterPanel.tsx`: show explicit delete action for deletable selected nodes.
- Create `apps/web/src/workbench/components/CreateNodeModal.tsx`: create-node modal.
- Create `apps/web/src/workbench/components/DeleteNodeModal.tsx`: delete confirmation modal.
- Modify `apps/web/src/App.tsx`: wire modal state and `/api/edit` calls.
- Modify `apps/web/src/styles.css`: style insertion controls and modals.
- Modify `docs/TODO.md`: mark Web editor flow-building closed loop done after verification.

## Task 1: Backend `insertNode`

**Files:**
- Modify: `compiler/go/transform/edit_test.go`
- Modify: `compiler/go/transform/edit.go`

- [ ] **Step 1: Write failing transform tests**

Add tests to `compiler/go/transform/edit_test.go`:

```go
func TestApplyInsertNodeAddsCallBlockBetweenAdjacentSequenceChildren(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{ID: "first", Kind: "assign", Target: "var.first", Value: &ast.Expression{Kind: "literal", Value: float64(1)}},
		{ID: "return_result", Kind: "return", Returns: map[string]ast.Expression{"result": {Kind: "ref", Ref: "var.first"}}},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"afterNodeId": "first", "beforeNodeId": "return_result"},
			"node":   map[string]any{"kind": "callBlock", "block": "core.log"},
		},
	})

	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	if got := []string{updated.Body.Statements[0].ID, updated.Body.Statements[1].Kind, updated.Body.Statements[2].ID}; got[0] != "first" || got[1] != "callBlock" || got[2] != "return_result" {
		t.Fatalf("statement order = %#v", got)
	}
	if updated.Body.Statements[1].Block != "core.log" {
		t.Fatalf("inserted block = %q, want core.log", updated.Body.Statements[1].Block)
	}
}

func TestApplyInsertNodeRejectsNonAdjacentAnchor(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{ID: "first", Kind: "assign"},
		{ID: "middle", Kind: "assign"},
		{ID: "return_result", Kind: "return"},
	}}}

	_, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"afterNodeId": "first", "beforeNodeId": "return_result"},
			"node":   map[string]any{"kind": "if", "branchCount": float64(2)},
		},
	})
	if len(diags) == 0 || diags[0].Code != "INSERT_ANCHOR_NOT_ADJACENT" {
		t.Fatalf("diagnostics = %#v, want INSERT_ANCHOR_NOT_ADJACENT", diags)
	}
}
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
go test ./compiler/go/transform -run 'TestApplyInsertNode' -count=1
```

Expected: FAIL because `insertNode` currently returns `UNSUPPORTED_EDIT_OPERATION`.

- [ ] **Step 3: Implement minimal insert support**

In `compiler/go/transform/edit.go`:

- Add `case editoperation.OperationTypeInsertNode`.
- Decode payload maps with helpers.
- Resolve an adjacent pair inside `Body.Statements`, `Then`, `Else`, `Finally`, branch bodies, and catch bodies.
- Build minimal statements:
  - `callBlock`: `ID: uniqueStatementID(workflow, blockIDSlug(block))`, `Kind: "callBlock"`, `Block: block`.
  - `if`: generated id, `Kind: "if"`, `Condition: literal true`, empty `Then` and `Else`.
  - `parallel`: generated id, `Kind: "parallel"`, two branch bodies.
- Insert at `afterIndex + 1`.

Use these diagnostic codes:

- `INVALID_INSERT_PAYLOAD`
- `UNSUPPORTED_INSERT_NODE_KIND`
- `INSERT_ANCHOR_NOT_FOUND`
- `INSERT_ANCHOR_NOT_ADJACENT`

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```bash
go test ./compiler/go/transform -run 'TestApplyInsertNode' -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add compiler/go/transform/edit.go compiler/go/transform/edit_test.go
git commit -m "feat: support insert node edits"
```

## Task 2: Backend `deleteNode`

**Files:**
- Modify: `compiler/go/transform/edit_test.go`
- Modify: `compiler/go/transform/edit.go`

- [ ] **Step 1: Write failing transform tests**

Add tests:

```go
func TestApplyDeleteNodeRemovesSequenceChild(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{ID: "first", Kind: "assign"},
		{ID: "remove_me", Kind: "callBlock", Block: "core.log"},
		{ID: "return_result", Kind: "return"},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeDeleteNode,
		TargetNodeID: "remove_me",
		Payload:      map[string]any{"nodeId": "remove_me"},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	if got := []string{updated.Body.Statements[0].ID, updated.Body.Statements[1].ID}; got[0] != "first" || got[1] != "return_result" {
		t.Fatalf("remaining statements = %#v", got)
	}
}

func TestApplyDeleteNodeRejectsProtectedReturn(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{{ID: "return_result", Kind: "return"}}}}
	_, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeDeleteNode,
		TargetNodeID: "return_result",
		Payload:      map[string]any{"nodeId": "return_result"},
	})
	if len(diags) == 0 || diags[0].Code != "DELETE_NODE_PROTECTED" {
		t.Fatalf("diagnostics = %#v, want DELETE_NODE_PROTECTED", diags)
	}
}
```

- [ ] **Step 2: Run tests and verify RED**

```bash
go test ./compiler/go/transform -run 'TestApplyDeleteNode' -count=1
```

Expected: FAIL because `deleteNode` is unsupported.

- [ ] **Step 3: Implement minimal delete support**

In `compiler/go/transform/edit.go`:

- Add `case editoperation.OperationTypeDeleteNode`.
- Decode `payload.nodeId`.
- Reject empty node id with `INVALID_DELETE_PAYLOAD`.
- Reject `targetNodeId` mismatch with `DELETE_TARGET_MISMATCH`.
- Reject deleting `workflow.Body.ID` with `DELETE_NODE_PROTECTED`.
- Reject deleting any statement with `Kind == "return"` with `DELETE_NODE_PROTECTED`.
- Walk all owner statement lists and remove the matching statement from its direct owner.
- Return `DELETE_NODE_NOT_FOUND` when no matching statement exists.

- [ ] **Step 4: Run tests and verify GREEN**

```bash
go test ./compiler/go/transform -run 'TestApplyDeleteNode' -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add compiler/go/transform/edit.go compiler/go/transform/edit_test.go
git commit -m "feat: support delete node edits"
```

## Task 3: API Validation

**Files:**
- Modify: `apps/cli/rpawf/serve_test.go`
- Modify: `apps/cli/rpawf/serve.go`

- [ ] **Step 1: Write failing API tests**

Add tests that post `insertNode` and `deleteNode` to `/api/edit`, assert HTTP 200, assert returned AST order, and for a temp `ast.json` assert persistence.

- [ ] **Step 2: Run tests and verify RED**

```bash
go test ./apps/cli/rpawf -run 'TestEditorServer.*Node' -count=1
```

Expected: FAIL because `validateEditOperation` rejects `insertNode` and `deleteNode`.

- [ ] **Step 3: Implement validation**

In `validateEditOperation`:

- Accept `insertNode` when `Payload` has `anchor` and `node`.
- Accept `deleteNode` when `Payload` has `nodeId`.
- Preserve existing diagnostics style and `UNSUPPORTED_EDIT_OPERATION` for unsupported types.

- [ ] **Step 4: Run tests and verify GREEN**

```bash
go test ./apps/cli/rpawf -run 'TestEditorServer.*Node' -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/cli/rpawf/serve.go apps/cli/rpawf/serve_test.go
git commit -m "feat: expose node edit operations"
```

## Task 4: Frontend Model and Operation Builders

**Files:**
- Modify: `apps/web/src/workbenchModel.test.ts`
- Modify: `apps/web/src/workbenchModel.ts`
- Create: `apps/web/src/editOperations.ts`
- Create: `apps/web/src/editOperations.test.ts`

- [ ] **Step 1: Write failing frontend tests**

Add tests:

- `buildCanvasLayout(model).edges[0].anchor` contains `afterNodeId` and `beforeNodeId`.
- root and return nodes are not deletable.
- `buildInsertNodeOperation(edge, { kind: "callBlock", block: "core.log" })` emits `insertNode`.
- `buildDeleteNodeOperation(node)` emits `deleteNode`.

- [ ] **Step 2: Run tests and verify RED**

```bash
pnpm --dir apps/web test -- --run src/workbenchModel.test.ts src/editOperations.test.ts
```

Expected: FAIL because anchors/delete metadata/builders do not exist.

- [ ] **Step 3: Implement model metadata and builders**

Implement:

```ts
export type InsertAnchor = {
  afterNodeId: string;
  beforeNodeId: string;
  containerNodeId?: string;
  branchId?: string;
};
```

Add `anchor: InsertAnchor` to `CanvasLayoutEdge`.

Add to `WorkbenchNode`:

```ts
deletable: boolean;
deleteMessage: string;
hasNestedChildren: boolean;
```

Create operation builder functions in `editOperations.ts`.

- [ ] **Step 4: Run tests and verify GREEN**

```bash
pnpm --dir apps/web test -- --run src/workbenchModel.test.ts src/editOperations.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/workbenchModel.ts apps/web/src/workbenchModel.test.ts apps/web/src/editOperations.ts apps/web/src/editOperations.test.ts
git commit -m "feat(web): model node edit operations"
```

## Task 5: Frontend UI

**Files:**
- Modify: `apps/web/src/workbench/components/WorkflowCanvas.tsx`
- Modify: `apps/web/src/workbench/components/ParameterPanel.tsx`
- Create: `apps/web/src/workbench/components/CreateNodeModal.tsx`
- Create: `apps/web/src/workbench/components/DeleteNodeModal.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Implement edge insertion control**

`WorkflowCanvas` receives `onInsertAtEdge(anchor)` and renders an accessible `+` button at each edge midpoint. The button is visible on edge hover/focus and calls `onInsertAtEdge(edge.anchor)`.

- [ ] **Step 2: Implement create modal**

`CreateNodeModal` renders Chinese UI copy:

- title `新建节点`
- node type buttons `动作`、`条件`、`并行`
- action block search/list from `model.blockOptions`
- branch count number input for condition/parallel, default 2
- `取消` and `确认`

- [ ] **Step 3: Implement delete control and modal**

`ParameterPanel` receives `onDeleteNode`. It renders `删除节点` only when `node.deletable` is true. `DeleteNodeModal` confirms with node label and subtree warning when `node.hasNestedChildren` is true.

- [ ] **Step 4: Wire App**

`App` stores:

- `pendingInsertAnchor`
- `createModalOpen`
- `deleteModalNode`

It posts operation builder output to `/api/edit`, applies server state, and updates status.

- [ ] **Step 5: Run frontend checks**

```bash
pnpm --dir apps/web test -- --run
pnpm build:web
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/styles.css apps/web/src/workbench/components/WorkflowCanvas.tsx apps/web/src/workbench/components/ParameterPanel.tsx apps/web/src/workbench/components/CreateNodeModal.tsx apps/web/src/workbench/components/DeleteNodeModal.tsx
git commit -m "feat(web): add canvas node editing UI"
```

## Task 6: End-to-End Verification and TODO

**Files:**
- Modify: `docs/TODO.md`

- [ ] **Step 1: Run full automated checks**

```bash
go test ./...
pnpm --dir apps/web test -- --run
pnpm build:web
```

Expected: all pass.

- [ ] **Step 2: Manual browser verification**

Run:

```bash
CGO_ENABLED=0 go run ./apps/cli/rpawf serve examples/calculator/ast.json sdks/block
pnpm --dir apps/web dev
```

Open the Vite URL. Verify:

- hover an edge shows `+`;
- insert action block from real catalog;
- insert condition;
- insert parallel;
- delete inserted normal node;
- root and return nodes cannot be deleted.

- [ ] **Step 3: Update TODO**

In `docs/TODO.md`, change Web editor flow-building closed loop from unchecked to checked only after automated and manual verification pass.

- [ ] **Step 4: Commit**

```bash
git add docs/TODO.md
git commit -m "docs: mark web editor node editing done"
```

## Self-Review

- Spec coverage: insert, delete, no drag, API persistence, frontend modal, validation, and tests are covered.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: `InsertAnchor`, `insertNode`, `deleteNode`, `targetNodeId`, and payload field names match the design.
