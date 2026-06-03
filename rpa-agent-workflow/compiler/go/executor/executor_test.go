package executor

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"

	"rpa-agent-workflow/contracts/ast"
)

func TestRunWorkflowRejectsMissingRootStatement(t *testing.T) {
	_, err := RunWorkflow(context.Background(), ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
	}, Options{})
	if err == nil {
		t.Fatal("expected error")
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}
	if runtimeErr.Phase != PhaseLoad {
		t.Fatalf("expected phase %q, got %q", PhaseLoad, runtimeErr.Phase)
	}
}

func TestEvaluateExpressionResolvesRefsAndTemplates(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{
		Inputs: map[string]any{
			"name": "copilot",
		},
	})
	st.variables["answer"] = 42
	st.frames[len(st.frames)-1].locals["item"] = map[string]any{"label": "alpha"}

	value, err := st.evalExpression(&ast.Expression{
		Kind: "template",
		Items: []ast.Expression{
			{Kind: "literal", Value: "hello "},
			{Kind: "ref", Ref: "input.name"},
			{Kind: "literal", Value: " / "},
			{Kind: "ref", Ref: "var.answer"},
			{Kind: "literal", Value: " / "},
			{Kind: "ref", Ref: "item", Selector: "label"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if value != "hello copilot / 42 / alpha" {
		t.Fatalf("value = %#v", value)
	}
}

func TestEvaluateExpressionRejectsUnknownKind(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{})

	_, err := st.evalExpression(&ast.Expression{Kind: "mystery"})
	if err == nil {
		t.Fatal("expected error")
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}
	if runtimeErr.Phase != PhaseEval {
		t.Fatalf("expected phase %q, got %q", PhaseEval, runtimeErr.Phase)
	}
}

func TestEvaluateExpressionRejectsMissingRefs(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{
		Inputs: map[string]any{
			"name": "copilot",
		},
	})
	st.variables["answer"] = 42
	st.frames[len(st.frames)-1].locals["item"] = "present"

	tests := []struct {
		name    string
		ref     string
		message string
	}{
		{name: "variable", ref: "var.missing", message: `unknown variable ref "var.missing"`},
		{name: "input", ref: "input.missing", message: `unknown local ref "input.missing"`},
		{name: "local", ref: "missing", message: `unknown local ref "missing"`},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, err := st.evalExpression(&ast.Expression{Kind: "ref", Ref: tc.ref})
			if err == nil {
				t.Fatal("expected error")
			}

			var runtimeErr *RuntimeError
			if !errors.As(err, &runtimeErr) {
				t.Fatalf("expected RuntimeError, got %T", err)
			}
			if runtimeErr.Phase != PhaseEval {
				t.Fatalf("expected phase %q, got %q", PhaseEval, runtimeErr.Phase)
			}
			if !strings.Contains(runtimeErr.Error(), tc.message) {
				t.Fatalf("expected error containing %q, got %q", tc.message, runtimeErr.Error())
			}
		})
	}
}

func TestEvaluateExpressionBinaryEqualitySupportsCompositeValues(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{})

	tests := []struct {
		name string
		expr ast.Expression
		want bool
	}{
		{
			name: "equal objects",
			expr: ast.Expression{
				Kind: "binary",
				Op:   "==",
				Left: &ast.Expression{
					Kind: "object",
					Fields: map[string]ast.Expression{
						"label": {Kind: "literal", Value: "alpha"},
					},
				},
				Right: &ast.Expression{
					Kind: "object",
					Fields: map[string]ast.Expression{
						"label": {Kind: "literal", Value: "alpha"},
					},
				},
			},
			want: true,
		},
		{
			name: "different arrays",
			expr: ast.Expression{
				Kind: "binary",
				Op:   "!=",
				Left: &ast.Expression{
					Kind: "array",
					Items: []ast.Expression{
						{Kind: "literal", Value: "alpha"},
					},
				},
				Right: &ast.Expression{
					Kind: "array",
					Items: []ast.Expression{
						{Kind: "literal", Value: "beta"},
					},
				},
			},
			want: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := st.evalExpression(&tc.expr)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %#v want %#v", got, tc.want)
			}
		})
	}
}

