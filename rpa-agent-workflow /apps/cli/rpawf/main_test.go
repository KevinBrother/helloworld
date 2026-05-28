package main

import (
	"os/exec"
	"strings"
	"testing"
)

func TestCompileHelpOutput(t *testing.T) {
	cmd := exec.Command("go", "run", ".", "compile", "--help")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("unexpected error: %v\n%s", err, out)
	}
	if !strings.Contains(string(out), "Usage") {
		t.Fatalf("missing usage output:\n%s", out)
	}
}
