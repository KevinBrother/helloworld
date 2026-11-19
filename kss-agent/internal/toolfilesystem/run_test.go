package toolfilesystem

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
	"kss-agent/internal/mem"
	"kss-agent/internal/webtool"
)

// Only replace the external LLM: real DeepAgent, Runner, Backend and Store execute.
type scriptedModel struct {
	replies []*schema.Message
	inputs  [][]*schema.Message
	tools   []*schema.ToolInfo
	err     error
}

func (m *scriptedModel) WithTools(tools []*schema.ToolInfo) (model.ToolCallingChatModel, error) {
	m.tools = tools
	return m, nil
}
func (m *scriptedModel) Generate(context.Context, []*schema.Message, ...model.Option) (*schema.Message, error) {
	return nil, errors.New("expected streaming")
}
func (m *scriptedModel) Stream(_ context.Context, input []*schema.Message, opts ...model.Option) (*schema.StreamReader[*schema.Message], error) {
	m.inputs = append(m.inputs, append([]*schema.Message(nil), input...))
	if tools := model.GetCommonOptions(nil, opts...).Tools; len(tools) > 0 {
		m.tools = tools
	}
	if m.err != nil {
		return nil, m.err
	}
	if len(m.replies) == 0 {
		return nil, errors.New("unexpected extra model call")
	}
	reply := m.replies[0]
	m.replies = m.replies[1:]
	// Simulate an OpenAI-style fragmented JSON argument stream.
	if len(reply.ToolCalls) > 0 {
		call := reply.ToolCalls[0]
		idx := 0
		call.Index = &idx
		rest := call.Function.Arguments[len(call.Function.Arguments)/2:]
		call.Function.Arguments = call.Function.Arguments[:len(call.Function.Arguments)/2]
		return schema.StreamReaderFromArray([]*schema.Message{
			{Role: schema.Assistant, Content: reply.Content, ToolCalls: []schema.ToolCall{call}},
			{ToolCalls: []schema.ToolCall{{Index: &idx, Function: schema.FunctionCall{Arguments: rest}}}},
		}), nil
	}
	return schema.StreamReaderFromArray([]*schema.Message{reply}), nil
}
func toolCall(name string, args any) *schema.Message {
	data, _ := json.Marshal(args)
	return schema.AssistantMessage("我来操作文件。", []schema.ToolCall{{ID: "call-1", Type: "function", Function: schema.FunctionCall{Name: name, Arguments: string(data)}}})
}
func fixtureOptions(t *testing.T) Options {
	t.Helper()
	return Options{ProjectRoot: t.TempDir(), SessionDir: t.TempDir(), SessionID: "test-session"}
}
func TestReadToolDisplaysAndPersistsCompleteProtocol(t *testing.T) {
	opts := fixtureOptions(t)
	path := filepath.Join(opts.ProjectRoot, "hello.txt")
	if err := os.WriteFile(path, []byte("hello from disk\n"), 0600); err != nil {
		t.Fatal(err)
	}
	m := &scriptedModel{replies: []*schema.Message{toolCall("read_file", map[string]any{"file_path": path}), schema.AssistantMessage("读完了", nil)}}
	var out bytes.Buffer
	if err := runWithModel(context.Background(), m, opts, strings.NewReader("读取 hello.txt\n\n"), &out); err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"[tool call] read_file", path, "call-1", "tool> read_file:", "hello from disk", "assistant> 读完了"} {
		if !strings.Contains(out.String(), want) {
			t.Errorf("missing %q in %q", want, out.String())
		}
	}
	if count := strings.Count(out.String(), "[tool call] read_file"); count != 1 {
		t.Fatalf("tool arguments displayed %d times, want once", count)
	}
	store, err := mem.NewStore(opts.SessionDir)
	if err != nil {
		t.Fatal(err)
	}
	session, err := store.GetOrCreate(opts.SessionID)
	if err != nil {
		t.Fatal(err)
	}
	msgs := session.GetMessages()
	if len(msgs) != 4 {
		t.Fatalf("history = %+v", msgs)
	}
	if msgs[1].Role != schema.Assistant || len(msgs[1].ToolCalls) != 1 || msgs[2].Role != schema.Tool || msgs[2].ToolCallID != "call-1" || !strings.Contains(msgs[2].Content, "hello from disk") || msgs[3].Content != "读完了" {
		t.Fatalf("incomplete protocol: %+v", msgs)
	}
	var args map[string]any
	if err := json.Unmarshal([]byte(msgs[1].ToolCalls[0].Function.Arguments), &args); err != nil || args["file_path"] != path {
		t.Fatalf("arguments = %+v, %v", args, err)
	}
	resumed := &scriptedModel{replies: []*schema.Message{schema.AssistantMessage("记得", nil)}}
	if err := runWithModel(context.Background(), resumed, opts, strings.NewReader("刚才读了什么\n"), io.Discard); err != nil {
		t.Fatal(err)
	}
	if len(resumed.inputs) != 1 || len(resumed.inputs[0]) != 6 || resumed.inputs[0][3].ToolCallID != "call-1" {
		t.Fatalf("resumed history = %+v", resumed.inputs)
	}
}
func TestWriteToolHasRealFileSideEffect(t *testing.T) {
	opts := fixtureOptions(t)
	path := filepath.Join(opts.ProjectRoot, "created.txt")
	m := &scriptedModel{replies: []*schema.Message{toolCall("write_file", map[string]any{"file_path": path, "content": "created by tool"}), schema.AssistantMessage("已写入", nil)}}
	if err := runWithModel(context.Background(), m, opts, strings.NewReader("写文件\n"), io.Discard); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(path)
	if err != nil || string(data) != "created by tool" {
		t.Fatalf("disk = %q, error = %v", data, err)
	}
}
func TestShellIsOptInAndInstructionKeepsAbsoluteRoot(t *testing.T) {
	for _, allow := range []bool{false, true} {
		t.Run(map[bool]string{false: "disabled", true: "enabled"}[allow], func(t *testing.T) {
			opts := fixtureOptions(t)
			opts.AllowShell = allow
			opts.Instruction = "自定义学习助手"
			m := &scriptedModel{replies: []*schema.Message{schema.AssistantMessage("ok", nil)}}
			if err := runWithModel(context.Background(), m, opts, strings.NewReader("你好\n"), io.Discard); err != nil {
				t.Fatal(err)
			}
			names := map[string]bool{}
			for _, tool := range m.tools {
				names[tool.Name] = true
			}
			for _, name := range []string{"ls", "read_file", "write_file", "edit_file", "glob", "grep", "write_todos", "web_fetch"} {
				if !names[name] {
					t.Errorf("missing tool %s", name)
				}
			}
			if names["execute"] != allow || names["task"] {
				t.Fatalf("tools=%v", names)
			}
			system := m.inputs[0][0].Content
			if !strings.Contains(system, "自定义学习助手") || !strings.Contains(system, opts.ProjectRoot) {
				t.Fatalf("instruction = %q", system)
			}
		})
	}
}

