package executor

import (
	"context"
	"errors"
	"strings"
	"testing"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

type cancelingHost struct {
	cancel context.CancelFunc
	result BlockResult
}

func (h *cancelingHost) Call(ctx context.Context, call BlockCall) (BlockResult, error) {
	if h.cancel != nil {
		h.cancel()
		h.cancel = nil
	}
	return h.result, nil
}

func TestRunWorkflowExecutesForeachCallWorkflowAndFinally(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parent"},
		Workflows: []ast.SubWorkflow{
			{
				ID: "child",
				Inputs: []ast.Port{
					{Name: "value", Type: ast.Type{Name: "string"}},
				},
				Body: ast.Statement{
					ID:   "child-return",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"value": {Kind: "ref", Ref: "input.value"},
					},
				},
			},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "wrap-loop",
					Kind: "try",
					Statements: []ast.Statement{
						{
							ID:       "foreach-items",
							Kind:     "loop",
							LoopKind: "foreach",
							Iterable: &ast.Expression{
								Kind: "array",
								Items: []ast.Expression{
									{Kind: "literal", Value: "a"},
									{Kind: "literal", Value: "b"},
								},
							},
							ItemVar: "item",
							Statements: []ast.Statement{
								{
									ID:     "assign-last",
									Kind:   "assign",
									Target: "last",
									Value:  &ast.Expression{Kind: "ref", Ref: "item"},
								},
								{
									ID:       "call-child",
									Kind:     "callWorkflow",
									Workflow: "child",
									Inputs: map[string]ast.Expression{
										"value": {Kind: "ref", Ref: "var.last"},
									},
								},
							},
						},
					},
					Finally: []ast.Statement{
						{
							ID:     "set-finalized",
							Kind:   "assign",
							Target: "finalized",
							Value:  &ast.Expression{Kind: "literal", Value: true},
						},
					},
				},
				{
					ID:   "return-result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"last":      {Kind: "ref", Ref: "var.last"},
						"finalized": {Kind: "ref", Ref: "var.finalized"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := result.Returns["last"]; got != "b" {
		t.Fatalf("return last = %#v, want %q", got, "b")
	}
	if got := result.Returns["finalized"]; got != true {
		t.Fatalf("return finalized = %#v, want %v", got, true)
	}
}

func TestRunWorkflowForeachAcceptsTypedSlicesAndArrays(t *testing.T) {
	tests := []struct {
		name     string
		items    any
		wantLast any
	}{
		{
			name:     "string slice",
			items:    []string{"a", "b"},
			wantLast: "b",
		},
		{
			name:     "int array",
			items:    [2]int{1, 2},
			wantLast: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			workflow := ast.Workflow{
				SchemaVersion: "1.0.0",
				Workflow:      ast.Metadata{ID: "typed-foreach"},
				Body: ast.Statement{
					ID:   "root",
					Kind: "sequence",
					Statements: []ast.Statement{
						{
							ID:       "foreach-items",
							Kind:     "loop",
							LoopKind: "foreach",
							Iterable: &ast.Expression{Kind: "ref", Ref: "input.items"},
							ItemVar:  "item",
							Statements: []ast.Statement{
								{
									ID:     "assign-last",
									Kind:   "assign",
									Target: "last",
									Value:  &ast.Expression{Kind: "ref", Ref: "item"},
								},
							},
						},
						{
							ID:   "return-result",
							Kind: "return",
							Returns: map[string]ast.Expression{
								"last": {Kind: "ref", Ref: "var.last"},
							},
						},
					},
				},
			}

			result, err := RunWorkflow(context.Background(), workflow, Options{
				Inputs: map[string]any{
					"items": tt.items,
				},
			})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := result.Returns["last"]; got != tt.wantLast {
				t.Fatalf("return last = %#v, want %#v", got, tt.wantLast)
			}
		})
	}
}

func TestRunWorkflowExecutesWhileLoop(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "while-loop"},
		Variables: []ast.Variable{
			{Name: "count", Type: ast.Type{Name: "number"}},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "init-count",
					Kind:   "assign",
					Target: "count",
					Value:  &ast.Expression{Kind: "literal", Value: 0},
				},
				{
					ID:       "run-while",
					Kind:     "loop",
					LoopKind: "while",
					Condition: &ast.Expression{
						Kind: "binary",
						Op:   "<",
						Left: &ast.Expression{Kind: "ref", Ref: "var.count"},
						Right: &ast.Expression{
							Kind:  "literal",
							Value: 3,
						},
					},
					Statements: []ast.Statement{
						{
							ID:     "increment-count",
							Kind:   "assign",
							Target: "count",
							Value: &ast.Expression{
								Kind: "binary",
								Op:   "+",
								Left: &ast.Expression{Kind: "ref", Ref: "var.count"},
								Right: &ast.Expression{
									Kind:  "literal",
									Value: 1,
								},
							},
						},
					},
				},
				{
					ID:   "return-result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"count": {Kind: "ref", Ref: "var.count"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["count"]; got != 3 {
		t.Fatalf("count = %#v, want %v", got, 3)
	}
}

