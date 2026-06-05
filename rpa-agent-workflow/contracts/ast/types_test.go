package ast

import "testing"

func TestWorkflowHasVersion(t *testing.T) {
	var w Workflow
	if w.SchemaVersion != "" {
		t.Fatal("zero value should be empty")
	}
}

func TestIfBranchContractSupportsConditionsAndDefault(t *testing.T) {
	branch := Branch{
		ID:        "condition_1",
		Label:     "条件 1",
		Condition: &Expression{Kind: "literal", Value: true},
		Body:      []Statement{{ID: "log", Kind: "callBlock", Block: "core.log"}},
		Default:   false,
	}

	if branch.ID != "condition_1" || branch.Label != "条件 1" || branch.Condition == nil || len(branch.Body) != 1 {
		t.Fatalf("branch = %#v", branch)
	}
}
