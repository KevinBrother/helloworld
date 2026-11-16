package memorysession

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/schema"

	"kss-agent/internal/agentconsole"
	"kss-agent/internal/mem"
	"kss-agent/internal/shared"
)

type Options struct {
	SessionID   string
	SessionDir  string
	Instruction string
}

func Run(ctx context.Context, opts Options, input io.Reader, output io.Writer) error {
	cfg, err := shared.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	chatModel, err := shared.NewChatModel(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create model: %w", err)
	}
	return runWithModel(ctx, chatModel, opts, input, output)
}

func runWithModel(ctx context.Context, chatModel model.BaseChatModel, opts Options, input io.Reader, output io.Writer) error {
	if opts.SessionDir == "" {
		opts.SessionDir = "data/sessions"
	}
	dir, err := filepath.Abs(opts.SessionDir)
	if err != nil {
		return err
	}
	store, err := mem.NewStore(dir)
	if err != nil {
		return err
	}
	session, err := store.GetOrCreate(opts.SessionID)
	if err != nil {
		return err
	}
	agent, err := adk.NewChatModelAgent(ctx, &adk.ChatModelAgentConfig{
		Name:        "Ch03MemoryAgent",
		Description: "A chat assistant with JSONL-backed conversation history.",
		Instruction: opts.Instruction,
		Model:       chatModel,
	})
	if err != nil {
		return fmt.Errorf("create agent: %w", err)
	}
	runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent, EnableStreaming: true})
	if _, err := fmt.Fprintf(output, "第三章：持久化会话\n会话 ID: %s\n标题: %s\n已加载 %d 条消息\n存储目录: %s\n空行或 Ctrl+D 退出，每条完整消息即时保存。\n", session.ID, session.Title(), len(session.GetMessages()), dir); err != nil {
		return err
	}
	scanner := bufio.NewScanner(input)
	scanner.Buffer(make([]byte, 4096), 1024*1024)
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		if _, err := fmt.Fprint(output, "you> "); err != nil {
			return err
		}
		if !scanner.Scan() {
			break
		}
		question := strings.TrimSpace(scanner.Text())
		if question == "" {
			break
		}
		// Save user intent before invoking the model, even if the model later fails.
		if err := session.Append(schema.UserMessage(question)); err != nil {
			return fmt.Errorf("save user message: %w", err)
		}
		// The bridge from application-owned persistence into Eino is still a message slice.
		history := session.GetMessages()
		messages, err := agentconsole.RunTurn(ctx, runner, history, output)
		if err != nil {
			return fmt.Errorf("run agent: %w", err)
		}
		for _, message := range messages {
			if err := session.Append(message); err != nil {
				return fmt.Errorf("save assistant message: %w", err)
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read input: %w", err)
	}
	// Quote the directory for the user's shell; spaces and apostrophes are valid paths.
	quotedDir := "'" + strings.ReplaceAll(dir, "'", "'\"'\"'") + "'"
	_, err = fmt.Fprintf(output, "\n会话已保存: %s\n恢复命令（项目根目录执行）:\nCGO_ENABLED=0 go run ./cmd/memory-session --session %s --session-dir %s\n", session.ID, session.ID, quotedDir)
	return err
}
