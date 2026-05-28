package compiler

import (
	"os"
	"path/filepath"
	"testing"

	"rpa-agent-workflow/contracts/block"
)

func TestCompilerFixtures(t *testing.T) {
	blocks := map[string]block.Definition{
		"core.log": {
			ID: "core.log",
			Runtime: block.RuntimeBinding{Target: "python", Module: "rpa_runtime.blocks.core", Callable: "log", Mode: "sync"},
			Inputs: []block.Port{{Name: "message", Type: block.Type{Name: "string"}}},
		},
		"bad.runtime": {
			ID: "bad.runtime",
			Runtime: block.RuntimeBinding{Target: "node", Module: "bad", Callable: "bad", Mode: "sync"},
		},
	}
	tests := []struct {
		name string
		code string
	}{
		{"invalid_unknown_block.json", "UNKNOWN_BLOCK"},
		{"invalid_type_mismatch.json", "TYPE_MISMATCH"},
		{"invalid_parallel_write.json", "PARALLEL_WRITE_CONFLICT"},
		{"invalid_runtime_target.json", "UNSUPPORTED_RUNTIME_TARGET"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := os.ReadFile(filepath.Join("fixtures", tt.name))
			if err != nil {
				t.Fatal(err)
			}
			_, diags := ValidateWorkflow(data, blocks)
			assertDiagnostic(t, diags, tt.code)
		})
	}

	data, err := os.ReadFile(filepath.Join("fixtures", "valid_v1_workflow.json"))
	if err != nil {
		t.Fatal(err)
	}
	_, diags := ValidateWorkflow(data, blocks)
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
}
