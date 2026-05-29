package executor

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

func TestRunWorkflowRejectsParallelSharedVariableWrites(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-conflict"},
		Variables: []ast.Variable{
			{Name: "shared", Type: ast.Type{Name: "string"}},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Branches: []ast.Branch{
						{
							ID: "left",
							Body: []ast.Statement{
								{
									ID:     "left-write",
									Kind:   "assign",
									Target: "shared",
									Value:  &ast.Expression{Kind: "literal", Value: "a"},
								},
							},
						},
						{
							ID: "right",
							Body: []ast.Statement{
								{
									ID:     "right-write",
									Kind:   "assign",
									Target: "shared",
									Value:  &ast.Expression{Kind: "literal", Value: "b"},
								},
							},
						},
					},
				},
			},
		},
	}

	_, err := RunWorkflow(context.Background(), workflow, Options{})
	if err == nil {
		t.Fatal("expected error")
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}
	if runtimeErr.Phase != PhaseExecute {
		t.Fatalf("phase = %q, want %q", runtimeErr.Phase, PhaseExecute)
	}
	if runtimeErr.WorkflowID != "parallel-conflict" {
		t.Fatalf("workflow ID = %q, want %q", runtimeErr.WorkflowID, "parallel-conflict")
	}
	if runtimeErr.StatementID != "run-both" {
		t.Fatalf("statement ID = %q, want %q", runtimeErr.StatementID, "run-both")
	}
	if runtimeErr.StatementKind != "parallel" {
		t.Fatalf("statement kind = %q, want %q", runtimeErr.StatementKind, "parallel")
	}
	if runtimeErr.BranchID != "right" {
		t.Fatalf("branch ID = %q, want %q", runtimeErr.BranchID, "right")
	}
	if runtimeErr.Error() != `execute: shared write to "shared"` {
		t.Fatalf("error = %q, want shared write error", runtimeErr.Error())
	}
}

func TestRunWorkflowCollectsStatementTraceEvents(t *testing.T) {
	recorder := &testRecorder{}
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-trace"},
		Variables: []ast.Variable{
			{Name: "left", Type: ast.Type{Name: "string"}},
			{Name: "right", Type: ast.Type{Name: "string"}},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Branches: []ast.Branch{
						{
							ID: "left",
							Body: []ast.Statement{
								{
									ID:     "left-write",
									Kind:   "assign",
									Target: "left",
									Value:  &ast.Expression{Kind: "literal", Value: "a"},
								},
							},
						},
						{
							ID: "right",
							Body: []ast.Statement{
								{
									ID:     "right-write",
									Kind:   "assign",
									Target: "right",
									Value:  &ast.Expression{Kind: "literal", Value: "b"},
								},
							},
						},
					},
				},
				{
					ID:   "return-values",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"left":  {Kind: "ref", Ref: "var.left"},
						"right": {Kind: "ref", Ref: "var.right"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{Recorder: recorder})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := result.Returns["left"]; got != "a" {
		t.Fatalf("return left = %#v, want %q", got, "a")
	}
	if got := result.Returns["right"]; got != "b" {
		t.Fatalf("return right = %#v, want %q", got, "b")
	}
	if !reflect.DeepEqual(result.Events, recorder.events) {
		t.Fatalf("result events = %#v, want %#v", result.Events, recorder.events)
	}

	gotTrace := make([]string, len(result.Events))
	for i, event := range result.Events {
		branchID, _ := event.Payload["branchId"].(string)
		gotTrace[i] = event.Name + ":" + event.StatementID + ":" + branchID
	}

	wantTrace := []string{
		"workflow.start::",
		"statement.start:root:",
		"statement.start:run-both:",
		"parallel.branch.start:run-both:left",
		"parallel.branch.start:run-both:right",
		"statement.start:left-write:",
		"variable.write::",
		"statement.end:left-write:",
		"parallel.branch.end:run-both:left",
		"statement.start:right-write:",
		"variable.write::",
		"statement.end:right-write:",
		"parallel.branch.end:run-both:right",
		"statement.end:run-both:",
		"statement.start:return-values:",
		"statement.end:return-values:",
		"statement.end:root:",
		"workflow.end::",
	}

	if !reflect.DeepEqual(gotTrace, wantTrace) {
		t.Fatalf("trace = %#v, want %#v", gotTrace, wantTrace)
	}
}

func TestRunWorkflowRejectsUnsupportedParallelJoinPolicy(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-join"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Join: &ast.ParallelJoin{
						Strategy: "any",
					},
					Branches: []ast.Branch{
						{
							ID:   "left",
							Body: []ast.Statement{},
						},
						{
							ID:   "right",
							Body: []ast.Statement{},
						},
					},
				},
			},
		},
	}

	_, err := RunWorkflow(context.Background(), workflow, Options{})
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, ErrUnsupportedFeature) {
		t.Fatalf("expected ErrUnsupportedFeature, got %v", err)
	}
}

