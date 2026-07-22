# Kubernetes Task Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Go and PostgreSQL task manager that teaches the local Kubernetes engineering workflow on Minikube from native manifests through Helm.

**Architecture:** A modular Go monolith serves a server-rendered UI, REST API, and health endpoints. PostgreSQL is accessed through a repository interface and deployed as a single-replica StatefulSet with persistent storage; Kubernetes configuration is introduced progressively and later packaged as a Helm chart.

**Tech Stack:** Go 1.22, `net/http`, `html/template`, pgx v5, PostgreSQL 16, vanilla JavaScript/CSS, Docker Compose, Minikube, Kubernetes YAML, Helm 3.

**Execution constraint:** Work directly in the current directory. Do not create a worktree, commit, or push unless the user explicitly requests it.

---

## File Map

Application:

- `go.mod`: module and dependency versions.
- `cmd/server/main.go`: application composition and graceful HTTP lifecycle.
- `cmd/migrate/main.go`: database migration command used locally and by a Kubernetes Job.
- `internal/config/config.go`: environment configuration parsing and validation.
- `internal/task/model.go`: task types, statuses, and input types.
- `internal/task/repository.go`: persistence interface and shared errors.
- `internal/task/service.go`: task use cases and business validation.
- `internal/postgres/repository.go`: pgx task repository.
- `internal/postgres/migrate.go`: ordered embedded SQL migration runner.
- `internal/httpserver/server.go`: routes, middleware, and handler dependencies.
- `internal/httpserver/api.go`: JSON API handlers.
- `internal/httpserver/pages.go`: HTML page handlers.
- `internal/httpserver/health.go`: liveness and readiness handlers.
- `internal/httpserver/respond.go`: shared response and error mapping.

Tests:

- `internal/task/service_test.go`: business rules.
- `internal/config/config_test.go`: configuration parsing.
- `internal/postgres/repository_integration_test.go`: PostgreSQL CRUD and persistence mapping.
- `internal/postgres/migrate_integration_test.go`: migration idempotency.
- `internal/httpserver/api_test.go`: API contract.
- `internal/httpserver/pages_test.go`: page rendering.
- `internal/httpserver/health_test.go`: probe behavior.

UI:

- `web/embed.go`: embeds templates and static assets.
- `web/templates/index.html`: task manager page.
- `web/static/app.css`: responsive visual system and component states.
- `web/static/app.js`: form submission, task actions, filters, and notifications.

Database and local containers:

- `migrations/001_create_tasks.sql`: task table and updated timestamp index.
- `Dockerfile`: non-root, multi-stage application image containing server and migration binaries.
- `.dockerignore`: build context exclusions.
- `compose.yaml`: PostgreSQL, migration, and application services.

Kubernetes:

- `deploy/minikube/profile.yaml`: documented profile settings.
- `deploy/k8s/00-namespace.yaml`: `task-demo` namespace.
- `deploy/k8s/10-configmap.yaml`: application configuration.
- `deploy/k8s/11-secret.example.yaml`: development credential template.
- `deploy/k8s/20-postgres-service.yaml`: headless PostgreSQL Service.
- `deploy/k8s/21-postgres-statefulset.yaml`: PostgreSQL StatefulSet and volume claim template.
- `deploy/k8s/30-migration-job.yaml`: schema migration Job.
- `deploy/k8s/40-app-serviceaccount.yaml`: application identity.
- `deploy/k8s/41-app-deployment.yaml`: app Deployment, probes, resources, and rollout policy.
- `deploy/k8s/42-app-service.yaml`: ClusterIP Service.
- `deploy/k8s/50-ingress.yaml`: local Ingress route.
- `deploy/k8s/60-hpa.yaml`: CPU HorizontalPodAutoscaler.
- `deploy/k8s/70-maintenance-cronjob.yaml`: expired completed-task cleanup exercise.
- `deploy/k8s/kustomization.yaml`: deterministic apply order and image override support.

Helm:

