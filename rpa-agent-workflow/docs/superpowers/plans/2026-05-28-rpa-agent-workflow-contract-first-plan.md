# RPA Agent Workflow Contract-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a contract-first workflow engine with v1-complete IAST/IBlock schemas, a Go compiler that validates and compiles workflows to Python, and a Python runtime that executes structured control flow including parallel branches.

**Architecture:** Keep the contract in JSON Schema plus typed Go models, keep compiler logic in focused validation/codegen packages, and keep the Python runtime small but structured. The first useful end-to-end path is: sample `ast.json` + `block.json` -> Go CLI -> generated Python -> Python runtime execution with trace events. The compiler must understand the full v1 contract even when the runtime only ships a few built-in blocks.

**Tech Stack:** Go, Python 3, JSON Schema, pnpm-managed docs/examples only if needed later, pytest/unittest for runtime tests.

---

### Task 1: Create repository skeleton for compiler, runtime, schemas, and examples

**Files:**
- Create: `cmd/rpawf/main.go`
- Create: `internal/ast/doc.go`
- Create: `internal/block/doc.go`
- Create: `internal/schema/doc.go`
- Create: `internal/compiler/doc.go`
- Create: `internal/diagnostic/doc.go`
- Create: `internal/codegen/python/doc.go`
- Create: `runtime/python/rpa_runtime/__init__.py`
- Create: `runtime/python/rpa_runtime/runtime.py`
- Create: `runtime/python/rpa_runtime/blocks/__init__.py`
- Create: `runtime/python/rpa_runtime/blocks/core.py`
- Create: `runtime/python/rpa_runtime/blocks/system.py`
- Create: `schemas/ast.schema.json`
- Create: `schemas/block.schema.json`
- Create: `examples/sample-workflow/ast.json`
- Create: `examples/sample-workflow/block.json`
- Create: `examples/sample-workflow/README.md`

- [ ] **Step 1: Write the failing test**

```go
package main

import (
	"os/exec"
	"strings"
	"testing"
)

func TestCompileHelpOutput(t *testing.T) {
	cmd := exec.Command("go", "run", "./cmd/rpawf", "compile", "--help")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if !strings.Contains(string(out), "Usage") {
		t.Fatalf("missing usage output:\n%s", out)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./cmd/rpawf -v`
Expected: FAIL because the package does not yet compile.

- [ ] **Step 3: Write minimal implementation**

```go
package main

func main() {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./cmd/rpawf -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cmd/rpawf runtime/python schemas examples internal
git commit -m "chore: scaffold compiler and runtime layout"
```

### Task 2: Define v1 JSON Schema for IAST and IBlock

**Files:**
- Create: `schemas/ast.schema.json`
- Create: `schemas/block.schema.json`
- Create: `examples/sample-workflow/ast.json`
- Create: `examples/sample-workflow/block.json`

- [ ] **Step 1: Write the failing test**

```go
// internal/schema/schema_test.go
package schema_test

import (
	"os"
	"testing"
)

func TestAstSchemaFileExists(t *testing.T) {
	if _, err := os.Stat("schemas/ast.schema.json"); err != nil {
		t.Fatal(err)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/schema -v`
Expected: FAIL because the schema file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add JSON Schema documents with required root fields, statement unions, type definitions, and metadata namespaces.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/schema -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add schemas examples internal
git commit -m "feat: add workflow schemas"
```

### Task 3: Implement typed Go models for IAST and IBlock

**Files:**
- Create: `internal/ast/types.go`
- Create: `internal/block/types.go`
- Create: `internal/schema/load.go`
- Create: `internal/schema/load_test.go`

- [ ] **Step 1: Write the failing test**

```go
// internal/ast/types_test.go
package ast

import "testing"

