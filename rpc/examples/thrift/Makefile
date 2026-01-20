.PHONY: generate server client clean install-tools

# Generate Go code from Thrift IDL
generate:
	@echo "Generating Go code from Thrift IDL..."
	@mkdir -p gen-go
	thrift --gen go idl/user.thrift
	@echo "Generated code in gen-go/user/"

# Install Thrift compiler (macOS)
install-thrift:
	@echo "Installing Thrift compiler..."
	@if command -v brew > /dev/null 2>&1; then \
		brew install thrift; \
	else \
		echo "Please install Thrift manually from https://thrift.apache.org/docs/install/"; \
	fi

# Run server
server:
	@echo "Starting Thrift server..."
	THRIFT_DEMO=1 go run server/main.go

# Run client
client:
	@echo "Starting Thrift client..."
	THRIFT_DEMO=1 go run client/main.go

# Clean generated files
clean:
	@echo "Cleaning generated files..."
	rm -rf gen-go

# Help
help:
	@echo "Thrift Example - Make targets:"
	@echo ""
	@echo "  make install-thrift  - Install Thrift compiler (macOS with Homebrew)"
	@echo "  make generate        - Generate Go code from IDL"
	@echo "  make server          - Run the server"
	@echo "  make client          - Run the client"
	@echo "  make clean           - Clean generated files"
	@echo "  make help            - Show this help message"
