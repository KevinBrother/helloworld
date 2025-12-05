package common

import (
	"crypto/md5"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/nacos-group/nacos-sdk-go/v2/clients"
	"github.com/nacos-group/nacos-sdk-go/v2/common/constant"
	"github.com/nacos-group/nacos-sdk-go/v2/vo"
)

// calculateMD5 计算字符串的 MD5 哈希值
func calculateMD5(data string) string {
	hash := md5.Sum([]byte(data))
	return fmt.Sprintf("%x", hash)
}

// NacosClients 包含配置客户端和服务注册客户端
type NacosClients struct {
	ConfigClient interface {
		PublishConfig(param vo.ConfigParam) (bool, error)
		ListenConfig(param vo.ConfigParam) error
		GetConfig(param vo.ConfigParam) (string, error)
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

	// 监听配置变更
	err = nc.ConfigClient.ListenConfig(vo.ConfigParam{
		DataId: config.Config.DataID,
		Group:  config.Config.Group,
		OnChange: func(namespace, group, dataId, data string) {
			fmt.Printf("🔄 配置 %s 已更新:\n%s\n", dataId, data)
			// 注意：这里可以添加重新加载配置的逻辑，但需要小心线程安全
		},
	})
	if err != nil {
		return fmt.Errorf("failed to listen config: %v", err)
	}
	fmt.Printf("✅ 配置监听已启动: %s\n", config.Config.DataID)

	// 启动轮询检查配置变更（使用 HTTP API 直接轮询）
	fmt.Printf("✅ 配置轮询已启动: %s (通过 HTTP API)\n", config.Config.DataID)
	go func(nacosIP string, nacosPort uint64, dataId, group string) {
		defer func() {
			if r := recover(); r != nil {
				fmt.Printf("❌ 轮询异常: %v\n", r)
			}
		}()

		// 先获取初始配置
		initialURL := fmt.Sprintf("http://%s:%d/nacos/v1/cs/configs?dataId=%s&group=%s&tenant=", nacosIP, nacosPort, dataId, group)
		resp, err := http.Get(initialURL)
		if err != nil {
			fmt.Printf("⚠️  初始获取配置失败: %v\n", err)
			return
		}
		initialData, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		lastMD5 := calculateMD5(string(initialData))
		fmt.Printf("✅ 轮询初始 MD5: %s\n", lastMD5)

		for i := 0; i < 10000; i++ {
			time.Sleep(3 * time.Second)
			resp, err := http.Get(initialURL)
			if err != nil {
				continue
			}
			currentData, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			currentMD5 := calculateMD5(string(currentData))
			if currentMD5 != lastMD5 {
				fmt.Printf("🔄 配置 %s 已更新 (轮询 #%d, MD5变化: %s -> %s):\n%s\n", dataId, i, lastMD5, currentMD5, string(currentData))
				lastMD5 = currentMD5
				// 通知全局配置监听器
				GetGlobalConfigListener().Notify(dataId, string(currentData))
			}
		}
	}(config.Nacos.ServerIP, config.Nacos.ServerPort, config.Config.DataID, config.Config.Group)

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
