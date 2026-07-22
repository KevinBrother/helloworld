# 03 - 配置与持久化

## 目标

理解 ConfigMap、Secret、StatefulSet、PVC 和 migration Job，并验证 Pod 重建后数据保留。

## 核心概念

- ConfigMap 存放非敏感配置。
- Secret 用于敏感值，但默认只是编码，不等于加密方案。
- StatefulSet 提供稳定名称和 volume claim。
- PVC 是应用对持久存储的声明。
- Job 适合必须成功完成一次的任务。

## 命令

```bash
kubectl get configmap,secret -n task-demo
kubectl get statefulset,pod,pvc,pv -n task-demo
kubectl get job task-app-migrate -n task-demo
kubectl logs -n task-demo job/task-app-migrate
kubectl describe pvc data-postgres-0 -n task-demo
```

先通过 UI 创建一条任务，然后删除数据库 Pod：

```bash
kubectl delete pod postgres-0 -n task-demo
kubectl wait --for=condition=Ready pod/postgres-0 -n task-demo --timeout=180s
kubectl get pvc data-postgres-0 -n task-demo
```

刷新 UI，确认任务仍存在。

## 预期观察

- StatefulSet 重建的 Pod 仍名为 `postgres-0`。
- PVC 名称和绑定的 PV 不变。
- PostgreSQL 重新启动后，应用 readiness 暂时失败，随后恢复。
- 任务数据仍存在。

## 检查问题

1. 删除 Pod、StatefulSet、PVC 分别会影响什么？
2. 为什么 StatefulSet 适合这个学习数据库，而 Deployment 不够直观？
3. 生产环境为什么通常不直接提交明文 Secret？

## 重置

保留数据时不要删除 PVC。彻底重置需要明确确认：

```bash
./scripts/cleanup-all.sh --yes-delete-data
make deploy
```
