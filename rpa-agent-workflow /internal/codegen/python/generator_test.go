package python

import (
	"strings"
	"testing"

	"rpa-agent-workflow/internal/ast"
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
