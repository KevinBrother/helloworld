.PHONY: run run-chat-model run-chat-model-agent run-memory-session run-tool-filesystem run-manual-tools sandbox-up sandbox-server test-sandbox build test

RUN_ARGS := $(filter-out run run-chat-model run-chat-model-agent run-memory-session run-tool-filesystem run-manual-tools sandbox-up sandbox-server test-sandbox build test,$(MAKECMDGOALS))

# This project does not need cgo. Keeping it off avoids local macOS dyld issues
# from transitive dependencies during go test/go run.
run: run-chat-model

run-chat-model:
	CGO_ENABLED=0 go run ./cmd/new-chat-model -- $(RUN_ARGS)

run-chat-model-agent:
	CGO_ENABLED=0 go run ./cmd/new-chat-model-agent

run-memory-session:
	CGO_ENABLED=0 go run ./cmd/memory-session

run-tool-filesystem:
	CGO_ENABLED=0 go run ./cmd/tool-filesystem

run-manual-tools:
	CGO_ENABLED=0 go run ./cmd/manual-tools

# Pull the code-interpreter image and write a Docker-runtime config once.
# The sandbox server is a development dependency; production uses the
# Kubernetes operator with the Fast Sandbox (Firecracker) runtime.
# OpenSandbox 本机控制面：配置与 SQLite 状态都放在项目内（均已 gitignore），不污染用户目录。
SANDBOX_CONFIG := ./sandbox.toml
SANDBOX_STORE_DIR := data/opensandbox

sandbox-up:
	docker pull opensandbox/code-interpreter:v1.1.0
	uvx opensandbox-server init-config $(SANDBOX_CONFIG) --example docker
	mkdir -p $(SANDBOX_STORE_DIR)
	perl -pi -e 's{\Q~/.opensandbox/opensandbox.db\E}{$(SANDBOX_STORE_DIR)/opensandbox.db}' $(SANDBOX_CONFIG)
	@echo "已生成 $(SANDBOX_CONFIG)；SQLite 状态在 $(SANDBOX_STORE_DIR)/（两者均已 gitignore）"

sandbox-server:
	OPENSANDBOX_INSECURE_SERVER=YES uvx opensandbox-server --config $(SANDBOX_CONFIG)

# E2E tests create a real sandbox container; they skip unless SANDBOX_E2E=1.
test-sandbox:
	SANDBOX_E2E=1 CGO_ENABLED=0 go test ./internal/sandbox -run E2E -v

build:
	mkdir -p bin
	CGO_ENABLED=0 go build -o bin/new-chat-model ./cmd/new-chat-model
	CGO_ENABLED=0 go build -o bin/new-chat-model-agent ./cmd/new-chat-model-agent
	CGO_ENABLED=0 go build -o bin/memory-session ./cmd/memory-session
	CGO_ENABLED=0 go build -o bin/tool-filesystem ./cmd/tool-filesystem
	CGO_ENABLED=0 go build -o bin/manual-tools ./cmd/manual-tools

test:
	CGO_ENABLED=0 go test ./...

%:
	@:
