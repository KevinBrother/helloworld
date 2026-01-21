/**
 * KJSON Demo
 *
 * Demonstrates the usage of KJSON library
 */

import { stringify, parse } from '../../kjson/src';
import type { User, BlogPost } from './types';

console.log('=== KJSON Demo ===\n');

// ============================================
// Example 1: Basic Serialization
// ============================================
console.log('1. Basic Serialization');
console.log('--------------------');

const user: User = {
  id: 1,
  name: 'Tom',
  email: 'tom@example.com',
  age: 18,
  hobbies: ['reading', 'gaming', 'coding'],
  active: true,
};

const json = stringify(user);
console.log('Object:', JSON.stringify(user, null, 2));
console.log('\nJSON:', json);

// ============================================
// Example 2: Basic Deserialization
// ============================================
console.log('\n\n2. Basic Deserialization');
console.log('-----------------------');

const parsedUser = parse<User>(json);
console.log('Parsed User:');
console.log('  Name:', parsedUser.name);
console.log('  Email:', parsedUser.email);
console.log('  Age:', parsedUser.age);
console.log('  Hobbies:', parsedUser.hobbies.join(', '));

// ============================================
// Example 3: Complex Nested Structures
// ============================================
console.log('\n\n3. Complex Nested Structures');
console.log('----------------------------');

const blogPost: BlogPost = {
  id: 1,
  title: 'Learning JSON Implementation',
  content: 'JSON is a powerful data interchange format...',
  author: {
    id: 1,
    name: 'Tom',
    email: 'tom@example.com',
    age: 18,
    hobbies: ['writing', 'teaching'],
    active: true,
  },
  tags: ['programming', 'json', 'typescript'],
  published: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const postJson = stringify(blogPost);
console.log('Blog Post JSON:');
console.log(postJson);

const parsedPost = parse<BlogPost>(postJson);
console.log('\nParsed Blog Post:');
console.log('  Title:', parsedPost.title);
console.log('  Author:', parsedPost.author.name);
console.log('  Tags:', parsedPost.tags.join(', '));

// ============================================
// Example 4: Pretty Formatting with Space
// ============================================
console.log('\n\n4. Pretty Formatting');
console.log('--------------------');

const prettyJson = stringify(user, { space: 2 });
console.log('Pretty Printed JSON:');
console.log(prettyJson);

// ============================================
// Example 5: Using Replacer Function
// ============================================
console.log('\n\n5. Using Replacer Function');
console.log('-------------------------');

const userWithSensitiveData: User = {
  id: 1,
  name: 'Tom',
  email: 'tom@example.com',
  age: 18,
  hobbies: ['reading'],
  active: true,
};

// Filter out sensitive data
const filteredJson = stringify(userWithSensitiveData, {
  replacer: (key, value) => {
    // Don't include age in the output
    if (key === 'age') {
      return undefined;
    }
    return value;
  },
});

console.log('Original:', stringify(userWithSensitiveData));
console.log('Filtered (age removed):', filteredJson);

// ============================================
// Example 6: Using Replacer Array (Key Filter)
// ============================================
console.log('\n\n6. Key Filtering with Replacer Array');
console.log('----------------------------------');

const selectiveJson = stringify(user, {
  replacer: ['name', 'email'],
});

console.log('Only name and email:', selectiveJson);

// ============================================
// Example 7: Using Reviver Function
// ============================================
console.log('\n\n7. Using Reviver Function');
console.log('------------------------');

const jsonData = '{"name":"Tom","age":18,"score":100}';
const transformed = parse(jsonData, {
  reviver: (key, value) => {
    // Double all numbers
    if (typeof value === 'number') {
      return value * 2;
    }
    return value;
  },
});

console.log('Original:', jsonData);
console.log('Transformed (numbers doubled):', stringify(transformed));

// ============================================
// Example 8: Handling Special Characters
// ============================================
console.log('\n\n8. Handling Special Characters');
console.log('-----------------------------');

const specialString = {
  message: 'Hello\nWorld!\n"Goodbye"\t\n',
  path: 'C:\\Users\\Documents\\file.txt',
  emoji: 'Hello 👋 World 🌍',
};

const specialJson = stringify(specialString);
console.log('Special characters JSON:');
console.log(specialJson);

const parsedSpecial = parse(specialJson);
console.log('\nParsed back:');
console.log('  Message:', parsedSpecial.message);
console.log('  Path:', parsedSpecial.path);
console.log('  Emoji:', parsedSpecial.emoji);

// ============================================
// Example 9: Arrays and Nested Structures
// ============================================
console.log('\n\n9. Arrays and Nested Structures');
console.log('-------------------------------');

const users: User[] = [
  { id: 1, name: 'Tom', email: 'tom@example.com', age: 18, hobbies: ['coding'], active: true },
  { id: 2, name: 'Jerry', email: 'jerry@example.com', age: 20, hobbies: ['design'], active: true },
  { id: 3, name: 'Spike', email: 'spike@example.com', age: 25, hobbies: ['music'], active: false },
];

const usersJson = stringify(users);
console.log('Users Array JSON:');
console.log(usersJson);

const parsedUsers = parse<User[]>(usersJson);
console.log('\nParsed users count:', parsedUsers.length);
parsedUsers.forEach((user, i) => {
  console.log(`  ${i + 1}. ${user.name} (${user.age} years old)`);
});

// ============================================
// Example 10: Error Handling
// ============================================
console.log('\n\n10. Error Handling');
console.log('-------------------');

try {
  parse('{invalid json}');
} catch (error) {
  if (error instanceof Error) {
    console.log('Caught error:', error.name);
    console.log('Message:', error.message);
  }
}

// ============================================
// Example 11: Type Safety with Generics
// ============================================
console.log('\n\n11. Type Safety with Generics');
console.log('------------------------------');

interface Config {
  apiUrl: string;
  timeout: number;
  debug: boolean;
}

const configJson = '{"apiUrl":"https://api.example.com","timeout":5000,"debug":true}';
const config = parse<Config>(configJson);

// TypeScript knows the types!
console.log('Config:');
console.log('  API URL:', config.apiUrl); // string
console.log('  Timeout:', config.timeout); // number
console.log('  Debug:', config.debug); // boolean

// ============================================
// Example 12: Round-trip Serialization
// ============================================
console.log('\n\n12. Round-trip Serialization');
console.log('----------------------------');

const original = {
  id: 42,
  name: 'Test User',
  data: { nested: { value: true } },
  items: [1, 2, 3],
};

const serialized = stringify(original);
const deserialized = parse(serialized);

console.log('Original:', original);
console.log('Deserialized:', deserialized);
console.log('Equal?', JSON.stringify(original) === serialized ? 'Yes' : 'No');

console.log('\n=== Demo Complete ===');
