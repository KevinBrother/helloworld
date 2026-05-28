#!/usr/bin/env bash
set -euo pipefail
go run ./cmd/rpawf compile examples/sample-workflow/ast.json examples/sample-workflow/block.json > /tmp/rpawf-sample.py
PYTHONPATH=runtime/python python3 /tmp/rpawf-sample.py
