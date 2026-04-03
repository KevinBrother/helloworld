package embedder

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

// Embedder converts a batch of text strings into embedding vectors.
// Implementations must be safe for concurrent use.
type Embedder interface {
	// Embed returns one vector per input string, in the same order.
	Embed(ctx context.Context, texts []string) ([][]float32, error)
	// Dimensions returns the length of each output vector.
	// Returns 0 before the first Embed call (auto-detected from the response).
	Dimensions() int
}

// Config specifies the embedding endpoint.
// Any OpenAI-compatible server works: OpenAI, Ollama (/v1), DeepSeek, vLLM, etc.
type Config struct {
	// Host is the base URL of the embeddings API.
	// Leave empty to use the official OpenAI API (api.openai.com).
	// For Ollama's OpenAI-compatible endpoint: "http://localhost:11434/v1"
	Host string
	// Model is the embedding model name accepted by the endpoint.
	Model string
	// APIKey is the authentication token.
	// If empty, the OPENAI_API_KEY environment variable is used.
	// For local servers that skip auth, set any non-empty value (e.g. "no-key").
	APIKey string
}

// httpEmbedder calls any OpenAI-compatible embeddings endpoint.
// Dimensions are auto-detected from the first API response.
type httpEmbedder struct {
	client *openai.Client
	model  string
	dims   int // populated after the first Embed call
}

// New creates an Embedder for the given endpoint configuration.
func New(cfg Config) (Embedder, error) {
	if cfg.Model == "" {
		return nil, fmt.Errorf("embedder: model must not be empty")
	}

	apiKey := cfg.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}
	// Local servers (Ollama, vLLM, etc.) typically do not require auth.
	// The openai-go SDK needs a non-empty key even with a custom host.
	if apiKey == "" {
		apiKey = "no-key"
	}

	opts := []option.RequestOption{option.WithAPIKey(apiKey)}
	if cfg.Host != "" {
		// The openai-go SDK resolves endpoint paths relative to the base URL.
		// A trailing slash is required: without it, URL resolution strips the
		// last path segment (e.g. "/v1" → path resolves to "/embeddings"
		// instead of "/v1/embeddings").
		host := cfg.Host
		if !strings.HasSuffix(host, "/") {
			host += "/"
		}
		opts = append(opts, option.WithBaseURL(host))
	}

	client := openai.NewClient(opts...)
	return &httpEmbedder{client: client, model: cfg.Model}, nil
}

func (e *httpEmbedder) Embed(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	resp, err := e.client.Embeddings.New(ctx, openai.EmbeddingNewParams{
		Model: openai.F(e.model),
		Input: openai.F[openai.EmbeddingNewParamsInputUnion](openai.EmbeddingNewParamsInputArrayOfStrings(texts)),
	})
	if err != nil {
		return nil, fmt.Errorf("embed: %w", err)
	}
	if len(resp.Data) != len(texts) {
		return nil, fmt.Errorf("embed: expected %d vectors, got %d", len(texts), len(resp.Data))
	}

	// OpenAI returns []float64; convert to []float32 for Qdrant.
	result := make([][]float32, len(resp.Data))
	for i, d := range resp.Data {
		v := make([]float32, len(d.Embedding))
		for j, f := range d.Embedding {
			v[j] = float32(f)
		}
		result[i] = v
	}

	// Auto-detect dimensions from the first call.
	if e.dims == 0 && len(result) > 0 {
		e.dims = len(result[0])
	}
	return result, nil
}

func (e *httpEmbedder) Dimensions() int { return e.dims }
