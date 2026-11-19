package sandbox

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/cloudwego/eino/components/tool"
)

func TestValidate(t *testing.T) {
	cases := []struct {
		name     string
		req      Request
		wantLang string
		wantErr  string
	}{
		{name: "default language", req: Request{Code: "print(1)"}, wantLang: "python"},
		{name: "language lowercased", req: Request{Language: "PYTHON", Code: "print(1)"}, wantLang: "python"},
		{name: "custom language", req: Request{Language: "typescript", Code: "console.log(1)"}, wantLang: "typescript"},
		{name: "empty code", req: Request{Language: "python", Code: "  "}, wantErr: "code is required"},
		{name: "invalid language", req: Request{Language: "c++", Code: "int x;"}, wantErr: "invalid language"},
		{name: "code too long", req: Request{Language: "python", Code: strings.Repeat("x", MaxCodeBytes+1)}, wantErr: "code too long"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := tc.req
			err := Validate(&req)
			if tc.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error %q, got nil", tc.wantErr)
				}
				if !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("error = %q, want substring %q", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if req.Language != tc.wantLang {
				t.Fatalf("language = %q, want %q", req.Language, tc.wantLang)
			}
		})
	}
}

func TestFormatResultBasic(t *testing.T) {
	out := FormatResult(Request{Language: "python", Code: "print(1)"}, Result{
		Stdout:   "hello\n",
		Stderr:   "",
		Result:   "",
		ExitCode: intPtr(0),
	})
	for _, want := range []string{"language: python", "exit code: 0", "stdout:", "hello", "stderr:", "result:"} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q:\n%s", want, out)
		}
	}
}

func TestFormatResultUnknownExitCode(t *testing.T) {
	out := FormatResult(Request{Language: "python"}, Result{Stdout: "x"})
	if !strings.Contains(out, "exit code: unknown") {
		t.Fatalf("output missing unknown exit code:\n%s", out)
	}
}

func TestFormatResultNonZeroExitCode(t *testing.T) {
	out := FormatResult(Request{Language: "python"}, Result{
		Stderr:   "boom\n",
		ExitCode: intPtr(1),
	})
	if !strings.Contains(out, "exit code: 1") || !strings.Contains(out, "boom") {
		t.Fatalf("output missing exit code or stderr:\n%s", out)
	}
}

func TestFormatResultTruncatesAndKeepsUTF8(t *testing.T) {
	out := FormatResult(Request{Language: "python"}, Result{
		Stdout: strings.Repeat("搜", MaxOutputBytes),
	})
	if !strings.Contains(out, "truncated") {
		t.Fatal("output missing truncation marker")
	}
	if !utf8.ValidString(out) {
		t.Fatal("truncated output must stay valid UTF-8")
	}
	if len(out) > MaxOutputBytes+200 {
		t.Fatalf("output too large after truncation: %d bytes", len(out))
	}
}

func TestTruncateUTF8(t *testing.T) {
	raw := strings.Repeat("搜", 10)
	got := truncateUTF8(raw, len("搜")*3+1)
	if !utf8.ValidString(got) {
		t.Fatalf("truncateUTF8 returned invalid UTF-8: %q", got)
	}
	if len(got) > len("搜")*3+1 {
		t.Fatalf("truncateUTF8 returned %d bytes, limit was larger", len(got))
	}
}

type fakeRunner struct {
	result Result
	err    error
	calls  []Request
}

func (f *fakeRunner) Run(_ context.Context, req Request) (Result, error) {
	f.calls = append(f.calls, req)
	return f.result, f.err
}

func (f *fakeRunner) Close() error { return nil }

func newCodeTool(t *testing.T, runner Runner) tool.BaseTool {
	t.Helper()
	base, err := NewTool(runner)
	if err != nil {
		t.Fatal(err)
	}
	return base
}

func invokeCode(t *testing.T, base tool.BaseTool, args map[string]any) (string, error) {
	t.Helper()
	invokable, ok := base.(tool.InvokableTool)
	if !ok {
		t.Fatal("tool is not invokable")
	}
	raw, err := json.Marshal(args)
	if err != nil {
		t.Fatal(err)
	}
	return invokable.InvokableRun(context.Background(), string(raw))
}

