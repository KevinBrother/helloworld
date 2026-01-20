# gRPC TypeScript Example

A gRPC example in TypeScript demonstrating unary RPC and streaming operations using `@grpc/grpc-js`.

## Features

- Unary RPC (standard request/response)
- Server-side streaming
- Client-side streaming
- Bidirectional streaming
- Dynamic proto loading with `@grpc/proto-loader`
- No code generation required

## Project Structure

```
.
├── proto/
│   └── user.proto      # Protocol buffer definition
├── server/
│   └── index.ts        # gRPC server
├── client/
│   └── index.ts        # gRPC client
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
pnpm install
```

## Running

### Start the Server

```bash
pnpm run dev:server
```

The server will listen on `localhost:50051`.

### Run the Client

In a new terminal:

```bash
pnpm run dev:client
```

## API Reference

### Unary RPC Methods

#### `GetUser(GetUserRequest) returns (GetUserResponse)`
Get a user by ID.

#### `CreateUser(CreateUserRequest) returns (CreateUserResponse)`
Create a new user.

#### `ListUsers(ListUsersRequest) returns (ListUsersResponse)`
List all users.

#### `UpdateUser(UpdateUserRequest) returns (UpdateUserResponse)`
Update an existing user.

#### `DeleteUser(DeleteUserRequest) returns (DeleteUserResponse)`
Delete a user by ID.

### Streaming Methods

#### `StreamUsers(StreamUsersRequest) returns (stream User)`
Server streaming: Streams users to the client with 500ms intervals.

#### `CreateUsers(stream CreateUserRequest) returns (CreateUsersResponse)`
Client streaming: Create multiple users from a client stream.

#### `UserChat(stream UserChatRequest) returns (stream UserChatResponse)`
Bidirectional streaming: Real-time chat-like interaction.

## Dynamic Proto Loading

This example uses `@grpc/proto-loader` to load the proto file at runtime without code generation:

```typescript
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition).user;
```

This approach is:
- Faster for development
- Easier to iterate on proto changes
- Suitable for TypeScript/JavaScript projects

For production, you might prefer using static code generation with `protoc` and `protoc-gen-ts`.

## Comparison with Go Implementation

| Feature | Go | TypeScript |
|---------|-----|------------|
| Proto loading | Static (code gen) | Dynamic |
| Type safety | Strong | Strong (TS) |
| Performance | Higher | Lower |
| Ease of development | Moderate | High (no code gen) |
