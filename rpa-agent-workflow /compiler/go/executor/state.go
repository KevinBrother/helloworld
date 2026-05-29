package executor

import (
	"context"
	"fmt"
	"reflect"
	"strings"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

type returnSignal struct {
	values map[string]any
}

func (s returnSignal) Error() string {
	return "return"
}

type frame struct {
	workflowID string
	locals     map[string]any
}

type state struct {
	workflow  ast.Workflow
	frames    []frame
	variables map[string]any
	blocks    map[string]block.Definition
	host      Host
	recorder  Recorder
	debugHook DebugHook
	branchID  string
	events    []Event
}

func newState(workflow ast.Workflow, opts Options) *state {
	recorder := opts.Recorder
	if recorder == nil {
		recorder = nopRecorder{}
	}

	host := opts.Host
	if host == nil {
		host = unsupportedHost{}
	}

	blocks := opts.Blocks
	if blocks == nil {
		blocks = map[string]block.Definition{}
	}

	st := &state{
		workflow:  workflow,
		variables: map[string]any{},
		blocks:    blocks,
		host:      host,
		recorder:  recorder,
		debugHook: opts.DebugHook,
	}
	st.pushFrame(workflow.Workflow.ID)
	for name, value := range opts.Inputs {
		st.currentFrame().locals["input."+name] = value
	}
	return st
}

func (s *state) emit(event Event) {
	s.events = append(s.events, event)
	s.recorder.Record(event)
}

func (s *state) currentFrame() *frame {
	if len(s.frames) == 0 {
		return nil
	}
	return &s.frames[len(s.frames)-1]
}

func (s *state) cloneForParallel(branchID string) *state {
	frames := make([]frame, len(s.frames))
	for i, frm := range s.frames {
		frames[i] = frame{
			workflowID: frm.workflowID,
			locals:     cloneAnyMap(frm.locals),
		}
	}

	return &state{
		workflow:  s.workflow,
		frames:    frames,
		variables: cloneAnyMap(s.variables),
		blocks:    s.blocks,
		host:      s.host,
		recorder:  nopRecorder{},
		debugHook: s.debugHook,
		branchID:  branchID,
	}
}

func cloneAnyMap(src map[string]any) map[string]any {
	if src == nil {
		return nil
	}
	dst := make(map[string]any, len(src))
	for key, value := range src {
		dst[key] = cloneJSONValue(value)
	}
	return dst
}

func cloneJSONValue(value any) any {
	if value == nil {
		return nil
	}
	switch typed := value.(type) {
	case map[string]any:
		return cloneAnyMap(typed)
	case []any:
		cloned := make([]any, len(typed))
		for i := range typed {
			cloned[i] = cloneJSONValue(typed[i])
		}
		return cloned
	}

	rv := reflect.ValueOf(value)
	switch rv.Kind() {
	case reflect.Map:
		if rv.Type().Key().Kind() != reflect.String {
			return value
		}
		cloned := reflect.MakeMapWithSize(rv.Type(), rv.Len())
		iter := rv.MapRange()
		for iter.Next() {
			clonedValue := cloneJSONValue(iter.Value().Interface())
			if clonedValue == nil {
				cloned.SetMapIndex(iter.Key(), reflect.Zero(rv.Type().Elem()))
				continue
			}
			cv := reflect.ValueOf(clonedValue)
			if cv.Type().AssignableTo(rv.Type().Elem()) {
				cloned.SetMapIndex(iter.Key(), cv)
				continue
			}
			if cv.Type().ConvertibleTo(rv.Type().Elem()) {
				cloned.SetMapIndex(iter.Key(), cv.Convert(rv.Type().Elem()))
				continue
			}
			cloned.SetMapIndex(iter.Key(), iter.Value())
		}
		return cloned.Interface()
	case reflect.Slice:
		cloned := reflect.MakeSlice(rv.Type(), rv.Len(), rv.Len())
		for i := 0; i < rv.Len(); i++ {
			clonedValue := cloneJSONValue(rv.Index(i).Interface())
			if clonedValue == nil {
				cloned.Index(i).Set(reflect.Zero(rv.Type().Elem()))
				continue
			}
			cv := reflect.ValueOf(clonedValue)
			if cv.Type().AssignableTo(rv.Type().Elem()) {
				cloned.Index(i).Set(cv)
				continue
			}
			if cv.Type().ConvertibleTo(rv.Type().Elem()) {
				cloned.Index(i).Set(cv.Convert(rv.Type().Elem()))
				continue
			}
			cloned.Index(i).Set(rv.Index(i))
		}
		return cloned.Interface()
	default:
		return value
	}
}

func (s *state) currentWorkflowID() string {
	frame := s.currentFrame()
	if frame == nil || frame.workflowID == "" {
		return s.workflow.Workflow.ID
	}
	return frame.workflowID
}

func (s *state) statementSnapshot(stmt ast.Statement) StatementSnapshot {
	frames := make([]FrameSnapshot, len(s.frames))
	for i := range s.frames {
		frames[i] = FrameSnapshot{
			WorkflowID: s.frames[i].workflowID,
			Locals:     cloneAnyMap(s.frames[i].locals),
		}
	}

	return StatementSnapshot{
		WorkflowID:    s.currentWorkflowID(),
		StatementID:   stmt.ID,
		StatementKind: stmt.Kind,
		BranchID:      s.branchID,
		Frames:        frames,
		Variables:     cloneAnyMap(s.variables),
	}
}

func (s *state) beforeStatement(ctx context.Context, stmt ast.Statement) error {
	if s.debugHook == nil {
		return nil
	}
	snapshot := s.statementSnapshot(stmt)
	return s.debugHook.BeforeStatement(ctx, snapshot)
}

func (s *state) afterStatement(ctx context.Context, stmt ast.Statement) error {
	if s.debugHook == nil {
		return nil
	}
	snapshot := s.statementSnapshot(stmt)
	return s.debugHook.AfterStatement(ctx, snapshot)
}

func (s *state) statementError(ctx context.Context, stmt ast.Statement, err error) error {
	if s.debugHook == nil {
		return err
	}
	snapshot := s.statementSnapshot(stmt)
	if hookErr := s.debugHook.OnError(ctx, snapshot, err); hookErr != nil {
		return hookErr
	}
	return err
}

func (s *state) subworkflow(id string) (ast.SubWorkflow, bool) {
	for i := range s.workflow.Workflows {
		if s.workflow.Workflows[i].ID == id {
			return s.workflow.Workflows[i], true
		}
	}
	return ast.SubWorkflow{}, false
}

func (s *state) pushFrame(workflowID string) *frame {
	s.frames = append(s.frames, frame{
		workflowID: workflowID,
		locals:     map[string]any{},
	})
	return s.currentFrame()
}

func (s *state) popFrame() {
	if len(s.frames) == 0 {
		return
	}
	s.frames = s.frames[:len(s.frames)-1]
}

func (s *state) setVariable(name string, value any) {
	s.variables[name] = value
	s.emit(Event{
		Name:       "variable.write",
		WorkflowID: s.currentWorkflowID(),
		Payload: map[string]any{
			"name":  name,
			"value": value,
		},
	})
}

func (s *state) bindStatementOutputs(stmt ast.Statement, values map[string]any, missingPhase string, source string) error {
	for outputName, destination := range stmt.Outputs {
		if destination.Kind != "ref" {
			return &RuntimeError{
				Phase:         PhaseExecute,
				WorkflowID:    s.currentWorkflowID(),
				StatementID:   stmt.ID,
				StatementKind: stmt.Kind,
				Cause:         fmt.Errorf("%s output %q destination must be ref, got %q", source, outputName, destination.Kind),
			}
		}

		ref := destination.Ref
		if strings.HasPrefix(ref, "input.") {
			return &RuntimeError{
				Phase:         PhaseExecute,
				WorkflowID:    s.currentWorkflowID(),
				StatementID:   stmt.ID,
				StatementKind: stmt.Kind,
				Cause:         fmt.Errorf("%s output %q cannot bind to input %q", source, outputName, ref),
			}
		}

		value, ok := values[outputName]
		if !ok {
			return &RuntimeError{
				Phase:         missingPhase,
				WorkflowID:    s.currentWorkflowID(),
				StatementID:   stmt.ID,
				StatementKind: stmt.Kind,
				Cause:         fmt.Errorf("missing %s output %q", source, outputName),
			}
		}

		if strings.HasPrefix(ref, "var.") {
			s.setVariable(strings.TrimPrefix(ref, "var."), value)
			continue
		}

		frame := s.currentFrame()
		if frame == nil {
			return &RuntimeError{
				Phase:         PhaseExecute,
				WorkflowID:    s.currentWorkflowID(),
				StatementID:   stmt.ID,
				StatementKind: stmt.Kind,
				Cause:         fmt.Errorf("%s output %q has no frame for destination %q", source, outputName, ref),
			}
		}
		frame.locals[ref] = value
	}

	return nil
}
