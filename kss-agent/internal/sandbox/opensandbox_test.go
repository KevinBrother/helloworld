package sandbox

import (
	"context"
	"strings"
	"testing"
	"time"

	opensandbox "github.com/alibaba/OpenSandbox/sdks/sandbox/go"
)

func clearSandboxEnv(t *testing.T) {
	t.Helper()
	for _, key := range []string{
		"SANDBOX_DOMAIN", "SANDBOX_PROTOCOL", "SANDBOX_API_KEY", "SANDBOX_IMAGE",
		"SANDBOX_TTL", "SANDBOX_RUN_TIMEOUT",
		"OPEN_SANDBOX_DOMAIN", "OPEN_SANDBOX_PROTOCOL", "OPEN_SANDBOX_API_KEY",
	} {
		t.Setenv(key, "")
	}
}

func TestLoadConfigFromEnvDefaults(t *testing.T) {
	clearSandboxEnv(t)
	cfg, err := LoadConfigFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Domain != DefaultDomain {
		t.Errorf("domain = %q, want %q", cfg.Domain, DefaultDomain)
	}
	if cfg.Protocol != DefaultProtocol {
		t.Errorf("protocol = %q, want %q", cfg.Protocol, DefaultProtocol)
	}
	if cfg.Image != DefaultImage {
		t.Errorf("image = %q, want %q", cfg.Image, DefaultImage)
	}
	if cfg.TTL != DefaultTTL {
		t.Errorf("ttl = %v, want %v", cfg.TTL, DefaultTTL)
	}
	if cfg.RunTimeout != DefaultRunTimeout {
		t.Errorf("run timeout = %v, want %v", cfg.RunTimeout, DefaultRunTimeout)
	}
	if cfg.APIKey != "" {
		t.Errorf("api key should be empty, got %q", cfg.APIKey)
	}
}

func TestLoadConfigFromEnvOverrides(t *testing.T) {
	clearSandboxEnv(t)
	t.Setenv("SANDBOX_DOMAIN", "sandbox.example:9000")
	t.Setenv("SANDBOX_PROTOCOL", "https")
	t.Setenv("SANDBOX_API_KEY", "secret-key")
	t.Setenv("SANDBOX_IMAGE", "example/code:1")
	t.Setenv("SANDBOX_TTL", "30m")
	t.Setenv("SANDBOX_RUN_TIMEOUT", "90s")
	cfg, err := LoadConfigFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Domain != "sandbox.example:9000" || cfg.Protocol != "https" || cfg.APIKey != "secret-key" {
		t.Fatalf("unexpected connection config: %+v", cfg)
	}
	if cfg.Image != "example/code:1" || cfg.TTL != 30*time.Minute || cfg.RunTimeout != 90*time.Second {
		t.Fatalf("unexpected runtime config: %+v", cfg)
	}
}

func TestLoadConfigFromEnvFallsBackToSDKEnv(t *testing.T) {
	clearSandboxEnv(t)
	t.Setenv("OPEN_SANDBOX_DOMAIN", "sdk.example:8080")
	t.Setenv("OPEN_SANDBOX_PROTOCOL", "https")
	t.Setenv("OPEN_SANDBOX_API_KEY", "sdk-key")
	cfg, err := LoadConfigFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Domain != "sdk.example:8080" || cfg.Protocol != "https" || cfg.APIKey != "sdk-key" {
		t.Fatalf("unexpected connection config: %+v", cfg)
	}
}

func TestLoadConfigFromEnvRejectsInvalidDurations(t *testing.T) {
	clearSandboxEnv(t)
	t.Setenv("SANDBOX_TTL", "not-a-duration")
	if _, err := LoadConfigFromEnv(); err == nil {
		t.Fatal("expected invalid SANDBOX_TTL to be rejected")
	}
	clearSandboxEnv(t)
	t.Setenv("SANDBOX_RUN_TIMEOUT", "-5s")
	if _, err := LoadConfigFromEnv(); err == nil {
		t.Fatal("expected non-positive SANDBOX_RUN_TIMEOUT to be rejected")
	}
}

