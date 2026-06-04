# Backend Handoff

This is not a final API design. It lists backend implications from the low-fi editor prototype.

## Candidate Business Objects

- Workflow.
- Workflow input.
- Workflow node.
- Node parameter.
- Parameter source choice.
- Node output.
- Workflow output.
- Block definition.
- Test run input.
- Test run result.

## Candidate Operations

- Load workflow for editing.
- List insertable block definitions.
- Insert node into sequence or branch.
- Update selected node parameters.
- Update workflow inputs.
- Update workflow output mappings.
- Save workflow.
- Run workflow test with sample input.

## Validation Needs

- Required parameters.
- Parameter type compatibility.
- Valid workflow input references.
- Valid previous-output scope for real nodes.
- Valid previous-output scope for workflow outputs.
- Source choices filtered by expected field type.
- Branch insertion target.
- Return output selection.

## Model Rules

- The start node defines workflow inputs. It does not produce node outputs.
- Real nodes accept parameters. A parameter can use a literal value, a fixed option, a workflow input reference, or a previous node output reference.
- Real node outputs are declarations of produced values. They do not store downstream usage.
- The return node defines workflow outputs. It does not accept node inputs.
- A workflow output can wrap a previous node output.
- Editor value cells show resolved values. The saved model keeps reference ids.
- UI must not require users to read internal reference syntax.

## Permission Questions

- Who can edit workflow structure?
- Who can edit block parameters?
- Who can save workflow changes?
- Who can run workflow tests?

## Audit Questions

- Which node parameter changes need before/after values?
- Which structure changes need ordering information?
- Which test runs need to be retained?
