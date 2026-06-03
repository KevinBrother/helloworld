# Calculator If AST Design

## Goal

Extend `examples/calculator/ast.json` so the active calculator example demonstrates a richer AST shape, including an `if` control-flow node, while preserving the existing calculator execution contract.

## Design

The calculator workflow keeps `left`, `operator`, and `right` as runtime inputs and still returns numeric `result`. The first statement becomes an `if` that checks whether `input.operator == "noop"`. The then branch assigns `var.result` from `input.left`, giving the sample a block-free branch. The else branch runs the existing `math.calculate` block, so add, subtract, multiply, divide, and divide-by-zero behavior remain covered.

This keeps the example simple enough for the Web editor to project while adding visible branch structure. No runtime, compiler, schema, or frontend code changes are required.

## Testing

The CLI calculator regression will assert that the real calculator AST contains an `if` statement and that both branches execute: existing arithmetic inputs exercise the else branch, and a new `input-noop.json` fixture exercises the then branch.
