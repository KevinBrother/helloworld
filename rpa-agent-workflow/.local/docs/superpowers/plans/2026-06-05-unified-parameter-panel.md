# Unified Parameter Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace split declaration/value sections with unified input/output parameter rows that support inline literal values, reference binding, and synchronized workflow boundary edits.

**Architecture:** The server projector exposes explicit custom-parameter capabilities. The web workbench projects existing ports and fields into `WorkbenchParameterRow` records, and the panel renders those rows inside collapsible `输入参数` / `输出参数` cards. App-level persistence keeps local run input values, AST draft operations, and return output declarations synchronized.

**Tech Stack:** Go projector tests, React 19, TypeScript, Vitest SSR tests, Vite build, existing workflow edit API.

---

## File Structure

- Modify `compiler/go/transform/project.go`: add `allowCustomInput` / `allowCustomOutput` node metadata for workflow boundary nodes.
- Modify `compiler/go/transform/project_test.go`: assert projector metadata.
- Modify `apps/web/src/workbenchModel.ts`: add `WorkbenchParameterRow`, project input/output rows, keep legacy fields for existing consumers.
- Modify `apps/web/src/workbenchModel.test.ts`: verify row projection for start, call block, and return nodes.
- Modify `apps/web/src/workbench/components/ValueComboInput.tsx`: make reference trigger a link icon button and support `{{` opening.
- Modify `apps/web/src/workbench/components/ParameterPanel.tsx`: replace split schema sections with collapsible parameter cards and unified rows.
- Modify `apps/web/src/workbench/components/ParameterPanel.test.tsx`: assert unified rendering and absence of split return sections.
- Create `apps/web/src/workflowBoundary.ts`: pure helpers for local workflow port and return-expression synchronization.
- Create `apps/web/src/workflowBoundary.test.ts`: verify add/rename/delete output rows synchronize declaration and return expression fields locally.
- Modify `apps/web/src/App.tsx`: use `workflowBoundary.ts` helpers and row-level callbacks.
- Modify `apps/web/src/styles.css`: replace split schema styles with dense row/card styles and reference highlighted state.

---

## Task 1: Server Capability Metadata

**Files:**
- Modify: `compiler/go/transform/project.go`
- Modify: `compiler/go/transform/project_test.go`

- [ ] **Step 1: Write failing projector tests**

Add this test to `compiler/go/transform/project_test.go`:

```go
func TestProjectWorkflowMarksWorkflowBoundaryCustomParameterSupport(t *testing.T) {
	workflow := ast.Workflow{
		Workflow: ast.WorkflowMeta{ID: "boundary"},
		Inputs: []ast.Port{
			{Name: "dir", Type: ast.Type{Name: "string"}},
		},
		Outputs: []ast.Port{
			{Name: "count", Type: ast.Type{Name: "number"}},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:      "return_result",
					Kind:    "return",
					Returns: map[string]ast.Expression{"count": {Kind: "literal", Value: float64(0)}},
				},
			},
		},
	}

	document := ProjectWorkflow(workflow)
	if document.Root.Metadata["allowCustomInput"] != true {
		t.Fatalf("root allowCustomInput = %#v", document.Root.Metadata["allowCustomInput"])
	}
	returnNode := document.Root.Children[0]
	if returnNode.Metadata["allowCustomOutput"] != true {
		t.Fatalf("return allowCustomOutput = %#v", returnNode.Metadata["allowCustomOutput"])
	}
}
```

- [ ] **Step 2: Verify the test fails**

Run:

```bash
go test ./compiler/go/transform -run TestProjectWorkflowMarksWorkflowBoundaryCustomParameterSupport
```

Expected: FAIL because the metadata keys are missing.

- [ ] **Step 3: Implement metadata projection**

In `ProjectWorkflowWithBlocks`, after `root.Label = "Start"`, set root metadata:

```go
root.Metadata = mergeNodeMetadata(root.Metadata, map[string]any{
	"allowCustomInput": true,
})
```

Add this helper near `nodeMetadataWithOutputs`:

