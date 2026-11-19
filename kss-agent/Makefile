.PHONY: run run-chat-model run-chat-model-agent run-memory-session run-tool-filesystem run-manual-tools build test

RUN_ARGS := $(filter-out run run-chat-model run-chat-model-agent run-memory-session run-tool-filesystem run-manual-tools build test,$(MAKECMDGOALS))

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
