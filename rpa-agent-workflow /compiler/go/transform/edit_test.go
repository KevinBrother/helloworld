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

func TestApplyUpdateFieldRejectsNonMetadataPath(t *testing.T) {
	_, diags := ApplyEdit(ast.Workflow{}, editoperation.Document{
		Type: editoperation.OperationTypeUpdateField,
		Path: "body.kind",
		Payload: map[string]any{
			"value": "callBlock",
		},
	})
	if len(diags) == 0 || diags[0].Code != "UNSAFE_EDIT_PATH" {
		t.Fatalf("expected unsafe edit diagnostic, got %#v", diags)
	}
}

func TestApplyUnsupportedOperation(t *testing.T) {
	_, diags := ApplyEdit(ast.Workflow{}, editoperation.Document{Type: "connectNodes"})
	if len(diags) == 0 || diags[0].Code != "UNSUPPORTED_EDIT_OPERATION" {
		t.Fatalf("expected unsupported diagnostic, got %#v", diags)
	}
}
