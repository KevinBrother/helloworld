import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';
import path from 'path';

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Load proto file
const PROTO_PATH = path.resolve(__dirname, '../proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition).user as any;

// In-memory user storage
const users = new Map<number, User>();
let nextId = 1;

// Add initial users
users.set(1, { id: 1, name: 'Alice', email: 'alice@example.com', age: 28 });
users.set(2, { id: 2, name: 'Bob', email: 'bob@example.com', age: 32 });
nextId = 3;

// Server handlers
const userService = {
  GetUser: (call: any, callback: any) => {
    console.log('[gRPC] GetUser called with id:', call.request.id);
    const user = users.get(call.request.id);
    if (!user) {
      callback(null, { error: `User with id ${call.request.id} not found` });
    } else {
      callback(null, { user });
    }
  },

  CreateUser: (call: any, callback: any) => {
    console.log('[gRPC] CreateUser called');
    const { name, email, age } = call.request;

    if (!name || !email || age <= 0) {
      callback(null, { error: 'Invalid input: name, email are required and age must be positive' });
      return;
    }

    const user: User = { id: nextId++, name, email, age };
    users.set(user.id, user);
    callback(null, { id: user.id });
  },

  ListUsers: (call: any, callback: any) => {
    console.log('[gRPC] ListUsers called');
    const allUsers = Array.from(users.values());
    callback(null, { users: allUsers });
  },

  UpdateUser: (call: any, callback: any) => {
    console.log('[gRPC] UpdateUser called');
    const user = users.get(call.request.id);

    if (!user) {
      callback(null, { error: `User with id ${call.request.id} not found` });
      return;
    }

    if (call.request.name) user.name = call.request.name;
    if (call.request.email) user.email = call.request.email;
    if (call.request.age > 0) user.age = call.request.age;

    callback(null, { user });
  },

  DeleteUser: (call: any, callback: any) => {
    console.log('[gRPC] DeleteUser called');
    const success = users.delete(call.request.id);
    callback(null, {
      success,
      message: success ? 'User deleted successfully' : `User with id ${call.request.id} not found`,
    });
  },

  StreamUsers: (call: any) => {
    console.log('[gRPC] StreamUsers called (server streaming)');
    const allUsers = Array.from(users.values());
    const count = Math.min(call.request.count || allUsers.length, allUsers.length);

    let index = 0;
    const interval = setInterval(() => {
      if (index >= count) {
        clearInterval(interval);
        call.end();
        return;
      }

      call.write(allUsers[index]);
      index++;
    }, 500);
  },

  CreateUsers: (call: any) => {
    console.log('[gRPC] CreateUsers called (client streaming)');
    const ids: number[] = [];

    call.on('data', (req: any) => {
      console.log('  Received user:', req.name);
      const { name, email, age } = req;
      if (name && email && age > 0) {
        const user: User = { id: nextId++, name, email, age };
        users.set(user.id, user);
        ids.push(user.id);
      }
    });

    call.on('end', () => {
      console.log('  Client streaming ended');
      call.end({ ids, count: ids.length });
    });
  },

  UserChat: (call: any) => {
    console.log('[gRPC] UserChat called (bidirectional streaming)');

    call.on('data', (req: any) => {
      console.log(`  Chat received from user ${req.user_id}: ${req.message}`);
      call.write({
        message: `Echo: ${req.message}`,
        timestamp: Date.now(),
      });
    });

    call.on('end', () => {
      console.log('  Chat ended');
      call.end();
    });
  },
};

// Create and start server
const server = new grpc.Server();

server.addService(proto.UserService.service, userService);

// Enable reflection for grpcurl debugging
const reflection = new ReflectionService(packageDefinition);
reflection.addToServer(server);

const PORT = process.env.PORT || '50051';

server.bindAsync(
  `0.0.0.0:${PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (error: Error | null, port: number) => {
    if (error) {
      console.error('Failed to start server:', error);
      return;
    }

    console.log(`gRPC server listening on port ${port}`);
  }
);
