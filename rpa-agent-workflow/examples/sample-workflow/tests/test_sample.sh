#!/usr/bin/env bash
set -euo pipefail
go test ./apps/cli/rpawf -v
uv --project sdks/python run python -m unittest discover -s sdks/python/tests -p 'test_*.py' -v
mkdir -p output
go run ./apps/cli/rpawf compile examples/sample-workflow/ast.json sdks/python/blocks > output/workflow.py
go run ./apps/cli/rpawf project-ui examples/sample-workflow/ast.json > output/ui-node.json
test -s output/ui-node.json
uv --project sdks/python run python output/workflow.py
