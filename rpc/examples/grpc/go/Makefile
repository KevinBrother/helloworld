.PHONY: proto generate server client clean

# Generate protobuf code
proto/generate:
	@echo "Generating protobuf code..."
	protoc \
		--go_out=. \
		--go_opt=paths=source_relative \
		--go-grpc_out=. \
		--go-grpc_opt=paths=source_relative \
		proto/user.proto

# Alias for generate
generate: proto/generate

# Run server
server:
	@echo "Starting gRPC server..."
	go run server/main.go

# Run client
client:
	@echo "Starting gRPC client..."
	go run client/main.go

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	rm -f proto/*.pb.go

# Install protoc plugins (if needed)
install-tools:
	@echo "Installing protoc plugins..."
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
