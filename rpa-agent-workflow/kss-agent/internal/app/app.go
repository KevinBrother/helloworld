package app

import (
	"context"
	"fmt"
	"strings"

	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"

	"kss-agent/internal/config"
)

const (
	systemPrompt = "you are a helpful assistant."
	userPrompt   = "what does the future AI App look like?"
)

func Run(ctx context.Context) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	chatModel, err := newChatModel(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create openai-compatible chat model: %w", err)
	}

	message, err := generate(ctx, chatModel)
	if err != nil {
		return modelError(cfg, err)
	}

	fmt.Println(message.Content)
	return nil
}

func newChatModel(ctx context.Context, cfg *config.Config) (model.ToolCallingChatModel, error) {
	return openai.NewChatModel(ctx, &openai.ChatModelConfig{
		BaseURL: cfg.BaseURL,
		APIKey:  cfg.APIKey,
		Model:   cfg.Model,
	})
}

func modelError(cfg *config.Config, err error) error {
	msg := err.Error()
	if strings.Contains(msg, "invalid character '<'") || strings.Contains(msg, "looking for beginning of value") {
		return fmt.Errorf(
			"generate response: upstream returned non-JSON data; check NEW_API_BASE_URL=%q points to an OpenAI-compatible API base URL: %w",
			cfg.BaseURL,
			err,
		)
	}

	return fmt.Errorf("generate response: %w", err)
}

func generate(ctx context.Context, chatModel model.ToolCallingChatModel) (*schema.Message, error) {
	return chatModel.Generate(ctx, []*schema.Message{
		schema.SystemMessage(systemPrompt),
		schema.UserMessage(userPrompt),
	})
}
