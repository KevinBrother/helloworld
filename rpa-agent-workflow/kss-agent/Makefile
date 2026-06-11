.PHONY: run build test

# Go 1.22.x on newer macOS can produce cgo binaries without LC_UUID.
# External link mode keeps local runs compatible with dyld.
run:
	go run -ldflags='-linkmode=external' ./cmd

build:
	mkdir -p bin
	go build -ldflags='-linkmode=external' -o bin/kss-agent ./cmd

test:
	go test -ldflags='-linkmode=external' ./...
