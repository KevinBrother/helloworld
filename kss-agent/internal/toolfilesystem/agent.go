package toolfilesystem

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	localbk "github.com/cloudwego/eino-ext/adk/backend/local"
	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/adk/prebuilt/deep"
	"github.com/cloudwego/eino/components/model"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/compose"

	"kss-agent/internal/webtool"
)

// resolveRoot supplies path context, NOT a filesystem security boundary.
func resolveRoot(root string) (string, error) {
	if root == "" {
		root = os.Getenv("PROJECT_ROOT")
	}
	if root == "" {
		root = "."
	}
	absolute, err := filepath.Abs(root)
	if err != nil {
		return "", fmt.Errorf("resolve project root: %w", err)
	}
	info, err := os.Stat(absolute)
	if err != nil {
		return "", fmt.Errorf("project root: %w", err)
	}
	if !info.IsDir() {
		return "", fmt.Errorf("project root is not a directory: %s", absolute)
	}
	return absolute, nil
}

func newAgent(ctx context.Context, chatModel model.BaseChatModel, opts Options) (adk.ResumableAgent, error) {
	backend, err := localbk.NewBackend(ctx, &localbk.Config{})
	if err != nil {
		return nil, fmt.Errorf("create local backend: %w", err)
	}
	webFetcher, err := webtool.NewFetchTool(webtool.Options{})
	if err != nil {
		return nil, fmt.Errorf("create web_fetch tool: %w", err)
	}
	tools := []tool.BaseTool{webFetcher}
	if opts.Searcher != nil {
		searchTool, err := webtool.NewSearchTool(opts.Searcher)
		if err != nil {
			return nil, fmt.Errorf("create web_search tool: %w", err)
		}
		tools = append(tools, searchTool)
	}
	cfg := &deep.Config{
		Name:        "Ch04ToolFilesystemAgent",
		Description: "A learning assistant with local filesystem tools, a constrained web_fetch tool, an optional hosted web_search tool and persistent conversation history.",
		ChatModel:   chatModel, Instruction: filesystemInstruction(opts), Backend: backend,
		MaxIteration: 50, WithoutGeneralSubAgent: true,
		// Auto-registered filesystem tools come from Backend; custom tools enter here.
		ToolsConfig: adk.ToolsConfig{
			ToolsNodeConfig: compose.ToolsNodeConfig{
				Tools: tools,
			},
		},
	}
	if opts.AllowShell {
		cfg.StreamingShell = backend
	}
	agent, err := deep.New(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create deep agent: %w", err)
	}
	return agent, nil
}

func filesystemInstruction(opts Options) string {
	instruction := strings.TrimSpace(opts.Instruction)
	if instruction == "" {
		instruction = "你是一个使用文件工具完成任务的学习助手。先查看再修改，不编造执行结果，不读取密钥文件。"
	}
	return instruction + fmt.Sprintf("\n\n当前项目根目录（PROJECT_ROOT）: %s\n文件工具请使用绝对路径；用户给出相对路径时基于此目录解析。不要假定 Shell 的工作目录。仅操作用户明确授权的文件；写入前说明意图，避免破坏已有数据。此目录只是路径上下文，不是沙箱。", opts.ProjectRoot)
}

// Run is the DeepAgent example entry: Backend automatically supplies filesystem tools.
func Run(ctx context.Context, opts Options, input io.Reader, output io.Writer) error {
	return run(ctx, opts, input, output, newAgent, "tool-filesystem")
}
