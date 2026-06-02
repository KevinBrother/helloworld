# Visual Editor Contract Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the first visual editing closed loop: `ast.json -> ui-node.json -> React structured editor`, with edit operations defined as a separate contract.

**Architecture:** Keep AST semantics in `contracts/ast` and compiler validation. Add `contracts/ui-node` and `contracts/edit-operation` for the UI layer, implement projection/application under `compiler/go/transform`, and scaffold `apps/web` as a React app that renders only `ui-node.json` and emits edit operations.

**Tech Stack:** Go 1.22, JSON Schema, React, TypeScript, Vite, pnpm.

---

### Task 1: Add UI Contracts

**Files:**
- Create: `contracts/ui-node/doc.go`
- Create: `contracts/ui-node/types.go`
- Create: `contracts/ui-node/types_test.go`
- Create: `contracts/edit-operation/doc.go`
- Create: `contracts/edit-operation/types.go`
- Create: `contracts/edit-operation/types_test.go`
- Create: `contracts/schemas/ui-node.schema.json`
- Create: `contracts/schemas/edit-operation.schema.json`

- [ ] **Step 1: Write failing tests**

Run: `go test ./contracts/... -v`

Expected: FAIL until the new packages and types exist.

- [ ] **Step 2: Implement contracts**

Define `ui-node` structs for document, node, branch, port, layout, operation, inspector, validation summary, and metadata.

Define `edit-operation` structs for operation document, target, payload, actor, and supported operation type constants.

- [ ] **Step 3: Verify**

Run: `go test ./contracts/... -v`

Expected: PASS.

### Task 2: Add AST-to-UI Projection

**Files:**
- Create: `compiler/go/transform/doc.go`
- Create: `compiler/go/transform/project.go`
- Create: `compiler/go/transform/project_test.go`

- [ ] **Step 1: Write failing test**

Test that `examples/sample-workflow/ast.json` projects to a UI document containing nodes for `sequence`, `callBlock`, `if`, `loop`, `parallel`, `try`, and `return`.

Run: `go test ./compiler/go/transform -v`

Expected: FAIL until projection exists.

- [ ] **Step 2: Implement projection**

Implement `ProjectWorkflow(workflow ast.Workflow) uinode.Document`.

Projection rules:
- root maps to one UI root node;
- statement `id` becomes UI node `id`;
- AST path is preserved in `path`;
- sequence children map to `children`;
- `if`, `parallel`, and `try` sections map to named branches;
- layout direction defaults to top-to-bottom;
- allowed operations are derived from node kind.

- [ ] **Step 3: Verify**

Run: `go test ./compiler/go/transform -v`

Expected: PASS.

### Task 3: Add Edit Operation Application Skeleton

**Files:**
- Create: `compiler/go/transform/edit.go`
- Create: `compiler/go/transform/edit_test.go`

- [ ] **Step 1: Write failing tests**

Cover `toggleCollapsed`, `updateField`, and unsupported operation diagnostics.

Run: `go test ./compiler/go/transform -v`

Expected: FAIL until edit application exists.

- [ ] **Step 2: Implement skeleton**

Implement `ApplyEdit(workflow ast.Workflow, op editoperation.Operation) (ast.Workflow, []diagnostic.Diagnostic)`.

Initial supported behavior:
- `toggleCollapsed` updates AST metadata under `metadata.ui.collapsed`;
- `updateField` supports safe metadata updates only;
- unsupported operations return `UNSUPPORTED_EDIT_OPERATION`.

- [ ] **Step 3: Verify**

Run: `go test ./compiler/go/transform -v`

Expected: PASS.

### Task 4: Generate Sample UI Projection

**Files:**
- Create: `examples/sample-workflow/ui-node.json`
- Modify: `examples/sample-workflow/tests/test_sample.sh`

- [ ] **Step 1: Write failing check**

Add a shell check that runs a Go projection command or test fixture and asserts `ui-node.json` exists.

- [ ] **Step 2: Implement sample projection artifact**

Generate or write a representative `ui-node.json` for the sample workflow.

- [ ] **Step 3: Verify**

Run: `bash examples/sample-workflow/tests/test_sample.sh`

Expected: PASS.

### Task 5: Scaffold React Editor

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/types.ts`
- Create: `apps/web/src/styles.css`

- [ ] **Step 1: Write failing frontend checks**

Run: `pnpm --dir apps/web build`

Expected: FAIL until the app exists.

- [ ] **Step 2: Implement app shell**

Build a three-panel structured editor:
- left outline;
- center top-down workflow projection;
- right inspector.

The app consumes `ui-node.json` shape only and emits edit operation objects in local state.

- [ ] **Step 3: Verify**

Run: `pnpm install`

Run: `pnpm --dir apps/web build`

Expected: PASS.

### Task 6: Full Verification

**Files:**
- Modify: `docs/TODO.md`

- [ ] **Step 1: Verify backend**

Run: `go test ./apps/cli/rpawf ./compiler/go/... ./contracts/... -v`

Expected: PASS.

- [ ] **Step 2: Verify runtime**

Run: `uv --project runtimes/python run python -m unittest discover -s runtimes/python/tests -p 'test_*.py' -v`

Expected: PASS.

- [ ] **Step 3: Verify sample**

Run: `bash examples/sample-workflow/tests/test_sample.sh`

Expected: PASS.

- [ ] **Step 4: Verify frontend**

Run: `pnpm --dir apps/web build`

Expected: PASS.
