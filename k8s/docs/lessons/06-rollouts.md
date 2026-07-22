# 06 - 滚动更新与回滚

## 目标

观察 Deployment revision，制造坏镜像发布，并使用 rollback 恢复。

## 核心概念

- 修改 Pod template 会创建新的 ReplicaSet 和 revision。
- rollout status 展示发布是否达到期望状态。
- rollout undo 将 Pod template 恢复到旧 revision。
- 本地镜像应使用不可变 tag 才能准确复现版本。

## 命令

先记录当前状态：

```bash
kubectl rollout history deployment/task-app -n task-demo
kubectl get replicaset -n task-demo
kubectl get deployment task-app -n task-demo -o jsonpath='{.spec.template.spec.containers[0].image}'; echo
```

制造坏镜像：

```bash
kubectl set image deployment/task-app app=task-app:missing -n task-demo
kubectl rollout status deployment/task-app -n task-demo --timeout=45s || true
kubectl get pods -n task-demo
kubectl describe pod -n task-demo -l app.kubernetes.io/component=application
```

回滚：

```bash
kubectl rollout undo deployment/task-app -n task-demo
kubectl rollout status deployment/task-app -n task-demo --timeout=180s
make verify
```

## 预期观察

- 新 Pod 为 `ErrImageNeverPull` 或类似镜像错误。
- 旧 ReplicaSet 仍保留可用 Pod，服务不中断。
- rollout history 增加 revision。
- undo 后 Deployment 再次达到 `2/2` Ready。

## 检查问题

1. 为什么仅重建相同 tag 的镜像不一定触发 rollout？
2. revision 与 ReplicaSet 的关系是什么？
3. 数据库 migration 不兼容回滚时，应用回滚为什么仍可能失败？

## 重置

```bash
make deploy
```
