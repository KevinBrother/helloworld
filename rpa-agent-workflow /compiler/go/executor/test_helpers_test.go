package executor

import (
	"context"

	"rpa-agent-workflow/contracts/ast"
)

func newTestState(workflow ast.Workflow, opts Options) *state {
	return newState(workflow, opts)
}

type fakeHost struct {
	calls  []BlockCall
	result BlockResult
	err    error
}

func (h *fakeHost) Call(ctx context.Context, call BlockCall) (BlockResult, error) {
	h.calls = append(h.calls, call)
	if h.err != nil {
		return BlockResult{}, h.err
	}
	return h.result, nil
}
