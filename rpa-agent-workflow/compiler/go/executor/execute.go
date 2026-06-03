package executor

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"

	"rpa-agent-workflow/contracts/ast"
)

func RunWorkflow(ctx context.Context, workflow ast.Workflow, opts Options) (Result, error) {
	if workflow.Workflow.ID == "" || workflow.Body.ID == "" || workflow.Body.Kind == "" {
		return Result{}, &RuntimeError{
			Phase:      PhaseLoad,
			WorkflowID: workflow.Workflow.ID,
			Cause:      errors.New("workflow body is incomplete"),
		}
	}

	if err := runtimeContextError(ctx, workflow.Workflow.ID, ast.Statement{}); err != nil {
		return Result{}, err
	}

	st := newState(workflow, opts)
	st.emit(Event{
		Name:       "workflow.start",
		WorkflowID: workflow.Workflow.ID,
	})

	err := st.runStatement(ctx, workflow.Body)
	if err != nil {
		var signal returnSignal
		if errors.As(err, &signal) {
			st.emit(Event{
				Name:       "workflow.end",
				WorkflowID: workflow.Workflow.ID,
			})
			return Result{
				Inputs:      cloneAnyMap(opts.Inputs),
				Returns:     signal.values,
				Variables:   st.variables,
				State:       st.globalState,
				NodeOutputs: st.nodeOutputs,
				Events:      st.events,
			}, nil
		}
		st.emit(Event{
			Name:       "workflow.end",
			WorkflowID: workflow.Workflow.ID,
		})
		return Result{}, err
	}

	st.emit(Event{
		Name:       "workflow.end",
		WorkflowID: workflow.Workflow.ID,
	})
	return Result{
		Inputs:      cloneAnyMap(opts.Inputs),
		Returns:     map[string]any{},
		Variables:   st.variables,
		State:       st.globalState,
		NodeOutputs: st.nodeOutputs,
		Events:      st.events,
	}, nil
}

func (s *state) mergeBranchOutputs(stmt ast.Statement, branchName string) error {
	if len(stmt.Outputs) == 0 {
		return nil
	}

	outputs := make(map[string]any, len(stmt.Outputs))
	for name, expr := range stmt.Outputs {
		selected := expr
		if expr.Kind == "branch" {
			branchExpr, ok := expr.Fields[branchName]
			if !ok {
				return &RuntimeError{
					Phase:         PhaseExecute,
					WorkflowID:    s.currentWorkflowID(),
					StatementID:   stmt.ID,
					StatementKind: stmt.Kind,
					Cause:         fmt.Errorf("missing %s output expression for %q", branchName, name),
				}
			}
			selected = branchExpr
		}

		value, err := s.evalExpression(&selected)
		if err != nil {
			return err
		}
		outputs[name] = value
	}
	s.storeNodeOutputs(stmt.ID, outputs)
	return nil
}

func (s *state) runStatement(ctx context.Context, stmt ast.Statement) error {
	if err := runtimeContextError(ctx, s.currentWorkflowID(), stmt); err != nil {
		return s.statementError(ctx, stmt, err)
	}

	s.emit(Event{
		Name:          "statement.start",
		WorkflowID:    s.currentWorkflowID(),
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
	})
	defer s.emit(Event{
		Name:          "statement.end",
		WorkflowID:    s.currentWorkflowID(),
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
	})

	if err := s.beforeStatement(ctx, stmt); err != nil {
		return err
	}

	err := s.runStatementBody(ctx, stmt)
	if err != nil {
		var signal returnSignal
		if errors.As(err, &signal) {
			if hookErr := s.afterStatement(ctx, stmt); hookErr != nil {
				return hookErr
			}
			return err
		}
		return s.statementError(ctx, stmt, err)
	}
	return s.afterStatement(ctx, stmt)
}

func (s *state) runStatementBody(ctx context.Context, stmt ast.Statement) error {
	switch stmt.Kind {
	case "sequence":
		return s.runStatements(ctx, stmt.Statements)
	case "assign":
		value, err := s.evalExpression(stmt.Value)
		if err != nil {
			return err
		}
		if strings.HasPrefix(stmt.Target, "state.") {
			s.setState(strings.TrimPrefix(stmt.Target, "state."), value)
			return nil
		}
		s.setVariable(stmt.Target, value)
		return nil
	case "if":
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
	case "parallel":
		return s.runParallel(ctx, stmt)
	case "loop":
		return s.runLoop(ctx, stmt)
	case "callBlock":
		return s.runCallBlock(ctx, stmt)
	case "callWorkflow":
		return s.runCallWorkflow(ctx, stmt)
	case "try":
		return s.runTry(ctx, stmt)
	case "return":
		values := make(map[string]any, len(stmt.Returns))
		for name, expr := range stmt.Returns {
			value, err := s.evalExpression(&expr)
			if err != nil {
				return err
			}
			values[name] = value
		}
		return returnSignal{values: values}
	default:
		return &RuntimeError{
			Phase:         PhaseExecute,
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Cause:         fmt.Errorf("unsupported statement kind %q", stmt.Kind),
		}
	}
}

func runtimeContextError(ctx context.Context, workflowID string, stmt ast.Statement) error {
	if ctx == nil || ctx.Err() == nil {
		return nil
	}
	return &RuntimeError{
		Phase:         PhaseExecute,
		WorkflowID:    workflowID,
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
		Cause:         ctx.Err(),
	}
}

func isTruthy(value any) bool {
	if value == nil {
		return false
	}

	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		return typed != ""
	case int:
		return typed != 0
	case int8:
		return typed != 0
	case int16:
		return typed != 0
	case int32:
		return typed != 0
	case int64:
		return typed != 0
	case uint:
		return typed != 0
	case uint8:
		return typed != 0
	case uint16:
		return typed != 0
	case uint32:
		return typed != 0
	case uint64:
		return typed != 0
	case uintptr:
		return typed != 0
	case float32:
		return typed != 0
	case float64:
		return typed != 0
	}

	rv := reflect.ValueOf(value)
	switch rv.Kind() {
	case reflect.Bool:
		return rv.Bool()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return rv.Int() != 0
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		return rv.Uint() != 0
	case reflect.Float32, reflect.Float64:
		return rv.Float() != 0
	case reflect.Array, reflect.Map, reflect.Slice, reflect.String:
		return rv.Len() > 0
	case reflect.Interface, reflect.Pointer:
		return !rv.IsNil()
	default:
		return true
	}
}
