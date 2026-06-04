# UI Handoff

## Visual Priority

- Canvas is the primary surface.
- Selected node state must be obvious.
- Right parameter panel must be stable and easy to scan.
- Parameter relationships and source choices are the main interaction.
- The three work panels should share the same height, with internal scrolling.
- The run log should sit at the bottom and collapse without resizing the main panels unpredictably.

## Design Notes

- Keep the interface dense and operational.
- Avoid dashboards, large metric cards, and decorative summary panels.
- Avoid debugger-like panels.
- Use clear field grouping for parameters, source choices, and outputs.
- Keep controls familiar: selects for fixed options, inputs for literals, pickers for valid sources.
- Avoid exposing internal reference syntax as the visible value.
- Use a JSON-like tree for node inputs and outputs, but make value cells editable controls instead of raw JSON.
- Source choices stay collapsed by default and open only from the value cell.
- Source choices must be filtered by field type; a `number` field cannot choose a `string` source.
- Value cells display resolved values. The model stores references internally.
- `Workflow Inputs` shows only workflow input fields.
- Real nodes show editable inputs and declared outputs.
- Real node outputs do not show downstream usage.
- `Return result` shows only workflow output fields.
- Return output fields can wrap/select previous node outputs.
- Right panel edits take effect immediately. There is no local apply button.

## Components Needing High-Fidelity Design

- Canvas node cards.
- Branch layout.
- Node selection state.
- Parameter editor rows.
- Reference picker.
- Block insertion list.
- Test run modal.
