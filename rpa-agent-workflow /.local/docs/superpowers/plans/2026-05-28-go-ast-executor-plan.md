# Go AST Executor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure-Go executor that runs `ast.json` directly, fully covers the current AST contract, and coexists with the existing Python code generation flow.

**Architecture:** Keep AST loading and schema validation in existing Go schema/compiler layers, add a focused `compiler/go/executor` package for tree-walk execution, and keep `callBlock` behind a host adapter boundary. The executor owns runtime state, scope, returns, trace events, and deterministic control-flow semantics; concrete block transport stays outside the core.

**Tech Stack:** Go 1.22, existing `contracts/ast` and `contracts/block` packages, existing schema validation helpers, standard-library concurrency and testing, subprocess-backed host adapters when a concrete external runtime is needed.

---

## File Structure

- Modify: `apps/cli/rpawf/main.go` — add `exec` command that loads AST, optional block definitions, runs the Go executor, and prints a JSON result.
- Modify: `apps/cli/rpawf/main_test.go` — add CLI coverage for `exec --help` and `exec` on a no-block workflow fixture.
- Create: `compiler/go/executor/doc.go` — package-level contract for the executor.
- Create: `compiler/go/executor/types.go` — public API: `Options`, `Result`, `Event`, `Recorder`, `Host`, `BlockCall`, `BlockResult`.
- Create: `compiler/go/executor/errors.go` — structured runtime errors and phase constants.
- Create: `compiler/go/executor/state.go` — runtime frame stack, variable store, workflow index, helper methods.
- Create: `compiler/go/executor/expressions.go` — expression evaluation and reference resolution.
- Create: `compiler/go/executor/execute.go` — `RunWorkflow` and statement dispatcher for sequence-like flow.
- Create: `compiler/go/executor/control_flow.go` — loop, try/catch/finally, and subworkflow execution.
- Create: `compiler/go/executor/host.go` — block lookup, host invocation, and output binding helpers.
- Create: `compiler/go/executor/parallel.go` — parallel branch execution and shared-write conflict checks.
- Create: `compiler/go/executor/test_helpers_test.go` — fake host, collecting recorder, JSON fixture helpers.
- Create: `compiler/go/executor/executor_test.go` — expression and sequential control-flow tests.
- Create: `compiler/go/executor/control_flow_test.go` — loop, try, and subworkflow tests.
- Create: `compiler/go/executor/parallel_test.go` — parallel determinism and trace tests.
- Create: `compiler/go/executor/compat_test.go` — parity checks against the current Python runtime for overlapping semantics.
- Modify: `examples/sample-workflow/README.md` — document the new `exec` command boundary and note that `callBlock` needs a concrete host.

### Task 1: Create the executor package shell and public contracts

**Files:**
- Create: `compiler/go/executor/doc.go`
- Create: `compiler/go/executor/types.go`
- Create: `compiler/go/executor/errors.go`
- Create: `compiler/go/executor/state.go`
- Create: `compiler/go/executor/execute.go`
- Test: `compiler/go/executor/executor_test.go`

- [ ] **Step 1: Write the failing test**

```go
// compiler/go/executor/executor_test.go
package executor

import (
	"context"
	"errors"
	"testing"

	"rpa-agent-workflow/contracts/ast"
)

func TestRunWorkflowRejectsMissingRootStatement(t *testing.T) {
	_, err := RunWorkflow(context.Background(), ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
	}, Options{})
	if err == nil {
		t.Fatal("expected error")
	}

	var runtimeErr *RuntimeError
	if !errors.As(err, &runtimeErr) {
		t.Fatalf("expected RuntimeError, got %T", err)
	}
	if runtimeErr.Phase != PhaseLoad {
		t.Fatalf("phase = %s, want %s", runtimeErr.Phase, PhaseLoad)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./compiler/go/executor -run TestRunWorkflowRejectsMissingRootStatement -v`

Expected: FAIL because the `compiler/go/executor` package and `RunWorkflow` API do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```go
// compiler/go/executor/types.go
package executor

import (
	"context"

	"rpa-agent-workflow/contracts/ast"
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
```

```go
// compiler/go/executor/errors.go
package executor

import "errors"

const (
	PhaseLoad    = "load"
	PhaseEval    = "eval"
	PhaseExecute = "execute"
	PhaseHost    = "host"
)

var ErrHostUnavailable = errors.New("executor host is unavailable")

type RuntimeError struct {
	Phase         string
	WorkflowID    string
	StatementID   string
	StatementKind string
	Cause         error
}

func (e *RuntimeError) Error() string { return e.Phase + ": " + e.Cause.Error() }
func (e *RuntimeError) Unwrap() error { return e.Cause }
```

