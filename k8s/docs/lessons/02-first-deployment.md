# 02 - 第一次 Kubernetes 部署

## 目标

构建镜像、加载到 Minikube，并观察 Deployment、ReplicaSet、Pod 和 Service。

## 核心概念

- Deployment 声明应用期望状态并管理 ReplicaSet。
- ReplicaSet 维持指定数量的 Pod。
- Pod 是 Kubernetes 中最小调度单位。
- ClusterIP Service 为变化的 Pod 提供稳定访问入口。

## 命令

```bash
make image
make image-load
make deploy
kubectl get deployment,replicaset,pod,service -n task-demo
kubectl describe deployment task-app -n task-demo
kubectl get endpointslice -n task-demo
kubectl logs -n task-demo deployment/task-app --tail=50
```

临时访问：

```bash
kubectl -n task-demo port-forward service/task-app 8080:80
```

## 预期观察

- Deployment 显示 `2/2` Ready。
- 两个应用 Pod 具有相同标签，但名称和 IP 不同。
- Service selector 匹配两个 Ready Pod。
- 镜像 pull policy 为 `Never`，因为镜像已加载到 Minikube。

## 检查问题

1. 删除一个应用 Pod 后，谁负责创建替代 Pod？
2. Service 为什么不直接绑定某个 Pod IP？
3. ReplicaSet 名称中的哈希与 Pod template 有什么关系？

## 重置

只移除应用层，保留数据库和 PVC：

```bash
make clean-workloads
```

恢复完整部署：

```bash
make deploy
```
