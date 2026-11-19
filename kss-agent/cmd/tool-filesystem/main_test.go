package main

import (
	"flag"
	"io"
	"testing"
)

func TestInstructionUsesAgentDefaultUnlessExplicitlyConfigured(t *testing.T) {
	t.Setenv("SYSTEM_PROMPT", "  ")
	opts, err := parseOptions(nil, io.Discard)
	if err != nil || opts.Instruction != "" {
		t.Fatalf("expected empty instruction to select filesystem agent default: %+v, %v", opts, err)
	}
	t.Setenv("SYSTEM_PROMPT", "环境提示词")
	opts, err = parseOptions(nil, io.Discard)
	if err != nil || opts.Instruction != "环境提示词" {
		t.Fatalf("environment instruction: %+v, %v", opts, err)
	}
	opts, err = parseOptions([]string{"--instruction", "参数提示词"}, io.Discard)
	if err != nil || opts.Instruction != "参数提示词" {
		t.Fatalf("flag instruction: %+v, %v", opts, err)
	}
}

func TestDeepEntryRejectsAgentSelector(t *testing.T) {
	if _, err := parseOptions([]string{"--agent", "chat-model"}, io.Discard); err == nil {
		t.Fatal("DeepAgent entry must not accept an agent selector")
	}
}

func TestParseOptions(t *testing.T) {
	t.Setenv("SESSION_DIR", "")
	t.Setenv("PROJECT_ROOT", "/from-env")
	opts, err := parseOptions([]string{"--session", "demo", "--project-root", "/from-flag", "--allow-shell", "--allow-code"}, io.Discard)
	if err != nil || opts.ProjectRoot != "/from-flag" || opts.SessionID != "demo" || !opts.AllowShell || !opts.AllowCode {
		t.Fatalf("opts=%+v err=%v", opts, err)
	}
	opts, err = parseOptions(nil, io.Discard)
	if err != nil || opts.ProjectRoot != "/from-env" || opts.SessionDir != "data/sessions" || opts.AllowShell || opts.AllowCode {
		t.Fatalf("defaults=%+v err=%v", opts, err)
	}
	for _, args := range [][]string{{"question"}, {"--unknown"}, {"--allow-shell=invalid"}, {"--allow-code=invalid"}} {
		if _, err := parseOptions(args, io.Discard); err == nil {
			t.Fatalf("accepted %v", args)
		}
	}
	if _, err := parseOptions([]string{"--help"}, io.Discard); err != flag.ErrHelp {
		t.Fatalf("help=%v", err)
	}
}

func TestSessionDirComesFromEnvironmentUnlessFlagged(t *testing.T) {
	t.Setenv("SESSION_DIR", "/from-env-sessions")
	opts, err := parseOptions(nil, io.Discard)
	if err != nil || opts.SessionDir != "/from-env-sessions" {
		t.Fatalf("env session dir: %+v, %v", opts, err)
	}
	opts, err = parseOptions([]string{"--session-dir", "/from-flag"}, io.Discard)
	if err != nil || opts.SessionDir != "/from-flag" {
		t.Fatalf("flag session dir: %+v, %v", opts, err)
	}
}
