# Unified Parameter Panel Design

## Goal

Replace the split "workflow declaration" and "value binding" UI with a unified parameter editor. A user should edit one parameter in one row: name, type, value/reference, and row actions stay together.

## Problem

The current boundary-node UI exposes implementation structure:

- Workflow inputs are shown separately from run input values.
- Workflow outputs are shown separately from return values.
- A user adding or renaming an output must understand that the declaration and return expression are related across two sections.
- Reference binding is visually noisy because the value control does not clearly advertise "manual value" versus "scope pointer" as one inline interaction.

This makes the editor feel like an AST inspector instead of a workflow editor.

## Product Model

The right-side parameter panel has two collapsible cards:

- **输入参数**
- **输出参数**

Each card renders parameter rows. A row is the only place where that parameter is edited.

Row layout:

```text
参数名 | 类型 | 值 / 引用 | 操作
```

The UI can still persist to different AST paths internally, but users never edit the same logical parameter in two separate blocks.

## Input Parameters

Input parameters represent data consumed by the selected node.

### Built-in Inputs

Built-in inputs come from the block or workflow schema.

- Parameter name is disabled.
- Type is disabled.
- Value is editable.
- Value supports manual literal entry and upstream variable references.

### Custom Inputs

If the node schema has `allowCustomInput: true`, the input card footer shows:

```text
+ 添加自定义参数
```

Clicking it appends a row:

- Name is an editable text input.
- Type is a select with `String`, `Number`, `Boolean`, `Array`, `Object`.
- Value is editable.
- Row can be deleted.

If `allowCustomInput` is absent or false, the button is not rendered.

### Value Controls

Value control rendering follows the parameter type:

- `String`: single-line text input.
- `Number`: numeric text input that stores a number when parseable.
- `Boolean`: switch/toggle.
- `Array`: JSON text input.
- `Object`: JSON text input.

Manual value mode is the default.

## Output Parameters

Output parameters represent variables produced by the selected node or values exposed to the outer workflow scope.

### Built-in Outputs

Built-in outputs come from block schema or workflow output declarations.

- Parameter name is disabled.
- Type is disabled.
- Value behavior depends on node kind:
  - Normal block outputs are read-only because the block runtime produces them.
  - Return node outputs are editable because they map workflow output names to return expressions.
  - Future mapping-capable nodes can enable editable output values using the same row model.

### Custom Outputs

If the node schema has `allowCustomOutput: true`, the output card footer shows:

```text
+ 添加自定义输出
```

Clicking it appends a row:

- Name is an editable text input.
- Type is a select with `String`, `Number`, `Boolean`, `Array`, `Object`.
- Value/reference is editable when the node supports output mapping.
- Row can be deleted.

If `allowCustomOutput` is absent or false, the button is not rendered.

### Return Node Behavior

The return node only needs the `输出参数` card.

Each row represents one workflow output:

```text
变量名 | 类型 | 返回值 / 透传引用 | 删除
```

Operations are synchronized:

- Add output: create both the workflow output declaration and a return expression.
- Rename output: rename declaration and return expression key.
- Change type: update workflow output declaration type.
- Change value/reference: update return expression only.
- Delete output: remove declaration and return expression.

There is no separate "流程输出" card and "返回值" card.

## Reference Interaction

Every editable value control has a link/reference badge on the right side.

The badge is an icon button, visually represented as `🔗` in the mockup. In implementation use an icon from the existing icon library.

Interaction rules:

- Default mode is manual input.
- Clicking the link badge opens the variable selector.
- Typing `{{` inside the value input also opens the variable selector.
- When reference mode is active, the value input receives a light blue highlighted state.
- Variable options display scope pointers in moustache form, for example:
  - `{{Start.query}}`
  - `{{list_input_dir.count}}`
  - `{{write_summary.path}}`
- Selecting a variable stores the existing expression ref shape:

```json
{ "kind": "ref", "ref": "node.list_input_dir.count" }
```

- Clearing the reference token or typing a normal literal returns to manual mode.

No radio buttons or explicit "manual/reference" segmented controls are used.

## UI Row Model

The workbench should project existing fields and ports into a row model before rendering.

```ts
type ParameterRow = {
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
  allowReference: boolean;
  allowDelete: boolean;
};
```

Responsibilities:

- The panel renders `ParameterRow[]`.
- Projection code decides how AST/UI-node inspector data maps to rows.
- Save/update handlers translate row edits back to AST edit operations or local workflow input metadata.

## Persistence Mapping

Input rows:

- Name/type edits on workflow inputs update `$.inputs`.
- Run input value edits update local `metadata.workflowInputValues`.
- Normal node input value/reference edits create `updateField` operations against the node input path.

Output rows:

- Name/type edits on workflow outputs update `$.outputs`.
- Return value/reference edits update the return expression path.
- Add/delete/rename on return rows update both declaration and return expression.
- Normal block output rows remain read-only unless node schema explicitly enables custom output mapping.

## Draft And Save Behavior

Local draft behavior stays consistent with the current editor model:

- Run input values are saved locally immediately and do not require service save.
- AST-affecting changes are saved into local draft and require "保存流程" before manual run.
- Reloading the page restores draft rows and run input values.
- Saving applies pending AST operations to the service and clears pending operations.

## Visual Direction

The panel should remain dense and utilitarian.

- Use two compact collapsible cards instead of nested cards.
- Keep cards at small radius consistent with the existing UI.
- Use disabled styling for built-in name/type cells.
- Use blue-tinted highlight only for active reference mode.
- Use icon buttons for reference and delete actions.
- Avoid instructional text inside the app; labels and row affordances should carry the interaction.

## Acceptance Criteria

- A logical parameter appears in one row only.
- Return node no longer shows separate "流程输出" and "返回值" cards.
- Built-in parameter name/type cells are disabled.
- Custom add buttons render only when schema allows custom inputs or outputs.
- Clicking the link icon opens upstream variable selection.
- Typing `{{` opens upstream variable selection.
- Selecting a variable stores an expression ref and displays a moustache-style pointer.
- Manual typing stores a literal value.
- New return output rows create declaration and return expression together.
- Deleting a return output row removes declaration and return expression together.
- Renaming a return output row keeps declaration and return expression keys synchronized.
- Existing workflow run input local persistence still works.
- Existing save-to-service flow still works.
- Existing run modal consumes current local input values.
