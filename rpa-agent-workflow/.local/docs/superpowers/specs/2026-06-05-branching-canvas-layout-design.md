# Branching Canvas Layout Design

## Purpose

The workflow canvas must render `if` and `parallel` as real branch containers, not as ordinary vertical nodes. A control-flow node must show a fan-out head, per-branch lanes, branch-local insertion controls, a visual join, and a continuation point after the join.

This design is required because new `if` and `parallel` nodes currently appear as linear cards. That makes the workflow semantics wrong and makes insertion anchors ambiguous.

## Confirmed Rules

- `if` and `parallel` both have minimum branch count `2`.
- Their default branch count is also `2`.
- `if` branch count means total visible branches:
  - `2` means `条件 1 + 否则`.
  - Clicking the fan-out `+` adds another condition branch before `否则`.
  - Example after one add: `条件 1 + 条件 2 + 否则`.
- `parallel` branch count means total parallel lanes:
  - `2` means `并行 1 + 并行 2`.
  - Clicking the fan-out `+` appends another parallel lane.
- Every branch closes into a join, even when the branch is empty.
- The join is a visual canvas construct and does not become a standalone AST statement.

## Plus Controls

The canvas must distinguish three kinds of `+` controls:

- Fan-out `+`: placed on the center line below the control-flow head. It adds a branch.
- Branch start `+`: placed above a branch's first node. It inserts a node at the start of that branch.
- Branch end `+`: placed below a branch's last node. It appends a node to the end of that branch.

Empty branches must not show duplicate start and end controls. An empty branch shows one placeholder insertion control that inserts the first node in that branch.

After the join, the main sequence shows a normal continuation `+` for appending the next statement after the whole control-flow block.

## Visual Structure

`if` layout:

- A single control-flow head card centered on the main flow.
- A fan-out `+` below the head to add another condition branch.
- Branch lanes arranged horizontally.
- The final `else` lane remains visually last.
- Every non-else condition branch has an editable condition label.
- Branch-local nodes render as ordinary action cards inside their lane.
- Branch lanes converge into a visual join.
- The main flow continues below the join.

`parallel` layout:

- A single parallel head card centered on the main flow.
- A fan-out `+` below the head to add another parallel lane.
- Parallel lanes arranged horizontally.
- Each lane has start/end insertion controls.
- Branch lanes converge into a visual join.
- The main flow continues below the join.

## Data Model Direction

The current AST supports legacy two-way `if` using `condition`, `then`, and `else`; `parallel` uses `branches`. To support multiple condition branches cleanly, `if` needs a canonical branch-list representation.

The preferred model is:

- Keep legacy `condition` / `then` / `else` readable for existing workflows.
- Add support for `if.branches` as the canonical multi-branch form.
- Each `if.branches[]` item may have:
  - `id`
  - `label`
  - `condition` for conditional branches
  - `body`
  - `default` or equivalent marker for the final else branch
- Execution should prefer `if.branches` when present; otherwise it should run the legacy `condition` / `then` / `else` form.
- Projection should normalize both legacy and canonical forms into the same UI branch model.

This keeps existing workflows compatible while giving the editor a scalable representation for 2+ condition branches.

## Insertion Semantics

Branch insertion anchors must include branch context. The editor must not rely only on `afterNodeId -> beforeNodeId` for branch structures.

Required anchor information:

- target control-flow node id
- branch id
- insertion position:
  - branch start
  - branch end
  - between two branch-local nodes
  - after join in the parent sequence

Adding a branch is a structural edit separate from inserting a node inside a branch.

## Error Handling

- If an insertion anchor is stale, the modal must show the specific server diagnostic.
- After a successful structural edit, the UI must use the server-returned projection immediately.
- Local run-input drafts must never overwrite server-returned structure.

## Testing Requirements

- Unit tests for layout:
  - legacy `if` renders as two branches.
  - canonical multi-branch `if` renders condition branches plus else.
  - `parallel` renders one lane per branch.
  - empty branches show one insertion control.
  - branch lanes close into a join.
- Unit tests for edit operations:
  - add `if` branch inserts before else.
  - add `parallel` branch appends a lane.
  - insert node at branch start.
  - insert node at branch end.
  - insert node between branch-local nodes.
- Browser verification:
  - create `if`, add a condition branch, insert nodes in each branch.
  - create `parallel`, add a lane, insert nodes in each lane.
  - verify no stale `root -> first_node` anchors are used inside branches.

## Non-Goals

- No animation work in the first implementation.
- No branch deletion in the first implementation unless it is needed for safe tests.
- No freeform drag-and-drop branch rearrangement in the first implementation.

