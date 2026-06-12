package newchatmodel

import (
	"context"
	"testing"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

type recordingChatModel struct {
	lastInput []*schema.Message
}

var _ model.ToolCallingChatModel = (*recordingChatModel)(nil)

func (m *recordingChatModel) Generate(_ context.Context, input []*schema.Message, _ ...model.Option) (*schema.Message, error) {
	m.lastInput = append([]*schema.Message(nil), input...)
	return schema.AssistantMessage("ok", nil), nil
}

func (m *recordingChatModel) Stream(context.Context, []*schema.Message, ...model.Option) (*schema.StreamReader[*schema.Message], error) {
	return nil, nil
}

func (m *recordingChatModel) WithTools([]*schema.ToolInfo) (model.ToolCallingChatModel, error) {
	return m, nil
}

func TestGenerateUsesSystemAndUserPrompts(t *testing.T) {
	model := &recordingChatModel{}

	msg, err := generate(context.Background(), model)
	if err != nil {
		t.Fatalf("generate() error = %v", err)
	}

	if msg == nil {
		t.Fatal("generate() returned nil message")
	}
	if got, want := msg.Content, "ok"; got != want {
		t.Fatalf("message.Content = %q, want %q", got, want)
	}
	if len(model.lastInput) != 2 {
		t.Fatalf("input length = %d, want 2", len(model.lastInput))
	}
	if got, want := model.lastInput[0].Content, "you are a helpful assistant. 用中文回答"; got != want {
		t.Fatalf("system prompt = %q, want %q", got, want)
	}
	if got, want := model.lastInput[1].Content, "what does the future AI App look like?"; got != want {
		t.Fatalf("user prompt = %q, want %q", got, want)
	}
}
