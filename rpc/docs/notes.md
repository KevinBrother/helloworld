# RPC Learning Notes

## Core Concepts

### What is RPC?

RPC (Remote Procedure Call) is a technique that allows a program to execute a procedure (or function) on another computer as if it were a local call. The remote details are abstracted away from the programmer.

### Key Components

1. **Client**: Initiates the RPC call
2. **Server**: Hosts the remote procedure
3. **Interface/Contract**: Defines available procedures
4. **Transport**: Communication protocol (TCP, HTTP, etc.)
5. **Serialization**: Converting data for transmission

### RPC Flow

```
Client                    Server
  |                          |
  |--[1] Call Procedure----->|
  |                          |
  |                    [2] Deserialize
  |                    [3] Execute Procedure
  |                    [4] Serialize Result
  |<---[5] Return Result-----|
  |                          |
  |                    [6] Deserialize
```

---

## Serialization Formats

### JSON (JavaScript Object Notation)
- Human-readable
- Text-based
- Larger payload size
- Slower parsing
- Language agnostic

### Protobuf (Protocol Buffers)
- Binary format
- Compact size
- Faster parsing
- Schema required
- Not human-readable

### Thrift Binary
- Binary format
- Compact size
- Multiple protocol options
- Schema required
- Efficient

---

## Transport Protocols

### HTTP/1.1
- Text-based
- Request/Response model
- No multiplexing
- Widely supported

### HTTP/2
- Binary framing
- Multiplexing (multiple streams)
- Header compression (HPACK)
- Server push
- Used by gRPC

### TCP
- Lower level
- Connection-oriented
- Reliable delivery
- Used by many RPC frameworks

---

## Common Patterns

### Unary RPC
Standard request/response pattern.
```
Client Request  -->  Server
Client <-- Response Server
```

### Server Streaming
Server sends multiple responses to one request.
```
Client Request  -->  Server
Client <--- Stream --- Server
                    [Response 1]
                    [Response 2]
                    [Response N]
```

### Client Streaming
Client sends multiple requests, server responds once.
```
Client --- Stream -->  Server
       [Request 1]
       [Request 2]
       [Request N]
Client <-- Response Server
```

### Bidirectional Streaming
Both send multiple messages.
```
Client Request 1  -->  Server
Client Request 2  -->  Server
Client <--- Stream --- Server
Client <-- Response --- Server
```

---

## Error Handling

### JSON-RPC Error Codes
- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

### gRPC Status Codes
- `OK`: Success
- `INVALID_ARGUMENT`: Client specified invalid argument
- `NOT_FOUND`: Requested entity not found
- `ALREADY_EXISTS`: Entity already exists
- `UNAUTHENTICATED`: Request lacks authentication
- `PERMISSION_DENIED`: Caller lacks permission
- `UNAVAILABLE`: Service unavailable

---

## Interceptors/Middleware

Both gRPC and other frameworks support interceptors for:

- **Logging**: Logging requests and responses
- **Authentication**: Verifying credentials
- **Authorization**: Checking permissions
- **Rate Limiting**: Controlling request rates
- **Metrics**: Collecting performance data
- **Tracing**: Distributed tracing

---

## Type Safety Approaches

### 1. Code Generation (gRPC, Thrift)
- Define schema in IDL
- Generate types from schema
- Use generated types in code
- **Pros**: Exact contract, language independent
- **Cons**: Build step, schema maintenance

### 2. Manual Typing (JSON-RPC)
- Define types manually in each language
- Sync types between services manually
- **Pros**: No build step, flexible
- **Cons**: Error-prone, maintenance burden

### 3. Type Inference (tRPC)
- Define types once in implementation
- Framework infers and shares types
- **Pros**: Single source of truth, no maintenance
- **Cons**: Language specific (TypeScript)

---

## Performance Considerations

### Serialization
- Binary formats (Protobuf, Thrift) are faster than JSON
- Smaller payload size = faster transmission
- Consider zero-copy serialization for high throughput

### Transport
- HTTP/2 multiplexing reduces connection overhead
- Connection pooling improves performance
- Compression can reduce bandwidth usage

### Server Architecture
- Thread-per-connection (traditional)
- Event-driven (Node.js, Netty)
- Coroutine-based (Go)

---

## Best Practices

1. **Design for Failure**: Networks are unreliable
2. **Timeouts**: Always use timeouts on RPC calls
3. **Retries**: Implement exponential backoff
4. **Monitoring**: Track latency, error rates
5. **Versioning**: Plan for API evolution
6. **Documentation**: Keep schemas well documented
7. **Testing**: Test with real network calls

---

## Common Pitfalls

1. **Treating RPC like Local Calls**: Remember network failures
2. **Ignoring Latency**: Network adds significant delay
3. **No Timeouts**: Calls can hang indefinitely
4. **Tight Coupling**: Changes break clients
5. **Poor Error Handling**: Not all errors are exceptions
6. **Missing Idempotency**: Retry logic requires idempotent operations

---

## Further Learning

### Recommended Reading
- "Designing Data-Intensive Applications" by Martin Kleppmann
- gRPC documentation
- Protocol Buffers documentation

### Next Steps
1. Implement all examples in this project
2. Add performance benchmarks
3. Implement custom error handling
4. Add authentication/authorization
5. Build a custom RPC framework (krpc)
