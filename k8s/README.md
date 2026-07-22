# Kubernetes Task Demo

这是一个从 Docker Compose 逐步学习到 Kubernetes 和 Helm 的完整本地项目。
应用是 Go 1.22 编写的任务管理器，数据存储在 PostgreSQL 16 中。

## 你会学到什么

- 构建并加载本地容器镜像
- 使用 Deployment、Service、ConfigMap 和 Secret
- 使用 StatefulSet 与 PVC 保存数据库数据
- 使用 Job 执行迁移，使用 CronJob 执行维护任务
- 配置健康检查、资源限制、滚动更新、回滚和 HPA
- 将验证过的原生 YAML 打包为 Helm Chart

## 前置工具

需要 Docker Desktop、Go 1.22、kubectl、Minikube、curl 和 Helm 3。

```bash
docker version
go version
kubectl version --client
minikube version
/opt/homebrew/opt/helm@3/bin/helm version --short
```

如果 macOS 使用 Homebrew：

```bash
brew install kubectl minikube helm@3
```

## 五步启动

以下命令都从仓库根目录执行：

```bash
make cluster-up
make deploy
make verify
make status
kubectl -n task-demo port-forward service/task-app 8080:80
```

保持最后一个命令运行，然后打开 `http://127.0.0.1:8080`。

Ingress 地址为 `task-demo.local`。运行 `minikube ip -p k8s-demo` 获取 IP，
将其与主机名写入 `/etc/hosts` 后即可访问；Docker driver 在 macOS 上也可能
需要 `minikube tunnel -p k8s-demo`。

## 架构

```text
Browser
  -> Ingress
  -> task-app Service
  -> Go Deployment (2+ Pods)
  -> postgres Service
  -> PostgreSQL StatefulSet
  -> PersistentVolumeClaim
```

迁移由一次性 Job 执行，已完成任务的历史清理由 CronJob 执行。HPA 根据应用
Pod 的 CPU request 百分比在 2 到 6 个副本之间伸缩。

## 常用命令

```bash
make test
make compose-up
APP_PORT=18081 POSTGRES_PORT=55433 make compose-up
make image
make deploy
make verify
make status
make helm-test
make helm-install
make helm-status
```

查看运行状态和故障证据：

```bash
kubectl get all,pvc,ingress,hpa -n task-demo
kubectl get events -n task-demo --sort-by=.lastTimestamp
kubectl logs -n task-demo deployment/task-app
kubectl logs -n task-demo statefulset/postgres
kubectl top pods -n task-demo
```

## 目录

```text
cmd/                    可执行程序：server 与 migrate
internal/               领域、配置、HTTP、PostgreSQL 模块
web/                    嵌入式模板、CSS 和 JavaScript
migrations/             数据库迁移
deploy/k8s/             原生 Kubernetes YAML
deploy/helm/task-app/   Helm Chart
deploy/minikube/        本地集群配置说明
scripts/                部署、验证、状态和清理脚本
docs/lessons/           分阶段学习课程
```

## 清理

只移除应用工作负载，保留 PostgreSQL 和 PVC：

```bash
make clean-workloads
```

删除整个 namespace 和数据，必须明确确认：

```bash
./scripts/cleanup-all.sh --yes-delete-data
```

删除独立的 Helm 练习环境：

```bash
make helm-uninstall
```

如果 Minikube 内出现 `No space left on device`，先检查：

```bash
minikube ssh -p k8s-demo -- df -h /var
docker system df
```

不要在不清楚影响范围时执行宿主机全局 `docker system prune`。

## 学习路线

1. [00 - 环境准备](docs/lessons/00-prerequisites.md)
2. [01 - 应用基线与 Compose](docs/lessons/01-application-baseline.md)
3. [02 - 第一次 Kubernetes 部署](docs/lessons/02-first-deployment.md)
4. [03 - 配置与持久化](docs/lessons/03-config-and-persistence.md)
5. [04 - Service 与 Ingress](docs/lessons/04-network-access.md)
6. [05 - 探针与运行可靠性](docs/lessons/05-runtime-reliability.md)
7. [06 - 滚动更新与回滚](docs/lessons/06-rollouts.md)
8. [07 - 扩缩容、Job 与 CronJob](docs/lessons/07-scaling-and-jobs.md)
9. [08 - Helm 生命周期](docs/lessons/08-helm.md)

说明：这个 PostgreSQL 是学习用途的单副本 StatefulSet，不是生产级高可用方案。
