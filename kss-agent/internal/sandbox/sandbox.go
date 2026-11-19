// Package sandbox runs untrusted code inside an isolated sandbox and exposes it
// to the model as the run_code tool.
//
// The Runner interface keeps the execution backend swappable: this package holds
// the backend-independent contract (validation, result formatting, the tool
// layer), while opensandbox.go implements Runner on top of OpenSandbox.
package sandbox

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	// MaxCodeBytes bounds the submitted source code.
	MaxCodeBytes = 16 << 10
	// MaxOutputBytes bounds the formatted tool output.
	MaxOutputBytes = 32 << 10
	// DefaultLanguage is used when the model omits the language parameter.
	DefaultLanguage = "python"
	// CodeToolName is the tool name the model sees for sandboxed execution.
	CodeToolName = "run_code"
)

var languagePattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,31}$`)

// Request is one code execution request.
type Request struct {
	// Language is the sandbox language id, e.g. "python" or "typescript".
	// Empty means DefaultLanguage.
	Language string
	// Code is the source code to execute.
	Code string
}

// Result is a backend-independent execution outcome.
type Result struct {
	// Stdout and Stderr contain captured output.
	Stdout string
	Stderr string
	// Result contains the interpreter's final expression value when present.
	Result string
	// ExitCode is nil when the backend cannot report one.
	ExitCode *int
	// Truncated reports whether the backend already truncated output.
	Truncated bool
}

// Runner executes code in an isolated environment.
type Runner interface {
	Run(ctx context.Context, req Request) (Result, error)
	Close() error
}

// Validate normalizes req in place and rejects obviously invalid input.
// Supported languages ultimately depend on the sandbox image.
func Validate(req *Request) error {
	req.Language = strings.ToLower(strings.TrimSpace(req.Language))
	if req.Language == "" {
		req.Language = DefaultLanguage
	}
	if !languagePattern.MatchString(req.Language) {
		return fmt.Errorf("invalid language %q: expected a lowercase identifier such as python or typescript", req.Language)
	}
	if strings.TrimSpace(req.Code) == "" {
		return fmt.Errorf("code is required")
	}
	if len(req.Code) > MaxCodeBytes {
		return fmt.Errorf("code too long: %d bytes (max %d)", len(req.Code), MaxCodeBytes)
	}
	return nil
}

// FormatResult renders an execution outcome for the model, bounded by
// MaxOutputBytes and truncation-safe for UTF-8.
func FormatResult(req Request, res Result) string {
	var b strings.Builder
	fmt.Fprintf(&b, "language: %s\n", req.Language)
	fmt.Fprintf(&b, "exit code: %s\n", exitCodeText(res.ExitCode))
	if res.Stdout != "" {
		fmt.Fprintf(&b, "stdout:\n%s\n", res.Stdout)
	} else {
		b.WriteString("stdout:\n")
	}
	if res.Stderr != "" {
		fmt.Fprintf(&b, "stderr:\n%s\n", res.Stderr)
	} else {
		b.WriteString("stderr:\n")
	}
	if res.Result != "" {
		fmt.Fprintf(&b, "result:\n%s\n", res.Result)
	} else {
		b.WriteString("result:\n")
	}
	out := b.String()
	if res.Truncated {
		out += "...(output was truncated by the sandbox)\n"
	}
	if len(out) > MaxOutputBytes {
		marker := "\n...(tool output truncated)\n"
		limit := MaxOutputBytes - len(marker)
		if limit < 0 {
			limit = 0
		}
		out = truncateUTF8(out, limit) + marker
	}
	return out
}

func exitCodeText(code *int) string {
	if code == nil {
		return "unknown"
	}
	return fmt.Sprintf("%d", *code)
}

// truncateUTF8 cuts s to at most n bytes without splitting a rune.
func truncateUTF8(s string, n int) string {
	if len(s) <= n {
		return s
	}
	if n < 0 {
		n = 0
	}
	for n > 0 && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n]
}
