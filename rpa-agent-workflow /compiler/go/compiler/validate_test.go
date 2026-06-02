package compiler

import (
	"testing"

	"rpa-agent-workflow/compiler/go/diagnostic"
	"rpa-agent-workflow/contracts/block"
)

func TestRejectsUnknownBlock(t *testing.T) {
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":{"id":"s1","kind":"callBlock","block":"missing"}}`), nil)
	if len(diags) == 0 {
		t.Fatal("expected diagnostic")
	}
}

func TestAcceptsKnownBlock(t *testing.T) {
	blocks := map[string]block.Definition{
		"core.log": {ID: "core.log", Runtime: block.RuntimeBinding{Target: "python", Mode: "sync"}},
	}
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":{"id":"s1","kind":"callBlock","block":"core.log"}}`), blocks)
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
}

func TestRejectsMissingRequiredBlockInput(t *testing.T) {
	blocks := map[string]block.Definition{
		"core.log": {
			ID:      "core.log",
			Runtime: block.RuntimeBinding{Target: "python", Mode: "sync"},
			Inputs:  []block.Port{{Name: "message", Type: block.Type{Name: "string"}}},
		},
	}
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":{"id":"s1","kind":"callBlock","block":"core.log"}}`), blocks)
	assertDiagnostic(t, diags, "MISSING_INPUT")
}

func TestRejectsTypeMismatchForLiteralInput(t *testing.T) {
	blocks := map[string]block.Definition{
		"core.log": {
			ID:      "core.log",
			Runtime: block.RuntimeBinding{Target: "python", Mode: "sync"},
			Inputs:  []block.Port{{Name: "message", Type: block.Type{Name: "string"}}},
		},
	}
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":{"id":"s1","kind":"callBlock","block":"core.log","inputs":{"message":{"kind":"literal","value":42}}}}`), blocks)
	assertDiagnostic(t, diags, "TYPE_MISMATCH")
}

func TestRejectsUnsupportedRuntimeTarget(t *testing.T) {
	blocks := map[string]block.Definition{
		"core.log": {
			ID:      "core.log",
			Runtime: block.RuntimeBinding{Target: "node", Mode: "sync"},
		},
	}
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":{"id":"s1","kind":"callBlock","block":"core.log"}}`), blocks)
	assertDiagnostic(t, diags, "UNSUPPORTED_RUNTIME_TARGET")
}

func TestRejectsUnknownBlockInput(t *testing.T) {
	blocks := map[string]block.Definition{
		"core.log": {
			ID:      "core.log",
			Runtime: block.RuntimeBinding{Target: "python", Mode: "sync"},
			Inputs:  []block.Port{{Name: "message", Type: block.Type{Name: "string"}}},
		},
	}
	_, diags := ValidateWorkflow([]byte(`{"schemaVersion":"1.0.0","workflow":{"id":"wf"},"body":{"id":"s1","kind":"callBlock","block":"core.log","inputs":{"message":{"kind":"literal","value":"ok"},"extra":{"kind":"literal","value":"bad"}}}}`), blocks)
	assertDiagnostic(t, diags, "UNKNOWN_INPUT")
}

func TestAcceptsIfLoopTryAssignReturnAndWorkflowCall(t *testing.T) {
	blocks := map[string]block.Definition{
		"core.log": {
			ID:      "core.log",
			Runtime: block.RuntimeBinding{Target: "python", Mode: "sync"},
			Inputs:  []block.Port{{Name: "message", Type: block.Type{Name: "string"}}},
		},
	}
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"variables":[{"name":"count","type":{"name":"integer"},"mutable":true}],
		"workflows":[{"id":"child","body":{"id":"child_return","kind":"return","returns":{}}}],
		"body":{
			"id":"root",
			"kind":"sequence",
			"statements":[
				{"id":"assign_count","kind":"assign","target":"count","value":{"kind":"literal","value":1}},
				{"id":"if_count","kind":"if","condition":{"kind":"literal","value":true},"then":[{"id":"if_log","kind":"callBlock","block":"core.log","inputs":{"message":{"kind":"literal","value":"then"}}}],"else":[]},
				{"id":"loop_once","kind":"loop","loopKind":"while","condition":{"kind":"literal","value":false},"statements":[]},
				{"id":"try_stmt","kind":"try","statements":[],"catches":[{"pattern":"*","body":[]}],"finally":[]},
				{"id":"child_call","kind":"callWorkflow","workflow":"child","inputs":{}},
				{"id":"return_stmt","kind":"return","returns":{}}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, blocks)
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
}

func TestRejectsParallelSharedWrite(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"variables":[{"name":"shared","type":{"name":"string"},"mutable":true}],
		"body":{
			"id":"p",
			"kind":"parallel",
			"branches":[
				{"id":"a","body":[{"id":"a1","kind":"assign","target":"shared","value":{"kind":"literal","value":"a"}}]},
				{"id":"b","body":[{"id":"b1","kind":"assign","target":"shared","value":{"kind":"literal","value":"b"}}]}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "PARALLEL_WRITE_CONFLICT")
}

func TestRejectsDuplicateStatementIDInWorkflowBody(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{
			"id":"root",
			"kind":"sequence",
			"statements":[
				{"id":"same","kind":"return","returns":{}},
				{"id":"same","kind":"return","returns":{}}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "DUPLICATE_STATEMENT_ID")
}

func assertDiagnostic(t *testing.T, diags []diagnostic.Diagnostic, code string) {
	t.Helper()
	for _, diag := range diags {
		if diag.Code == code {
			return
		}
	}
	t.Fatalf("missing diagnostic %s in %#v", code, diags)
}
