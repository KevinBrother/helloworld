# AST Edit Chain Design

## Goal

Build the first production-grade edit loop for changing existing AST values from the web editor. The AST remains the single source of truth, the UI node document remains a projection, and edit operations remain the only write intent crossing from the frontend to the Go transformation layer.

## Scope

The first version supports the edit operations that already have backend transformation support:

- `updateField` for editable expression fields exposed in node inspectors.
- `toggleCollapsed` for node UI metadata.

The first version does not include structural editing:

- `insertNode`
- `deleteNode`
- `moveStatement`
- `duplicateNode`
- `replaceSubtree`

Those operations become the second version because they alter tree shape, indexes, selected-node continuity, layout, and edit-path stability.

## Architecture

Add a local Go editor service under the existing CLI command surface. The command is `rpawf serve <ast.json> [block-manifest.json|blocks-dir]`. It loads the AST file, optionally loads block manifests for semantic validation, stores the current AST in memory, and exposes HTTP endpoints for the web editor.

The web editor stops treating `ui-node.json` as editable state. It fetches the current workflow from the service, renders the returned UI projection, emits edit operations from user actions, and replaces local AST/UI state with the server response after every successful edit.

## API

`GET /api/workflow`

Returns the current editor state:

```json
{
  "ast": {},
  "ui": {},
  "diagnostics": []
}
```

`POST /api/edit`

Accepts one edit operation:

```json
{
  "schemaVersion": "1.0.0",
  "operationId": "update-...",
  "type": "updateField",
  "targetNodeId": "calculate",
  "path": "$.body.statements[0].inputs.left",
  "payload": {
    "value": {
      "kind": "literal",
      "value": 1
    }
  }
}
```

Returns the updated editor state and the operation that was applied:

```json
{
  "ast": {},
  "ui": {},
  "diagnostics": [],
  "operation": {}
}
```

If applying or validating the edit fails, the service returns a non-2xx response with diagnostics and leaves the in-memory AST unchanged.

## Server Flow

1. Decode and validate the incoming edit operation.
2. Apply the operation with `transform.ApplyEdit`.
3. Validate the updated AST against `ast.schema.json`.
4. If block manifests are available, run compiler semantic validation.
5. Project the updated AST with `transform.ProjectWorkflow`.
6. Commit the updated AST to memory only after validation succeeds.
7. Return `{ ast, ui, diagnostics, operation }`.

## Frontend Flow

1. Load initial state from `GET /api/workflow`.
2. Select nodes from the returned `UIDocument`.
3. Render inspector fields from `node.inspector`.
4. For readonly fields, render static values.
5. For `control: "expression"`, render an editable expression control.
6. On apply, emit an `updateField` operation using the inspector field path and selected node id.
7. Submit the operation to `POST /api/edit`.
8. Replace local `ast`, `uiDocument`, and diagnostics with the response.
9. Append the operation to the operation log only after the server accepts it.

## Expression Editing

The first expression editor supports pragmatic controls for common expression kinds:

- `literal` string, number, and boolean values.
- `ref` values such as `input.left` and `var.result`.
- Other expression shapes through JSON editing.

The control always submits a full AST expression object in `payload.value`. It never submits a raw primitive for AST expression fields.

## Error Handling

The service returns diagnostics for:

- Invalid edit operation JSON.
- Unsupported operation type.
- Unsafe edit path.
- Target node and path mismatch.
- Invalid AST expression payload.
- AST schema validation failure after applying the edit.
- Compiler semantic validation failure when blocks are available.

The frontend displays diagnostics in the status area and keeps the previous UI state when an edit fails.

## Testing

Backend tests cover:

- Initial workflow projection.
- Successful `updateField`.
- Rejected invalid edit payload.
- In-memory AST rollback after failed edit.

Frontend verification covers:

- TypeScript build.
- Editing an expression field emits an AST expression payload.
- Successful server response replaces the projected UI.

## Later Versions

Version 2 adds structural editing operations and the UI affordances required to pick insertion targets, branches, and move destinations.

Version 3 adds editor-grade workflow features: undo/redo, AST file persistence, block manifest driven forms, richer expression builders, and execution/debug integration.
