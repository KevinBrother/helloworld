package toolfilesystem

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/adk/filesystem"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/components/tool/utils"
	"github.com/cloudwego/eino/schema"
)

type directoryArgs struct {
	Path string `json:"path" jsonschema:"description=Absolute directory path"`
}
type readArgs struct {
	FilePath string `json:"file_path" jsonschema:"description=Absolute path of the file to read"`
	Offset   int    `json:"offset,omitempty" jsonschema:"description=Starting line number (1-based; default 1)"`
	Limit    int    `json:"limit,omitempty" jsonschema:"description=Maximum lines to read (default 2000)"`
}
type writeArgs struct {
	FilePath string `json:"file_path" jsonschema:"description=Absolute path of the file to write"`
	Content  string `json:"content" jsonschema:"description=Full file content"`
}
type editArgs struct {
	FilePath   string `json:"file_path" jsonschema:"description=Absolute path of the file to edit"`
	OldString  string `json:"old_string" jsonschema:"description=Exact non-empty text to replace"`
	NewString  string `json:"new_string" jsonschema:"description=Replacement text; must differ from old_string"`
	ReplaceAll bool   `json:"replace_all,omitempty" jsonschema:"description=Replace every occurrence; default false requires exactly one match"`
}
type searchArgs struct {
	Path    string `json:"path" jsonschema:"description=Absolute directory to search"`
	Pattern string `json:"pattern" jsonschema:"description=Glob pattern for glob; ripgrep regular expression for grep"`
	Glob    string `json:"glob,omitempty" jsonschema:"description=Optional file glob filter for grep only"`
}
type commandArgs struct {
	Command string `json:"command" jsonschema:"description=Shell command; use an explicit cd when working in a project directory"`
}

type manualBackend interface {
	filesystem.Backend
	filesystem.StreamingShell
}

func newManualTools(ctx context.Context, backend manualBackend, allowShell bool) ([]tool.BaseTool, error) {
	ls, err := utils.InferTool("ls", "List entries in an absolute directory. Does not recurse.",
		func(ctx context.Context, args directoryArgs) ([]filesystem.FileInfo, error) {
			return backend.LsInfo(ctx, &filesystem.LsInfoRequest{Path: args.Path})
		})
	if err != nil {
		return nil, fmt.Errorf("create ls tool: %w", err)
	}

	read, err := utils.InferTool("read_file", "Read text from an absolute file path. Use offset/limit for large files. Never read secrets.",
		func(ctx context.Context, args readArgs) (string, error) {
			if args.Offset <= 0 {
				args.Offset = 1
			}
			if args.Limit <= 0 {
				args.Limit = 2000
			}
			result, err := backend.Read(ctx, &filesystem.ReadRequest{FilePath: args.FilePath, Offset: args.Offset, Limit: args.Limit})
			if err != nil {
				return "", err
			}
			if result == nil {
				return "", fmt.Errorf("read returned no content: %s", args.FilePath)
			}
			return result.Content, nil
		})
	if err != nil {
		return nil, fmt.Errorf("create read_file tool: %w", err)
	}

	write, err := utils.InferTool("write_file", "Write full content to a real file at an absolute path. Inspect existing files first; only write with user authorization.",
		func(ctx context.Context, args writeArgs) (string, error) {
			if err := backend.Write(ctx, &filesystem.WriteRequest{FilePath: args.FilePath, Content: args.Content}); err != nil {
				return "", err
			}
			return "Wrote file: " + args.FilePath, nil
		})
	if err != nil {
		return nil, fmt.Errorf("create write_file tool: %w", err)
	}

	edit, err := utils.InferTool("edit_file", "Replace literal text in a real file. Read first. With replace_all=false the old string must appear exactly once.",
		func(ctx context.Context, args editArgs) (string, error) {
			if err := backend.Edit(ctx, &filesystem.EditRequest{FilePath: args.FilePath, OldString: args.OldString, NewString: args.NewString, ReplaceAll: args.ReplaceAll}); err != nil {
				return "", err
			}
			return "Edited file: " + args.FilePath, nil
		})
	if err != nil {
		return nil, fmt.Errorf("create edit_file tool: %w", err)
	}

	glob, err := utils.InferTool("glob", "Find paths using a glob pattern under an absolute directory. Supports ** for recursive matching.",
		func(ctx context.Context, args searchArgs) ([]filesystem.FileInfo, error) {
			return backend.GlobInfo(ctx, &filesystem.GlobInfoRequest{Path: args.Path, Pattern: args.Pattern})
		})
	if err != nil {
		return nil, fmt.Errorf("create glob tool: %w", err)
	}

	grep, err := utils.InferTool("grep", "Search file contents with a ripgrep regular expression. Returns matching path, line and content; requires rg on PATH.",
		func(ctx context.Context, args searchArgs) ([]filesystem.GrepMatch, error) {
			return backend.GrepRaw(ctx, &filesystem.GrepRequest{Path: args.Path, Pattern: args.Pattern, Glob: args.Glob})
		})
	if err != nil {
		return nil, fmt.Errorf("create grep tool: %w", err)
	}

	tools := []tool.BaseTool{ls, read, write, edit, glob, grep}
	if allowShell {
		execute, err := utils.InferStreamTool("execute", "Execute an unrestricted local shell command and stream output and exit code. Only use with explicit user authorization.",
			func(ctx context.Context, args commandArgs) (*schema.StreamReader[string], error) {
				stream, err := backend.ExecuteStreaming(ctx, &filesystem.ExecuteRequest{Command: args.Command})
				if err != nil {
					return nil, err
				}
				return schema.StreamReaderWithConvert(stream, func(chunk *filesystem.ExecuteResponse) (string, error) {
					if chunk == nil {
						return "", schema.ErrNoValue
					}
					text := chunk.Output
					if chunk.ExitCode != nil {
						text += fmt.Sprintf("\n[exit code: %d]", *chunk.ExitCode)
					}
					if chunk.Truncated {
						text += "\n[output truncated]"
					}
					return text, nil
				}), nil
			})
		if err != nil {
			return nil, fmt.Errorf("create execute tool: %w", err)
		}
		tools = append(tools, execute)
	}
	for _, item := range tools {
		if _, err := item.Info(ctx); err != nil {
			return nil, fmt.Errorf("inspect manual tool: %w", err)
		}
	}
	return tools, nil
}
