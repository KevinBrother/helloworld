import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
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

// Create client
const client = new proto.UserService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

async function main() {
  console.log('=== gRPC TypeScript Client Demo ===\n');

  // 1. List initial users
  console.log('1. Listing initial users...');
  client.ListUsers({}, (err: any, response: any) => {
    if (err) {
      console.error('  Error:', err.message);
      return;
    }
    console.log(`  Total users: ${response.users.length}`);
    response.users.forEach((u: User) => {
      console.log(`  - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Age: ${u.age}`);
    });

    // 2. Get a specific user
    console.log('\n2. Getting user by ID...');
    client.GetUser({ id: 1 }, (err: any, response: any) => {
      if (err) {
        console.error('  Error:', err.message);
        return;
      }
      if (response.error) {
        console.log(`  Error: ${response.error}`);
      } else {
        console.log(`  User:`, response.user);
      }

      // 3. Create a new user
      console.log('\n3. Creating new user...');
      client.CreateUser(
        { name: 'Charlie', email: 'charlie@example.com', age: 24 },
        (err: any, response: any) => {
          if (err) {
            console.error('  Error:', err.message);
            return;
          }
          console.log(`  Created user with ID: ${response.id}`);

          // 4. Update user
          console.log('\n4. Updating user...');
          client.UpdateUser(
            { id: 1, name: 'Alice Smith', email: 'alice.smith@example.com', age: 29 },
            (err: any, response: any) => {
              if (err) {
                console.error('  Error:', err.message);
                return;
              }
              console.log(`  Updated user:`, response.user);

              // 5. Delete user
              console.log('\n5. Deleting user...');
              client.DeleteUser({ id: 3 }, (err: any, response: any) => {
                if (err) {
                  console.error('  Error:', err.message);
                  return;
                }
                console.log(`  Success: ${response.success}, Message: ${response.message}`);

                // 6. Server streaming
                console.log('\n6. Server streaming - StreamUsers...');
                const streamUsers = client.StreamUsers({ count: 3 });

                streamUsers.on('data', (user: User) => {
                  console.log(`  Streamed: ID=${user.id}, Name=${user.name}`);
                });

                streamUsers.on('end', () => {
                  console.log('  Server streaming ended\n');

                  // 7. Client streaming
                  console.log('7. Client streaming - CreateUsers...');
                  const createUsers = client.CreateUsers((err: any, response: any) => {
                    if (err) {
                      console.error('  Error:', err.message);
                      return;
                    }
                    console.log(`  Created ${response.count} users with IDs:`, response.ids);
                    console.log('\n=== Demo completed successfully ===');

                    // After a short delay, exit
                    setTimeout(() => process.exit(0), 1000);
                  });

                  const usersToCreate = [
                    { name: 'Diana', email: 'diana@example.com', age: 27 },
                    { name: 'Eve', email: 'eve@example.com', age: 25 },
                    { name: 'Frank', email: 'frank@example.com', age: 30 },
                  ];

                  usersToCreate.forEach((u) => {
                    createUsers.write(u);
                  });

                  createUsers.end();
                });
              });
            }
          );
        }
      );
    });
  });
}

main();
