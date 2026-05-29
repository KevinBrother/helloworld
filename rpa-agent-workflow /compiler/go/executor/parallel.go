package executor

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"rpa-agent-workflow/contracts/ast"
)

func (s *state) runParallel(ctx context.Context, stmt ast.Statement) error {
	if err := validateParallelJoinPolicy(stmt, s.currentWorkflowID()); err != nil {
		return err
	}

	branchWrites, err := detectParallelConflicts(stmt, s.currentWorkflowID())
	if err != nil {
		return err
	}

	for i := range stmt.Branches {
		branch := stmt.Branches[i]
		s.emit(Event{
			Name:          "parallel.branch.start",
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Payload: map[string]any{
				"branchId": branch.ID,
			},
		})

		branchState := s.cloneForParallel()
		err := branchState.runStatements(ctx, branch.Body)
		s.appendEvents(branchState.events)

		payload := map[string]any{
			"branchId": branch.ID,
		}
		if err != nil {
			var signal returnSignal
			if !errors.As(err, &signal) {
				payload["error"] = err.Error()
			}
		}
		s.emit(Event{
			Name:          "parallel.branch.end",
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Payload:       payload,
		})
		if err != nil {
			var signal returnSignal
			if errors.As(err, &signal) {
				return err
			}
			return attachBranchError(err, stmt, branch.ID, s.currentWorkflowID())
		}

		for name := range branchWrites[i] {
			value, ok := branchState.variables[name]
			if ok {
				s.variables[name] = value
			}
		}
	}

	return nil
}

func validateParallelJoinPolicy(stmt ast.Statement, workflowID string) error {
	if stmt.Join == nil || stmt.Join.Strategy == "" || stmt.Join.Strategy == "all" {
		if stmt.Join != nil && stmt.Join.TimeoutMs > 0 {
			return &RuntimeError{
				Phase:         PhaseExecute,
				WorkflowID:    workflowID,
				StatementID:   stmt.ID,
				StatementKind: stmt.Kind,
				Cause:         fmt.Errorf("%w: parallel timeout is unsupported", ErrUnsupportedFeature),
			}
		}
		if stmt.Join != nil && stmt.Join.OnError != "" && stmt.Join.OnError != "failFast" {
			return &RuntimeError{
				Phase:         PhaseExecute,
				WorkflowID:    workflowID,
				StatementID:   stmt.ID,
				StatementKind: stmt.Kind,
				Cause:         fmt.Errorf("%w: parallel onError %q is unsupported", ErrUnsupportedFeature, stmt.Join.OnError),
			}
		}
		return nil
	}

	return &RuntimeError{
		Phase:         PhaseExecute,
		WorkflowID:    workflowID,
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
		Cause:         fmt.Errorf("%w: parallel join strategy %q is unsupported", ErrUnsupportedFeature, stmt.Join.Strategy),
	}
}

func (s *state) appendEvents(events []Event) {
	s.events = append(s.events, events...)
}

func detectParallelConflicts(stmt ast.Statement, workflowID string) ([]map[string]struct{}, error) {
	branchWrites := make([]map[string]struct{}, len(stmt.Branches))
	owners := map[string]string{}

	for i := range stmt.Branches {
		branch := stmt.Branches[i]
		writes := collectVariableWrites(branch.Body)
		branchWrites[i] = writes
		for name := range writes {
			if _, ok := owners[name]; ok {
				return nil, (&RuntimeError{
					Phase:         PhaseExecute,
					WorkflowID:    workflowID,
					StatementID:   stmt.ID,
					StatementKind: stmt.Kind,
					BranchID:      branch.ID,
					Cause:         fmt.Errorf("shared write to %q", name),
				}).withBranch(branch.ID)
			}
			owners[name] = branch.ID
		}
	}

	return branchWrites, nil
}

func collectVariableWrites(statements []ast.Statement) map[string]struct{} {
	writes := map[string]struct{}{}
	for i := range statements {
		collectStatementWrites(statements[i], writes)
	}
	return writes
}

func collectStatementWrites(stmt ast.Statement, writes map[string]struct{}) {
	switch stmt.Kind {
	case "assign":
		if stmt.Target != "" {
			writes[stmt.Target] = struct{}{}
		}
	case "sequence", "loop":
		for i := range stmt.Statements {
			collectStatementWrites(stmt.Statements[i], writes)
		}
	case "if":
		for i := range stmt.Then {
			collectStatementWrites(stmt.Then[i], writes)
		}
		for i := range stmt.Else {
			collectStatementWrites(stmt.Else[i], writes)
		}
	case "parallel":
		for i := range stmt.Branches {
			for j := range stmt.Branches[i].Body {
				collectStatementWrites(stmt.Branches[i].Body[j], writes)
			}
		}
	case "try":
		for i := range stmt.Statements {
			collectStatementWrites(stmt.Statements[i], writes)
		}
		for i := range stmt.Catches {
			for j := range stmt.Catches[i].Body {
				collectStatementWrites(stmt.Catches[i].Body[j], writes)
			}
		}
		for i := range stmt.Finally {
			collectStatementWrites(stmt.Finally[i], writes)
		}
	case "callBlock", "callWorkflow":
		collectOutputWrites(stmt.Outputs, writes)
	}
}

func collectOutputWrites(outputs map[string]ast.Expression, writes map[string]struct{}) {
	for _, expr := range outputs {
		if expr.Kind != "ref" || !strings.HasPrefix(expr.Ref, "var.") {
			continue
		}
		writes[strings.TrimPrefix(expr.Ref, "var.")] = struct{}{}
	}
}

func attachBranchError(err error, stmt ast.Statement, branchID string, workflowID string) error {
	if err == nil {
		return nil
	}
	var runtimeErr *RuntimeError
	if errors.As(err, &runtimeErr) {
		return runtimeErr.withBranch(branchID)
	}
	return &RuntimeError{
		Phase:         PhaseExecute,
		WorkflowID:    workflowID,
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
		BranchID:      branchID,
		Cause:         err,
	}
}
