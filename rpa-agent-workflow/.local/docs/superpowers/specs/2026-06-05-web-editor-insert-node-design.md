# Web Editor Insert and Delete Node Design

## Goal

Implement the Web editor flow-building closed loop for adding and deleting nodes from the canvas. The user hovers a connection line between two existing nodes, clicks the visible `+`, opens a create-node modal, chooses a node type, and the server persists the corresponding AST change through an `insertNode` edit operation. The user can also select an existing editable node and delete it through an explicit UI action backed by a `deleteNode` edit operation.

This is the first real flow-construction capability. It must stay contract-first: UI action -> edit operation -> AST update -> UI projection refresh.

## Explicit Non-Goal

Drag and drop is not part of this feature and will not be introduced later. The editor uses explicit insertion controls on canvas connections instead of drag-based block placement.

This feature does not implement `moveStatement`, `duplicateNode`, or `replaceSubtree`. Those remain separate operations.

## User Interaction

### Insert

Canvas connections expose insertion points:

- A connection line between two nodes shows a `+` control on hover and keyboard focus.
- Clicking the `+` opens a create-node modal.
- The modal offers three top-level node kinds: action, condition, parallel.
- `action` shows the current server block catalog as selectable block rows. Selecting a block creates a `callBlock` statement.
- `condition` creates an `if` statement with a configurable branch count. The first implementation supports the default value of 2 branches.
- `parallel` creates a `parallel` statement with a configurable branch count. The first implementation supports the default value of 2 branches.
- Confirm submits the insertion. Cancel closes the modal without changing local or server state.

The modal follows the existing workbench visual language: dense, operational, Chinese UI copy, visible focus state, and no marketing-style explanation text.

### Delete

Editable canvas nodes expose a delete action:

- Selecting a node shows a delete control in the parameter panel header or node action area.
- The root sequence/start node cannot be deleted.
- A `return` node cannot be deleted in this first implementation because it defines workflow output shape.
- Deleting a `callBlock`, `assign`, `if`, `parallel`, `loop`, `try`, or `callWorkflow` node removes that statement from its parent statement list.
- Deleting a control-flow node deletes its nested children with it. This is intentional and must be confirmed.
- The UI shows a confirmation dialog with the node label and the effect. Confirm submits `deleteNode`; cancel leaves the AST unchanged.

Deletion is explicit and local to the selected node. There is no drag-to-remove behavior.

## Insert Position Model

The frontend does not send raw AST array indexes as the primary contract. It sends an insertion anchor derived from the canvas edge:

- `afterNodeId`: source node of the connection.
- `beforeNodeId`: target node of the connection.
- `containerNodeId`: nearest sequence-like parent when known.
- `branchId`: branch lane identifier when inserting inside an `if` or `parallel` branch.

The server resolves the anchor against the current AST and inserts exactly between `afterNodeId` and `beforeNodeId`. If the edge is stale or ambiguous, the server rejects the operation with diagnostics.

This keeps AST mutation authoritative on the backend and avoids trusting frontend-derived indexes after concurrent or failed edits.

## Edit Operation

Use the existing `insertNode` and `deleteNode` operation types.

### Insert Payload

Payload shape:

```json
{
  "anchor": {
    "afterNodeId": "node_a",
    "beforeNodeId": "node_b",
    "containerNodeId": "root",
    "branchId": "then"
  },
  "node": {
    "kind": "callBlock",
    "block": "math.calculate"
  }
}
```

For condition:

```json
{
  "anchor": {},
  "node": {
    "kind": "if",
    "branchCount": 2
  }
}
```

For parallel:

```json
{
  "anchor": {},
  "node": {
    "kind": "parallel",
    "branchCount": 2
  }
}
```

The operation still carries `schemaVersion`, `operationId`, `type`, and `actor` like existing updates.

### Delete Payload

Delete payload shape:

```json
{
  "nodeId": "calculate_large"
}
```

`targetNodeId` must match `payload.nodeId` when both are present. The server rejects mismatches.

## AST Generation

The server creates minimal valid statements:

- `callBlock`: `id`, `kind`, `block`, and `inputs` initialized from required block inputs with literal empty/default values when safe.
- `if`: `id`, `kind`, default boolean condition expression, empty `then` and `else` branches for 2 branches.
- `parallel`: `id`, `kind`, `branches` with generated branch ids and empty branch bodies.