func TestRunWorkflowTryMatchesSpecificCatchPatternBeforeWildcard(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "try-specific-catch"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "wrap-try",
					Kind: "try",
					Statements: []ast.Statement{
						{
							ID:   "unsupported",
							Kind: "nope",
						},
					},
					Catches: []ast.CatchClause{
						{
							Pattern: "PhaseEval",
							Body: []ast.Statement{
								{
									ID:     "set-handled-eval",
									Kind:   "assign",
									Target: "handled",
									Value:  &ast.Expression{Kind: "literal", Value: "eval"},
								},
							},
						},
						{
							Pattern: "RuntimeError",
							Body: []ast.Statement{
								{
									ID:     "set-handled-runtime",
									Kind:   "assign",
									Target: "handled",
									Value:  &ast.Expression{Kind: "literal", Value: "specific"},
								},
							},
						},
						{
							Pattern: "*",
							Body: []ast.Statement{
								{
									ID:     "set-handled-wildcard",
									Kind:   "assign",
									Target: "handled",
									Value:  &ast.Expression{Kind: "literal", Value: "wildcard"},
								},
							},
						},
					},
				},
				{
					ID:   "return-result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"handled": {Kind: "ref", Ref: "var.handled"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["handled"]; got != "specific" {
		t.Fatalf("return handled = %#v, want %q", got, "specific")
	}
}

func TestRunTryScopesCatchBindingToCatchBody(t *testing.T) {
	t.Run("restores overwritten local", func(t *testing.T) {
		st := newState(ast.Workflow{
			SchemaVersion: "1.0.0",
			Workflow:      ast.Metadata{ID: "try-scope"},
		}, Options{})
		st.currentFrame().locals["err"] = "original"

		err := st.runTry(context.Background(), ast.Statement{
			ID:   "wrap-try",
			Kind: "try",
			Statements: []ast.Statement{
				{
					ID:   "unsupported",
					Kind: "nope",
				},
			},
			Catches: []ast.CatchClause{
				{
					Pattern: "RuntimeError",
					As:      "err",
					Body: []ast.Statement{
						{
							ID:     "capture-catch-local",
							Kind:   "assign",
							Target: "caught",
							Value:  &ast.Expression{Kind: "ref", Ref: "err"},
						},
					},
				},
			},
		})
		if err != nil {
			t.Fatalf("runTry returned error: %v", err)
		}

		if _, ok := st.variables["caught"].(*RuntimeError); !ok {
			t.Fatalf("catch binding = %T, want *RuntimeError", st.variables["caught"])
		}
		if got := st.currentFrame().locals["err"]; got != "original" {
			t.Fatalf("local err after catch = %#v, want %q", got, "original")
		}
	})

	t.Run("deletes new local after catch", func(t *testing.T) {
		st := newState(ast.Workflow{
			SchemaVersion: "1.0.0",
			Workflow:      ast.Metadata{ID: "try-scope"},
		}, Options{})

		err := st.runTry(context.Background(), ast.Statement{
			ID:   "wrap-try",
			Kind: "try",
			Statements: []ast.Statement{
				{
					ID:   "unsupported",
					Kind: "nope",
				},
			},
			Catches: []ast.CatchClause{
				{
					Pattern: "RuntimeError",
					As:      "err",
					Body: []ast.Statement{
						{
							ID:     "capture-catch-local",
							Kind:   "assign",
							Target: "caught",
							Value:  &ast.Expression{Kind: "ref", Ref: "err"},
						},
					},
				},
			},
		})
		if err != nil {
			t.Fatalf("runTry returned error: %v", err)
		}

		if _, ok := st.currentFrame().locals["err"]; ok {
			t.Fatalf("local err leaked outside catch: %#v", st.currentFrame().locals["err"])
		}
	})
}

