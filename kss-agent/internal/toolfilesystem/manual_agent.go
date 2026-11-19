package toolfilesystem

import (
	"context"
	"fmt"
	"io"

	localbk "github.com/cloudwego/eino-ext/adk/backend/local"
	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/compose"
)

// Unlike deep.New, ChatModelAgent has no Backend/StreamingShell shortcut fields.
func newManualAgent(ctx context.Context, chatModel model.BaseChatModel, opts Options) (adk.ResumableAgent, error) {
	backend, err := localbk.NewBackend(ctx, &localbk.Config{})
	if err != nil {
		return nil, fmt.Errorf("create local backend: %w", err)
	}
	tools, err := newManualTools(ctx, backend, opts.AllowShell)
	if err != nil {
		return nil, err
	}
	// Explicit registration is the key difference: the agent only sees tools in this slice.
	agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
		Name:          "Ch04ManualToolsAgent",
		Description:   "A ChatModelAgent with individually constructed local filesystem tools.",
		Model:         chatModel,
		Instruction:   filesystemInstruction(opts),
		ToolsConfig:   adk.ToolsConfig{ToolsNodeConfig: compose.ToolsNodeConfig{Tools: tools}},
		MaxIterations: 50,
	})
	if err != nil {
		return nil, fmt.Errorf("create manual chat model agent: %w", err)
	}
	return agent, nil
}

// RunManual is the ChatModelAgent example entry: every tool is constructed and registered explicitly.
func RunManual(ctx context.Context, opts Options, input io.Reader, output io.Writer) error {
	return run(ctx, opts, input, output, newManualAgent, "manual-tools")
}
