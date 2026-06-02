package transform

import (
	"testing"

	"rpa-agent-workflow/contracts/ast"
	editoperation "rpa-agent-workflow/contracts/edit-operation"
)

func TestApplyToggleCollapsed(t *testing.T) {
	workflow := ast.Workflow{
		Body: ast.Statement{ID: "root", Kind: "sequence"},
	}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeToggleCollapsed,
		TargetNodeID: "root",
		Payload:      map[string]any{"collapsed": true},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	ui := updated.Body.Metadata["ui"].(map[string]any)
	if ui["collapsed"] != true {
		t.Fatalf("collapsed not applied: %#v", updated.Body.Metadata)
	}
}

func TestApplyUpdateFieldAllowsMetadataOnly(t *testing.T) {
	workflow := ast.Workflow{
		Body: ast.Statement{ID: "root", Kind: "sequence"},
	}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeUpdateField,
		TargetNodeID: "root",
		Path:         "metadata.ui.color",
		Payload:      map[string]any{"value": "blue"},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	ui := updated.Metadata["ui"].(map[string]any)
	if ui["color"] != "blue" {
		t.Fatalf("metadata not applied: %#v", updated.Metadata)
	}
}

func TestApplyUpdateFieldUpdatesStatementInputExpression(t *testing.T) {
	workflow := ast.Workflow{
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "calculate",
					Kind:   "callBlock",
					Block:  "math.calculate",
					Inputs: map[string]ast.Expression{},
				},
			},
		},
	}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeUpdateField,
		TargetNodeID: "calculate",
		Path:         "$.body.statements[0].inputs.left",
		Payload: map[string]any{
			"value": map[string]any{"kind": "literal", "value": float64(1)},
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	left := updated.Body.Statements[0].Inputs["left"]
	if left.Kind != "literal" || left.Value != float64(1) {
		t.Fatalf("input expression not applied: %#v", left)
	}
}

func TestApplyUpdateFieldUpdatesReturnExpression(t *testing.T) {
	workflow := ast.Workflow{
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:      "return_result",
					Kind:    "return",
					Returns: map[string]ast.Expression{},
				},
			},
		},
	}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeUpdateField,
		TargetNodeID: "return_result",
		Path:         "$.body.statements[0].returns.result",
		Payload: map[string]any{
			"value": map[string]any{"kind": "ref", "ref": "var.result"},
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	result := updated.Body.Statements[0].Returns["result"]
	if result.Kind != "ref" || result.Ref != "var.result" {
		t.Fatalf("return expression not applied: %#v", result)
	}
}

func TestApplyUpdateFieldRejectsTargetPathMismatch(t *testing.T) {
	workflow := ast.Workflow{
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "first", Kind: "return"},
				{ID: "second", Kind: "return"},
			},
		},
	}

	_, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeUpdateField,
		TargetNodeID: "second",
		Path:         "$.body.statements[0].returns.result",
		Payload:      map[string]any{"value": map[string]any{"kind": "literal", "value": "x"}},
	})
	if len(diags) == 0 || diags[0].Code != "UNSAFE_EDIT_PATH" {
		t.Fatalf("expected target path mismatch diagnostic, got %#v", diags)
	}
}

func TestApplyUnsupportedOperation(t *testing.T) {
	_, diags := ApplyEdit(ast.Workflow{}, editoperation.Document{Type: "connectNodes"})
	if len(diags) == 0 || diags[0].Code != "UNSUPPORTED_EDIT_OPERATION" {
		t.Fatalf("expected unsupported diagnostic, got %#v", diags)
	}
}
