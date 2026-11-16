package agentconsole

import (
	"bytes"
	"errors"
	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/schema"
	"testing"
)

type brokenIO struct{ err error }

func (b brokenIO) Write([]byte) (int, error) { return 0, b.err }

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
