package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"rpa-agent-workflow/compiler/go/astdbg"
	"rpa-agent-workflow/compiler/go/compiler"
	"rpa-agent-workflow/compiler/go/executor"
	"rpa-agent-workflow/contracts/block"
)

func runDebugCommand(args []string, stdin io.Reader, stdout, stderr io.Writer) int {
	if len(args) == 0 || args[0] == "--help" {
		printDebugUsage(stdout)
		return 0
	}
	if args[0] == "--dap" {
		fmt.Fprintln(stderr, "debug --dap is not implemented yet")
		return 1
	}
	if len(args) > 2 {
		printDebugUsage(stderr)
		return 1
	}

	debugRun, err := startDebugSession(args)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	defer debugRun.cancel()

	session := debugRun.session
	waitForInteractiveStop(session, 0)
	printStop(stdout, session.Snapshot())
	scanner := bufio.NewScanner(stdin)
	for {
		if !scanner.Scan() {
			debugRun.cancel()
			_ = session.Terminate()
			<-debugRun.runCh
			return 0
		}
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if debugRun.runLine(line, stdout) {
			<-debugRun.runCh
			return 0
		}
		if snap := session.Snapshot(); snap.StopReason == astdbg.StopReasonEnd || snap.StopReason == astdbg.StopReasonException || snap.StopReason == astdbg.StopReasonTerminated {
			<-debugRun.runCh
			return 0
		}
	}
}

func printDebugUsage(w io.Writer) {
	fmt.Fprintln(w, "Usage: rpawf debug <ast.json> [block-manifest.json|blocks-dir]")
	fmt.Fprintln(w, "Commands:")
	fmt.Fprintln(w, "  break <statementId>")
	fmt.Fprintln(w, "  break line <n>")
	fmt.Fprintln(w, "  continue")
	fmt.Fprintln(w, "  next")
	fmt.Fprintln(w, "  step")
	fmt.Fprintln(w, "  out")
	fmt.Fprintln(w, "  vars")
	fmt.Fprintln(w, "  locals")
	fmt.Fprintln(w, "  stack")
	fmt.Fprintln(w, "  where")
	fmt.Fprintln(w, "  quit")
}

type debugRun struct {
	session     *astdbg.Session
	sourceMap   *astdbg.SourceMap
	runCh       <-chan error
	cancel      context.CancelFunc
	breakpoints []astdbg.Breakpoint
}

func startDebugSession(args []string) (*debugRun, error) {
	astBytes, err := os.ReadFile(args[0])
	if err != nil {
		return nil, err
	}

	blocks := map[string]block.Definition{}
	if len(args) > 1 {
		blocks, err = loadBlocks(args[1])
		if err != nil {
			return nil, err
		}
	}

	workflow, diags := compiler.ValidateWorkflow(astBytes, blocks)
	if len(diags) > 0 {
		return nil, fmt.Errorf("%s: %s", diags[0].Code, diags[0].Message)
	}

	sourceMap, err := astdbg.BuildSourceMap(astBytes)
	if err != nil {
		return nil, err
	}

	session := astdbg.NewSession(*workflow, astdbg.Options{})
	ctx, cancel := context.WithCancel(context.Background())
	opts := executor.Options{
		Blocks:    blocks,
		DebugHook: session,
	}
	if len(blocks) > 0 {
		opts.Host = executor.NewPythonHost(executor.PythonHostOptions{})
	}

	runCh := make(chan error, 1)
	go func() {
		_, err := executor.RunWorkflow(ctx, *workflow, opts)
		runCh <- err
	}()
	return &debugRun{
		session:   session,
		sourceMap: sourceMap,
		runCh:     runCh,
		cancel:    cancel,
	}, nil
}

