import express from 'express';
import { JsonRpcRequest, JsonRpcResponse, User, CreateUserRequest } from '../types';

const app = express();
app.use(express.json());

// In-memory user storage
const users = new Map<number, User>();
let nextId = 1;

// Add some initial data
users.set(1, { id: 1, name: 'Alice', email: 'alice@example.com', age: 28 });
users.set(2, { id: 2, name: 'Bob', email: 'bob@example.com', age: 32 });
nextId = 3;

// JSON-RPC handler
app.post('/rpc', (req, res) => {
  const rpcReq = req.body as JsonRpcRequest;

  console.log(`[Request] ${rpcReq.method}`, JSON.stringify(rpcReq.params));

  const response: JsonRpcResponse = {
    jsonrpc: '2.0',
    id: rpcReq.id,
  };

  try {
    switch (rpcReq.method) {
      case 'getUser': {
        const id = rpcReq.params as number;
        const user = users.get(id);
        if (!user) {
          response.error = {
            code: -32602,
            message: `User with id ${id} not found`,
          };
        } else {
          response.result = user;
        }
        break;
      }

      case 'create': {
        const params = rpcReq.params as CreateUserRequest;

        // Validation
        if (!params.name || params.name.trim() === '') {
          response.error = {
            code: -32602,
            message: 'name is required',
          };
          break;
        }
        if (!params.email || params.email.trim() === '') {
          response.error = {
            code: -32602,
            message: 'email is required',
          };
          break;
        }
        if (!params.age || params.age <= 0) {
          response.error = {
            code: -32602,
            message: 'age must be positive',
          };
          break;
        }

        const user: User = {
          id: nextId++,
          name: params.name,
          email: params.email,
          age: params.age,
        };
        users.set(user.id, user);
        response.result = user.id;
        break;
      }

      case 'list': {
        response.result = Array.from(users.values());
        break;
      }

      case 'update': {
        const params = rpcReq.params as { id: number } & Partial<CreateUserRequest>;
        const user = users.get(params.id);

        if (!user) {
          response.error = {
            code: -32602,
            message: `User with id ${params.id} not found`,
          };
          break;
        }

        if (params.name !== undefined) user.name = params.name;
        if (params.email !== undefined) user.email = params.email;
        if (params.age !== undefined) user.age = params.age;

        response.result = user;
        break;
      }

      case 'delete': {
        const id = rpcReq.params as number;
        if (!users.has(id)) {
          response.error = {
            code: -32602,
            message: `User with id ${id} not found`,
          };
          break;
        }
        users.delete(id);
        response.result = 'User deleted successfully';
        break;
      }

      default:
        response.error = {
          code: -32601,
          message: `Method not found: ${rpcReq.method}`,
        };
    }
  } catch (error) {
    response.error = {
      code: -32603,
      message: 'Internal error',
      data: error instanceof Error ? error.message : String(error),
    };
  }

  console.log(`[Response]`, JSON.stringify(response));
  res.json(response);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', usersCount: users.size });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`JSON-RPC server listening on http://localhost:${PORT}`);
  console.log(`RPC endpoint: http://localhost:${PORT}/rpc`);
});
