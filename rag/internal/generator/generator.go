package generator

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

// Generator calls an LLM to produce a text response.
type Generator interface {
	Generate(ctx context.Context, systemPrompt, userPrompt string) (string, error)
}

// Config specifies the chat endpoint.
// Any OpenAI-compatible server works: OpenAI, Ollama (/v1), DeepSeek, vLLM, etc.
type Config struct {
	// Host is the base URL of the chat completions API.
	// Leave empty to use the official OpenAI API (api.openai.com).
	// For Ollama's OpenAI-compatible endpoint: "http://localhost:11434/v1"
	Host string
	// Model is the chat model name accepted by the endpoint.
	Model string
	// APIKey is the authentication token.
	// If empty, the OPENAI_API_KEY environment variable is used.
	// For local servers that skip auth, set any non-empty value (e.g. "no-key").
	APIKey string
}

// httpGenerator calls any OpenAI-compatible chat completions endpoint.
type httpGenerator struct {
	client *openai.Client
	model  string
}

// New creates a Generator for the given endpoint configuration.
func New(cfg Config) (Generator, error) {
	if cfg.Model == "" {
		return nil, fmt.Errorf("generator: model must not be empty")
	}

	apiKey := cfg.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}
	if apiKey == "" {
		apiKey = "no-key"
	}

	opts := []option.RequestOption{option.WithAPIKey(apiKey)}
	if cfg.Host != "" {
		// Trailing slash required for correct relative-path URL resolution.
		host := cfg.Host
		if !strings.HasSuffix(host, "/") {
			host += "/"
		}
		opts = append(opts, option.WithBaseURL(host))
	}

	client := openai.NewClient(opts...)
	return &httpGenerator{client: client, model: cfg.Model}, nil
}

func (g *httpGenerator) Generate(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	resp, err := g.client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: openai.F(g.model),
		Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage(systemPrompt),
			openai.UserMessage(userPrompt),
		}),
	})
	if err != nil {
		return "", fmt.Errorf("generate: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("generate: no choices in response")
	}
	return resp.Choices[0].Message.Content, nil
}

// BuildRAGPrompt assembles the system prompt for RAG: instructs the LLM to answer
// only from the provided context chunks. This is the standard RAG prompt pattern.
func BuildRAGPrompt(contextChunks []string) string {
	if len(contextChunks) == 0 {
		return "You are a helpful assistant. Answer the user question as best you can."
	}
	prompt := "You are a helpful assistant. Answer ONLY using the context below.\n"
	prompt += "If the context does not contain the answer, say so clearly.\n\n"
	prompt += "=== CONTEXT ===\n"
	for i, c := range contextChunks {
		prompt += fmt.Sprintf("\n--- Chunk %d ---\n%s\n", i+1, c)
	}
	prompt += "\n=== END CONTEXT ===\n"
	return prompt
}
