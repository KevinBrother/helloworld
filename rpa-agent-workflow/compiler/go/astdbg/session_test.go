package astdbg

import (
	"context"
	"testing"
	"time"

	"rpa-agent-workflow/compiler/go/executor"
	"rpa-agent-workflow/contracts/ast"
)

func TestSessionStopsOnStatementBreakpoint(t *testing.T) {
	workflow := testWorkflow()
	session := NewSession(workflow, Options{})
	session.SetBreakpoints([]Breakpoint{{StatementID: "assign-b"}})

	runCh := make(chan error, 1)
	go func() {
		_, err := executor.RunWorkflow(context.Background(), workflow, executor.Options{DebugHook: session})
		runCh <- err
	}()

	waitForStopReason(t, session, StopReasonEntry)
	if err := session.Continue(); err != nil {
		t.Fatalf("continue from entry: %v", err)
	}

	waitForStopReason(t, session, StopReasonBreakpoint)
	snap := session.Snapshot()
	if snap.WorkflowID != "wf" {
		t.Fatalf("workflow id = %q, want %q", snap.WorkflowID, "wf")
	}
	if snap.StatementID != "assign-b" {
		t.Fatalf("statement id = %q, want %q", snap.StatementID, "assign-b")
	}
	if snap.StopReason != StopReasonBreakpoint {
		t.Fatalf("stop reason = %q, want %q", snap.StopReason, StopReasonBreakpoint)
	}
	if got := snap.Variables["seed"]; got != "start" {
		t.Fatalf("variable seed = %#v, want %q", got, "start")
	}

	snap.Variables["seed"] = "mutated"
	if got := session.Snapshot().Variables["seed"]; got != "start" {
		t.Fatalf("snapshot variables are shared: got %#v, want %q", got, "start")
	}

	if err := session.Continue(); err != nil {
		t.Fatalf("continue: %v", err)
	}

	waitForRun(t, runCh)
	final := session.Snapshot()
	if final.StopReason != StopReasonEnd {
		t.Fatalf("final stop reason = %q, want %q", final.StopReason, StopReasonEnd)
	}
}

func TestSessionStepsOverNestedStatements(t *testing.T) {
	workflow := testNestedWorkflow()
	session := NewSession(workflow, Options{})

	runCh := make(chan error, 1)
	go func() {
		_, err := executor.RunWorkflow(context.Background(), workflow, executor.Options{DebugHook: session})
		runCh <- err
	}()

	waitForStopReason(t, session, StopReasonEntry)
	if err := session.Next(); err != nil {
		t.Fatalf("next: %v", err)
	}

	waitForStopReason(t, session, StopReasonStep)
	snap := session.Snapshot()
	if snap.StatementID != "outer" {
		t.Fatalf("statement id = %q, want %q", snap.StatementID, "outer")
	}

	if err := session.Next(); err != nil {
		t.Fatalf("next 2: %v", err)
	}
	waitForStopReason(t, session, StopReasonStep)
	snap = session.Snapshot()
	if snap.StatementID != "after" {
		t.Fatalf("statement id = %q, want %q", snap.StatementID, "after")
	}

	if err := session.Continue(); err != nil {
		t.Fatalf("continue: %v", err)
	}
	waitForRun(t, runCh)
}

func TestSessionStepsOutOfCallWorkflow(t *testing.T) {
	workflow := testCallWorkflow()
	session := NewSession(workflow, Options{})

	runCh := make(chan error, 1)
	go func() {
		_, err := executor.RunWorkflow(context.Background(), workflow, executor.Options{DebugHook: session})
		runCh <- err
	}()

	waitForStopReason(t, session, StopReasonEntry)
	if err := session.StepIn(); err != nil {
		t.Fatalf("step in: %v", err)
	}
	waitForStopReason(t, session, StopReasonStep)
	if got := session.Snapshot().StatementID; got != "call-child" {
		t.Fatalf("statement id = %q, want %q", got, "call-child")
	}

	if err := session.StepOut(); err != nil {
		t.Fatalf("step out: %v", err)
	}
	waitForStopReason(t, session, StopReasonStep)
	snap := session.Snapshot()
	if snap.WorkflowID != "wf" {
		t.Fatalf("workflow id = %q, want %q", snap.WorkflowID, "wf")
	}
	if snap.StatementID != "after-call" {
		t.Fatalf("statement id = %q, want %q", snap.StatementID, "after-call")
	}

	if err := session.Continue(); err != nil {
		t.Fatalf("continue: %v", err)
	}
	waitForRun(t, runCh)
}