func TestRunWorkflowExecutesParallelBranchesConcurrently(t *testing.T) {
	host := newBarrierHost(2)
	workflow := parallelHostWorkflow("parallel-concurrent", ast.ParallelJoin{Strategy: "all"})

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	if _, err := RunWorkflow(ctx, workflow, Options{
		Blocks: testParallelBlocks(),
		Host:   host,
	}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := host.maxInFlight(); got < 2 {
		t.Fatalf("max in-flight host calls = %d, want concurrent branches", got)
	}
}

func TestRunWorkflowParallelFailFastCancelsRunningBranches(t *testing.T) {
	host := &failFastHost{
		slowStarted:  make(chan struct{}),
		slowCanceled: make(chan struct{}),
	}
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-fail-fast"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Join: &ast.ParallelJoin{Strategy: "all", OnError: "failFast"},
					Branches: []ast.Branch{
						{
							ID: "slow",
							Body: []ast.Statement{
								{ID: "slow-call", Kind: "callBlock", Block: "test.slow"},
							},
						},
						{
							ID: "fail",
							Body: []ast.Statement{
								{ID: "fail-call", Kind: "callBlock", Block: "test.fail"},
							},
						},
					},
				},
			},
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	started := time.Now()
	_, err := RunWorkflow(ctx, workflow, Options{
		Blocks: testParallelBlocks(),
		Host:   host,
	})
	elapsed := time.Since(started)
	if err == nil {
		t.Fatal("expected error")
	}
	if elapsed > 500*time.Millisecond {
		t.Fatalf("failFast took %s, want prompt cancellation", elapsed)
	}
	if !strings.Contains(err.Error(), "branch failed") {
		t.Fatalf("error = %q, want branch failure", err.Error())
	}

	select {
	case <-host.slowCanceled:
	case <-time.After(time.Second):
		t.Fatal("slow branch was not canceled")
	}
}

func TestRunWorkflowParallelTimeoutCancelsBranches(t *testing.T) {
	host := &timeoutHost{
		canceled: make(chan struct{}),
	}
	workflow := parallelHostWorkflow("parallel-timeout", ast.ParallelJoin{
		Strategy:  "all",
		TimeoutMs: 10,
	})

	started := time.Now()
	_, err := RunWorkflow(context.Background(), workflow, Options{
		Blocks: testParallelBlocks(),
		Host:   host,
	})
	elapsed := time.Since(started)
	if err == nil {
		t.Fatal("expected timeout error")
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected deadline exceeded, got %v", err)
	}
	if elapsed > 500*time.Millisecond {
		t.Fatalf("timeout took %s, want prompt cancellation", elapsed)
	}

	select {
	case <-host.canceled:
	case <-time.After(time.Second):
		t.Fatal("branch was not canceled")
	}
}

func TestRunWorkflowParallelBranchReturnPropagatesToWorkflow(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-return"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Branches: []ast.Branch{
						{
							ID: "left",
							Body: []ast.Statement{
								{
									ID:   "left-return",
									Kind: "return",
									Returns: map[string]ast.Expression{
										"value": {Kind: "literal", Value: "from-left"},
									},
								},
							},
						},
						{
							ID:   "right",
							Body: []ast.Statement{},
						},
					},
				},
				{
					ID:   "after-parallel",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"value": {Kind: "literal", Value: "after"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["value"]; got != "from-left" {
		t.Fatalf("return value = %#v, want %q", got, "from-left")
	}
}

func TestRunWorkflowParallelBranchReturnWinsOverEarlierBranchError(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "parallel-return-error"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Branches: []ast.Branch{
						{
							ID: "fail",
							Body: []ast.Statement{
								{
									ID:     "missing-ref",
									Kind:   "assign",
									Target: "failed",
									Value:  &ast.Expression{Kind: "ref", Ref: "var.missing"},
								},
							},
						},
						{
							ID: "return",
							Body: []ast.Statement{
								{
									ID:   "branch-return",
									Kind: "return",
									Returns: map[string]ast.Expression{
										"value": {Kind: "literal", Value: "from-return-branch"},
									},
								},
							},
						},
					},
				},
				{
					ID:   "after-parallel",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"value": {Kind: "literal", Value: "after"},
					},
				},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["value"]; got != "from-return-branch" {
		t.Fatalf("return value = %#v, want %q", got, "from-return-branch")
	}
}

