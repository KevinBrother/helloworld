# NewChatModelAgent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current single-entry chat sample into separate runnable cases for `NewChatModel` and `NewChatModelAgent`, with shared config/model setup kept in a small internal package.

**Architecture:** Keep `cmd/` as the only entrypoint layer and move each case into its own `internal/<case>/` package. Extract only the reusable OpenAI-compatible config loading and chat model creation into `internal/shared/` so both cases stay small and readable. Preserve the existing config environment variable names and current Chinese response behavior.

**Tech Stack:** Go 1.22, `github.com/cloudwego/eino`, `github.com/cloudwego/eino-ext/components/model/openai`, `github.com/joho/godotenv`

---

### Task 1: Split shared bootstrapping from the current sample

**Files:**
- Create: `internal/shared/config.go`
- Create: `internal/shared/model.go`
- Modify: `internal/app/app.go`
- Modify: `internal/app/app_test.go`
- Modify: `cmd/main.go`

- [ ] **Step 1: Write the failing test**

```go
func TestRunUsesSharedModelSetup(t *testing.T) {
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/app -run TestRunUsesSharedModelSetup -v`
Expected: FAIL because the new shared package and entry wiring do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```go
// internal/shared/config.go
package shared

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

const (
	envBaseURL = "NEW_API_BASE_URL"
	envAPIKey  = "NEW_API_KEY"
	envModel   = "NEW_API_MODEL"
)

type Config struct {
	BaseURL string
	APIKey  string
	Model   string
}

func LoadConfig() (*Config, error) {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("load .env: %w", err)
	}

	cfg := &Config{
		BaseURL: strings.TrimRight(strings.TrimSpace(os.Getenv(envBaseURL)), "/"),
		APIKey:  strings.TrimSpace(os.Getenv(envAPIKey)),
		Model:   strings.TrimSpace(os.Getenv(envModel)),
	}

	if cfg.BaseURL == "" || cfg.APIKey == "" || cfg.Model == "" {
		return nil, fmt.Errorf("missing required config: %s", strings.Join(missing(cfg), ", "))
	}

	return cfg, nil
}

func missing(cfg *Config) []string {
	var missing []string
	if cfg.BaseURL == "" {
		missing = append(missing, envBaseURL)
	}
	if cfg.APIKey == "" {
		missing = append(missing, envAPIKey)
	}
	if cfg.Model == "" {
		missing = append(missing, envModel)
	}
	return missing
}
```

```go
// internal/shared/model.go
package shared

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/components/model"
)

func NewChatModel(ctx context.Context, cfg *Config) (model.ToolCallingChatModel, error) {
	return openai.NewChatModel(ctx, &openai.ChatModelConfig{
		BaseURL: cfg.BaseURL,
		APIKey:  cfg.APIKey,
		Model:   cfg.Model,
	})
}

func ModelError(err error) error {
	return fmt.Errorf("[kss-agent error]: %w", err)
}
```

```go
// internal/app/app.go
package app

import (
	"context"
	"fmt"

	"kss-agent/internal/shared"
)

const (
	systemPrompt = "you are a helpful assistant. 用中文回答"
	userPrompt   = "what does the future AI App look like?"
)

func Run(ctx context.Context) error {
	cfg, err := shared.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	chatModel, err := shared.NewChatModel(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create openai-compatible chat model: %w", err)
	}

	message, err := generate(ctx, chatModel)
	if err != nil {
		return shared.ModelError(err)
	}

	fmt.Println(message.Content)
	return nil
}
```

```go
// cmd/main.go
package main

import (
	"context"
	"log"

	"kss-agent/internal/app"
)

func main() {
	if err := app.Run(context.Background()); err != nil {
		log.Fatal(err)
	}
}
```

- [ ] **Step 4: Run the package tests**

Run: `go test ./internal/...`
Expected: PASS.

### Task 2: Add a dedicated NewChatModelAgent entrypoint and package

**Files:**
- Create: `cmd/new-chat-model-agent/main.go`
- Create: `internal/newchatmodelagent/run.go`
- Create: `internal/newchatmodelagent/run_test.go`

- [ ] **Step 1: Write the failing test**

```go
func TestRunBuildsAgentFlow(t *testing.T) {
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/newchatmodelagent -run TestRunBuildsAgentFlow -v`
Expected: FAIL because the package does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```go
// cmd/new-chat-model-agent/main.go
package main

import (
	"context"
	"log"

	"kss-agent/internal/newchatmodelagent"
)

func main() {
	if err := newchatmodelagent.Run(context.Background()); err != nil {
		log.Fatal(err)
	}
}
```

```go
// internal/newchatmodelagent/run.go
package newchatmodelagent

import (
	"context"
	"fmt"

	"kss-agent/internal/shared"
)

func Run(ctx context.Context) error {
	cfg, err := shared.LoadConfig()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	chatModel, err := shared.NewChatModel(ctx, cfg)
	if err != nil {
		return fmt.Errorf("create openai-compatible chat model: %w", err)
	}

	_ = chatModel
	fmt.Println("agent case placeholder")
	return nil
}
```

- [ ] **Step 4: Run the package tests**

Run: `go test ./...`
Expected: PASS.

### Task 3: Clean up the README entry points

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the run instructions**

```md
## run

```bash
go run ./cmd
go run ./cmd/new-chat-model-agent
```
```

- [ ] **Step 2: Run a final verification pass**

Run: `go test ./...`
Expected: PASS.