```go
// compiler/go/executor/state.go
package executor

import (
	"rpa-agent-workflow/contracts/ast"
	"rpa-agent-workflow/contracts/block"
)

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
	events    []Event
}

type nopRecorder struct{}

func (nopRecorder) Record(Event) {}

type unsupportedHost struct{}

func (unsupportedHost) Call(context.Context, BlockCall) (BlockResult, error) {
	return BlockResult{}, ErrHostUnavailable
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
	st := &state{
		workflow:  workflow,
		variables: map[string]any{},
		blocks:    opts.Blocks,
		host:      host,
		recorder:  recorder,
	}
	st.frames = append(st.frames, frame{
		workflowID: workflow.Workflow.ID,
		locals:     map[string]any{},
	})
	for k, v := range opts.Inputs {
		st.frames[0].locals["input."+k] = v
	}
	return st
}
```

```go
// compiler/go/executor/execute.go
package executor

import (
	"context"
	"errors"

	"rpa-agent-workflow/contracts/ast"
)

func RunWorkflow(ctx context.Context, workflow ast.Workflow, opts Options) (Result, error) {
	_ = ctx
	if workflow.Workflow.ID == "" || workflow.Body.ID == "" || workflow.Body.Kind == "" {
		return Result{}, &RuntimeError{
			Phase:      PhaseLoad,
			WorkflowID: workflow.Workflow.ID,
			Cause:      errors.New("workflow body is incomplete"),
		}
	}
	_ = newState(workflow, opts)
	return Result{Returns: map[string]any{}, Variables: map[string]any{}}, nil
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./compiler/go/executor -run TestRunWorkflowRejectsMissingRootStatement -v`

Expected: PASS.

### Task 2: Implement runtime state and expression evaluation

**Files:**
- Modify: `compiler/go/executor/state.go`
- Create: `compiler/go/executor/expressions.go`
- Modify: `compiler/go/executor/executor_test.go`
- Create: `compiler/go/executor/test_helpers_test.go`

- [ ] **Step 1: Write the failing tests**

```go
func TestEvaluateExpressionResolvesRefsAndTemplates(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{
		Inputs: map[string]any{"name": "copilot"},
	})
	st.variables["answer"] = 42
	st.frames = append(st.frames, frame{
		workflowID: "wf",
		locals: map[string]any{
			"item": map[string]any{"label": "alpha"},
		},
	})

	value, err := st.evalExpression(&ast.Expression{
		Kind: "template",
		Items: []ast.Expression{
			{Kind: "literal", Value: "hello "},
			{Kind: "ref", Ref: "input.name"},
			{Kind: "literal", Value: " / "},
			{Kind: "ref", Ref: "var.answer"},
			{Kind: "literal", Value: " / "},
			{Kind: "ref", Ref: "item", Selector: "label"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if value != "hello copilot / 42 / alpha" {
		t.Fatalf("value = %#v", value)
	}
}

func TestEvaluateExpressionRejectsUnknownKind(t *testing.T) {
	st := newTestState(ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body:          ast.Statement{ID: "root", Kind: "sequence"},
	}, Options{})

	_, err := st.evalExpression(&ast.Expression{Kind: "mystery"})
	if err == nil {
		t.Fatal("expected error")
	}
}
```

- [ ] **Step 2: Implement evaluator core**

```go
// compiler/go/executor/test_helpers_test.go
package executor

import "rpa-agent-workflow/contracts/ast"

func newTestState(workflow ast.Workflow, opts Options) *state {
	return newState(workflow, opts)
}
```

