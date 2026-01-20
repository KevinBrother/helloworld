import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/index';

// Create tRPC client with type inference
const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4000/trpc',
    }),
  ],
});

async function main() {
  console.log('=== tRPC Client Demo ===\n');
  console.log('Note: This requires the tRPC server to be running on http://localhost:4000\n');

  try {
    // 1. Health check
    console.log('1. Health check...');
    const health = await client.health.query();
    console.log(`   Status: ${health.status}, Users: ${health.userCount}\n`);

    // 2. List initial users
    console.log('2. Listing initial users...');
    const initialUsers = await client.listUsers.query();
    console.log(`   Total users: ${initialUsers.length}`);
    initialUsers.forEach((u) => {
      console.log(`   - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Age: ${u.age}`);
    });

    // 3. Get a specific user
    console.log('\n3. Getting user by ID...');
    const user = await client.getUser.query({ id: 1 });
    console.log(`   User:`, user);

    // 4. Create a new user
    console.log('\n4. Creating new user...');
    const newUser = await client.createUser.mutate({
      name: 'Charlie',
      email: 'charlie@example.com',
      age: 24,
    });
    console.log(`   Created user:`, newUser);

    // 5. List with filter
    console.log('\n5. Listing users with filter...');
    const filteredUsers = await client.listUsers.query({
      nameContains: 'a',
      minAge: 20,
    });
    console.log(`   Users containing 'a' and age >= 20: ${filteredUsers.length}`);
    filteredUsers.forEach((u) => {
      console.log(`   - ${u.name} (${u.age})`);
    });

    // 6. Update user
    console.log('\n6. Updating user...');
    const updatedUser = await client.updateUser.mutate({
      id: 1,
      name: 'Alice Smith',
      age: 29,
    });
    console.log(`   Updated user:`, updatedUser);

    // 7. Create multiple users
    console.log('\n7. Creating multiple users...');
    const batchUsers = await client.createUsers.mutate([
      { name: 'Diana', email: 'diana@example.com', age: 27 },
      { name: 'Eve', email: 'eve@example.com', age: 25 },
      { name: 'Frank', email: 'frank@example.com', age: 30 },
    ]);
    console.log(`   Created ${batchUsers.length} users`);
    batchUsers.forEach((u) => {
      console.log(`   - ${u.name} (ID: ${u.id})`);
    });

    // 8. Delete user
    console.log('\n8. Deleting user...');
    const deleteResult = await client.deleteUser.mutate({ id: 3 });
    console.log(`   ${deleteResult.message}`);

    // 9. List final users
    console.log('\n9. Listing final users...');
    const finalUsers = await client.listUsers.query();
    console.log(`   Total users: ${finalUsers.length}`);

    // 10. Test error handling
    console.log('\n10. Testing error handling...');
    try {
      await client.getUser.query({ id: 999 });
    } catch (error) {
      console.log(`   Expected error caught: ${(error as Error).message}`);
    }

    // 11. Test validation error
    console.log('\n11. Testing validation...');
    try {
      await client.createUser.mutate({
        name: '', // Invalid
        email: 'not-an-email',
        age: -5,
      });
    } catch (error) {
      console.log(`   Validation error caught: ${(error as Error).message}`);
    }

    console.log('\n=== Demo completed successfully ===');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
