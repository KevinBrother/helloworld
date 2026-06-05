package transform

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
	uinode "rpa-agent-workflow/contracts/ui-node"
)

func TestProjectSampleWorkflow(t *testing.T) {
	data, err := os.ReadFile("../../../examples/sample-workflow/ast.json")
	if err != nil {
		t.Fatal(err)
	}
	var workflow ast.Workflow
	if err := json.Unmarshal(data, &workflow); err != nil {
		t.Fatal(err)
	}

	doc := ProjectWorkflow(workflow)
	if doc.WorkflowID != "sample_workflow" {
		t.Fatalf("unexpected workflow id: %s", doc.WorkflowID)
	}
	if doc.Root.ID != "root" || doc.Root.Kind != "sequence" {
		t.Fatalf("unexpected root: %#v", doc.Root)
	}
	if !doc.Root.Capabilities.InsertNode.Enabled {
		t.Fatalf("root insert capability missing: %#v", doc.Root.Capabilities)
	}
	if doc.Root.Capabilities.DeleteNode.Enabled {
		t.Fatalf("root delete capability should be disabled: %#v", doc.Root.Capabilities.DeleteNode)
	}

	want := map[string]string{
		"root":                 "sequence",
		"start_log":            "callBlock",
		"if_log":               "if",
		"foreach_items":        "loop",
		"parallel_system_info": "parallel",
		"try_finally":          "try",
		"return_outputs":       "return",
	}
	for id, kind := range want {
		node := findProjectedNode(doc.Root, id)
		if node == nil {
			t.Fatalf("missing projected node %s", id)
		}
		if node.Kind != kind {
			t.Fatalf("node %s kind = %s, want %s", id, node.Kind, kind)
		}
	}

	startLog := findProjectedNode(doc.Root, "start_log")
	if startLog == nil || !startLog.Capabilities.DeleteNode.Enabled {
		t.Fatalf("leaf delete capability missing: %#v", startLog)
	}
	if startLog.Capabilities.InsertNode.Enabled {
		t.Fatalf("leaf insert capability should be disabled: %#v", startLog.Capabilities.InsertNode)
	}
	if !hasInspectorField(startLog.Inspector, "$.body.statements[0].inputs.message", "expression") {
		t.Fatalf("callBlock input expression field missing: %#v", startLog.Inspector)
	}

	parallel := findProjectedNode(doc.Root, "parallel_system_info")
	if parallel == nil || len(parallel.Branches) != 2 {
		t.Fatalf("parallel branches not projected: %#v", parallel)
	}

	out, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}
	text := string(out)
	if strings.Contains(text, `"nodes"`) {
		t.Fatalf("projection should not emit top-level flattened nodes: %s", text)
	}
	if strings.Contains(text, `"operations"`) {
		t.Fatalf("projection should not emit legacy operations: %s", text)
	}
	if !strings.Contains(text, `"capabilities"`) {
		t.Fatalf("projection should emit capabilities: %s", text)
	}
}

func TestProjectWorkflowShowsStartInputsAndReturnOutputs(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "calculator"},
		Inputs: []ast.Port{
			{Name: "left", Type: ast.Type{Name: "number"}},
			{Name: "operator", Type: ast.Type{Name: "string"}},
		},
		Outputs: []ast.Port{
			{Name: "result", Type: ast.Type{Name: "number"}},
		},
		Body: ast.Statement{ID: "root", Kind: "sequence", Statements: []ast.Statement{
			{ID: "return_result", Kind: "return", Returns: map[string]ast.Expression{"result": {Kind: "literal", Value: float64(0)}}},
		}},
	}

	doc := ProjectWorkflow(workflow)
	if doc.Root.Label != "Start" {
		t.Fatalf("root label = %q, want Start", doc.Root.Label)
	}
	if !hasInspectorField(doc.Root.Inspector, "$.inputs.left", "port") {
		t.Fatalf("root inspector missing input left: %#v", doc.Root.Inspector)
	}
	if !hasInspectorField(doc.Root.Inspector, "$.inputs.operator", "port") {
		t.Fatalf("root inspector missing input operator: %#v", doc.Root.Inspector)
	}
	returnNode := findProjectedNode(doc.Root, "return_result")
	if returnNode == nil {
		t.Fatal("missing return node")
	}
	if !hasInspectorField(returnNode.Inspector, "$.outputs.result", "port") {
		t.Fatalf("return inspector missing output result: %#v", returnNode.Inspector)
	}
}

