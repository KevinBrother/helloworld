import { JsonRpcRequest, JsonRpcResponse, User, CreateUserRequest } from '../types';

const RPC_URL = process.env.RPC_URL || 'http://localhost:3000/rpc';

let requestId = 0;

/**
 * JSON-RPC Client
 */
export class JsonRpcClient {
  constructor(private url: string) {}

  /**
   * Call a JSON-RPC method
   */
  async call<T = unknown>(method: string, params: unknown): Promise<T> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++requestId,
    };

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as JsonRpcResponse<T>;

    if (data.error) {
      throw new Error(`RPC Error ${data.error.code}: ${data.error.message}`);
    }

    if (data.result === undefined) {
      throw new Error('No result in RPC response');
    }

    return data.result;
  }

  // Service methods
  async getUser(id: number): Promise<User> {
    return this.call<User>('getUser', id);
  }

  async create(user: CreateUserRequest): Promise<number> {
    return this.call<number>('create', user);
  }

  async list(): Promise<User[]> {
    return this.call<User[]>('list', null);
  }

  async update(id: number, user: Partial<CreateUserRequest>): Promise<User> {
    return this.call<User>('update', { id, ...user });
  }

  async delete(id: number): Promise<string> {
    return this.call<string>('delete', id);
  }
}

/**
 * Demo client
 */
async function main() {
  const client = new JsonRpcClient(RPC_URL);

  console.log('=== JSON-RPC TypeScript Client Demo ===\n');

  try {
    // 1. List initial users
    console.log('1. Listing initial users...');
    const initialUsers = await client.list();
    console.log(`   Found ${initialUsers.length} users:`);
    initialUsers.forEach((u) => {
      console.log(`   - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Age: ${u.age}`);
    });

    // 2. Create new users
    console.log('\n2. Creating new users...');
    const charlieId = await client.create({
      name: 'Charlie',
      email: 'charlie@example.com',
      age: 24,
    });
    console.log(`   Created user with ID: ${charlieId}`);

    const dianaId = await client.create({
      name: 'Diana',
      email: 'diana@example.com',
      age: 27,
    });
    console.log(`   Created user with ID: ${dianaId}`);

    // 3. Get a specific user
    console.log('\n3. Getting user by ID...');
    const user = await client.getUser(charlieId);
    console.log(`   User: ${JSON.stringify(user, null, 2)}`);

    // 4. Update a user
    console.log('\n4. Updating user...');
    const updatedUser = await client.update(charlieId, {
      name: 'Charlie Brown',
      age: 25,
    });
    console.log(`   Updated user: ${JSON.stringify(updatedUser, null, 2)}`);

    // 5. List all users again
    console.log('\n5. Listing all users...');
    const allUsers = await client.list();
    console.log(`   Total users: ${allUsers.length}`);

    // 6. Delete a user
    console.log('\n6. Deleting user...');
    const deleteResult = await client.delete(dianaId);
    console.log(`   ${deleteResult}`);

    // 7. List users after deletion
    console.log('\n7. Listing users after deletion...');
    const finalUsers = await client.list();
    console.log(`   Total users: ${finalUsers.length}`);

    // 8. Test error handling - get non-existent user
    console.log('\n8. Testing error handling...');
    try {
      await client.getUser(999);
    } catch (error) {
      console.log(`   Expected error: ${(error as Error).message}`);
    }

    // 9. Test validation error
    console.log('\n9. Testing validation...');
    try {
      await client.create({ name: '', email: 'test@example.com', age: 25 });
    } catch (error) {
      console.log(`   Validation error: ${(error as Error).message}`);
    }

    console.log('\n=== Demo completed successfully ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  main();
}

export { main as demo };
