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

func TestApplyInsertNodeAddsCallBlockBetweenAdjacentSequenceChildren(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{ID: "first", Kind: "assign", Target: "var.first", Value: &ast.Expression{Kind: "literal", Value: float64(1)}},
		{ID: "return_result", Kind: "return", Returns: map[string]ast.Expression{"result": {Kind: "ref", Ref: "var.first"}}},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"afterNodeId": "first", "beforeNodeId": "return_result"},
			"node":   map[string]any{"kind": "callBlock", "block": "core.log"},
		},
	})

	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	if got := []string{updated.Body.Statements[0].ID, updated.Body.Statements[1].Kind, updated.Body.Statements[2].ID}; got[0] != "first" || got[1] != "callBlock" || got[2] != "return_result" {
		t.Fatalf("statement order = %#v", got)
	}
	if updated.Body.Statements[1].Block != "core.log" {
		t.Fatalf("inserted block = %q, want core.log", updated.Body.Statements[1].Block)
	}
}

func TestApplyInsertNodeAddsIfBetweenAdjacentSequenceChildren(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{ID: "first", Kind: "assign"},
		{ID: "return_result", Kind: "return"},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"afterNodeId": "first", "beforeNodeId": "return_result"},
			"node":   map[string]any{"kind": "if", "branchCount": float64(2)},
		},
	})

	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	inserted := updated.Body.Statements[1]
	if inserted.Kind != "if" || inserted.Condition == nil || inserted.Condition.Kind != "literal" || inserted.Condition.Value != true {
		t.Fatalf("inserted if = %#v", inserted)
	}
}

func TestApplyInsertNodeRejectsNonAdjacentAnchor(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{ID: "first", Kind: "assign"},
		{ID: "middle", Kind: "assign"},
		{ID: "return_result", Kind: "return"},
	}}}

	_, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"afterNodeId": "first", "beforeNodeId": "return_result"},
			"node":   map[string]any{"kind": "if", "branchCount": float64(2)},
		},
	})
	if len(diags) == 0 || diags[0].Code != "INSERT_ANCHOR_NOT_ADJACENT" {
		t.Fatalf("expected INSERT_ANCHOR_NOT_ADJACENT diagnostic, got %#v", diags)
	}
}

func TestApplyDeleteNodeRemovesSequenceChild(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{ID: "first", Kind: "assign"},
		{ID: "remove_me", Kind: "callBlock", Block: "core.log"},
		{ID: "return_result", Kind: "return"},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeDeleteNode,
		TargetNodeID: "remove_me",
		Payload:      map[string]any{"nodeId": "remove_me"},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	if got := []string{updated.Body.Statements[0].ID, updated.Body.Statements[1].ID}; got[0] != "first" || got[1] != "return_result" {
		t.Fatalf("remaining statements = %#v", got)
	}
}

func TestApplyDeleteNodeRemovesControlFlowSubtree(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{
			ID:        "remove_if",
			Kind:      "if",
			Condition: &ast.Expression{Kind: "literal", Value: true},
			Then:      []ast.Statement{{ID: "nested", Kind: "callBlock", Block: "core.log"}},
		},
		{ID: "return_result", Kind: "return"},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeDeleteNode,
		TargetNodeID: "remove_if",
		Payload:      map[string]any{"nodeId": "remove_if"},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	if len(updated.Body.Statements) != 1 || updated.Body.Statements[0].ID != "return_result" {
		t.Fatalf("remaining statements = %#v", updated.Body.Statements)
	}
}

func TestApplyDeleteNodeRejectsProtectedReturn(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{{ID: "return_result", Kind: "return"}}}}
	_, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeDeleteNode,
		TargetNodeID: "return_result",
		Payload:      map[string]any{"nodeId": "return_result"},
	})
	if len(diags) == 0 || diags[0].Code != "DELETE_NODE_PROTECTED" {
		t.Fatalf("expected DELETE_NODE_PROTECTED diagnostic, got %#v", diags)
	}
}

func TestApplyUnsupportedOperation(t *testing.T) {
	_, diags := ApplyEdit(ast.Workflow{}, editoperation.Document{Type: "connectNodes"})
	if len(diags) == 0 || diags[0].Code != "UNSUPPORTED_EDIT_OPERATION" {
		t.Fatalf("expected unsupported diagnostic, got %#v", diags)
	}
}