```go
func mergeNodeMetadata(base map[string]any, extra map[string]any) map[string]any {
	if len(base) == 0 {
		base = make(map[string]any, len(extra))
	}
	for key, value := range extra {
		base[key] = value
	}
	return base
}
```

In `nodeMetadata`, add:

```go
if stmt.Kind == "return" {
	metadata["allowCustomOutput"] = true
}
```

- [ ] **Step 4: Verify projector tests**

Run:

```bash
go test ./compiler/go/transform
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add compiler/go/transform/project.go compiler/go/transform/project_test.go
git commit -m "feat: expose boundary parameter capabilities"
```

---

## Task 2: Workbench Parameter Row Model

**Files:**
- Modify: `apps/web/src/workbenchModel.ts`
- Modify: `apps/web/src/workbenchModel.test.ts`

- [ ] **Step 1: Write failing row projection tests**

Add tests to `apps/web/src/workbenchModel.test.ts`:

```ts
it("projects workflow inputs into unified parameter rows", () => {
  const startNode = model.nodes.find((node) => node.id === "root")!;

  expect(startNode.inputRows.map((row) => ({
    name: row.name,
    type: row.type,
    direction: row.direction,
    valuePath: row.valuePath,
    portPath: row.portPath,
    valueEditable: row.valueEditable,
    allowReference: row.allowReference,
  }))).toEqual([
    {
      name: "left",
      type: "number",
      direction: "input",
      valuePath: "$.inputs.left",
      portPath: "$.inputs.left",
      valueEditable: true,
      allowReference: false,
    },
    {
      name: "operator",
      type: "string",
      direction: "input",
      valuePath: "$.inputs.operator",
      portPath: "$.inputs.operator",
      valueEditable: true,
      allowReference: false,
    },
    {
      name: "right",
      type: "number",
      direction: "input",
      valuePath: "$.inputs.right",
      portPath: "$.inputs.right",
      valueEditable: true,
      allowReference: false,
    },
  ]);
});

it("projects return outputs into unified editable output rows", () => {
  const returnNode = model.nodes.find((node) => node.id === "return_result")!;

  expect(returnNode.outputRows).toEqual([
    expect.objectContaining({
      name: "result",
      type: "number",
      direction: "output",
      portPath: "$.outputs.result",
      valuePath: "$.body.statements[1].returns.result",
      valueEditable: true,
      allowReference: true,
      allowDelete: true,
    }),
  ]);
});

it("projects normal block outputs as read-only output rows", () => {
  const calculateNode = model.nodes.find((node) => node.id === "calculate_large_value")!;

  expect(calculateNode.outputRows).toEqual([
    expect.objectContaining({
      name: "result",
      direction: "output",
      valueEditable: false,
      allowReference: false,
      allowDelete: false,
    }),
  ]);
});
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workbenchModel.test.ts
```

Expected: FAIL because `inputRows` and `outputRows` do not exist.

- [ ] **Step 3: Add row types**

In `apps/web/src/workbenchModel.ts`, add:

```ts
export type WorkbenchParameterRow = {
  id: string;
  direction: "input" | "output";
  name: string;
  type: FieldType;
  nameEditable: boolean;
  typeEditable: boolean;
  valueEditable: boolean;
  custom: boolean;
  value?: unknown;
  valuePath?: string;
  portPath?: string;
  field?: WorkbenchField;
  port?: WorkbenchPort;
  allowReference: boolean;
  allowDelete: boolean;
};
```

Extend `WorkbenchNode`:

```ts
inputRows: WorkbenchParameterRow[];
outputRows: WorkbenchParameterRow[];
allowCustomInput: boolean;
allowCustomOutput: boolean;
```

- [ ] **Step 4: Implement row projection**

In `toWorkbenchNode`, after `inputs` and `outputs` are built, compute:

```ts
const allowCustomInput = metadataFlag(node.metadata, "allowCustomInput");
const allowCustomOutput = metadataFlag(node.metadata, "allowCustomOutput");
const inputRows = buildParameterRows("input", node, inputs, inputPorts, allowCustomInput);
const outputRows = buildParameterRows("output", node, outputs, nodeOutputPorts, allowCustomOutput);
```

Add helper functions:

