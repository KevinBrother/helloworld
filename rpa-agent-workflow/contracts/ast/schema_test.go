package ast_test

import (
	"testing"

	"rpa-agent-workflow/compiler/go/schema"
)

func TestIfBranchSchemaAcceptsConditionsAndDefault(t *testing.T) {
	doc := []byte(`{
		"schemaVersion": "1.0.0",
		"workflow": {"id": "wf"},
		"body": {
			"id": "root",
			"kind": "if",
			"branches": [
				{
					"id": "condition_1",
					"label": "条件 1",
					"condition": {"kind": "literal", "value": true},
					"body": []
				},
				{
					"id": "else",
					"label": "否则",
					"default": true,
					"body": []
				}
			]
		}
	}`)

	if err := schema.ValidateAstBytes(doc); err != nil {
		t.Fatalf("schema rejected canonical if branches: %v", err)
	}
}