func TestEvaluateExpressionSupportsPythonComparisonOperators(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{})

	tests := []struct {
		name string
		expr ast.Expression
		want bool
	}{
		{
			name: "less than numbers",
			expr: ast.Expression{
				Kind: "binary",
				Op:   "<",
				Left: &ast.Expression{Kind: "literal", Value: 1},
				Right: &ast.Expression{
					Kind:  "literal",
					Value: 2,
				},
			},
			want: true,
		},
		{
			name: "greater than strings",
			expr: ast.Expression{
				Kind: "binary",
				Op:   ">",
				Left: &ast.Expression{Kind: "literal", Value: "beta"},
				Right: &ast.Expression{
					Kind:  "literal",
					Value: "alpha",
				},
			},
			want: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := st.evalExpression(&tc.expr)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got %#v want %#v", got, tc.want)
			}
		})
	}
}

func TestEvaluateExpressionRejectsIncompatibleAddition(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{})

	_, err := st.evalExpression(&ast.Expression{
		Kind: "binary",
		Op:   "+",
		Left: &ast.Expression{Kind: "literal", Value: "a"},
		Right: &ast.Expression{
			Kind:  "literal",
			Value: 1,
		},
	})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestEvaluateExpressionRejectsSelectorOnNonObject(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{})

	_, err := st.evalExpression(&ast.Expression{
		Kind:     "literal",
		Value:    "alpha",
		Selector: "label",
	})
	if err == nil {
		t.Fatal("expected error")
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}
	if runtimeErr.Phase != PhaseEval {
		t.Fatalf("expected phase %q, got %q", PhaseEval, runtimeErr.Phase)
	}
	if !strings.Contains(runtimeErr.Error(), `selector "label" requires object value`) {
		t.Fatalf("unexpected error: %q", runtimeErr.Error())
	}
}

func TestEvaluateExpressionRejectsMissingSelectorField(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{})

	_, err := st.evalExpression(&ast.Expression{
		Kind: "object",
		Fields: map[string]ast.Expression{
			"label": {Kind: "literal", Value: "alpha"},
		},
		Selector: "missing",
	})
	if err == nil {
		t.Fatal("expected error")
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}
	if runtimeErr.Phase != PhaseEval {
		t.Fatalf("expected phase %q, got %q", PhaseEval, runtimeErr.Phase)
	}
	if !strings.Contains(runtimeErr.Error(), `unknown selector field "missing"`) {
		t.Fatalf("unexpected error: %q", runtimeErr.Error())
	}
}

