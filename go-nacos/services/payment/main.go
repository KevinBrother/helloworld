package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/signal"
	"strconv"

	"go-nacos-demo/common"

	"github.com/nacos-group/nacos-sdk-go/v2/clients"
	"github.com/nacos-group/nacos-sdk-go/v2/common/constant"
	"github.com/nacos-group/nacos-sdk-go/v2/model"
	"github.com/nacos-group/nacos-sdk-go/v2/vo"
)

var payments = map[int]common.Payment{
	1: {ID: 1, OrderID: 1, Amount: 100.0, Status: "completed", Method: "alipay"},
}

// 【Nacos 服务发现】通过 Nacos 获取订单服务并调用
func getOrderInfo(namingClient interface{}, orderID int) (*common.Order, error) {
	// 类型断言获取 naming client
	client, ok := namingClient.(interface {
		SelectInstances(param vo.SelectInstancesParam) ([]model.Instance, error)
	})
	if !ok {
		return nil, fmt.Errorf("invalid naming client type")
	}

	// 【Nacos 服务发现】从 Nacos 获取订单服务实例列表
	instances, err := client.SelectInstances(vo.SelectInstancesParam{
		ServiceName: "order-service",
		GroupName:   "DEFAULT_GROUP",
		HealthyOnly: true, // 只获取健康的实例
	})
	if err != nil {
		return nil, fmt.Errorf("failed to discover order service from Nacos: %v", err)
	}

	if len(instances) == 0 {
		return nil, fmt.Errorf("no healthy order service instances available")
	}

	// 简单负载均衡：使用第一个实例
	instance := instances[0]
	url := fmt.Sprintf("http://%s:%d/order/%d", instance.Ip, instance.Port, orderID)

	fmt.Printf("📞 支付服务通过 Nacos 发现订单服务: %s:%d\n", instance.Ip, instance.Port)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to call order service: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("order service returned status %d", resp.StatusCode)
	}

	var result struct {
		Order common.Order `json:"order"`
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	err = json.Unmarshal(body, &result)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal order data: %v", err)
	}

	return &result.Order, nil
}

// 【服务依赖】更新订单状态
func updateOrderStatus(namingClient interface{}, orderID int, status string) error {
	// 类型断言获取 naming client
	client, ok := namingClient.(interface {
		SelectInstances(param vo.SelectInstancesParam) ([]model.Instance, error)
	})
	if !ok {
		return fmt.Errorf("invalid naming client type")
	}

	// 【Nacos 服务发现】从 Nacos 获取订单服务实例列表
	instances, err := client.SelectInstances(vo.SelectInstancesParam{
		ServiceName: "order-service",
		GroupName:   "DEFAULT_GROUP",
		HealthyOnly: true,
	})
	if err != nil {
		return fmt.Errorf("failed to discover order service: %v", err)
	}

	if len(instances) == 0 {
		return fmt.Errorf("no order service instances available")
	}

	instance := instances[0]
	url := fmt.Sprintf("http://%s:%d/order/status/%d", instance.Ip, instance.Port, orderID)

	reqBody, _ := json.Marshal(map[string]string{"status": status})
	req, _ := http.NewRequest("PUT", url, bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	fmt.Printf("📞 支付服务调用订单服务更新状态: %s -> %s\n", url, status)

	client2 := &http.Client{}
	resp, err := client2.Do(req)
	if err != nil {
		return fmt.Errorf("failed to update order status: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to update order status, code: %d", resp.StatusCode)
	}

	return nil
}

func main() {
	// 支持从命令行参数指定配置文件
	configFile := "config.yaml"
	if len(os.Args) > 1 {
		configFile = os.Args[1]
	}

	config, err := common.LoadConfigWithDefaults(configFile)
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

	// 【Nacos 服务注册】注册支付服务到 Nacos
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

	fmt.Printf("✅ 支付服务注册到 Nacos: %v (端口: %d)\n", success, config.Service.Port)

	// API 路由
	// 获取支付详情
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

	// 创建支付（会调用订单服务验证订单）
	http.HandleFunc("/payment", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var payment common.Payment
			body, _ := io.ReadAll(r.Body)
			json.Unmarshal(body, &payment)

			// 【服务依赖】支付前先验证订单是否存在
			order, err := getOrderInfo(namingClient, payment.OrderID)
			if err != nil {
				fmt.Printf("⚠️  验证订单失败: %v\n", err)
				http.Error(w, fmt.Sprintf("Invalid order: %v", err), http.StatusBadRequest)
				return
			}

			// 验证金额是否匹配
			if payment.Amount != order.Amount {
				http.Error(w, "Payment amount does not match order amount", http.StatusBadRequest)
				return
			}

			fmt.Printf("💳 创建支付: 订单ID=%d, 金额=%.2f\n", payment.OrderID, payment.Amount)

			payment.ID = len(payments) + 1
			payment.Status = "processing"
			payments[payment.ID] = payment

			// 模拟支付处理
			go func(p common.Payment) {
				// 模拟支付延迟
				// time.Sleep(2 * time.Second)

				p.Status = "completed"
				payments[p.ID] = p
				fmt.Printf("✅ 支付 %d 完成\n", p.ID)

				// 【服务依赖】支付成功后更新订单状态
				err := updateOrderStatus(namingClient, p.OrderID, "paid")
				if err != nil {
					fmt.Printf("⚠️  更新订单状态失败: %v\n", err)
				} else {
					fmt.Printf("✅ 订单 %d 状态已更新为 paid\n", p.OrderID)
				}
			}(payment)

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
	fmt.Printf("🚀 支付服务已启动在 :%d\n", config.Service.Port)

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
	fmt.Println("👋 支付服务已注销")
}