```go
// compiler/go/executor/expressions.go
package executor

import (
	"fmt"
	"reflect"
	"strings"

	"rpa-agent-workflow/contracts/ast"
)

func (s *state) evalExpression(expr *ast.Expression) (any, error) {
	if expr == nil {
		return nil, nil
	}
	switch expr.Kind {
	case "literal":
		return s.applySelector(expr.Value, expr.Selector)
	case "ref":
		value, err := s.resolveRef(expr.Ref)
		if err != nil {
			return nil, err
		}
		return s.applySelector(value, expr.Selector)
	case "binary":
		return s.evalBinary(expr)
	case "array":
		items := make([]any, 0, len(expr.Items))
		for i := range expr.Items {
			value, err := s.evalExpression(&expr.Items[i])
			if err != nil {
				return nil, err
			}
			items = append(items, value)
		}
		return items, nil
	case "object":
		fields := make(map[string]any, len(expr.Fields))
		for key, child := range expr.Fields {
			value, err := s.evalExpression(&child)
			if err != nil {
				return nil, err
			}
			fields[key] = value
		}
		return fields, nil
	case "template":
		var b strings.Builder
		for i := range expr.Items {
			value, err := s.evalExpression(&expr.Items[i])
			if err != nil {
				return nil, err
			}
			b.WriteString(fmt.Sprint(value))
		}
		return b.String(), nil
	default:
		return nil, s.evalErrorf("unsupported expression kind %q", expr.Kind)
	}
}

func (s *state) resolveRef(ref string) (any, error) {
	if strings.HasPrefix(ref, "var.") {
		value, ok := s.variables[strings.TrimPrefix(ref, "var.")]
		if !ok {
			return nil, s.evalErrorf("unknown variable ref %q", ref)
		}
		return value, nil
	}
	value, ok := s.currentFrame().locals[ref]
	if !ok {
		return nil, s.evalErrorf("unknown ref %q", ref)
	}
	return value, nil
}

func (s *state) applySelector(value any, selector string) (any, error) {
	if selector == "" {
		return value, nil
	}
	fields, ok := value.(map[string]any)
	if !ok {
		return nil, s.evalErrorf("selector %q requires object value", selector)
	}
	selected, ok := fields[selector]
	if !ok {
		return nil, s.evalErrorf("selector %q not found", selector)
	}
	return selected, nil
}

func (s *state) evalBinary(expr *ast.Expression) (any, error) {
	left, err := s.evalExpression(expr.Left)
	if err != nil {
		return nil, err
	}
	right, err := s.evalExpression(expr.Right)
	if err != nil {
		return nil, err
	}
	switch expr.Op {
	case "==":
		return reflect.DeepEqual(left, right), nil
	case "!=":
		return !reflect.DeepEqual(left, right), nil
	case "+":
		return fmt.Sprint(left) + fmt.Sprint(right), nil
	default:
		return nil, s.evalErrorf("unsupported binary op %q", expr.Op)
	}
}

func (s *state) evalErrorf(format string, args ...any) error {
	return &RuntimeError{
		Phase:      PhaseEval,
		WorkflowID: s.workflow.Workflow.ID,
		Cause:      fmt.Errorf(format, args...),
	}
}
```

### Task 3: Implement sequence, assign, if, and return semantics

**Files:**
- Modify: `compiler/go/executor/execute.go`
- Modify: `compiler/go/executor/state.go`
- Modify: `compiler/go/executor/executor_test.go`

- [ ] **Step 1: Add workflow execution test**

```go
func TestRunWorkflowExecutesSequenceAssignIfAndReturn(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Variables: []ast.Variable{
			{Name: "status", Type: ast.Type{Name: "string"}, Mutable: true},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "assign_status", Kind: "assign", Target: "status", Value: &ast.Expression{Kind: "literal", Value: "idle"}},
				{
					ID:   "branch",
					Kind: "if",
					Condition: &ast.Expression{
						Kind:  "binary",
						Op:    "==",
						Left:  &ast.Expression{Kind: "ref", Ref: "var.status"},
						Right: &ast.Expression{Kind: "literal", Value: "idle"},
					},
					Then: []ast.Statement{
						{ID: "assign_ready", Kind: "assign", Target: "status", Value: &ast.Expression{Kind: "literal", Value: "ready"}},
					},
				},
				{ID: "done", Kind: "return", Returns: map[string]ast.Expression{"status": {Kind: "ref", Ref: "var.status"}}},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Returns["status"]; got != "ready" {
		t.Fatalf("status = %#v, want %q", got, "ready")
	}
}
```

- [ ] **Step 2: Implement statement execution**

```go
// compiler/go/executor/state.go
package executor

type returnSignal struct {
	values map[string]any
}

func (s returnSignal) Error() string { return "return" }

func (s *state) emit(event Event) {
	s.events = append(s.events, event)
	s.recorder.Record(event)
}

func (s *state) currentFrame() *frame {
	return &s.frames[len(s.frames)-1]
}

func (s *state) setVariable(name string, value any) {
	s.variables[name] = value
	s.emit(Event{Name: "variable.write", WorkflowID: s.workflow.Workflow.ID, Payload: map[string]any{"name": name, "value": value}})
}
```

