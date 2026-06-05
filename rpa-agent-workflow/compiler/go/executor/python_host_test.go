package executor

import (
	"context"
	"errors"
	"os/exec"
	"strings"
	"testing"

	"rpa-agent-workflow/contracts/block"
)

func TestPythonHostInvokesSyncBlockAndReturnsOutputs(t *testing.T) {
	requireUV(t)

	host := NewPythonHost(PythonHostOptions{})
	result, err := host.Call(context.Background(), BlockCall{
		Definition: block.Definition{
			ID: "system.get_os_info",
			Runtime: block.RuntimeBinding{
				Target:   "python",
				Module:   "rpa_sdk.blocks.system.get_os_info",
				Callable: "get_os_info",
				Mode:     "sync",
			},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := result.Outputs["name"]; got != "unknown" {
		t.Fatalf("output name = %#v, want %q", got, "unknown")
	}
}

func TestPythonHostKeepsBlockStdoutOutOfProtocol(t *testing.T) {
	requireUV(t)

	host := NewPythonHost(PythonHostOptions{})
	result, err := host.Call(context.Background(), BlockCall{
		Definition: block.Definition{
			ID: "core.log",
			Runtime: block.RuntimeBinding{
				Target:   "python",
				Module:   "rpa_sdk.blocks.core.log",
				Callable: "log",
				Mode:     "sync",
			},
		},
		Inputs: map[string]any{
			"message": "hello from test",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result.Outputs) != 0 {
		t.Fatalf("outputs = %#v, want none", result.Outputs)
	}
}

func TestPythonHostReturnsBlockErrorsWithoutTraceback(t *testing.T) {
	requireUV(t)

	host := NewPythonHost(PythonHostOptions{})
	_, err := host.Call(context.Background(), BlockCall{
		Definition: block.Definition{
			ID: "fs.read_text",
			Runtime: block.RuntimeBinding{
				Target:   "python",
				Module:   "rpa_sdk.blocks.fs.read_text",
				Callable: "read_text",
				Mode:     "sync",
			},
		},
		Inputs: map[string]any{
			"path": ".",
		},
	})
	if err == nil {
		t.Fatal("expected error")
	}
	message := err.Error()
	if !strings.Contains(message, "python block error: IsADirectoryError: path must be a file") {
		t.Fatalf("error = %q, want concise block error", message)
	}
	if strings.Contains(message, "Traceback") {
		t.Fatalf("error includes traceback: %q", message)
	}
}

func TestPythonHostRejectsUnsupportedRuntime(t *testing.T) {
	host := NewPythonHost(PythonHostOptions{})
	_, err := host.Call(context.Background(), BlockCall{
		Definition: block.Definition{
			ID: "browser.click",
			Runtime: block.RuntimeBinding{
				Target:   "browser",
				Module:   "browser",
				Callable: "click",
				Mode:     "sync",
			},
		},
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if !errors.Is(err, ErrUnsupportedFeature) {
		t.Fatalf("expected ErrUnsupportedFeature, got %v", err)
	}
}

func requireUV(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("uv"); err != nil {
		t.Skip("uv is unavailable")
	}
}