type brokenIO struct{ err error }

func (b brokenIO) Read([]byte) (int, error)  { return 0, b.err }
func (b brokenIO) Write([]byte) (int, error) { return 0, b.err }
func TestConsoleErrorsAndEmptyInput(t *testing.T) {
	sentinel := errors.New("failed operation")
	for _, tc := range []struct {
		name     string
		input    io.Reader
		output   io.Writer
		modelErr error
		want     error
	}{
		{"empty", strings.NewReader(" \nignored"), io.Discard, nil, nil},
		{"eof", strings.NewReader(""), io.Discard, nil, nil},
		{"input", brokenIO{sentinel}, io.Discard, nil, sentinel},
		{"output", strings.NewReader("q\n"), brokenIO{sentinel}, nil, sentinel},
		{"model", strings.NewReader("q\n"), io.Discard, sentinel, sentinel},
	} {
		t.Run(tc.name, func(t *testing.T) {
			opts := fixtureOptions(t)
			m := &scriptedModel{err: tc.modelErr}
			err := runWithModel(context.Background(), m, opts, tc.input, tc.output)
			if !errors.Is(err, tc.want) {
				t.Fatalf("error=%v, want %v", err, tc.want)
			}
			if tc.name == "empty" || tc.name == "eof" {
				if len(m.inputs) != 0 {
					t.Fatal("called model on empty input")
				}
			}
		})
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := runWithModel(ctx, &scriptedModel{}, fixtureOptions(t), strings.NewReader("q\n"), io.Discard); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancel error=%v", err)
	}
}
func TestInvalidRootFailsBeforeSessionCreation(t *testing.T) {
	for _, file := range []bool{false, true} {
		t.Run(map[bool]string{false: "missing", true: "file"}[file], func(t *testing.T) {
			root := filepath.Join(t.TempDir(), "not-dir")
			if file {
				if err := os.WriteFile(root, nil, 0600); err != nil {
					t.Fatal(err)
				}
			}
			dir := filepath.Join(t.TempDir(), "not-created")
			m := &scriptedModel{}
			err := runWithModel(context.Background(), m, Options{ProjectRoot: root, SessionDir: dir}, strings.NewReader("q\n"), io.Discard)
			if err == nil {
				t.Fatal("expected invalid root error")
			}
			if _, err := os.Stat(dir); !os.IsNotExist(err) {
				t.Fatalf("created session directory: %v", err)
			}
			if len(m.inputs) != 0 {
				t.Fatal("model called")
			}
		})
	}
}
func TestFailedToolTurnDoesNotPersistBrokenProtocol(t *testing.T) {
	opts := fixtureOptions(t)
	m := &scriptedModel{replies: []*schema.Message{toolCall("read_file", map[string]any{"file_path": filepath.Join(opts.ProjectRoot, "missing.txt")})}}
	if err := runWithModel(context.Background(), m, opts, strings.NewReader("read missing\n"), io.Discard); err == nil {
		t.Fatal("expected tool error")
	}
	store, err := mem.NewStore(opts.SessionDir)
	if err != nil {
		t.Fatal(err)
	}
	s, err := store.GetOrCreate(opts.SessionID)
	if err != nil {
		t.Fatal(err)
	}
	if msgs := s.GetMessages(); len(msgs) != 1 || msgs[0].Role != schema.User {
		t.Fatalf("partial protocol persisted: %+v", msgs)
	}
}
func TestHistoryValidation(t *testing.T) {
	call := toolCall("read_file", map[string]any{"file_path": "/tmp/example"})
	result := schema.ToolMessage("ok", "call-1", schema.WithToolName("read_file"))
	for _, tc := range []struct {
		name  string
		msgs  []*schema.Message
		valid bool
	}{
		{"empty", nil, true},
		{"complete", []*schema.Message{call, result, schema.AssistantMessage("ok", nil)}, true},
		{"incomplete", []*schema.Message{call}, false},
		{"orphan", []*schema.Message{result}, false},
		{"duplicate result", []*schema.Message{call, result, result}, false},
		{"interrupted", []*schema.Message{call, schema.UserMessage("continue")}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if err := validateHistory(tc.msgs); (err == nil) != tc.valid {
				t.Fatalf("error=%v, valid=%v", err, tc.valid)
			}
		})
	}
}
func TestIncompleteSavedToolHistoryRejectedBeforeModelCall(t *testing.T) {
	opts := fixtureOptions(t)
	store, err := mem.NewStore(opts.SessionDir)
	if err != nil {
		t.Fatal(err)
	}
	s, err := store.GetOrCreate(opts.SessionID)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Append(toolCall("read_file", map[string]any{"file_path": "/tmp/example"})); err != nil {
		t.Fatal(err)
	}
	m := &scriptedModel{}
	if err := runWithModel(context.Background(), m, opts, strings.NewReader("continue\n"), io.Discard); err == nil {
		t.Fatal("expected history error")
	}
	if len(m.inputs) != 0 {
		t.Fatal("sent incomplete history to model")
	}
}
func TestMultipleTurnsRetainToolMessages(t *testing.T) {
	opts := fixtureOptions(t)
	path := filepath.Join(opts.ProjectRoot, "hello.txt")
	if err := os.WriteFile(path, []byte("hello"), 0600); err != nil {
		t.Fatal(err)
	}
	m := &scriptedModel{replies: []*schema.Message{toolCall("read_file", map[string]any{"file_path": path}), schema.AssistantMessage("read", nil), schema.AssistantMessage("remember", nil)}}
	if err := runWithModel(context.Background(), m, opts, strings.NewReader("read\nremember\n\n"), io.Discard); err != nil {
		t.Fatal(err)
	}
	if len(m.inputs) != 3 || len(m.inputs[2]) != 6 || m.inputs[2][3].ToolCallID != "call-1" {
		t.Fatalf("history=%+v", m.inputs)
	}
}

