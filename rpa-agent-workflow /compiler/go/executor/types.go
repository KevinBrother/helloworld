package executor

import (
	"context"

	"rpa-agent-workflow/contracts/block"
)

type Options struct {
	Inputs   map[string]any
	Blocks   map[string]block.Definition
	Host     Host
	Recorder Recorder
}

type Result struct {
	Returns   map[string]any `json:"returns"`
	Variables map[string]any `json:"variables"`
	Events    []Event        `json:"events,omitempty"`
}

type Event struct {
	Name          string         `json:"name"`
	WorkflowID    string         `json:"workflowId,omitempty"`
	StatementID   string         `json:"statementId,omitempty"`
	StatementKind string         `json:"statementKind,omitempty"`
	Payload       map[string]any `json:"payload,omitempty"`
}

type Recorder interface {
	Record(Event)
}

type Host interface {
	Call(context.Context, BlockCall) (BlockResult, error)
}

type BlockCall struct {
	Definition  block.Definition
	WorkflowID  string
	StatementID string
	Inputs      map[string]any
}

type BlockResult struct {
	Value   any
	Outputs map[string]any
}

type nopRecorder struct{}

func (nopRecorder) Record(Event) {}

type unsupportedHost struct{}

func (unsupportedHost) Call(context.Context, BlockCall) (BlockResult, error) {
	return BlockResult{}, ErrHostUnavailable
}
