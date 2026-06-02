package astdbg

import (
	"sync"

	"rpa-agent-workflow/compiler/go/executor"
	"rpa-agent-workflow/contracts/ast"
)

type Options struct{}

type Breakpoint struct {
	StatementID string
}

type StopReason string

const (
	StopReasonEntry      StopReason = "entry"
	StopReasonBreakpoint StopReason = "breakpoint"
	StopReasonStep       StopReason = "step"
	StopReasonPause      StopReason = "pause"
	StopReasonException  StopReason = "exception"
	StopReasonTerminated StopReason = "terminated"
	StopReasonEnd        StopReason = "end"
)

type Snapshot struct {
	WorkflowID    string
	StatementID   string
	StatementKind string
	BranchID      string
	Frames        []FrameSnapshot
	Locals        map[string]any
	Variables     map[string]any
	StopReason    StopReason
	Error         string
}

type FrameSnapshot struct {
	WorkflowID string
	Locals     map[string]any
}

type Session struct {
	mu   sync.Mutex
	cond *sync.Cond

	workflow ast.Workflow
	nodes    map[string]nodeInfo

	breakpoints map[string]struct{}
	started     bool
	waiting     bool
	terminated  bool
	pauseNext   bool
	skipStop    nodeRef

	mode       runMode
	focus      nodeRef
	focusDepth int
	stop       Snapshot
	stopSeq    uint64
}

type runMode int

const (
	modeContinue runMode = iota
	modeNext
	modeStepIn
	modeStepOut
)

type nodeRef struct {
	workflowID  string
	statementID string
}

type nodeInfo struct {
	workflowID  string
	statementID string
	parent      nodeRef
}

func newNodeRef(workflowID, statementID string) nodeRef {
	return nodeRef{workflowID: workflowID, statementID: statementID}
}

func (r nodeRef) valid() bool {
	return r.workflowID != "" && r.statementID != ""
}

func (r nodeRef) equals(other nodeRef) bool {
	return r.workflowID == other.workflowID && r.statementID == other.statementID
}

func nodeKey(workflowID, statementID string) string {
	return workflowID + "\x00" + statementID
}

var _ executor.DebugHook = (*Session)(nil)
