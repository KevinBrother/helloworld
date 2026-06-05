package main

import (
	"encoding/json"
	"os"
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

	cmd := exec.Command("go", "run", ".", "exec", "../../../examples/sample-workflow/ast.json", "../../../sdks/block")
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

func TestExecRunsCalculatorWorkflowWithInputJSON(t *testing.T) {
	if _, err := exec.LookPath("uv"); err != nil {
		t.Skip("uv is unavailable")
	}

	assertCalculatorASTUsesNodeOutputReference(t)

	tests := []struct {
		name  string
		input string
		want  float64
	}{
		{name: "add", input: "input-add.json", want: 42},
		{name: "subtract", input: "input-subtract.json", want: 42},
		{name: "multiply", input: "input-multiply.json", want: 42},
		{name: "divide", input: "input-divide.json", want: 42},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cmd := exec.Command(
				"go",
				"run",
				".",
				"exec",
				"../../../examples/calculator/ast.json",
				"../../../sdks/block",
				"../../../examples/calculator/"+tc.input,
			)
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
			if got := result.Returns["result"]; got != tc.want {
				t.Fatalf("result = %#v, want %v", got, tc.want)
			}
		})
	}
}

func TestCompileGeneratedPythonRunsCalculatorWithInputJSON(t *testing.T) {
	if _, err := exec.LookPath("uv"); err != nil {
		t.Skip("uv is unavailable")
	}

	dir := t.TempDir()
	workflowPath := dir + "/calculator.py"
	compileCmd := exec.Command(
		"go",
		"run",
		".",
		"compile",
		"../../../examples/calculator/ast.json",
		"../../../sdks/block",
	)
	src, err := compileCmd.CombinedOutput()
	if err != nil {
		t.Fatalf("compile failed: %v\n%s", err, src)
	}
	if err := os.WriteFile(workflowPath, src, 0o644); err != nil {
		t.Fatal(err)
	}

	runCmd := exec.Command(
		"uv",
		"--project",
		"../../../sdks/python",
		"run",
		"python",
		workflowPath,
		"../../../examples/calculator/input-add.json",
	)
	out, err := runCmd.CombinedOutput()
	if err != nil {
		t.Fatalf("generated python failed: %v\n%s\n%s", err, out, src)
	}
	var result map[string]any
	if err := json.Unmarshal(out, &result); err != nil {
		t.Fatalf("invalid json output: %v\n%s", err, out)
	}
	returns, ok := result["returns"].(map[string]any)
	if !ok {
		t.Fatalf("missing returns in result: %#v", result)
	}
	if got := returns["result"]; got != float64(42) {
		t.Fatalf("result = %#v, want 42", got)
	}
}

func assertCalculatorASTUsesNodeOutputReference(t *testing.T) {
	t.Helper()

	raw, err := os.ReadFile("../../../examples/calculator/ast.json")
	if err != nil {
		t.Fatal(err)
	}

	var workflow struct {
		Variables []any `json:"variables"`
		Body      struct {
			Statements []struct {
				ID      string         `json:"id"`
				Kind    string         `json:"kind"`
				Outputs map[string]any `json:"outputs"`
				Returns map[string]struct {
					Kind string `json:"kind"`
					Ref  string `json:"ref"`
				} `json:"returns"`
				Condition struct {
					Kind string `json:"kind"`
					Op   string `json:"op"`
					Left struct {
						Kind string `json:"kind"`
						Ref  string `json:"ref"`
					} `json:"left"`
					Right struct {
						Kind  string `json:"kind"`
						Value any    `json:"value"`
					} `json:"right"`
				} `json:"condition"`
			} `json:"statements"`
		} `json:"body"`
	}
	if err := json.Unmarshal(raw, &workflow); err != nil {
		t.Fatalf("calculator ast json is invalid: %v", err)
	}

	if len(workflow.Variables) != 0 {
		t.Fatalf("calculator ast should not declare ordinary variables: %#v", workflow.Variables)
	}
	if len(workflow.Body.Statements) < 2 {
		t.Fatalf("calculator ast should include if and return statements, got %d", len(workflow.Body.Statements))
	}
	first := workflow.Body.Statements[0]
	if first.Kind != "if" {
		t.Fatalf("first calculator statement = %s, want if", first.Kind)
	}
	if first.Condition.Kind != "binary" || first.Condition.Op != ">" {
		t.Fatalf("if condition = %s %s, want binary >", first.Condition.Kind, first.Condition.Op)
	}
	if first.Condition.Left.Kind != "ref" || first.Condition.Left.Ref != "input.left" {
		t.Fatalf("if left operand = %#v, want ref input.left", first.Condition.Left)
	}
	if first.Condition.Right.Kind != "literal" || first.Condition.Right.Value != float64(10) {
		t.Fatalf("if right operand = %#v, want literal 10", first.Condition.Right)
	}
	if first.Outputs["result"] == nil {
		t.Fatal("if statement should expose merged result output")
	}
	second := workflow.Body.Statements[1]
	resultReturn := second.Returns["result"]
	if second.Kind != "return" || resultReturn.Kind != "ref" || resultReturn.Ref != "node.branch_by_threshold.result" {
		t.Fatalf("return statement = %#v, want result ref node.branch_by_threshold.result", second)
	}
}

func TestExecCalculatorReportsDivisionByZero(t *testing.T) {
	if _, err := exec.LookPath("uv"); err != nil {
		t.Skip("uv is unavailable")
	}

	cmd := exec.Command(
		"go",
		"run",
		".",
		"exec",
		"../../../examples/calculator/ast.json",
		"../../../sdks/block",
		"../../../examples/calculator/input-divide-by-zero.json",
	)
	out, err := cmd.CombinedOutput()
	if err == nil {
		t.Fatalf("expected error, got success:\n%s", out)
	}
	if !strings.Contains(string(out), "division by zero") {
		t.Fatalf("expected division by zero error, got:\n%s", out)
	}
}
