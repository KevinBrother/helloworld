package astdbg

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"sync"

	"rpa-agent-workflow/compiler/go/executor"
	"rpa-agent-workflow/contracts/ast"
)

func NewSession(workflow ast.Workflow, _ Options) *Session {
	s := &Session{
		workflow:    workflow,
		nodes:       map[string]nodeInfo{},
		breakpoints: map[string]struct{}{},
		mode:        modeContinue,
	}
	s.cond = sync.NewCond(&s.mu)
	s.indexWorkflow(workflow)
	s.stop = Snapshot{
		WorkflowID: workflow.Workflow.ID,
	}
	s.started = false
	return s
}

func (s *Session) SetBreakpoints(bps []Breakpoint) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.breakpoints = map[string]struct{}{}
	for _, bp := range bps {
		if bp.StatementID != "" {
			s.breakpoints[bp.StatementID] = struct{}{}
		}
	}
}

func (s *Session) Continue() error {
	return s.setMode(modeContinue, StopReasonContinue())
}

func (s *Session) Next() error {
	return s.setMode(modeNext, StopReasonContinue())
}

func (s *Session) StepIn() error {
	return s.setMode(modeStepIn, StopReasonContinue())
}

func (s *Session) StepOut() error {
	return s.setMode(modeStepOut, StopReasonContinue())
}

func (s *Session) Pause() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.pauseNext = true
	s.cond.Broadcast()
	return nil
}

func (s *Session) Terminate() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.terminated = true
	s.stop.StopReason = StopReasonTerminated
	s.waiting = false
	s.cond.Broadcast()
	return nil
}

func (s *Session) Snapshot() Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.stop.Copy()
}

func (s *Session) BeforeStatement(_ context.Context, snapshot executor.StatementSnapshot) error {
	return s.handleStatement(snapshot, nil, false)
}

func (s *Session) AfterStatement(_ context.Context, snapshot executor.StatementSnapshot) error {
	return s.handleStatement(snapshot, nil, true)
}

func (s *Session) OnError(_ context.Context, snapshot executor.StatementSnapshot, err error) error {
	return s.handleStatement(snapshot, err, true)
}

func (s *Session) handleStatement(snapshot executor.StatementSnapshot, runErr error, after bool) error {
	s.mu.Lock()
	if s.terminated {
		s.mu.Unlock()
		return nil
	}

	stopReason, shouldStop := s.shouldStopLocked(snapshot, runErr, after)
	if shouldStop {
		s.updateSnapshotLocked(snapshot, runErr, stopReason)
		if !shouldWait(stopReason) {
			s.mu.Unlock()
			return nil
		}
		s.waiting = true
		s.cond.Broadcast()
		for s.waiting && !s.terminated {
			s.cond.Wait()
		}
		terminate := s.terminated
		s.mu.Unlock()
		if terminate {
			return nil
		}
		return nil
	}

	if after && isRootSnapshot(s.workflow, snapshot) {
		s.updateSnapshotLocked(snapshot, runErr, StopReasonEnd)
	}
	s.mu.Unlock()
	return nil
}

func (s *Session) shouldStopLocked(snapshot executor.StatementSnapshot, runErr error, after bool) (StopReason, bool) {
	if runErr != nil {
		if errors.Is(runErr, context.Canceled) || errors.Is(runErr, context.DeadlineExceeded) {
			return StopReasonPause, false
		}
		return StopReasonException, true
	}

	if !s.started {
		s.started = true
		return StopReasonEntry, true
	}

	if s.pauseNext {
		s.pauseNext = false
		return StopReasonPause, true
	}

	if _, ok := s.breakpoints[snapshot.StatementID]; ok && !after {
		return StopReasonBreakpoint, true
	}

	if s.mode == modeNext && !after && s.shouldStopForNext(snapshot) {
		return StopReasonStep, true
	}
	if s.mode == modeStepIn && !after {
		return StopReasonStep, true
	}
	if s.mode == modeStepOut && !after && len(snapshot.Frames) <= s.focusDepth && !sameFocus(s.focus, snapshot) {
		return StopReasonStep, true
	}

	if after && isRootSnapshot(s.workflow, snapshot) {
		return StopReasonEnd, true
	}

	return StopReasonEnd, false
}

