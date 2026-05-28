package compiler

import (
	"testing"

	"rpa-agent-workflow/internal/block"
)

func TestRejectsUnknownBlock(t *testing.T) {
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":{"id":"s1","kind":"callBlock","block":"missing"}}`), nil)
	if len(diags) == 0 {
		t.Fatal("expected diagnostic")
	}
}

func TestAcceptsKnownBlock(t *testing.T) {
	blocks := map[string]block.Definition{
		"core.log": {ID: "core.log"},
	}
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":{"id":"s1","kind":"callBlock","block":"core.log"}}`), blocks)
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
}
