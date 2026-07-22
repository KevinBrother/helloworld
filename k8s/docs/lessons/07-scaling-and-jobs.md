# 07 - 扩缩容、Job 与 CronJob

## 目标

练习手动扩缩容、HPA 指标、一次性 Job 和周期 CronJob。

## 核心概念

- 手动 scale 修改 Deployment 的目标副本数。
- HPA 根据 metrics API 和资源 request 计算目标副本数。
- Job 保证任务运行到完成。
- CronJob 按计划创建 Job，并控制并发和历史保留。

## 命令

手动扩容后恢复：

```bash
kubectl scale deployment/task-app -n task-demo --replicas=4
kubectl rollout status deployment/task-app -n task-demo --timeout=180s
kubectl get pods -n task-demo -l app.kubernetes.io/component=application
kubectl scale deployment/task-app -n task-demo --replicas=2
```

观察 HPA：

```bash
kubectl top pods -n task-demo
kubectl get hpa task-app -n task-demo
kubectl describe hpa task-app -n task-demo
```

运行一次 CronJob 模板：

```bash
kubectl create job --from=cronjob/task-cleanup task-cleanup-manual -n task-demo
kubectl wait --for=condition=complete job/task-cleanup-manual -n task-demo --timeout=120s
kubectl logs job/task-cleanup-manual -n task-demo
kubectl delete job task-cleanup-manual -n task-demo
```

检查 migration Job 与计划：

```bash
kubectl get job,cronjob -n task-demo
kubectl describe cronjob task-cleanup -n task-demo
```

## 预期观察

- Pod 数量随手动副本数变化，Service 无需修改。
- HPA 稍等片刻后显示具体 CPU 百分比，而不是 `<unknown>`。
- 手动 maintenance Job 成功完成。
- HPA 启用时可能把手动副本数调整回其计算值。

## 检查问题

1. HPA 为什么需要 CPU request？
2. Job 与长期运行的 Deployment 有什么不同？
3. `concurrencyPolicy: Forbid` 防止了什么问题？

## 重置

```bash
kubectl scale deployment/task-app -n task-demo --replicas=2
make verify
```