- `deploy/helm/task-app/Chart.yaml`: chart metadata.
- `deploy/helm/task-app/values.yaml`: local defaults.
- `deploy/helm/task-app/values.schema.json`: values validation.
- `deploy/helm/task-app/templates/*.yaml`: templated equivalents of native resources.
- `deploy/helm/task-app/templates/_helpers.tpl`: names and labels.
- `deploy/helm/task-app/templates/NOTES.txt`: post-install commands.

Automation and learning:

- `Makefile`: stable project commands.
- `scripts/cluster-up.sh`: creates the Minikube profile and enables addons.
- `scripts/deploy.sh`: applies secrets, database, migration, and application in dependency order.
- `scripts/verify.sh`: checks health, CRUD, persistence prerequisites, and rollout status.
- `scripts/status.sh`: compact workload and event summary.
- `scripts/cleanup-workloads.sh`: removes workloads while retaining the PVC.
- `scripts/cleanup-all.sh`: explicitly removes the namespace and stored data.
- `README.md`: quick start and learning path.
- `docs/lessons/00-prerequisites.md` through `08-helm.md`: staged exercises and expected observations.

---

### Task 1: Initialize the Go Module and Task Domain

**Files:**
- Create: `go.mod`
- Create: `internal/task/model.go`
- Create: `internal/task/repository.go`
- Create: `internal/task/service.go`
- Test: `internal/task/service_test.go`

- [ ] **Step 1: Create the module**

```go
module example.com/k8s-task-demo

go 1.22
```

- [ ] **Step 2: Write failing service tests**

Cover these exact behaviors:

```go
func TestServiceCreateRejectsBlankTitle(t *testing.T)
func TestServiceCreateTrimsInputAndDefaultsToPending(t *testing.T)
func TestServiceUpdateRejectsUnknownStatus(t *testing.T)
func TestServiceSetStatusCompletesTask(t *testing.T)
func TestServiceDeleteReturnsNotFound(t *testing.T)
```

Use an in-memory fake implementing:

```go
type Repository interface {
    List(context.Context, Status) ([]Task, error)
    Get(context.Context, int64) (Task, error)
    Create(context.Context, CreateInput) (Task, error)
    Update(context.Context, int64, UpdateInput) (Task, error)
    SetStatus(context.Context, int64, Status) (Task, error)
    Delete(context.Context, int64) error
    Ping(context.Context) error
}
```

- [ ] **Step 3: Verify the tests fail**

Run:

```bash
go test ./internal/task
```

Expected: compile failure because the task types and service are not implemented.

- [ ] **Step 4: Implement the domain**

Define:

```go
type Status string

const (
    StatusAll       Status = ""
    StatusPending   Status = "pending"
    StatusCompleted Status = "completed"
)

type Task struct {
    ID          int64     `json:"id"`
    Title       string    `json:"title"`
    Description string    `json:"description"`
    Status      Status    `json:"status"`
    CreatedAt   time.Time `json:"createdAt"`
    UpdatedAt   time.Time `json:"updatedAt"`
}

type CreateInput struct {
    Title       string `json:"title"`
    Description string `json:"description"`
}

type UpdateInput struct {
    Title       string `json:"title"`
    Description string `json:"description"`
}

var (
    ErrNotFound   = errors.New("task not found")
    ErrInvalid    = errors.New("invalid task")
    ErrUnavailable = errors.New("task repository unavailable")
)
```

Implement a `Service` with a repository dependency, title length `1..120`,
description length `0..2000`, whitespace normalization, and status validation.

- [ ] **Step 5: Verify domain tests pass**

Run:

```bash
go test ./internal/task
```

Expected: PASS.

---

### Task 2: Add Configuration Parsing

**Files:**
- Create: `internal/config/config.go`
- Test: `internal/config/config_test.go`

- [ ] **Step 1: Write failing table-driven tests**

Test defaults and validation:

```go
func TestLoadDefaults(t *testing.T)
func TestLoadRequiresDatabaseURL(t *testing.T)
func TestLoadRejectsInvalidShutdownTimeout(t *testing.T)
```

The public configuration is:

```go
type Config struct {
    HTTPAddr       string
    DatabaseURL    string
    AppEnv         string
    ShutdownTimeout time.Duration
}
```

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
go test ./internal/config
```

Expected: compile failure because `Config` and `Load` do not exist.

- [ ] **Step 3: Implement environment loading**

Use only the standard library. Defaults:

```text
HTTP_ADDR=:8080
APP_ENV=development
SHUTDOWN_TIMEOUT=10s
```

Require a non-empty `DATABASE_URL`. Return errors naming the invalid variable
without printing credential values.

- [ ] **Step 4: Verify configuration tests pass**

Run:

```bash
go test ./internal/config
```

Expected: PASS.

---

### Task 3: Add Migrations and the PostgreSQL Repository

**Files:**
- Create: `migrations/001_create_tasks.sql`
- Create: `internal/postgres/migrate.go`
- Create: `internal/postgres/repository.go`
- Create: `cmd/migrate/main.go`
- Test: `internal/postgres/migrate_integration_test.go`
- Test: `internal/postgres/repository_integration_test.go`
- Modify: `go.mod`

- [ ] **Step 1: Add pgx**

Run:

```bash
go get github.com/jackc/pgx/v5@v5.7.2
go mod tidy
```

Expected: `go.mod` and `go.sum` contain pgx v5.

- [ ] **Step 2: Write the schema migration**

Create an idempotently tracked migration system with a `schema_migrations`
table. The first migration creates:

```sql
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    description VARCHAR(2000) NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tasks_status_updated_at_idx
    ON tasks (status, updated_at DESC);
```

- [ ] **Step 3: Write integration tests**

Tests skip with a clear message unless `TEST_DATABASE_URL` is set. Cover:

```go
func TestMigrateIsIdempotent(t *testing.T)
func TestRepositoryCRUD(t *testing.T)
func TestRepositoryReturnsNotFound(t *testing.T)
func TestRepositoryListFiltersStatus(t *testing.T)
func TestRepositoryPing(t *testing.T)
```

Each test truncates `tasks` and does not rely on execution order.

- [ ] **Step 4: Start the test database and verify tests fail**

Run:

```bash
docker compose up -d postgres
TEST_DATABASE_URL='postgres://task:task@localhost:5432/taskdb?sslmode=disable' \
  go test ./internal/postgres -v
```

Expected: failure because migration and repository implementations are absent.

- [ ] **Step 5: Implement migrations and repository**

Use `pgxpool.Pool`, parameterized SQL, context timeouts, and `errors.Is(err,
pgx.ErrNoRows)` mapping to `task.ErrNotFound`. Every update sets
`updated_at = NOW()` and returns the complete row.

The migration command:

```go
func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatal(err)
    }
    // Open pool, run postgres.Migrate, close pool, and exit non-zero on error.
}
```

- [ ] **Step 6: Verify integration tests pass**

Run:

```bash
TEST_DATABASE_URL='postgres://task:task@localhost:5432/taskdb?sslmode=disable' \
  go test ./internal/postgres -v