func parallelHostWorkflow(id string, join ast.ParallelJoin) ast.Workflow {
	return ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: id},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:   "run-both",
					Kind: "parallel",
					Join: &join,
					Branches: []ast.Branch{
						{
							ID: "left",
							Body: []ast.Statement{
								{ID: "left-call", Kind: "callBlock", Block: "test.wait"},
							},
						},
						{
							ID: "right",
							Body: []ast.Statement{
								{ID: "right-call", Kind: "callBlock", Block: "test.wait"},
							},
						},
					},
				},
			},
		},
	}
}

func testParallelBlocks() map[string]block.Definition {
	return map[string]block.Definition{
		"test.wait": {ID: "test.wait"},
		"test.slow": {ID: "test.slow"},
		"test.fail": {ID: "test.fail"},
	}
}

type barrierHost struct {
	required int
	release  chan struct{}

	mu       sync.Mutex
	inFlight int
	max      int
}

func newBarrierHost(required int) *barrierHost {
	return &barrierHost{
		required: required,
		release:  make(chan struct{}),
	}
}

func TestRunWorkflowParallelBranchesEnterHostBeforeCompletion(t *testing.T) {
	host := &entryBarrierHost{
		entered: make(chan string, 2),
		release: make(chan struct{}),
	}
	workflow := parallelHostWorkflow("parallel-entry", ast.ParallelJoin{Strategy: "all"})

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	done := make(chan error, 1)
	go func() {
		_, err := RunWorkflow(ctx, workflow, Options{
			Blocks: testParallelBlocks(),
			Host:   host,
		})
		done <- err
	}()

	first := <-host.entered
	second := <-host.entered
	if first == second {
		t.Fatalf("expected two distinct branches, got %q twice", first)
	}
	close(host.release)

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("workflow did not complete")
	}
}

func (h *barrierHost) Call(ctx context.Context, call BlockCall) (BlockResult, error) {
	h.mu.Lock()
	h.inFlight++
	if h.inFlight > h.max {
		h.max = h.inFlight
	}
	if h.inFlight == h.required {
		close(h.release)
	}
	h.mu.Unlock()

	select {
	case <-h.release:
	case <-ctx.Done():
		return BlockResult{}, ctx.Err()
	}

	h.mu.Lock()
	h.inFlight--
	h.mu.Unlock()
	return BlockResult{Outputs: map[string]any{}}, nil
}

func (h *barrierHost) maxInFlight() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.max
}

type failFastHost struct {
	slowStarted  chan struct{}
	slowCanceled chan struct{}
}

type timeoutHost struct {
	once     sync.Once
	canceled chan struct{}
}

func (h *timeoutHost) Call(ctx context.Context, call BlockCall) (BlockResult, error) {
	<-ctx.Done()
	h.once.Do(func() {
		close(h.canceled)
	})
	return BlockResult{}, ctx.Err()
}

type entryBarrierHost struct {
	entered chan string
	release chan struct{}
}

func (h *entryBarrierHost) Call(ctx context.Context, call BlockCall) (BlockResult, error) {
	h.entered <- call.StatementID
	select {
	case <-h.release:
		return BlockResult{Outputs: map[string]any{}}, nil
	case <-ctx.Done():
		return BlockResult{}, ctx.Err()
	}
}

func (h *failFastHost) Call(ctx context.Context, call BlockCall) (BlockResult, error) {
	switch call.Definition.ID {
	case "test.fail":
		<-h.slowStarted
		return BlockResult{}, errors.New("branch failed")
	case "test.slow":
		close(h.slowStarted)
		<-ctx.Done()
		close(h.slowCanceled)
		return BlockResult{}, ctx.Err()
	default:
		return BlockResult{Outputs: map[string]any{}}, nil
	}
}
