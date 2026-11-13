package newchatmodelagent

import (
	"bytes"
	"context"
	"errors"
	"io"
	"strings"
	"testing"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

// Only the external model is replaced; tests execute the real Agent and Runner.
type recordingModel struct {
	inputs    [][]*schema.Message
	streamErr error
}

func (m *recordingModel) Generate(context.Context, []*schema.Message, ...model.Option) (*schema.Message, error) {
	return nil, errors.New("expected streaming model call")
}

func (m *recordingModel) Stream(_ context.Context, input []*schema.Message, _ ...model.Option) (*schema.StreamReader[*schema.Message], error) {
	m.inputs = append(m.inputs, append([]*schema.Message(nil), input...))
	if m.streamErr != nil {
		return nil, m.streamErr
	}
	return schema.StreamReaderFromArray([]*schema.Message{
		{Role: schema.Assistant, Content: "你好"},
		{Content: "，Eino"},
	}), nil
}

func TestConsoleKeepsCompleteHistory(t *testing.T) {
	m := &recordingModel{}
	var out bytes.Buffer
	err := runWithModel(context.Background(), m, "学习助手", strings.NewReader("  第一问  \n第二问\n\n忽略\n"), &out)
	if err != nil {
		t.Fatal(err)
	}
	if len(m.inputs) != 2 {
		t.Fatalf("model calls = %d, want 2", len(m.inputs))
	}
	wantRoles := []schema.RoleType{schema.System, schema.User, schema.Assistant, schema.User}
	wantContent := []string{"学习助手", "第一问", "你好，Eino", "第二问"}
	if len(m.inputs[1]) != len(wantRoles) {
		t.Fatalf("second input = %+v", m.inputs[1])
	}
	for i, msg := range m.inputs[1] {
		if msg.Role != wantRoles[i] || msg.Content != wantContent[i] {
			t.Errorf("message %d = %+v", i, msg)
		}
	}
	if strings.Count(out.String(), "你好，Eino") != 2 {
		t.Fatalf("output duplicated or missing chunks: %q", out.String())
	}
}

func TestConsoleEmptyInputAndEOF(t *testing.T) {
	for _, input := range []string{"", " \nignored", "question"} {
		t.Run(input, func(t *testing.T) {
			m := &recordingModel{}
			if err := runWithModel(context.Background(), m, "system", strings.NewReader(input), io.Discard); err != nil {
				t.Fatal(err)
			}
			want := 0
			if input == "question" {
				want = 1
			}
			if len(m.inputs) != want {
				t.Fatalf("model calls = %d, want %d", len(m.inputs), want)
			}
		})
	}
}

type brokenIO struct{ err error }

func (b brokenIO) Read([]byte) (int, error)  { return 0, b.err }
func (b brokenIO) Write([]byte) (int, error) { return 0, b.err }

func TestConsolePropagatesErrors(t *testing.T) {
	sentinel := errors.New("failed operation")
	for _, tc := range []struct {
		name     string
		input    io.Reader
		output   io.Writer
		modelErr error
	}{
		{"read", brokenIO{sentinel}, io.Discard, nil},
		{"write", strings.NewReader("question\n"), brokenIO{sentinel}, nil},
		{"model", strings.NewReader("question\n"), io.Discard, sentinel},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := runWithModel(context.Background(), &recordingModel{streamErr: tc.modelErr}, "system", tc.input, tc.output)
			if !errors.Is(err, sentinel) {
				t.Fatalf("error = %v, want %v", err, sentinel)
			}
		})
	}
}

func TestPrintMessageHandlesCompleteMessage(t *testing.T) {
	var out bytes.Buffer
	msg, err := printMessage(&out, &adk.MessageVariant{Message: schema.AssistantMessage("完整回复", nil)})
	if err != nil {
		t.Fatal(err)
	}
	if msg.Content != "完整回复" || out.String() != "完整回复" {
		t.Fatalf("message = %+v, output = %q", msg, out.String())
	}
}

func TestPrintMessagePropagatesStreamAndWriterErrors(t *testing.T) {
	sentinel := errors.New("stream failed")
	reader, writer := schema.Pipe[*schema.Message](2)
	writer.Send(schema.AssistantMessage("部分", nil), nil)
	writer.Send(nil, sentinel)
	writer.Close()
	var out bytes.Buffer
	_, err := printMessage(&out, &adk.MessageVariant{IsStreaming: true, MessageStream: reader})
	if !errors.Is(err, sentinel) || out.String() != "部分" {
		t.Fatalf("output = %q, error = %v", out.String(), err)
	}

	stream := schema.StreamReaderFromArray([]*schema.Message{schema.AssistantMessage("reply", nil)})
	_, err = printMessage(brokenIO{sentinel}, &adk.MessageVariant{IsStreaming: true, MessageStream: stream})
	if !errors.Is(err, sentinel) {
		t.Fatalf("write error = %v", err)
	}
}
