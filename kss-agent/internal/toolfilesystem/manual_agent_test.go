package toolfilesystem

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	localbk "github.com/cloudwego/eino-ext/adk/backend/local"
	"github.com/cloudwego/eino/adk/filesystem"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/schema"
	"kss-agent/internal/mem"
)

func TestManualAgentRealToolsAndResume(t *testing.T) {
	opts := fixtureOptions(t)
	path := filepath.Join(opts.ProjectRoot, "manual.txt")
	m := &scriptedModel{replies: []*schema.Message{
		toolCall("write_file", map[string]any{"file_path": path, "content": "before"}),
		toolCall("edit_file", map[string]any{"file_path": path, "old_string": "before", "new_string": "after"}),
		toolCall("read_file", map[string]any{"file_path": path}),
		schema.AssistantMessage("完成手动工具调用", nil),
	}}
	var out bytes.Buffer
	if err := runManualWithModel(context.Background(), m, opts, strings.NewReader("写、修改并读取\n"), &out); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(path)
	if err != nil || string(data) != "after" {
		t.Fatalf("file=%q err=%v", data, err)
	}
	for _, want := range []string{"manual-tools", "[tool call] write_file", "[tool call] edit_file", "tool> read_file: after", "go run ./cmd/manual-tools --session"} {
		if !strings.Contains(out.String(), want) {
			t.Errorf("missing %q in %s", want, &out)
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
	if msgs := session.GetMessages(); len(msgs) != 8 || validateHistory(msgs) != nil {
		t.Fatalf("history=%+v", msgs)
	}
	resumed := &scriptedModel{replies: []*schema.Message{schema.AssistantMessage("记得", nil)}}
	if err := runManualWithModel(context.Background(), resumed, opts, strings.NewReader("刚才呢\n"), io.Discard); err != nil {
		t.Fatal(err)
	}
	if len(resumed.inputs) != 1 || len(resumed.inputs[0]) != 10 {
		t.Fatalf("resumed inputs=%+v", resumed.inputs)
	}
}

func TestManualToolRegistration(t *testing.T) {
	for _, allow := range []bool{false, true} {
		t.Run(map[bool]string{false: "off", true: "on"}[allow], func(t *testing.T) {
			opts := fixtureOptions(t)
			opts.AllowShell = allow
			m := &scriptedModel{replies: []*schema.Message{schema.AssistantMessage("ok", nil)}}
			if err := runManualWithModel(context.Background(), m, opts, strings.NewReader("hello\n"), io.Discard); err != nil {
				t.Fatal(err)
			}
			names := map[string]bool{}
			for _, info := range m.tools {
				names[info.Name] = true
			}
			for _, name := range []string{"ls", "read_file", "write_file", "edit_file", "glob", "grep", "calculate"} {
				if !names[name] {
					t.Errorf("missing %s", name)
				}
			}
			if names["execute"] != allow || names["write_todos"] || names["task"] {
				t.Fatalf("tools=%v", names)
			}
			want := 7
			if allow {
				want++
			}
			if len(names) != want {
				t.Fatalf("unexpected tools=%v", names)
			}
		})
	}
}

func TestManualFileToolAdapters(t *testing.T) {
	ctx := context.Background()
	root := t.TempDir()
	path := filepath.Join(root, "note.txt")
	if err := os.WriteFile(path, []byte("Eino tools\nsecond line\n"), 0600); err != nil {
		t.Fatal(err)
	}
	backend, err := localbk.NewBackend(ctx, &localbk.Config{})
	if err != nil {
		t.Fatal(err)
	}
	tools, err := newManualTools(ctx, backend, false)
	if err != nil {
		t.Fatal(err)
	}
	byName := map[string]tool.InvokableTool{}
	for _, item := range tools {
		info, err := item.Info(ctx)
		if err != nil {
			t.Fatal(err)
		}
		byName[info.Name] = item.(tool.InvokableTool)
	}
	for _, tc := range []struct {
		name string
		args any
		want string
	}{
		{"ls", map[string]any{"path": root}, "note.txt"},
		{"glob", map[string]any{"path": root, "pattern": "**/*.txt"}, "note.txt"},
		{"read_file", map[string]any{"file_path": path, "offset": 2, "limit": 1}, "second line"},
		{"grep", map[string]any{"path": root, "pattern": "Eino", "glob": "*.txt"}, "Eino tools"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if tc.name == "grep" {
				if _, err := exec.LookPath("rg"); err != nil {
					t.Skip("grep requires rg")
				}
			}
			args, _ := json.Marshal(tc.args)
			got, err := byName[tc.name].InvokableRun(ctx, string(args))
			if err != nil || !strings.Contains(got, tc.want) {
				t.Fatalf("output=%q err=%v", got, err)
			}
		})
	}
	args, _ := json.Marshal(map[string]any{"file_path": filepath.Join(root, "missing")})
	if _, err := byName["read_file"].InvokableRun(ctx, string(args)); err == nil {
		t.Fatal("expected backend read failure")
	}
}

type recordingShellBackend struct {
	manualBackend
	request *filesystem.ExecuteRequest
	stream  *schema.StreamReader[*filesystem.ExecuteResponse]
	err     error
}

func (b *recordingShellBackend) ExecuteStreaming(_ context.Context, req *filesystem.ExecuteRequest) (*schema.StreamReader[*filesystem.ExecuteResponse], error) {
	b.request = req
	return b.stream, b.err
}
func TestManualExecuteStreamsOutputAndExitCode(t *testing.T) {
	ctx := context.Background()
	local, err := localbk.NewBackend(ctx, &localbk.Config{})
	if err != nil {
		t.Fatal(err)
	}
	exitCode := 7
	backend := &recordingShellBackend{manualBackend: local, stream: schema.StreamReaderFromArray([]*filesystem.ExecuteResponse{
		{Output: "first chunk"}, {Output: "last chunk", ExitCode: &exitCode, Truncated: true},
	})}
	tools, err := newManualTools(ctx, backend, true)
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range tools {
		info, err := item.Info(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if info.Name != "execute" {
			continue
		}
		stream, err := item.(tool.StreamableTool).StreamableRun(ctx, `{"command":"fake-command"}`)
		if err != nil {
			t.Fatal(err)
		}
		defer stream.Close()
		var out strings.Builder
		for {
			chunk, err := stream.Recv()
			if err == io.EOF {
				break
			}
			if err != nil {
				t.Fatal(err)
			}
			out.WriteString(chunk)
		}
		if backend.request == nil || backend.request.Command != "fake-command" {
			t.Fatalf("request=%+v", backend.request)
		}
		for _, want := range []string{"first chunk", "last chunk", "[exit code: 7]", "[output truncated]"} {
			if !strings.Contains(out.String(), want) {
				t.Fatalf("missing %q in %q", want, out.String())
			}
		}
		return
	}
	t.Fatal("execute tool missing")
}

func runManualWithModel(ctx context.Context, chatModel model.BaseChatModel, opts Options, input io.Reader, output io.Writer) error {
	return runConsole(ctx, chatModel, opts, input, output, newManualAgent, "manual-tools")
}

func TestManualEntryHasNoWebTools(t *testing.T) {
	opts := fixtureOptions(t)
	m := &scriptedModel{replies: []*schema.Message{schema.AssistantMessage("ok", nil)}}
	var out bytes.Buffer
	if err := runManualWithModel(context.Background(), m, opts, strings.NewReader("你好\n"), &out); err != nil {
		t.Fatal(err)
	}
	for _, line := range []string{"联网工具", "代码执行", "--allow-code"} {
		if strings.Contains(out.String(), line) {
			t.Fatalf("manual entry must not advertise %q:\n%s", line, out.String())
		}
	}
	names := toolNames(t, m)
	if !names["calculate"] {
		t.Fatalf("manual entry must register the calculator: %v", names)
	}
	for _, info := range m.tools {
		if info.Name == "web_fetch" || info.Name == "web_search" || info.Name == "run_code" {
			t.Fatalf("manual entry must not register %s", info.Name)
		}
	}
}
