package shared

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

const (
	envSystemPrompt = "SYSTEM_PROMPT"
	envUserPrompt   = "USER_PROMPT"
	envSessionDir   = "SESSION_DIR"
	// DefaultSessionDirPath is shared by chapters 3 and 4 (all session files live together).
	DefaultSessionDirPath = "data/sessions"
	DefaultSystemPrompt   = "You are a helpful assistant."
)

func LoadDotEnv() {
	_ = godotenv.Load()
}

func DefaultInstruction() string {
	if v := strings.TrimSpace(os.Getenv(envSystemPrompt)); v != "" {
		return v
	}
	return DefaultSystemPrompt
}

// DefaultSessionDir returns SESSION_DIR (env or .env) or data/sessions.
func DefaultSessionDir() string {
	if v := strings.TrimSpace(os.Getenv(envSessionDir)); v != "" {
		return v
	}
	return DefaultSessionDirPath
}

func ResolveUserPrompt(args []string) string {
	if q := strings.TrimSpace(strings.Join(args, " ")); q != "" {
		return q
	}
	return strings.TrimSpace(os.Getenv(envUserPrompt))
}

func Usage(program string) string {
	return fmt.Sprintf("usage: %s [--instruction \"...\"] \"your question\"", program)
}
