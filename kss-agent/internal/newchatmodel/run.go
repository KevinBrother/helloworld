package newchatmodel

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"

	"kss-agent/internal/shared"
)

func Run(ctx context.Context) error {
	cfg, err := shared.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	chatModel, err := shared.NewChatModel(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create openai-compatible chat model: %w", err)
	}

	message, err := generate(ctx, chatModel)
	if err != nil {
		return shared.ModelError(err)
	}

	fmt.Println(message.Content)
	return nil
}

func generate(ctx context.Context, chatModel model.BaseChatModel) (*schema.Message, error) {
	return chatModel.Generate(ctx, []*schema.Message{
		schema.SystemMessage(shared.SystemPrompt),
		schema.UserMessage(shared.UserPrompt),
	})
}
