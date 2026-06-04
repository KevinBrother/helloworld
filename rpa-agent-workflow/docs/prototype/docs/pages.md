# Workbench

## Single Surface

Purpose: build and configure workflow nodes.

Regions:
- Header with Save Workflow and Test Run actions.
- Left, center, and right panels share the same available height.
- Left panel scrolls when the block list grows.
- Center canvas shows workflow inputs, real node input/output counts, and workflow outputs according to node kind.
- Right panel edits the selected item:
  - `Workflow Inputs`: workflow input values only.
  - Real nodes: input parameters and declared outputs.
  - `Return result`: workflow output values only.
- Bottom collapsible log stays attached to the bottom of the workbench.

Rules:
- This prototype has one Workbench. It has no role pages, dashboard pages, debugger, trace view, contract page, or block-maintenance page.
- Source choices open from value cells.
- Source choices are type-matched before rendering.
- Value cells show resolved values, not internal reference ids.
