package toolfilesystem

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
	"kss-agent/internal/webtool"
)

type Options struct {
	SessionID   string
	SessionDir  string
	ProjectRoot string
	Instruction string
	AllowShell  bool
	// Searcher supplies web_search. run() fills it for the CLI entry; a nil
	// value means no web_search tool (manual entry and tests).
	Searcher webtool.Searcher
}

type agentFactory func(context.Context, model.BaseChatModel, Options) (adk.ResumableAgent, error)

// run loads the common model configuration; each entry supplies its own fixed agent factory.
func run(ctx context.Context, opts Options, input io.Reader, output io.Writer, createAgent agentFactory, command string) error {
	root, err := resolveRoot(opts.ProjectRoot)
	if err != nil {
		return err
	}
	opts.ProjectRoot = root
	cfg, err := shared.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	chatModel, err := shared.NewChatModel(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create model: %w", err)
	}
	// Reuse the model endpoint for hosted web search; no extra credential needed.
	searcher, err := webtool.NewHostedSearcher(webtool.HostedOptions{
		BaseURL: cfg.BaseURL,
		APIKey:  cfg.APIKey,
		Model:   cfg.Model,
	})
	if err != nil {
		return fmt.Errorf("create web search: %w", err)
	}
	opts.Searcher = searcher
	return runConsole(ctx, chatModel, opts, input, output, createAgent, command)
}

func runConsole(ctx context.Context, chatModel model.BaseChatModel, opts Options, input io.Reader, output io.Writer, createAgent agentFactory, command string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	root, err := resolveRoot(opts.ProjectRoot)
	if err != nil {
		return err
	}
	opts.ProjectRoot = root
	if opts.SessionDir == "" {
		opts.SessionDir = shared.DefaultSessionDir()
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
	if err := validateHistory(session.GetMessages()); err != nil {
		return fmt.Errorf("invalid session %s: %w", session.ID, err)
	}
	agent, err := createAgent(ctx, chatModel, opts)
	if err != nil {
		return err
	}
	runner := adk.NewRunner(ctx, adk.RunnerConfig{Agent: agent, EnableStreaming: true})
	webTools := ""
	if opts.Searcher != nil {
		webTools = "联网工具: web_fetch（抓取页面）与 web_search（托管搜索，每次搜索额外消耗一轮模型调用）\n"
	}
	if _, err := fmt.Fprintf(output, "第四章：工具与文件系统\n程序入口: %s\n会话 ID: %s\n已加载 %d 条消息\n项目目录: %s\n存储目录: %s\n%sShell 执行: %t\n注意：本地文件工具可读写真实文件，项目目录不是沙箱；关闭 Shell 不会禁用文件写入。\n空行或 Ctrl+D 退出。\n", command, session.ID, len(session.GetMessages()), root, dir, webTools, opts.AllowShell); err != nil {
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
		if err := session.Append(schema.UserMessage(question)); err != nil {
			return fmt.Errorf("save user message: %w", err)
		}
		messages, err := agentconsole.RunTurn(ctx, runner, session.GetMessages(), output)
		if err != nil {
			return fmt.Errorf("run agent (file side effects are not rolled back): %w", err)
		}
		if err := validateHistory(messages); err != nil {
			return fmt.Errorf("invalid tool turn: %w", err)
		}
		// Commit only complete successful turns; the JSONL store is not batch-atomic.
		for _, message := range messages {
			if err := session.Append(message); err != nil {
				return fmt.Errorf("save turn: %w", err)
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read input: %w", err)
	}
	shellFlag := ""
	if opts.AllowShell {
		shellFlag = " --allow-shell"
	}
	_, err = fmt.Fprintf(output, "\n会话已保存: %s\n恢复命令（项目根目录执行；自定义 instruction 请自行补充）:\nCGO_ENABLED=0 go run ./cmd/%s --session %s --session-dir %s --project-root %s%s\n", session.ID, command, session.ID, shellQuote(dir), shellQuote(root), shellFlag)
	return err
}

func shellQuote(value string) string { return "'" + strings.ReplaceAll(value, "'", "'\"'\"'") + "'" }
