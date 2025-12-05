package common

import (
	"fmt"
	"sync"
)

// ConfigChangeListener 配置变更监听器
type ConfigChangeListener struct {
	mu            sync.RWMutex
	callbacks     map[string][]func(data string) error
	currentConfig map[string]string
}

// NewConfigChangeListener 创建新的配置变更监听器
func NewConfigChangeListener() *ConfigChangeListener {
	return &ConfigChangeListener{
		callbacks:     make(map[string][]func(data string) error),
		currentConfig: make(map[string]string),
	}
}

// OnChange 注册配置变更回调
func (ccl *ConfigChangeListener) OnChange(dataId string, callback func(data string) error) {
	ccl.mu.Lock()
	defer ccl.mu.Unlock()
	ccl.callbacks[dataId] = append(ccl.callbacks[dataId], callback)
}

// Notify 触发配置变更通知
func (ccl *ConfigChangeListener) Notify(dataId, newData string) {
	ccl.mu.RLock()
	callbacks := ccl.callbacks[dataId]
	ccl.mu.RUnlock()

	for _, callback := range callbacks {
		go func(cb func(data string) error) {
			if err := cb(newData); err != nil {
				fmt.Printf("⚠️  配置变更回调处理失败 [%s]: %v\n", dataId, err)
			}
		}(callback)
	}

	ccl.mu.Lock()
	ccl.currentConfig[dataId] = newData
	ccl.mu.Unlock()
}

// GetCurrentConfig 获取当前配置
func (ccl *ConfigChangeListener) GetCurrentConfig(dataId string) string {
	ccl.mu.RLock()
	defer ccl.mu.RUnlock()
	return ccl.currentConfig[dataId]
}

// 全局配置监听器实例
var globalConfigListener *ConfigChangeListener

func init() {
	globalConfigListener = NewConfigChangeListener()
}

// GetGlobalConfigListener 获取全局配置监听器
func GetGlobalConfigListener() *ConfigChangeListener {
	return globalConfigListener
}
