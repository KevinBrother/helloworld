package newchatmodelagent

import (
	"context"
	"testing"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"
)

type agentRecordingModel struct {
	lastInput []*schema.Message
}

var _ model.ToolCallingChatModel = (*agentRecordingModel)(nil)

func (m *agentRecordingModel) Generate(_ context.Context, input []*schema.Message, _ ...model.Option) (*schema.Message, error) {
	m.lastInput = append([]*schema.Message(nil), input...)
	return schema.AssistantMessage("agent ok", nil), nil
}

func (m *agentRecordingModel) Stream(context.Context, []*schema.Message, ...model.Option) (*schema.StreamReader[*schema.Message], error) {
	return nil, nil
}

func (m *agentRecordingModel) WithTools([]*schema.ToolInfo) (model.ToolCallingChatModel, error) {
	return m, nil
}

func TestRunUsesADKChatModelAgent(t *testing.T) {
	model := &agentRecordingModel{}

	msg, err := runWithModel(context.Background(), model)
	if err != nil {
		t.Fatalf("runWithModel() error = %v", err)
	}

	if msg == nil {
		t.Fatal("runWithModel() returned nil message")
	}
	if got, want := msg.Content, "agent ok"; got != want {
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
