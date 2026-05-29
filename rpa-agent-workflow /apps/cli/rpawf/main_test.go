package main

import (
	"encoding/json"
	"os/exec"
	"strings"
	"testing"
)

func TestCompileHelpOutput(t *testing.T) {
	cmd := exec.Command("go", "run", ".", "compile", "--help")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if !strings.Contains(string(out), "Usage") {
		t.Fatalf("missing usage output:\n%s", out)
	}
}

func TestExecHelpOutput(t *testing.T) {
	cmd := exec.Command("go", "run", ".", "exec", "--help")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if !strings.Contains(string(out), "exec") {
		t.Fatalf("missing exec help output:\n%s", out)
	}
}

func TestExecRunsNoBlockWorkflow(t *testing.T) {
	cmd := exec.Command("go", "run", ".", "exec", "../../../compiler/go/compiler/fixtures/valid_v1_workflow.json")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	var result struct {
		Variables map[string]any `json:"variables"`
	}
	if err := json.Unmarshal(out, &result); err != nil {
		t.Fatalf("invalid json output: %v\n%s", err, out)
	}
}

func TestExecRunsSampleWorkflowWithPythonBlocks(t *testing.T) {
	if _, err := exec.LookPath("uv"); err != nil {
		t.Skip("uv is unavailable")
	}

	cmd := exec.Command("go", "run", ".", "exec", "../../../examples/sample-workflow/ast.json", "../../../examples/sample-workflow/block.json")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	var result struct {
		Returns map[string]any `json:"returns"`
	}
	if err := json.Unmarshal(out, &result); err != nil {
		t.Fatalf("invalid json output: %v\n%s", err, out)
	}
	if got := result.Returns["last_item"]; got != "second" {
		t.Fatalf("last_item = %#v, want %q", got, "second")
	}
	if got := result.Returns["finally_ran"]; got != true {
		t.Fatalf("finally_ran = %#v, want true", got)
	}
}
