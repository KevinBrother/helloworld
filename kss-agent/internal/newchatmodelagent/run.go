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

	"kss-agent/internal/shared"
)

// Run starts chapter 2's console conversation. History lives only for this call.
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
	// Runner is the execution entrypoint. Streaming selects the model's Stream path.
	runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent, EnableStreaming: true})

	// Instruction is supplied by the agent; history contains only conversation messages.
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

		// Each Run receives ALL previous turns; Runner does not persist this slice for us.
		history = append(history, schema.UserMessage(question))
		messages, err := runTurn(ctx, runner, history, output)
		if err != nil {
			return fmt.Errorf("run agent: %w", err)
		}
		history = append(history, messages...)
	}
}

func runTurn(ctx context.Context, runner *adk.Runner, history []*schema.Message, output io.Writer) ([]*schema.Message, error) {
	// Cancel unfinished work if reading the stream or writing output fails.
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	events := runner.Run(ctx, history)
	var messages []*schema.Message
	for {
		event, ok := events.Next()
		if !ok {
			break
		}
		if event == nil {
			continue
		}
		if event.Err != nil {
			return nil, event.Err
		}
		// Lifecycle/control events need not contain a message.
		if event.Output == nil || event.Output.MessageOutput == nil {
			continue
		}
		if _, err := fmt.Fprint(output, "assistant> "); err != nil {
			// printMessage has not taken ownership of the reader yet.
			messageOutput := event.Output.MessageOutput
			if messageOutput.IsStreaming && messageOutput.MessageStream != nil {
				messageOutput.MessageStream.Close()
			}
			return nil, err
		}
		message, err := printMessage(output, event.Output.MessageOutput)
		if err != nil {
			return nil, err
		}
		if _, err := fmt.Fprintln(output); err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}
	if len(messages) == 0 {
		return nil, fmt.Errorf("agent returned no message output")
	}
	return messages, nil
}
