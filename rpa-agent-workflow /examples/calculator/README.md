# Calculator Workflow

This directory is a workflow-level example. It is not a Block SDK and it does not
define `math.calculate`; that block is defined and implemented by the Python SDK:

- Interface: `sdks/python/blocks/math/calculate/block.json`
- Implementation: `sdks/python/rpa_sdk/blocks/math/calculate.py`

`ast.json` is the calculator workflow. It declares runtime inputs `left`,
`operator`, and `right`, calls `math.calculate`, writes the block output to
`var.result`, and returns `result`.

The `input-*.json` files are plain runtime input payloads for this workflow. They
are not AST schema or Block schema documents.

## Execute AST Directly

Run the AST through the Go executor and Python SDK host:

```sh
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-add.json
```

Try the other payloads:

```sh
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-subtract.json
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-multiply.json
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-divide.json
```

The divide-by-zero payload demonstrates block error propagation:

```sh
go run ./apps/cli/rpawf exec examples/calculator/ast.json sdks/python/blocks examples/calculator/input-divide-by-zero.json
```

## Generate Python

Compile the same AST plus SDK block manifests into a Python workflow:

```sh
mkdir -p output
go run ./apps/cli/rpawf compile examples/calculator/ast.json sdks/python/blocks > output/calculator.py
```

The generated Python imports the SDK runtime and block bindings from
`sdks/python`. The generated workflow currently runs without an input JSON
argument, so direct `rpawf exec` is the path to test runtime inputs for this
example.

## Project UI Node

Project the calculator AST into the UI-node contract:

```sh
mkdir -p output
go run ./apps/cli/rpawf project-ui examples/calculator/ast.json > output/calculator-ui-node.json
```

This validates the AST can be represented by the editor-facing projection.

## Debug

Start an interactive debug session for the calculator workflow:

```sh
go run ./apps/cli/rpawf debug examples/calculator/ast.json sdks/python/blocks
```

Useful debug commands include:

```text
break calculate
continue
where
vars
locals
stack
quit
```

The current debug command accepts the AST and block manifests. It does not accept
an input JSON argument yet, so expressions that depend on `input.left`,
`input.operator`, or `input.right` will need CLI input support before calculator
debugging can run through the block call with real payload values.

