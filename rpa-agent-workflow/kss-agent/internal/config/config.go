package config

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

func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("load .env: %w", err)
	}

	cfg := &Config{
		BaseURL: strings.TrimRight(strings.TrimSpace(os.Getenv(envBaseURL)), "/"),
		APIKey:  strings.TrimSpace(os.Getenv(envAPIKey)),
		Model:   strings.TrimSpace(os.Getenv(envModel)),
	}

	if missing := missingEnv(cfg); len(missing) > 0 {
		return nil, fmt.Errorf("missing required config: %s", strings.Join(missing, ", "))
	}

	return cfg, nil
}

func missingEnv(cfg *Config) []string {
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