```go
// compiler/go/executor/execute.go
package executor

import (
	"context"
	"fmt"
	"reflect"

	"rpa-agent-workflow/contracts/ast"
)

func RunWorkflow(ctx context.Context, workflow ast.Workflow, opts Options) (Result, error) {
	if err := runtimeContextError(ctx, workflow.Workflow.ID, "", ""); err != nil {
		return Result{}, err
	}
	if workflow.Workflow.ID == "" || workflow.Body.ID == "" || workflow.Body.Kind == "" {
		return Result{}, &RuntimeError{Phase: PhaseLoad, WorkflowID: workflow.Workflow.ID, Cause: fmt.Errorf("workflow body is incomplete")}
	}
	st := newState(workflow, opts)
	st.emit(Event{Name: "workflow.start", WorkflowID: workflow.Workflow.ID})
	err := st.runStatement(ctx, workflow.Body)
	if signal, ok := err.(returnSignal); ok {
		st.emit(Event{Name: "workflow.end", WorkflowID: workflow.Workflow.ID})
		return Result{Returns: signal.values, Variables: st.variables, Events: st.events}, nil
	}
	if err != nil {
		return Result{}, err
	}
	st.emit(Event{Name: "workflow.end", WorkflowID: workflow.Workflow.ID})
	return Result{Returns: map[string]any{}, Variables: st.variables, Events: st.events}, nil
}

func (s *state) runStatement(ctx context.Context, stmt ast.Statement) error {
	if err := runtimeContextError(ctx, s.workflow.Workflow.ID, stmt.ID, stmt.Kind); err != nil {
		return err
	}
	s.emit(Event{Name: "statement.start", WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind})
	defer s.emit(Event{Name: "statement.end", WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind})

	switch stmt.Kind {
	case "sequence":
		for i := range stmt.Statements {
			if err := s.runStatement(ctx, stmt.Statements[i]); err != nil {
				return err
			}
		}
		return nil
	case "assign":
		value, err := s.evalExpression(stmt.Value)
		if err != nil {
			return err
		}
		s.setVariable(stmt.Target, value)
		return nil
	case "if":
		value, err := s.evalExpression(stmt.Condition)
		if err != nil {
			return err
		}
		if isTruthy(value) {
			for i := range stmt.Then {
				if err := s.runStatement(ctx, stmt.Then[i]); err != nil {
					return err
				}
			}
			return nil
		}
		for i := range stmt.Else {
			if err := s.runStatement(ctx, stmt.Else[i]); err != nil {
				return err
			}
		}
		return nil
	case "return":
		values := make(map[string]any, len(stmt.Returns))
		for key, expr := range stmt.Returns {
			value, err := s.evalExpression(&expr)
			if err != nil {
				return err
			}
			values[key] = value
		}
		return returnSignal{values: values}
	default:
		return &RuntimeError{Phase: PhaseExecute, WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind, Cause: fmt.Errorf("unsupported statement kind %q", stmt.Kind)}
	}
}

func isTruthy(value any) bool {
	switch v := value.(type) {
	case nil:
		return false
	case bool:
		return v
	case string:
		return v != ""
	case int:
		return v != 0
	case int64:
		return v != 0
	case float64:
		return v != 0
	}
	rv := reflect.ValueOf(value)
	if !rv.IsValid() {
		return false
	}
	switch rv.Kind() {
	case reflect.Bool:
		return rv.Bool()
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return rv.Int() != 0
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		return rv.Uint() != 0
	case reflect.Float32, reflect.Float64:
		return rv.Float() != 0
	case reflect.Array, reflect.Slice, reflect.Map, reflect.String:
		return rv.Len() > 0
	case reflect.Interface, reflect.Pointer:
		return !rv.IsNil()
	default:
		return true
	}
}

func runtimeContextError(ctx context.Context, workflowID, statementID, statementKind string) error {
	if err := ctx.Err(); err != nil {
		return &RuntimeError{
			Phase:         PhaseExecute,
			WorkflowID:    workflowID,
			StatementID:   statementID,
			StatementKind: statementKind,
			Cause:         err,
		}
	}
	return nil
}
```

### Task 4: Implement loop, try/catch/finally, and subworkflow execution

**Files:**
- Create: `compiler/go/executor/control_flow.go`
- Create: `compiler/go/executor/control_flow_test.go`
- Modify: `compiler/go/executor/execute.go`
- Modify: `compiler/go/executor/state.go`

- [ ] **Step 1: Add structured control-flow test**

