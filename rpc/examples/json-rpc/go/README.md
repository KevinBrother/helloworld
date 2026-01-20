# JSON-RPC Go Example

A simple JSON-RPC example using Go's standard `net/rpc` package with JSON codec.

## Features

- User CRUD operations (Create, Read, Update, Delete, List)
- JSON-RPC protocol over TCP
- Thread-safe implementation with mutex protection
- Input validation
- Comprehensive unit tests

## Project Structure

```
.
├── server/
│   ├── main.go        # Server entry point
│   ├── service.go     # UserService implementation
│   ├── types.go       # Type definitions
│   └── types_test.go  # Unit tests
└── client/
    └── main.go        # Client implementation
```

## Running

### Start the Server

```bash
cd server
go run main.go service.go types.go
```

The server will listen on `localhost:1234`.

### Run the Client

```bash
cd client
go run main.go ../server/types.go ../server/service.go
```

### Run Tests

```bash
cd server
go test -v
```

## API Reference

### UserService.CreateUser

Creates a new user.

**Request:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "age": 28
}
```

**Response:**
```json
{
  "id": 1,
  "error": ""
}
```

### UserService.GetUser

Retrieves a user by ID.

**Request:** `1` (user ID)

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "age": 28
  },
  "error": ""
}
```

### UserService.ListUsers

Returns all users.

**Response:**
```json
{
  "users": [...],
  "error": ""
}
```

### UserService.UpdateUser

Updates an existing user.

**Request:**
```json
{
  "id": 1,
  "name": "Alice Smith",
  "email": "alice.smith@example.com",
  "age": 29
}
```

### UserService.DeleteUser

Deletes a user by ID.

**Request:** `1` (user ID)

## Notes

- The server uses Go's built-in `net/rpc` package with `jsonrpc` codec
- RPC methods must follow the signature: `func (t *T) MethodName(argType T1, replyType T2) error`
- The server handles multiple concurrent connections using goroutines
- All user operations are thread-safe with read-write mutex protection
