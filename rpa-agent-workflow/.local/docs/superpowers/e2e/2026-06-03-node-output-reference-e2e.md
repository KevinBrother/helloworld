# Node Output Reference E2E Requirements

## Goal

Verify the calculator workflow works end to end after the Node Output Reference migration, covering both backend service behavior and frontend editor behavior.

## Scope

This E2E test covers:

- Backend `rpawf serve` loading `examples/calculator/ast.json`.
- Frontend Vite app loading workflow state through `/api/workflow`.
- UI projection showing the new data-flow model.
- Backend `/api/run` executing with runtime inputs and returning `returns`, `state`, and `nodeOutputs`.
- Frontend Run button behavior.

## Servers

Backend:

```sh
CGO_ENABLED=0 go run ./apps/cli/rpawf serve examples/calculator/ast.json sdks/python/blocks
```

Expected backend URL:

```text
http://127.0.0.1:8787
```

Frontend:

```sh
pnpm --dir apps/web dev --host 127.0.0.1
```

Expected frontend URL:

```text
http://127.0.0.1:5173
```

## Backend API Checks

## Data Flow Checks

This is the primary E2E target. The test must prove data flows through references, not only that the workflow returns `42`.

### Then Branch Data Flow

Input:

```json
{
  "left": 40,
  "operator": "+",
  "right": 2
}
```

Expected flow:

```text
input.left = 40
input.left > 10 => true
then branch executes calculate_large_value
node.calculate_large_value.result = 42
node.branch_by_threshold.result = node.calculate_large_value.result
return.result = node.branch_by_threshold.result
```

Pass criteria:

- `nodeOutputs.calculate_large_value.result` exists and is `42`.
- `nodeOutputs.calculate_small_value` does not exist.
- `nodeOutputs.branch_by_threshold.result` is `42`.
- `returns.result` is `42`.
- Event trace includes `calculate_large_value`.
- Event trace does not include `calculate_small_value`.

### Else Branch Data Flow

Input:

```json
{
  "left": 6,
  "operator": "*",
  "right": 7
}
```

Expected flow:

```text
input.left = 6
input.left > 10 => false
else branch executes calculate_small_value
node.calculate_small_value.result = 42
node.branch_by_threshold.result = node.calculate_small_value.result
return.result = node.branch_by_threshold.result
```

Pass criteria:

- `nodeOutputs.calculate_small_value.result` exists and is `42`.
- `nodeOutputs.calculate_large_value` does not exist.
- `nodeOutputs.branch_by_threshold.result` is `42`.
- `returns.result` is `42`.
- Event trace includes `calculate_small_value`.
- Event trace does not include `calculate_large_value`.

### Forbidden Ordinary Variable Flow

Pass criteria:

- Workflow AST has no top-level `variables`.
- Workflow AST contains no `var.*`.
- Run result does not depend on `variables`.
- Normal calculator execution does not emit `variable.write`.

### Start Node Input / Output Visibility

Pass criteria:

- UI root node is labeled `Start`.
- UI root inspector displays workflow inputs:
  - `left`
  - `operator`
  - `right`
- UI root inspector displays workflow output:
  - `result`
- API run result echoes the runtime input values in `result.inputs`.
- `result.inputs.left`, `result.inputs.operator`, and `result.inputs.right` match the submitted run request.

### Workflow Load

Request:

```http
GET /api/workflow
```

Pass criteria:

- HTTP status is `200`.
- `ast.workflow.id` is `calculator`.
- `diagnostics` is empty.
- `ui.root` contains `branch_by_threshold`.
- `ui.root` does not contain `set_threshold_value`.
- `ast` does not contain ordinary `variables`.
- `ast` contains no `var.*` references.

### Then Branch Run

Request:

```http
POST /api/run
Content-Type: application/json

{
  "inputs": {
    "left": 40,
    "operator": "+",
    "right": 2
  }
}
```

Pass criteria:

- HTTP status is `200`.
- `result.returns.result` is `42`.
- `result.nodeOutputs.calculate_large_value.result` is `42`.
- `result.nodeOutputs.branch_by_threshold.result` is `42`.

### Else Branch Run

Request:

```http
POST /api/run
Content-Type: application/json

{
  "inputs": {
    "left": 6,
    "operator": "*",
    "right": 7
  }
}
```

Pass criteria:

