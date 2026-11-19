package newchatmodelagent

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"

	"kss-agent/internal/agentconsole"
	"kss-agent/internal/shared"
)

func Run(ctx context.Context, systemPrompt string, input io.Reader, output io.Writer) error {
	cfg, err := shared.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	chatModel, err := shared.NewChatModel(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create openai-compatible chat model: %w", err)
	}
	return runWithModel(ctx, chatModel, systemPrompt, input, output)
}

func runWithModel(ctx context.Context, chatModel model.BaseChatModel, systemPrompt string, input io.Reader, output io.Writer) error {
	agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
		Name:        "Ch02ChatModelAgent",
		Description: "A console assistant with in-memory conversation history.",
		Instruction: systemPrompt,
		Model:       chatModel,
	})
	if err != nil {
		return fmt.Errorf("create agent: %w", err)
	}
	runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent, EnableStreaming: true})

	history := make([]*schema.Message, 0, 16)
	scanner := bufio.NewScanner(input)
	scanner.Buffer(make([]byte, 4096), 1024*1024)
	if _, err := fmt.Fprintln(output, "第二章：多轮对话（空行或 Ctrl+D 退出）"); err != nil {
		return err
	}
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		if _, err := fmt.Fprint(output, "you> "); err != nil {
			return err
		}
		if !scanner.Scan() {
			if err := scanner.Err(); err != nil {
				return fmt.Errorf("read input: %w", err)
			}
			return nil
		}
		question := strings.TrimSpace(scanner.Text())
		if question == "" {
			return nil
		}

		history = append(history, schema.UserMessage(question))
		messages, err := agentconsole.RunTurn(ctx, runner, history, output)
		if err != nil {
			return fmt.Errorf("run agent: %w", err)
		}
		history = append(history, messages...)
	}
}
