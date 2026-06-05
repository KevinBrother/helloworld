#!/usr/bin/env bash
set -euo pipefail
mkdir -p output
go run ./apps/cli/rpawf compile examples/sample-workflow/ast.json sdks/block > output/workflow.py
uv --project sdks/python run python output/workflow.py