// DeepAgent tests deliberately bind the DeepAgent constructor, just like its CLI.
func runWithModel(ctx context.Context, chatModel model.BaseChatModel, opts Options, input io.Reader, output io.Writer) error {
	return runConsole(ctx, chatModel, opts, input, output, newAgent, "tool-filesystem")
}

type fakeWebSearcher struct {
	result webtool.SearchResult
	err    error
	calls  int
}

func (f *fakeWebSearcher) Search(context.Context, string) (webtool.SearchResult, error) {
	f.calls++
	return f.result, f.err
}

func toolNames(t *testing.T, m *scriptedModel) map[string]bool {
	t.Helper()
	names := map[string]bool{}
	for _, info := range m.tools {
		names[info.Name] = true
	}
	return names
}

func TestWebSearchToolRegistrationFollowsSearcher(t *testing.T) {
	for _, tc := range []struct {
		name     string
		searcher webtool.Searcher
	}{
		{"with hosted search", &fakeWebSearcher{}},
		{"without hosted search", nil},
	} {
		t.Run(tc.name, func(t *testing.T) {
			opts := fixtureOptions(t)
			opts.Searcher = tc.searcher
			m := &scriptedModel{replies: []*schema.Message{schema.AssistantMessage("ok", nil)}}
			if err := runWithModel(context.Background(), m, opts, strings.NewReader("你好\n"), io.Discard); err != nil {
				t.Fatal(err)
			}
			names := toolNames(t, m)
			if !names["web_fetch"] {
				t.Fatalf("web_fetch missing: %v", names)
			}
			wantSearch := tc.searcher != nil
			if names["web_search"] != wantSearch {
				t.Fatalf("web_search registered=%v, want %v (tools=%v)", names["web_search"], wantSearch, names)
			}
		})
	}
}