```ts
function buildParameterRows(
  direction: "input" | "output",
  node: UINode,
  fields: WorkbenchField[],
  ports: WorkbenchPort[],
  allowCustom: boolean,
): WorkbenchParameterRow[] {
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));
  const rows: WorkbenchParameterRow[] = [];

  for (const port of ports) {
    const field = fieldsByKey.get(port.key);
    rows.push(parameterRowFromPort(direction, node, port, field, allowCustom));
    if (field) fieldsByKey.delete(port.key);
  }

  for (const field of fieldsByKey.values()) {
    rows.push(parameterRowFromField(direction, node, field));
  }

  return rows;
}

function parameterRowFromPort(
  direction: "input" | "output",
  node: UINode,
  port: WorkbenchPort,
  field: WorkbenchField | undefined,
  allowCustom: boolean,
): WorkbenchParameterRow {
  const returnOutput = node.kind === "return" && direction === "output";
  const workflowStartInput = node.kind === "sequence" && direction === "input";
  return {
    id: `${direction}:${port.path}`,
    direction,
    name: port.key,
    type: port.type,
    nameEditable: allowCustom,
    typeEditable: allowCustom,
    valueEditable: Boolean(field && !field.readonly),
    custom: allowCustom,
    value: field?.value,
    valuePath: field?.path ?? port.path,
    portPath: port.path,
    field,
    port,
    allowReference: Boolean(field && !workflowStartInput && (returnOutput || field.control === "reference" || field.control === "expression")),
    allowDelete: allowCustom,
  };
}

function parameterRowFromField(direction: "input" | "output", node: UINode, field: WorkbenchField): WorkbenchParameterRow {
  const returnOutput = node.kind === "return" && direction === "output";
  return {
    id: `${direction}:${field.path}`,
    direction,
    name: field.key,
    type: field.type,
    nameEditable: false,
    typeEditable: false,
    valueEditable: !field.readonly,
    custom: false,
    value: field.value,
    valuePath: field.path,
    field,
    allowReference: !field.readonly && (returnOutput || field.control === "reference" || field.control === "expression"),
    allowDelete: false,
  };
}

function metadataFlag(metadata: UINode["metadata"], key: string) {
  return metadata?.[key] === true;
}
```

Set these values in the returned node.

- [ ] **Step 5: Verify row model tests**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workbenchModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/workbenchModel.ts apps/web/src/workbenchModel.test.ts
git commit -m "feat: project unified parameter rows"
```

---

## Task 3: Local Boundary Synchronization Helpers

**Files:**
- Create: `apps/web/src/workflowBoundary.ts`
- Create: `apps/web/src/workflowBoundary.test.ts`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Write failing local sync tests**

Create `apps/web/src/workflowBoundary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { updateWorkflowPortsInDocument } from "./workflowBoundary";
import type { UIDocument } from "./types";
import type { WorkbenchPort } from "./workbenchModel";

describe("workflow boundary document updates", () => {
  it("adds return expression fields when adding workflow outputs locally", () => {
    const document = returnDocument();
    const nextPorts: WorkbenchPort[] = [
      port("count", "number", "$.outputs.count"),
      port("bytes", "number", "$.outputs.bytes"),
    ];

    const next = updateWorkflowPortsInDocument(document, "outputs", nextPorts, "return_result", [port("count", "number", "$.outputs.count")]);
    const returnNode = next.root.children![0];

    expect(returnNode.inspector?.map((field) => field.path)).toContain("$.outputs.bytes");
    expect(returnNode.inspector?.map((field) => field.path)).toContain("$.body.statements[0].returns.bytes");
    expect(returnNode.inspector?.find((field) => field.path === "$.body.statements[0].returns.bytes")?.value).toEqual({
      kind: "literal",
      value: "",
    });
  });

  it("renames return expression fields by output position", () => {
    const document = returnDocument();
    const next = updateWorkflowPortsInDocument(
      document,
      "outputs",
      [port("total", "number", "$.outputs.count")],
      "return_result",
      [port("count", "number", "$.outputs.count")],
    );
    const paths = next.root.children![0].inspector?.map((field) => field.path) ?? [];

    expect(paths).toContain("$.outputs.total");
    expect(paths).toContain("$.body.statements[0].returns.total");
    expect(paths).not.toContain("$.body.statements[0].returns.count");
  });
});

