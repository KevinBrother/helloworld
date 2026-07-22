# 04 - Service 与 Ingress

## 目标

比较 port-forward、ClusterIP Service 和 Ingress 三种访问路径。

## 核心概念

- port-forward 是开发调试通道，不是对外服务方案。
- ClusterIP 只在集群网络内提供稳定地址。
- Ingress 根据 host/path 将 HTTP 请求转发到 Service。
- Ingress 资源需要 Ingress Controller 才会生效。

## 命令

```bash
kubectl get service,endpointslice,ingress -n task-demo
kubectl describe ingress task-app -n task-demo
minikube addons list -p k8s-demo
minikube ip -p k8s-demo
```

调试访问：

```bash
kubectl -n task-demo port-forward service/task-app 8080:80
```

Ingress 访问需要将 Minikube IP 与 `task-demo.local` 写入 `/etc/hosts`：

```bash
curl --fail --resolve task-demo.local:80:$(minikube ip -p k8s-demo) http://task-demo.local/health/ready
```

macOS Docker driver 无法直达时，另开终端运行：

```bash
minikube tunnel -p k8s-demo
```

## 预期观察

- Ingress address 最终显示 Minikube IP。
- 使用正确 Host header 时请求进入 `task-app` Service。
- Service 的 EndpointSlice 只包含 Ready Pod。

## 检查问题

1. Ingress 与 Service 分别位于哪一层？
2. 为什么浏览器访问时需要本地域名解析？
3. Pod readiness 失败后，Service endpoint 会发生什么？

## 重置

停止 `kubectl port-forward` 或 `minikube tunnel` 即可，不需要删除资源。
