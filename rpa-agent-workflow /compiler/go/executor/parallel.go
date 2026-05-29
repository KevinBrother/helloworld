package executor

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"rpa-agent-workflow/contracts/ast"
)

type branchResult struct {
	index int
	id    string
	state *state
	err   error
}

func (s *state) runParallel(ctx context.Context, stmt ast.Statement) error {
	if err := validateParallelJoinPolicy(stmt, s.currentWorkflowID()); err != nil {
		return err
	}

	branchWrites, err := detectParallelConflicts(stmt, s.currentWorkflowID())
	if err != nil {
		return err
	}

	branchCtx := ctx
	var cancel context.CancelFunc = func() {}
	if stmt.Join != nil && stmt.Join.TimeoutMs > 0 {
		branchCtx, cancel = context.WithTimeout(ctx, time.Duration(stmt.Join.TimeoutMs)*time.Millisecond)
	} else {
		branchCtx, cancel = context.WithCancel(ctx)
	}
	defer cancel()

	results := make([]branchResult, len(stmt.Branches))
	resultCh := make(chan branchResult, len(stmt.Branches))
	var once sync.Once

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

		go func(index int, branch ast.Branch) {
			branchState := s.cloneForParallel(branch.ID)
			err := branchState.runStatements(branchCtx, branch.Body)
			if err != nil && shouldCancelParallel(err) {
				once.Do(cancel)
			}
			resultCh <- branchResult{
				index: index,
				id:    branch.ID,
				state: branchState,
				err:   err,
			}
		}(i, branch)
	}

	for range stmt.Branches {
		result := <-resultCh
		results[result.index] = result
		if result.err != nil {
			var signal returnSignal
			if errors.As(result.err, &signal) {
				continue
			}
			if isParallelFailFast(stmt) {
				once.Do(cancel)
			}
		}
	}

	for i := range results {
		result := results[i]
		if result.state != nil {
			s.appendEvents(result.state.events)
		}
		payload := map[string]any{
			"branchId": result.id,
		}
		if result.err != nil {
			var signal returnSignal
			if !errors.As(result.err, &signal) {
				payload["error"] = result.err.Error()
			}
		}
		s.emit(Event{
			Name:          "parallel.branch.end",
			WorkflowID:    s.currentWorkflowID(),
			StatementID:   stmt.ID,
			StatementKind: stmt.Kind,
			Payload:       payload,
		})
	}

	if err := firstParallelControlError(results, stmt, s.currentWorkflowID()); err != nil {
		return err
	}

	for i := range results {
		for name := range branchWrites[i] {
			value, ok := results[i].state.variables[name]
			if ok {
				s.variables[name] = value
			}
		}
	}

	return nil
}

func firstParallelControlError(results []branchResult, stmt ast.Statement, workflowID string) error {
	var contextErr error
	var nonContextErr error
	var nonContextErrIndex = -1
	for i := range results {
		result := results[i]
		if result.err == nil {
			continue
		}
		var signal returnSignal
		if errors.As(result.err, &signal) {
			return result.err
		}
		if errors.Is(result.err, context.Canceled) || errors.Is(result.err, context.DeadlineExceeded) {
			if contextErr == nil {
				contextErr = attachBranchError(result.err, stmt, result.id, workflowID)
			}
			continue
		}
		if nonContextErr == nil {
			nonContextErr = result.err
			nonContextErrIndex = i
		}
	}
	if nonContextErr != nil {
		return attachBranchError(nonContextErr, stmt, results[nonContextErrIndex].id, workflowID)
	}
	return contextErr
}

func validateParallelJoinPolicy(stmt ast.Statement, workflowID string) error {
	if stmt.Join == nil || stmt.Join.Strategy == "" || stmt.Join.Strategy == "all" {
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
	for _, event := range events {
		s.events = append(s.events, event)
		s.recorder.Record(event)
	}
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

func isParallelFailFast(stmt ast.Statement) bool {
	return stmt.Join != nil && stmt.Join.OnError == "failFast"
}

func shouldCancelParallel(err error) bool {
	if err == nil {
		return false
	}
	return !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded)
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