Generated IDs must be stable enough for tests and unique within the workflow. The implementation can use deterministic slug prefixes plus collision suffixes.

Any inserted statement must pass schema and compiler validation before persistence. Invalid insertion returns diagnostics and leaves the AST unchanged.

## AST Deletion

The server deletes statements by ID from the canonical AST:

- Find the target statement and its owning statement list.
- Reject deletion of the root body statement.
- Reject deletion of protected workflow shape nodes, starting with `return`.
- Remove the statement from its owning list.
- Preserve sibling order.
- Validate the resulting AST before persistence.

If the target statement owns nested statements, deleting the parent removes the subtree. This keeps deletion semantics predictable and avoids partially detached branches.

## Frontend Components

Required changes:

- `WorkflowCanvas`: render hover/focus insertion controls for layout edges and report the selected edge.
- New create-node modal component: owns selected node kind, branch count, block search, and confirm/cancel state.
- Node delete control: exposes delete for editable selected nodes and blocks protected nodes.
- Delete confirmation modal: shows node label and subtree warning for control-flow nodes.
- `App`: stores pending insert edge, opens modal, builds `insertNode` and `deleteNode` edit operations, posts to `/api/edit`, applies returned server state.
- `workbenchModel`: expose enough edge metadata for insert anchors.
- `workbenchModel`: mark protected nodes and nodes with nested descendants for delete messaging.

The left-side node library remains the source of block catalog display data. The modal may reuse the same catalog-derived model instead of creating a second block parsing path.

## Backend Components

Required changes:

- `validateEditOperation`: accept and validate `insertNode` and `deleteNode` payloads.
- `transform.ApplyEdit`: route `insertNode` and `deleteNode`.
- New transform helper: resolve insert anchor and insert statement into the correct statement list.
- New transform helper: find a statement owner list and delete a statement by ID.
- New statement factory helpers: build `callBlock`, `if`, and `parallel` statements from payload and block catalog where needed.
- `serve` tests: verify `/api/edit` persists inserted and deleted nodes and returns refreshed UI.

The transform package must keep AST mutation isolated. HTTP handlers validate request shape and persistence; transform owns AST semantics.

## Error Handling

Reject with diagnostics when:

- `insertNode` payload is missing `anchor` or `node`.
- `deleteNode` payload is missing `nodeId`.
- Requested block id is not in the block catalog.
- Anchor nodes cannot be found.
- Anchor nodes are not adjacent in the resolved container.
- Delete target cannot be found.
- Delete target is root or protected.
- Requested node kind is unsupported.
- Generated AST fails schema or semantic validation.

The frontend shows the diagnostic status through the existing save/status path and keeps the modal open only when the user can correct the input locally. Stale anchors or stale delete targets close the modal after reporting the error because the canvas state must be refreshed.

## Testing

Use test-first implementation.

Backend tests:

- `transform.ApplyEdit` inserts a `callBlock` between two sequence children.
- `transform.ApplyEdit` inserts an `if` between two sequence children.
- `transform.ApplyEdit` rejects stale or non-adjacent anchors.
- `transform.ApplyEdit` deletes a normal statement from a sequence.
- `transform.ApplyEdit` deletes a control-flow subtree from its parent list.
- `transform.ApplyEdit` rejects deleting root and protected `return`.
- `/api/edit` accepts `insertNode`, persists AST, and returns projected UI.
- `/api/edit` accepts `deleteNode`, persists AST, and returns projected UI.

Frontend tests:

- workbench model exposes edge insertion anchors.
- workbench model marks root/return as not deletable.
- create-node operation payload for action uses selected block id.
- create-node operation payload for condition and parallel uses branch count.
- delete-node operation payload uses selected node id and requires confirmation.

Manual verification:

- Start `rpawf serve examples/calculator/ast.json sdks/block`.
- Start `pnpm --dir apps/web dev`.
- Hover an edge, click `+`, insert an action block, confirm AST is persisted and canvas refreshes.
- Insert condition and parallel nodes from the modal.
- Select an inserted node, delete it, confirm AST is persisted and canvas refreshes.
- Select root or return, confirm delete action is unavailable.

## Scope Boundary

This design intentionally delivers two production-grade paths: explicit line insertion and explicit selected-node deletion. It does not introduce draggable blocks, canvas free placement, arbitrary DAG edges, node movement, or node duplication.
