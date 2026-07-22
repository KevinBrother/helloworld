SHELL := /bin/sh

PROFILE ?= k8s-demo
IMAGE ?= task-app:dev
HELM ?= $(shell command -v helm 2>/dev/null || printf '%s' /opt/homebrew/opt/helm@3/bin/helm)
HELM_NAMESPACE ?= task-demo-helm

.PHONY: dev test integration-test image compose-up compose-down compose-reset \
	cluster-up cluster-down image-load deploy verify status clean-workloads clean-all \
	helm-test helm-install helm-status helm-uninstall

dev:
	DATABASE_URL="$${DATABASE_URL:-postgres://task:task@127.0.0.1:5432/taskdb?sslmode=disable}" \
	CGO_ENABLED=0 go run ./cmd/server

test:
	CGO_ENABLED=0 GOTOOLCHAIN=local go test ./...
	CGO_ENABLED=0 GOTOOLCHAIN=local go vet ./...

integration-test:
	TEST_DATABASE_URL="$${TEST_DATABASE_URL:-postgres://task:task@127.0.0.1:5432/taskdb?sslmode=disable}" \
	CGO_ENABLED=0 GOTOOLCHAIN=local go test ./internal/postgres -v

image:
	docker build -t $(IMAGE) .

compose-up:
	docker compose up --build -d

compose-down:
	docker compose down

compose-reset:
	docker compose down --volumes

cluster-up:
	PROFILE=$(PROFILE) ./scripts/cluster-up.sh

cluster-down:
	minikube stop -p $(PROFILE)

image-load: image
	PROFILE=$(PROFILE) IMAGE=$(IMAGE) ./scripts/load-image.sh

deploy:
	PROFILE=$(PROFILE) IMAGE=$(IMAGE) ./scripts/deploy.sh

verify:
	PROFILE=$(PROFILE) ./scripts/verify.sh

status:
	PROFILE=$(PROFILE) ./scripts/status.sh

clean-workloads:
	PROFILE=$(PROFILE) ./scripts/cleanup-workloads.sh

clean-all:
	PROFILE=$(PROFILE) ./scripts/cleanup-all.sh

helm-test:
	HELM=$(HELM) ./scripts/tests/helm_chart_test.sh
	$(HELM) template task-demo deploy/helm/task-app --namespace $(HELM_NAMESPACE) \
		>/tmp/task-demo-helm.yaml
	kubectl apply --dry-run=client -f /tmp/task-demo-helm.yaml

helm-install:
	$(HELM) upgrade --install task-demo deploy/helm/task-app \
		--namespace $(HELM_NAMESPACE) \
		--create-namespace \
		--set ingress.enabled=false \
		--wait \
		--timeout 5m

helm-status:
	$(HELM) status task-demo --namespace $(HELM_NAMESPACE)
	$(HELM) history task-demo --namespace $(HELM_NAMESPACE)

helm-uninstall:
	$(HELM) uninstall task-demo --namespace $(HELM_NAMESPACE)
	kubectl delete namespace $(HELM_NAMESPACE) --ignore-not-found
