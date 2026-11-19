package sandbox

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	MaxCodeBytes    = 16 << 10
	MaxOutputBytes  = 32 << 10
	DefaultLanguage = "python"
	CodeToolName    = "run_code"
)

var languagePattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,31}$`)

type Request struct {
	Language string
	Code     string
}

type Result struct {
	Stdout    string
	Stderr    string
	Result    string
	ExitCode  *int
	Truncated bool
}

type Runner interface {
	Run(ctx context.Context, req Request) (Result, error)
	Close() error
}

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
