#!/usr/bin/env bash
set -euo pipefail
go test ./apps/cli/rpawf -v
uv --project runtimes/python run python -m unittest discover -s runtimes/python/tests -p 'test_*.py' -v
mkdir -p output
go run ./apps/cli/rpawf compile examples/sample-workflow/ast.json examples/sample-workflow/block.json > output/workflow.py
uv --project runtimes/python run python output/workflow.py