func TestProjectWorkflowProjectsScopedBindingTokensAndNodeOutputs(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "token_scope"},
		Inputs: []ast.Port{
			{Name: "left", Type: ast.Type{Name: "number"}},
			{Name: "right", Type: ast.Type{Name: "number"}},
		},
		State: map[string]ast.State{
			"success_count": {Type: ast.Type{Name: "number"}},
		},
		Outputs: []ast.Port{{Name: "result", Type: ast.Type{Name: "number"}}},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:    "first",
					Kind:  "callBlock",
					Block: "math.calculate",
					Inputs: map[string]ast.Expression{
						"left":  {Kind: "ref", Ref: "input.left"},
						"right": {Kind: "ref", Ref: "input.right"},
					},
				},
				{
					ID:    "second",
					Kind:  "callBlock",
					Block: "math.calculate",
					Inputs: map[string]ast.Expression{
						"left":  {Kind: "ref", Ref: "node.first.result"},
						"right": {Kind: "literal", Value: 10},
					},
				},
			},
		},
	}
	blocks := map[string]block.Definition{
		"math.calculate": {
			ID:          "math.calculate",
			Description: "Calculate two numbers",
			Outputs: []block.Port{
				{Name: "result", Type: block.Type{Name: "number"}},
			},
		},
	}

	doc := ProjectWorkflowWithBlocks(workflow, blocks)
	first := findProjectedNode(doc.Root, "first")
	if first == nil {
		t.Fatal("missing projected first node")
	}
	second := findProjectedNode(doc.Root, "second")
	if second == nil {
		t.Fatal("missing projected second node")
	}

	firstLeft := findInspectorField(first.Inspector, "$.body.statements[0].inputs.left")
	if firstLeft == nil {
		t.Fatalf("first input field missing: %#v", first.Inspector)
	}
	if !fieldHasAvailableToken(*firstLeft, "input.left") {
		t.Fatalf("first input should expose workflow input token: %#v", firstLeft.Metadata)
	}
	if fieldHasAvailableToken(*firstLeft, "node.second.result") {
		t.Fatalf("first input must not expose downstream output token: %#v", firstLeft.Metadata)
	}

	secondLeft := findInspectorField(second.Inspector, "$.body.statements[1].inputs.left")
	if secondLeft == nil {
		t.Fatalf("second input field missing: %#v", second.Inspector)
	}
	if !fieldHasAvailableToken(*secondLeft, "node.first.result") {
		t.Fatalf("second input should expose upstream output token: %#v", secondLeft.Metadata)
	}
	if !fieldHasAvailableToken(*secondLeft, "state.success_count") {
		t.Fatalf("second input should expose global state token: %#v", secondLeft.Metadata)
	}

	if !nodeHasOutputRef(*first, "node.first.result") {
		t.Fatalf("first node should expose result output: %#v", first.Metadata)
	}
	if first.Metadata["description"] != "Calculate two numbers" {
		t.Fatalf("first node should include block description: %#v", first.Metadata)
	}
}

func findProjectedNode(root uinode.Node, id string) *uinode.Node {
	if root.ID == id {
		return &root
	}
	for i := range root.Children {
		if node := findProjectedNode(root.Children[i], id); node != nil {
			return node
		}
	}
	for i := range root.Branches {
		for j := range root.Branches[i].Children {
			if node := findProjectedNode(root.Branches[i].Children[j], id); node != nil {
				return node
			}
		}
	}
	return nil
}

func hasInspectorField(fields []uinode.InspectorField, path string, control string) bool {
	for _, field := range fields {
		if field.Path == path && field.Control == control {
			return true
		}
	}
	return false
}

func findInspectorField(fields []uinode.InspectorField, path string) *uinode.InspectorField {
	for i := range fields {
		if fields[i].Path == path {
			return &fields[i]
		}
	}
	return nil
}

func fieldHasAvailableToken(field uinode.InspectorField, ref string) bool {
	tokens, ok := field.Metadata["availableTokens"].([]map[string]any)
	if !ok {
		return false
	}
	for _, token := range tokens {
		if token["ref"] == ref {
			return true
		}
	}
	return false
}

func nodeHasOutputRef(node uinode.Node, ref string) bool {
	outputs, ok := node.Metadata["outputs"].([]map[string]any)
	if !ok {
		return false
	}
	for _, output := range outputs {
		if output["ref"] == ref {
			return true
		}
	}
	return false
}
