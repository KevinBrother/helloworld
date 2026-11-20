package toolfilesystem

import (
	"context"
	"strings"

	"github.com/cloudwego/eino/adk"
)

const DefaultMaxRetries = 5

func isRateLimited(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	for _, keyword := range []string{"429", "too many requests", "rate limit", "qpm limit", "tpm limit"} {
		if strings.Contains(message, keyword) {
			return true
		}
	}
	return false
}

func newModelRetryConfig(maxRetries int) *adk.ModelRetryConfig {
	return &adk.ModelRetryConfig{MaxRetries: maxRetries, ShouldRetry: func(_ context.Context, rc *adk.RetryContext) *adk.RetryDecision {
		return &adk.RetryDecision{Retry: rc != nil && isRateLimited(rc.Err)}
	}}
}
