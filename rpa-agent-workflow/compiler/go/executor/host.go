package executor

import (
	"context"
	"fmt"

	"rpa-agent-workflow/contracts/ast"
)

func (s *state) runCallBlock(ctx context.Context, stmt ast.Statement) error {
	definition, ok := s.blocks[stmt.Block]
	if !ok {
		return &RuntimeError{
			Phase:         PhaseExecute,
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Cause:         fmt.Errorf("unknown block %q", stmt.Block),
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

	s.emit(Event{
		Name:          "host.call.start",
		WorkflowID:    s.currentWorkflowID(),
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
		Payload: map[string]any{
			"block":  stmt.Block,
			"inputs": inputs,
		},
	})

	result, err := s.host.Call(ctx, BlockCall{
		Definition:  definition,
		WorkflowID:  s.currentWorkflowID(),
		StatementID: stmt.ID,
		Inputs:      inputs,
	})
	if err != nil {
		s.emit(Event{
			Name:          "host.call.end",
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Payload: map[string]any{
				"block": stmt.Block,
				"error": err.Error(),
			},
		})
		return &RuntimeError{
			Phase:         PhaseHost,
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Cause:         err,
		}
	}

	if err := runtimeContextError(ctx, s.currentWorkflowID(), stmt); err != nil {
		s.emit(Event{
			Name:          "host.call.end",
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Payload: map[string]any{
				"block": stmt.Block,
				"error": ctx.Err().Error(),
			},
		})
		return err
	}

	s.emit(Event{
		Name:          "host.call.end",
		WorkflowID:    s.currentWorkflowID(),
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
		Payload: map[string]any{
			"block":   stmt.Block,
			"outputs": result.Outputs,
		},
	})

	s.storeNodeOutputs(stmt.ID, result.Outputs)
	return s.bindBlockOutputs(stmt, result)
}

func (s *state) bindBlockOutputs(stmt ast.Statement, result BlockResult) error {
	return s.bindStatementOutputs(stmt, result.Outputs, PhaseHost, "host")
}