func TestWorkflowHasVersion(t *testing.T) {
	var w Workflow
	if w.SchemaVersion != "" {
		t.Fatal("zero value should be empty")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/ast ./internal/block ./internal/schema -v`
Expected: FAIL because the types do not yet exist.

- [ ] **Step 3: Write minimal implementation**

Define Go structs mirroring schema fields for workflows, statements, expressions, block definitions, ports, runtime bindings, and metadata.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/ast ./internal/block ./internal/schema -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/ast internal/block internal/schema
git commit -m "feat: add typed AST and block models"
```

### Task 4: Implement schema loading and validation

**Files:**
- Create: `internal/schema/validator.go`
- Create: `internal/schema/validator_test.go`
- Modify: `cmd/rpawf/main.go`

- [ ] **Step 1: Write the failing test**

```go
func TestValidateAstRejectsInvalidDocument(t *testing.T) {
	_, err := ValidateAst([]byte(`{"schemaVersion":"1.0.0"}`))
	if err == nil {
		t.Fatal("expected validation error")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/schema -v`
Expected: FAIL because `ValidateAst` is undefined.

- [ ] **Step 3: Write minimal implementation**

Implement JSON parsing, schema loading, and error reporting with JSON path strings.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/schema -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/schema cmd/rpawf
git commit -m "feat: validate workflow schemas"
```

### Task 5: Implement diagnostic model and error mapping

**Files:**
- Create: `internal/diagnostic/diagnostic.go`
- Create: `internal/diagnostic/diagnostic_test.go`

- [ ] **Step 1: Write the failing test**

```go
func TestDiagnosticFormatsPath(t *testing.T) {
	d := Diagnostic{Code: "TYPE_MISMATCH", Path: "$.body[0]"}
	if d.Path != "$.body[0]" {
		t.Fatal("path not preserved")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/diagnostic -v`
Expected: FAIL because the package is not implemented.

- [ ] **Step 3: Write minimal implementation**

Add severity, code, message, JSON path, related id, and hint fields.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/diagnostic -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/diagnostic
git commit -m "feat: add compiler diagnostics"
```

### Task 6: Implement AST semantic validation and type checking

**Files:**
- Create: `internal/compiler/validate.go`
- Create: `internal/compiler/validate_test.go`

- [ ] **Step 1: Write the failing test**

```go
func TestRejectsUnknownBlock(t *testing.T) {
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":[{"id":"s1","kind":"callBlock","block":"missing"}]}`), nil)
	if len(diags) == 0 {
		t.Fatal("expected diagnostic")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/compiler -v`
Expected: FAIL because `ValidateWorkflow` is undefined.

- [ ] **Step 3: Write minimal implementation**

Implement symbol tables, scope checks, reference checks, branch write checks, and type compatibility checks.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/compiler -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/compiler
git commit -m "feat: add workflow semantic validation"
```

### Task 7: Implement Python code generation

**Files:**
- Create: `internal/codegen/python/generator.go`
- Create: `internal/codegen/python/generator_test.go`
- Modify: `cmd/rpawf/main.go`

- [ ] **Step 1: Write the failing test**

```go
func TestGeneratePythonIncludesMain(t *testing.T) {
	src, err := Generate(workflow, blocks)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(src, "async def main") {
		t.Fatal("missing main")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/codegen/python -v`
Expected: FAIL because generator is undefined.

- [ ] **Step 3: Write minimal implementation**

Generate async Python with embedded metadata, runtime imports, and statement dispatch.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/codegen/python -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/codegen/python cmd/rpawf
git commit -m "feat: generate python workflows"
```

### Task 8: Implement the Python runtime core

**Files:**
- Create: `runtime/python/rpa_runtime/runtime.py`
- Create: `runtime/python/rpa_runtime/blocks/core.py`
- Create: `runtime/python/rpa_runtime/blocks/system.py`
- Create: `runtime/python/tests/test_runtime.py`
- Create: `runtime/python/pyproject.toml`

- [ ] **Step 1: Write the failing test**

```python
from rpa_runtime.runtime import WorkflowRuntime

def test_log_block_runs():
    runtime = WorkflowRuntime()
    result = runtime.call_block("core.log", {"message": "hello"})
    assert result is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest runtime/python/tests/test_runtime.py -q`
Expected: FAIL because runtime is undefined.

- [ ] **Step 3: Write minimal implementation**

Implement workflow context, block registry, sync/async invocation, parallel branch execution, trace events, and two built-in blocks.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest runtime/python/tests/test_runtime.py -q`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add runtime/python
git commit -m "feat: add python workflow runtime"
```

### Task 9: Add end-to-end sample workflow with parallel branches

**Files:**
- Create: `examples/sample-workflow/run.sh`
- Modify: `examples/sample-workflow/README.md`
- Create: `examples/sample-workflow/tests/test_sample.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail
go run ./cmd/rpawf compile examples/sample-workflow/ast.json examples/sample-workflow/block.json > /tmp/workflow.py
python3 /tmp/workflow.py
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash examples/sample-workflow/tests/test_sample.sh`
Expected: FAIL because the compiler and runtime are not yet wired end to end.

- [ ] **Step 3: Write minimal implementation**

Provide a sample workflow that runs `core.log` and `system.get_os_info` in parallel and returns merged output.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash examples/sample-workflow/tests/test_sample.sh`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add examples/sample-workflow
git commit -m "feat: add parallel workflow example"
```

### Task 10: Wire the CLI entrypoint for compile and run

**Files:**
- Modify: `cmd/rpawf/main.go`
- Create: `cmd/rpawf/main_test.go`

- [ ] **Step 1: Write the failing test**

```go
func TestCLICompileCommandExists(t *testing.T) {
	cmd := exec.Command("go", "run", "./cmd/rpawf", "compile", "--help")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if !strings.Contains(string(out), "Usage") {
		t.Fatalf("missing usage output:\n%s", out)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./cmd/rpawf -v`
Expected: FAIL because the CLI has no commands yet.

- [ ] **Step 3: Write minimal implementation**

Support `compile` and `run` subcommands with explicit file arguments and clear exit codes.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./cmd/rpawf -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cmd/rpawf
git commit -m "feat: add compiler cli"
```

### Task 11: Add compiler and runtime tests for invalid workflows

**Files:**
- Create: `internal/compiler/fixtures/invalid_unknown_block.json`
- Create: `internal/compiler/fixtures/invalid_parallel_write.json`
- Create: `internal/compiler/fixtures/invalid_type_mismatch.json`
- Create: `internal/compiler/fixtures/invalid_illegal_scope.json`
- Create: `internal/compiler/validator_integration_test.go`

- [ ] **Step 1: Write the failing test**

```go
func TestInvalidFixturesProduceDiagnostics(t *testing.T) {
	// load each fixture and assert a diagnostic code
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/compiler -v`
Expected: FAIL because the fixtures and assertions are not yet present.

- [ ] **Step 3: Write minimal implementation**

Add fixtures that exercise each major validation path and assert exact diagnostic codes.

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/compiler -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/compiler
git commit -m "test: cover workflow validation failures"
```

### Task 12: Verify the full workflow chain and clean up docs

**Files:**
- Modify: `examples/sample-workflow/README.md`
- Modify: `docs/TODO.md`

- [ ] **Step 1: Write the failing test**

```bash
go test ./...
pytest runtime/python/tests -q
bash examples/sample-workflow/tests/test_sample.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run all verification commands above.
Expected: any remaining failure points identify the last missing contract piece.

- [ ] **Step 3: Write minimal implementation**

Fix remaining integration bugs, then remove stale TODO wording only after the sample workflow passes.

- [ ] **Step 4: Run test to verify it passes**

Run all verification commands above.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/TODO.md examples runtime internal cmd schemas
git commit -m "feat: complete contract-first workflow chain"
```