func TestNewOpenSandboxRunnerValidatesConfig(t *testing.T) {
	if _, err := NewOpenSandboxRunner(Config{}); err == nil {
		t.Fatal("expected empty domain to be rejected")
	}
	if _, err := NewOpenSandboxRunner(Config{Domain: "   "}); err == nil {
		t.Fatal("expected whitespace domain to be rejected")
	}
	if _, err := NewOpenSandboxRunner(Config{Domain: "localhost:8080", Protocol: "ftp"}); err == nil {
		t.Fatal("expected unsupported protocol to be rejected")
	}
	if _, err := NewOpenSandboxRunner(Config{Domain: "localhost:8080", TTL: 500 * time.Millisecond}); err == nil {
		t.Fatal("expected sub-second TTL to be rejected")
	}
	runner, err := NewOpenSandboxRunner(Config{Domain: "localhost:8080"})
	if err != nil {
		t.Fatal(err)
	}
	if runner.Domain() != "localhost:8080" || runner.Image() != DefaultImage {
		t.Fatalf("unexpected defaults: domain=%q image=%q", runner.Domain(), runner.Image())
	}
}

func TestMapExecutionBasic(t *testing.T) {
	exitCode := 0
	res := mapExecution(&opensandbox.Execution{
		Stdout:   []opensandbox.OutputMessage{{Text: "hello\n"}},
		Stderr:   []opensandbox.OutputMessage{{Text: "warn\n"}},
		Results:  []opensandbox.ExecutionResult{{Results: map[string]string{"text/plain": "42"}}},
		ExitCode: &exitCode,
	}, nil)
	if res.Stdout != "hello\n" || res.Stderr != "warn\n" || res.Result != "42" {
		t.Fatalf("unexpected result: %+v", res)
	}
	if res.ExitCode == nil || *res.ExitCode != 0 {
		t.Fatalf("exit code = %v, want 0", res.ExitCode)
	}
}

func TestMapExecutionError(t *testing.T) {
	errorExit := 1
	res := mapExecution(&opensandbox.Execution{
		Error: &opensandbox.ExecutionError{
			Name:      "ZeroDivisionError",
			Value:     "division by zero",
			Traceback: []string{"line one", "line two"},
			ExitCode:  &errorExit,
		},
	}, nil)
	for _, want := range []string{"ZeroDivisionError: division by zero", "line one", "line two"} {
		if !strings.Contains(res.Stderr, want) {
			t.Errorf("stderr missing %q:\n%s", want, res.Stderr)
		}
	}
	if res.ExitCode == nil || *res.ExitCode != 1 {
		t.Fatalf("exit code = %v, want 1", res.ExitCode)
	}
}

func TestMapExecutionNil(t *testing.T) {
	if res := mapExecution(nil, nil); res.Stdout != "" || res.ExitCode != nil {
		t.Fatalf("unexpected result for nil execution: %+v", res)
	}
}

func TestCloseIsIdempotent(t *testing.T) {
	runner, err := NewOpenSandboxRunner(Config{Domain: "localhost:8080"})
	if err != nil {
		t.Fatal(err)
	}
	if err := runner.Close(); err != nil {
		t.Fatalf("first close: %v", err)
	}
	if err := runner.Close(); err != nil {
		t.Fatalf("second close: %v", err)
	}
}

func TestRunAfterCloseFails(t *testing.T) {
	runner, err := NewOpenSandboxRunner(Config{Domain: "localhost:8080"})
	if err != nil {
		t.Fatal(err)
	}
	if err := runner.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := runner.Run(context.Background(), Request{Code: "print(1)"}); err == nil {
		t.Fatal("expected run after close to fail")
	} else if !strings.Contains(err.Error(), "closed") {
		t.Fatalf("error = %q, want closed", err)
	}
}

func TestRunValidatesBeforeReachingServer(t *testing.T) {
	runner, err := NewOpenSandboxRunner(Config{Domain: "127.0.0.1:1"})
	if err != nil {
		t.Fatal(err)
	}
	defer runner.Close()
	if _, err := runner.Run(context.Background(), Request{Code: "   "}); err == nil {
		t.Fatal("expected empty code to be rejected")
	} else if !strings.Contains(err.Error(), "code is required") {
		t.Fatalf("error = %q", err)
	}
}

