# Workflow Storage And Deployment Design

## 目标

当前项目已经从原型进入工程化阶段。后续要接入 MySQL 存储运行输出、设计数据库表，并提供 Docker 部署方案。重构目标不是把数据库逻辑塞进现有 HTTP handler，而是建立稳定边界，让 CLI 和 API 作为两个入口复用同一份应用实现。

本设计只定义架构和落地顺序，不实现代码。

## 核心原则

1. CLI 和 API 是两个入口，实现必须共用同一份应用层。
2. executor 保持纯运行内核，不依赖 HTTP、MySQL、文件系统持久化或 Docker 环境。
3. workflow 的读取、保存、版本管理通过 Repository 边界隔离。
4. 运行记录、事件流、最终输出和错误必须可追溯、可查询、可审计。
5. 文件存储保留为开发和兼容模式，MySQL 作为生产存储。
6. Docker 部署只组合已解耦的服务，不承担业务逻辑分流。

## 目标分层

```text
apps/cli/rpawf
  CLI 入口：参数解析、stdout/stderr、退出码

apps/server/rpawf-server
  API 入口：HTTP 监听、路由、中间件、配置装载

internal/workflowapp
  应用层：打开流程、读取状态、应用编辑、运行流程、查询运行历史

internal/workflowrepo
  Workflow 仓储：FileWorkflowRepository、MySQLWorkflowRepository

internal/runrepo
  Run 仓储：运行实例、运行事件、最终结果、错误信息

internal/blockcatalog
  Block catalog 装载和快照

compiler/go/*
  契约、校验、投影、编译、执行，不感知存储和入口协议
```

## CLI 和 API 的关系

CLI 和 API 不各写一套业务逻辑。两者只做协议适配，然后调用 `workflowapp`。

示例关系：

```text
rpawf exec <workflow-id>
  -> workflowapp.RunWorkflow(ctx, request)
  -> WorkflowRepository.Get(...)
  -> executor.RunWorkflow(...)
  -> RunRepository.SaveResult(...)

POST /api/workflows/{workflowId}/runs
  -> workflowapp.RunWorkflow(ctx, request)
  -> WorkflowRepository.Get(...)
  -> executor.RunWorkflow(...)
  -> RunRepository.SaveResult(...)
```

区别只在输出形式：

- CLI 输出 JSON 到 stdout，并用退出码表达成功失败。
- API 返回 JSON 或 SSE，并用 HTTP status 表达协议层状态。

## Repository 概念

`WorkflowRepository` 是 workflow 的数据访问边界。应用层只知道要按 ID 读取、保存、列出或创建 workflow，不关心底层是 `ast.json` 还是 MySQL。

建议接口能力：

```go
type WorkflowRepository interface {
    Get(ctx context.Context, workflowID string) (ast.Workflow, error)
    SaveDraft(ctx context.Context, workflow ast.Workflow, source EditSource) (WorkflowVersion, error)
    List(ctx context.Context, query WorkflowQuery) ([]WorkflowSummary, error)
    GetVersion(ctx context.Context, workflowID string, version int) (ast.Workflow, error)
}
```

文件实现用于兼容当前开发模式：

```text
FileWorkflowRepository
  读取和写入 ast.json
  不负责生产级版本管理
  适合本地调试、示例 workflow、过渡阶段
```

MySQL 实现用于生产：

```text
MySQLWorkflowRepository
  存储 workflow 元信息
  存储每次 AST 版本
  记录 edit operation
  支持按 workflowId 读取当前版本
```

## MySQL 表设计

### workflows

存 workflow 的稳定身份和当前版本指针。

```text
id                 bigint unsigned primary key
workflow_id        varchar(128) not null unique
name               varchar(255) not null
current_version    int not null default 1
status             varchar(32) not null
created_at         datetime(6) not null
updated_at         datetime(6) not null
```

### workflow_versions

存不可变 AST 版本。每次保存生成新版本，运行时绑定具体版本，保证历史结果可复现。

```text
id                 bigint unsigned primary key
workflow_id        varchar(128) not null
version            int not null
schema_version     varchar(32) not null
ast_json           json not null
created_by         varchar(128) null
created_at         datetime(6) not null
unique(workflow_id, version)
```

### workflow_edit_operations

存用户编辑操作，用于审计、排查和后续回放。

```text
id                 bigint unsigned primary key
operation_id       varchar(128) not null unique
workflow_id        varchar(128) not null
base_version       int not null
next_version       int not null
operation_type     varchar(64) not null
target_node_id     varchar(128) null
path               varchar(512) null
payload_json       json not null
created_at         datetime(6) not null
```

### workflow_runs

存一次运行的生命周期、输入、最终输出和错误摘要。

```text
id                 bigint unsigned primary key
run_id             varchar(128) not null unique
workflow_id        varchar(128) not null
workflow_version   int not null
status             varchar(32) not null
inputs_json        json null
returns_json       json null
variables_json     json null
state_json         json null
node_outputs_json  json null
error_code         varchar(128) null
error_message      text null
started_at         datetime(6) not null
finished_at        datetime(6) null
created_at         datetime(6) not null
```

