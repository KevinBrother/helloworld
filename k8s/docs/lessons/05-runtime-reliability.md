# 05 - 探针与运行可靠性

## 目标

观察 startup、readiness、liveness、资源 requests/limits 和优雅终止行为。

## 核心概念

- startup probe 保护启动较慢的容器。
- readiness probe 决定 Pod 是否接收流量。
- liveness probe 判断进程是否需要重启。
- request 参与调度和 HPA 计算，limit 限制资源上限。
- termination grace period 给进程处理在途请求的时间。

## 命令

```bash
kubectl describe pod -n task-demo -l app.kubernetes.io/component=application
kubectl top pods -n task-demo
kubectl get deployment task-app -n task-demo -o jsonpath='{.spec.template.spec.containers[0].resources}'
kubectl delete pod -n task-demo -l app.kubernetes.io/component=application --wait=false
kubectl rollout status deployment/task-app -n task-demo --timeout=180s
```

制造一个可回滚的 readiness 失败：

```bash
kubectl patch deployment task-app -n task-demo --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/health/missing"}]'
kubectl get pods -n task-demo -w
kubectl get events -n task-demo --sort-by=.lastTimestamp
kubectl rollout undo deployment/task-app -n task-demo
kubectl rollout status deployment/task-app -n task-demo --timeout=180s
```

## 预期观察

- 新 Pod 进程保持 Running，但 readiness 为失败，不进入 Service endpoint。
- Deployment 因 `maxUnavailable: 0` 保留旧的可用副本。
- undo 后新 Pod 恢复 Ready。
- PostgreSQL 不可用时应用 live 仍可成功，ready 返回 503。

## 检查问题

1. readiness 失败为什么通常不应该触发容器重启？
2. liveness 检查数据库会带来什么级联风险？
3. `maxUnavailable: 0` 对容量和资源需求有什么影响？

## 重置

```bash
make deploy
make verify
```

节点磁盘故障排查：

```bash
minikube ssh -p k8s-demo -- df -h /var
kubectl logs -n task-demo postgres-0 --previous
```
