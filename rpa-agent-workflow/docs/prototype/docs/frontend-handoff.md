# Frontend Handoff

## Route Or Page

- Workbench only

## Component Candidates

- Prototype shell
- Editor toolbar
- Node library
- Canvas node
- Branch column
- Node parameter panel
- Parameter row
- Reference picker
- Output declaration rows
- Workflow output rows
- JSON-like editable schema panel
- Test run modal
- Collapsible run log

## State Notes

- Selected node is local UI state.
- Parameter edits take effect immediately.
- Canvas structure should come from the workflow model.
- Test run result should not drive the editor layout.
- Value cells display resolved values.
- Reference values remain internal state/model data.
- Start node has workflow inputs and no node outputs.
- Return node has workflow outputs and no node inputs.
- Source pickers filter candidates by field type before rendering.

## Implementation Questions

- How are new nodes inserted into a branch or sequence?
- Which workflow inputs or previous node outputs are valid for each selected field?
- Which block parameters are required?
- How does selection persist after saving the workflow?
