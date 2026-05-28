#!/usr/bin/env bash
set -euo pipefail
go test ./cmd/rpawf -v
PYTHONPATH=runtime/python python3 -m unittest discover -s runtime/python/tests -p 'test_*.py' -v
go run ./cmd/rpawf compile examples/sample-workflow/ast.json examples/sample-workflow/block.json > /tmp/rpawf-sample.py
PYTHONPATH=runtime/python python3 /tmp/rpawf-sample.py
