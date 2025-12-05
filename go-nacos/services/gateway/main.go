package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"go-nacos-demo/common"

	"github.com/nacos-group/nacos-sdk-go/v2/model"
	"github.com/nacos-group/nacos-sdk-go/v2/vo"
)

func proxyToOrderService(namingClient interface{}, targetPath string, r *http.Request) (*http.Response, error) {
	// 类型断言
	client, ok := namingClient.(interface {
		SelectInstances(param vo.SelectInstancesParam) ([]model.Instance, error)
	})
	if !ok {
		return nil, fmt.Errorf("invalid naming client")
	}

	// 服务发现：获取订单服务实例
	instances, err := client.SelectInstances(vo.SelectInstancesParam{
		ServiceName: "order-service",
		GroupName:   "DEFAULT_GROUP",
		HealthyOnly: true,
	})
	if err != nil || len(instances) == 0 {
		return nil, fmt.Errorf("no order service instances available")
	}

	// 使用第一个实例
	instance := instances[0]
	url := fmt.Sprintf("http://%s:%d%s", instance.Ip, instance.Port, targetPath)

	// 读取请求体
	var body bytes.Buffer
	if r.Body != nil {
		io.Copy(&body, r.Body)
	}

	// 创建新的请求
	req, err := http.NewRequest(r.Method, url, &body)
	if err != nil {
		return nil, err
	}

	// 复制请求头
	for key, values := range r.Header {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	// 发送请求
	httpClient := &http.Client{}
	return httpClient.Do(req)
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

	// API 路由 - 代理到订单服务
	http.HandleFunc("/api/orders/", func(w http.ResponseWriter, r *http.Request) {
		targetPath := r.URL.Path[len("/api"):] // 移除 /api 前缀

		resp, err := proxyToOrderService(clients.NamingClient, targetPath, r)
		if err != nil {
			http.Error(w, fmt.Sprintf("Service unavailable: %v", err), http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		// 复制响应头
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// 复制响应体
		io.Copy(w, resp.Body)
	})

	http.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
		targetPath := r.URL.Path[len("/api"):] // 移除 /api 前缀

		resp, err := proxyToOrderService(clients.NamingClient, targetPath, r)
		if err != nil {
			http.Error(w, fmt.Sprintf("Service unavailable: %v", err), http.StatusServiceUnavailable)
			return
		}
		defer resp.Body.Close()

		// 复制响应头
		for key, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}
		w.WriteHeader(resp.StatusCode)

		// 复制响应体
		io.Copy(w, resp.Body)
	})

	// 健康检查
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// 网关首页
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"message": "Welcome to Nacos Microservices Gateway",
			"services": []string{
				"GET /api/orders/{id} - Get order with user info",
				"POST /api/orders - Create new order",
				"GET /health - Health check",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	common.StartServer(config.Service.Port, "网关")

	// 优雅退出
	clients.GracefulShutdown(config)
}