function returnDocument(): UIDocument {
  return {
    schemaVersion: "1.0.0",
    workflowId: "wf",
    root: {
      id: "root",
      kind: "sequence",
      capabilities: emptyCapabilities(),
      children: [
        {
          id: "return_result",
          kind: "return",
          path: "$.body.statements[0]",
          capabilities: emptyCapabilities(),
          inspector: [
            { path: "$.outputs.count", label: "Output count", control: "port", readonly: true, value: { name: "count", type: { name: "number" } } },
            { path: "$.body.statements[0].returns.count", label: "Return count", control: "expression", value: { kind: "ref", ref: "node.list.count" } },
          ],
        },
      ],
    },
  };
}

function port(name: string, type: string, path: string): WorkbenchPort {
  return { key: name, label: name, type: type as WorkbenchPort["type"], path, value: { name, type: { name: type } } };
}

function emptyCapabilities() {
  return {
    toggleCollapsed: { enabled: false },
    updateField: { enabled: false },
    insertNode: { enabled: false },
    deleteNode: { enabled: false },
    moveStatement: { enabled: false },
    duplicateNode: { enabled: false },
    replaceSubtree: { enabled: false },
  };
}
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workflowBoundary.test.ts
```

Expected: FAIL because `workflowBoundary.ts` does not exist.

- [ ] **Step 3: Implement `workflowBoundary.ts`**

Create `apps/web/src/workflowBoundary.ts` with exported pure helpers:

```ts
import type { UIDocument, UINode } from "./types";
import type { WorkbenchPort } from "./workbenchModel";

export function updateWorkflowPortsInDocument(
  document: UIDocument,
  direction: "inputs" | "outputs",
  ports: WorkbenchPort[],
  targetNodeId: string,
  previousPorts: WorkbenchPort[],
): UIDocument {
  const nextRoot =
    direction === "inputs"
      ? {
          ...document.root,
          inspector: replacePortInspectorFields(document.root.inspector, direction, ports),
        }
      : updateNodeRecursive(document.root, targetNodeId, (node) => ({
          ...node,
          inspector: syncReturnInspectorFields(replacePortInspectorFields(node.inspector, direction, ports), node, ports, previousPorts),
        }));

  const nextDocument = { ...document, root: nextRoot };
  if (direction !== "inputs") return nextDocument;
  return {
    ...nextDocument,
    metadata: {
      ...nextDocument.metadata,
      workflowInputValues: remapWorkflowInputValues(workflowInputValues(document), previousPorts, ports),
    },
  };
}
```

Also move the existing `replacePortInspectorFields`, `remapWorkflowInputValues`, `workflowInputValues`, and `updateNodeRecursive` helper logic from `App.tsx` into this module. Add this return synchronization helper:

```ts
function syncReturnInspectorFields(
  inspector: UINode["inspector"],
  node: UINode,
  ports: WorkbenchPort[],
  previousPorts: WorkbenchPort[],
) {
  if (node.kind !== "return" || !node.path) return inspector;
  const existing = new Map((node.inspector ?? []).filter((field) => field.path.includes(".returns.")).map((field) => [field.path.split(".").at(-1) ?? "", field]));
  const nextReturnFields = ports.map((port, index) => {
    const previous = previousPorts[index];
    const preserved = existing.get(port.key) ?? (previous ? existing.get(previous.key) : undefined);
    return {
      path: `${node.path}.returns.${port.value.name}`,
      label: `Return ${port.value.name}`,
      control: "expression",
      value: preserved?.value ?? { kind: "literal", value: "" },
      metadata: preserved?.metadata,
    };
  });
  return [...(inspector ?? []).filter((field) => !field.path.includes(".returns.")), ...nextReturnFields];
}
```

- [ ] **Step 4: Update App to use the helper**

In `apps/web/src/App.tsx` import:

```ts
import { updateWorkflowPortsInDocument } from "./workflowBoundary";
```

Replace the local call:

```ts
const nextDocument = updateWorkflowPorts(uiDocument, direction, ports, node.id, direction === "inputs" ? node.inputPorts : node.outputPorts);
```

with:

```ts
const nextDocument = updateWorkflowPortsInDocument(uiDocument, direction, ports, node.id, direction === "inputs" ? node.inputPorts : node.outputPorts);
```

Remove the old local `updateWorkflowPorts`, `replacePortInspectorFields`, and `remapWorkflowInputValues` helpers from `App.tsx`.

- [ ] **Step 5: Verify boundary tests**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workflowBoundary.test.ts src/workbenchModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/workflowBoundary.ts apps/web/src/workflowBoundary.test.ts apps/web/src/App.tsx
git commit -m "feat: sync boundary parameter rows locally"
```

