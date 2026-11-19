package main

import (
	"bytes"
	"errors"
	"flag"
	"io"
	"strings"
	"testing"
)

func TestManualEntryOptions(t *testing.T) {
	t.Setenv("SESSION_DIR", "")
	t.Setenv("PROJECT_ROOT", "/from-env")
	t.Setenv("SYSTEM_PROMPT", "  ")
	opts, err := parseOptions(nil, io.Discard)
	if err != nil || opts.SessionDir != "data/sessions" || opts.ProjectRoot != "/from-env" || opts.AllowShell || opts.Instruction != "" {
		t.Fatalf("defaults=%+v err=%v", opts, err)
	}
	t.Setenv("SYSTEM_PROMPT", "环境提示词")
	opts, err = parseOptions(nil, io.Discard)
	if err != nil || opts.Instruction != "环境提示词" {
		t.Fatalf("env=%+v err=%v", opts, err)
	}
	opts, err = parseOptions([]string{"--project-root", "/practice", "--session", "demo", "--session-dir", "/sessions", "--instruction", "自定义", "--allow-shell"}, io.Discard)
	if err != nil || opts.ProjectRoot != "/practice" || opts.SessionID != "demo" || opts.SessionDir != "/sessions" || opts.Instruction != "自定义" || !opts.AllowShell {
		t.Fatalf("flags=%+v err=%v", opts, err)
	}
	for _, args := range [][]string{{"--agent", "deep"}, {"--unknown"}, {"question"}, {"--allow-shell=invalid"}} {
		if _, err := parseOptions(args, io.Discard); err == nil {
			t.Fatalf("accepted %v", args)
		}
	}
	var help bytes.Buffer
	if _, err := parseOptions([]string{"--help"}, &help); !errors.Is(err, flag.ErrHelp) {
		t.Fatal(err)
	}
	if !strings.Contains(help.String(), "manual-tools") || strings.Contains(help.String(), "-agent ") {
		t.Fatalf("help=%s", &help)
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