```go
func TestRunWorkflowExecutesForeachCallWorkflowAndFinally(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Variables: []ast.Variable{
			{Name: "last", Type: ast.Type{Name: "string"}, Mutable: true},
			{Name: "finalized", Type: ast.Type{Name: "boolean"}, Mutable: true},
		},
		Workflows: []ast.SubWorkflow{
			{
				ID: "child",
				Body: ast.Statement{
					ID:   "child_root",
					Kind: "return",
					Returns: map[string]ast.Expression{
						"value": {Kind: "ref", Ref: "input.value"},
					},
				},
			},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:       "loop",
					Kind:     "loop",
					LoopKind: "foreach",
					ItemVar:  "item",
					Iterable: &ast.Expression{Kind: "array", Items: []ast.Expression{{Kind: "literal", Value: "a"}, {Kind: "literal", Value: "b"}}},
					Statements: []ast.Statement{
						{ID: "write_last", Kind: "assign", Target: "last", Value: &ast.Expression{Kind: "ref", Ref: "item"}},
					},
				},
				{ID: "call_child", Kind: "callWorkflow", Workflow: "child", Inputs: map[string]ast.Expression{"value": {Kind: "ref", Ref: "var.last"}}},
				{
					ID:         "protected",
					Kind:       "try",
					Statements: []ast.Statement{},
					Finally: []ast.Statement{
						{ID: "mark_final", Kind: "assign", Target: "finalized", Value: &ast.Expression{Kind: "literal", Value: true}},
					},
				},
				{ID: "done", Kind: "return", Returns: map[string]ast.Expression{"last": {Kind: "ref", Ref: "var.last"}, "finalized": {Kind: "ref", Ref: "var.finalized"}}},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Returns["last"] != "b" || result.Returns["finalized"] != true {
		t.Fatalf("unexpected returns: %#v", result.Returns)
	}
}
```

- [ ] **Step 2: Implement loop/try/subworkflow helpers**

```go
// compiler/go/executor/state.go
func (s *state) subworkflow(id string) (ast.SubWorkflow, bool) {
	for _, workflow := range s.workflow.Workflows {
		if workflow.ID == id {
			return workflow, true
		}
	}
	return ast.SubWorkflow{}, false
}

func (s *state) pushFrame(workflowID string, locals map[string]any) {
	s.frames = append(s.frames, frame{workflowID: workflowID, locals: locals})
}

func (s *state) popFrame() {
	s.frames = s.frames[:len(s.frames)-1]
}
```

```go
// compiler/go/executor/control_flow.go
package executor

import (
	"context"
	"errors"
	"fmt"
	"reflect"

	"rpa-agent-workflow/contracts/ast"
)

func (s *state) runLoop(ctx context.Context, stmt ast.Statement) error {
	switch stmt.LoopKind {
	case "foreach":
		itemsValue, err := s.evalExpression(stmt.Iterable)
		if err != nil {
			return err
		}
		rv := reflect.ValueOf(itemsValue)
		if rv.Kind() != reflect.Array && rv.Kind() != reflect.Slice {
			return &RuntimeError{Phase: PhaseExecute, WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind, Cause: fmt.Errorf("foreach iterable must evaluate to array, got %T", itemsValue)}
		}
		for i := 0; i < rv.Len(); i++ {
			item := rv.Index(i).Interface()
			locals := map[string]any{}
			for key, value := range s.currentFrame().locals {
				locals[key] = value
			}
			locals[stmt.ItemVar] = item
			s.pushFrame(s.currentFrame().workflowID, locals)
			for j := range stmt.Statements {
				if err := s.runStatement(ctx, stmt.Statements[j]); err != nil {
					s.popFrame()
					return err
				}
			}
			s.popFrame()
		}
		return nil
	default:
		condition := true
		for condition {
			value, err := s.evalExpression(stmt.Condition)
			if err != nil {
				return err
			}
			condition = isTruthy(value)
			if !condition {
				break
			}
			for i := range stmt.Statements {
				if err := s.runStatement(ctx, stmt.Statements[i]); err != nil {
					return err
				}
			}
		}
		return nil
	}
}

func (s *state) runCallWorkflow(ctx context.Context, stmt ast.Statement) error {
	child, ok := s.subworkflow(stmt.Workflow)
	if !ok {
		return &RuntimeError{Phase: PhaseExecute, WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind, Cause: fmt.Errorf("unknown subworkflow %q", stmt.Workflow)}
	}
	locals := map[string]any{}
	for key, expr := range stmt.Inputs {
		value, err := s.evalExpression(&expr)
		if err != nil {
			return err
		}
		locals["input."+key] = value
	}
	s.pushFrame(child.ID, locals)
	err := s.runStatement(ctx, child.Body)
	s.popFrame()
	outputs := map[string]any{}
	if signal, ok := err.(returnSignal); ok {
		outputs = signal.values
		err = nil
	}
	if err != nil {
		return err
	}
	return s.bindNamedOutputs(stmt.Outputs, outputs, PhaseExecute, stmt.ID, stmt.Kind)
}

func (s *state) runTry(ctx context.Context, stmt ast.Statement) (err error) {
	defer func() {
		for i := range stmt.Finally {
			if runErr := s.runStatement(ctx, stmt.Finally[i]); runErr != nil && err == nil {
				err = runErr
			}
		}
	}()
	for i := range stmt.Statements {
		if err = s.runStatement(ctx, stmt.Statements[i]); err != nil {
			for _, clause := range stmt.Catches {
				if matchCatch(err, clause, stmt.Kind) {
					frame := s.currentFrame()
					var old any
					var existed bool
					if clause.As != "" {
						old, existed = frame.locals[clause.As]
						frame.locals[clause.As] = err
					}
					for j := range clause.Body {
						if catchErr := s.runStatement(ctx, clause.Body[j]); catchErr != nil {
							err = catchErr
							break
						}
						err = nil
					}
					if clause.As != "" {
						if existed {
							frame.locals[clause.As] = old
						} else {
							delete(frame.locals, clause.As)
						}
					}
					return err
				}
			}
			return err
		}
	}
	return nil
}

func matchCatch(err error, clause ast.CatchClause, statementKind string) bool {
	if clause.Pattern == "*" {
		return true
	}
	if clause.Pattern == "" {
		return false
	}
	var runtimeErr *RuntimeError
	if errors.As(err, &runtimeErr) {
		return clause.Pattern == runtimeErr.Phase || clause.Pattern == runtimeErr.StatementKind || clause.Pattern == "RuntimeError"
	}
	return clause.Pattern == reflect.TypeOf(err).Elem().Name()
}
```

