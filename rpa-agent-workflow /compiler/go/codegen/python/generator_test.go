package python

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

func TestGeneratePythonIncludesMain(t *testing.T) {
	src, err := Generate(&ast.Workflow{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(src, "async def main") {
		t.Fatal("missing main")
	}
}

func TestGeneratedPythonCompilesForV1Workflow(t *testing.T) {
	value := ast.Expression{Kind: "literal", Value: "ok"}
	src, err := Generate(&ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow: ast.Metadata{ID: "wf"},
		Variables: []ast.Variable{{Name: "x", Type: ast.Type{Name: "string"}}},
		Workflows: []ast.SubWorkflow{{
			ID: "child",
			Body: ast.Statement{ID: "child_return", Kind: "return", Returns: map[string]ast.Expression{}},
		}},
		Body: ast.Statement{
			ID: "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "a", Kind: "assign", Target: "x", Value: &value},
				{ID: "c", Kind: "callWorkflow", Workflow: "child"},
				{ID: "r", Kind: "return", Returns: map[string]ast.Expression{"x": {Kind: "ref", Ref: "var.x"}}},
			},
		},
	}, map[string]block.Definition{
		"core.log": {ID: "core.log", Runtime: block.RuntimeBinding{Target: "python", Module: "rpa_runtime.blocks.core", Callable: "log", Mode: "sync"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "workflow.py")
	if err := os.WriteFile(path, []byte(src), 0o644); err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command("python3", "-m", "py_compile", path)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("generated python did not compile: %v\n%s\n%s", err, out, src)
	}
}
