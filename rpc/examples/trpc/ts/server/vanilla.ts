import express from 'express';
import cors from 'cors';
import { z } from 'zod';

// Type definitions
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

interface CreateUserInput {
  name: string;
  email: string;
  age: number;
}

interface UpdateUserInput {
  id: number;
  name?: string;
  email?: string;
  age?: number;
}

// In-memory storage
const users = new Map<number, User>();
let nextId = 1;

// Add initial users
users.set(1, { id: 1, name: 'Alice', email: 'alice@example.com', age: 28 });
users.set(2, { id: 2, name: 'Bob', email: 'bob@example.com', age: 32 });
nextId = 3;

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  age: z.number().positive('Age must be positive'),
});

const updateUserSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  age: z.number().positive().optional(),
});

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    userCount: users.size,
  });
});

// GET /users - List all users
app.get('/users', (req, res) => {
  const nameContains = req.query.nameContains as string | undefined;
  const minAge = req.query.minAge ? Number(req.query.minAge) : undefined;
  const maxAge = req.query.maxAge ? Number(req.query.maxAge) : undefined;

  let allUsers = Array.from(users.values());

  if (nameContains) {
    allUsers = allUsers.filter((u) =>
      u.name.toLowerCase().includes(nameContains.toLowerCase())
    );
  }
  if (minAge) {
    allUsers = allUsers.filter((u) => u.age >= minAge);
  }
  if (maxAge) {
    allUsers = allUsers.filter((u) => u.age <= maxAge);
  }

  res.json({ users: allUsers });
});

// GET /users/:id - Get user by ID
app.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = users.get(id);

  if (!user) {
    return res.status(404).json({ error: `User with id ${id} not found` });
  }

  res.json({ user });
});

// POST /users - Create user
app.post('/users', (req, res) => {
  const result = createUserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors,
    });
  }

  const user: User = {
    id: nextId++,
    name: result.data.name,
    email: result.data.email,
    age: result.data.age,
  };

  users.set(user.id, user);

  res.status(201).json(user);
});

// PUT /users/:id - Update user
app.put('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = users.get(id);

  if (!user) {
    return res.status(404).json({ error: `User with id ${id} not found` });
  }

  const result = updateUserSchema.safeParse({ id, ...req.body });

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.errors,
    });
  }

  if (result.data.name !== undefined) user.name = result.data.name;
  if (result.data.email !== undefined) user.email = result.data.email;
  if (result.data.age !== undefined) user.age = result.data.age;

  res.json(user);
});

// DELETE /users/:id - Delete user
app.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const existed = users.delete(id);

  if (!existed) {
    return res.status(404).json({ error: `User with id ${id} not found` });
  }

  res.json({ success: true, message: 'User deleted successfully' });
});

// POST /users/batch - Create multiple users
app.post('/users/batch', (req, res) => {
  const usersData = z.array(createUserSchema).safeParse(req.body);

  if (!usersData.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: usersData.error.errors,
    });
  }

  const createdUsers: User[] = [];
  for (const data of usersData.data) {
    const user: User = {
      id: nextId++,
      name: data.name,
      email: data.email,
      age: data.age,
    };
    users.set(user.id, user);
    createdUsers.push(user);
  }

  res.status(201).json(createdUsers);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`REST API server (tRPC-style) listening on http://localhost:${PORT}`);
});
