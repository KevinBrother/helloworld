package executor

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type PythonHostOptions struct {
	ProjectPath string
	PythonBin   string
}

type PythonHost struct {
	opts PythonHostOptions
}

func NewPythonHost(opts PythonHostOptions) *PythonHost {
	return &PythonHost{opts: opts}
}

func (h *PythonHost) Call(ctx context.Context, call BlockCall) (BlockResult, error) {
	if call.Definition.Runtime.Target != "python" {
		return BlockResult{}, &RuntimeError{
			Phase:       PhaseHost,
			WorkflowID:  call.WorkflowID,
			StatementID: call.StatementID,
			Cause:       fmt.Errorf("%w: runtime target %q is unsupported", ErrUnsupportedFeature, call.Definition.Runtime.Target),
		}
	}
	if call.Definition.Runtime.Mode != "sync" {
		return BlockResult{}, &RuntimeError{
			Phase:       PhaseHost,
			WorkflowID:  call.WorkflowID,
			StatementID: call.StatementID,
			Cause:       fmt.Errorf("%w: runtime mode %q is unsupported", ErrUnsupportedFeature, call.Definition.Runtime.Mode),
		}
	}

	bridge := pythonBridgeScript()
	project, err := resolvePythonProjectPath(h.opts.ProjectPath)
	if err != nil {
		return BlockResult{}, err
	}
	bin, args := h.command(bridge, call.Definition.Runtime.Module, call.Definition.Runtime.Callable, project)
	cmd := exec.CommandContext(ctx, bin, args...)
	if h.opts.ProjectPath != "" {
		cmd.Dir = h.opts.ProjectPath
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	cmd.Env = appendPythonPath(project)

	request := pythonBridgeRequest{
		Inputs: call.Inputs,
	}
	requestBytes, err := json.Marshal(request)
	if err != nil {
		return BlockResult{}, err
	}
	cmd.Stdin = bytes.NewReader(requestBytes)

	if err := cmd.Run(); err != nil {
		return BlockResult{}, &RuntimeError{
			Phase:         PhaseHost,
			WorkflowID:    call.WorkflowID,
			StatementID:   call.StatementID,
			StatementKind: "callBlock",
			Cause:         fmt.Errorf("python host failed: %w: %s", err, strings.TrimSpace(stderr.String())),
		}
	}

	var response pythonBridgeResponse
	if err := json.Unmarshal(stdout.Bytes(), &response); err != nil {
		return BlockResult{}, &RuntimeError{
			Phase:         PhaseHost,
			WorkflowID:    call.WorkflowID,
			StatementID:   call.StatementID,
			StatementKind: "callBlock",
			Cause:         fmt.Errorf("invalid python bridge response: %w", err),
		}
	}

	if response.Error != "" {
		return BlockResult{}, &RuntimeError{
			Phase:         PhaseHost,
			WorkflowID:    call.WorkflowID,
			StatementID:   call.StatementID,
			StatementKind: "callBlock",
			Cause:         fmt.Errorf("python block error: %s", response.Error),
		}
	}

	if response.Outputs != nil {
		return BlockResult{Outputs: response.Outputs}, nil
	}
	return BlockResult{Value: response.Value, Outputs: map[string]any{}}, nil
}

func (h *PythonHost) command(bridge string, module string, callable string, project string) (string, []string) {
	if h.opts.PythonBin != "" {
		return h.opts.PythonBin, []string{"-c", bridge, module, callable}
	}
	return "uv", []string{"--project", project, "run", "python", "-c", bridge, module, callable}
}

func resolvePythonProjectPath(path string) (string, error) {
	if path != "" {
		return filepath.Abs(path)
	}

	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		candidate := filepath.Join(dir, "go.mod")
		if _, err := os.Stat(candidate); err == nil {
			return filepath.Join(dir, "sdks", "python"), nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("cannot locate repository root for python runtime")
		}
		dir = parent
	}
}

func appendPythonPath(project string) []string {
	env := os.Environ()
	env = append(env, "PYTHONPATH="+project)
	return env
}

type pythonBridgeRequest struct {
	Inputs map[string]any `json:"inputs"`
}

type pythonBridgeResponse struct {
	Value   any            `json:"value,omitempty"`
	Outputs map[string]any `json:"outputs,omitempty"`
	Error   string         `json:"error,omitempty"`
}

func pythonBridgeScript() string {
	return strings.TrimSpace(`
import contextlib
import importlib
import json
import sys

module = sys.argv[1]
callable_name = sys.argv[2]
payload = json.load(sys.stdin)

mod = importlib.import_module(module)
fn = getattr(mod, callable_name)

inputs = payload.get("inputs") or {}
with contextlib.redirect_stdout(sys.stderr):
    result = fn(**inputs)

if isinstance(result, dict):
    json.dump({"outputs": result}, sys.stdout)
else:
    json.dump({"value": result}, sys.stdout)
`)
}