func TestNewToolRejectsNilRunner(t *testing.T) {
	if _, err := NewTool(nil); err == nil {
		t.Fatal("expected nil runner to be rejected")
	}
}

func TestCodeToolInfo(t *testing.T) {
	base := newCodeTool(t, &fakeRunner{})
	info, err := base.Info(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if info.Name != "run_code" {
		t.Fatalf("name = %q, want run_code", info.Name)
	}
	if !strings.Contains(info.Desc, "sandbox") {
		t.Fatalf("description does not mention sandbox isolation: %q", info.Desc)
	}
}

func TestCodeToolReportsInvalidInputAsResult(t *testing.T) {
	runner := &fakeRunner{}
	base := newCodeTool(t, runner)
	for _, args := range []map[string]any{
		{"code": "  "},
		{"language": "c++", "code": "int x;"},
		{"code": strings.Repeat("x", MaxCodeBytes+1)},
	} {
		got, err := invokeCode(t, base, args)
		if err != nil {
			t.Fatalf("invoke(%v) must not be a Go error: %v", args["language"], err)
		}
		if !strings.HasPrefix(got, "error: ") {
			t.Fatalf("invoke(%v) = %q, want error text", args["language"], got)
		}
	}
	if len(runner.calls) != 0 {
		t.Fatalf("runner called %d times for invalid input", len(runner.calls))
	}
}

func TestFormatResultTruncationMarkerFitsLimit(t *testing.T) {
	out := FormatResult(Request{Language: "python"}, Result{Stdout: strings.Repeat("搜", MaxOutputBytes)})
	if !strings.Contains(out, "truncated") {
		t.Fatal("output missing truncation marker")
	}
	if len(out) > MaxOutputBytes {
		t.Fatalf("truncated output = %d bytes, want <= %d", len(out), MaxOutputBytes)
	}
	if !utf8.ValidString(out) {
		t.Fatal("truncated output must stay valid UTF-8")
	}
}

func TestCodeToolRunsAndFormats(t *testing.T) {
	runner := &fakeRunner{result: Result{Stdout: "42\n", ExitCode: intPtr(0)}}
	base := newCodeTool(t, runner)
	out, err := invokeCode(t, base, map[string]any{"language": "python", "code": "print(42)"})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "language: python") || !strings.Contains(out, "42") {
		t.Fatalf("unexpected output:\n%s", out)
	}
	if len(runner.calls) != 1 {
		t.Fatalf("runner called %d times, want 1", len(runner.calls))
	}
	if runner.calls[0].Language != "python" || runner.calls[0].Code != "print(42)" {
		t.Fatalf("runner request = %+v", runner.calls[0])
	}
}

func TestCodeToolDefaultLanguage(t *testing.T) {
	runner := &fakeRunner{result: Result{ExitCode: intPtr(0)}}
	base := newCodeTool(t, runner)
	if _, err := invokeCode(t, base, map[string]any{"code": "print(1)"}); err != nil {
		t.Fatal(err)
	}
	if runner.calls[0].Language != DefaultLanguage {
		t.Fatalf("language = %q, want %q", runner.calls[0].Language, DefaultLanguage)
	}
}

func TestCodeToolPropagatesRunnerError(t *testing.T) {
	runner := &fakeRunner{err: errors.New("sandbox unavailable")}
	base := newCodeTool(t, runner)
	if _, err := invokeCode(t, base, map[string]any{"code": "print(1)"}); err == nil {
		t.Fatal("expected runner error to be propagated")
	} else if !strings.Contains(err.Error(), "sandbox unavailable") {
		t.Fatalf("error = %q", err)
	}
}

func TestCodeToolKeepsNonZeroExitAsOutput(t *testing.T) {
	runner := &fakeRunner{result: Result{Stderr: "boom\n", ExitCode: intPtr(2)}}
	base := newCodeTool(t, runner)
	out, err := invokeCode(t, base, map[string]any{"code": "raise SystemExit(2)"})
	if err != nil {
		t.Fatalf("non-zero exit should stay a successful tool call, got error: %v", err)
	}
	if !strings.Contains(out, "exit code: 2") || !strings.Contains(out, "boom") {
		t.Fatalf("unexpected output:\n%s", out)
	}
}

func intPtr(v int) *int { return &v }
