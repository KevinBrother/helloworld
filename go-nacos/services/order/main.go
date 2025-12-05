package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"

	"go-nacos-demo/common"

	"github.com/nacos-group/nacos-sdk-go/v2/model"
	"github.com/nacos-group/nacos-sdk-go/v2/vo"
)

var orders = map[int]common.Order{
	1: {ID: 1, UserID: 1, Amount: 100.0, Status: "pending"},
	2: {ID: 2, UserID: 2, Amount: 200.0, Status: "pending"},
}

// 使用 Nacos 服务发现调用用户服务
func getUserInfo(namingClient interface{}, userID int) (*common.User, error) {
	// 类型断言获取 naming client
	client, ok := namingClient.(interface {
		SelectInstances(param vo.SelectInstancesParam) ([]model.Instance, error)
	})
	if !ok {
		return nil, fmt.Errorf("invalid naming client type")
	}

	// 【Nacos 服务发现】从 Nacos 获取用户服务实例列表
	instances, err := client.SelectInstances(vo.SelectInstancesParam{
		ServiceName: "user-service",
		GroupName:   "DEFAULT_GROUP",
		HealthyOnly: true, // 只获取健康的实例
	})
	if err != nil {
		return nil, fmt.Errorf("failed to discover user service from Nacos: %v", err)
	}

	if len(instances) == 0 {
		return nil, fmt.Errorf("no healthy user service instances available")
	}

	// 简单负载均衡：使用第一个实例
	instance := instances[0]
	url := fmt.Sprintf("http://%s:%d/user/%d", instance.Ip, instance.Port, userID)

	fmt.Printf("📞 订单服务通过 Nacos 发现用户服务: %s:%d\n", instance.Ip, instance.Port)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to call user service: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("user service returned status %d", resp.StatusCode)
	}

	var user common.User
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %v", err)
	}

	err = json.Unmarshal(body, &user)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal user data: %v", err)
	}

	return &user, nil
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
	// 获取订单详情（会调用用户服务）
	http.HandleFunc("/order/", func(w http.ResponseWriter, r *http.Request) {
		idStr := r.URL.Path[len("/order/"):]
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid order ID", http.StatusBadRequest)
			return
		}

		if order, exists := orders[id]; exists {
			// 【服务依赖】订单服务调用用户服务获取用户信息
			user, err := getUserInfo(clients.NamingClient, order.UserID)
			if err != nil {
				fmt.Printf("⚠️  获取用户信息失败: %v\n", err)
				user = &common.User{ID: order.UserID, Name: "Unknown", Email: "unknown@example.com"}
			}

			response := struct {
				Order common.Order `json:"order"`
				User  common.User  `json:"user"`
			}{
				Order: order,
				User:  *user,
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		} else {
			http.Error(w, "Order not found", http.StatusNotFound)
		}
	})

	// 创建订单
	http.HandleFunc("/order", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			var order common.Order
			body, _ := io.ReadAll(r.Body)
			json.Unmarshal(body, &order)
			order.ID = len(orders) + 1
			order.Status = "pending"
			orders[order.ID] = order
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(order)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// 更新订单状态（供支付服务调用）
	http.HandleFunc("/order/status/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "PUT" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		idStr := r.URL.Path[len("/order/status/"):]
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "Invalid order ID", http.StatusBadRequest)
			return
		}

		var req struct {
			Status string `json:"status"`
		}
		body, _ := io.ReadAll(r.Body)
		json.Unmarshal(body, &req)

		if order, exists := orders[id]; exists {
			order.Status = req.Status
			orders[id] = order

			fmt.Printf("📝 订单 %d 状态更新为: %s\n", id, req.Status)

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(order)
		} else {
			http.Error(w, "Order not found", http.StatusNotFound)
		}
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	common.StartServer(config.Service.Port, "订单")

	// 优雅退出
	clients.GracefulShutdown(config)
}
