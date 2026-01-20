# Thrift Go Example

A Thrift RPC example in Go demonstrating Apache Thrift framework usage.

## What is Apache Thrift?

Apache Thrift is a software framework for scalable cross-language services development. It combines a software stack with a code generation engine to build services that work efficiently and seamlessly between many programming languages.

## Features

- Cross-language service development
- Binary protocol for efficient serialization
- Simple IDL (Interface Definition Language)
- Built-in types and services
- Supports multiple protocols (Binary, JSON, Compact, etc.)

## Project Structure

```
.
├── idl/
│   └── user.thrift      # Thrift IDL definition
├── gen-go/              # Generated Go code (after running thrift --gen go)
│   └── user/
├── server/
│   └── main.go          # Thrift server
├── client/
│   └── main.go          # Thrift client
├── go.mod
├── Makefile
└── README.md
```

## Prerequisites

### Install Thrift Compiler

**macOS:**
```bash
brew install thrift
```

**Ubuntu/Debian:**
```bash
apt-get install thrift-compiler
```

**Or build from source:**
```bash
git clone https://github.com/apache/thrift.git
cd thrift
./bootstrap.sh
./configure
make
sudo make install
```

## Setup

### Generate Go code from IDL

```bash
make generate
```

This will generate Go code in `gen-go/user/` directory.

## Running

### Start the Server

```bash
make server
```

The server will listen on `localhost:9090`.

### Run the Client

In a new terminal:

```bash
make client
```

## IDL Structure

The `user.thrift` file defines:

1. **Data Structures** (structs): User, Request/Response types
2. **Exceptions**: UserException for error handling
3. **Service Interface**: UserService with method definitions

## API Reference

### Service Methods

#### `GetUser(GetUserRequest) throws (UserException)`
Get a user by ID.

#### `CreateUser(CreateUserRequest) throws (UserException)`
Create a new user.

#### `ListUsers(ListUsersRequest) throws (UserException)`
List all users.

#### `UpdateUser(UpdateUserRequest) throws (UserException)`
Update an existing user.

#### `DeleteUser(DeleteUserRequest) throws (UserException)`
Delete a user by ID.

## Thrift vs gRPC

| Feature | Thrift | gRPC |
|---------|--------|------|
| Protocol | Binary (multiple options) | HTTP/2 + Protobuf |
| IDL | Thrift IDL | Protobuf |
| Streaming | Limited | Full support |
| Languages | Many | Many |
| Performance | High | High |
| Code Generation | Required | Required |
| Browser Support | Limited | Growing |

## Server Types

Thrift provides several server types:

- **TSimpleServer**: Single-threaded, for testing
- **TThreadedServer**: One thread per connection
- **TThreadPoolServer**: Thread pool
- **TNonblockingServer**: Non-blocking I/O
- **TProcessedThreadPoolServer**: Process-based thread pool

Example:
```go
// Simple server (for testing)
server := thrift.NewTSimpleServer4(
    processor,
    transport,
    protocolFactory,
    protocolFactory,
)

// Threaded server (production)
server := thrift.NewTThreadedServer(
    processor,
    transport,
)
```

## Protocol Options

Thrift supports multiple protocols:

- **TBinaryProtocol**: Binary encoding (default, most efficient)
- **TCompactProtocol**: More compact binary encoding
- **TJSONProtocol**: JSON encoding
- **TSimpleJSONProtocol**: Simple JSON (readable)
- **TDebugProtocol**: For debugging

Example:
```go
protocolFactory := thrift.NewTCompactProtocolFactory()
```
