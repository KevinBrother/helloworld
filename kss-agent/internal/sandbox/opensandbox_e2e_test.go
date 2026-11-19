package sandbox

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"
)

// TestOpenSandboxRunnerE2E exercises a real OpenSandbox server. It only runs
// when SANDBOX_E2E=1, e.g.:
//
//	OPENSANDBOX_INSECURE_SERVER=YES opensandbox-server --config ~/.sandbox.toml
//	SANDBOX_E2E=1 CGO_ENABLED=0 go test ./internal/sandbox -run E2E -v
func TestOpenSandboxRunnerE2E(t *testing.T) {
	if os.Getenv("SANDBOX_E2E") != "1" {
		t.Skip("set SANDBOX_E2E=1 to run against a real OpenSandbox server")
	}
	cfg, err := LoadConfigFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	runner, err := NewOpenSandboxRunner(cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := runner.Close(); err != nil {
			t.Logf("close: %v", err)
		}
	}()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	res, err := runner.Run(ctx, Request{Language: "python", Code: "print(6*7)"})
	if err != nil {
		t.Fatalf("python run: %v", err)
	}
	if !strings.Contains(res.Stdout, "42") {
		t.Fatalf("python stdout = %q, want 42", res.Stdout)
	}
	if res.ExitCode == nil || *res.ExitCode != 0 {
		t.Fatalf("python exit code = %v, want 0", res.ExitCode)
	}

	res, err = runner.Run(ctx, Request{Language: "python", Code: "raise SystemExit(3)"})
	if err != nil {
		t.Fatalf("nonzero run: %v", err)
	}
	if res.ExitCode == nil || *res.ExitCode != 3 {
		t.Fatalf("nonzero exit code = %v, want 3", res.ExitCode)
	}

	res, err = runner.Run(ctx, Request{Language: "typescript", Code: "console.log('ts-ok')"})
	if err != nil {
		t.Fatalf("typescript run: %v", err)
	}
	if !strings.Contains(res.Stdout, "ts-ok") {
		t.Fatalf("typescript stdout = %q", res.Stdout)
	}
}
