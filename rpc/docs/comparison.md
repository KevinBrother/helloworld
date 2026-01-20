# RPC Frameworks Comparison

This document provides a comprehensive comparison of the RPC frameworks implemented in this project.

## Overview

| Framework | Language | Schema Required | Streaming | Type Safety | Learning Curve |
|-----------|----------|-----------------|-----------|-------------|----------------|
| JSON-RPC | Go, TS | No | No | Manual | Low |
| gRPC | Go, TS | Yes (Protobuf) | Yes | Strong | Medium |
| Thrift | Go | Yes (IDL) | Limited | Strong | Medium |
| tRPC | TS | No (Inferred) | No | Full | Low-Medium |

---

## JSON-RPC

### Characteristics

- **Protocol**: JSON-RPC 2.0 over HTTP/TCP
- **Serialization**: JSON
- **Schema**: None required
- **Type Safety**: Manual implementation

### Pros

- Simple to implement and understand
- Human-readable (JSON format)
- Language agnostic
- No build/code generation step
- Easy debugging

### Cons

- No native streaming support
- No built-in validation
- Higher payload size (JSON overhead)
- Manual type safety

### Best For

- Simple internal services
- Prototyping and MVP
- Teams new to RPC
- Services where debugging is important

### Performance

- **Latency**: Medium (JSON parsing overhead)
- **Throughput**: Medium
- **Payload Size**: Large (JSON text)

---

## gRPC

### Characteristics

- **Protocol**: HTTP/2
- **Serialization**: Protocol Buffers (binary)
- **Schema**: Yes (.proto files)
- **Type Safety**: Strong (generated code)

### Pros

- High performance (binary serialization)
- Built-in streaming (unary, server, client, bidi)
- Strongly typed (generated code)
- Efficient serialization (small payloads)
- HTTP/2 benefits (multiplexing, compression)
- Wide language support

### Cons

- Requires code generation
- Less human-readable (binary protocol)
- Steeper learning curve
- Harder debugging
- Proto files as maintenance burden

### Best For

- High-performance microservices
- Polyglot environments
- Services needing streaming
- Production-grade systems

### Performance

- **Latency**: Low (binary, HTTP/2)
- **Throughput**: High
- **Payload Size**: Small (binary)

### Streaming Support

| Type | Description | Use Case |
|------|-------------|----------|
| Unary | Standard request/response | Most operations |
| Server Streaming | Server sends multiple responses | Paginated results, real-time updates |
| Client Streaming | Client sends multiple requests | Batch processing, file uploads |
| Bidi Streaming | Both send multiple messages | Chat, real-time collaboration |

---

## Thrift

### Characteristics

- **Protocol**: Custom binary protocol
- **Serialization**: Thrift binary
- **Schema**: Yes (.thrift IDL)
- **Type Safety**: Strong (generated code)

### Pros

- High performance (binary serialization)
- Multiple protocol options (binary, compact, JSON)
- Multiple transport options
- Mature and battle-tested
- Good for polyglot environments

### Cons

- Requires code generation
- Limited streaming support
- Less active development than gRPC
- Steeper learning curve
- Complex configuration

### Best For

- Legacy systems
- High-performance services needing multiple protocols
- Facebook/Meta ecosystem

### Performance

- **Latency**: Low (binary)
- **Throughput**: High
- **Payload Size**: Small (binary)

### Thrift vs gRPC

| Feature | Thrift | gRPC |
|---------|--------|------|
| Protocol | Custom binary | HTTP/2 |
| Streaming | Limited | Full support |
| Code Gen | Required | Required |
| Browser Support | Limited | Better |
| Community | Smaller | Larger |

---

## tRPC

### Characteristics

- **Protocol**: HTTP/HTTPS (usually JSON)
- **Serialization**: JSON
- **Schema**: No (types inferred from TypeScript)
- **Type Safety**: Full end-to-end

### Pros

- Zero schema maintenance (types inferred)
- Full end-to-end type safety
- Excellent developer experience
- No code generation
- Fast iteration
- Great for TypeScript monorepos

### Cons

- TypeScript/JavaScript only
- Tied to TypeScript ecosystem
- Not ideal for public APIs
- Less mature than gRPC
- JSON serialization overhead

### Best For

- Full-stack TypeScript apps (Next.js, React)
- Internal APIs in TypeScript shops
- Rapid development
- Teams prioritizing DX

### Performance

- **Latency**: Medium (JSON)
- **Throughput**: Medium
- **Payload Size**: Large (JSON)

### tRPC vs Traditional REST

| Feature | tRPC | REST + OpenAPI |
|---------|------|----------------|
| Type Safety | Automatic | Manual or generated |
| Schema Files | None | OpenAPI/Swagger |
| Code Gen | None | Often required |
| Autocomplete | Full | Limited |

---

## Feature Comparison Matrix

| Feature | JSON-RPC | gRPC | Thrift | tRPC |
|---------|----------|------|--------|------|
| **Schema Required** | No | Yes | Yes | No* |
| **Code Generation** | No | Yes | Yes | No |
| **Streaming** | No | Yes | Limited | No |
| **Type Safety** | Manual | Strong | Strong | Full |
| **Binary Protocol** | No | Yes | Yes | No |
| **HTTP/2** | Optional | Yes | No | No |
| **Browser Support** | Excellent | Growing | Limited | Excellent |
| **Learning Curve** | Low | Medium | Medium | Low |
| **Debugging** | Easy | Hard | Hard | Easy |
| **Performance** | Medium | High | High | Medium |

*tRPC infers schema from implementation

---

## Performance Comparison

Theoretical performance rankings (1 = best):

| Metric | JSON-RPC | gRPC | Thrift | tRPC |
|--------|----------|------|--------|------|
| Serialization Speed | 4 | 2 | 1 | 4 |
| Network Efficiency | 4 | 1 | 2 | 4 |
| Development Speed | 1 | 3 | 3 | 1 |
| Type Safety | 4 | 1 | 1 | 1 |
| Debugging Ease | 1 | 4 | 4 | 1 |

---

## When to Choose Which Framework

### Choose JSON-RPC when:
- Building simple internal services
- You need something quick and easy
- Debugging is a priority
- Working with teams new to RPC

### Choose gRPC when:
- Performance is critical
- You need streaming
- Working in a polyglot environment
- Building production microservices
- Need HTTP/2 benefits

### Choose Thrift when:
- Working with legacy Thrift systems
- Need multiple protocol options
- In the Meta/Facebook ecosystem
- Need high performance without HTTP/2

### Choose tRPC when:
- Building full-stack TypeScript apps
- Developer experience is priority
- Want type safety without schema maintenance
- Rapid iteration is important
- Team is TypeScript-focused

---

## Code Comparison Examples

### JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "method": "getUser",
  "params": 1,
  "id": 1
}
```

### gRPC (Protobuf)
```protobuf
message GetUserRequest {
  int32 id = 1;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}
```

### Thrift IDL
```thrift
service UserService {
  GetUserResponse getUser(1: GetUserRequest req);
}

struct GetUserRequest {
  1: i32 id,
}
```

### tRPC
```typescript
const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => users.get(input.id)),
});
```

---

## Conclusion

Each RPC framework has its strengths and ideal use cases:

- **JSON-RPC**: Simple, easy, good for getting started
- **gRPC**: Industry standard for high-performance services
- **Thrift**: Battle-tested, good for legacy systems
- **tRPC**: Modern DX-first approach for TypeScript

For learning purposes, start with JSON-RPC to understand RPC fundamentals, then explore gRPC for production-grade features, and try tRPC for the best developer experience in TypeScript.
