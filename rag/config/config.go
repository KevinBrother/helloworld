package config

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/yaml.v3"
)

// Config is the top-level configuration structure.
// All values can be overridden by environment variables (see applyEnv).
type Config struct {
	VectorStore VectorStoreConfig `yaml:"vector_store"`
	Embedding   ModelConfig       `yaml:"embedding"`
	Chat        ModelConfig       `yaml:"chat"`
}

// VectorStoreConfig specifies the vector database backend and its connection.
//
//   - Type: backend driver. Currently only "qdrant" is supported (default).
//   - Host: hostname of the vector store server.
//   - Port: gRPC port (Qdrant default: 6334).
type VectorStoreConfig struct {
	Type string `yaml:"type"`
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

// ModelConfig holds the endpoint settings for an embedding or chat model.
// The design is provider-agnostic: any OpenAI-compatible endpoint works —
// OpenAI, Ollama (/v1), DeepSeek, Azure OpenAI, vLLM, etc.
//
//   - Host:    base URL of the API. Empty = official OpenAI API.
//     Ollama example: "http://localhost:11434/v1"
//   - Model:   model identifier accepted by the endpoint.
//   - APIKey:  authentication token. If empty, OPENAI_API_KEY env var is used.
//     For local servers that skip auth, set any non-empty string (e.g. "no-key").
type ModelConfig struct {
	Host   string `yaml:"host"`
	Model  string `yaml:"model"`
	APIKey string `yaml:"api_key"`
}

// Load reads config.yaml (if present) and applies environment variable overrides.
func Load(path string) (*Config, error) {
	cfg := defaults()

	data, err := os.ReadFile(path)
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("reading config file: %w", err)
	}
	if err == nil {
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("parsing config file: %w", err)
		}
	}

	applyEnv(cfg)
	return cfg, nil
}

func defaults() *Config {
	return &Config{
		VectorStore: VectorStoreConfig{Type: "qdrant", Host: "localhost", Port: 6334},
		Embedding:   ModelConfig{Model: "text-embedding-3-small"},
		Chat:        ModelConfig{Model: "gpt-4o-mini"},
	}
}

func applyEnv(cfg *Config) {
	if v := os.Getenv("VECTOR_STORE_TYPE"); v != "" {
		cfg.VectorStore.Type = v
	}
	if v := os.Getenv("VECTOR_STORE_HOST"); v != "" {
		cfg.VectorStore.Host = v
	}
	if v := os.Getenv("VECTOR_STORE_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			cfg.VectorStore.Port = p
		}
	}
	if v := os.Getenv("EMBEDDING_HOST"); v != "" {
		cfg.Embedding.Host = v
	}
	if v := os.Getenv("EMBEDDING_MODEL"); v != "" {
		cfg.Embedding.Model = v
	}
	if v := os.Getenv("EMBEDDING_API_KEY"); v != "" {
		cfg.Embedding.APIKey = v
	}
	if v := os.Getenv("CHAT_HOST"); v != "" {
		cfg.Chat.Host = v
	}
	if v := os.Getenv("CHAT_MODEL"); v != "" {
		cfg.Chat.Model = v
	}
	if v := os.Getenv("CHAT_API_KEY"); v != "" {
		cfg.Chat.APIKey = v
	}
	// Legacy convenience: OPENAI_API_KEY fills both if not already set.
	if v := os.Getenv("OPENAI_API_KEY"); v != "" {
		if cfg.Embedding.APIKey == "" {
			cfg.Embedding.APIKey = v
		}
		if cfg.Chat.APIKey == "" {
			cfg.Chat.APIKey = v
		}
	}
}