func (r *debugRun) runLine(line string, stdout io.Writer) bool {
	fields := strings.Fields(line)
	if len(fields) == 0 {
		return false
	}

	session := r.session
	switch fields[0] {
	case "break":
		r.runBreak(fields, stdout)
	case "continue", "c":
		previous := session.StopVersion()
		if err := session.Continue(); err != nil {
			fmt.Fprintf(stdout, "error: %v\n", err)
			return false
		}
		waitForInteractiveStop(session, previous)
		printStop(stdout, session.Snapshot())
	case "next", "n":
		previous := session.StopVersion()
		if err := session.Next(); err != nil {
			fmt.Fprintf(stdout, "error: %v\n", err)
			return false
		}
		waitForInteractiveStop(session, previous)
		printStop(stdout, session.Snapshot())
	case "step", "s":
		previous := session.StopVersion()
		if err := session.StepIn(); err != nil {
			fmt.Fprintf(stdout, "error: %v\n", err)
			return false
		}
		waitForInteractiveStop(session, previous)
		printStop(stdout, session.Snapshot())
	case "out":
		previous := session.StopVersion()
		if err := session.StepOut(); err != nil {
			fmt.Fprintf(stdout, "error: %v\n", err)
			return false
		}
		waitForInteractiveStop(session, previous)
		printStop(stdout, session.Snapshot())
	case "vars":
		printMap(stdout, "variables", session.Snapshot().Variables)
	case "locals":
		printMap(stdout, "locals", session.Snapshot().Locals)
	case "stack":
		printStack(stdout, session.Snapshot())
	case "where":
		printWhere(stdout, session.Snapshot(), r.sourceMap)
	case "quit", "q":
		r.cancel()
		_ = session.Terminate()
		return true
	case "help":
		printDebugUsage(stdout)
	default:
		fmt.Fprintf(stdout, "unknown command: %s\n", fields[0])
	}
	return false
}

func (r *debugRun) runBreak(fields []string, stdout io.Writer) {
	if len(fields) == 2 {
		r.addBreakpoint(astdbg.Breakpoint{StatementID: fields[1]})
		fmt.Fprintf(stdout, "breakpoint set: %s\n", fields[1])
		return
	}
	if len(fields) == 3 && fields[1] == "line" {
		line, err := strconv.Atoi(fields[2])
		if err != nil {
			fmt.Fprintf(stdout, "invalid line: %s\n", fields[2])
			return
		}
		breakpoint, ok := r.sourceMap.BreakpointForLine(line)
		if !ok {
			fmt.Fprintf(stdout, "no statement on line %d\n", line)
			return
		}
		r.addBreakpoint(breakpoint)
		fmt.Fprintf(stdout, "breakpoint set: %s line %d\n", breakpoint.StatementID, line)
		return
	}
	fmt.Fprintln(stdout, "usage: break <statementId> | break line <n>")
}

func (r *debugRun) addBreakpoint(breakpoint astdbg.Breakpoint) {
	for _, existing := range r.breakpoints {
		if existing.StatementID == breakpoint.StatementID {
			return
		}
	}
	r.breakpoints = append(r.breakpoints, breakpoint)
	r.session.SetBreakpoints(r.breakpoints)
}

func waitForInteractiveStop(session *astdbg.Session, previous uint64) uint64 {
	for {
		if current := session.StopVersion(); current != previous {
			return current
		}
		time.Sleep(time.Millisecond)
	}
}

func printStop(w io.Writer, snap astdbg.Snapshot) {
	fmt.Fprintf(w, "stopped: %s\n", snap.StopReason)
	fmt.Fprintf(w, "statement: %s %s\n", snap.StatementID, snap.StatementKind)
	if snap.Error != "" {
		fmt.Fprintf(w, "error: %s\n", snap.Error)
	}
}

func printWhere(w io.Writer, snap astdbg.Snapshot, sourceMap *astdbg.SourceMap) {
	printStop(w, snap)
	if loc, ok := sourceMap.Statement(snap.StatementID); ok {
		fmt.Fprintf(w, "location: %s:%d:%d\n", loc.JSONPath, loc.Line, loc.Column)
	}
}

func printStack(w io.Writer, snap astdbg.Snapshot) {
	fmt.Fprintln(w, "stack:")
	for i, frame := range snap.Frames {
		fmt.Fprintf(w, "  frame[%d]: %s\n", i, frame.WorkflowID)
	}
}

func printMap(w io.Writer, label string, values map[string]any) {
	fmt.Fprintf(w, "%s:\n", label)
	if len(values) == 0 {
		fmt.Fprintln(w, "  <empty>")
		return
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		encoded, err := json.Marshal(values[key])
		if err != nil {
			fmt.Fprintf(w, "  %s = %v\n", key, values[key])
			continue
		}
		fmt.Fprintf(w, "  %s = %s\n", key, encoded)
	}
}
