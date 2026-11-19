package toolfilesystem

import (
	"fmt"
	"github.com/cloudwego/eino/schema"
)

func validateHistory(messages []*schema.Message) error {
	pending := map[string]string{}
	for i, message := range messages {
		if message == nil {
			return fmt.Errorf("history message %d is nil", i)
		}
		if message.Role == schema.Tool {
			name, ok := pending[message.ToolCallID]
			if !ok {
				return fmt.Errorf("history message %d: orphan or duplicate tool result %q", i, message.ToolCallID)
			}
			if message.ToolName != "" && message.ToolName != name {
				return fmt.Errorf("history message %d: tool name mismatch", i)
			}
			delete(pending, message.ToolCallID)
			continue
		}
		if len(pending) != 0 {
			return fmt.Errorf("history message %d interrupts an incomplete tool batch; start a new session", i)
		}
		if len(message.ToolCalls) != 0 && message.Role != schema.Assistant {
			return fmt.Errorf("history message %d: tool calls must be assistant messages", i)
		}
		for _, call := range message.ToolCalls {
			if call.ID == "" || call.Function.Name == "" {
				return fmt.Errorf("history message %d: missing tool call ID or name", i)
			}
			if _, exists := pending[call.ID]; exists {
				return fmt.Errorf("history message %d: duplicate tool call ID %q", i, call.ID)
			}
			pending[call.ID] = call.Function.Name
		}
	}
	if len(pending) != 0 {
		return fmt.Errorf("history has an incomplete tool batch; start a new session instead of replaying side effects")
	}
	return nil
}
