# Chapter 04 Tool Filesystem Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. No commits: user reviews changes manually.

**Goal:** Prepare a runnable, readable fourth-chapter DeepAgent filesystem console.
**Architecture:** Independent CLI and orchestration package; official LocalBackend; existing event consumer and JSONL Store.
**Tech Stack:** Go 1.22.6, Eino v0.9.5, local backend v0.2.4.
**Spec:** docs/superpowers/specs/2026-11-16-ch04-tool-filesystem-design.md

## Global Constraints

- Leave previous chapters and .env unchanged. CGO_ENABLED=0; no real LLM calls, commit or push.
- PROJECT_ROOT is not a sandbox; shell opt-in; write tools remain enabled.
- Preserve complete tool protocol messages, not just Content.

## Review Focus

- Fragmented streamed tool arguments must display once and survive persistence.
- Missing/duplicate/orphan tool results must fail before resuming a model request.
- Invalid roots must fail before creating a session or invoking a model.
- Model/input/output failure must surface without replaying side effects.
- Empty input and EOF must not call the model; custom instructions retain path context.

### Task 1: Tool-aware console and DeepAgent execution

**Files:** Modify internal/agentconsole/turn.go; create internal/toolfilesystem/{agent,history,run}.go and corresponding tests.
**Interfaces:** Keep RunTurn(ctx context.Context, runner *adk.Runner, history []*schema.Message, output io.Writer) ([]*schema.Message, error). Add Options and Run(ctx context.Context, opts Options, input io.Reader, output io.Writer) error; internal runWithModel accepts model.BaseChatModel, which must support model.WithTools (per deep.Config).

- [x] Write failing offline tests using a scripted tool-calling model, real Backend and temp files: read, write, display, history resume, registration with/without execute, validation and I/O/model errors.
- [x] Run CGO_ENABLED=0 go test ./internal/toolfilesystem ./internal/agentconsole; confirm missing implementation fails.
- [x] Implement validated root, path-aware instruction, deep.New (MaxIteration 50, WithoutGeneralSubAgent true), optional StreamingShell; session persistence and protocol validation; tool-aware RunTurn display.
- [x] Run new tests and make test; inspect failures before continuing.

### Task 2: CLI and learning materials

**Files:** Create cmd/tool-filesystem/main.go and tests, docs/ch04-tool-filesystem.md; modify Makefile, README.md, .vscode/launch.json; dependency updates in go.mod/go.sum.
**Interfaces:** CLI --project-root, --allow-shell, --session, --session-dir, --instruction. Default session-dir data/sessions.

- [x] Add CLI tests for options precedence, help, bad args and invalid root without real model calls.
- [x] Implement flag parsing and signal cancellation; add make run-tool-filesystem and build target, F5 entry.
- [x] Document first-run commands, breakpoints, tool flow, temporary practice directory, rg prerequisite and LocalBackend permissions; link upstream tutorial and reading order.
- [x] Run make test, make build, CGO_ENABLED=0 go vet ./..., help smoke test and git diff --check.
- [x] Review final diff and collect an independent code review; address findings and rerun relevant tests. Leave changes uncommitted.

Review found one Minor: CLI generic default prompt bypassed the filesystem-specific default. Confirmed with a failing CLI regression test; changed the CLI to pass only explicit SYSTEM_PROMPT / --instruction overrides, leaving the empty default to newAgent. No Critical / Important findings. Verified full test/build/vet/diff checks after the fix.
