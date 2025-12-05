# 配置监听与业务整合案例

## 案例概述

这个案例展示了如何将 Nacos 配置中心的动态配置更新与 Go 微服务的业务逻辑整合，实现**不重启服务即可动态更新配置**。

## 核心机制

### 1. 配置监听器 (`common/config_listener.go`)

- **全局监听器实例**：维护一个全局的 `ConfigChangeListener` 用于管理配置变更回调
- **注册回调**：业务代码可以通过 `OnChange()` 方法注册配置变更处理函数
- **触发回调**：当 Nacos 中的配置发生变化时，轮询线程检测到变更后，调用 `Notify()` 触发所有回调

### 2. 轮询机制 (`common/nacos.go`)

- **HTTP API 轮询**：每 3 秒通过 HTTP 直接访问 Nacos API 获取最新配置
- **MD5 比对**：使用 MD5 哈希检测配置内容变化，高效且准确
- **自动通知**：检测到变更时自动调用监听器通知所有已注册的业务回调

## 业务整合示例 (用户服务)

### 服务配置结构

```go
type ServiceConfig struct {
 MaxRetries   int    `yaml:"max_retries"`      // 最大重试次数
 Timeout      int    `yaml:"timeout"`          // 超时时间(秒)
 LogLevel     string `yaml:"log_level"`        // 日志级别
 FeatureFlag  bool   `yaml:"feature_flag"`     // 功能开关
 RateLimitQPS int    `yaml:"rate_limit_qps"`   // QPS 限制
}
```

### 配置变更回调实现

```go
// 配置变更回调 - 在收到配置变更时执行
func configChangeCallback(configData string) error {
 // 1. 解析 YAML 配置
 var newConfig ServiceConfig
 if err := yaml.Unmarshal([]byte(configData), &newConfig); err != nil {
  return fmt.Errorf("解析配置失败: %v", err)
 }

 // 2. 验证配置（可选）
 if newConfig.MaxRetries < 1 || newConfig.MaxRetries > 10 {
  return fmt.Errorf("max_retries 必须在 1-10 之间")
 }

 // 3. 应用配置
 updateServiceConfig(newConfig)
 return nil
}
```

### 在 main() 中注册回调

```go
// 初始化 Nacos 客户端并发布配置
clients.PublishConfig(config)

// 注册配置变更回调
common.GetGlobalConfigListener().OnChange(config.Config.DataID, configChangeCallback)
```

### 业务代码中使用配置

```go
// 获取当前配置的安全副本
cfg := getServiceConfig()

// 使用配置进行业务操作
for attempt := 1; attempt <= cfg.MaxRetries; attempt++ {
 // 执行操作...
 // 使用 cfg.Timeout 设置超时
 // 根据 cfg.FeatureFlag 判断功能是否启用
}
```

## 测试流程

### 1. 启动服务

```bash
./start.sh stop && ./start.sh start
```

### 2. 运行演示脚本

```bash
./demo_config_integration.sh
```

演示脚本会：

1. 显示当前服务配置（maxRetries=3, timeout=30)
2. 执行业务操作（重试 3 次）
3. 更新 Nacos 中的配置（maxRetries=5, timeout=60）
4. 等待服务轮询检测变更
5. 显示更新后的配置
6. 再次执行业务操作（重试 5 次）

### 3. 查看效果

- 访问 `/config` 端点获取当前服务配置
- 访问 `/operation` 端点执行使用配置的业务操作
- 查看日志观察配置变更通知：`tail -f logs/user-1.log`

## 关键要点

### 线程安全

- 使用 `sync.RWMutex` 保护配置对象
- 读操作使用读锁，写操作使用写锁

### 配置隔离

- 配置变更回调异步执行，不阻塞轮询线程
- 错误处理不会影响其他回调执行

### 配置验证

- 在应用配置之前进行验证
- 如果验证失败，记录错误但保持原配置不变

### 性能考虑

- 3 秒轮询间隔平衡了实时性和性能
- MD5 比对避免不必要的回调触发
- HTTP API 轮询比 SDK 缓存更加可靠

## 扩展建议

1. **配置持久化**：在配置变更后保存到本地，重启时恢复
2. **灰度发布**：为不同实例应用不同配置
3. **配置版本管理**：跟踪配置变更历史
4. **监控告警**：配置变更时发送告警通知
5. **配置审计**：记录谁何时修改了什么配置

## 总结

通过配置监听器和业务回调的结合，你可以：

- ✅ 实现配置的**热更新**（无需重启服务）
- ✅ 保证**线程安全**（RWMutex 保护）
- ✅ 提供**灵活验证**（回调中验证配置）
- ✅ 支持**平滑过渡**（异步处理）
- ✅ **降低风险**（失败时保持原配置）
