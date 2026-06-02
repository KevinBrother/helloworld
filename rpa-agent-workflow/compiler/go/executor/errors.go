package executor

import "errors"

const (
	PhaseLoad    = "load"
	PhaseEval    = "eval"
	PhaseExecute = "execute"
	PhaseHost    = "host"
)

var ErrHostUnavailable = errors.New("executor host is unavailable")

var ErrUnsupportedFeature = errors.New("executor feature is unsupported")

type RuntimeError struct {
	Phase         string
	WorkflowID    string
	StatementID   string
	StatementKind string
	BranchID      string
	Cause         error
}

func (e *RuntimeError) Error() string {
	if e == nil {
		return "<nil>"
	}
	if e.Cause == nil {
		return e.Phase
	}
	return e.Phase + ": " + e.Cause.Error()
}

func (e *RuntimeError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Cause
}

func (e *RuntimeError) withBranch(branchID string) *RuntimeError {
	if e == nil {
		return nil
	}
	if branchID == "" || e.BranchID == branchID {
		return e
	}
	copy := *e
	copy.BranchID = branchID
	return &copy
}