### Task 5: Implement block lookup, host calls, and output binding

**Files:**
- Create: `compiler/go/executor/host.go`
- Modify: `compiler/go/executor/execute.go`
- Modify: `compiler/go/executor/test_helpers_test.go`
- Modify: `compiler/go/executor/control_flow_test.go`

- [ ] **Step 1: Add host invocation test**

```go
func TestRunWorkflowInvokesHostAndBindsOutputs(t *testing.T) {
	host := &fakeHost{
		result: BlockResult{
			Outputs: map[string]any{"text": "hello from host"},
		},
	}
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Variables: []ast.Variable{
			{Name: "message", Type: ast.Type{Name: "string"}, Mutable: true},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{
					ID:    "log",
					Kind:  "callBlock",
					Block: "core.log",
					Inputs: map[string]ast.Expression{
						"message": {Kind: "literal", Value: "hello"},
					},
					Outputs: map[string]ast.Expression{
						"text": {Kind: "ref", Ref: "var.message"},
					},
				},
				{ID: "done", Kind: "return", Returns: map[string]ast.Expression{"message": {Kind: "ref", Ref: "var.message"}}},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{
		Blocks: map[string]block.Definition{
			"core.log": {ID: "core.log", SchemaVersion: "1.0.0", Runtime: block.RuntimeBinding{Target: "external", Mode: "sync"}},
		},
		Host: host,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Returns["message"] != "hello from host" {
		t.Fatalf("message = %#v", result.Returns["message"])
	}
}
```

- [ ] **Step 2: Implement host boundary**

```go
// compiler/go/executor/test_helpers_test.go
type fakeHost struct {
	calls  int
	result BlockResult
	err    error
	last   BlockCall
}

func (h *fakeHost) Call(_ context.Context, call BlockCall) (BlockResult, error) {
	h.calls++
	h.last = call
	return h.result, h.err
}
```

```go
// compiler/go/executor/state.go
func (s *state) bindNamedOutputs(destinations map[string]ast.Expression, outputs map[string]any, phase, statementID, statementKind string) error {
	for outputName, destination := range destinations {
		value, ok := outputs[outputName]
		if !ok {
			return &RuntimeError{Phase: phase, WorkflowID: s.workflow.Workflow.ID, StatementID: statementID, StatementKind: statementKind, Cause: fmt.Errorf("missing output %q", outputName)}
		}
		ref := destination.Ref
		switch {
		case strings.HasPrefix(ref, "var."):
			s.setVariable(strings.TrimPrefix(ref, "var."), value)
		case strings.HasPrefix(ref, "input."):
			return &RuntimeError{Phase: phase, WorkflowID: s.workflow.Workflow.ID, StatementID: statementID, StatementKind: statementKind, Cause: fmt.Errorf("output %q cannot target input scope", outputName)}
		default:
			s.currentFrame().locals[ref] = value
		}
	}
	return nil
}
```

