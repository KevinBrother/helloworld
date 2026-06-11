.PHONY: run run-chat-model run-chat-model-agent build test

# This project does not need cgo. Keeping it off avoids local macOS dyld issues
# from transitive dependencies during go test/go run.
run: run-chat-model

run-chat-model:
	CGO_ENABLED=0 go run ./cmd/new-chat-model

run-chat-model-agent:
	CGO_ENABLED=0 go run ./cmd/new-chat-model-agent

build:
	mkdir -p bin
	CGO_ENABLED=0 go build -o bin/new-chat-model ./cmd/new-chat-model
	CGO_ENABLED=0 go build -o bin/new-chat-model-agent ./cmd/new-chat-model-agent

test:
	CGO_ENABLED=0 go test ./...
