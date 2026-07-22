# 00 - 环境准备

## 目标

确认本机工具可用，创建专用 Minikube profile，并理解 context 与 namespace。

## 核心概念

- **cluster**：一组运行 Kubernetes 的节点和控制面。
- **context**：kubectl 当前使用的集群、用户和默认 namespace 组合。
- **namespace**：同一集群内的资源隔离边界。
- **profile**：Minikube 管理的一套独立本地集群配置。

## 命令

```bash
docker version
kubectl version --client
minikube version
CGO_ENABLED=0 GOTOOLCHAIN=local go version
make cluster-up
kubectl config current-context
kubectl get nodes -o wide
minikube addons list -p k8s-demo
```

## 预期观察

- 当前 context 是 `k8s-demo`。
- 节点 `k8s-demo` 状态为 `Ready`。
- `ingress` 与 `metrics-server` addon 为 enabled。
- 集群启动参数为 Docker driver、4 CPU、6144 MB 内存。

## 检查问题

1. `kubectl` 如何知道请求发给哪个集群？
2. context 与 namespace 分别解决什么问题？
3. 为什么这个 Demo 使用独立 profile，而不复用其他本地集群？

## 重置

停止但保留集群：

```bash
make cluster-down
```

重新启动：

```bash
make cluster-up
```
