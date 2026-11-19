package calculator

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/components/tool/utils"
)

const ToolName = "calculate"

type calculateArgs struct {
	Expression string `json:"expression" jsonschema:"description=Arithmetic expression to evaluate, e.g. 2*(3+4)^2; supports + - * / % ^, unary signs, parentheses, pi/e and sqrt, abs, floor, ceil, round, min, max, pow"`
}

func NewTool() (tool.BaseTool, error) {
	description := "Evaluate an arithmetic expression and return the result. " +
		"Supports + - * / % ^ (right-associative), unary signs, parentheses, " +
		"the constants pi and e, and sqrt, abs, floor, ceil, round, min, max, pow. " +
		"No variables, no assignment, no side effects."
	return utils.InferTool(ToolName, description, func(ctx context.Context, args calculateArgs) (string, error) {
		expression := strings.TrimSpace(args.Expression)
		if expression == "" {
			return "error: expression is required", nil
		}
		value, err := Evaluate(expression)
		if err != nil {
			return fmt.Sprintf("error: %v", err), nil
		}
		return expression + " = " + formatNumber(value), nil
	})
}

func formatNumber(value float64) string {
	if value == math.Trunc(value) && math.Abs(value) <= 1e15 {
		return strconv.FormatInt(int64(value), 10)
	}
	return strconv.FormatFloat(value, 'g', 15, 64)
}