func TestSessionReportsRuntimeErrorAsExceptionStop(t *testing.T) {
	workflow := testErrorWorkflow()
	session := NewSession(workflow, Options{})

	runCh := make(chan error, 1)
	go func() {
		_, err := executor.RunWorkflow(context.Background(), workflow, executor.Options{DebugHook: session})
		runCh <- err
	}()

	waitForStopReason(t, session, StopReasonEntry)
	if err := session.Continue(); err != nil {
		t.Fatalf("continue: %v", err)
	}

	err := waitForRun(t, runCh)
	if err == nil {
		t.Fatal("expected runtime error")
	}
	if got := session.Snapshot().StopReason; got != StopReasonException {
		t.Fatalf("stop reason = %q, want %q", got, StopReasonException)
	}
}

func TestSessionTerminatesCleanly(t *testing.T) {
	workflow := testWorkflow()
	session := NewSession(workflow, Options{})

	runCh := make(chan error, 1)
	go func() {
		_, err := executor.RunWorkflow(context.Background(), workflow, executor.Options{DebugHook: session})
		runCh <- err
	}()

	waitForStopReason(t, session, StopReasonEntry)
	if err := session.Terminate(); err != nil {
		t.Fatalf("terminate: %v", err)
	}

	err := waitForRun(t, runCh)
	if err != nil {
		t.Fatalf("run err = %v, want nil", err)
	}
	if got := session.Snapshot().StopReason; got != StopReasonTerminated {
		t.Fatalf("stop reason = %q, want %q", got, StopReasonTerminated)
	}
}

func waitForStopReason(t *testing.T, session *Session, want StopReason) {
	t.Helper()
	deadline := time.After(2 * time.Second)
	for {
		if got := session.Snapshot().StopReason; got == want {
			return
		}
		select {
		case <-deadline:
			t.Fatalf("timed out waiting for stop reason %q, got %#v", want, session.Snapshot())
		default:
			time.Sleep(5 * time.Millisecond)
		}
	}
}

func waitForRun(t *testing.T, ch <-chan error) error {
	t.Helper()
	select {
	case err := <-ch:
		return err
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for run to finish")
		return nil
	}
}

func testWorkflow() ast.Workflow {
	return ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "assign-a", Kind: "assign", Target: "seed", Value: &ast.Expression{Kind: "literal", Value: "start"}},
				{ID: "assign-b", Kind: "assign", Target: "done", Value: &ast.Expression{Kind: "literal", Value: true}},
			},
		},
	}
}

func testNestedWorkflow() ast.Workflow {
	return ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "outer", Kind: "if", Condition: &ast.Expression{Kind: "literal", Value: true}, Then: []ast.Statement{{ID: "inner", Kind: "assign", Target: "value", Value: &ast.Expression{Kind: "literal", Value: "nested"}}}},
				{ID: "after", Kind: "assign", Target: "done", Value: &ast.Expression{Kind: "literal", Value: true}},
			},
		},
	}
}

func testCallWorkflow() ast.Workflow {
	return ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Workflows:     []ast.SubWorkflow{{ID: "child", Body: ast.Statement{ID: "child-return", Kind: "return", Returns: map[string]ast.Expression{"value": {Kind: "literal", Value: "child"}}}}},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "call-child", Kind: "callWorkflow", Workflow: "child"},
				{ID: "after-call", Kind: "assign", Target: "done", Value: &ast.Expression{Kind: "literal", Value: true}},
			},
		},
	}
}

func testErrorWorkflow() ast.Workflow {
	return ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "boom", Kind: "callBlock", Block: "missing"},
			},
		},
	}
}
