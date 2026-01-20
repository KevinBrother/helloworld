# JSON-RPC TypeScript Example

A JSON-RPC 2.0 implementation using TypeScript, Express, and native fetch API.

## Features

- Full JSON-RPC 2.0 compliant server and client
- User CRUD operations
- Type-safe client with TypeScript
- Input validation
- Error handling with proper JSON-RPC error codes

## Project Structure

```
.
├── types/
│   └── index.ts       # Type definitions
├── server/
│   └── index.ts       # Express server with JSON-RPC handler
├── client/
│   └── index.ts       # JSON-RPC client implementation
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
npm install
```

## Running

### Start the Server

```bash
npm run dev:server
```

The server will listen on `http://localhost:3000`.

### Run the Client

In a new terminal:

```bash
npm run dev:client
```

## API Reference

### Methods

All methods follow JSON-RPC 2.0 specification:

#### `getUser(id: number)`
Returns a user by ID.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "getUser",
  "params": 1,
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "age": 28
  },
  "id": 1
}
```

#### `create(user: CreateUserRequest)`
Creates a new user.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "create",
  "params": {
    "name": "Charlie",
    "email": "charlie@example.com",
    "age": 24
  },
  "id": 2
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": 3,
  "id": 2
}
```

#### `list()`
Returns all users.

#### `update(id: number, user: Partial<CreateUserRequest>)`
Updates an existing user.

#### `delete(id: number)`
Deletes a user by ID.

## Testing with cURL

```bash
# Get user
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getUser","params":1,"id":1}'

# Create user
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"create","params":{"name":"Dave","email":"dave@example.com","age":30},"id":2}'

# List users
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"list","params":null,"id":3}'
```

## Error Handling

The server uses standard JSON-RPC error codes:

- `-32700`: Parse error
- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
