package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strconv"

	"github.com/nacos-group/nacos-sdk-go/v2/clients"
	"github.com/nacos-group/nacos-sdk-go/v2/common/constant"
	"github.com/nacos-group/nacos-sdk-go/v2/vo"
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

type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

var users = map[int]User{
	1: {ID: 1, Name: "Alice", Email: "alice@example.com"},
	2: {ID: 2, Name: "Bob", Email: "bob@example.com"},
}

func loadConfig(filename string) (*Config, error) {
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

func main() {
	configFile := "config.yaml"
	if len(os.Args) > 1 {
		configFile = os.Args[1]
	}

	config, err := loadConfig(configFile)
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		return
	}

	// 创建配置客户端
	configClient, _ := clients.NewConfigClient(
		vo.NacosClientParam{
			ServerConfigs: []constant.ServerConfig{{
				IpAddr: config.Nacos.ServerIP,
				Port:   config.Nacos.ServerPort,
			}},
			ClientConfig: &constant.ClientConfig{
				NamespaceId:    config.Nacos.Namespace,
				TimeoutMs:      config.Nacos.TimeoutMs,
				ListenInterval: config.Nacos.ListenInterval,
				CacheDir:       config.Nacos.CacheDir,
				LogDir:         config.Nacos.LogDir,
			},
		},
	)

	// 发布配置
	configClient.PublishConfig(vo.ConfigParam{
		DataId:  config.Config.DataID,
		Group:   config.Config.Group,
		Content: config.Config.Content,
	})

	// 创建服务注册客户端
	namingClient, _ := clients.NewNamingClient(
		vo.NacosClientParam{
			ServerConfigs: []constant.ServerConfig{{
				IpAddr: config.Nacos.ServerIP,
				Port:   config.Nacos.ServerPort,
			}},
			ClientConfig: &constant.ClientConfig{
				NamespaceId: config.Nacos.Namespace,
				CacheDir:    config.Nacos.CacheDir,
				LogDir:      config.Nacos.LogDir,
			},
		},
	)

	// 注册服务实例
	success, _ := namingClient.RegisterInstance(vo.RegisterInstanceParam{
		Ip:          config.Service.IP,
		Port:        config.Service.Port,
		ServiceName: config.Service.Name,
		Weight:      config.Service.Weight,
		Enable:      config.Service.Enable,
		Healthy:     config.Service.Healthy,
		Ephemeral:   config.Service.Ephemeral,
		Metadata:    config.Service.Metadata,
		GroupName:   config.Service.GroupName,
	})

	fmt.Printf("用户服务注册结果: %v\n", success)

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
			var user User
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

	go http.ListenAndServe(fmt.Sprintf(":%d", config.Service.Port), nil)
	fmt.Printf("用户服务已启动在 :%d\n", config.Service.Port)

	// 优雅退出
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c

	namingClient.DeregisterInstance(vo.DeregisterInstanceParam{
		Ip:          config.Service.IP,
		Port:        config.Service.Port,
		ServiceName: config.Service.Name,
		GroupName:   config.Service.GroupName,
		Ephemeral:   config.Service.Ephemeral,
	})
	fmt.Println("用户服务已注销")
}