```

Expected: PASS.

---

### Task 4: Implement the HTTP API and Health Endpoints

**Files:**
- Create: `internal/httpserver/server.go`
- Create: `internal/httpserver/api.go`
- Create: `internal/httpserver/health.go`
- Create: `internal/httpserver/respond.go`
- Test: `internal/httpserver/api_test.go`
- Test: `internal/httpserver/health_test.go`

- [ ] **Step 1: Write failing handler tests**

Cover:

```go
func TestAPIListTasks(t *testing.T)
func TestAPICreateTask(t *testing.T)
func TestAPICreateRejectsInvalidJSON(t *testing.T)
func TestAPIUpdateMissingTask(t *testing.T)
func TestAPISetStatus(t *testing.T)
func TestAPIDeleteTask(t *testing.T)
func TestLiveAlwaysReturnsOK(t *testing.T)
func TestReadyReturnsServiceUnavailableWhenRepositoryPingFails(t *testing.T)
```

Expected response envelope:

```json
{"data":{}}
```

Expected error envelope:

```json
{"error":{"code":"invalid_request","message":"title is required"}}
```

- [ ] **Step 2: Verify tests fail**

Run:

```bash
go test ./internal/httpserver
```

Expected: compile failure because the server and handlers do not exist.

- [ ] **Step 3: Implement routes and middleware**

Use Go 1.22 method-aware patterns:

```text
GET    /api/v1/tasks
POST   /api/v1/tasks
GET    /api/v1/tasks/{id}
PUT    /api/v1/tasks/{id}
PATCH  /api/v1/tasks/{id}/status
DELETE /api/v1/tasks/{id}
GET    /health/live
GET    /health/ready
```

Add request IDs, structured `log/slog` logging, JSON content types, body size
limits, method-specific status codes, and centralized domain error mapping.

- [ ] **Step 4: Verify handler tests pass**

Run:

```bash
go test ./internal/httpserver
```

Expected: PASS.

---

### Task 5: Build the Server-Rendered Task Interface

**Files:**
- Create: `web/embed.go`
- Create: `web/templates/index.html`
- Create: `web/static/app.css`
- Create: `web/static/app.js`
- Create: `internal/httpserver/pages.go`
- Test: `internal/httpserver/pages_test.go`
- Modify: `internal/httpserver/server.go`

- [ ] **Step 1: Write failing page tests**

Cover:

```go
func TestIndexRendersTaskManager(t *testing.T)
func TestIndexShowsEmptyState(t *testing.T)
func TestStaticAssetsAreServed(t *testing.T)
```

Assert semantic landmarks, form labels, filter controls, task count, and static
asset content types.

- [ ] **Step 2: Verify page tests fail**

Run:

```bash
go test ./internal/httpserver
```

Expected: FAIL because the page route and embedded assets do not exist.

- [ ] **Step 3: Implement the UI**

The page must include:

- A compact header showing “Task Board” and API readiness.
- An inline create form with title and optional description.
- Tabs for all, pending, and completed tasks.
- Task rows with checkbox status control, edit button, delete icon button, and
  accessible labels/tooltips.
- Empty, loading, success, and error states.
- A confirmation dialog for deletion.
- Responsive behavior at 720px without horizontal overflow.
- Visible focus states and reduced-motion support.

Use CSS custom properties with neutral surfaces, dark text, green success,
amber pending, and red destructive states. Keep radii at or below 8px and avoid
decorative gradients or nested cards.

JavaScript calls the REST API, updates the list without full reload, disables
in-flight controls, and announces results through an `aria-live` region.

- [ ] **Step 4: Verify page and handler tests pass**

Run:

```bash
go test ./internal/httpserver
```

Expected: PASS.

---

### Task 6: Compose the Runtime and Graceful Shutdown

**Files:**
- Create: `cmd/server/main.go`
- Test: `cmd/server/main_test.go`

- [ ] **Step 1: Write a failing lifecycle test**

Extract:

```go
func run(ctx context.Context, cfg config.Config, logger *slog.Logger) error
```

Test that canceling the context stops the HTTP server within the configured
shutdown timeout.

- [ ] **Step 2: Verify lifecycle test fails**

Run:

```bash
go test ./cmd/server
```

Expected: compile failure because `run` does not exist.

- [ ] **Step 3: Implement runtime composition**

Open the pgx pool, construct repository, service, and HTTP server, listen on
`HTTP_ADDR`, handle `SIGINT`/`SIGTERM`, and call `http.Server.Shutdown`.
Log startup and shutdown without logging `DATABASE_URL`.

- [ ] **Step 4: Run all Go checks**

Run:

```bash
gofmt -w cmd internal web
go test ./...
go vet ./...
```

Expected: all tests PASS and `go vet` exits zero.

---

### Task 7: Add Docker and Compose Workflows

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `compose.yaml`
- Modify: `Makefile`

- [ ] **Step 1: Add the production image**

Use `golang:1.22-alpine` as the build stage and a non-root distroless or Alpine
runtime. Build `/out/server` and `/out/migrate`; copy CA certificates, embedded
assets through the binaries, and expose port 8080.

The final container runs:

```dockerfile
USER 65532:65532
ENTRYPOINT ["/app/server"]
```

- [ ] **Step 2: Add the Compose dependency flow**

Define:

```text
postgres -> healthy
migrate  -> completed successfully
app      -> healthy
```

Use a named PostgreSQL volume and publish the app on `127.0.0.1:8080`.

- [ ] **Step 3: Add baseline Make targets**

```make
.PHONY: dev test image compose-up compose-down

