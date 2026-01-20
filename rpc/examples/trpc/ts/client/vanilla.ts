// Vanilla TypeScript client for REST API
// This demonstrates what you'd use without tRPC

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
  name?: string;
  email?: string;
  age?: number;
}

interface ApiResponse<T> {
  user?: T;
  users?: T[];
  error?: string;
  success?: boolean;
  message?: string;
}

const BASE_URL = 'http://localhost:4000';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // GET /users - List all users
  async listUsers(filters?: {
    nameContains?: string;
    minAge?: number;
    maxAge?: number;
  }): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.nameContains) params.append('nameContains', filters.nameContains);
    if (filters?.minAge) params.append('minAge', String(filters.minAge));
    if (filters?.maxAge) params.append('maxAge', String(filters.maxAge));

    const query = params.toString();
    const response = await this.request<ApiResponse<User>>(
      `/users${query ? `?${query}` : ''}`
    );
    return response.users || [];
  }

  // GET /users/:id - Get user by ID
  async getUser(id: number): Promise<User> {
    const response = await this.request<ApiResponse<User>>(`/users/${id}`);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.user!;
  }

  // POST /users - Create user
  async createUser(input: CreateUserInput): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // PUT /users/:id - Update user
  async updateUser(id: number, input: UpdateUserInput): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  // DELETE /users/:id - Delete user
  async deleteUser(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // POST /users/batch - Create multiple users
  async createUsers(inputs: CreateUserInput[]): Promise<User[]> {
    return this.request<User[]>('/users/batch', {
      method: 'POST',
      body: JSON.stringify(inputs),
    });
  }

  // GET /health - Health check
  async health(): Promise<{ status: string; userCount: number }> {
    return this.request<{ status: string; userCount: number }>('/health');
  }
}

async function main() {
  const api = new ApiClient();

  console.log('=== REST API Client Demo (Vanilla TypeScript) ===\n');
  console.log('Note: This requires the server to be running on http://localhost:4000\n');

  try {
    // 1. Health check
    console.log('1. Health check...');
    const health = await api.health();
    console.log(`   Status: ${health.status}, Users: ${health.userCount}\n`);

    // 2. List initial users
    console.log('2. Listing initial users...');
    const initialUsers = await api.listUsers();
    console.log(`   Total users: ${initialUsers.length}`);
    initialUsers.forEach((u) => {
      console.log(`   - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Age: ${u.age}`);
    });

    // 3. Get a specific user
    console.log('\n3. Getting user by ID...');
    const user = await api.getUser(1);
    console.log(`   User:`, user);

    // 4. Create a new user
    console.log('\n4. Creating new user...');
    const newUser = await api.createUser({
      name: 'Charlie',
      email: 'charlie@example.com',
      age: 24,
    });
    console.log(`   Created user:`, newUser);

    // 5. List with filter
    console.log('\n5. Listing users with filter...');
    const filteredUsers = await api.listUsers({
      nameContains: 'a',
      minAge: 20,
    });
    console.log(`   Users containing 'a' and age >= 20: ${filteredUsers.length}`);

    // 6. Update user
    console.log('\n6. Updating user...');
    const updatedUser = await api.updateUser(1, {
      name: 'Alice Smith',
      age: 29,
    });
    console.log(`   Updated user:`, updatedUser);

    // 7. Create multiple users
    console.log('\n7. Creating multiple users...');
    const batchUsers = await api.createUsers([
      { name: 'Diana', email: 'diana@example.com', age: 27 },
      { name: 'Eve', email: 'eve@example.com', age: 25 },
    ]);
    console.log(`   Created ${batchUsers.length} users`);

    // 8. Delete user
    console.log('\n8. Deleting user...');
    const deleteResult = await api.deleteUser(3);
    console.log(`   ${deleteResult.message}`);

    // 9. List final users
    console.log('\n9. Listing final users...');
    const finalUsers = await api.listUsers();
    console.log(`   Total users: ${finalUsers.length}`);

    console.log('\n=== Demo completed successfully ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
