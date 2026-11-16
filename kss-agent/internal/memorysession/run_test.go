package memorysession

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
	"kss-agent/internal/mem"
)

type recordingModel struct {
	inputs       [][]*schema.Message
	err          error
	duringStream func()
}

func (m *recordingModel) Generate(context.Context, []*schema.Message, ...model.Option) (*schema.Message, error) {
	return nil, errors.New("expected streaming")
}
func (m *recordingModel) Stream(_ context.Context, messages []*schema.Message, _ ...model.Option) (*schema.StreamReader[*schema.Message], error) {
	m.inputs = append(m.inputs, append([]*schema.Message(nil), messages...))
	if m.duringStream != nil {
		m.duringStream()
	}
	if m.err != nil {
		reader, writer := schema.Pipe[*schema.Message](2)
		writer.Send(schema.AssistantMessage("未完成", nil), nil)
		writer.Send(nil, m.err)
		writer.Close()
		return reader, nil
	}
	return schema.StreamReaderFromArray([]*schema.Message{schema.AssistantMessage("你好，", nil), {Content: "小曹"}}), nil
}
func restore(t *testing.T, dir, id string) *mem.Session {
	t.Helper()
	store, err := mem.NewStore(dir)
	if err != nil {
		t.Fatal(err)
	}
	session, err := store.GetOrCreate(id)
	if err != nil {
		t.Fatal(err)
	}
	return session
}

func TestResumePassesPersistedHistoryToRunner(t *testing.T) {
	opts := Options{SessionID: "learn", SessionDir: t.TempDir(), Instruction: "中文助手"}
	first := &recordingModel{}
	var out bytes.Buffer
	if err := runWithModel(context.Background(), first, opts, strings.NewReader("我叫小曹\n\n"), &out); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out.String(), "你好，小曹") || !strings.Contains(out.String(), "--session learn") {
		t.Fatalf("missing response/resume hint: %s", out.String())
	}
	second := &recordingModel{}
	if err := runWithModel(context.Background(), second, opts, strings.NewReader("我叫什么？\n"), io.Discard); err != nil {
		t.Fatal(err)
	}
	if len(second.inputs) != 1 || len(second.inputs[0]) != 4 {
		t.Fatalf("restored model inputs = %+v", second.inputs)
	}
	want := []string{"中文助手", "我叫小曹", "你好，小曹", "我叫什么？"}
	for i, msg := range second.inputs[0] {
		if msg.Content != want[i] {
			t.Errorf("message %d = %q, want %q", i, msg.Content, want[i])
		}
	}
	if got := restore(t, opts.SessionDir, opts.SessionID).GetMessages(); len(got) != 4 {
		t.Fatalf("persisted messages = %d", len(got))
	}
}

func TestModelFailurePersistsUserButNotPartialAssistant(t *testing.T) {
	opts := Options{SessionID: "failure", SessionDir: t.TempDir(), Instruction: "system"}
	sentinel := errors.New("stream interrupted")
	m := &recordingModel{err: sentinel}
	var out bytes.Buffer
	err := runWithModel(context.Background(), m, opts, strings.NewReader("保存这个问题\n"), &out)
	if !errors.Is(err, sentinel) {
		t.Fatalf("error = %v", err)
	}
	if !strings.Contains(out.String(), "未完成") {
		t.Fatal("streamed output missing")
	}
	got := restore(t, opts.SessionDir, opts.SessionID).GetMessages()
	if len(got) != 1 || got[0].Role != schema.User || got[0].Content != "保存这个问题" {
		t.Fatalf("saved partial assistant: %+v", got)
	}
}

func TestPersistenceFailuresStopTheTurn(t *testing.T) {
	for _, phase := range []string{"user", "assistant"} {
		t.Run(phase, func(t *testing.T) {
			opts := Options{SessionID: "failure", SessionDir: t.TempDir(), Instruction: "system"}
			m := &recordingModel{}
			failFile := func() {
				path := filepath.Join(opts.SessionDir, "failure.jsonl")
				if err := os.Remove(path); err != nil {
					t.Fatal(err)
				}
				if err := os.Mkdir(path, 0700); err != nil {
					t.Fatal(err)
				}
			}
			var input io.Reader = strings.NewReader("question\n")
			if phase == "user" {
				input = &beforeRead{reader: input, fn: failFile}
			} else {
				m.duringStream = failFile
			}
			err := runWithModel(context.Background(), m, opts, input, io.Discard)
			if err == nil {
				t.Fatal("ignored persistence failure")
			}
			if phase == "user" && len(m.inputs) != 0 {
				t.Fatal("called model before successful user save")
			}
		})
	}
}

type beforeRead struct {
	reader io.Reader
	fn     func()
}

func (r *beforeRead) Read(p []byte) (int, error) {
	if r.fn != nil {
		r.fn()
		r.fn = nil
	}
	return r.reader.Read(p)
}

type failingIO struct{ err error }

func (f failingIO) Read([]byte) (int, error)  { return 0, f.err }
func (f failingIO) Write([]byte) (int, error) { return 0, f.err }

func TestEmptyInputAndIOErrors(t *testing.T) {
	sentinel := errors.New("io failed")
	for _, tc := range []struct {
		name    string
		input   io.Reader
		output  io.Writer
		wantErr bool
	}{
		{"EOF", strings.NewReader(""), io.Discard, false},
		{"blank", strings.NewReader("  \nignored"), io.Discard, false},
		{"read", failingIO{sentinel}, io.Discard, true},
		{"write", strings.NewReader("q\n"), failingIO{sentinel}, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			opts := Options{SessionID: "test", SessionDir: t.TempDir(), Instruction: "system"}
			m := &recordingModel{}
			err := runWithModel(context.Background(), m, opts, tc.input, tc.output)
			if tc.wantErr {
				if !errors.Is(err, sentinel) {
					t.Fatalf("error = %v", err)
				}
			} else if err != nil {
				t.Fatal(err)
			}
			if len(m.inputs) != 0 {
				t.Fatal("unexpected model request")
			}
		})
	}
}
