package app

import (
	"errors"
	"strings"
	"testing"

	"kss-agent/internal/config"
)

func TestModelErrorMentionsBaseURLWhenResponseLooksLikeHTML(t *testing.T) {
	cfg := &config.Config{
		BaseURL: "http://127.0.0.1:3000",
		APIKey:  "sk-test",
		Model:   "gpt-test",
	}

	err := modelError(cfg, errors.New("invalid character '<' looking for beginning of value"))
	if err == nil {
		t.Fatal("modelError() error = nil")
	}

	msg := err.Error()
	for _, want := range []string{"NEW_API_BASE_URL", "OpenAI-compatible API", "http://127.0.0.1:3000"} {
		if !strings.Contains(msg, want) {
			t.Fatalf("error %q does not contain %q", msg, want)
		}
	}
}
