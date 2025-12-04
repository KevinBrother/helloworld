package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
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

type Payment struct {
	ID      int     `json:"id"`
	OrderID int     `json:"order_id"`
	Amount  float64 `json:"amount"`
	Status  string  `json:"status"`
	Method  string  `json:"method"`
}

var payments = map[int]Payment{
	1: {ID: 1, OrderID: 1, Amount: 100.0, Status: "completed", Method: "alipay"},
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

	fmt.Printf("支付服务注册结果: %v\n", success)

	// API 路由
	http.HandleFunc("/payment/", func(w http.ResponseWriter, r *http.Request) {
		idStr := r.URL.Path[len("/payment/"):]
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid payment ID", http.StatusBadRequest)
			return
		}

		if payment, exists := payments[id]; exists {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(payment)
		} else {
			http.Error(w, "Payment not found", http.StatusNotFound)
		}
	})

	http.HandleFunc("/payment", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var payment Payment
			body, _ := ioutil.ReadAll(r.Body)
			json.Unmarshal(body, &payment)
			payment.ID = len(payments) + 1
			payment.Status = "processing"
			payments[payment.ID] = payment

			// 模拟支付处理
			go func() {
				payment.Status = "completed"
				payments[payment.ID] = payment
				fmt.Printf("Payment %d completed\n", payment.ID)
			}()

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(payment)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	go http.ListenAndServe(fmt.Sprintf(":%d", config.Service.Port), nil)
	fmt.Printf("支付服务已启动在 :%d\n", config.Service.Port)

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
	fmt.Println("支付服务已注销")
}
