# JSON Implementation Guide

A comprehensive guide to understanding and implementing JSON serialization and deserialization.

## Table of Contents

1. [What is JSON?](#what-is-json)
2. [JSON Data Format](#json-data-format)
3. [Serialization (Stringify)](#serialization-stringify)
4. [Deserialization (Parse)](#deserialization-parse)
5. [Implementation Details](#implementation-details)
6. [Testing Strategy](#testing-strategy)

## What is JSON?

JSON (JavaScript Object Notation) is a lightweight data interchange format. It is easy for humans to read and write and easy for machines to parse and generate.

### Key Characteristics

- **Text-based**: Uses human-readable text
- **Language-independent**: Works with any programming language
- **Lightweight**: Minimal overhead compared to XML
- **Structured**: Supports nested objects and arrays
- **Type-safe**: Supports common data types

## JSON Data Format

### Value Types

JSON supports six value types:

1. **Object**: Unordered collection of key-value pairs
   ```json
   {"name": "Tom", "age": 18}
   ```

2. **Array**: Ordered list of values
   ```json
   [1, 2, 3, "four"]
   ```

3. **String**: Sequence of Unicode characters
   ```json
   "Hello, World!"
   ```

4. **Number**: Integer or floating-point
   ```json
   42
   -3.14
   1.5e-3
   ```

5. **Boolean**: true or false
   ```json
   true
   false
   ```

6. **Null**: Represents null value
   ```json
   null
   ```

### String Escaping

Special characters in JSON strings must be escaped:

| Character | Escape Sequence |
|-----------|----------------|
| Quotation mark | `\"` |
| Reverse solidus | `\\` |
| Solidus | `/` |
| Backspace | `\b` |
| Form feed | `\f` |
| New line | `\n` |
| Carriage return | `\r` |
| Horizontal tab | `\t` |
| Unicode | `\uXXXX` |

Example:
```json
{
  "message": "Line 1\nLine 2\t\"Quoted\""
}
```

## Serialization (Stringify)

Serialization converts JavaScript objects into JSON strings.

### Process Overview

```
JavaScript Object → Type Detection → Recursive Traversal → String Generation → JSON String
```

### Step-by-Step Process

#### 1. Type Detection

First, determine the type of the value:

```typescript
function detectType(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'unknown';
}
```

#### 2. Recursive Traversal

For complex types (objects, arrays), recursively process each element:

```typescript
function serializeArray(arr: unknown[]): string {
  const elements = arr.map(item => serializeValue(item));
  return '[' + elements.join(',') + ']';
}

function serializeObject(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).map(([key, value]) => {
    return '"' + escapeString(key) + '":' + serializeValue(value);
  });
  return '{' + entries.join(',') + '}';
}
```

#### 3. String Escaping

Escape special characters in strings:

```typescript
function escapeString(str: string): string {
  return str
    .replace(/"/g, '\\"')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    // ... handle other special characters
    ;
}
```

#### 4. Circular Reference Detection

Track visited objects to prevent infinite loops:

```typescript
function stringify(value: unknown, seen = new WeakSet()): string {
  if (typeof value === 'object' && value !== null) {
    if (seen.has(value)) {
      throw new CircularReferenceError();
    }
    seen.add(value);
  }
  // ... rest of serialization
}
```

### Handling Special Cases

#### Numbers

- `NaN` and `Infinity` → `null`
- Negative zero: `-0` → `-0`
- Scientific notation: `1e5` → `100000`

#### Dates

```typescript
function serializeDate(date: Date): string {
  if (isNaN(date.getTime())) {
    return 'null';
  }
  return '"' + date.toISOString() + '"';
}
```

#### Undefined and Functions

```typescript
// In objects: skip or convert to null
// In arrays: convert to null
// At root: convert to null
```

#### BigInt

```typescript
// Throws: "Do not know how to serialize a BigInt"
```

## Deserialization (Parse)

Deserialization converts JSON strings into JavaScript objects.

### Process Overview

```
JSON String → Tokenization → Parsing → Value Construction → JavaScript Object
```

### Step-by-Step Process

#### 1. Tokenization (Lexical Analysis)

Break the input string into tokens:

```typescript
enum TokenType {
  LeftBrace,      // {
  RightBrace,     // }
  LeftBracket,    // [
  RightBracket,   // ]
  Colon,          // :
  Comma,          // ,
  String,
  Number,
  True,
  False,
  Null
}

interface Token {
  type: TokenType;
  value: string;
  position: number;
}
```

Example tokenization:
```
Input:  {"name": "Tom"}
Tokens: LeftBrace, String("name"), Colon, String("Tom"), RightBrace
```

#### 2. String Token Parsing

Handle quotes, escapes, and Unicode:

```typescript
function readString(): Token {
  // Skip opening quote
  // Read until closing quote
  // Handle escape sequences: \", \\, \n, \uXXXX
  // Validate control characters
  // Return String token
}
```

#### 3. Number Token Parsing

Parse integers, floats, and scientific notation:

```
Grammar:
  number = [minus] int [frac] [exp]

  int = "0" / digit1-9 *digit
  frac = decimal-point 1*digit
  exp = (e / E) [minus / plus] 1*digit

Examples:
  0, 123, -456
  3.14, -0.001
  1e5, 1.5E-3, -2e+10
```

#### 4. Parsing (Syntax Analysis)

Use recursive descent parsing to build the object tree:

```typescript
function parseValue(): unknown {
  const token = peek();

  switch (token.type) {
    case TokenType.LeftBrace:   return parseObject();
    case TokenType.LeftBracket: return parseArray();
    case TokenType.String:      return parseString();
    case TokenType.Number:      return parseNumber();
    case TokenType.True:        return true;
    case TokenType.False:       return false;
    case TokenType.Null:        return null;
  }
}

function parseObject(): Record<string, unknown> {
  consume(TokenType.LeftBrace);
  const obj = {};

  while (!check(TokenType.RightBrace)) {
    const key = parseString();
    consume(TokenType.Colon);
    const value = parseValue();
    obj[key] = value;

    if (check(TokenType.Comma)) {
      advance();
    }
  }

  consume(TokenType.RightBrace);
  return obj;
}

function parseArray(): unknown[] {
  consume(TokenType.LeftBracket);
  const arr = [];

  while (!check(TokenType.RightBracket)) {
    arr.push(parseValue());

    if (check(TokenType.Comma)) {
      advance();
    }
  }

  consume(TokenType.RightBracket);
  return arr;
}
```

#### 5. String Unescaping

Convert escape sequences back to actual characters:

```typescript
function unescapeString(str: string): string {
  let result = '';
  let i = 0;

  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) {
      const next = str[i + 1];

      switch (next) {
        case '"':  result += '"'; break;
        case '\\': result += '\\'; break;
        case 'n':  result += '\n'; break;
        // ... handle other escapes
        case 'u':
          // Parse 4 hex digits
          const hex = str.substring(i + 2, i + 6);
          const code = parseInt(hex, 16);
          result += String.fromCharCode(code);
          i += 4;
          break;
      }

      i += 2;
    } else {
      result += str[i];
      i++;
    }
  }

  return result;
}
```

### Error Handling

Provide clear error messages with location information:

```typescript
class ParserError extends Error {
  constructor(message: string, public token: Token) {
    const location = `Line ${token.line}, Column ${token.column}`;
    super(`${message} at ${location}`);
  }
}
```

## Implementation Details

### Replacer Function (Stringify)

Transform or filter values during serialization:

```typescript
const replacer = (key: string, value: unknown) => {
  // Filter out sensitive data
  if (key === 'password') return undefined;

  // Transform values
  if (typeof value === 'number') return value * 2;

  return value;
};

stringify(obj, { replacer });
```

### Space Formatting (Stringify)

Pretty-print JSON with indentation:

```typescript
stringify(obj, { space: 2 });
// {
//   "name": "Tom",
//   "age": 18
// }
```

### Reviver Function (Parse)

Transform values during deserialization:

```typescript
const reviver = (key: string, value: unknown) => {
  // Convert date strings to Date objects
  if (key === 'createdAt') return new Date(value as string);

  return value;
};

parse(json, { reviver });
```

## Testing Strategy

### Unit Tests

Test individual components:

1. **Type Detection**: Verify correct type identification
2. **String Escaping**: Test all escape sequences
3. **Tokenization**: Verify correct token generation
4. **Parsing**: Test all value types

### Integration Tests

Test end-to-end functionality:

1. **Round-trip**: `parse(stringify(obj)) === obj`
2. **Compatibility**: Match native JSON behavior
3. **Edge Cases**: Handle special values

### Benchmark Tests

Compare performance with native JSON:

```typescript
const iterations = 10000;

// Test stringify
const kjsonTime = bench(() => stringify(obj), iterations);
const nativeTime = bench(() => JSON.stringify(obj), iterations);
console.log(`Ratio: ${kjsonTime / nativeTime}x`);

// Test parse
const kjsonTime = bench(() => parse(json), iterations);
const nativeTime = bench(() => JSON.parse(json), iterations);
console.log(`Ratio: ${kjsonTime / nativeTime}x`);
```

### Test Coverage

Aim for:

- All basic types
- All escape sequences
- Nested structures (objects, arrays)
- Circular references
- Error conditions
- Edge cases (empty, large, deeply nested)

## Learning Resources

### Specifications

- [RFC 8259 - JSON](https://datatracker.ietf.org/doc/html/rfc8259)
- [ECMA-404 - JSON](https://www.ecma-international.org/publications-and-standards/standards/ecma-404/)
- [ECMAScript JSON.stringify](https://tc39.es/ecma262/#sec-json.stringify)
- [ECMAScript JSON.parse](https://tc39.es/ecma262/#sec-json.parse)

### References

- [MDN - JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
- [JSON Parser Online](https://jsonparser.online/)
- [JSONLint Validator](https://jsonlint.com/)

### Advanced Topics

- **Streaming JSON**: Parse large files without loading entirely into memory
- **SAX-style Parsing**: Event-driven parsing for better performance
- **Binary JSON**: More compact representations (BSON, MessagePack)
- **Schema Validation**: Validate JSON against schemas (JSON Schema)
- **Security**: Prevent JSON injection attacks

## Conclusion

Understanding JSON implementation helps you:

1. **Debug issues** when things go wrong
2. **Optimize performance** for specific use cases
3. **Extend functionality** with custom behavior
4. **Learn fundamentals** of data serialization

The KJSON library demonstrates these concepts in a clean, educational way while maintaining compatibility with the native JSON API.