func shouldWait(reason StopReason) bool {
	switch reason {
	case StopReasonEntry, StopReasonBreakpoint, StopReasonStep, StopReasonPause:
		return true
	default:
		return false
	}
}

func (s *Session) updateSnapshotLocked(snapshot executor.StatementSnapshot, runErr error, reason StopReason) {
	frames := make([]FrameSnapshot, len(snapshot.Frames))
	for i := range snapshot.Frames {
		frames[i] = FrameSnapshot{
			WorkflowID: snapshot.Frames[i].WorkflowID,
			Locals:     cloneMap(snapshot.Frames[i].Locals),
		}
	}

	locals := map[string]any{}
	if len(frames) > 0 {
		locals = cloneMap(frames[len(frames)-1].Locals)
	}

	s.stop = Snapshot{
		WorkflowID:    snapshot.WorkflowID,
		StatementID:   snapshot.StatementID,
		StatementKind: snapshot.StatementKind,
		BranchID:      snapshot.BranchID,
		Frames:        frames,
		Locals:        locals,
		Variables:     cloneMap(snapshot.Variables),
		StopReason:    reason,
	}
	if runErr != nil {
		s.stop.Error = runErr.Error()
	}
}

func (s *Session) setMode(mode runMode, reason StopReason) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mode = mode
	s.stop.StopReason = reason
	s.focus = nodeRef{workflowID: s.stop.WorkflowID, statementID: s.stop.StatementID}
	s.focusDepth = len(s.stop.Frames)
	s.waiting = false
	s.cond.Broadcast()
	return nil
}

func (s *Session) indexWorkflow(workflow ast.Workflow) {
	s.indexStatements(workflow.Workflow.ID, workflow.Body, nodeRef{})
	for _, sub := range workflow.Workflows {
		s.indexStatements(sub.ID, sub.Body, nodeRef{workflowID: sub.ID})
	}
}

func (s *Session) indexStatements(workflowID string, stmt ast.Statement, parent nodeRef) {
	if stmt.ID != "" {
		s.nodes[nodeKey(workflowID, stmt.ID)] = nodeInfo{
			workflowID:  workflowID,
			statementID: stmt.ID,
			parent:      parent,
		}
		parent = nodeRef{workflowID: workflowID, statementID: stmt.ID}
	}
	switch stmt.Kind {
	case "sequence", "loop":
		for i := range stmt.Statements {
			s.indexStatements(workflowID, stmt.Statements[i], parent)
		}
	case "if":
		for i := range stmt.Then {
			s.indexStatements(workflowID, stmt.Then[i], parent)
		}
		for i := range stmt.Else {
			s.indexStatements(workflowID, stmt.Else[i], parent)
		}
	case "parallel":
		for i := range stmt.Branches {
			for j := range stmt.Branches[i].Body {
				s.indexStatements(workflowID, stmt.Branches[i].Body[j], parent)
			}
		}
	case "try":
		for i := range stmt.Statements {
			s.indexStatements(workflowID, stmt.Statements[i], parent)
		}
		for i := range stmt.Catches {
			for j := range stmt.Catches[i].Body {
				s.indexStatements(workflowID, stmt.Catches[i].Body[j], parent)
			}
		}
		for i := range stmt.Finally {
			s.indexStatements(workflowID, stmt.Finally[i], parent)
		}
	}
}

func StopReasonContinue() StopReason { return "" }

func (s Snapshot) Copy() Snapshot {
	s.Frames = cloneFrameSnapshots(s.Frames)
	s.Locals = cloneMap(s.Locals)
	s.Variables = cloneMap(s.Variables)
	return s
}

func cloneFrameSnapshots(src []FrameSnapshot) []FrameSnapshot {
	if src == nil {
		return nil
	}
	dst := make([]FrameSnapshot, len(src))
	for i := range src {
		dst[i] = FrameSnapshot{
			WorkflowID: src[i].WorkflowID,
			Locals:     cloneMap(src[i].Locals),
		}
	}
	return dst
}

