package transform

import (
	"encoding/json"
	"os"
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
		node := findProjectedNode(doc.Nodes, id)
		if node == nil {
			t.Fatalf("missing projected node %s", id)
		}
		if node.Kind != kind {
			t.Fatalf("node %s kind = %s, want %s", id, node.Kind, kind)
		}
	}

	parallel := findProjectedNode(doc.Nodes, "parallel_system_info")
	if parallel == nil || len(parallel.Branches) != 2 {
		t.Fatalf("parallel branches not projected: %#v", parallel)
	}
}

func findProjectedNode(nodes []uinode.Node, id string) *uinode.Node {
	for i := range nodes {
		if nodes[i].ID == id {
			return &nodes[i]
		}
	}
	return nil
}
