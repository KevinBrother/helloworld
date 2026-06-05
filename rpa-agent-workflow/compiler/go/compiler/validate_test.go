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

func TestAcceptsMissingOptionalBlockInput(t *testing.T) {
	blocks := map[string]block.Definition{
		"fs.write_text": {
			ID:      "fs.write_text",
			Runtime: block.RuntimeBinding{Target: "python", Mode: "sync"},
			Inputs: []block.Port{
				{Name: "path", Type: block.Type{Name: "string"}},
				{Name: "text", Type: block.Type{Name: "string"}},
				{Name: "encoding", Type: block.Type{Name: "string", Optional: true}},
			},
		},
	}
	_, diags := ValidateWorkflow([]byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{
			"id":"s1",
			"kind":"callBlock",
			"block":"fs.write_text",
			"inputs":{
				"path":{"kind":"literal","value":"out.txt"},
				"text":{"kind":"literal","value":"ok"}
			}
		}
	}`), blocks)
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
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
		"state":{"count":{"type":{"name":"integer"}}},
		"workflows":[{"id":"child","body":{"id":"child_return","kind":"return","returns":{}}}],
		"body":{
			"id":"root",
			"kind":"sequence",
			"statements":[
				{"id":"assign_count","kind":"assign","target":"state.count","value":{"kind":"literal","value":1}},
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

func TestAcceptsIfCanonicalBranchConditionsAndDefault(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{
			"id":"choose_path",
			"kind":"if",
			"branches":[
				{"id":"condition_1","label":"条件 1","condition":{"kind":"literal","value":false},"body":[]},
				{"id":"condition_2","label":"条件 2","condition":{"kind":"literal","value":true},"body":[]},
				{"id":"else","label":"否则","default":true,"body":[]}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
}

func TestRejectsIfCanonicalBranchWithTwoDefaults(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{
			"id":"choose_path",
			"kind":"if",
			"branches":[
				{"id":"condition_1","label":"条件 1","condition":{"kind":"literal","value":false},"body":[]},
				{"id":"else_1","label":"否则 1","default":true,"body":[]},
				{"id":"else_2","label":"否则 2","default":true,"body":[]}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "IF_BRANCH_DEFAULT_COUNT")
}

func TestRejectsIfCanonicalBranchMissingCondition(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{
			"id":"choose_path",
			"kind":"if",
			"branches":[
				{"id":"condition_1","label":"条件 1","body":[]},
				{"id":"else","label":"否则","default":true,"body":[]}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "IF_BRANCH_CONDITION_REQUIRED")
}

func TestRejectsIfCanonicalBranchDefaultBeforeLastBranch(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{
			"id":"choose_path",
			"kind":"if",
			"branches":[
				{"id":"else","label":"否则","default":true,"body":[]},
				{"id":"condition_1","label":"条件 1","condition":{"kind":"literal","value":true},"body":[]}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "IF_BRANCH_DEFAULT_LAST")
}

func TestRejectsIfCanonicalBranchBelowMinimumCount(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{
			"id":"choose_path",
			"kind":"if",
			"branches":[
				{"id":"else","label":"否则","default":true,"body":[]}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "IF_BRANCH_MIN_COUNT")
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

func TestRejectsOrdinaryVariables(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"variables":[{"name":"result","type":{"name":"number"}}],
		"body":{"id":"root","kind":"return","returns":{}}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "ORDINARY_VARIABLES_UNSUPPORTED")
}

func TestRejectsVarReferences(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{"id":"root","kind":"return","returns":{"result":{"kind":"ref","ref":"var.result"}}}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "UNSUPPORTED_VARIABLE_REF")
}

func TestRejectsAssignTargetOutsideState(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{
			"id":"root",
			"kind":"sequence",
			"statements":[
				{"id":"assign_result","kind":"assign","target":"result","value":{"kind":"literal","value":1}}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "ASSIGN_TARGET_MUST_BE_STATE")
}

func TestRejectsUnknownStateReference(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"body":{"id":"root","kind":"return","returns":{"result":{"kind":"ref","ref":"state.missing"}}}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	assertDiagnostic(t, diags, "UNKNOWN_STATE")
}

func TestAcceptsDeclaredStateAssignAndReturn(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"state":{"count":{"type":{"name":"number"},"initialValue":{"kind":"literal","value":0}}},
		"body":{
			"id":"root",
			"kind":"sequence",
			"statements":[
				{"id":"assign_count","kind":"assign","target":"state.count","value":{"kind":"literal","value":1}},
				{"id":"return_count","kind":"return","returns":{"count":{"kind":"ref","ref":"state.count"}}}
			]
		}
	}`)
	_, diags := ValidateWorkflow(doc, nil)
	if len(diags) != 0 {
		t.Fatalf("unexpected diagnostics: %#v", diags)
	}
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
