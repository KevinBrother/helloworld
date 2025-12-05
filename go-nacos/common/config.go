package common

import (
	"os"

	"gopkg.in/yaml.v2"
)

type Config struct {
	Nacos struct {
		ServerIP       string `yaml:"server_ip"`
		ServerPort     uint64 `yaml:"server_port"`
		Namespace      string `yaml:"namespace"`
		TimeoutMs      uint64 `yaml:"timeout_ms"`
		ListenInterval uint64 `yaml:"listen_interval"`
		CacheDir       string `yaml:"cache_dir"`
		LogDir         string `yaml:"log_dir"`
	} `yaml:"nacos"`
	Service struct {
		Name      string            `yaml:"name"`
		IP        string            `yaml:"ip"`
		Port      uint64            `yaml:"port"`
		Weight    float64           `yaml:"weight"`
		Enable    bool              `yaml:"enable"`
		Healthy   bool              `yaml:"healthy"`
		Ephemeral bool              `yaml:"ephemeral"`
		GroupName string            `yaml:"group_name"`
		Metadata  map[string]string `yaml:"metadata"`
	} `yaml:"service"`
	Config struct {
		DataID  string `yaml:"data_id"`
		Group   string `yaml:"group"`
		Content string `yaml:"content"`
	} `yaml:"config"`
}

func LoadConfig(filename string) (*Config, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var config Config
	err = yaml.Unmarshal(data, &config)
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// LoadConfigWithDefaults loads the default config from common/config.yaml and merges with service-specific config
func LoadConfigWithDefaults(serviceConfigFile string) (*Config, error) {
	// Load default config
	defaultConfig, err := LoadConfig("common/config.yaml")
	if err != nil {
		return nil, err
	}

	// Load service-specific config
	serviceConfig, err := LoadConfig(serviceConfigFile)
	if err != nil {
		return nil, err
	}

	// Merge: service-specific overrides defaults
	merged := defaultConfig

	// Override nacos if specified
	if serviceConfig.Nacos.ServerIP != "" {
		merged.Nacos = serviceConfig.Nacos
	}

	// Always override service
	merged.Service = serviceConfig.Service

	// Override config if specified
	if serviceConfig.Config.DataID != "" {
		merged.Config = serviceConfig.Config
	}

	return merged, nil
}