func TestRunWorkflowExecutesSequenceAssignIfAndReturn(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "assign-status",
					Kind:   "assign",
					Target: "status",
					Value:  &ast.Expression{Kind: "literal", Value: "ready"},
				},
				{
					ID:   "branch-on-status",
					Kind: "if",
					Condition: &ast.Expression{
						Kind: "binary",
						Op:   "==",
						Left: &ast.Expression{Kind: "ref", Ref: "var.status"},
						Right: &ast.Expression{
							Kind:  "literal",
							Value: "ready",
						},
					},
					Then: []ast.Statement{
						{
							ID:   "return-ready",
							Kind: "return",
							Returns: map[string]ast.Expression{
								"status": {Kind: "ref", Ref: "var.status"},
							},
						},
					},
					Else: []ast.Statement{
						{
							ID:   "return-not-ready",
							Kind: "return",
							Returns: map[string]ast.Expression{
								"status": {Kind: "literal", Value: "not-ready"},
							},
						},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["status"]; got != "ready" {
		t.Fatalf("return status = %#v, want %q", got, "ready")
	}
	if got := result.Variables["status"]; got != "ready" {
		t.Fatalf("variable status = %#v, want %q", got, "ready")
	}

	gotTrace := make([]string, len(result.Events))
	for i, event := range result.Events {
		gotTrace[i] = event.Name + ":" + event.StatementID
	}

	wantTrace := []string{
		"workflow.start:",
		"statement.start:root",
		"statement.start:assign-status",
		"variable.write:",
		"statement.end:assign-status",
		"statement.start:branch-on-status",
		"statement.start:return-ready",
		"statement.end:return-ready",
		"statement.end:branch-on-status",
		"statement.end:root",
		"workflow.end:",
	}

	if !reflect.DeepEqual(gotTrace, wantTrace) {
		t.Fatalf("trace = %#v, want %#v", gotTrace, wantTrace)
	}
}

func TestRunWorkflowAssignWritesStateReference(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "state-writes"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "assign-total",
					Kind:   "assign",
					Target: "state.total_count",
					Value:  &ast.Expression{Kind: "literal", Value: float64(3)},
				},
				{
					ID:   "return-total",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"total_count": {Kind: "ref", Ref: "state.total_count"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["total_count"]; got != float64(3) {
		t.Fatalf("total_count = %#v, want 3", got)
	}
}

func TestRunWorkflowEmitsStatementEndOnError(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "assign-status",
					Kind:   "assign",
					Target: "status",
					Value:  &ast.Expression{Kind: "mystery"},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err == nil {
		t.Fatal("expected error")
	}
	if len(result.Events) != 0 {
		t.Fatalf("result events = %#v, want empty result on error", result.Events)
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}

	recorder := &testRecorder{}
	_, err = RunWorkflow(context.Background(), workflow, Options{Recorder: recorder})
	if err == nil {
		t.Fatal("expected recorder run to error")
	}

	gotTrace := make([]string, len(recorder.events))
	for i, event := range recorder.events {
		gotTrace[i] = event.Name + ":" + event.StatementID
	}

	wantTrace := []string{
		"workflow.start:",
		"statement.start:root",
		"statement.start:assign-status",
		"statement.end:assign-status",
		"statement.end:root",
		"workflow.end:",
	}

	if !reflect.DeepEqual(gotTrace, wantTrace) {
		t.Fatalf("trace = %#v, want %#v", gotTrace, wantTrace)
	}
}

func TestRunWorkflowIfUsesPythonStyleTruthiness(t *testing.T) {
	tests := []struct {
		name      string
		condition any
		want      string
	}{
		{name: "non-empty string", condition: "ready", want: "then"},
		{name: "non-zero number", condition: 1, want: "then"},
		{name: "non-empty array", condition: []any{"item"}, want: "then"},
		{name: "non-empty object", condition: map[string]any{"ok": true}, want: "then"},
		{name: "empty string", condition: "", want: "else"},
		{name: "zero number", condition: 0, want: "else"},
		{name: "empty array", condition: []any{}, want: "else"},
		{name: "empty object", condition: map[string]any{}, want: "else"},
		{name: "nil", condition: nil, want: "else"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			workflow := ast.Workflow{
				SchemaVersion: "1.0.0",
				Workflow:      ast.Metadata{ID: "wf"},
				Body: ast.Statement{
					ID:   "root",
					Kind: "if",
					Condition: &ast.Expression{
						Kind:  "literal",
						Value: tc.condition,
					},
					Then: []ast.Statement{
						{
							ID:   "return-then",
							Kind: "return",
							Returns: map[string]ast.Expression{
								"branch": {Kind: "literal", Value: "then"},
							},
						},
					},
					Else: []ast.Statement{
						{
							ID:   "return-else",
							Kind: "return",
							Returns: map[string]ast.Expression{
								"branch": {Kind: "literal", Value: "else"},
							},
						},
					},
				},
			}

			result, err := RunWorkflow(context.Background(), workflow, Options{})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := result.Returns["branch"]; got != tc.want {
				t.Fatalf("branch = %#v, want %q", got, tc.want)
			}
		})
	}
}

func TestIsTruthyUsesUnderlyingKindForNamedScalars(t *testing.T) {
	type namedBool bool
	type namedInt int
	type namedUint uint
	type namedFloat float64

	tests := []struct {
		name  string
		value any
		want  bool
	}{
		{name: "false bool", value: namedBool(false), want: false},
		{name: "true bool", value: namedBool(true), want: true},
		{name: "zero int", value: namedInt(0), want: false},
		{name: "non-zero int", value: namedInt(7), want: true},
		{name: "zero uint", value: namedUint(0), want: false},
		{name: "non-zero uint", value: namedUint(7), want: true},
		{name: "zero float", value: namedFloat(0), want: false},
		{name: "non-zero float", value: namedFloat(0.5), want: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := isTruthy(tc.value); got != tc.want {
				t.Fatalf("isTruthy(%#v) = %v, want %v", tc.value, got, tc.want)
			}
		})
	}
}

