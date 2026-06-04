# User Flows

## Primary Flow: Configure A Node

1. User opens Workbench.
2. User clicks a node on the canvas.
3. Right panel updates to the selected node.
4. User edits parameters with inputs, selects, or source choices.
5. Changes take effect immediately.
6. Canvas keeps the same structure while the selected node configuration changes.

## Primary Flow: Use Workflow Inputs

1. User selects `Workflow Inputs`.
2. Right panel shows only workflow input fields.
3. User edits literal workflow input values.
4. Real nodes can choose these workflow inputs as parameter sources.
5. `Workflow Inputs` does not expose node outputs.

## Primary Flow: Define Workflow Output

1. User selects `Return result`.
2. Right panel shows only workflow output fields.
3. User chooses a previous node output as the source for a workflow output.
4. Value cells show resolved values.
5. The saved model keeps the internal reference.
6. `Return result` does not expose node inputs.

## Secondary Flow: Insert A Node From The Left Panel

1. User uses the left panel inside Workbench.
2. User searches for a block.
3. User chooses a block/control item.
4. Canvas adds the new node.
5. Right panel opens that node's required parameters.

## Secondary Flow: Choose A Previous Output

1. User selects a node parameter.
2. User clicks the value cell.
3. Right panel shows valid sources filtered by expected type.
4. User chooses one source.
5. Parameter value displays the resolved value.
6. The internal model stores the reference.

## Secondary Flow: Test The Workflow

1. User clicks Test Run.
2. User provides sample input.
3. System runs the current edited workflow.
4. User reviews the run output.

## Exception Flows

- No workflow loaded: show load/create workflow actions.
- Invalid parameter: show the node and field that need attention.
- Reference unavailable: show only valid sources for that field type.
- Operation unavailable: show the unavailable action with a direct reason.
