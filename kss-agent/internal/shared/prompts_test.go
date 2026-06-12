package shared

import (
	"testing"
)

func TestDefaultInstructionUsesEnv(t *testing.T) {
	t.Setenv(envSystemPrompt, "custom system")
	if got, want := DefaultInstruction(), "custom system"; got != want {
		t.Fatalf("DefaultInstruction() = %q, want %q", got, want)
	}
}

func TestDefaultInstructionFallback(t *testing.T) {
	t.Setenv(envSystemPrompt, "")
	if got, want := DefaultInstruction(), DefaultSystemPrompt; got != want {
		t.Fatalf("DefaultInstruction() = %q, want %q", got, want)
	}
}

func TestResolveUserPromptPrefersArgs(t *testing.T) {
	t.Setenv(envUserPrompt, "from env")
	if got, want := ResolveUserPrompt([]string{"from", "args"}), "from args"; got != want {
		t.Fatalf("ResolveUserPrompt() = %q, want %q", got, want)
	}
}

func TestResolveUserPromptUsesEnv(t *testing.T) {
	t.Setenv(envUserPrompt, "from env")
	if got, want := ResolveUserPrompt(nil), "from env"; got != want {
		t.Fatalf("ResolveUserPrompt() = %q, want %q", got, want)
	}
}