func TestRunWorkflowCallWorkflowBindsReturnedValuesToVariables(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "bind-call-workflow-outputs"},
		Workflows: []ast.SubWorkflow{
			{
				ID: "child",
				Inputs: []ast.Port{
					{Name: "value", Type: ast.Type{Name: "string"}},
				},
				Body: ast.Statement{
					ID:   "child-return",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"value": {Kind: "ref", Ref: "input.value"},
					},
				},
			},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:       "call-child",
					Kind:     "callWorkflow",
					Workflow: "child",
					Inputs: map[string]ast.Expression{
						"value": {Kind: "literal", Value: "from-child"},
					},
					Outputs: map[string]ast.Expression{
						"value": {Kind: "ref", Ref: "var.childValue"},
					},
				},
				{
					ID:   "return-result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"childValue": {Kind: "ref", Ref: "var.childValue"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["childValue"]; got != "from-child" {
		t.Fatalf("return childValue = %#v, want %q", got, "from-child")
	}
}

func TestRunWorkflowCallWorkflowReturnsStructuredErrorWhenChildOmitsReturn(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "bind-call-workflow-missing-outputs"},
		Workflows: []ast.SubWorkflow{
			{
				ID: "child",
				Body: ast.Statement{
					ID:   "child-body",
					Kind: "sequence",
					Statements: []ast.Statement{
						{
							ID:     "set-local",
							Kind:   "assign",
							Target: "ignored",
							Value:  &ast.Expression{Kind: "literal", Value: "done"},
						},
					},
				},
			},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:       "call-child",
					Kind:     "callWorkflow",
					Workflow: "child",
					Outputs: map[string]ast.Expression{
						"value": {Kind: "ref", Ref: "var.childValue"},
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
	if runtimeErr.WorkflowID != "bind-call-workflow-missing-outputs" {
		t.Fatalf("workflow ID = %q, want %q", runtimeErr.WorkflowID, "bind-call-workflow-missing-outputs")
	}
	if runtimeErr.StatementID != "call-child" {
		t.Fatalf("statement ID = %q, want %q", runtimeErr.StatementID, "call-child")
	}
	if runtimeErr.StatementKind != "callWorkflow" {
		t.Fatalf("statement kind = %q, want %q", runtimeErr.StatementKind, "callWorkflow")
	}
	if !strings.Contains(runtimeErr.Error(), `missing workflow output "value"`) {
		t.Fatalf("error = %q, want missing output message", runtimeErr.Error())
	}
}

func TestRunWorkflowInvokesHostAndBindsOutputs(t *testing.T) {
	host := &fakeHost{
		result: BlockResult{
			Outputs: map[string]any{
				"text": "hello from host",
			},
		},
	}

	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "host-call"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:    "call-log",
					Kind:  "callBlock",
					Block: "core.log",
					Inputs: map[string]ast.Expression{
						"message": {Kind: "literal", Value: "hello"},
					},
					Outputs: map[string]ast.Expression{
						"text": {Kind: "ref", Ref: "var.message"},
					},
				},
				{
					ID:   "return-result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"message": {Kind: "ref", Ref: "var.message"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{
		Blocks: map[string]block.Definition{
			"core.log": {
				ID:        "core.log",
				Namespace: "core",
				Name:      "log",
			},
		},
		Host: host,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(host.calls) != 1 {
		t.Fatalf("host call count = %d, want 1", len(host.calls))
	}
	if got := host.calls[0].Inputs["message"]; got != "hello" {
		t.Fatalf("host input message = %#v, want %q", got, "hello")
	}
	if got := result.Returns["message"]; got != "hello from host" {
		t.Fatalf("return message = %#v, want %q", got, "hello from host")
	}
}

func TestRunWorkflowStoresBlockOutputsAsNodeReferences(t *testing.T) {
	host := &fakeHost{
		result: BlockResult{
			Outputs: map[string]any{
				"result": float64(42),
			},
		},
	}

	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "node-output-ref"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:    "calculate",
					Kind:  "callBlock",
					Block: "math.calculate",
				},
				{
					ID:   "return-result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"result": {Kind: "ref", Ref: "node.calculate.result"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{
		Blocks: map[string]block.Definition{
			"math.calculate": {
				ID:        "math.calculate",
				Namespace: "math",
				Name:      "calculate",
			},
		},
		Host: host,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["result"]; got != float64(42) {
		t.Fatalf("result = %#v, want 42", got)
	}
}

func TestRunWorkflowIfMergesBranchOutputsAsNodeReference(t *testing.T) {
	host := &fakeHost{
		result: BlockResult{Outputs: map[string]any{"result": float64(12)}},
	}

	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "if-output-ref"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:        "branch",
					Kind:      "if",
					Condition: &ast.Expression{Kind: "literal", Value: true},
					Then: []ast.Statement{
						{
							ID:    "calculate_then",
							Kind:  "callBlock",
							Block: "math.calculate",
						},
					},
					Else: []ast.Statement{
						{
							ID:    "calculate_else",
							Kind:  "callBlock",
							Block: "math.calculate",
						},
					},
					Outputs: map[string]ast.Expression{
						"result": {
							Kind: "branch",
							Fields: map[string]ast.Expression{
								"then": {Kind: "ref", Ref: "node.calculate_then.result"},
								"else": {Kind: "ref", Ref: "node.calculate_else.result"},
							},
						},
					},
				},
				{
					ID:   "return-result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"result": {Kind: "ref", Ref: "node.branch.result"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{
		Blocks: map[string]block.Definition{
			"math.calculate": {
				ID:        "math.calculate",
				Namespace: "math",
				Name:      "calculate",
			},
		},
		Host: host,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["result"]; got != float64(12) {
		t.Fatalf("result = %#v, want 12", got)
	}
}

func TestRunWorkflowReturnsStructuredErrorWhenHostOutputIsMissing(t *testing.T) {
	host := &fakeHost{
		result: BlockResult{
			Outputs: map[string]any{},
		},
	}

	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "host-call"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:    "call-log",
					Kind:  "callBlock",
					Block: "core.log",
					Outputs: map[string]ast.Expression{
						"text": {Kind: "ref", Ref: "var.message"},
					},
				},
			},
		},
	}

	_, err := RunWorkflow(context.Background(), workflow, Options{
		Blocks: map[string]block.Definition{
			"core.log": {
				ID:        "core.log",
				Namespace: "core",
				Name:      "log",
			},
		},
		Host: host,
	})
	if err == nil {
		t.Fatal("expected error")
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}
	if runtimeErr.Phase != PhaseHost {
		t.Fatalf("phase = %q, want %q", runtimeErr.Phase, PhaseHost)
	}
	if runtimeErr.WorkflowID != "host-call" {
		t.Fatalf("workflow ID = %q, want %q", runtimeErr.WorkflowID, "host-call")
	}
	if runtimeErr.StatementID != "call-log" {
		t.Fatalf("statement ID = %q, want %q", runtimeErr.StatementID, "call-log")
	}
	if runtimeErr.StatementKind != "callBlock" {
		t.Fatalf("statement kind = %q, want %q", runtimeErr.StatementKind, "callBlock")
	}
	if !strings.Contains(runtimeErr.Error(), `missing host output "text"`) {
		t.Fatalf("error = %q, want missing output message", runtimeErr.Error())
	}
}

