package newchatmodelagent

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"

	"kss-agent/internal/shared"
)

func Run(ctx context.Context, systemPrompt, userPrompt string) error {
	cfg, err := shared.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	chatModel, err := shared.NewChatModel(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create openai-compatible chat model: %w", err)
	}

	message, err := runWithModel(ctx, chatModel, systemPrompt, userPrompt)
	if err != nil {
		return shared.ModelError(err)
	}

	fmt.Println(message.Content)
	return nil
}

func runWithModel(ctx context.Context, chatModel model.BaseChatModel, systemPrompt, userPrompt string) (*schema.Message, error) {
	agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
		Name:        "NewChatModelAgent",
		Description: "A chat model agent sample",
		Instruction: systemPrompt,
		Model:       chatModel,
	})
	if err != nil {
		return nil, err
	}

	iterator := agent.Run(ctx, &adk.AgentInput{
		Messages: []adk.Message{
			schema.UserMessage(userPrompt),
		},
	})

	var final *schema.Message
	for {
		event, ok := iterator.Next()
		if !ok {
			break
		}
		if event == nil {
			continue
		}
		if event.Err != nil {
			return nil, event.Err
		}
		if event.Output == nil || event.Output.MessageOutput == nil {
			continue
		}
		final = event.Output.MessageOutput.Message
	}

	if final == nil {
		return nil, fmt.Errorf("agent returned no message output")
	}

	return final, nil
}