---

## Task 4: Reference Badge Value Control

**Files:**
- Modify: `apps/web/src/workbench/components/ValueComboInput.tsx`
- Modify: `apps/web/src/workbench/components/ParameterPanel.test.tsx`

- [ ] **Step 1: Write failing rendering tests**

Add this expectation to the return value rendering test in `ParameterPanel.test.tsx`:

```ts
expect(html).toContain("aria-label=\"引用 result\"");
expect(html).toContain("{{node.branch_by_threshold.result}}");
```

Add a fixture return value:

```ts
value: { kind: "ref", ref: "node.branch_by_threshold.result" }
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workbench/components/ParameterPanel.test.tsx
```

Expected: FAIL because the control renders `ref` chip and raw `node.branch_by_threshold.result`, not a link badge and moustache pointer.

- [ ] **Step 3: Implement link badge rendering**

In `ValueComboInput.tsx`:

- Replace the inline `combo-ref-chip` text with a right-side button.
- Import `Link2` from `lucide-react`.
- Render reference display as `{{${activeSourceLabel ?? activeSourceId}}}`.
- On input change, if the typed value includes `{{`, call `onOpenChange(true)` without waiting for focus.

Core implementation:

```tsx
import { ChevronDown, Link2 } from "lucide-react";

const referenceDisplayValue = activeSourceId ? `{{${activeSourceLabel ?? activeSourceId}}}` : undefined;
const displayValue = draftValue ?? String(referenceDisplayValue ?? resolvedValue);

const handleTextChange = (value: string) => {
  setDraftValue(value);
  onFieldChange(field, { kind: "literal", value: parseFieldInput(value.replaceAll("{{", "").replaceAll("}}", ""), field.type) });
  if (value.includes("{{") || canOpenMenu) onOpenChange(true);
};
```

Use this button for the reference badge:

```tsx
<button
  aria-label={`引用 ${field.label}`}
  className={activeSourceId ? "combo-link-button active" : "combo-link-button"}
  type="button"
  onMouseDown={(event) => event.preventDefault()}
  onClick={() => {
    inputRef.current?.focus();
    onOpenChange(true);
  }}
>
  <Link2 size={15} />
</button>
```

- [ ] **Step 4: Verify rendering tests**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workbench/components/ParameterPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/workbench/components/ValueComboInput.tsx apps/web/src/workbench/components/ParameterPanel.test.tsx
git commit -m "feat: add inline reference badge"
```

---

## Task 5: Unified Parameter Panel Rendering

**Files:**
- Modify: `apps/web/src/workbench/components/ParameterPanel.tsx`
- Modify: `apps/web/src/workbench/components/ParameterPanel.test.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Replace old tests with unified panel tests**

Update `ParameterPanel.test.tsx` to assert the new structure:

