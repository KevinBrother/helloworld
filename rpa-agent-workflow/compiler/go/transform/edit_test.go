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

func TestApplyUpdateFieldUpdatesWorkflowInputsAndRenamesReferences(t *testing.T) {
	workflow := ast.Workflow{
		Inputs: []ast.Port{
			{Name: "dir", Type: ast.Type{Name: "string"}},
			{Name: "outputPath", Type: ast.Type{Name: "string"}},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:    "list",
					Kind:  "callBlock",
					Block: "fs.list",
					Inputs: map[string]ast.Expression{
						"path": {Kind: "ref", Ref: "input.dir"},
					},
				},
			},
		},
	}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeUpdateField,
		TargetNodeID: "root",
		Path:         "$.inputs",
		Payload: map[string]any{
			"value": []map[string]any{
				{"name": "sourceDir", "type": map[string]any{"name": "string"}},
				{"name": "outputPath", "type": map[string]any{"name": "string"}},
			},
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	if updated.Inputs[0].Name != "sourceDir" {
		t.Fatalf("input was not renamed: %#v", updated.Inputs)
	}
	path := updated.Body.Statements[0].Inputs["path"]
	if path.Ref != "input.sourceDir" {
		t.Fatalf("input reference = %q, want input.sourceDir", path.Ref)
	}
}

