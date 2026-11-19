package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"kss-agent/internal/shared"
	"kss-agent/internal/toolfilesystem"
)

func main() {
	if err := run(); err != nil && !errors.Is(err, flag.ErrHelp) {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func parseOptions(args []string, output io.Writer) (toolfilesystem.Options, error) {
	var opts toolfilesystem.Options
	flags := flag.NewFlagSet("tool-filesystem", flag.ContinueOnError)
	flags.SetOutput(output)
	flags.StringVar(&opts.SessionID, "session", "", "session ID (empty creates a new session)")
	flags.StringVar(&opts.SessionDir, "session-dir", shared.DefaultSessionDir(), "directory for JSONL session files (default: SESSION_DIR or data/sessions)")
	flags.StringVar(&opts.ProjectRoot, "project-root", os.Getenv("PROJECT_ROOT"), "project directory for path context (NOT a sandbox)")
	// Empty selects the filesystem agent's own default, not the generic chat prompt.
	flags.StringVar(&opts.Instruction, "instruction", strings.TrimSpace(os.Getenv("SYSTEM_PROMPT")), "system prompt (default: filesystem assistant; project path context is always appended)")
	flags.BoolVar(&opts.AllowShell, "allow-shell", false, "allow unrestricted local shell execution; filesystem writes are already enabled")
	flags.BoolVar(&opts.AllowCode, "allow-code", false, "allow sandboxed code execution via run_code (requires a running OpenSandbox server)")
	if err := flags.Parse(args); err != nil {
		return opts, err
	}
	if flags.NArg() != 0 {
		return opts, fmt.Errorf("请启动后在 you> 输入问题，不接受位置参数")
	}
	return opts, nil
}

func run() error {
	shared.LoadDotEnv()
	opts, err := parseOptions(os.Args[1:], os.Stderr)
	if err != nil {
		return err
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	return toolfilesystem.Run(ctx, opts, os.Stdin, os.Stdout)
}