func TestRunWorkflowReturnsStructuredErrorWhenContextCanceledDuringHostCall(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	host := &cancelingHost{
		cancel: cancel,
		result: BlockResult{
			Outputs: map[string]any{
				"text": "hello from host",
			},
		},
	}

	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "host-call"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:    "call-log",
					Kind:  "callBlock",
					Block: "core.log",
					Outputs: map[string]ast.Expression{
						"text": {Kind: "ref", Ref: "var.message"},
					},
				},
				{
					ID:   "return-result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"message": {Kind: "ref", Ref: "var.message"},
					},
				},
			},
		},
	}

	_, err := RunWorkflow(ctx, workflow, Options{
		Blocks: map[string]block.Definition{
			"core.log": {
				ID:        "core.log",
				Namespace: "core",
				Name:      "log",
			},
		},
		Host: host,
	})
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
	if runtimeErr.WorkflowID != "host-call" {
		t.Fatalf("workflow ID = %q, want %q", runtimeErr.WorkflowID, "host-call")
	}
	if runtimeErr.StatementID != "call-log" {
		t.Fatalf("statement ID = %q, want %q", runtimeErr.StatementID, "call-log")
	}
	if runtimeErr.StatementKind != "callBlock" {
		t.Fatalf("statement kind = %q, want %q", runtimeErr.StatementKind, "callBlock")
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
}
