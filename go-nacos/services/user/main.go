package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"go-nacos-demo/common"

	"gopkg.in/yaml.v2"
)

var users = map[int]common.User{
	1: {ID: 1, Name: "Alice", Email: "alice@example.com"},
	2: {ID: 2, Name: "Bob", Email: "bob@example.com"},
}

// ServiceConfig 服务配置（可动态更新）
type ServiceConfig struct {
	MaxRetries   int    `yaml:"max_retries"`
	Timeout      int    `yaml:"timeout"`
	LogLevel     string `yaml:"log_level"`
	FeatureFlag  bool   `yaml:"feature_flag"`
	RateLimitQPS int    `yaml:"rate_limit_qps"`
}

var (
	srvConfig = &ServiceConfig{
		MaxRetries:   3,
		Timeout:      30,
		LogLevel:     "info",
		FeatureFlag:  false,
		RateLimitQPS: 1000,
	}
	srvConfigMu sync.RWMutex
)

// 获取当前配置的副本
func getServiceConfig() ServiceConfig {
	srvConfigMu.RLock()
	defer srvConfigMu.RUnlock()
	return *srvConfig
}

// 更新服务配置
func updateServiceConfig(newConfig ServiceConfig) {
	srvConfigMu.Lock()
	defer srvConfigMu.Unlock()
	*srvConfig = newConfig
	fmt.Printf("✅ 服务配置已更新: MaxRetries=%d, Timeout=%d, LogLevel=%s, FeatureFlag=%v, RateLimitQPS=%d\n",
		newConfig.MaxRetries, newConfig.Timeout, newConfig.LogLevel, newConfig.FeatureFlag, newConfig.RateLimitQPS)
}

// 配置变更回调
func configChangeCallback(configData string) error {
	fmt.Printf("📋 收到配置变更通知，开始处理...\n")

	// 解析 YAML 配置
	var newConfig ServiceConfig
	if err := yaml.Unmarshal([]byte(configData), &newConfig); err != nil {
		return fmt.Errorf("解析配置失败: %v", err)
	}

	// 验证配置
	if newConfig.MaxRetries < 1 || newConfig.MaxRetries > 10 {
		return fmt.Errorf("max_retries 必须在 1-10 之间")
	}
	if newConfig.Timeout < 5 || newConfig.Timeout > 300 {
		return fmt.Errorf("timeout 必须在 5-300 之间")
	}

	// 应用配置
	updateServiceConfig(newConfig)
	fmt.Printf("✅ 配置变更处理完成\n")
	return nil
}

func main() {
	configFile := "config.yaml"
	if len(os.Args) > 1 {
		configFile = os.Args[1]
	}

	config, err := common.LoadConfigWithDefaults(configFile)
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		return
	}

	// 初始化Nacos客户端
	clients, err := common.InitNacosClients(config)
	if err != nil {
		fmt.Printf("Failed to init Nacos clients: %v\n", err)
		return
	}

	// 发布配置
	if err := clients.PublishConfig(config); err != nil {
		fmt.Printf("Failed to publish config: %v\n", err)
		return
	}

	// 注册配置变更回调
	common.GetGlobalConfigListener().OnChange(config.Config.DataID, configChangeCallback)
	fmt.Printf("✅ 配置变更回调已注册: %s\n", config.Config.DataID)

	// 注册服务
	if err := clients.RegisterService(config); err != nil {
		fmt.Printf("Failed to register service: %v\n", err)
		return
	}

	// API 路由
	// 获取用户详情
	http.HandleFunc("/user/", func(w http.ResponseWriter, r *http.Request) {
		idStr := r.URL.Path[len("/user/"):]
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}

		if user, exists := users[id]; exists {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(user)
		} else {
			http.Error(w, "User not found", http.StatusNotFound)
		}
	})

	// 创建用户
	http.HandleFunc("/user", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var user common.User
			body, _ := io.ReadAll(r.Body)
			json.Unmarshal(body, &user)
			user.ID = len(users) + 1
			users[user.ID] = user
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(user)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// 获取当前服务配置（调试端点）
	http.HandleFunc("/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(getServiceConfig())
	})

	// 模拟业务操作示例 - 演示如何使用动态配置
	http.HandleFunc("/operation", func(w http.ResponseWriter, r *http.Request) {
		cfg := getServiceConfig()

		// 使用当前配置进行操作
		var results []string
		for attempt := 1; attempt <= cfg.MaxRetries; attempt++ {
			results = append(results, fmt.Sprintf("尝试 %d/%d (超时: %ds)", attempt, cfg.MaxRetries, cfg.Timeout))
			time.Sleep(100 * time.Millisecond) // 模拟操作
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message":        "操作完成",
			"attempts":       results,
			"current_config": cfg,
		})
	})

	// 健康检查
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	common.StartServer(config.Service.Port, "用户")

	// 优雅退出
	clients.GracefulShutdown(config)
}
