# RPA Agent Workflow Editor Prototype

This is a clickable low-fidelity React prototype for the UI refactor. It focuses on editing and generating a workflow from canvas nodes.

## Run

```bash
npm install
npm run dev
```

## Purpose

- Put the main canvas at the center of the product.
- Let users click a node and configure its parameters in the right panel.
- Show parameter source choices, selectable values, node outputs, and workflow outputs.
- Keep test run as a lightweight validation action.
- Avoid statistics dashboards, debugger surfaces, trace docks, and contract-review pages.

## Prototype Surface

- One Workbench only.
- Left: node/block library for adding blocks to the canvas.
- Center: workflow canvas.
- Right: selected-node parameter panel.
- Bottom: collapsible test run log.

## Flow Semantics

- `Workflow Inputs` defines the workflow input values. It does not expose node outputs.
- Real nodes use workflow inputs or previous node outputs as parameter sources.
- `Return result` defines the workflow output values. It does not expose node inputs.
- Return output values can wrap/select previous node outputs while showing the resolved value in the editor.

## Confirmed Product Rules

- The prototype has one surface: Workbench.
- There are no statistics dashboards, role pages, runtime debugger, trace view, contract page, block maintainer page, or extra navigation menus.
- The right panel is the main interaction surface for node parameters and workflow outputs.
- Value cells show resolved values. Internal references are stored by the model and are not shown as the visible value.
- Source choices open from the value cell and are collapsed by default.
- Source choices are type matched before rendering. A `number` field cannot choose a `string` source.
- Real node outputs only declare produced values. They do not show downstream usage.
- Right panel edits take effect immediately. There is no per-node apply button.
- Per-node duplicate and delete actions are not part of this prototype.
- Test run is only for validating the current workflow behavior. It is not a debugger.