```go
// compiler/go/executor/host.go
package executor

import (
	"context"
	"fmt"

	"rpa-agent-workflow/contracts/ast"
)

func (s *state) runCallBlock(ctx context.Context, stmt ast.Statement) error {
	definition, ok := s.blocks[stmt.Block]
	if !ok {
		return &RuntimeError{Phase: PhaseHost, WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind, Cause: fmt.Errorf("unknown block %q", stmt.Block)}
	}
	inputs := make(map[string]any, len(stmt.Inputs))
	for key, expr := range stmt.Inputs {
		value, err := s.evalExpression(&expr)
		if err != nil {
			return err
		}
		inputs[key] = value
	}
	s.emit(Event{Name: "host.call.start", WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind})
	result, err := s.host.Call(ctx, BlockCall{Definition: definition, WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, Inputs: inputs})
	if err != nil {
		return &RuntimeError{Phase: PhaseHost, WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind, Cause: err}
	}
	if err := runtimeContextError(ctx, s.workflow.Workflow.ID, stmt.ID, stmt.Kind); err != nil {
		return err
	}
	s.emit(Event{Name: "host.call.end", WorkflowID: s.workflow.Workflow.ID, StatementID: stmt.ID, StatementKind: stmt.Kind})
	return s.bindNamedOutputs(stmt.Outputs, result.Outputs, PhaseHost, stmt.ID, stmt.Kind)
}
```

### Task 6: Implement deterministic parallel execution, trace capture, and structured runtime errors

**Files:**
- Create: `compiler/go/executor/parallel.go`
- Create: `compiler/go/executor/parallel_test.go`
- Modify: `compiler/go/executor/errors.go`
- Modify: `compiler/go/executor/state.go`
- Modify: `compiler/go/executor/execute.go`

- [ ] **Step 1: Add parallel tests**

```go
func TestRunWorkflowRejectsParallelSharedVariableWrites(t *testing.T) {
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Variables: []ast.Variable{
			{Name: "shared", Type: ast.Type{Name: "string"}, Mutable: true},
		},
		Body: ast.Statement{
			ID:   "root",
			Kind: "parallel",
			Branches: []ast.Branch{
				{ID: "left", Body: []ast.Statement{{ID: "set_left", Kind: "assign", Target: "shared", Value: &ast.Expression{Kind: "literal", Value: "left"}}}},
				{ID: "right", Body: []ast.Statement{{ID: "set_right", Kind: "assign", Target: "shared", Value: &ast.Expression{Kind: "literal", Value: "right"}}}},
			},
		},
	}

	_, err := RunWorkflow(context.Background(), workflow, Options{})
	if err == nil {
		t.Fatal("expected parallel conflict error")
	}
}
```

```go
func TestRunWorkflowCollectsStatementTraceEvents(t *testing.T) {
	recorder := &sliceRecorder{}
	workflow := ast.Workflow{
		SchemaVersion: "1.0.0",
		Workflow:      ast.Metadata{ID: "wf"},
		Body: ast.Statement{
			ID:   "root",
			Kind: "sequence",
			Statements: []ast.Statement{
				{ID: "done", Kind: "return", Returns: map[string]ast.Expression{"ok": {Kind: "literal", Value: true}}},
			},
		},
	}

	result, err := RunWorkflow(context.Background(), workflow, Options{Recorder: recorder})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Events) < 4 {
		t.Fatalf("events = %d, want >= 4", len(result.Events))
	}
}
```

- [ ] **Step 2: Implement parallel runtime**

```go
// compiler/go/executor/errors.go
type RuntimeError struct {
	Phase         string
	WorkflowID    string
	StatementID   string
	StatementKind string
	BranchID      string
	Cause         error
}
```

```go
// compiler/go/executor/test_helpers_test.go
type sliceRecorder struct {
	events []Event
}

func (r *sliceRecorder) Record(event Event) {
	r.events = append(r.events, event)
}
```