- HTTP status is `200`.
- `result.returns.result` is `42`.
- `result.nodeOutputs.calculate_small_value.result` is `42`.
- `result.nodeOutputs.branch_by_threshold.result` is `42`.

## Frontend Checks

Open:

```text
http://127.0.0.1:5173
```

Pass criteria:

- Header shows workflow `calculator`.
- Status shows `Workflow service connected`.
- Outline contains `if Branch By Threshold`.
- Outline contains `callBlock math.calculate` for both branches.
- Outline contains `return Return`.
- Outline does not contain `assign Set threshold_value`.
- Canvas shows THEN and ELSE branches.

## Frontend Run Button Check

Current frontend `Run` button sends an empty body `{}` and does not provide runtime inputs.

Pass criteria for current behavior:

- Clicking Run should not crash the UI.
- Diagnostics should show a run failure caused by missing `input.left`.
- This is an expected product gap, not a backend/runtime failure.

Required follow-up:

- Add a frontend runtime input panel so users can run calculator from the UI with `left`, `operator`, and `right`.

## MCP Execution Notes

Use Chrome MCP to:

- Open frontend URL.
- Inspect visible outline/canvas/workbench text.
- Click Run and inspect diagnostics.
- Execute `/api/workflow` and `/api/run` through browser `fetch` from the frontend page so the same Vite proxy path is exercised.

Do not use a standalone Playwright test script for this E2E pass.

## Result - 2026-06-03

Executed with Chrome MCP against:

- Backend: `rpawf` on `127.0.0.1:8787`
- Frontend: Vite on `127.0.0.1:5173`

### Passed

- Data flow assertions passed with zero failures.
- Start node visibility passed:
  - root node label was `Start`
  - root inspector displayed `Input left`, `Input operator`, `Input right`, and `Output result`
- Runtime input echo passed:
  - `result.inputs.left = 40`
  - `result.inputs.operator = "+"`
  - `result.inputs.right = 2`
- Then branch data flow:
  - `input.left = 40`
  - only `calculate_large_value` executed
  - `nodeOutputs.calculate_large_value.result = 42`
  - `nodeOutputs.calculate_small_value` was absent
  - `nodeOutputs.branch_by_threshold.result = nodeOutputs.calculate_large_value.result`
  - `returns.result = nodeOutputs.branch_by_threshold.result`
  - no `variable.write` events were emitted
- Else branch data flow:
  - `input.left = 6`
  - only `calculate_small_value` executed
  - `nodeOutputs.calculate_small_value.result = 42`
  - `nodeOutputs.calculate_large_value` was absent
  - `nodeOutputs.branch_by_threshold.result = nodeOutputs.calculate_small_value.result`
  - `returns.result = nodeOutputs.branch_by_threshold.result`
  - no `variable.write` events were emitted
- Frontend loaded `calculator`.
- Frontend status showed `Workflow service connected`.
- Outline contained:
  - `if Branch By Threshold`
  - two `callBlock math.calculate` nodes
  - `return Return`
- Outline did not contain `assign Set threshold_value`.
- Canvas showed THEN and ELSE branches.
- Browser `fetch('/api/workflow')` returned status `200`.
- Workflow API returned `workflowId = calculator`.
- Workflow API returned no ordinary `variables`.
- Workflow AST contained no `var.*` references.
- Then branch API run with `{ left: 40, operator: "+", right: 2 }` returned:
  - `returns.result = 42`
  - `nodeOutputs.calculate_large_value.result = 42`
  - `nodeOutputs.branch_by_threshold.result = 42`
- Else branch API run with `{ left: 6, operator: "*", right: 7 }` returned:
  - `returns.result = 42`
  - `nodeOutputs.calculate_small_value.result = 42`
  - `nodeOutputs.branch_by_threshold.result = 42`
- Clicking the frontend Run button did not crash the UI.
- Clicking Run showed expected diagnostic:
  - `RUN_FAILED`
  - `eval: unknown local ref "input.left"`

### Product Gap

The frontend Run button currently posts `{}` to `/api/run`. Calculator now requires runtime inputs, so direct UI Run cannot complete successfully until the UI provides a runtime input panel.

Required follow-up:

- Add runtime input controls for workflow inputs.
- Send `{ inputs: { left, operator, right } }` from the frontend Run action.
- Display successful `returns`, `state`, and `nodeOutputs` in the Run panel after user-provided inputs.

### Evidence

Screenshot:

```text
.local/docs/superpowers/e2e/2026-06-03-node-output-reference-e2e.png
```
