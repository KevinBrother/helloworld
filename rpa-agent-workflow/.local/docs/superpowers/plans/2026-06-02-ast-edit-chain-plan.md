# AST Edit Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Go editor service and update the React editor so existing AST expression values can be edited through the full `AST -> UI -> edit operation -> ApplyEdit -> AST -> UI` loop.

**Architecture:** The Go service owns the current AST, persists accepted edits to the AST file passed to `rpawf serve`, and exposes `GET /api/workflow` plus `POST /api/edit`. The web app renders server-projected UI state, emits existing edit-operation contracts, and replaces local state with server responses after saved edits.

**Tech Stack:** Go `net/http`, existing `compiler/go/schema`, `compiler/go/compiler`, `compiler/go/transform`, React 19, Vite, TypeScript, `@xyflow/react`.

---

## File Structure

- Create `apps/cli/rpawf/serve.go` for the HTTP editor service and command entry point helper.
- Create `apps/cli/rpawf/serve_test.go` for service tests.
- Modify `apps/cli/rpawf/main.go` to route `rpawf serve`.
- Modify `apps/web/src/types.ts` to add editor API response and diagnostic types.
- Modify `apps/web/src/App.tsx` to load server state, submit edit operations, and render editable expression fields.

## Task 1: Go Editor Service

**Files:**
- Create: `apps/cli/rpawf/serve.go`
- Create: `apps/cli/rpawf/serve_test.go`
- Modify: `apps/cli/rpawf/main.go`

- [ ] **Step 1: Write failing tests for workflow load and edit apply**

Create `apps/cli/rpawf/serve_test.go` with tests that instantiate an editor server from an in-memory workflow, call `GET /api/workflow`, call `POST /api/edit` with an `updateField`, and verify the returned AST/UI reflect the new expression.

- [ ] **Step 2: Run tests to verify they fail**

Run: `go test ./apps/cli/rpawf -run 'TestEditorServer'`

Expected: fail because the editor server functions do not exist.

- [ ] **Step 3: Implement the editor server**

Create `apps/cli/rpawf/serve.go` with:

- `editorStateResponse`
- `editorServer`
- `newEditorServer`
- `newEditorServerWithPath`
- `handleWorkflow`
- `handleEdit`
- `persistWorkflow`
- `respondJSON`
- `respondDiagnostics`
- `runServeCommand`

The server must apply edits to a copy, validate, and only then replace the in-memory workflow.

- [ ] **Step 4: Wire CLI command**

Modify `apps/cli/rpawf/main.go` to handle `serve`:

```go
case "serve":
    if len(args) > 1 && args[1] == "--help" {
        printUsage()
        return
    }
    code := runServeCommand(args[1:], os.Stdout, os.Stderr)
    if code != 0 {
        os.Exit(code)
    }
```

- [ ] **Step 5: Run service tests**

Run: `go test ./apps/cli/rpawf -run 'TestEditorServer'`

Expected: pass.

## Task 2: Frontend API State

**Files:**
- Modify: `apps/web/src/types.ts`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add TypeScript types**

Add:

```ts
export type Diagnostic = {
  code?: string;
  severity?: string;
  message?: string;
  path?: string;
};

export type EditorStateResponse = {
  ast: unknown;
  ui: UIDocument;
  diagnostics?: Diagnostic[];
  operation?: EditOperation;
};
```

- [ ] **Step 2: Update app state**

Add React state for:

- `astDocument`
- `diagnostics`
- `serverAvailable`

Load from `GET /api/workflow` in `useEffect`. If the server is unavailable, keep the existing sample fallback and set a clear status.

- [ ] **Step 3: Add edit submission helper**

Add `submitOperation(operation: EditOperation)` that posts JSON to `/api/edit`, handles non-2xx diagnostics, replaces `uiDocument` with `response.ui`, updates `astDocument`, and appends to the operation log only on success.

- [ ] **Step 4: Run web build**

Run: `pnpm build:web`

Expected: pass.

## Task 3: Editable Expression Inspector

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Refactor inspector field rows**

Change `InspectorFieldRow` so it accepts:

```ts
onApplyExpression: (field: InspectorField, value: unknown) => void;
```

Readonly fields continue rendering static values.

- [ ] **Step 2: Add expression editor**

Add an `ExpressionEditor` component that supports:

- `literal` string, number, boolean.
- `ref` string.
- raw JSON textarea for other expression kinds.

It must submit a complete expression object.

- [ ] **Step 3: Submit updateField operations**

From an editable expression field, create:

```ts
{
  schemaVersion: "1.0.0",
  operationId: makeOperationId("update"),
  type: "updateField",
  targetNodeId: node.id,
  path: field.path,
  payload: { value: expression },
  actor: DEFAULT_ACTOR,
}
```

Then call `submitOperation`.

- [ ] **Step 4: Run web build**

Run: `pnpm build:web`

Expected: pass.

## Task 4: End-to-End Verification

**Files:**
- Modify if needed: `README.md`

- [ ] **Step 1: Run Go tests**

Run: `go test ./...`

Expected: pass.

- [ ] **Step 2: Run web build**

Run: `pnpm build:web`

Expected: pass.

- [ ] **Step 3: Commit**

Run:

```sh
git add .local/docs/superpowers/specs/2026-06-02-ast-edit-chain-design.md .local/docs/superpowers/plans/2026-06-02-ast-edit-chain-plan.md apps/cli/rpawf apps/web/src
git commit -m "feat: connect ast edit chain"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: The plan covers server-owned AST state, workflow fetch, edit submission, expression editing, diagnostics, validation, and verification.
- Placeholder scan: No implementation task relies on a placeholder requirement; each task names files, commands, and expected outcomes.
- Type consistency: The plan consistently uses `EditOperation`, `UIDocument`, `Diagnostic`, and `EditorStateResponse`.
