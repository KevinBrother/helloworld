package calculator

import (
	"context"
	"encoding/json"
	"math"
	"strings"
	"testing"

	"github.com/cloudwego/eino/components/tool"
)

func closeEnough(got, want float64) bool {
	if got == want {
		return true
	}
	diff := math.Abs(got - want)
	return diff <= 1e-9*math.Max(1, math.Abs(want))
}

func TestEvaluateValues(t *testing.T) {
	cases := []struct {
		expr string
		want float64
	}{
		{"1+2*3", 7},
		{"(1+2)*3", 9},
		{"2^3^2", 512},
		{"-2^2", -4},
		{"--2", 2},
		{"10%3", 1},
		{"7/2", 3.5},
		{"sqrt(9)", 3},
		{"abs(-3.5)", 3.5},
		{"floor(2.7)", 2},
		{"ceil(2.1)", 3},
		{"round(2.5)", 3},
		{"min(3,1,2)", 1},
		{"max(3,1,2)", 3},
		{"pow(2,10)", 1024},
		{"pi", math.Pi},
		{"e", math.E},
		{"1e3", 1000},
		{".5", 0.5},
		{" 1 + 2 ", 3},
		{"sqrt(2)^2", 2},
		{"2 * (3 + 4) - 1", 13},
	}
	for _, tc := range cases {
		got, err := Evaluate(tc.expr)
		if err != nil {
			t.Errorf("Evaluate(%q) error: %v", tc.expr, err)
			continue
		}
		if !closeEnough(got, tc.want) {
			t.Errorf("Evaluate(%q) = %v, want %v", tc.expr, got, tc.want)
		}
	}
}

func TestEvaluateErrors(t *testing.T) {
	cases := []struct {
		expr string
		want string
	}{
		{"", "empty expression"},
		{"   ", "empty expression"},
		{"1+", "unexpected end of expression"},
		{"(1+2", "unexpected end of expression"},
		{"1+2)", `unexpected token ")" at 3`},
		{"2^^3", `unexpected token "^" at 2`},
		{"2 & 3", "invalid character '&' at 2"},
		{"foo(1)", `unknown function "foo"`},
		{"x", `unknown identifier "x"`},
		{"1/0", "division by zero"},
		{"5%0", "division by zero"},
		{"sqrt(-1)", "not a number"},
		{"min()", "expects at least 1 argument"},
		{"pow(2)", "expects 2 arguments"},
		{"1e309", "out of range"},
	}
	for _, tc := range cases {
		if _, err := Evaluate(tc.expr); err == nil {
			t.Errorf("Evaluate(%q) = nil error, want %q", tc.expr, tc.want)
		} else if !strings.Contains(err.Error(), tc.want) {
			t.Errorf("Evaluate(%q) error = %q, want substring %q", tc.expr, err, tc.want)
		}
	}
}

func TestEvaluateRejectsOversizedExpression(t *testing.T) {
	if _, err := Evaluate(strings.Repeat("1", maxExpressionBytes+1)); err == nil {
		t.Fatal("expected oversized expression to be rejected")
	} else if !strings.Contains(err.Error(), "too long") {
		t.Fatalf("error = %q, want substring %q", err, "too long")
	}
}

func TestEvaluateRejectsTooDeepNesting(t *testing.T) {
	expr := strings.Repeat("(", maxNestingDepth+1) + "1" + strings.Repeat(")", maxNestingDepth+1)
	if _, err := Evaluate(expr); err == nil {
		t.Fatal("expected too deeply nested expression to be rejected")
	} else if !strings.Contains(err.Error(), "nested") {
		t.Fatalf("error = %q, want substring %q", err, "nested")
	}
}

func TestEvaluateAllowsMaxNesting(t *testing.T) {
	expr := strings.Repeat("(", maxNestingDepth) + "1" + strings.Repeat(")", maxNestingDepth)
	got, err := Evaluate(expr)
	if err != nil {
		t.Fatalf("Evaluate at max depth error: %v", err)
	}
	if got != 1 {
		t.Fatalf("got %v, want 1", got)
	}
}

func newTool(t *testing.T) tool.BaseTool {
	t.Helper()
	base, err := NewTool()
	if err != nil {
		t.Fatal(err)
	}
	return base
}

func invokeCalculate(t *testing.T, base tool.BaseTool, args map[string]any) (string, error) {
	t.Helper()
	invokable, ok := base.(tool.InvokableTool)
	if !ok {
		t.Fatal("tool is not invokable")
	}
	raw, err := json.Marshal(args)
	if err != nil {
		t.Fatal(err)
	}
	return invokable.InvokableRun(context.Background(), string(raw))
}

func TestToolInfo(t *testing.T) {
	base := newTool(t)
	info, err := base.Info(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if info.Name != "calculate" {
		t.Fatalf("name = %q, want calculate", info.Name)
	}
	if !strings.Contains(info.Desc, "expression") {
		t.Fatalf("description does not mention expression: %q", info.Desc)
	}
}

func TestToolComputesAndFormats(t *testing.T) {
	base := newTool(t)
	cases := map[string]string{
		"2*(3+4)": "2*(3+4) = 14",
		"7/2":     "7/2 = 3.5",
		"sqrt(9)": "sqrt(9) = 3",
		"1+2":     "1+2 = 3",
	}
	for expr, want := range cases {
		got, err := invokeCalculate(t, base, map[string]any{"expression": expr})
		if err != nil {
			t.Errorf("invoke(%q) error: %v", expr, err)
			continue
		}
		if got != want {
			t.Errorf("invoke(%q) = %q, want %q", expr, got, want)
		}
	}
}

func TestToolReportsEmptyExpressionAsResult(t *testing.T) {
	base := newTool(t)
	got, err := invokeCalculate(t, base, map[string]any{"expression": "   "})
	if err != nil {
		t.Fatalf("invalid input must not be a Go error: %v", err)
	}
	if !strings.Contains(got, "error: expression is required") {
		t.Fatalf("result = %q", got)
	}
}

func TestToolReportsEvaluationErrorAsResult(t *testing.T) {
	base := newTool(t)
	for _, expr := range []string{"1/0", "sqrt(-1)", "1+"} {
		got, err := invokeCalculate(t, base, map[string]any{"expression": expr})
		if err != nil {
			t.Fatalf("invoke(%q) must not be a Go error: %v", expr, err)
		}
		if !strings.HasPrefix(got, "error: ") {
			t.Fatalf("invoke(%q) result = %q, want error text", expr, got)
		}
	}
}

func TestToolFormatsEdgeValues(t *testing.T) {
	for _, tc := range []struct {
		expr string
		want string
	}{
		{"1e15", "1000000000000000"},
		{"-7 % 3", "-1"},
		{"2^-2", "0.25"},
		{"2^3^2", "512"},
	} {
		got, err := invokeCalculate(t, newTool(t), map[string]any{"expression": tc.expr})
		if err != nil {
			t.Fatalf("invoke(%q) error: %v", tc.expr, err)
		}
		want := tc.expr + " = " + tc.want
		if got != want {
			t.Errorf("invoke(%q) = %q, want %q", tc.expr, got, want)
		}
	}
}
