# gRPC Go Example

A comprehensive gRPC example in Go demonstrating unary RPC, server streaming, client streaming, and bidirectional streaming.

## Features

- Unary RPC (standard request/response)
- Server-side streaming
- Client-side streaming
- Bidirectional streaming
- Interceptors for logging
- Protocol Buffers for serialization

## Project Structure

```
.
├── proto/
│   ├── user.proto      # Protocol buffer definition
│   └── user.pb.go      # Generated code (run make generate)
├── server/
│   └── main.go         # gRPC server
├── client/
│   └── main.go         # gRPC client
├── go.mod
├── Makefile
└── README.md
```

## Prerequisites

1. Install Protocol Buffers compiler:
   ```bash
   brew install protobuf  # macOS
   ```

2. Install Go protobuf plugins:
   ```bash
   make install-tools
   ```

## Setup

### Generate protobuf code

```bash
make generate
```

This will generate `proto/user.pb.go` from `proto/user.proto`.

## Running

### Start the Server

```bash
make server
```

The server will listen on `localhost:50051`.

### Run the Client

In a new terminal:

```bash
make client
```

## API Reference

### Unary RPC Methods

#### `GetUser(GetUserRequest) returns (GetUserResponse)`
Get a user by ID.

#### `CreateUser(CreateUserRequest) returns (CreateUserResponse)`
Create a new user.

#### `ListUsers(ListUsersRequest) returns (ListUsersResponse)`
List all users with optional filtering.

#### `UpdateUser(UpdateUserRequest) returns (UpdateUserResponse)`
Update an existing user.

#### `DeleteUser(DeleteUserRequest) returns (DeleteUserResponse)`
Delete a user by ID.

### Streaming Methods

#### `StreamUsers(StreamUsersRequest) returns (stream User)`
Server streaming: Streams users to the client.

#### `CreateUsers(stream CreateUserRequest) returns (CreateUsersResponse)`
Client streaming: Create multiple users from a client stream.

#### `UserChat(stream UserChatRequest) returns (stream UserChatResponse)`
Bidirectional streaming: Real-time chat-like interaction.

## Testing with grpcurl

Install grpcurl:
```bash
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
```

List services:
```bash
grpcurl -plaintext localhost:50051 list
```

Call a method:
```bash
grpcurl -plaintext -d '{"id": 1}' localhost:50051 user.UserService/GetUser
```

## Interceptors

The server uses a logging interceptor that:
- Logs each RPC call
- Measures execution time
- Logs errors with status codes

## Error Handling

The gRPC server uses canonical error codes from `google.golang.org/grpc/codes`:
- `InvalidArgument`: Invalid parameters
- `NotFound`: Resource not found
- `Internal`: Internal server errors