### workflow_run_events

存 executor 事件流。SSE 可以实时发送，MySQL 同步写入或批量写入。

```text
id                 bigint unsigned primary key
run_id             varchar(128) not null
sequence           int not null
event_name         varchar(128) not null
workflow_id        varchar(128) null
statement_id       varchar(128) null
statement_kind     varchar(64) null
payload_json       json null
created_at         datetime(6) not null
unique(run_id, sequence)
index(run_id, sequence)
index(statement_id)
```

### workflow_run_block_snapshots

存运行时 block manifest 快照，避免未来 block catalog 变化后无法解释历史运行。

```text
id                 bigint unsigned primary key
run_id             varchar(128) not null
block_id           varchar(128) not null
manifest_json      json not null
created_at         datetime(6) not null
unique(run_id, block_id)
```

## 运行事件持久化

executor 已经有 `Recorder` 边界。不要让 executor 写数据库。运行服务负责组合 recorder：

```text
SSERecorder
  实时推送给前端

MySQLRunRecorder
  写 workflow_run_events

CompositeRecorder
  同时调用多个 recorder
```

运行流程：

```text
1. workflowapp 创建 run_id，写 workflow_runs(status=running)
2. 读取 workflow 当前版本和 block catalog
3. 保存 block snapshot
4. 调用 executor.RunWorkflow(...)
5. Recorder 持续写事件
6. 成功时写 returns、variables、state、nodeOutputs，status=success
7. 失败时写 error_code、error_message，status=failed
```

## API 形态

保留现有 Next.js 代理 Go 服务的方式。前端不直连 MySQL。

建议资源模型：

```text
GET    /api/workflows
POST   /api/workflows
GET    /api/workflows/{workflowId}
POST   /api/workflows/{workflowId}/edits
POST   /api/workflows/{workflowId}/runs
GET    /api/workflows/{workflowId}/runs
GET    /api/workflows/{workflowId}/runs/{runId}
GET    /api/workflows/{workflowId}/runs/{runId}/events
GET    /api/workflows/{workflowId}/runs/stream?inputs=...
GET    /api/blocks
```

兼容期可以保留当前接口：

```text
GET  /api/workflow
POST /api/edit
GET  /api/run/stream
```

但内部也要走 `workflowapp`，不要继续依赖内存中的单个 workflow。

## Docker 部署

开发环境：

```text
docker-compose.dev.yml
  mysql
  rpawf-server
  web
```

生产环境：

```text
docker-compose.yml
  mysql
  rpawf-server
  web standalone build
```

建议环境变量：

```text
RPAWF_STORAGE_DRIVER=mysql
RPAWF_DATABASE_URL=...
RPAWF_BLOCK_CATALOG_PATH=/app/sdks/block
RPAWF_HTTP_ADDR=0.0.0.0:8787
WORKFLOW_SERVICE_URL=http://rpawf-server:8787
```

迁移工具建议使用 `goose` 或 `golang-migrate`，migration 文件放在：

```text
internal/storage/mysql/migrations
```

## 分阶段落地

### 第一阶段：抽应用层和文件仓储

- 从 `apps/cli/rpawf/serve.go` 抽出业务逻辑到 `internal/workflowapp`。
- 增加 `FileWorkflowRepository`，保持当前 `ast.json` 行为不变。
- CLI 和 API 都调用 `workflowapp`。
- 现有测试保持通过。

### 第二阶段：运行记录边界

- 增加 `RunRepository`。
- 增加 `CompositeRecorder`。
- API 运行和 CLI 运行都生成 `run_id`。
- 文件模式下可以先用内存 run repo，MySQL 阶段再持久化。

### 第三阶段：MySQL 存储

- 增加 migration。
- 实现 `MySQLWorkflowRepository`。
- 实现 `MySQLRunRepository`。
- 增加仓储集成测试。
- 增加导入现有 `ast.json` 的 CLI 命令。

### 第四阶段：Docker 部署

- 增加 Go server Dockerfile。
- 增加 Web Dockerfile 或 Next standalone 构建。
- 增加 compose 文件。
- 增加 `.env.example`。
- README 增加部署命令。

## 明确不做

- 不让 executor 直接依赖 MySQL。
- 不让 Next.js API route 直接读写 MySQL。
- 不在 CLI 和 API 中复制运行、编辑、校验逻辑。
- 不把 `ast.json` 文件模式立即删除。
- 不把 Docker compose 写成唯一开发方式。

## 验收标准

1. 文档明确 CLI/API 双入口和共享应用层边界。
2. 文档明确 WorkflowRepository、RunRepository、Recorder 的职责。
3. 文档给出 MySQL 表结构草案。
4. 文档给出 Docker 部署边界。
5. 文档给出可分阶段实施顺序。
