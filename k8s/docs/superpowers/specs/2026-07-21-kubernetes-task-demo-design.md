# Kubernetes Task Demo Design

## 1. Goal

Build a complete local Kubernetes learning project around a small task
management application. The project should teach the daily engineering
workflow for packaging, deploying, configuring, updating, scaling, observing,
and troubleshooting an application on Kubernetes.

The first target environment is Minikube on macOS with Docker. The application
stack is Go and PostgreSQL.

## 2. Scope

### Included

- A server-rendered task management UI with a small amount of vanilla
  JavaScript.
- A REST API for creating, reading, updating, completing, and deleting tasks.
- PostgreSQL-backed persistence with versioned database migrations.
- Local development through Docker Compose.
- A multi-stage Docker image for the Go application.
- Native Kubernetes manifests for the application and database.
- ConfigMap and Secret based configuration.
- Persistent storage through a PersistentVolumeClaim.
- Ingress-based browser access.
- Startup, readiness, and liveness probes.
- Resource requests and limits.
- Rolling updates, replica scaling, and rollback exercises.
- A migration Job and a maintenance CronJob.
- Horizontal Pod Autoscaler exercises.
- Helm packaging after the native manifest workflow is understood.
- Scripts, Make targets, validation commands, and staged learning documents.

### Excluded

- Authentication and multi-user authorization.
- Microservices, queues, Redis, service mesh, and operators.
- Production cloud infrastructure and managed Kubernetes.
- Production-grade PostgreSQL high availability.
- Full observability stacks such as Prometheus, Grafana, Loki, and OpenTelemetry.
- CI/CD provider integration in the first iteration.

These can be added later as independent exercises.

## 3. Architecture

```text
Browser
  |
Ingress
  |
task-app Service
  |
Go Deployment
  |-- server-rendered Web UI
  |-- REST API
  |-- health endpoints
  |
postgres Service
  |
PostgreSQL StatefulSet
  |
PersistentVolumeClaim
```

The Go application is a modular monolith. It produces one image and one
runtime process so Kubernetes remains the main learning subject.

PostgreSQL runs as a single-replica StatefulSet for learning purposes. This
demonstrates stable identity and persistent storage but is not presented as a
production database architecture.

## 4. Repository Structure

```text
.
├── cmd/server/
├── internal/
│   ├── config/
│   ├── task/
│   ├── postgres/
│   └── httpserver/
├── web/
│   ├── templates/
│   └── static/
├── migrations/
├── deploy/
│   ├── k8s/
│   ├── helm/task-app/
│   └── minikube/
├── docs/
│   ├── lessons/
│   └── superpowers/specs/
├── scripts/
├── Dockerfile
├── compose.yaml
├── Makefile
└── README.md
```

## 5. Application Modules

### `internal/task`

Owns the task entity, validation rules, use cases, and repository interface.
It does not depend on HTTP or PostgreSQL.

Task fields:

- ID
- Title
- Description
- Status: `pending` or `completed`
- CreatedAt
- UpdatedAt

Business rules:

- Title is required and has a bounded length.
- Description is optional and has a bounded length.
- A task can switch between pending and completed.
- Updating or deleting a missing task returns a not-found result.

### `internal/postgres`

Implements the task repository with parameterized SQL. It maps database errors
to application-level errors and owns no HTTP behavior.

### `internal/httpserver`

Provides:

- HTML routes for the task management interface.
- JSON routes under `/api/v1/tasks`.
- `/health/live` for process health.
- `/health/ready` for dependency readiness.
- Consistent JSON error responses for API requests.

### `internal/config`

Loads configuration from environment variables and fails fast when required
values are invalid or missing.

Required runtime configuration:

- `HTTP_ADDR`
- `DATABASE_URL`
- `APP_ENV`

## 6. User Experience

The first screen is the usable task manager rather than a landing page.

The interface contains:

- A compact header with application status.
- A task creation form.
- Filter tabs for all, pending, and completed tasks.
- A responsive task list with edit, complete, reopen, and delete actions.
- Clear empty, loading, success, and error states.
- Keyboard-friendly controls and visible focus states.
- Confirmation before destructive deletion.

The visual style is restrained and work-focused. It uses a neutral background,
clear typography, compact spacing, and a limited set of semantic colors.
Mobile and desktop layouts must remain fully usable without overlapping text or
controls.

## 7. Data Flow

### Task request

1. The browser sends an HTML or JSON request to the Ingress.
2. The Ingress routes the request to the `task-app` Service.
3. The Service selects a ready Go pod.
4. The HTTP layer validates and normalizes input.
5. The task service applies business rules.
6. The PostgreSQL repository executes the query.
7. The server returns HTML fragments/pages or a JSON response.

### Application startup

1. Kubernetes injects non-sensitive settings from a ConfigMap.
2. Kubernetes injects database credentials from a Secret.
3. An init check waits for PostgreSQL connectivity.
4. A separate migration Job applies schema migrations.
5. The application starts and the startup probe begins.
6. The pod becomes a Service endpoint only after readiness succeeds.

### Image workflow

1. Build the image locally with a deterministic tag.
2. Load the image into Minikube.
3. Update the Deployment image tag.
4. Observe rollout status.
5. Verify the application.
6. Practice rollback to the previous ReplicaSet.

## 8. Kubernetes Resources

Native manifests are grouped by responsibility:

- Namespace
- Application ConfigMap
- Application and database Secret example
- PostgreSQL Service
- PostgreSQL StatefulSet
- PostgreSQL PersistentVolumeClaim configuration
- Migration Job
- Application ServiceAccount
- Application Deployment
- Application Service
- Ingress
- HorizontalPodAutoscaler
- Maintenance CronJob

Secrets committed to the repository contain development-only placeholder
values or examples. Documentation explains that real credentials must not be
committed.

## 9. Failure Handling

### Application failures

- Invalid input returns HTTP 400 with field-level feedback.
- Missing tasks return HTTP 404.
- Database conflicts return HTTP 409 when applicable.
- Unexpected failures return HTTP 500 without exposing internals.
- Request failures are logged with a request ID.
- Graceful shutdown stops accepting requests and allows in-flight requests to
  complete within a fixed timeout.

### Kubernetes failures

- Liveness checks only whether the process is functioning.
- Readiness checks PostgreSQL connectivity with a short timeout.
- Startup probes prevent slow initialization from causing restart loops.
- Resource requests make scheduling behavior visible.
- Resource limits provide an exercise for diagnosing throttling or OOM kills.
- The lessons intentionally cover image pull failures, bad ConfigMaps,
  readiness failures, CrashLoopBackOff, and failed rollouts.

### Database failures

- Schema changes run through a dedicated Job, not on every application pod.
- Failed migrations stop deployment verification and remain inspectable.
- PostgreSQL data survives pod recreation through the PVC.
- Cleanup documentation distinguishes deleting workloads from deleting data.

## 10. Learning Stages

### Stage 0: Prerequisites

- Verify Docker, kubectl, and Minikube.
- Start a dedicated Minikube profile.
- Enable the Ingress and metrics-server addons.
- Learn contexts, namespaces, and basic inspection commands.

### Stage 1: Application Baseline

- Run PostgreSQL and the Go application with Docker Compose.
- Exercise UI and API behavior.
- Run unit and integration tests.

### Stage 2: First Kubernetes Deployment

- Build and load the application image.
- Apply Namespace, Deployment, and Service.
- Use port-forwarding and inspect pods, logs, and events.

### Stage 3: Configuration and Persistence

- Deploy PostgreSQL as a StatefulSet.
- Add Service, Secret, ConfigMap, and PVC.
- Run migrations with a Job.
- Delete and recreate the database pod to verify persistence.

### Stage 4: Network Access

- Enable Ingress.
- Route a local hostname to the application.
- Compare ClusterIP, port-forwarding, and Ingress access.

### Stage 5: Runtime Reliability

- Add startup, readiness, and liveness probes.
- Add resource requests and limits.
- Practice graceful shutdown and pod termination.

### Stage 6: Delivery Operations

- Deploy a new image version.
- Observe rolling updates.
- Introduce a broken release.
- Inspect rollout failure and perform rollback.

### Stage 7: Scaling and Scheduled Work

- Scale replicas manually.
- Generate load and observe request distribution.
- Configure HPA with metrics-server.
- Run a maintenance CronJob.

### Stage 8: Helm

- Convert the validated native manifests into a Helm chart.
- Define values for image, replicas, ingress, resources, and PostgreSQL.
- Install, upgrade, inspect, roll back, and uninstall a release.

## 11. Commands and Automation

The Makefile is the stable entry point. Expected targets include:

- `make dev`
- `make test`
- `make image`
- `make cluster-up`
- `make cluster-down`
- `make image-load`
- `make deploy`
- `make verify`
- `make status`
- `make logs`
- `make clean`

Scripts provide implementation details but remain small and independently
usable. Destructive cleanup commands require explicit naming and documentation.

## 12. Testing and Verification

### Go tests

- Unit tests for task validation and state changes.
- HTTP handler tests for status codes and response bodies.
- Repository integration tests against PostgreSQL.
- Migration tests against an empty database.

### Container tests

- Build the production image.
- Start the Compose stack.
- Verify liveness, readiness, CRUD, and persistence.

### Kubernetes verification

- Wait for StatefulSet, Job, and Deployment readiness.
- Confirm all application endpoints.
- Create and update a task through the API.
- Delete the PostgreSQL pod and verify data remains.
- Scale the application and verify all replicas become ready.
- Check Ingress routing.
- Validate rollback and HPA exercises through lesson-specific commands.

### Quality checks

- `go test ./...`
- `go vet ./...`
- Formatting checks.
- Kubernetes client-side or server-side dry runs where supported.
- `helm lint` and template rendering after the Helm stage is added.

## 13. Completion Criteria

The project is complete when a learner can:

1. Start the local cluster from documented commands.
2. Build and load the Go image.
3. Deploy the application and PostgreSQL from native manifests.
4. Access and operate the task UI through Ingress.
5. Explain each Kubernetes resource used by the project.
6. Inspect logs, events, pod status, and rollout history.
7. Demonstrate data persistence across database pod recreation.
8. Perform a rolling update and rollback.
9. Scale the application manually and with HPA.
10. Package and operate the same application with Helm.

## 14. Implementation Constraints

- No worktree is used.
- No commits or pushes are made without explicit user instruction.
- Files should remain focused and modular; large generated or consolidated
  files require a clear reason.
- Existing compatibility is not a design constraint because this directory is
  a new refactoring-oriented demo.