func cloneMap(src map[string]any) map[string]any {
	if src == nil {
		return nil
	}
	dst := make(map[string]any, len(src))
	for key, value := range src {
		dst[key] = cloneValue(value)
	}
	return dst
}

func cloneValue(value any) any {
	if value == nil {
		return nil
	}
	switch typed := value.(type) {
	case map[string]any:
		return cloneMap(typed)
	case []any:
		dst := make([]any, len(typed))
		for i := range typed {
			dst[i] = cloneValue(typed[i])
		}
		return dst
	}

	rv := reflect.ValueOf(value)
	switch rv.Kind() {
	case reflect.Map:
		if rv.Type().Key().Kind() != reflect.String {
			return value
		}
		dst := reflect.MakeMapWithSize(rv.Type(), rv.Len())
		iter := rv.MapRange()
		for iter.Next() {
			clonedValue := cloneValue(iter.Value().Interface())
			if clonedValue == nil {
				dst.SetMapIndex(iter.Key(), reflect.Zero(rv.Type().Elem()))
				continue
			}
			cv := reflect.ValueOf(clonedValue)
			if cv.Type().AssignableTo(rv.Type().Elem()) {
				dst.SetMapIndex(iter.Key(), cv)
				continue
			}
			if cv.Type().ConvertibleTo(rv.Type().Elem()) {
				dst.SetMapIndex(iter.Key(), cv.Convert(rv.Type().Elem()))
				continue
			}
			dst.SetMapIndex(iter.Key(), iter.Value())
		}
		return dst.Interface()
	case reflect.Slice:
		dst := reflect.MakeSlice(rv.Type(), rv.Len(), rv.Len())
		for i := 0; i < rv.Len(); i++ {
			clonedValue := cloneValue(rv.Index(i).Interface())
			if clonedValue == nil {
				dst.Index(i).Set(reflect.Zero(rv.Type().Elem()))
				continue
			}
			cv := reflect.ValueOf(clonedValue)
			if cv.Type().AssignableTo(rv.Type().Elem()) {
				dst.Index(i).Set(cv)
				continue
			}
			if cv.Type().ConvertibleTo(rv.Type().Elem()) {
				dst.Index(i).Set(cv.Convert(rv.Type().Elem()))
				continue
			}
			dst.Index(i).Set(rv.Index(i))
		}
		return dst.Interface()
	default:
		return value
	}
}

func (s *Session) String() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return fmt.Sprintf("%s/%s/%s", s.stop.WorkflowID, s.stop.StatementID, s.stop.StopReason)
}

func (s *Session) sameOrShallower(snapshot executor.StatementSnapshot) bool {
	if !s.focus.valid() {
		return true
	}
	current := nodeRef{workflowID: snapshot.WorkflowID, statementID: snapshot.StatementID}
	for current.valid() {
		if current == s.focus {
			return false
		}
		info, ok := s.nodes[nodeKey(current.workflowID, current.statementID)]
		if !ok {
			return true
		}
		current = info.parent
	}
	return true
}

func (s *Session) shouldStopForNext(snapshot executor.StatementSnapshot) bool {
	if sameFocus(s.focus, snapshot) {
		return false
	}
	if s.isWorkflowRoot(s.focus) {
		return true
	}
	return s.sameOrShallower(snapshot)
}

func sameFocus(focus nodeRef, snapshot executor.StatementSnapshot) bool {
	return focus.workflowID == snapshot.WorkflowID && focus.statementID == snapshot.StatementID
}

func isRootSnapshot(workflow ast.Workflow, snapshot executor.StatementSnapshot) bool {
	return snapshot.WorkflowID == workflow.Workflow.ID && snapshot.StatementID == workflow.Body.ID
}

func (s *Session) isWorkflowRoot(ref nodeRef) bool {
	return ref.workflowID == s.workflow.Workflow.ID && ref.statementID == s.workflow.Body.ID
}