func TestWebSearchToolEndToEnd(t *testing.T) {
	opts := fixtureOptions(t)
	searcher := &fakeWebSearcher{result: webtool.SearchResult{
		Answer:  "Go 1.27.4 is current.",
		Sources: []webtool.Source{{Title: "Go", URL: "https://go.dev"}},
	}}
	opts.Searcher = searcher
	m := &scriptedModel{replies: []*schema.Message{
		toolCall("web_search", map[string]any{"query": "latest go release"}),
		schema.AssistantMessage("最新版本是 1.27.4", nil),
	}}
	var out bytes.Buffer
	if err := runWithModel(context.Background(), m, opts, strings.NewReader("查一下 Go 最新版本\n\n"), &out); err != nil {
		t.Fatal(err)
	}
	if searcher.calls != 1 {
		t.Fatalf("searcher calls = %d, want 1", searcher.calls)
	}
	for _, want := range []string{
		"联网工具",
		"web_search",
		"Go 1.27.4 is current.",
		"https://go.dev",
		"[tool call] web_search",
		"tool> web_search:",
		"assistant> 最新版本是 1.27.4",
	} {
		if !strings.Contains(out.String(), want) {
			t.Errorf("output missing %q:\n%s", want, out.String())
		}
	}
	store, err := mem.NewStore(opts.SessionDir)
	if err != nil {
		t.Fatal(err)
	}
	session, err := store.GetOrCreate(opts.SessionID)
	if err != nil {
		t.Fatal(err)
	}
	msgs := session.GetMessages()
	if len(msgs) != 4 {
		t.Fatalf("history = %+v", msgs)
	}
	if msgs[1].Role != schema.Assistant || len(msgs[1].ToolCalls) != 1 || msgs[1].ToolCalls[0].Function.Name != "web_search" {
		t.Fatalf("assistant tool call: %+v", msgs[1])
	}
	if msgs[2].Role != schema.Tool || msgs[2].ToolCallID != "call-1" || !strings.Contains(msgs[2].Content, "https://go.dev") {
		t.Fatalf("tool result: %+v", msgs[2])
	}
	if msgs[3].Content != "最新版本是 1.27.4" {
		t.Fatalf("final answer: %+v", msgs[3])
	}
}
