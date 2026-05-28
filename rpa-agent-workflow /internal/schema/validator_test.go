package schema

import "testing"

func TestValidateAstRejectsInvalidDocument(t *testing.T) {
	if err := ValidateAstBytes([]byte(`{"schemaVersion":"1.0.0"}`)); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestValidateAstAcceptsV1ControlFlowDocument(t *testing.T) {
	doc := []byte(`{
		"schemaVersion":"1.0.0",
		"workflow":{"id":"wf"},
		"variables":[{"name":"x","type":{"name":"string"}}],
		"workflows":[{"id":"child","body":{"id":"child_return","kind":"return","returns":{}}}],
		"body":{
			"id":"root",
			"kind":"sequence",
			"statements":[
				{"id":"a","kind":"assign","target":"x","value":{"kind":"literal","value":"ok"}},
				{"id":"i","kind":"if","condition":{"kind":"literal","value":true},"then":[],"else":[]},
				{"id":"l","kind":"loop","loopKind":"foreach","iterable":{"kind":"array","items":[]},"statements":[]},
				{"id":"p","kind":"parallel","branches":[{"id":"b","body":[]}]},
				{"id":"t","kind":"try","statements":[],"catches":[{"pattern":"*","body":[]}],"finally":[]},
				{"id":"c","kind":"callWorkflow","workflow":"child","inputs":{}},
				{"id":"r","kind":"return","returns":{}}
			]
		}
	}`)
	if err := ValidateAstBytes(doc); err != nil {
		t.Fatal(err)
	}
}
