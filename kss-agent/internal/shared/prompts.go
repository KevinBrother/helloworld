package shared

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

const (
	envSystemPrompt     = "SYSTEM_PROMPT"
	envUserPrompt       = "USER_PROMPT"
	DefaultSystemPrompt = "You are a helpful assistant."
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

func ResolveUserPrompt(args []string) string {
	if q := strings.TrimSpace(strings.Join(args, " ")); q != "" {
		return q
	}
	return strings.TrimSpace(os.Getenv(envUserPrompt))
}

func Usage(program string) string {
	return fmt.Sprintf("usage: %s [--instruction \"...\"] \"your question\"", program)
}