func TestApplyUpdateFieldUpdatesWorkflowOutputsAndReturnMapByPosition(t *testing.T) {
	workflow := ast.Workflow{
		Outputs: []ast.Port{
			{Name: "count", Type: ast.Type{Name: "number"}},
			{Name: "outputPath", Type: ast.Type{Name: "string"}},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "return_result",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"count":      {Kind: "ref", Ref: "node.list.count"},
						"outputPath": {Kind: "ref", Ref: "input.outputPath"},
					},
				},
			},
		},
	}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type:         editoperation.OperationTypeUpdateField,
		TargetNodeID: "return_result",
		Path:         "$.outputs",
		Payload: map[string]any{
			"value": []map[string]any{
				{"name": "total", "type": map[string]any{"name": "number"}},
				{"name": "outputPath", "type": map[string]any{"name": "string"}},
				{"name": "bytes", "type": map[string]any{"name": "number"}},
			},
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	if got := []string{updated.Outputs[0].Name, updated.Outputs[1].Name, updated.Outputs[2].Name}; got[0] != "total" || got[1] != "outputPath" || got[2] != "bytes" {
		t.Fatalf("outputs = %#v", updated.Outputs)
	}
	returns := updated.Body.Statements[0].Returns
	if returns["total"].Ref != "node.list.count" {
		t.Fatalf("renamed return expression not preserved: %#v", returns)
	}
	if returns["bytes"].Kind != "literal" {
		t.Fatalf("new return expression should have a default literal: %#v", returns["bytes"])
	}
	if _, ok := returns["count"]; ok {
		t.Fatalf("old return name should be removed: %#v", returns)
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

func TestApplyInsertBranchAddsIfConditionBeforeDefault(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{
			ID:   "choose_path",
			Kind: "if",
			Branches: []ast.Branch{
				{ID: "condition_1", Label: "条件 1", Condition: &ast.Expression{Kind: "literal", Value: true}},
				{ID: "else", Label: "否则", Default: true},
			},
		},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertBranch,
		Payload: map[string]any{
			"nodeId":     "choose_path",
			"branchKind": "condition",
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	branches := updated.Body.Statements[0].Branches
	if got := []string{branches[0].ID, branches[1].ID, branches[2].ID}; got[0] != "condition_1" || got[1] != "condition_2" || got[2] != "else" {
		t.Fatalf("branch order = %#v", got)
	}
	if branches[1].Label != "条件 2" || branches[1].Condition == nil || branches[1].Default {
		t.Fatalf("inserted if branch = %#v", branches[1])
	}
}

func TestApplyInsertBranchCanonicalizesLegacyIfBeforeAddingCondition(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{
			ID:        "choose_path",
			Kind:      "if",
			Condition: &ast.Expression{Kind: "literal", Value: true},
			Then:      []ast.Statement{{ID: "then_step", Kind: "assign"}},
			Else:      []ast.Statement{{ID: "else_step", Kind: "assign"}},
		},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertBranch,
		Payload: map[string]any{
			"nodeId":     "choose_path",
			"branchKind": "condition",
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	inserted := updated.Body.Statements[0]
	if len(inserted.Branches) != 3 || len(inserted.Then) != 0 || len(inserted.Else) != 0 || inserted.Condition != nil {
		t.Fatalf("legacy if was not canonicalized: %#v", inserted)
	}
	if inserted.Branches[0].Body[0].ID != "then_step" || inserted.Branches[2].Body[0].ID != "else_step" {
		t.Fatalf("legacy branch bodies not preserved: %#v", inserted.Branches)
	}
}

func TestApplyInsertBranchAppendsParallelBranch(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{
			ID:   "run_parallel",
			Kind: "parallel",
			Branches: []ast.Branch{
				{ID: "branch_1", Label: "并行 1"},
				{ID: "branch_2", Label: "并行 2"},
			},
		},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertBranch,
		Payload: map[string]any{
			"nodeId":     "run_parallel",
			"branchKind": "parallel",
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	branches := updated.Body.Statements[0].Branches
	if len(branches) != 3 || branches[2].ID != "branch_3" || branches[2].Label != "并行 3" {
		t.Fatalf("parallel branches = %#v", branches)
	}
}

func TestApplyInsertNodeAddsBranchStartWithBranchAnchor(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{
			ID:   "choose_path",
			Kind: "if",
			Branches: []ast.Branch{
				{ID: "condition_1", Label: "条件 1", Condition: &ast.Expression{Kind: "literal", Value: true}, Body: []ast.Statement{{ID: "existing", Kind: "assign"}}},
				{ID: "else", Label: "否则", Default: true},
			},
		},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"containerNodeId": "choose_path", "branchId": "condition_1", "position": "branchStart"},
			"node":   map[string]any{"kind": "callBlock", "block": "core.log"},
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	body := updated.Body.Statements[0].Branches[0].Body
	if len(body) != 2 || body[0].Kind != "callBlock" || body[1].ID != "existing" {
		t.Fatalf("branch body = %#v", body)
	}
}

func TestApplyInsertNodeAddsBranchEndWithBranchAnchor(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{
			ID:   "run_parallel",
			Kind: "parallel",
			Branches: []ast.Branch{
				{ID: "branch_1", Label: "并行 1", Body: []ast.Statement{{ID: "existing", Kind: "assign"}}},
				{ID: "branch_2", Label: "并行 2"},
			},
		},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"containerNodeId": "run_parallel", "branchId": "branch_1", "position": "branchEnd"},
			"node":   map[string]any{"kind": "callBlock", "block": "core.log"},
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	body := updated.Body.Statements[0].Branches[0].Body
	if len(body) != 2 || body[0].ID != "existing" || body[1].Kind != "callBlock" {
		t.Fatalf("branch body = %#v", body)
	}
}

func TestApplyInsertNodeAddsBetweenBranchChildrenWithBranchAnchor(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{
			ID:   "run_parallel",
			Kind: "parallel",
			Branches: []ast.Branch{
				{ID: "branch_1", Label: "并行 1", Body: []ast.Statement{{ID: "first", Kind: "assign"}, {ID: "second", Kind: "assign"}}},
				{ID: "branch_2", Label: "并行 2"},
			},
		},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"containerNodeId": "run_parallel", "branchId": "branch_1", "position": "between", "afterNodeId": "first", "beforeNodeId": "second"},
			"node":   map[string]any{"kind": "callBlock", "block": "core.log"},
		},
	})
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	body := updated.Body.Statements[0].Branches[0].Body
	if got := []string{body[0].ID, body[1].Kind, body[2].ID}; got[0] != "first" || got[1] != "callBlock" || got[2] != "second" {
		t.Fatalf("branch body order = %#v", got)
	}
}

func TestApplyInsertNodeAddsNodeBetweenRootAndFirstChild(t *testing.T) {
	workflow := ast.Workflow{Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
		{ID: "first", Kind: "assign"},
		{ID: "return_result", Kind: "return"},
	}}}

	updated, diags := ApplyEdit(workflow, editoperation.Document{
		Type: editoperation.OperationTypeInsertNode,
		Payload: map[string]any{
			"anchor": map[string]any{"afterNodeId": "root", "beforeNodeId": "first"},
			"node":   map[string]any{"kind": "parallel", "branchCount": float64(2)},
		},
	})

	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
	inserted := updated.Body.Statements[0]
	if inserted.Kind != "parallel" || len(inserted.Branches) != 2 || updated.Body.Statements[1].ID != "first" {
		t.Fatalf("statements after root insert = %#v", updated.Body.Statements)
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
