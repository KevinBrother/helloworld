.PHONY: run run-chat-model run-chat-model-agent build test

RUN_ARGS := $(filter-out run run-chat-model run-chat-model-agent build test,$(MAKECMDGOALS))

# This project does not need cgo. Keeping it off avoids local macOS dyld issues
# from transitive dependencies during go test/go run.
run: run-chat-model

run-chat-model:
	CGO_ENABLED=0 go run ./cmd/new-chat-model -- $(RUN_ARGS)

run-chat-model-agent:
	CGO_ENABLED=0 go run ./cmd/new-chat-model-agent -- $(RUN_ARGS)

build:
	mkdir -p bin
	CGO_ENABLED=0 go build -o bin/new-chat-model ./cmd/new-chat-model
	CGO_ENABLED=0 go build -o bin/new-chat-model-agent ./cmd/new-chat-model-agent

test:
	CGO_ENABLED=0 go test ./...

%:
	@:
