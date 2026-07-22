# 08 - Helm 生命周期

## 目标

使用 values 渲染同一套资源，并练习 install、upgrade、history、rollback 和 uninstall。

## 核心概念

- Chart 是模板、默认 values 和元数据的集合。
- release 是 Chart 在某个 namespace 中的一次安装实例。
- values schema 在渲染前拒绝非法配置。
- hook 用于在 release 生命周期的特定阶段执行 Job。

## 命令

本项目使用 keg-only Helm 3，可通过 Makefile 自动定位：

```bash
make helm-test
make helm-install
make helm-status
kubectl get all,pvc,hpa -n task-demo-helm
```

升级副本数：

```bash
/opt/homebrew/opt/helm@3/bin/helm upgrade task-demo deploy/helm/task-app \
  --namespace task-demo-helm \
  --set ingress.enabled=false \
  --set replicaCount=3 \
  --wait \
  --timeout 5m
/opt/homebrew/opt/helm@3/bin/helm history task-demo -n task-demo-helm
```

回滚到 revision 1：

```bash
/opt/homebrew/opt/helm@3/bin/helm rollback task-demo 1 \
  --namespace task-demo-helm \
  --wait \
  --timeout 5m
```

卸载并删除练习 namespace：

```bash
make helm-uninstall
```

## 预期观察

- install 创建 revision 1，upgrade 创建 revision 2。
- migration Job 使用 `post-install,pre-upgrade` hook。
- upgrade 前 migration hook 先成功，然后 Deployment 滚动更新。
- rollback 创建新的 release revision，但内容恢复到旧配置。

迁移使用 `post-install` 而不是 `pre-install`：PostgreSQL 与应用在同一 Chart
中，pre-install 阶段数据库尚未创建。hook 的 init container 会等待数据库可用。

## 检查问题

1. Chart、release 和 revision 的区别是什么？
2. 为什么生产凭据不应放在默认 values 中？
3. Helm uninstall 是否一定删除 StatefulSet 创建的 PVC？
4. 原生 YAML 与 Helm 各自更适合学习路径的哪个阶段？

## 重置

```bash
make helm-uninstall
```

原生 YAML 环境位于独立 namespace `task-demo`，不会被该命令影响。
