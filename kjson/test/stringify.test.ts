/**
 * Tests for stringify function
 */

import { stringify, CircularReferenceError } from '../src/stringify';

describe('stringify', () => {
  describe('Basic Types', () => {
    test('number - integer', () => {
      expect(stringify(123)).toBe('123');
      expect(stringify(0)).toBe('0');
      expect(stringify(-42)).toBe('-42');
    });

    test('number - floating point', () => {
      expect(stringify(3.14)).toBe('3.14');
      expect(stringify(-0.001)).toBe('-0.001');
      expect(stringify(1e5)).toBe('100000');
      expect(stringify(1.5e-3)).toBe('0.0015');
    });

    test('number - special values', () => {
      expect(stringify(NaN)).toBe('null');
      expect(stringify(Infinity)).toBe('null');
      expect(stringify(-Infinity)).toBe('null');
    });

    test('string', () => {
      expect(stringify('hello')).toBe('"hello"');
      expect(stringify('')).toBe('""');
      expect(stringify('123')).toBe('"123"');
    });

    test('boolean', () => {
      expect(stringify(true)).toBe('true');
      expect(stringify(false)).toBe('false');
    });

    test('null', () => {
      expect(stringify(null)).toBe('null');
    });

    test('undefined', () => {
      expect(stringify(undefined)).toBe('null');
    });
  });

  describe('String Escaping', () => {
    test('escape quotes', () => {
      expect(stringify('say "hello"')).toBe('"say \\"hello\\""');
      expect(stringify('"')).toBe('"\\""');
    });

    test('escape backslash', () => {
      expect(stringify('C:\\path')).toBe('"C:\\\\path"');
      expect(stringify('\\')).toBe('"\\\\"');
    });

    test('escape control characters', () => {
      expect(stringify('line1\nline2')).toBe('"line1\\nline2"');
      expect(stringify('tab\there')).toBe('"tab\\there"');
      expect(stringify('back\r\b')).toBe('"back\\r\\b"');
      expect(stringify('form\ffeed')).toBe('"form\\ffeed"');
    });

    test('escape forward slash', () => {
      expect(stringify('<script/>')).toBe('"<script/>"');
    });

    test('unicode characters', () => {
      expect(stringify('hello ©')).toBe('"hello ©"');
      expect(stringify('中文')).toBe('"中文"');
    });

    test('control characters should be escaped', () => {
      expect(stringify('\x00')).toBe('"\\u0000"');
      expect(stringify('\x1F')).toBe('"\\u001f"');
    });
  });

  describe('Arrays', () => {
    test('empty array', () => {
      expect(stringify([])).toBe('[]');
    });

    test('simple array', () => {
      expect(stringify([1, 2, 3])).toBe('[1,2,3]');
      expect(stringify(['a', 'b', 'c'])).toBe('["a","b","c"]');
    });

    test('mixed array', () => {
      expect(stringify([1, 'two', true, null])).toBe('[1,"two",true,null]');
    });

    test('nested arrays', () => {
      expect(stringify([[1, 2], [3, 4]])).toBe('[[1,2],[3,4]]');
    });

    test('array with objects', () => {
      expect(stringify([{ x: 1 }, { y: 2 }])).toBe('[{"x":1},{"y":2}]');
    });

    test('array with undefined', () => {
      expect(stringify([1, undefined, 3])).toBe('[1,null,3]');
    });
  });

  describe('Objects', () => {
    test('empty object', () => {
      expect(stringify({})).toBe('{}');
    });

    test('simple object', () => {
      expect(stringify({ name: 'Tom', age: 18 })).toBe('{"name":"Tom","age":18}');
    });

    test('nested objects', () => {
      expect(stringify({ user: { name: 'Tom' } })).toBe('{"user":{"name":"Tom"}}');
    });

    test('object with array', () => {
      expect(stringify({ items: [1, 2, 3] })).toBe('{"items":[1,2,3]}');
    });

    test('object with various types', () => {
      const obj = {
        str: 'hello',
        num: 42,
        bool: true,
        nullVal: null,
        arr: [1, 2, 3],
        nested: { x: 1 },
      };
      expect(stringify(obj)).toBe('{"str":"hello","num":42,"bool":true,"nullVal":null,"arr":[1,2,3],"nested":{"x":1}}');
    });

    test('object with undefined value', () => {
      expect(stringify({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}');
    });

    test('object with function', () => {
      expect(stringify({ a: 1, fn: () => {}, b: 2 })).toBe('{"a":1,"b":2}');
    });

    test('object with symbol', () => {
      expect(stringify({ a: 1, [Symbol('id')]: 'symbol', b: 2 })).toBe('{"a":1,"b":2}');
    });
  });

  describe('Special Objects', () => {
    test('Date object', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      expect(stringify(date)).toBe('"2023-01-01T00:00:00.000Z"');
    });

    test('Invalid Date', () => {
      const date = new Date('invalid');
      expect(stringify(date)).toBe('null');
    });

    test('Map object', () => {
      const map = new Map([['key1', 'value1'], ['key2', 'value2']]);
      expect(stringify(map)).toBe('{"key1":"value1","key2":"value2"}');
    });

    test('Set object', () => {
      const set = new Set([1, 2, 3]);
      expect(stringify(set)).toBe('[1,2,3]');
    });
  });

  describe('Circular Reference Detection', () => {
    test('direct circular reference', () => {
      const obj: Record<string, unknown> = { name: 'Tom' };
      obj.self = obj;

      expect(() => stringify(obj)).toThrow(CircularReferenceError);
    });

    test('indirect circular reference', () => {
      const obj1: Record<string, unknown> = { name: 'Tom' };
      const obj2: Record<string, unknown> = { name: 'Jerry' };
      obj1.friend = obj2;
      obj2.friend = obj1;

      expect(() => stringify(obj1)).toThrow(CircularReferenceError);
    });

    test('circular reference in array', () => {
      const arr: unknown[] = [1, 2, 3];
      arr.push(arr);

      expect(() => stringify(arr)).toThrow(CircularReferenceError);
    });
  });

  describe('Replacer Function', () => {
    test('filter with replacer function', () => {
      const obj = { name: 'Tom', age: 18, password: 'secret' };
      const replacer = (_key: string, value: unknown) => {
        if (typeof value === 'string' && _key === 'password') {
          return undefined;
        }
        return value;
      };

      expect(stringify(obj, { replacer })).toBe('{"name":"Tom","age":18}');
    });

    test('transform with replacer function', () => {
      const obj = { name: 'Tom', age: 18 };
      const replacer = (_key: string, value: unknown) => {
        if (typeof value === 'number') {
          return value * 2;
        }
        return value;
      };

      expect(stringify(obj, { replacer })).toBe('{"name":"Tom","age":36}');
    });
  });

  describe('Replacer Array (Filter Keys)', () => {
    test('filter keys with array', () => {
      const obj = { name: 'Tom', age: 18, email: 'tom@example.com' };
      const replacer = ['name', 'email'];

      expect(stringify(obj, { replacer })).toBe('{"name":"Tom","email":"tom@example.com"}');
    });
  });

  describe('Space Formatting', () => {
    test('space with number', () => {
      const obj = { name: 'Tom', age: 18 };
      const result = stringify(obj, { space: 2 });

      expect(result).toBe('{\n  "name": "Tom",\n  "age": 18\n}');
    });

    test('space with string', () => {
      const obj = { name: 'Tom', age: 18 };
      const result = stringify(obj, { space: '\t' });

      expect(result).toBe('{\n\t"name": "Tom",\n\t"age": 18\n}');
    });

    test('nested objects with space', () => {
      const obj = { user: { name: 'Tom', age: 18 } };
      const result = stringify(obj, { space: 2 });

      expect(result).toBe('{\n  "user": {\n    "name": "Tom",\n    "age": 18\n  }\n}');
    });

    test('array with space', () => {
      const obj = { items: [1, 2, 3] };
      const result = stringify(obj, { space: 2 });

      expect(result).toBe('{\n  "items": [\n    1,\n    2,\n    3\n  ]\n}');
    });

    test('limit space to 10 characters', () => {
      const obj = { name: 'Tom' };
      const result = stringify(obj, { space: 15 });

      expect(result).toBe('{\n          "name": "Tom"\n}');
    });
  });

  describe('Edge Cases', () => {
    test('BigInt should throw', () => {
      expect(() => stringify(123n)).toThrow('Do not know how to serialize a BigInt');
    });

    test('object with toJSON method', () => {
      const obj = {
        name: 'Tom',
        toJSON() {
          return { custom: 'value' };
        },
      };

      expect(stringify(obj)).toBe('{"custom":"value"}');
    });

    test('class instance without toJSON', () => {
      class Person {
        constructor(public name: string) {}
      }

      const person = new Person('Tom');
      expect(stringify(person)).toBe('{}');
    });

    test('frozen object', () => {
      const obj = Object.freeze({ name: 'Tom', age: 18 });
      expect(stringify(obj)).toBe('{"name":"Tom","age":18}');
    });

    test('sealed object', () => {
      const obj = Object.seal({ name: 'Tom' });
      expect(stringify(obj)).toBe('{"name":"Tom"}');
    });
  });

  describe('Compatibility with Native JSON', () => {
    test('should match JSON.stringify for simple object', () => {
      const obj = { name: 'Tom', age: 18, hobbies: ['reading', 'gaming'] };
      expect(stringify(obj)).toBe(JSON.stringify(obj));
    });

    test('should match JSON.stringify for nested structures', () => {
      const obj = {
        users: [
          { name: 'Tom', age: 18 },
          { name: 'Jerry', age: 20 },
        ],
      };
      expect(stringify(obj)).toBe(JSON.stringify(obj));
    });

    test('should match JSON.stringify with special characters', () => {
      const obj = { message: 'Hello\nWorld!"' };
      expect(stringify(obj)).toBe(JSON.stringify(obj));
    });
  });
});
