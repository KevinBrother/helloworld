package block

import "testing"

func TestDefinitionHasRuntimeBinding(t *testing.T) {
	var d Definition
	if d.Runtime.Target != "" {
		t.Fatal("zero value should be empty")
	}
}
