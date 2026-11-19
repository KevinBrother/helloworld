package agentconsole

import (
	"context"
	"fmt"
	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/schema"
	"io"
)

// RunTurn displays one execution and returns complete messages for the caller to retain.
func RunTurn(ctx context.Context, runner *adk.Runner, history []*schema.Message, output io.Writer) ([]*schema.Message, error) {
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
		prefix := "assistant> "
		if event.Output.MessageOutput.Role == schema.Tool {
			prefix = "tool> " + event.Output.MessageOutput.ToolName + ": "
		}
		if _, err := fmt.Fprint(output, prefix); err != nil {
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
		// Print arguments only after stream chunks have been concatenated.
		for _, call := range message.ToolCalls {
			if _, err := fmt.Fprintf(output, "[tool call] %s id=%s args=%s\n", call.Function.Name, call.ID, call.Function.Arguments); err != nil {
				return nil, err
			}
		}
		messages = append(messages, message)
	}
	if len(messages) == 0 {
		return nil, fmt.Errorf("agent returned no message output")
	}
	return messages, nil
}