```ts
it("renders workflow start inputs as one unified input parameter card", () => {
  const html = renderToStaticMarkup(
    <ParameterPanel
      model={model}
      node={startNode}
      openSourceKey={null}
      onFieldChange={() => undefined}
      onOpenSourceKeyChange={() => undefined}
      onWorkflowPortsChange={() => undefined}
    />,
  );

  expect(html).toContain("输入参数");
  expect(html).not.toContain("运行输入值");
  expect(html).toContain("aria-label=\"参数名 dir\"");
  expect(html).toContain("aria-label=\"参数类型 dir\"");
  expect(html).toContain("aria-label=\"dir value\"");
});

it("renders return outputs as one unified output parameter card", () => {
  const html = renderToStaticMarkup(
    <ParameterPanel
      model={{ ...model, nodes: [returnNode] }}
      node={returnNode}
      openSourceKey={null}
      onFieldChange={() => undefined}
      onOpenSourceKeyChange={() => undefined}
      onWorkflowPortsChange={() => undefined}
    />,
  );

  expect(html).toContain("输出参数");
  expect(html).not.toContain("流程输出");
  expect(html).not.toContain("返回值");
  expect(html).toContain("aria-label=\"参数名 result\"");
  expect(html).toContain("aria-label=\"参数类型 result\"");
  expect(html).toContain("aria-label=\"result value\"");
  expect(html).toContain("添加自定义输出");
});
```

Update fixtures to include `inputRows`, `outputRows`, `allowCustomInput`, and `allowCustomOutput`.

- [ ] **Step 2: Verify tests fail**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workbench/components/ParameterPanel.test.tsx
```

Expected: FAIL because the panel still renders split `SchemaSection` blocks.

- [ ] **Step 3: Implement parameter cards**

Replace `SchemaSection`, `WorkflowPortList`, `ParameterFieldList`, and split render branches with:

```tsx
<ParameterCard
  title="输入参数"
  addLabel="添加自定义参数"
  rows={node.inputRows}
  allowAdd={node.allowCustomInput}
  direction="inputs"
  model={model}
  node={node}
  errors={errors}
  openSourceKey={openSourceKey}
  onFieldChange={onFieldChange}
  onOpenSourceKeyChange={onOpenSourceKeyChange}
  onWorkflowPortsChange={onWorkflowPortsChange}
/>
<ParameterCard
  title="输出参数"
  addLabel="添加自定义输出"
  rows={node.outputRows}
  allowAdd={node.allowCustomOutput}
  direction="outputs"
  model={model}
  node={node}
  errors={errors}
  openSourceKey={openSourceKey}
  onFieldChange={onFieldChange}
  onOpenSourceKeyChange={onOpenSourceKeyChange}
  onWorkflowPortsChange={onWorkflowPortsChange}
/>
```

Render only cards with rows or `allowAdd`.

Implement row event helpers:

```ts
function updateRowPort(rows: WorkbenchParameterRow[], row: WorkbenchParameterRow, value: WorkbenchPort["value"]) {
  return rows
    .filter((candidate) => candidate.port)
    .map((candidate) => (candidate.id === row.id && candidate.port ? portFromValue(value, candidate.port.path) : candidate.port!));
}
```

For row value changes:

```tsx
{row.field && row.valueEditable ? (
  <ValueComboInput
    activeSourceId={getFieldSourceId(row.field)}
    error={errors[row.name]}
    field={row.field}
    isOpen={openSourceKey === sourceKey}
    resolvedValue={getResolvedFieldValue(row.field, model.sourcesById)}
    sourceOptions={getSourceOptions(model.nodes, node.id, row.field)}
    onFieldChange={onFieldChange}
    onOpenChange={(nextOpen) => onOpenSourceKeyChange(nextOpen ? sourceKey : null)}
  />
) : (
  <span className="value-control readonly-value">{row.field ? getResolvedFieldValue(row.field, model.sourcesById) : ""}</span>
)}
```

Disabled name/type controls:

```tsx
<input aria-label={`参数名 ${row.name}`} disabled={!row.nameEditable} value={row.name} />
<select aria-label={`参数类型 ${row.name}`} disabled={!row.typeEditable} value={row.type}>
  {PORT_TYPE_OPTIONS.map((option) => (
    <option key={option} value={option}>
      {option}
    </option>
  ))}
</select>
```

- [ ] **Step 4: Update styles**

In `styles.css`, replace row/card styling with:

```css
.parameter-card {
  padding: 0.85rem 0.9rem 0;
}

.parameter-card > details {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface-2);
}

.parameter-card summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 0 0.68rem;
  font-size: 0.86rem;
  font-weight: 700;
}