```go
// compiler/go/executor/parallel.go
package executor

import (
	"context"
	"fmt"
	"sync"

	"rpa-agent-workflow/contracts/ast"
)

func (s *state) cloneForBranch(branchID string) *state {
	locals := map[string]any{}
	for key, value := range s.currentFrame().locals {
		locals[key] = value
	}
	variables := map[string]any{}
	for key, value := range s.variables {
		variables[key] = value
	}
	return &state{
		workflow:  s.workflow,
		frames:    []frame{{workflowID: branchID, locals: locals}},
		variables: variables,
		blocks:    s.blocks,
		host:      s.host,
		recorder:  nopRecorder{},
	}
}

func (s *state) runParallel(ctx context.Context, stmt ast.Statement) error {
	if err := s.checkParallelWrites(stmt); err != nil {
		return err
	}
	errCh := make(chan error, len(stmt.Branches))
	eventCh := make(chan []Event, len(stmt.Branches))
	var wg sync.WaitGroup
	for i := range stmt.Branches {
		branch := stmt.Branches[i]
		wg.Add(1)
		go func() {
			defer wg.Done()
			child := s.cloneForBranch(branch.ID)
			child.emit(Event{Name: "branch.start", WorkflowID: s.workflow.Workflow.ID, StatementID: branch.ID, StatementKind: "parallel"})
			for j := range branch.Body {
				if err := child.runStatement(ctx, branch.Body[j]); err != nil {
					errCh <- err
					eventCh <- child.events
					return
				}
			}
			child.emit(Event{Name: "branch.end", WorkflowID: s.workflow.Workflow.ID, StatementID: branch.ID, StatementKind: "parallel"})
			eventCh <- child.events
			errCh <- nil
		}()
	}
	wg.Wait()
	close(errCh)
	close(eventCh)
	for events := range eventCh {
		s.events = append(s.events, events...)
	}
	for err := range errCh {
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *state) checkParallelWrites(stmt ast.Statement) error {
	writes := map[string]bool{}
	for _, branch := range stmt.Branches {
		for _, child := range branch.Body {
			if child.Kind != "assign" {
				continue
			}
			if writes[child.Target] {
				return &RuntimeError{
					Phase:         PhaseExecute,
					WorkflowID:    s.workflow.Workflow.ID,
					StatementID:   stmt.ID,
					StatementKind: stmt.Kind,
					Cause:         fmt.Errorf("parallel write conflict on %q", child.Target),
				}
			}
			writes[child.Target] = true
		}
	}
	return nil
}
```

```go
// compiler/go/executor/execute.go
case "parallel":
	return s.runParallel(ctx, stmt)
```

### Task 7: Wire the executor into the CLI and add regression coverage

**Files:**
- Modify: `apps/cli/rpawf/main.go`
- Modify: `apps/cli/rpawf/main_test.go`
- Create: `compiler/go/executor/compat_test.go`
- Modify: `examples/sample-workflow/README.md`

- [ ] **Step 1: Add CLI tests**

```go
func TestExecHelpOutput(t *testing.T) {
	cmd := exec.Command("go", "run", ".", "exec", "--help")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if !strings.Contains(string(out), "exec") {
		t.Fatalf("missing exec help output:\n%s", out)
	}
}
```

- [ ] **Step 2: Wire CLI command**

```go
func execFile(astPath string, extra []string) (string, error) {
	astBytes, err := os.ReadFile(astPath)
	if err != nil {
		return "", err
	}
	if err := schema.ValidateAstBytes(astBytes); err != nil {
		return "", err
	}
	workflow, err := schema.LoadAst(astPath)
	if err != nil {
		return "", err
	}
	result, err := executor.RunWorkflow(context.Background(), *workflow, executor.Options{})
	if err != nil {
		return "", err
	}
	out, err := json.MarshalIndent(result.Returns, "", "  ")
	if err != nil {
		return "", err
	}
	return string(out) + "\n", nil
}
```

## Spec Coverage Check

- Direct Go execution of `ast.json`: covered by Tasks 1, 3, 4, 5, 6, and 7.
- Full current statement coverage: covered by Tasks 3, 4, 5, and 6.
- Runtime state, scope, returns, and deterministic control flow: covered by Tasks 2, 3, 4, and 6.
- Host adapter boundary for `callBlock`: covered by Task 5.
- Trace hooks and debugger-ready surfaces: covered by Tasks 3 and 6.
- CLI execution path and repository integration: covered by Task 7.
- Compatibility coverage against the Python runtime for overlapping semantics: covered by Task 7.

## Notes for Execution

- Keep the Go executor additive. Do not remove or rewrite the existing Python code generation flow.
- Do not move `contracts/` or `compiler/go/schema`; reuse them.
- Prefer small follow-up refactors only when they directly unblock executor correctness.
- When running commit steps, do so only inside an isolated worktree; otherwise stop before commit and hand off for manual review.
