package executor

import (
	"context"

	"rpa-agent-workflow/contracts/block"
)

type Options struct {
	Inputs    map[string]any
	Blocks    map[string]block.Definition
	Host      Host
	Recorder  Recorder
	DebugHook DebugHook
}

type Result struct {
	Inputs      map[string]any            `json:"inputs,omitempty"`
	Returns     map[string]any            `json:"returns"`
	Variables   map[string]any            `json:"variables,omitempty"`
	State       map[string]any            `json:"state,omitempty"`
	NodeOutputs map[string]map[string]any `json:"nodeOutputs,omitempty"`
	Events      []Event                   `json:"events,omitempty"`
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

type DebugHook interface {
	BeforeStatement(context.Context, StatementSnapshot) error
	AfterStatement(context.Context, StatementSnapshot) error
	OnError(context.Context, StatementSnapshot, error) error
}

type StatementSnapshot struct {
	WorkflowID    string
	StatementID   string
	StatementKind string
	BranchID      string
	Frames        []FrameSnapshot
	Variables     map[string]any
	State         map[string]any
	NodeOutputs   map[string]map[string]any
}

type FrameSnapshot struct {
	WorkflowID string
	Locals     map[string]any
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