dev:
	go run ./cmd/server

test:
	go test ./...
	go vet ./...

image:
	docker build -t task-app:dev .

compose-up:
	docker compose up --build -d

compose-down:
	docker compose down
```

- [ ] **Step 4: Verify the container stack**

Run:

```bash
docker compose up --build -d
docker compose ps
curl --fail http://127.0.0.1:8080/health/live
curl --fail http://127.0.0.1:8080/health/ready
```

Expected: all services are healthy and both endpoints return HTTP 200.

- [ ] **Step 5: Verify CRUD and persistence**

Run:

```bash
curl --fail -X POST http://127.0.0.1:8080/api/v1/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Learn Deployments","description":"Create and inspect a rollout"}'
docker compose restart postgres
curl --fail http://127.0.0.1:8080/api/v1/tasks
```

Expected: the created task remains after PostgreSQL restarts.

---

### Task 8: Add Native Kubernetes Manifests

**Files:**
- Create: `deploy/k8s/00-namespace.yaml`
- Create: `deploy/k8s/10-configmap.yaml`
- Create: `deploy/k8s/11-secret.example.yaml`
- Create: `deploy/k8s/20-postgres-service.yaml`
- Create: `deploy/k8s/21-postgres-statefulset.yaml`
- Create: `deploy/k8s/30-migration-job.yaml`
- Create: `deploy/k8s/40-app-serviceaccount.yaml`
- Create: `deploy/k8s/41-app-deployment.yaml`
- Create: `deploy/k8s/42-app-service.yaml`
- Create: `deploy/k8s/50-ingress.yaml`
- Create: `deploy/k8s/60-hpa.yaml`
- Create: `deploy/k8s/70-maintenance-cronjob.yaml`
- Create: `deploy/k8s/kustomization.yaml`

- [ ] **Step 1: Create namespace, configuration, and secret example**

Use namespace `task-demo`, labels `app.kubernetes.io/name`,
`app.kubernetes.io/component`, and `app.kubernetes.io/part-of`.
The Secret example contains only local development credentials and is copied
to an ignored `11-secret.local.yaml` by deployment automation.

- [ ] **Step 2: Create PostgreSQL resources**

Use:

```text
image: postgres:16-alpine
replicas: 1
port: 5432
storage: 1Gi
accessMode: ReadWriteOnce
```

Add startup/readiness/liveness probes with `pg_isready`, resource requests and
limits, a headless Service, and a volume claim template.

- [ ] **Step 3: Create migration Job**

Use image `task-app:dev`, command `/app/migrate`, `restartPolicy: Never`,
`backoffLimit: 3`, and the same database Secret as the application.

- [ ] **Step 4: Create application resources**

Use two replicas, `RollingUpdate` with `maxUnavailable: 0` and `maxSurge: 1`,
grace period 20 seconds, preStop delay, HTTP probes, CPU/memory requests and
limits, and a ClusterIP Service on port 80 targeting 8080.

- [ ] **Step 5: Create Ingress, HPA, and CronJob**

Use host `task-demo.local`, ingress class `nginx`, HPA range `2..6` at 70% CPU,
and a daily CronJob that calls an application maintenance API or database-safe
cleanup command. Set low history limits and `concurrencyPolicy: Forbid`.

- [ ] **Step 6: Validate YAML**

Run:

```bash
kubectl apply --dry-run=client -k deploy/k8s
kubectl kustomize deploy/k8s >/tmp/task-demo-rendered.yaml
```

Expected: both commands exit zero and render all resources.

---

### Task 9: Add Minikube and Deployment Automation

**Files:**
- Create: `deploy/minikube/profile.yaml`
- Create: `scripts/cluster-up.sh`
- Create: `scripts/deploy.sh`
- Create: `scripts/verify.sh`
- Create: `scripts/status.sh`
- Create: `scripts/cleanup-workloads.sh`
- Create: `scripts/cleanup-all.sh`
- Modify: `Makefile`
- Modify: `.gitignore`

- [ ] **Step 1: Implement cluster startup**

`scripts/cluster-up.sh` runs:

```bash
minikube start -p k8s-demo --driver=docker --cpus=4 --memory=6144
minikube addons enable ingress -p k8s-demo
minikube addons enable metrics-server -p k8s-demo
kubectl config use-context k8s-demo
```

It verifies the current context before returning.

- [ ] **Step 2: Implement deployment ordering**

`scripts/deploy.sh`:

1. Builds `task-app:dev`.
2. Loads it with `minikube image load -p k8s-demo`.
3. Applies namespace, Secret, PostgreSQL, and waits for StatefulSet readiness.
4. Deletes an old migration Job if present, applies it, and waits for completion.
5. Applies the application, Service, Ingress, HPA, and CronJob.
6. Waits for Deployment rollout and prints access instructions.

- [ ] **Step 3: Implement verification**

`scripts/verify.sh` checks:

```text
current kubectl context is k8s-demo
postgres StatefulSet ready
migration Job complete
application Deployment available
all application pods ready
live and ready endpoints return 200
create/list/update/delete API flow succeeds
Ingress object has an address or documented Minikube tunnel fallback
```

- [ ] **Step 4: Implement status and explicit cleanup**

`cleanup-workloads.sh` deletes application workloads but leaves the StatefulSet
PVC. `cleanup-all.sh` requires typing or passing `--yes-delete-data` before
deleting the namespace.

- [ ] **Step 5: Add Make targets**

```make
cluster-up:
	./scripts/cluster-up.sh

