# Product Brief

## Goal

Validate a workflow editing interface where users build a workflow from canvas nodes and configure the selected node from the right-side parameter panel.

## User

The user builds a workflow by selecting nodes on the canvas, configuring parameters, choosing valid sources, and running a lightweight test.

## Core Scenarios

1. User opens Workbench.
2. User chooses a node or block from the left library.
3. User places or selects a node on the main canvas.
4. Right panel shows editable inputs for real nodes, workflow inputs for the start node, or workflow outputs for the return node.
5. User changes values directly. Changes take effect immediately in the prototype.
6. User runs a lightweight test to verify the workflow result.

## Flow Semantics

- Workbench is the only product surface in this prototype.
- `Workflow Inputs` defines the workflow input values. It has no node outputs.
- Real nodes can use workflow inputs or previous node outputs as parameter sources.
- Source choices are filtered by type. A `number` field cannot choose a `string` source.
- The editor displays resolved values in value cells. Internal reference ids are not shown as the visible value.
- Real node outputs declare what the node produces. They do not show downstream usage.
- `Return result` defines workflow output values. It has no node inputs.
- Return outputs can wrap/select previous node outputs while displaying the resolved output value.

## Assumptions

- This is a low-fidelity prototype.
- Fake data represents a calculator workflow.
- No real APIs are connected.
- Test run is for validation only, not debugging.
- There are no statistics, role pages, runtime debugger, trace dock, contract-review page, block maintainer page, or multi-menu app shell.

## Out Of Scope

- Statistics dashboard.
- Debugger views.
- Trace dock.
- Contract-review page.
- Role or persona navigation.
- Separate runtime/debug/block-maintenance pages.
- Per-node apply, duplicate, or delete buttons in the right panel.
- Final visual design.
- Production frontend implementation.
