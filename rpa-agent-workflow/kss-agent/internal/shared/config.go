package shared

import (
	"kss-agent/internal/config"
)

type Config = config.Config

func LoadConfig() (*Config, error) {
	return config.Load()
}
