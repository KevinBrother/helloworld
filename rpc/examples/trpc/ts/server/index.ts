import { initTRPC, TRPCError } from '@trpc/server';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';

// Initialize tRPC
const t = initTRPC.create();

// In-memory user storage
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

const users = new Map<number, User>();
let nextId = 1;

// Add initial users
users.set(1, { id: 1, name: 'Alice', email: 'alice@example.com', age: 28 });
users.set(2, { id: 2, name: 'Bob', email: 'bob@example.com', age: 32 });
nextId = 3;

// Define routers
const appRouter = t.router({
  // Get user by ID
  getUser: t.procedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => {
      const user = users.get(input.id);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `User with id ${input.id} not found`,
        });
      }
      return user;
    }),

  // List all users with optional filtering
  listUsers: t.procedure
    .input(
      z.object({
        nameContains: z.string().optional(),
        minAge: z.number().optional(),
        maxAge: z.number().optional(),
      }).optional()
    )
    .query(({ input }) => {
      const filters = input || {};
      let allUsers = Array.from(users.values());

      if (filters.nameContains) {
        allUsers = allUsers.filter((u) =>
          u.name.toLowerCase().includes(filters.nameContains!.toLowerCase())
        );
      }
      if (filters.minAge) {
        allUsers = allUsers.filter((u) => u.age >= filters.minAge!);
      }
      if (filters.maxAge) {
        allUsers = allUsers.filter((u) => u.age <= filters.maxAge!);
      }

      return allUsers;
    }),

  // Create a new user
  createUser: t.procedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email format'),
        age: z.number().positive('Age must be positive'),
      })
    )
    .mutation(({ input }) => {
      const user: User = {
        id: nextId++,
        name: input.name,
        email: input.email,
        age: input.age,
      };
      users.set(user.id, user);
      return user;
    }),

  // Update an existing user
  updateUser: t.procedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        age: z.number().positive().optional(),
      })
    )
    .mutation(({ input }) => {
      const user = users.get(input.id);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `User with id ${input.id} not found`,
        });
      }

      if (input.name !== undefined) user.name = input.name;
      if (input.email !== undefined) user.email = input.email;
      if (input.age !== undefined) user.age = input.age;

      return user;
    }),

  // Delete a user
  deleteUser: t.procedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => {
      const existed = users.delete(input.id);
      if (!existed) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `User with id ${input.id} not found`,
        });
      }
      return { success: true, message: 'User deleted successfully' };
    }),

  // Batch operations - Create multiple users
  createUsers: t.procedure
    .input(
      z.array(
        z.object({
          name: z.string().min(1),
          email: z.string().email(),
          age: z.number().positive(),
        })
      )
    )
    .mutation(({ input }) => {
      const createdUsers: User[] = [];
      for (const req of input) {
        const user: User = {
          id: nextId++,
          name: req.name,
          email: req.email,
          age: req.age,
        };
        users.set(user.id, user);
        createdUsers.push(user);
      }
      return createdUsers;
    }),

  // Health check
  health: t.procedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      userCount: users.size,
    };
  }),
});

// Export type router for client usage
export type AppRouter = typeof appRouter;

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Add tRPC middleware
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  })
);

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    userCount: users.size,
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`tRPC server listening on http://localhost:${PORT}`);
  console.log(`tRPC endpoint: http://localhost:${PORT}/trpc`);
});
