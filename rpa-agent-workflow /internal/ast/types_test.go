package ast

import "testing"

func TestWorkflowHasVersion(t *testing.T) {
	var w Workflow
	if w.SchemaVersion != "" {
		t.Fatal("zero value should be empty")
	}
}