cluster-down:
	minikube stop -p k8s-demo

image-load: image
	minikube image load -p k8s-demo task-app:dev

deploy:
	./scripts/deploy.sh

verify:
	./scripts/verify.sh

status:
	./scripts/status.sh

clean-workloads:
	./scripts/cleanup-workloads.sh

clean-all:
	./scripts/cleanup-all.sh
```

- [ ] **Step 6: Execute the Minikube deployment**

Run:

```bash
make cluster-up
make deploy
make verify
```

Expected: the cluster is running, workloads are ready, and verification exits
zero.

---

### Task 10: Package the Deployment as Helm

**Files:**
- Create: `deploy/helm/task-app/Chart.yaml`
- Create: `deploy/helm/task-app/values.yaml`
- Create: `deploy/helm/task-app/values.schema.json`
- Create: `deploy/helm/task-app/templates/_helpers.tpl`
- Create: `deploy/helm/task-app/templates/configmap.yaml`
- Create: `deploy/helm/task-app/templates/secret.yaml`
- Create: `deploy/helm/task-app/templates/postgres-service.yaml`
- Create: `deploy/helm/task-app/templates/postgres-statefulset.yaml`
- Create: `deploy/helm/task-app/templates/migration-job.yaml`
- Create: `deploy/helm/task-app/templates/app-serviceaccount.yaml`
- Create: `deploy/helm/task-app/templates/app-deployment.yaml`
- Create: `deploy/helm/task-app/templates/app-service.yaml`
- Create: `deploy/helm/task-app/templates/ingress.yaml`
- Create: `deploy/helm/task-app/templates/hpa.yaml`
- Create: `deploy/helm/task-app/templates/cronjob.yaml`
- Create: `deploy/helm/task-app/templates/NOTES.txt`

- [ ] **Step 1: Install Helm if absent**

Run:

```bash
command -v helm || brew install helm
helm version --short
```

Expected: Helm 3 is available.

- [ ] **Step 2: Define validated values**

Expose image repository/tag/pull policy, replicas, resources, probes, ingress,
HPA, PostgreSQL image/storage/credentials, migration settings, and CronJob
schedule. Require positive replica/storage values and valid service ports in
`values.schema.json`.

- [ ] **Step 3: Template the native behavior**

Use helpers for names, selectors, and common labels. Add Helm hook annotations
to the migration Job:

```yaml
"helm.sh/hook": pre-install,pre-upgrade
"helm.sh/hook-delete-policy": before-hook-creation
```

Do not silently generate production credentials; local defaults are explicitly
marked as development-only.

- [ ] **Step 4: Validate the chart**

Run:

```bash
helm lint deploy/helm/task-app
helm template task-demo deploy/helm/task-app \
  --namespace task-demo >/tmp/task-demo-helm.yaml