func TestRunWorkflowReturnsStructuredErrorWhenContextCanceledBeforeStart(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	recorder := &testRecorder{}
	_, err := RunWorkflow(ctx, ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{Recorder: recorder})
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
	if runtimeErr.WorkflowID != "wf" {
		t.Fatalf("workflow ID = %q, want %q", runtimeErr.WorkflowID, "wf")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
	if len(recorder.events) != 0 {
		t.Fatalf("events = %#v, want none", recorder.events)
	}
}

func TestRunWorkflowReturnsStructuredErrorWhenContextCanceledAtStatementBoundary(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	recorder := &cancelOnEventRecorder{
		cancel: cancel,
		match: func(event Event) bool {
			return event.Name == "statement.end" && event.StatementID == "assign-status"
		},
	}

	_, err := RunWorkflow(ctx, ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "assign-status",
					Kind:   "assign",
					Target: "status",
					Value:  &ast.Expression{Kind: "literal", Value: "ready"},
				},
				{
					ID:     "assign-next",
					Kind:   "assign",
					Target: "next",
					Value:  &ast.Expression{Kind: "literal", Value: "later"},
				},
			},
		},
	}, Options{Recorder: recorder})
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
	if runtimeErr.WorkflowID != "wf" {
		t.Fatalf("workflow ID = %q, want %q", runtimeErr.WorkflowID, "wf")
	}
	if runtimeErr.StatementID != "assign-next" {
		t.Fatalf("statement ID = %q, want %q", runtimeErr.StatementID, "assign-next")
	}
	if runtimeErr.StatementKind != "assign" {
		t.Fatalf("statement kind = %q, want %q", runtimeErr.StatementKind, "assign")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}

	gotTrace := make([]string, len(recorder.events))
	for i, event := range recorder.events {
		gotTrace[i] = event.Name + ":" + event.StatementID
	}

	wantTrace := []string{
		"workflow.start:",
		"statement.start:root",
		"statement.start:assign-status",
		"variable.write:",
		"statement.end:assign-status",
		"statement.end:root",
		"workflow.end:",
	}

	if !reflect.DeepEqual(gotTrace, wantTrace) {
		t.Fatalf("trace = %#v, want %#v", gotTrace, wantTrace)
	}
}

type testRecorder struct {
	events []Event
}

func (r *testRecorder) Record(event Event) {
	r.events = append(r.events, event)
}

type cancelOnEventRecorder struct {
	events []Event
	cancel context.CancelFunc
	match  func(Event) bool
}

func (r *cancelOnEventRecorder) Record(event Event) {
	r.events = append(r.events, event)
	if r.cancel != nil && r.match != nil && r.match(event) {
		r.cancel()
		r.cancel = nil
	}
}
