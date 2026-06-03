package main

import (
	"bytes"
	"os"
	"os/exec"
	"strings"
	"testing"
)

func TestDebugHelpOutput(t *testing.T) {
	cmd := exec.Command("go", "run", ".", "debug", "--help")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	text := string(out)
	for _, want := range []string{"debug", "break <statementId>", "continue", "vars", "stack"} {
		if !strings.Contains(text, want) {
			t.Fatalf("debug help missing %q:\n%s", want, text)
		}
	}
}

func TestDebugCommandRunsAScriptedSession(t *testing.T) {
	input, err := os.ReadFile("testdata/debug-session-input.txt")
	if err != nil {
		t.Fatalf("read scripted input: %v", err)
	}

	var stdout, stderr bytes.Buffer
	status := runDebugCommand(
		[]string{"../../../compiler/go/compiler/fixtures/valid_v1_workflow.json"},
		bytes.NewReader(input),
		&stdout,
		&stderr,
	)
	if status != 0 {
		t.Fatalf("status = %d, stderr:\n%s\nstdout:\n%s", status, stderr.String(), stdout.String())
	}

	text := stdout.String()
	for _, want := range []string{
		"stopped: entry",
		"breakpoint set: assign",
		"breakpoint set: assign line 28",
		"stopped: breakpoint",
		"statement: assign assign",
		"statement: call_child callWorkflow",
		"statement: child_return return",
		"stopped: end",
	} {
		if !strings.Contains(text, want) {
			t.Fatalf("debug output missing %q:\n%s", want, text)
		}
	}
}

func TestDebugCommandPrintsLocalsVarsStackAndWhere(t *testing.T) {
	var stdout, stderr bytes.Buffer
	status := runDebugCommand(
		[]string{"../../../compiler/go/compiler/fixtures/valid_v1_workflow.json"},
		strings.NewReader("next\nvars\nlocals\nstack\nwhere\ncontinue\nquit\n"),
		&stdout,
		&stderr,
	)
	if status != 0 {
		t.Fatalf("status = %d, stderr:\n%s\nstdout:\n%s", status, stderr.String(), stdout.String())
	}

	text := stdout.String()
	for _, want := range []string{
		"stopped: step",
		"variables:",
		"locals:",
		"stack:",
		"statement: assign assign",
		"frame[0]: valid_v1_workflow",
	} {
		if !strings.Contains(text, want) {
			t.Fatalf("debug output missing %q:\n%s", want, text)
		}
	}
}
