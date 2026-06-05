package executor

import (
	"context"
	"errors"
	"fmt"
	"reflect"

	"rpa-agent-workflow/contracts/ast"
)

func (s *state) runStatements(ctx context.Context, statements []ast.Statement) error {
	for i := range statements {
		if err := s.runStatement(ctx, statements[i]); err != nil {
			return err
		}
	}
	return nil
}

func (s *state) runLoop(ctx context.Context, stmt ast.Statement) error {
	switch stmt.LoopKind {
	case "", "while":
		for {
			condition, err := s.evalExpression(stmt.Condition)
			if err != nil {
				return err
			}
			if !isTruthy(condition) {
				return nil
			}
			if err := s.runStatements(ctx, stmt.Statements); err != nil {
				return err
			}
		}
	case "foreach":
		itemsValue, err := s.evalExpression(stmt.Iterable)
		if err != nil {
			return err
		}

		items, ok := foreachItems(itemsValue)
		if !ok {
			return &RuntimeError{
				Phase:         PhaseExecute,
				WorkflowID:    s.currentWorkflowID(),
				StatementID:   stmt.ID,
				StatementKind: stmt.Kind,
				Cause:         fmt.Errorf("foreach iterable must evaluate to array, got %T", itemsValue),
			}
		}

		frame := s.currentFrame()
		if frame == nil {
			return &RuntimeError{
				Phase:         PhaseExecute,
				WorkflowID:    s.currentWorkflowID(),
				StatementID:   stmt.ID,
				StatementKind: stmt.Kind,
				Cause:         errors.New("loop has no frame"),
			}
		}

		previous, hadPrevious := frame.locals[stmt.ItemVar]
		defer func() {
			if hadPrevious {
				frame.locals[stmt.ItemVar] = previous
				return
			}
			delete(frame.locals, stmt.ItemVar)
		}()

		for _, item := range items {
			frame.locals[stmt.ItemVar] = item
			if err := s.runStatements(ctx, stmt.Statements); err != nil {
				return err
			}
		}
		return nil
	default:
		return &RuntimeError{
			Phase:         PhaseExecute,
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Cause:         fmt.Errorf("unsupported loop kind %q", stmt.LoopKind),
		}
	}
}

func (s *state) runIf(ctx context.Context, stmt ast.Statement) error {
	if len(stmt.Branches) > 0 {
		selectedName := ""
		selectedBody := []ast.Statement(nil)

		for i := range stmt.Branches {
			branch := stmt.Branches[i]
			if branch.Default {
				continue
			}
			condition, err := s.evalExpression(branch.Condition)
			if err != nil {
				return err
			}
			if isTruthy(condition) {
				selectedName = branch.ID
				selectedBody = branch.Body
				break
			}
		}

		if selectedName == "" {
			for i := range stmt.Branches {
				branch := stmt.Branches[i]
				if branch.Default {
					selectedName = branch.ID
					selectedBody = branch.Body
					break
				}
			}
		}

		if err := s.runStatements(ctx, selectedBody); err != nil {
			return err
		}
		if selectedName == "" {
			return nil
		}
		return s.mergeBranchOutputs(stmt, selectedName)
	}

	condition, err := s.evalExpression(stmt.Condition)
	if err != nil {
		return err
	}
	var branch []ast.Statement
	branchName := "else"
	if isTruthy(condition) {
		branch = stmt.Then
		branchName = "then"
	} else {
		branch = stmt.Else
	}
	if err := s.runStatements(ctx, branch); err != nil {
		return err
	}
	return s.mergeBranchOutputs(stmt, branchName)
}

func (s *state) runCallWorkflow(ctx context.Context, stmt ast.Statement) error {
	subworkflow, ok := s.subworkflow(stmt.Workflow)
	if !ok {
		return &RuntimeError{
			Phase:         PhaseExecute,
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Cause:         fmt.Errorf("unknown subworkflow %q", stmt.Workflow),
		}
	}

	inputs := make(map[string]any, len(stmt.Inputs))
	for name, expr := range stmt.Inputs {
		value, err := s.evalExpression(&expr)
		if err != nil {
			return err
		}
		inputs[name] = value
	}

	frame := s.pushFrame(subworkflow.ID)
	for name, value := range inputs {
		frame.locals["input."+name] = value
	}

	err := s.runStatement(ctx, subworkflow.Body)
	s.popFrame()
	if err == nil {
		return s.bindCallWorkflowOutputs(stmt, map[string]any{})
	}

	var signal returnSignal
	if errors.As(err, &signal) {
		return s.bindCallWorkflowOutputs(stmt, signal.values)
	}
	return err
}

func (s *state) bindCallWorkflowOutputs(stmt ast.Statement, values map[string]any) error {
	s.storeNodeOutputs(stmt.ID, values)
	if len(stmt.Outputs) == 0 {
		return nil
	}
	return s.bindStatementOutputs(stmt, values, PhaseExecute, "workflow")
}

func (s *state) runTry(ctx context.Context, stmt ast.Statement) error {
	err := s.runStatements(ctx, stmt.Statements)
	if err != nil {
		var signal returnSignal
		if !errors.As(err, &signal) {
			handled := false
			for i := range stmt.Catches {
				catch := stmt.Catches[i]
				if !matchCatchPattern(err, catch.Pattern) {
					continue
				}

				frame := s.currentFrame()
				if catch.As != "" && frame != nil {
					previous, hadPrevious := frame.locals[catch.As]
					frame.locals[catch.As] = err
					err = func() error {
						defer func() {
							if hadPrevious {
								frame.locals[catch.As] = previous
								return
							}
							delete(frame.locals, catch.As)
						}()
						return s.runStatements(ctx, catch.Body)
					}()
				} else {
					err = s.runStatements(ctx, catch.Body)
				}
				handled = true
				break
			}
			if !handled {
				// Keep the original error.
			}
		}
	}

	finallyErr := s.runStatements(ctx, stmt.Finally)
	if finallyErr != nil {
		return finallyErr
	}
	return err
}

func foreachItems(value any) ([]any, bool) {
	if items, ok := value.([]any); ok {
		return items, true
	}

	rv := reflect.ValueOf(value)
	if !rv.IsValid() {
		return nil, false
	}
	if rv.Kind() != reflect.Slice && rv.Kind() != reflect.Array {
		return nil, false
	}

	items := make([]any, rv.Len())
	for i := 0; i < rv.Len(); i++ {
		items[i] = rv.Index(i).Interface()
	}
	return items, true
}

func matchCatchPattern(err error, pattern string) bool {
	if pattern == "*" {
		return true
	}

	for current := err; current != nil; current = errors.Unwrap(current) {
		if current.Error() == pattern {
			return true
		}

		typ := reflect.TypeOf(current)
		if typ == nil {
			continue
		}
		if typ.Name() == pattern || typ.String() == pattern {
			return true
		}
		if typ.Kind() == reflect.Pointer {
			elem := typ.Elem()
			if elem.Name() == pattern || elem.String() == pattern {
				return true
			}
		}

		if runtimeErr, ok := current.(*RuntimeError); ok {
			if runtimeErr.Phase == pattern || runtimeErr.StatementKind == pattern {
				return true
			}
		}
	}

	return false
}
