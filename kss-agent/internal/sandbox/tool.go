package sandbox

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/components/tool/utils"
)

type codeArgs struct {
	Language string `json:"language,omitempty" jsonschema:"description=Sandbox language id such as python, typescript, go or java (default python)"`
	Code     string `json:"code" jsonschema:"description=Source code to execute in the sandbox"`
}

func NewTool(runner Runner) (tool.BaseTool, error) {
	if runner == nil {
		return nil, fmt.Errorf("sandbox runner is required")
	}
	description := "Execute code inside an isolated sandbox container and return stdout, stderr, " +
		"exit code and the final expression result. The sandbox is a separate container: it " +
		"cannot read the host workspace, the host environment variables or the API key. " +
		"Default language is python; the sandbox image also supports typescript, go and java. " +
		"Use it for calculations, data processing and quick experiments that need real execution."
	return utils.InferTool(CodeToolName, description, func(ctx context.Context, args codeArgs) (string, error) {
		req := Request{Language: args.Language, Code: args.Code}
		if err := Validate(&req); err != nil {
			return fmt.Sprintf("error: %v", err), nil
		}
		res, err := runner.Run(ctx, req)
		if err != nil {
			return "", fmt.Errorf("run_code: %w", err)
		}
		return FormatResult(req, res), nil
	})
}
