package toolfilesystem

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/schema"
	"kss-agent/internal/mem"
)

var _ adk.ChatModelAgentMiddleware = newSafeTool()

func TestSafeToolInvokable(t *testing.T) {
	boom := errors.New("boom")
	interrupt := compose.NewInterruptAndRerunErr("pause")
	canceled, cancel := context.WithCancel(context.Background())
	cancel()
	for _, tc := range []struct {
		name    string
		ctx     context.Context
		value   string
		err     error
		want    string
		wantErr error
	}{
		{"success", context.Background(), "ok", nil, "ok", nil},
		{"failure", context.Background(), "", boom, "[tool error] boom", nil},
		{"canceled", canceled, "", boom, "", boom},
		{"interrupt", context.Background(), "", interrupt, "", interrupt},
	} {
		t.Run(tc.name, func(t *testing.T) {
			wrapped, err := newSafeTool().WrapInvokableToolCall(context.Background(), func(ctx context.Context, args string, opts ...tool.Option) (string, error) {
				if args != "args" {
					t.Errorf("args = %q", args)
				}
				return tc.value, tc.err
			}, nil)
			if err != nil {
				t.Fatal(err)
			}
			got, err := wrapped(tc.ctx, "args")
			if got != tc.want || !errors.Is(err, tc.wantErr) {
				t.Fatalf("got %q, %v; want %q, %v", got, err, tc.want, tc.wantErr)
			}
		})
	}
}

