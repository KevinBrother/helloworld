# Fields And Actions

## Workflow Editor Header

Actions:
- Save workflow
- Test run

## Left Panel

Fields:
- Search block or control node
- Node type
- Short description

Actions:
- Choose block/control item for insertion

## Canvas

Visible node fields:
- Label
- Workflow input count for `Workflow Inputs`
- Input/output counts for real nodes
- Workflow output count for `Return result`
- Branch label when relevant
- Selection state

Actions:
- Select node

## Node Parameter Panel

Fields:
- Node kind
- Workflow input name
- Workflow input type
- Workflow input value
- Input field name
- Input type
- Resolved value
- Select options
- Valid source choices
- Output name
- Output type
- Workflow output source and resolved value

Actions:
- Choose a source from the value cell.
- Filter source choices by field type.
- Edit values directly; changes take effect immediately.
- Define workflow outputs from previous node outputs.

Rules:
- `Workflow Inputs` has workflow inputs and no node outputs.
- Real nodes can use workflow inputs or previous node outputs as parameter sources.
- Real node outputs only declare produced values.
- `Return result` has workflow outputs and no node inputs.
- Visible values are resolved values; internal references are not shown as the field value.

## Test Run

Fields:
- Sample input values
- Result preview

Actions:
- Run test

## Run Log

Fields:
- Timestamped run lines
- Input values
- Branch selected
- Node output
- Returned result

Actions:
- Collapse log
- Expand log