.parameter-row-list {
  display: grid;
  gap: 0.42rem;
  padding: 0.58rem;
}

.parameter-row-header,
.parameter-row {
  display: grid;
  grid-template-columns: minmax(74px, 0.9fr) minmax(84px, 0.72fr) minmax(118px, 1.25fr) 32px;
  gap: 0.42rem;
  align-items: center;
}

.parameter-row-header {
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
}

.parameter-cell-input,
.parameter-cell-select {
  width: 100%;
  min-width: 0;
  min-height: 36px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  padding: 0 0.5rem;
}

.parameter-cell-input:disabled,
.parameter-cell-select:disabled {
  color: var(--muted);
  background: color-mix(in oklab, var(--surface-2) 70%, var(--surface));
}

.combo-link-button {
  width: 34px;
  min-height: 36px;
  display: grid;
  place-items: center;
  border-left: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
}

.combo-link-button.active,
.value-combo.linked .value-combo-control {
  background: color-mix(in oklab, var(--accent-soft) 76%, var(--surface));
  border-color: color-mix(in oklab, var(--accent) 54%, var(--line));
}
```

- [ ] **Step 5: Verify panel tests**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workbench/components/ParameterPanel.test.tsx src/workbenchModel.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/workbench/components/ParameterPanel.tsx apps/web/src/workbench/components/ParameterPanel.test.tsx apps/web/src/styles.css
git commit -m "feat: render unified parameter cards"
```

---

## Task 6: Full Verification And Browser QA

**Files:**
- No new source files unless verification reveals a defect.

- [ ] **Step 1: Run targeted frontend tests**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web exec vitest run src/workbench/components/ParameterPanel.test.tsx src/workbenchModel.test.ts src/workflowBoundary.test.ts src/runInputValidation.test.ts src/workflowDraft.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full frontend test suite**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web test
```

Expected: PASS.

- [ ] **Step 3: Build frontend**

Run:

```bash
pnpm --filter @rpa-agent-workflow/web build
```

Expected: PASS.

- [ ] **Step 4: Run Go checks**

Run:

```bash
go test ./compiler/go/transform ./contracts/ast ./contracts/edit-operation
```

Expected: PASS.

Also run:

```bash
go test ./...
```

Expected: PASS unless the existing user-modified `examples/fs-workflow/ast.json` still lacks the required filesystem path. If it fails with `ValueError: path is required`, report that exact unrelated dirty-file blocker and do not modify `examples/fs-workflow/ast.json`.

- [ ] **Step 5: Browser verify with a temporary AST**

Use a temporary copy of `examples/calculator/ast.json`:

```bash
tmpdir=$(mktemp -d /tmp/rpawf-unified-params.XXXXXX)
cp examples/calculator/ast.json "$tmpdir/ast.json"
pnpm --filter @rpa-agent-workflow/web exec vite --host 127.0.0.1 --port 5174
go run ./apps/cli/rpawf serve --addr 127.0.0.1:8787 "$tmpdir/ast.json" sdks/block
```

Build the URL:

```bash
encoded=$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$tmpdir/ast.json")
printf 'http://127.0.0.1:5174/?workflow=%s\n' "$encoded"
```

Verify:

- Start node shows one `输入参数` card.
- Return node shows one `输出参数` card.
- Return node does not show separate `流程输出` or `返回值` sections.
- Clicking the link icon opens variable choices.
- Selecting a variable displays a concrete pointer such as `{{list_input_dir.count}}`.
- Adding an output creates a row with name/type/value controls immediately.
- Saving writes the workflow to the service.
- Running after save succeeds.

If this verification reveals a defect, return to the task that introduced that behavior, add a failing test for the defect, fix it, rerun Task 6, and commit that task's source files with the task's commit convention.

---

## Self-Review Checklist

- The plan covers server capability metadata, row model projection, local AST/UI synchronization, reference interaction, unified panel rendering, styling, and verification.
- The plan keeps existing run input local persistence.
- The plan keeps existing save-to-service flow.
- The plan preserves current block output read-only behavior.
- The plan removes the split return-node UI.
- The plan includes a commit after each completed implementation feature point.
