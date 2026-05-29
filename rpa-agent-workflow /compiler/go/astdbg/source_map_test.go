package astdbg

import (
	"context"
	"os"
	"testing"
	"time"

	"rpa-agent-workflow/compiler/go/executor"
	"rpa-agent-workflow/contracts/ast"
)

func TestSourceMapResolvesNestedStatements(t *testing.T) {
	source := readDebuggableAST(t)

	sourceMap, err := BuildSourceMap(source)
	if err != nil {
		t.Fatalf("build source map: %v", err)
	}

	tests := []struct {
		id   string
		kind string
		path string
	}{
		{id: "root", kind: "sequence", path: "$.body"},
		{id: "assign-start", kind: "assign", path: "$.body.statements[0]"},
		{id: "then-log", kind: "callBlock", path: "$.body.statements[1].then[0]"},
		{id: "else-return", kind: "return", path: "$.body.statements[1].else[0]"},
		{id: "left-call", kind: "callWorkflow", path: "$.body.statements[2].branches[0].body[0]"},
		{id: "right-call", kind: "callBlock", path: "$.body.statements[2].branches[1].body[0]"},
		{id: "try-call", kind: "callBlock", path: "$.body.statements[3].statements[0]"},
		{id: "catch-assign", kind: "assign", path: "$.body.statements[3].catches[0].body[0]"},
		{id: "finally-assign", kind: "assign", path: "$.body.statements[3].finally[0]"},
		{id: "return-done", kind: "return", path: "$.body.statements[4]"},
		{id: "child-return", kind: "return", path: "$.workflows[0].body"},
	}

	for _, tt := range tests {
		t.Run(tt.id, func(t *testing.T) {
			loc, ok := sourceMap.Statement(tt.id)
			if !ok {
				t.Fatalf("statement %q was not mapped", tt.id)
			}
			if loc.StatementID != tt.id {
				t.Fatalf("statement id = %q, want %q", loc.StatementID, tt.id)
			}
			if loc.StatementKind != tt.kind {
				t.Fatalf("statement kind = %q, want %q", loc.StatementKind, tt.kind)
			}
			if loc.JSONPath != tt.path {
				t.Fatalf("json path = %q, want %q", loc.JSONPath, tt.path)
			}
			if loc.Line != lineOfStatementID(t, source, tt.id) {
				t.Fatalf("line = %d, want id line %d", loc.Line, lineOfStatementID(t, source, tt.id))
			}
			if loc.Column != columnOfStatementID(t, source, tt.id) {
				t.Fatalf("column = %d, want id column %d", loc.Column, columnOfStatementID(t, source, tt.id))
			}
		})
	}

	line := lineOfStatementID(t, source, "right-call")
	locations := sourceMap.StatementsForLine(line)
	if len(locations) != 1 {
		t.Fatalf("locations on line %d = %d, want 1: %#v", line, len(locations), locations)
	}
	if locations[0].StatementID != "right-call" {
		t.Fatalf("line %d statement = %q, want %q", line, locations[0].StatementID, "right-call")
	}
}

func TestSessionResolvesLineBreakpoint(t *testing.T) {
	source := readDebuggableAST(t)
	sourceMap, err := BuildSourceMap(source)
	if err != nil {
		t.Fatalf("build source map: %v", err)
	}

	line := lineOfStatementID(t, source, "assign-start")
	breakpoint, ok := sourceMap.BreakpointForLine(line)
	if !ok {
		t.Fatalf("line %d did not resolve to a breakpoint", line)
	}

	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "assign-start", Kind: "assign", Target: "seed", Value: &ast.Expression{Kind: "literal", Value: "start"}},
				{ID: "return-done", Kind: "return", Returns: map[string]ast.Expression{"status": {Kind: "literal", Value: "done"}}},
			},
		},
	}
	session := NewSession(workflow, Options{})
	session.SetBreakpoints([]Breakpoint{breakpoint})

	runCh := make(chan error, 1)
	go func() {
		_, err := executor.RunWorkflow(context.Background(), workflow, executor.Options{DebugHook: session})
		runCh <- err
	}()

	waitForStopReason(t, session, StopReasonEntry)
	if err := session.Continue(); err != nil {
		t.Fatalf("continue: %v", err)
	}

	waitForStopReason(t, session, StopReasonBreakpoint)
	if got := session.Snapshot().StatementID; got != "assign-start" {
		t.Fatalf("statement id = %q, want %q", got, "assign-start")
	}

	if err := session.Continue(); err != nil {
		t.Fatalf("continue after breakpoint: %v", err)
	}
	waitForSourceMapRun(t, runCh)
}

func TestSourceMapIgnoresNonStatementIDs(t *testing.T) {
	source := []byte(`{
  "schemaVersion": "1.0.0",
  "workflow": {
    "id": "root"
  },
  "body": {
    "id": "root",
    "kind": "parallel",
    "branches": [
      {
        "id": "branch-statement",
        "body": [
          {
            "id": "branch-statement",
            "kind": "assign",
            "target": "x",
            "value": {
              "kind": "literal",
              "value": "ok"
            }
          }
        ]
      }
    ]
  }
}`)

	sourceMap, err := BuildSourceMap(source)
	if err != nil {
		t.Fatalf("build source map: %v", err)
	}

	root, ok := sourceMap.Statement("root")
	if !ok {
		t.Fatal("root statement was not mapped")
	}
	if root.Line != 7 {
		t.Fatalf("root line = %d, want statement id line 7", root.Line)
	}

	branchStatement, ok := sourceMap.Statement("branch-statement")
	if !ok {
		t.Fatal("branch statement was not mapped")
	}
	if branchStatement.Line != 14 {
		t.Fatalf("branch-statement line = %d, want statement id line 14", branchStatement.Line)
	}
}

func readDebuggableAST(t *testing.T) []byte {
	t.Helper()
	source, err := os.ReadFile("testdata/debuggable_ast.json")
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	return source
}

func waitForSourceMapRun(t *testing.T, ch <-chan error) error {
	t.Helper()
	select {
	case err := <-ch:
		return err
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for run to finish")
		return nil
	}
}

func lineOfStatementID(t *testing.T, source []byte, id string) int {
	t.Helper()
	line, _ := positionOfStatementID(t, source, id)
	return line
}

func columnOfStatementID(t *testing.T, source []byte, id string) int {
	t.Helper()
	_, column := positionOfStatementID(t, source, id)
	return column
}

func positionOfStatementID(t *testing.T, source []byte, id string) (int, int) {
	t.Helper()
	needle := []byte(`"id": "` + id + `"`)
	index := -1
	for i := 0; i+len(needle) <= len(source); i++ {
		if string(source[i:i+len(needle)]) == string(needle) {
			index = i
			break
		}
	}
	if index < 0 {
		t.Fatalf("id %q not found in source", id)
	}

	line, column := 1, 1
	for i := 0; i < index; i++ {
		if source[i] == '\n' {
			line++
			column = 1
			continue
		}
		column++
	}
	return line, column
}
