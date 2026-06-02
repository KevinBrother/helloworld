package transform

import (
	"encoding/json"
	"os"
	"strings"
	"testing"

	"rpa-agent-workflow/contracts/ast"
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
