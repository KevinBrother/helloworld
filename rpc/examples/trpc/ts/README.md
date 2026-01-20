# tRPC TypeScript Example

A tRPC example demonstrating end-to-end type safety without schema definition files.

## What is tRPC?

tRPC (TypeScript Remote Procedure Call) is a framework for building end-to-end typesafe APIs without needing to define schemas. It leverages TypeScript's type inference to provide full type safety between server and client.

## Key Features

- **No schema definition**: Types are inferred from your implementation
- **End-to-end type safety**: Types are shared between server and client automatically
- **Zero code generation**: Everything works through TypeScript's type system
- **Autocomplete everywhere**: Full IDE support on both client and server
- **Built-in validation**: Uses Zod for runtime type validation

## Project Structure

```
.
├── server/
│   ├── index.ts        # tRPC server implementation
│   └── vanilla.ts      # Vanilla REST API for comparison
├── client/
│   ├── index.ts        # tRPC client
│   └── vanilla.ts      # Vanilla fetch client
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
npm install
```

## Running

### Option 1: Full tRPC (Recommended)

**Start the server:**
```bash
npm run dev:server
```

**Run the client** (in a new terminal):
```bash
npm run dev:client
```

### Option 2: Vanilla REST API (For comparison)

**Start the server:**
```bash
npm run dev:server:vanilla
```

**Run the client** (in a new terminal):
```bash
npm run dev:client:vanilla
```

## API Reference

### tRPC Procedures

#### Queries (Read operations)

```typescript
// Get user by ID
const user = await client.getUser.query({ id: 1 });

// List users with optional filters
const users = await client.listUsers.query({
  nameContains: 'Alice',
  minAge: 20,
  maxAge: 40
});

// Health check
const health = await client.health.query();
```

#### Mutations (Write operations)

```typescript
// Create a user
const newUser = await client.createUser.mutate({
  name: 'Charlie',
  email: 'charlie@example.com',
  age: 24
});

// Update a user
const updated = await client.updateUser.mutate({
  id: 1,
  name: 'Alice Smith',
  age: 29
});

// Delete a user
const result = await client.deleteUser.mutate({ id: 1 });

// Batch create users
const users = await client.createUsers.mutate([
  { name: 'Diana', email: 'diana@example.com', age: 27 },
  { name: 'Eve', email: 'eve@example.com', age: 25 }
]);
```

## How Type Safety Works

1. **Server**: Define procedures with Zod schemas for input validation
2. **Export**: Export the router type as `AppRouter`
3. **Client**: Import `AppRouter` type for full type inference

```typescript
// server/index.ts
const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => { /* ... */ }),
});

export type AppRouter = typeof appRouter;

// client/index.ts
const client = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: 'http://localhost:4000/trpc' })],
});

// Fully typed!
const user = await client.getUser.query({ id: 1 });
//          ^^^^^^ fully typed with autocomplete
```

## Comparison: tRPC vs Traditional REST API

| Feature | tRPC | Traditional REST |
|---------|------|------------------|
| Type safety | End-to-end | Manual typing |
| Schema files | Not needed | Often required (OpenAPI) |
| Code generation | Not needed | Often required |
| Autocomplete | Full | Limited |
| Validation | Built-in (Zod) | Manual |
| Learning curve | Moderate | Low |
| Browser support | Any | Any |

## Why tRPC?

1. **Developer Experience**: Full autocomplete and type safety across the entire stack
2. **Less Boilerplate**: No need to maintain separate schema files or generate types
3. **Fast Iteration**: Changes to API are immediately reflected in client types
4. **TypeScript Native**: Built specifically for TypeScript ecosystems

## When to Use tRPC

- Building full-stack TypeScript applications (Next.js, React, etc.)
- Teams comfortable with TypeScript
- Projects where type safety is a priority
- Rapid prototyping and iteration

## When NOT to Use tRPC

- Public APIs consumed by third parties
- Multi-language environments (non-TypeScript clients)
- Teams unfamiliar with TypeScript
- Projects requiring OpenAPI/Swagger documentation
