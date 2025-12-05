package common

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"

	"github.com/nacos-group/nacos-sdk-go/v2/clients"
	"github.com/nacos-group/nacos-sdk-go/v2/common/constant"
	"github.com/nacos-group/nacos-sdk-go/v2/vo"
)

// NacosClients 包含配置客户端和服务注册客户端
type NacosClients struct {
	ConfigClient interface {
		PublishConfig(param vo.ConfigParam) (bool, error)
	}
	NamingClient interface {
		RegisterInstance(param vo.RegisterInstanceParam) (bool, error)
		DeregisterInstance(param vo.DeregisterInstanceParam) (bool, error)
	}
}

// InitNacosClients 初始化Nacos客户端
func InitNacosClients(config *Config) (*NacosClients, error) {
	// 创建配置客户端
	configClient, err := clients.NewConfigClient(
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
	if err != nil {
		return nil, fmt.Errorf("failed to create config client: %v", err)
	}

	// 创建服务注册客户端
	namingClient, err := clients.NewNamingClient(
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
	if err != nil {
		return nil, fmt.Errorf("failed to create naming client: %v", err)
	}

	return &NacosClients{
		ConfigClient: configClient,
		NamingClient: namingClient,
	}, nil
}

// PublishConfig 发布配置到Nacos
func (nc *NacosClients) PublishConfig(config *Config) error {
	success, err := nc.ConfigClient.PublishConfig(vo.ConfigParam{
		DataId:  config.Config.DataID,
		Group:   config.Config.Group,
		Content: config.Config.Content,
	})
	if err != nil {
		return fmt.Errorf("failed to publish config: %v", err)
	}
	if !success {
		return fmt.Errorf("publish config returned false")
	}
	fmt.Printf("✅ 配置发布成功: %s\n", config.Config.DataID)
	return nil
}

// RegisterService 注册服务到Nacos
func (nc *NacosClients) RegisterService(config *Config) error {
	success, err := nc.NamingClient.RegisterInstance(vo.RegisterInstanceParam{
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
	if err != nil {
		return fmt.Errorf("failed to register service: %v", err)
	}
	if !success {
		return fmt.Errorf("register service returned false")
	}
	fmt.Printf("✅ 服务注册成功: %s (端口: %d)\n", config.Service.Name, config.Service.Port)
	return nil
}

// StartServer 启动HTTP服务器
func StartServer(port uint64, serviceName string) {
	go func() {
		fmt.Printf("🚀 %s 服务已启动在 :%d\n", serviceName, port)
		if err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil); err != nil {
			fmt.Printf("❌ 服务器启动失败: %v\n", err)
		}
	}()
}

// GracefulShutdown 优雅退出
func (nc *NacosClients) GracefulShutdown(config *Config) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	<-c

	fmt.Printf("👋 正在注销服务: %s\n", config.Service.Name)
	nc.NamingClient.DeregisterInstance(vo.DeregisterInstanceParam{
		Ip:          config.Service.IP,
		Port:        config.Service.Port,
		ServiceName: config.Service.Name,
		GroupName:   config.Service.GroupName,
		Ephemeral:   config.Service.Ephemeral,
	})
	fmt.Println("👋 服务已注销")
}
