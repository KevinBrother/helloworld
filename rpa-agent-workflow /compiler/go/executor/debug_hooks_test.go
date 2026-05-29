package executor

import (
	"context"
	"errors"
	"reflect"
	"sync"
	"testing"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

func TestRunWorkflowCallsDebugHookOnStatementBoundaries(t *testing.T) {
	hook := &recordingDebugHook{}
	host := &debugHookHost{}
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "debug-hook-boundaries"},
		Workflows: []ast.SubWorkflow{
			{
				ID: "child",
				Body: ast.Statement{
					ID:   "child-return",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"value": {Kind: "ref", Ref: "input.child"},
					},
				},
			},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "set-seed",
					Kind:   "assign",
					Target: "seed",
					Value:  &ast.Expression{Kind: "literal", Value: "original"},
				},
				{
					ID:   "choose-main",
					Kind: "if",
					Condition: &ast.Expression{
						Kind:  "literal",
						Value: true,
					},
					Then: []ast.Statement{
						{
							ID:       "call-child",
							Kind:     "callWorkflow",
							Workflow: "child",
							Inputs: map[string]ast.Expression{
								"child": {Kind: "ref", Ref: "var.seed"},
							},
							Outputs: map[string]ast.Expression{
								"value": {Kind: "ref", Ref: "var.childResult"},
							},
						},
					},
				},
				{
					ID:       "loop-items",
					Kind:     "loop",
					LoopKind: "foreach",
					Iterable: &ast.Expression{
						Kind: "array",
						Items: []ast.Expression{
							{Kind: "literal", Value: "looped"},
						},
					},
					ItemVar: "item",
					Statements: []ast.Statement{
						{
							ID:     "copy-item",
							Kind:   "assign",
							Target: "loopValue",
							Value:  &ast.Expression{Kind: "ref", Ref: "item"},
						},
					},
				},
				{
					ID:   "recover-host-error",
					Kind: "try",
					Statements: []ast.Statement{
						{
							ID:    "fail-call",
							Kind:  "callBlock",
							Block: "test.fail",
						},
					},
					Catches: []ast.CatchClause{
						{
							Pattern: "*",
							Body: []ast.Statement{
								{
									ID:     "mark-recovered",
									Kind:   "assign",
									Target: "recovered",
									Value:  &ast.Expression{Kind: "literal", Value: true},
								},
							},
						},
					},
					Finally: []ast.Statement{
						{
							ID:     "mark-finally",
							Kind:   "assign",
							Target: "finallyRan",
							Value:  &ast.Expression{Kind: "literal", Value: true},
						},
					},
				},
				{
					ID:   "run-branches",
					Kind: "parallel",
					Branches: []ast.Branch{
						{
							ID: "left",
							Body: []ast.Statement{
								{
									ID:     "left-write",
									Kind:   "assign",
									Target: "left",
									Value:  &ast.Expression{Kind: "literal", Value: "left"},
								},
							},
						},
						{
							ID: "right",
							Body: []ast.Statement{
								{
									ID:    "right-call",
									Kind:  "callBlock",
									Block: "test.right",
									Outputs: map[string]ast.Expression{
										"value": {Kind: "ref", Ref: "var.right"},
									},
								},
							},
						},
					},
				},
				{
					ID:   "return-values",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"seed":        {Kind: "ref", Ref: "var.seed"},
						"childResult": {Kind: "ref", Ref: "var.childResult"},
						"loopValue":   {Kind: "ref", Ref: "var.loopValue"},
						"recovered":   {Kind: "ref", Ref: "var.recovered"},
						"finallyRan":  {Kind: "ref", Ref: "var.finallyRan"},
						"left":        {Kind: "ref", Ref: "var.left"},
						"right":       {Kind: "ref", Ref: "var.right"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{
		Blocks: map[string]block.Definition{
			"test.fail":  {ID: "test.fail"},
			"test.right": {ID: "test.right"},
		},
		Host:      host,
		DebugHook: hook,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	wantReturns := map[string]any{
		"seed":        "original",
		"childResult": "original",
		"loopValue":   "looped",
		"recovered":   true,
		"finallyRan":  true,
		"left":        "left",
		"right":       "right",
	}
	if !reflect.DeepEqual(result.Returns, wantReturns) {
		t.Fatalf("returns = %#v, want %#v", result.Returns, wantReturns)
	}

	events := hook.snapshotEvents()
	for _, tc := range []struct {
		name       string
		statement  string
		kind       string
		branchID   string
		wantBefore bool
		wantAfter  bool
		wantError  bool
	}{
		{name: "sequence", statement: "root", kind: "sequence", wantBefore: true, wantAfter: true},
		{name: "if", statement: "choose-main", kind: "if", wantBefore: true, wantAfter: true},
		{name: "loop", statement: "loop-items", kind: "loop", wantBefore: true, wantAfter: true},
		{name: "try", statement: "recover-host-error", kind: "try", wantBefore: true, wantAfter: true},
		{name: "callWorkflow", statement: "call-child", kind: "callWorkflow", wantBefore: true, wantAfter: true},
		{name: "return", statement: "return-values", kind: "return", wantBefore: true, wantAfter: true},
		{name: "parallel", statement: "run-branches", kind: "parallel", wantBefore: true, wantAfter: true},
		{name: "left branch", statement: "left-write", kind: "assign", branchID: "left", wantBefore: true, wantAfter: true},
		{name: "right branch", statement: "right-call", kind: "callBlock", branchID: "right", wantBefore: true, wantAfter: true},
		{name: "error", statement: "fail-call", kind: "callBlock", wantBefore: true, wantError: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if tc.wantBefore {
				assertHookEvent(t, events, "before", tc.statement, tc.kind, tc.branchID)
			}
			if tc.wantAfter {
				assertHookEvent(t, events, "after", tc.statement, tc.kind, tc.branchID)
			}
			if tc.wantError {
				event := assertHookEvent(t, events, "error", tc.statement, tc.kind, tc.branchID)
				if event.err == "" {
					t.Fatalf("error event for %s has empty error", tc.statement)
				}
			}
		})
	}

	if hasHookEvent(events, "after", "fail-call") {
		t.Fatalf("failing statement received after event: %#v", events)
	}
	if before, after := hookEventIndex(events, "before", "set-seed"), hookEventIndex(events, "after", "set-seed"); before < 0 || after < 0 || before > after {
		t.Fatalf("set-seed before/after ordering is wrong: before=%d after=%d events=%#v", before, after, events)
	}
	afterSeed := assertHookEvent(t, events, "after", "set-seed", "assign", "")
	if got := afterSeed.variables["seed"]; got != "original" {
		t.Fatalf("after set-seed variable seed = %#v, want %q", got, "original")
	}
	beforeChildReturn := assertHookEvent(t, events, "before", "child-return", "return", "")
	if len(beforeChildReturn.frames) != 2 {
		t.Fatalf("child-return frame count = %d, want 2", len(beforeChildReturn.frames))
	}
	childFrame := beforeChildReturn.frames[1]
	if childFrame.WorkflowID != "child" {
		t.Fatalf("child frame workflow = %q, want %q", childFrame.WorkflowID, "child")
	}
	if got := childFrame.Locals["input.child"]; got != "original" {
		t.Fatalf("child input snapshot = %#v, want %q", got, "original")
	}
}

func TestRunWorkflowDebugHookSnapshotsDeepCloneValues(t *testing.T) {
	inputPayload := typedPayload{
		"name": "input",
		"nested": typedPayload{
			"value": "input-nested",
		},
		"items": typedItems{"input-item"},
	}
	assignedPayload := typedPayload{
		"name": "assigned",
		"nested": typedPayload{
			"value": "assigned-nested",
		},
		"items": typedItems{"assigned-item"},
	}
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "debug-hook-deep-clone"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:     "set-payload",
					Kind:   "assign",
					Target: "payload",
					Value:  &ast.Expression{Kind: "literal", Value: assignedPayload},
				},
				{
					ID:   "return-payloads",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"input":    {Kind: "ref", Ref: "input.payload"},
						"variable": {Kind: "ref", Ref: "var.payload"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{
		Inputs: map[string]any{
			"payload": inputPayload,
		},
		DebugHook: deepMutatingDebugHook{},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	wantInput := typedPayload{
		"name": "input",
		"nested": typedPayload{
			"value": "input-nested",
		},
		"items": typedItems{"input-item"},
	}
	if !reflect.DeepEqual(result.Returns["input"], wantInput) {
		t.Fatalf("input return = %#v, want %#v", result.Returns["input"], wantInput)
	}

	wantVariable := typedPayload{
		"name": "assigned",
		"nested": typedPayload{
			"value": "assigned-nested",
		},
		"items": typedItems{"assigned-item"},
	}
	if !reflect.DeepEqual(result.Returns["variable"], wantVariable) {
		t.Fatalf("variable return = %#v, want %#v", result.Returns["variable"], wantVariable)
	}
}

type debugHookEvent struct {
	name      string
	workflow  string
	statement string
	kind      string
	branchID  string
	err       string
	frames    []FrameSnapshot
	variables map[string]any
}

type recordingDebugHook struct {
	mu     sync.Mutex
	events []debugHookEvent
}

func (h *recordingDebugHook) BeforeStatement(_ context.Context, snapshot StatementSnapshot) error {
	h.record("before", snapshot, nil)
	mutateDebugSnapshot(snapshot)
	return nil
}

func (h *recordingDebugHook) AfterStatement(_ context.Context, snapshot StatementSnapshot) error {
	h.record("after", snapshot, nil)
	mutateDebugSnapshot(snapshot)
	return nil
}

func (h *recordingDebugHook) OnError(_ context.Context, snapshot StatementSnapshot, err error) error {
	h.record("error", snapshot, err)
	mutateDebugSnapshot(snapshot)
	return nil
}

func (h *recordingDebugHook) record(name string, snapshot StatementSnapshot, err error) {
	event := debugHookEvent{
		name:      name,
		workflow:  snapshot.WorkflowID,
		statement: snapshot.StatementID,
		kind:      snapshot.StatementKind,
		branchID:  snapshot.BranchID,
		frames:    cloneFrameSnapshots(snapshot.Frames),
		variables: cloneAnyMap(snapshot.Variables),
	}
	if err != nil {
		event.err = err.Error()
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	h.events = append(h.events, event)
}

func (h *recordingDebugHook) snapshotEvents() []debugHookEvent {
	h.mu.Lock()
	defer h.mu.Unlock()
	events := make([]debugHookEvent, len(h.events))
	copy(events, h.events)
	return events
}

func cloneFrameSnapshots(frames []FrameSnapshot) []FrameSnapshot {
	cloned := make([]FrameSnapshot, len(frames))
	for i := range frames {
		cloned[i] = FrameSnapshot{
			WorkflowID: frames[i].WorkflowID,
			Locals:     cloneAnyMap(frames[i].Locals),
		}
	}
	return cloned
}

func mutateDebugSnapshot(snapshot StatementSnapshot) {
	if snapshot.Variables != nil {
		snapshot.Variables["seed"] = "mutated"
	}
	for i := range snapshot.Frames {
		if snapshot.Frames[i].Locals != nil {
			snapshot.Frames[i].Locals["input.child"] = "mutated"
		}
	}
}

type deepMutatingDebugHook struct{}

type typedPayload map[string]any

type typedItems []any

func (h deepMutatingDebugHook) BeforeStatement(_ context.Context, snapshot StatementSnapshot) error {
	mutateNestedSnapshotValues(snapshot)
	return nil
}

func (h deepMutatingDebugHook) AfterStatement(_ context.Context, snapshot StatementSnapshot) error {
	mutateNestedSnapshotValues(snapshot)
	return nil
}

func (h deepMutatingDebugHook) OnError(_ context.Context, snapshot StatementSnapshot, _ error) error {
	mutateNestedSnapshotValues(snapshot)
	return nil
}

func mutateNestedSnapshotValues(snapshot StatementSnapshot) {
	mutatePayload(snapshot.Variables["payload"])
	for i := range snapshot.Frames {
		mutatePayload(snapshot.Frames[i].Locals["input.payload"])
	}
}

func mutatePayload(value any) {
	payload := reflect.ValueOf(value)
	if !payload.IsValid() || payload.Kind() != reflect.Map || payload.Type().Key().Kind() != reflect.String {
		return
	}
	payload.SetMapIndex(reflect.ValueOf("name"), reflect.ValueOf("mutated"))

	nested := payload.MapIndex(reflect.ValueOf("nested"))
	if nested.IsValid() && nested.Kind() == reflect.Interface {
		nested = nested.Elem()
	}
	if nested.IsValid() && nested.Kind() == reflect.Map && nested.Type().Key().Kind() == reflect.String {
		nested.SetMapIndex(reflect.ValueOf("value"), reflect.ValueOf("mutated"))
	}

	items := payload.MapIndex(reflect.ValueOf("items"))
	if items.IsValid() && items.Kind() == reflect.Interface {
		items = items.Elem()
	}
	if items.IsValid() && items.Kind() == reflect.Slice && items.Len() > 0 {
		items.Index(0).Set(reflect.ValueOf("mutated"))
	}
}

func assertHookEvent(t *testing.T, events []debugHookEvent, name string, statement string, kind string, branchID string) debugHookEvent {
	t.Helper()
	for _, event := range events {
		if event.name == name && event.statement == statement && event.kind == kind && event.branchID == branchID {
			return event
		}
	}
	t.Fatalf("missing hook event name=%s statement=%s kind=%s branch=%s in %#v", name, statement, kind, branchID, events)
	return debugHookEvent{}
}

func hasHookEvent(events []debugHookEvent, name string, statement string) bool {
	for _, event := range events {
		if event.name == name && event.statement == statement {
			return true
		}
	}
	return false
}

func hookEventIndex(events []debugHookEvent, name string, statement string) int {
	for i, event := range events {
		if event.name == name && event.statement == statement {
			return i
		}
	}
	return -1
}

type debugHookHost struct{}

func (h *debugHookHost) Call(ctx context.Context, call BlockCall) (BlockResult, error) {
	if err := ctx.Err(); err != nil {
		return BlockResult{}, err
	}
	switch call.Definition.ID {
	case "test.fail":
		return BlockResult{}, errors.New("host exploded")
	case "test.right":
		return BlockResult{Outputs: map[string]any{"value": "right"}}, nil
	default:
		return BlockResult{}, errors.New("unknown debug hook test block")
	}
}
