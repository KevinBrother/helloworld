#!/usr/bin/env bash
set -euo pipefail
mkdir -p output
go run ./apps/cli/rpawf compile examples/sample-workflow/ast.json examples/sample-workflow/block.json > output/workflow.py
uv --project runtimes/python run python output/workflow.py
