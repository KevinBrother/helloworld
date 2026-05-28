# Visual Editor Contract Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a structured workflow editor that renders `ui-node.json`, applies `edit-operation.json`, and round-trips changes back to `ast.json` through a conversion layer.

**Architecture:** The editor never edits AST directly. `ast.json` is the semantic source of truth, `ui-node.json` is the UI projection, and `edit-operation.json` is the command format for user edits. The React app renders the projection, emits edit operations, and receives a refreshed projection after each successful transform.

**Tech Stack:** React, TypeScript, pnpm, Go for AST-to-UI and edit-operation-to-AST transforms, JSON Schema for contracts.

---

## Decision

The UI is a structured editor, not a freeform workflow canvas. It renders top-down by default, auto-generates connections from AST structure, and does not allow manual edge editing.

This is intentional:

- the workflow model is structured IR, not arbitrary DAG;
- the editor must remain stable as AST evolves;
- compiler validation stays in one place;
- UI logic stays focused on interaction and display, not workflow semantics.

## Goals

- Define `ui-node.json` as the UI projection of AST, not a copy of AST.
- Define `edit-operation.json` as the command protocol for user edits.
- Render structured workflows in React with automatic layout and implicit connections.
- Support insert, delete, update, duplicate, move, and collapse operations.
- Keep the React editor decoupled from AST internals.
- Preserve an AST round-trip path through a Go transform layer.

## Non-Goals

- Manual node-to-node edge creation.
- Freeform DAG editing.
- Direct AST mutation inside React.
- Agent generation.
- DAP integration.
- Execution semantics inside the editor.

## Data Flow

The canonical flow is:

1. `ast.json` is loaded.
2. Go transform generates `ui-node.json`.
3. React renders `ui-node.json`.
4. User performs an edit.
5. React emits `edit-operation.json`.
6. Go transform applies the operation to AST.
7. New `ast.json` is validated.
8. New `ui-node.json` is projected and returned.

UI is therefore a projection consumer and edit-operation producer.

## ui-node.json

`ui-node.json` is the rendering contract for the editor.

It contains:

- `id`: stable UI node id.
- `kind`: UI kind, usually aligned with AST statement kind.
- `label`: display label.
- `path`: source AST path.
- `children`: nested child nodes for sequence-like structures.
- `branches`: named branches for `if`, `parallel`, and `try`.
- `ports`: visible input/output ports.
- `layout`: computed or suggested layout hints.
- `collapsed`: current fold state.
- `editable`: whether node properties can be edited.
- `operations`: allowed operations for the node.
- `inspector`: field definitions for the right-side panel.
- `validationSummary`: concise diagnostics visible to the user.
- `metadata`: opaque UI metadata.

This file is not a source-of-truth AST. It is a UI projection with enough structure to drive interaction.

## edit-operation.json

`edit-operation.json` is the command protocol for changes initiated by the user.

It represents intent, not final structure.

Supported operations:

- `insertNode`
- `deleteNode`
- `updateField`
- `moveStatement`
- `duplicateNode`
- `toggleCollapsed`
- `replaceSubtree`

Common fields:

- `operationId`
- `type`
- `targetNodeId`
- `path`
- `payload`
- `timestamp`
- `actor`

The transform layer applies operations to AST, validates the result, and regenerates `ui-node.json`.

## Layout Rules

Layout is deterministic and structural:

- main sequence flows top to bottom;
- `if` uses then/else columns;
- `parallel` uses lanes;
- `loop` is a container with a nested body;
- `try` uses try/catch/finally sections;
- leaf nodes render as cards or rows;
- no manual edge routing;
- no arbitrary graph topology.

Layout hints belong in `ui-node.json`, not in AST.

## React Editor

The React app reads `ui-node.json` and renders:

- left outline tree;
- center auto-layout workflow view;
- right inspector panel.

The editor may:

- select nodes;
- create nodes through structured commands;
- delete nodes;
- edit fields;
- fold/unfold containers;
- duplicate nodes;
- re-order within sequences.

The editor may not:

- draw custom edges;
- connect nodes arbitrarily;
- bypass transform validation;
- write AST directly.

## Go Transform Layer

The transform layer is responsible for:

- projecting AST to UI nodes;
- applying edit operations to AST;
- validating the edited AST;
- regenerating UI projection after each change;
- returning diagnostics when an edit is invalid.

This layer is the only place where AST and UI semantics meet.

## Acceptance Criteria

The visual editor contract is accepted when:

- `ui-node.json` schema exists;
- `edit-operation.json` schema exists;
- AST-to-UI projection exists;
- edit-operation application exists;
- React renders `ui-node.json`;
- React emits edit operations instead of mutating AST directly;
- the editor supports structured edits for sequence, if, loop, parallel, try, callBlock, callWorkflow, assign, and return nodes.

## Implementation Order

1. Define `ui-node.json` schema.
2. Define `edit-operation.json` schema.
3. Implement Go AST-to-UI projection.
4. Implement Go edit-operation application.
5. Scaffold React editor app.
6. Render projected UI nodes with auto layout.
7. Add structured editing actions.
8. Add validation and refresh loop.