func TestExecutionCollectorBoundsOutput(t *testing.T) {
	collector := newExecutionCollector(64)
	handlers := collector.handlers()
	if !handlers.SkipAccumulation {
		t.Fatal("collector must skip SDK accumulation")
	}
	for i := 0; i < 50; i++ {
		if err := handlers.OnStdout(opensandbox.OutputMessage{Text: strings.Repeat("x", 32)}); err != nil {
			t.Fatal(err)
		}
	}
	if err := handlers.OnStderr(opensandbox.OutputMessage{Text: "boom\n"}); err != nil {
		t.Fatal(err)
	}
	if err := handlers.OnResult(opensandbox.ExecutionResult{Results: map[string]string{"text/plain": "42"}}); err != nil {
		t.Fatal(err)
	}
	stdout, stderr, result, truncated := collector.snapshot()
	if !truncated {
		t.Fatal("expected truncated output")
	}
	if len(stdout)+len(stderr) > 64 {
		t.Fatalf("collector kept %d bytes, want <= 64", len(stdout)+len(stderr))
	}
	if result != "42" {
		t.Fatalf("result = %q, want 42", result)
	}
}

func TestExecutionCollectorKeepsStreamsSeparate(t *testing.T) {
	collector := newExecutionCollector(1024)
	handlers := collector.handlers()
	if err := handlers.OnStdout(opensandbox.OutputMessage{Text: "out"}); err != nil {
		t.Fatal(err)
	}
	if err := handlers.OnStdout(opensandbox.OutputMessage{Text: "more"}); err != nil {
		t.Fatal(err)
	}
	if err := handlers.OnStderr(opensandbox.OutputMessage{Text: "err"}); err != nil {
		t.Fatal(err)
	}
	stdout, stderr, _, truncated := collector.snapshot()
	if truncated {
		t.Fatal("output should not be truncated")
	}
	if stdout != "out\nmore" {
		t.Fatalf("stdout = %q, want out\\nmore", stdout)
	}
	if stderr != "err" {
		t.Fatalf("stderr = %q, want err", stderr)
	}
}

func TestMapExecutionWithCollectorUsesCollectedOutput(t *testing.T) {
	collector := newExecutionCollector(1024)
	if err := collector.handlers().OnStdout(opensandbox.OutputMessage{Text: "streamed\n"}); err != nil {
		t.Fatal(err)
	}
	exitCode := 0
	res := mapExecution(&opensandbox.Execution{
		Stdout:   []opensandbox.OutputMessage{{Text: "should be ignored"}},
		ExitCode: &exitCode,
	}, collector)
	if res.Stdout != "streamed\n" {
		t.Fatalf("stdout = %q, want streamed", res.Stdout)
	}
	if res.ExitCode == nil || *res.ExitCode != 0 {
		t.Fatalf("exit code = %v, want 0", res.ExitCode)
	}
}

func TestEndpointURL(t *testing.T) {
	cases := []struct {
		name     string
		protocol string
		endpoint string
		want     string
	}{
		{"adds scheme", "http", "127.0.0.1:52269/proxy/44772", "http://127.0.0.1:52269/proxy/44772"},
		{"keeps existing scheme", "http", "http://127.0.0.1:52269/proxy/44772", "http://127.0.0.1:52269/proxy/44772"},
		{"https", "https", "sandbox.example.com:8443/proxy/44772", "https://sandbox.example.com:8443/proxy/44772"},
		{"empty", "http", "", ""},
		{"trims spaces", "http", "  127.0.0.1:1/x  ", "http://127.0.0.1:1/x"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := endpointURL(tc.protocol, tc.endpoint); got != tc.want {
				t.Fatalf("endpointURL(%q, %q) = %q, want %q", tc.protocol, tc.endpoint, got, tc.want)
			}
		})
	}
}
