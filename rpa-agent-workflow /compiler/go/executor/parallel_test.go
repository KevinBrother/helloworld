package executor

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"rpa-agent-workflow/contracts/ast"
)

func TestRunWorkflowRejectsParallelSharedVariableWrites(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-conflict"},
		Variables: []ast.Variable{
			{Name: "shared", Type: ast.Type{Name: "string"}},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Branches: []ast.Branch{
						{
							ID: "left",
							Body: []ast.Statement{
								{
									ID:     "left-write",
									Kind:   "assign",
									Target: "shared",
									Value:  &ast.Expression{Kind: "literal", Value: "a"},
								},
							},
						},
						{
							ID: "right",
							Body: []ast.Statement{
								{
									ID:     "right-write",
									Kind:   "assign",
									Target: "shared",
									Value:  &ast.Expression{Kind: "literal", Value: "b"},
								},
							},
						},
					},
				},
			},
		},
	}

	_, err := RunWorkflow(context.Background(), workflow, Options{})
	if err == nil {
		t.Fatal("expected error")
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}
	if runtimeErr.Phase != PhaseExecute {
		t.Fatalf("phase = %q, want %q", runtimeErr.Phase, PhaseExecute)
	}
	if runtimeErr.WorkflowID != "parallel-conflict" {
		t.Fatalf("workflow ID = %q, want %q", runtimeErr.WorkflowID, "parallel-conflict")
	}
	if runtimeErr.StatementID != "run-both" {
		t.Fatalf("statement ID = %q, want %q", runtimeErr.StatementID, "run-both")
	}
	if runtimeErr.StatementKind != "parallel" {
		t.Fatalf("statement kind = %q, want %q", runtimeErr.StatementKind, "parallel")
	}
	if runtimeErr.BranchID != "right" {
		t.Fatalf("branch ID = %q, want %q", runtimeErr.BranchID, "right")
	}
	if runtimeErr.Error() != `execute: shared write to "shared"` {
		t.Fatalf("error = %q, want shared write error", runtimeErr.Error())
	}
}

func TestRunWorkflowCollectsStatementTraceEvents(t *testing.T) {
	recorder := &testRecorder{}
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-trace"},
		Variables: []ast.Variable{
			{Name: "left", Type: ast.Type{Name: "string"}},
			{Name: "right", Type: ast.Type{Name: "string"}},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Branches: []ast.Branch{
						{
							ID: "left",
							Body: []ast.Statement{
								{
									ID:     "left-write",
									Kind:   "assign",
									Target: "left",
									Value:  &ast.Expression{Kind: "literal", Value: "a"},
								},
							},
						},
						{
							ID: "right",
							Body: []ast.Statement{
								{
									ID:     "right-write",
									Kind:   "assign",
									Target: "right",
									Value:  &ast.Expression{Kind: "literal", Value: "b"},
								},
							},
						},
					},
				},
				{
					ID:   "return-values",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"left":  {Kind: "ref", Ref: "var.left"},
						"right": {Kind: "ref", Ref: "var.right"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{Recorder: recorder})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := result.Returns["left"]; got != "a" {
		t.Fatalf("return left = %#v, want %q", got, "a")
	}
	if got := result.Returns["right"]; got != "b" {
		t.Fatalf("return right = %#v, want %q", got, "b")
	}
	if !reflect.DeepEqual(result.Events, recorder.events) {
		t.Fatalf("result events = %#v, want %#v", result.Events, recorder.events)
	}

	gotTrace := make([]string, len(result.Events))
	for i, event := range result.Events {
		branchID, _ := event.Payload["branchId"].(string)
		gotTrace[i] = event.Name + ":" + event.StatementID + ":" + branchID
	}

	wantTrace := []string{
		"workflow.start::",
		"statement.start:root:",
		"statement.start:run-both:",
		"parallel.branch.start:run-both:left",
		"statement.start:left-write:",
		"variable.write::",
		"statement.end:left-write:",
		"parallel.branch.end:run-both:left",
		"parallel.branch.start:run-both:right",
		"statement.start:right-write:",
		"variable.write::",
		"statement.end:right-write:",
		"parallel.branch.end:run-both:right",
		"statement.end:run-both:",
		"statement.start:return-values:",
		"statement.end:return-values:",
		"statement.end:root:",
		"workflow.end::",
	}

	if !reflect.DeepEqual(gotTrace, wantTrace) {
		t.Fatalf("trace = %#v, want %#v", gotTrace, wantTrace)
	}
}

func TestRunWorkflowRejectsUnsupportedParallelJoinPolicy(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-join"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Join: &ast.ParallelJoin{
						Strategy: "any",
					},
					Branches: []ast.Branch{
						{
							ID:   "left",
							Body: []ast.Statement{},
						},
						{
							ID:   "right",
							Body: []ast.Statement{},
						},
					},
				},
			},
		},
	}

	_, err := RunWorkflow(context.Background(), workflow, Options{})
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, ErrUnsupportedFeature) {
		t.Fatalf("expected ErrUnsupportedFeature, got %v", err)
	}
}