func TestSafeToolStreamable(t *testing.T) {
	boom := errors.New("boom")
	interrupt := compose.NewInterruptAndRerunErr("pause")
	canceled, cancel := context.WithCancel(context.Background())
	cancel()
	for _, tc := range []struct {
		name     string
		ctx      context.Context
		openErr  error
		frameErr error
		want     []string
		wantErr  error
	}{
		{"open error", context.Background(), boom, nil, []string{"[tool error] boom"}, nil},
		{"midstream error", context.Background(), nil, boom, []string{"a", "[tool error] boom"}, nil},
		{"success", context.Background(), nil, nil, []string{"a"}, nil},
		{"open interrupt", context.Background(), interrupt, nil, nil, interrupt},
		{"stream interrupt", context.Background(), nil, interrupt, []string{"a"}, interrupt},
		{"open cancellation", canceled, boom, nil, nil, boom},
		{"stream cancellation", canceled, nil, boom, []string{"a"}, boom},
	} {
		t.Run(tc.name, func(t *testing.T) {
			wrapped, err := newSafeTool().WrapStreamableToolCall(context.Background(), func(context.Context, string, ...tool.Option) (*schema.StreamReader[string], error) {
				if tc.openErr != nil {
					return nil, tc.openErr
				}
				r, w := schema.Pipe[string](2)
				w.Send("a", nil)
				if tc.frameErr != nil {
					w.Send("", tc.frameErr)
				}
				w.Close()
				return r, nil
			}, nil)
			if err != nil {
				t.Fatal(err)
			}
			r, err := wrapped(tc.ctx, "args")
			if tc.openErr != nil && tc.wantErr != nil {
				if err != tc.wantErr {
					t.Fatalf("open error = %v", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			defer r.Close()
			for _, want := range tc.want {
				got, err := r.Recv()
				if err != nil || got != want {
					t.Fatalf("frame = %q, %v; want %q", got, err, want)
				}
			}
			_, err = r.Recv()
			if tc.wantErr != nil {
				if err != tc.wantErr {
					t.Fatalf("stream error = %v", err)
				}
				_, err = r.Recv()
			}
			if err != io.EOF {
				t.Fatalf("final error = %v", err)
			}
		})
	}
}

func TestSafeToolStreamableClosesUpstreamOnEarlyClose(t *testing.T) {
	upstream, writer := schema.Pipe[string](0)
	closed := make(chan struct{})
	go func() {
		defer writer.Close()
		for {
			if writer.Send("a", nil) {
				close(closed)
				return
			}
		}
	}()
	wrapped, err := newSafeTool().WrapStreamableToolCall(context.Background(), func(context.Context, string, ...tool.Option) (*schema.StreamReader[string], error) {
		return upstream, nil
	}, nil)
	if err != nil {
		t.Fatal(err)
	}
	r, err := wrapped(context.Background(), "")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = r.Recv(); err != nil {
		t.Fatal(err)
	}
	r.Close()
	select {
	case <-closed:
	case <-time.After(time.Second):
		t.Fatal("upstream reader not closed")
	}
}

func TestSafeStreamClosesIdleUpstream(t *testing.T) {
	for _, firstFrame := range []bool{false, true} {
		t.Run(map[bool]string{false: "before first frame", true: "after first frame"}[firstFrame], func(t *testing.T) {
			source, writer := schema.Pipe[string](1)
			t.Cleanup(writer.Close)
			reader := safeStream(context.Background(), source, toolError)
			if firstFrame {
				writer.Send("first", nil)
				if got, err := reader.Recv(); got != "first" || err != nil {
					t.Fatalf("first frame = %q, %v", got, err)
				}
			}
			reader.Close()
			closed := make(chan bool, 1)
			go func() { closed <- writer.Send("probe", nil) }()
			select {
			case got := <-closed:
				if !got {
					t.Fatal("upstream reader not closed")
				}
			case <-time.After(time.Second):
				t.Fatal("upstream send did not return after downstream close")
			}
		})
	}
}

func TestSafeStreamConvertedErrorEndsAtEOF(t *testing.T) {
	source, writer := schema.Pipe[string](2)
	writer.Send("first", nil)
	writer.Send("", errors.New("boom"))
	writer.Close()
	reader := safeStream(context.Background(), source, toolError)
	defer reader.Close()
	for _, want := range []string{"first", "[tool error] boom"} {
		if got, err := reader.Recv(); got != want || err != nil {
			t.Fatalf("frame = %q, %v; want %q", got, err, want)
		}
	}
	for range 2 {
		if _, err := reader.Recv(); err != io.EOF {
			t.Fatalf("terminal error = %v", err)
		}
	}
}

func TestSafeToolEnhanced(t *testing.T) {
	boom := errors.New("boom")
	interrupt := compose.NewInterruptAndRerunErr("pause")
	canceled, cancel := context.WithCancel(context.Background())
	cancel()
	for _, tc := range []struct {
		name    string
		ctx     context.Context
		err     error
		wantErr error
	}{{"error", context.Background(), boom, nil}, {"interrupt", context.Background(), interrupt, interrupt}, {"cancel", canceled, boom, boom}} {
		t.Run(tc.name, func(t *testing.T) {
			m := newSafeTool()
			syncCall, err := m.WrapEnhancedInvokableToolCall(context.Background(), func(context.Context, *schema.ToolArgument, ...tool.Option) (*schema.ToolResult, error) {
				return nil, tc.err
			}, nil)
			if err != nil {
				t.Fatal(err)
			}
			got, err := syncCall(tc.ctx, &schema.ToolArgument{})
			if tc.wantErr != nil {
				if err != tc.wantErr {
					t.Fatalf("error = %v", err)
				}
			} else if err != nil || got == nil || len(got.Parts) != 1 || got.Parts[0].Text != "[tool error] boom" || got.Parts[0].Type != schema.ToolPartTypeText {
				t.Fatalf("result = %#v, %v", got, err)
			}
			streamCall, err := m.WrapEnhancedStreamableToolCall(context.Background(), func(context.Context, *schema.ToolArgument, ...tool.Option) (*schema.StreamReader[*schema.ToolResult], error) {
				r, w := schema.Pipe[*schema.ToolResult](1)
				w.Send(nil, tc.err)
				w.Close()
				return r, nil
			}, nil)
			if err != nil {
				t.Fatal(err)
			}
			r, err := streamCall(tc.ctx, &schema.ToolArgument{})
			if err != nil {
				t.Fatal(err)
			}
			defer r.Close()
			got, err = r.Recv()
			if tc.wantErr != nil {
				if err != tc.wantErr {
					t.Fatalf("stream error = %v", err)
				}
			} else if err != nil || got == nil || len(got.Parts) != 1 || got.Parts[0].Text != "[tool error] boom" || got.Parts[0].Type != schema.ToolPartTypeText {
				t.Fatalf("stream result = %#v, %v", got, err)
			}
			_, err = r.Recv()
			if err != io.EOF {
				t.Fatalf("final error = %v", err)
			}
		})
	}
}

func TestIsRateLimited(t *testing.T) {
	for _, tc := range []struct {
		err  error
		want bool
	}{
		{errors.New("HTTP 429"), true}, {errors.New("Too Many Requests"), true}, {errors.New("RATE LIMIT"), true}, {errors.New("QPM limit"), true}, {errors.New("TPM limit"), true}, {io.EOF, false}, {errors.New("401 unauthorized"), false}, {nil, false},
	} {
		if got := isRateLimited(tc.err); got != tc.want {
			t.Errorf("isRateLimited(%v) = %v, want %v", tc.err, got, tc.want)
		}
	}
}

func TestModelRetryConfigDecides(t *testing.T) {
	cfg := newModelRetryConfig(DefaultMaxRetries)
	if cfg.MaxRetries != 5 {
		t.Fatalf("MaxRetries = %d", cfg.MaxRetries)
	}
	for _, tc := range []struct {
		err  error
		want bool
	}{{errors.New("429"), true}, {errors.New("401"), false}, {nil, false}} {
		if got := cfg.ShouldRetry(context.Background(), &adk.RetryContext{Err: tc.err}).Retry; got != tc.want {
			t.Errorf("ShouldRetry(%v) = %v", tc.err, got)
		}
	}
	if got := newModelRetryConfig(0).MaxRetries; got != 0 {
		t.Errorf("disabled MaxRetries = %d", got)
	}
}

func savedMessages(t *testing.T, opts Options) []*schema.Message {
	t.Helper()
	store, err := mem.NewStore(opts.SessionDir)
	if err != nil {
		t.Fatal(err)
	}
	session, err := store.GetOrCreate(opts.SessionID)
	if err != nil {
		t.Fatal(err)
	}
	return session.GetMessages()
}

func TestSafeToolRecoversToolError(t *testing.T) {
	opts := fixtureOptions(t)
	opts.MaxRetries = DefaultMaxRetries
	m := &scriptedModel{replies: []*schema.Message{toolCall("read_file", map[string]any{"file_path": filepath.Join(opts.ProjectRoot, "missing.txt")}), schema.AssistantMessage("已修正", nil)}}
	var out bytes.Buffer
	if err := runWithModel(context.Background(), m, opts, strings.NewReader("读取文件\n"), &out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "[tool error]") {
		t.Fatalf("output = %q", out.String())
	}
	msgs := savedMessages(t, opts)
	if len(msgs) != 4 || msgs[2].Role != schema.Tool || !strings.HasPrefix(msgs[2].Content, "[tool error]") || msgs[3].Content != "已修正" {
		t.Fatalf("history = %+v", msgs)
	}
	if len(m.inputs) != 2 {
		t.Fatalf("model calls = %d", len(m.inputs))
	}
	found := false
	for _, msg := range m.inputs[1] {
		if msg.Role == schema.Tool && strings.HasPrefix(msg.Content, "[tool error]") {
			found = true
		}
	}
	if !found {
		t.Fatalf("model input = %+v", m.inputs[1])
	}
}

func TestMiddlewareHintsReflectRetries(t *testing.T) {
	for _, tc := range []struct {
		opts Options
		want []string
	}{
		{Options{MaxRetries: 5}, []string{"safe-tools 已启用", "最多 5 次"}},
		{Options{MaxRetries: 0}, []string{"safe-tools 已启用", "模型重试: 关闭"}},
	} {
		text := strings.Join(capabilityHints(tc.opts), "")
		for _, want := range tc.want {
			if !strings.Contains(text, want) {
				t.Errorf("hints %q missing %q", text, want)
			}
		}
	}
}

func TestResumeCommandIncludesRetryLimit(t *testing.T) {
	t.Setenv("NEW_API_BASE_URL", "http://127.0.0.1:1")
	t.Setenv("NEW_API_KEY", "test-key")
	t.Setenv("NEW_API_MODEL", "test-model")
	for _, tc := range []struct {
		name       string
		maxRetries int
		want       []string
	}{
		{"enabled", 2, []string{"--max-retries=2", "./cmd/tool-filesystem"}},
		{"disabled", 0, []string{"./cmd/tool-filesystem"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			opts := fixtureOptions(t)
			opts.MaxRetries = tc.maxRetries
			var out bytes.Buffer
			if err := Run(context.Background(), opts, strings.NewReader(""), &out); err != nil {
				t.Fatal(err)
			}
			text := out.String()
			for _, want := range tc.want {
				if !strings.Contains(text, want) {
					t.Errorf("output missing %q: %s", want, text)
				}
			}
			if tc.maxRetries == 0 && strings.Contains(text, "--max-retries") {
				t.Errorf("disabled retries must not appear in resume command: %s", text)
			}
		})
	}
}

type retryModel struct {
	scriptedModel
	firstError error
	calls      int
}

func (m *retryModel) WithTools(_ []*schema.ToolInfo) (model.ToolCallingChatModel, error) {
	return m, nil
}

func (m *retryModel) Stream(ctx context.Context, input []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error) {
	m.calls++
	if m.calls == 1 {
		return nil, m.firstError
	}
	return m.scriptedModel.Stream(ctx, input, opts...)
}

func TestModelRetryRecoversRateLimit(t *testing.T) {
	for _, tc := range []struct {
		name        string
		err         error
		maxRetries  int
		wantCalls   int
		wantSuccess bool
	}{
		{"rate limited", errors.New("HTTP 429: too many requests"), 1, 2, true},
		{"unauthorized", errors.New("HTTP 401: unauthorized"), 1, 1, false},
		{"disabled", errors.New("HTTP 429: too many requests"), 0, 1, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			opts := fixtureOptions(t)
			opts.MaxRetries = tc.maxRetries
			m := &retryModel{scriptedModel: scriptedModel{replies: []*schema.Message{schema.AssistantMessage("重试后完成", nil)}}, firstError: tc.err}
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			var out bytes.Buffer
			err := runWithModel(ctx, m, opts, strings.NewReader("你好\n"), &out)
			if m.calls != tc.wantCalls {
				t.Fatalf("model calls = %d, want %d; error = %v", m.calls, tc.wantCalls, err)
			}
			if tc.wantSuccess {
				if err != nil {
					t.Fatal(err)
				}
				messages := savedMessages(t, opts)
				if len(messages) != 2 || messages[1].Content != "重试后完成" || !strings.Contains(out.String(), "assistant> 重试后完成") {
					t.Fatalf("turn incomplete: history = %+v; output = %s", messages, out.String())
				}
			} else {
				if !errors.Is(err, tc.err) {
					t.Fatalf("error = %v, want %v", err, tc.err)
				}
				if messages := savedMessages(t, opts); len(messages) != 1 || messages[0].Role != schema.User {
					t.Fatalf("failed turn persisted: %+v", messages)
				}
			}
		})
	}
}

func TestBannerShowsMiddlewareState(t *testing.T) {
	t.Setenv("NEW_API_BASE_URL", "http://127.0.0.1:1")
	t.Setenv("NEW_API_KEY", "test-key")
	t.Setenv("NEW_API_MODEL", "test-model")
	opts := fixtureOptions(t)
	opts.MaxRetries = DefaultMaxRetries
	var out bytes.Buffer
	if err := Run(context.Background(), opts, strings.NewReader(""), &out); err != nil {
		t.Fatal(err)
	}
	text := out.String()
	for _, want := range []string{"DeepAgent：工具、文件系统与 Middleware", "safe-tools 已启用", fmt.Sprintf("最多 %d 次", DefaultMaxRetries), "联网工具", "代码执行: 关闭"} {
		if !strings.Contains(text, want) {
			t.Errorf("banner missing %q: %s", want, text)
		}
	}
}
