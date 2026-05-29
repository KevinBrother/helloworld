package executor

import (
	"fmt"
	"reflect"
	"strings"

	"rpa-agent-workflow/contracts/ast"
)

func (s *state) evalExpression(expr *ast.Expression) (any, error) {
	if expr == nil {
		return nil, nil
	}

	switch expr.Kind {
	case "literal":
		return s.applySelector(expr.Value, expr.Selector)
	case "ref":
		value, err := s.resolveRef(expr.Ref)
		if err != nil {
			return nil, err
		}
		return s.applySelector(value, expr.Selector)
	case "binary":
		return s.evalBinary(expr)
	case "array":
		items := make([]any, 0, len(expr.Items))
		for i := range expr.Items {
			value, err := s.evalExpression(&expr.Items[i])
			if err != nil {
				return nil, err
			}
			items = append(items, value)
		}
		return items, nil
	case "object":
		fields := make(map[string]any, len(expr.Fields))
		for key, child := range expr.Fields {
			value, err := s.evalExpression(&child)
			if err != nil {
				return nil, err
			}
			fields[key] = value
		}
		return s.applySelector(fields, expr.Selector)
	case "template":
		var b strings.Builder
		for i := range expr.Items {
			value, err := s.evalExpression(&expr.Items[i])
			if err != nil {
				return nil, err
			}
			b.WriteString(fmt.Sprint(value))
		}
		return s.applySelector(b.String(), expr.Selector)
	default:
		return nil, s.evalErrorf("unsupported expression kind %q", expr.Kind)
	}
}

func (s *state) resolveRef(ref string) (any, error) {
	if strings.HasPrefix(ref, "var.") {
		name := strings.TrimPrefix(ref, "var.")
		value, ok := s.variables[name]
		if !ok {
			return nil, s.evalErrorf("unknown variable ref %q", ref)
		}
		return value, nil
	}
	if len(s.frames) == 0 {
		return nil, s.evalErrorf("local ref %q has no frame", ref)
	}
	value, ok := s.frames[len(s.frames)-1].locals[ref]
	if !ok {
		return nil, s.evalErrorf("unknown local ref %q", ref)
	}
	return value, nil
}

func (s *state) applySelector(value any, selector string) (any, error) {
	if selector == "" {
		return value, nil
	}

	fields, ok := value.(map[string]any)
	if !ok {
		return nil, s.evalErrorf("selector %q requires object value", selector)
	}
	selected, ok := fields[selector]
	if !ok {
		return nil, s.evalErrorf("unknown selector field %q", selector)
	}
	return selected, nil
}

func (s *state) evalBinary(expr *ast.Expression) (any, error) {
	left, err := s.evalExpression(expr.Left)
	if err != nil {
		return nil, err
	}
	right, err := s.evalExpression(expr.Right)
	if err != nil {
		return nil, err
	}

	switch expr.Op {
	case "==":
		return reflect.DeepEqual(left, right), nil
	case "!=":
		return !reflect.DeepEqual(left, right), nil
	case "+":
		switch l := left.(type) {
		case string:
			r, ok := right.(string)
			if !ok {
				return nil, s.evalErrorf("unsupported binary operator %q for %T and %T", expr.Op, left, right)
			}
			return l + r, nil
		case int:
			if r, ok := right.(int); ok {
				return l + r, nil
			}
			return nil, s.evalErrorf("unsupported binary operator %q for %T and %T", expr.Op, left, right)
		case int64:
			if r, ok := right.(int64); ok {
				return l + r, nil
			}
			return nil, s.evalErrorf("unsupported binary operator %q for %T and %T", expr.Op, left, right)
		case float64:
			if r, ok := right.(float64); ok {
				return l + r, nil
			}
			return nil, s.evalErrorf("unsupported binary operator %q for %T and %T", expr.Op, left, right)
		}
		return nil, s.evalErrorf("unsupported binary operator %q for %T and %T", expr.Op, left, right)
	case "<":
		value, err := compareOrdered(left, right, func(result int) bool { return result < 0 })
		if err != nil {
			return nil, s.evalErrorf("unsupported binary operator %q for %T and %T", expr.Op, left, right)
		}
		return value, nil
	case ">":
		value, err := compareOrdered(left, right, func(result int) bool { return result > 0 })
		if err != nil {
			return nil, s.evalErrorf("unsupported binary operator %q for %T and %T", expr.Op, left, right)
		}
		return value, nil
	default:
		return nil, s.evalErrorf("unsupported binary operator %q", expr.Op)
	}
}

func compareOrdered(left, right any, accept func(int) bool) (any, error) {
	switch l := left.(type) {
	case string:
		r, ok := right.(string)
		if !ok {
			return nil, fmt.Errorf("ordered comparison requires matching types")
		}
		switch {
		case l < r:
			return accept(-1), nil
		case l > r:
			return accept(1), nil
		default:
			return accept(0), nil
		}
	case int:
		r, ok := right.(int)
		if !ok {
			return nil, fmt.Errorf("ordered comparison requires matching types")
		}
		switch {
		case l < r:
			return accept(-1), nil
		case l > r:
			return accept(1), nil
		default:
			return accept(0), nil
		}
	case int64:
		r, ok := right.(int64)
		if !ok {
			return nil, fmt.Errorf("ordered comparison requires matching types")
		}
		switch {
		case l < r:
			return accept(-1), nil
		case l > r:
			return accept(1), nil
		default:
			return accept(0), nil
		}
	case float64:
		r, ok := right.(float64)
		if !ok {
			return nil, fmt.Errorf("ordered comparison requires matching types")
		}
		switch {
		case l < r:
			return accept(-1), nil
		case l > r:
			return accept(1), nil
		default:
			return accept(0), nil
		}
	default:
		return nil, fmt.Errorf("ordered comparison requires string or number operands")
	}
}

func (s *state) evalErrorf(format string, args ...any) error {
	return &RuntimeError{
		Phase:      PhaseEval,
		WorkflowID: s.currentWorkflowID(),
		Cause:      fmt.Errorf(format, args...),
	}
}
