package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/signal"
	"time"

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

func loadConfig(filename string) (*Config, error) {
	data, err := ioutil.ReadFile(filename)
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
	config, err := loadConfig("config.yaml")
	if err != nil {
		fmt.Printf("Failed to load config: %v\n", err)
		return
	}

	// ============ 1. 创建配置客户端（演示配置中心） ============
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

	// 发布一条配置（DataId = demo-config.yaml）
	configClient.PublishConfig(vo.ConfigParam{
		DataId:  config.Config.DataID,
		Group:   config.Config.Group,
		Content: config.Config.Content,
	})

	// 监听配置变更
	configClient.ListenConfig(vo.ConfigParam{
		DataId: config.Config.DataID,
		Group:  config.Config.Group,
		OnChange: func(namespace, group, dataId, data string) {
			fmt.Println("【配置中心】配置被修改了！")
			fmt.Println("新配置内容：\n", data)
		},
	})

	// ============ 2. 创建服务注册客户端 ============
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

	fmt.Printf("服务注册结果: %v\n", success)

	// ============ 3. 启动一个 HTTP 接口，验证被发现 ============
	http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello from Go + Nacos! 我被成功发现了！"))
	})

	go http.ListenAndServe(fmt.Sprintf(":%d", config.Service.Port), nil)
	fmt.Printf("HTTP 服务已启动在 :%d\n", config.Service.Port)

	// ============ 4. 每 5 秒查一次同名服务实例（演示服务发现） ============
	go func() {
		for {
			instances, _ := namingClient.SelectInstances(vo.SelectInstancesParam{
				ServiceName: config.Service.Name,
				GroupName:   config.Service.GroupName,
				HealthyOnly: true,
			})
			fmt.Printf("【服务发现】当前存活实例数: %d\n", len(instances))
			for _, ins := range instances {
				fmt.Printf("  → %s:%d weight=%.0f metadata=%v\n", ins.Ip, ins.Port, ins.Weight, ins.Metadata)
			}
			time.Sleep(5 * time.Second)
		}
	}()

	// ============ 5. 优雅退出 ============
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c

	// 程序退出时自动注销
	namingClient.DeregisterInstance(vo.DeregisterInstanceParam{
		Ip:          config.Service.IP,
		Port:        config.Service.Port,
		ServiceName: config.Service.Name,
		GroupName:   config.Service.GroupName,
		Ephemeral:   config.Service.Ephemeral,
	})
	fmt.Println("已从 Nacos 注销，拜拜~")
}
