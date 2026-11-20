package toolfilesystem

import (
	"context"
	"fmt"
	"io"

	"github.com/cloudwego/eino/adk"
	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/schema"
)

type safeTool struct {
	*adk.BaseChatModelAgentMiddleware
}

func newSafeTool() *safeTool {
	return &safeTool{BaseChatModelAgentMiddleware: &adk.BaseChatModelAgentMiddleware{}}
}

func shouldPropagate(ctx context.Context, err error) bool {
	_, interrupt := compose.IsInterruptRerunError(err)
	return ctx.Err() != nil || interrupt
}

func toolError(err error) string { return fmt.Sprintf("[tool error] %v", err) }

func toolResult(err error) *schema.ToolResult {
	return &schema.ToolResult{Parts: []schema.ToolOutputPart{{Type: schema.ToolPartTypeText, Text: toolError(err)}}}
}

func (s *safeTool) WrapInvokableToolCall(_ context.Context, endpoint adk.InvokableToolCallEndpoint, _ *adk.ToolContext) (adk.InvokableToolCallEndpoint, error) {
	return func(ctx context.Context, args string, opts ...tool.Option) (string, error) {
		result, err := endpoint(ctx, args, opts...)
		if err == nil || shouldPropagate(ctx, err) {
			return result, err
		}
		return toolError(err), nil
	}, nil
}

func (s *safeTool) WrapEnhancedInvokableToolCall(_ context.Context, endpoint adk.EnhancedInvokableToolCallEndpoint, _ *adk.ToolContext) (adk.EnhancedInvokableToolCallEndpoint, error) {
	return func(ctx context.Context, args *schema.ToolArgument, opts ...tool.Option) (*schema.ToolResult, error) {
		result, err := endpoint(ctx, args, opts...)
		if err == nil || shouldPropagate(ctx, err) {
			return result, err
		}
		return toolResult(err), nil
	}, nil
}

func safeStream[T any](ctx context.Context, source *schema.StreamReader[T], convert func(error) T) *schema.StreamReader[T] {
	var pending error
	return schema.StreamReaderWithConvert(source, func(frame T) (T, error) {
		return frame, nil
	}, schema.WithErrWrapper(func(err error) error {
		if shouldPropagate(ctx, err) {
			return err
		}
		if pending == nil {
			pending = err
		}
		return nil
	}), schema.WithOnEOF(func() (any, error) {
		if pending == nil {
			return nil, io.EOF
		}
		frame := convert(pending)
		pending = nil
		return frame, nil
	}))
}

func (s *safeTool) WrapStreamableToolCall(_ context.Context, endpoint adk.StreamableToolCallEndpoint, _ *adk.ToolContext) (adk.StreamableToolCallEndpoint, error) {
	return func(ctx context.Context, args string, opts ...tool.Option) (*schema.StreamReader[string], error) {
		source, err := endpoint(ctx, args, opts...)
		if err != nil {
			if shouldPropagate(ctx, err) {
				return nil, err
			}
			return schema.StreamReaderFromArray([]string{toolError(err)}), nil
		}
		return safeStream(ctx, source, toolError), nil
	}, nil
}

func (s *safeTool) WrapEnhancedStreamableToolCall(_ context.Context, endpoint adk.EnhancedStreamableToolCallEndpoint, _ *adk.ToolContext) (adk.EnhancedStreamableToolCallEndpoint, error) {
	return func(ctx context.Context, args *schema.ToolArgument, opts ...tool.Option) (*schema.StreamReader[*schema.ToolResult], error) {
		source, err := endpoint(ctx, args, opts...)
		if err != nil {
			if shouldPropagate(ctx, err) {
				return nil, err
			}
			return schema.StreamReaderFromArray([]*schema.ToolResult{toolResult(err)}), nil
		}
		return safeStream(ctx, source, toolResult), nil
	}, nil
}
