package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"go-nacos-demo/common"
)

var users = map[int]common.User{
	1: {ID: 1, Name: "Alice", Email: "alice@example.com"},
	2: {ID: 2, Name: "Bob", Email: "bob@example.com"},
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

	// 注册服务
	if err := clients.RegisterService(config); err != nil {
		fmt.Printf("Failed to register service: %v\n", err)
		return
	}

	// API 路由
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

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", config.Service.Port),
		Handler: nil,
	}

	go func() {
		fmt.Printf("用户服务已启动在 :%d\n", config.Service.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("启动 HTTP 服务器失败: %v\n", err)
			os.Exit(1)
		}
	}()

	// 优雅退出
	clients.GracefulShutdown(config)
}
