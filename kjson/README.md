# KJSON - A TypeScript JSON Implementation

A custom JSON serialization and deserialization library implemented in TypeScript for educational purposes.

## Overview

KJSON is a learning project that implements JSON serialization (`stringify`) and deserialization (`parse`) from scratch. It aims to help developers understand the core principles of JSON handling in JavaScript/TypeScript.

## Features

- ✅ JSON serialization (`stringify`)
- ✅ JSON deserialization (`parse`)
- ✅ Full TypeScript support with generics
- ✅ Circular reference detection
- ✅ String escaping handling
- ✅ Comprehensive error messages
- ✅ Type-safe API

## Installation

```bash
npm install
```

## Usage

```typescript
import { stringify, parse } from 'kjson';

// Serialization
const obj = { name: 'Tom', age: 18, hobbies: ['reading', 'gaming'] };
const json = stringify(obj);
console.log(json); // {"name":"Tom","age":18,"hobbies":["reading","gaming"]}

// Deserialization with type safety
interface User {
  name: string;
  age: number;
  hobbies: string[];
}

const user = parse<User>(json);
console.log(user.name); // Tom
```

## API

### `stringify(value: unknown): string`

Converts a JavaScript value to a JSON string.

```typescript
stringify({ x: 1 }); // '{"x":1}'
stringify([1, 2, 3]); // '[1,2,3]'
stringify('hello'); // '"hello"'
```

### `parse<T = unknown>(text: string): T`

Parses a JSON string and returns the corresponding JavaScript value.

```typescript
parse<{ x: number }>('{"x":1}'); // { x: 1 }
parse<number[]>('[1,2,3]'); // [1, 2, 3]
```

## Implementation Details

### Serialization Process

1. **Type Detection**: Identifies the type of the input value
2. **Recursive Traversal**: Depth-first traversal of the data structure
3. **String Generation**: Builds JSON string according to format rules
4. **Escape Handling**: Properly escapes special characters

### Deserialization Process

1. **Lexical Analysis**: Tokenizes the JSON string
2. **Syntax Parsing**: Builds an abstract syntax tree using recursive descent
3. **Value Construction**: Creates JavaScript objects from the AST

## Architecture

```
src/
├── stringify.ts    # Serialization implementation
├── parse.ts        # Deserialization implementation
├── tokenizer.ts    # Lexical analyzer (tokenizer)
├── parser.ts       # Syntax parser
├── utils.ts        # Utility functions
└── index.ts        # Public API exports
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run benchmarks
npm run benchmark
```

## Learning Resources

- [RFC 8259 - JSON Specification](https://datatracker.ietf.org/doc/html/rfc8259)
- [MDN - JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
- [ECMAScript JSON.stringify Specification](https://tc39.es/ecma262/#sec-json.stringify)
- [ECMAScript JSON.parse Specification](https://tc39.es/ecma262/#sec-json.parse)

## License

MIT