kubectl apply --dry-run=client -f /tmp/task-demo-helm.yaml
```

Expected: all commands exit zero.

- [ ] **Step 5: Exercise Helm lifecycle**

Run:

```bash
helm upgrade --install task-demo deploy/helm/task-app \
  --namespace task-demo --create-namespace
helm status task-demo -n task-demo
helm history task-demo -n task-demo
```

Expected: release status is `deployed` and history contains revision 1.

---

### Task 11: Write the Staged Learning Guide

**Files:**
- Create: `README.md`
- Create: `docs/lessons/00-prerequisites.md`
- Create: `docs/lessons/01-application-baseline.md`
- Create: `docs/lessons/02-first-deployment.md`
- Create: `docs/lessons/03-config-and-persistence.md`
- Create: `docs/lessons/04-network-access.md`
- Create: `docs/lessons/05-runtime-reliability.md`
- Create: `docs/lessons/06-rollouts.md`
- Create: `docs/lessons/07-scaling-and-jobs.md`
- Create: `docs/lessons/08-helm.md`

- [ ] **Step 1: Write the README**

Include prerequisites, a five-command quick start, architecture, repository
map, safe cleanup distinction, and links to all lessons. Every command must be
copy-pasteable from the repository root.

- [ ] **Step 2: Write lessons 00-04**

Each lesson contains:

```text
Objective
Concepts
Commands
Expected observations
Inspection questions
Cleanup or reset
```

The lessons progress from tool checks through Compose, first Deployment,
ConfigMap/Secret/PVC/StatefulSet, and Ingress.

- [ ] **Step 3: Write lessons 05-08**

Provide reproducible exercises for probe failure, bad image rollout, rollback,
manual scaling, load generation, HPA, Job/CronJob inspection, Helm install,
upgrade, rollback, and uninstall.

- [ ] **Step 4: Verify documentation commands**

Extract or manually execute every quick-start command on a clean Minikube
profile. Correct any command whose output or context differs from the lesson.

---

### Task 12: Final Verification and UI Review

**Files:**
- Modify only files found defective during verification.

- [ ] **Step 1: Run static and unit verification**

Run:

```bash
gofmt -w cmd internal web
go test ./...
go vet ./...
docker build -t task-app:dev .
kubectl apply --dry-run=client -k deploy/k8s
helm lint deploy/helm/task-app
```

Expected: all commands exit zero.

- [ ] **Step 2: Run container integration verification**

Run:

```bash
docker compose down
docker compose up --build -d
./scripts/verify.sh --target=compose
```

Expected: health, CRUD, and persistence checks pass.

- [ ] **Step 3: Run Kubernetes integration verification**

Run:

```bash
make cluster-up
make deploy
make verify
```

Expected: all workloads become ready and the complete API workflow passes.

- [ ] **Step 4: Review the interface in a browser**

Use desktop `1440x900` and mobile `390x844` viewports. Verify:

```text
no horizontal overflow or overlapping controls
create/edit/status/delete workflows work
loading, empty, error, and success states are visible and legible
keyboard focus is visible
buttons have stable dimensions
text remains inside controls
browser console has no errors
```

- [ ] **Step 5: Exercise operational learning paths**

Verify PostgreSQL pod deletion preserves data, a broken image creates an
observable failed rollout, rollback restores availability, manual scaling
creates ready replicas, and HPA reports metrics.

- [ ] **Step 6: Record final status without committing**

Run:

```bash
git status --short
```

Expected: only the new demo files and any intentional repository metadata are
listed. Do not commit or push.
