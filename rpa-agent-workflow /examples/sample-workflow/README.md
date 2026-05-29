# Sample Workflow

This directory holds the minimal contract-first workflow example.

Compile to Python and run through the Python runtime:

```sh
go run ./apps/cli/rpawf compile examples/sample-workflow/ast.json examples/sample-workflow/block.json > output/workflow.py
uv --project runtimes/python run python output/workflow.py
```

Run the same `ast.json` directly through the Go executor and Python block host:

```sh
go run ./apps/cli/rpawf exec examples/sample-workflow/ast.json examples/sample-workflow/block.json
```
