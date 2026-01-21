/**
 * Tests for parse function
 */

import { parse, TokenizerError, ParserError } from '../src';

describe('parse', () => {
  describe('Basic Types', () => {
    test('number - integer', () => {
      expect(parse('123')).toBe(123);
      expect(parse('0')).toBe(0);
      expect(parse('-42')).toBe(-42);
    });

    test('number - floating point', () => {
      expect(parse('3.14')).toBe(3.14);
      expect(parse('-0.001')).toBe(-0.001);
      expect(parse('0.5')).toBe(0.5);
    });

    test('number - exponent notation', () => {
      expect(parse('1e5')).toBe(100000);
      expect(parse('1.5e-3')).toBe(0.0015);
      expect(parse('-2E10')).toBe(-20000000000);
      expect(parse('1e+5')).toBe(100000);
    });

    test('string', () => {
      expect(parse('"hello"')).toBe('hello');
      expect(parse('""')).toBe('');
      expect(parse('"123"')).toBe('123');
    });

    test('boolean', () => {
      expect(parse('true')).toBe(true);
      expect(parse('false')).toBe(false);
    });

    test('null', () => {
      expect(parse('null')).toBe(null);
    });
  });

  describe('String Escaping', () => {
    test('escaped quotes', () => {
      expect(parse('"say \\"hello\\""')).toBe('say "hello"');
      expect(parse('"\\""')).toBe('"');
    });

    test('escaped backslash', () => {
      expect(parse('"C:\\\\path"')).toBe('C:\\path');
      expect(parse('"\\\\"')).toBe('\\');
    });

    test('escaped control characters', () => {
      expect(parse('"line1\\nline2"')).toBe('line1\nline2');
      expect(parse('"tab\\there"')).toBe('tab\there');
      expect(parse('"back\\r\\b"')).toBe('back\r\b');
      expect(parse('"form\\ffeed"')).toBe('form\ffeed');
    });

    test('escaped forward slash', () => {
      expect(parse('"<script/>"')).toBe('<script/>');
    });

    test('unicode escapes', () => {
      expect(parse('"\\u0041"')).toBe('A');
      expect(parse('"\\u03A9"')).toBe('Ω');
      expect(parse('"\\u0026"')).toBe('&');
    });

    test('combined escapes', () => {
      expect(parse('"line1\\nline2\\t\\""')).toBe('line1\nline2\t"');
    });
  });

  describe('Arrays', () => {
    test('empty array', () => {
      expect(parse('[]')).toEqual([]);
    });

    test('simple array', () => {
      expect(parse('[1,2,3]')).toEqual([1, 2, 3]);
      expect(parse('["a","b","c"]')).toEqual(['a', 'b', 'c']);
    });

    test('mixed array', () => {
      expect(parse('[1,"two",true,null]')).toEqual([1, 'two', true, null]);
    });

    test('nested arrays', () => {
      expect(parse('[[1,2],[3,4]]')).toEqual([[1, 2], [3, 4]]);
      expect(parse('[[[1]]]')).toEqual([[[1]]]);
    });

    test('array with objects', () => {
      expect(parse('[{"x":1},{"y":2}]')).toEqual([{ x: 1 }, { y: 2 }]);
    });

    test('array with whitespace', () => {
      expect(parse('[ 1 , 2 , 3 ]')).toEqual([1, 2, 3]);
      expect(parse('[\n1,\n2\n]')).toEqual([1, 2]);
    });
  });

  describe('Objects', () => {
    test('empty object', () => {
      expect(parse('{}')).toEqual({});
    });

    test('simple object', () => {
      expect(parse('{"name":"Tom","age":18}')).toEqual({ name: 'Tom', age: 18 });
    });

    test('nested objects', () => {
      expect(parse('{"user":{"name":"Tom"}}')).toEqual({ user: { name: 'Tom' } });
      expect(parse('{"a":{"b":{"c":1}}}')).toEqual({ a: { b: { c: 1 } } });
    });

    test('object with array', () => {
      expect(parse('{"items":[1,2,3]}')).toEqual({ items: [1, 2, 3] });
    });

    test('object with various types', () => {
      const result = parse('{"str":"hello","num":42,"bool":true,"nullVal":null,"arr":[1,2,3]}');
      expect(result).toEqual({
        str: 'hello',
        num: 42,
        bool: true,
        nullVal: null,
        arr: [1, 2, 3],
      });
    });

    test('object with whitespace', () => {
      expect(parse('{ "name" : "Tom" }')).toEqual({ name: 'Tom' });
      expect(parse('{\n"name":\n"Tom"\n}')).toEqual({ name: 'Tom' });
    });
  });

  describe('Complex Structures', () => {
    test('nested objects and arrays', () => {
      const json = '{"users":[{"name":"Tom","age":18},{"name":"Jerry","age":20}]}';
      const result = parse(json);

      expect(result).toEqual({
        users: [
          { name: 'Tom', age: 18 },
          { name: 'Jerry', age: 20 },
        ],
      });
    });

    test('deeply nested structure', () => {
      const json = '{"a":{"b":{"c":{"d":{"e":1}}}}}';
      const result = parse(json);

      expect(result).toEqual({ a: { b: { c: { d: { e: 1 } } } } });
    });

    test('array of arrays of objects', () => {
      const json = '[[{"x":1},{"y":2}],[{"z":3}]]';
      const result = parse(json);

      expect(result).toEqual([[{ x: 1 }, { y: 2 }], [{ z: 3 }]]);
    });
  });

  describe('Generic Type Parameter', () => {
    interface User {
      name: string;
      age: number;
    }

    test('parse with type annotation', () => {
      const json = '{"name":"Tom","age":18}';
      const user = parse<User>(json);

      expect(user.name).toBe('Tom');
      expect(user.age).toBe(18);
    });

    test('parse array with type annotation', () => {
      const json = '[1,2,3]';
      const numbers = parse<number[]>(json);

      expect(numbers).toEqual([1, 2, 3]);
    });
  });

  describe('Reviver Function', () => {
    test('transform values with reviver', () => {
      const json = '{"name":"Tom","age":18}';
      const result = parse(json, {
        reviver: (_key, value) => {
          if (typeof value === 'number') {
            return value * 2;
          }
          return value;
        },
      });

      expect(result).toEqual({ name: 'Tom', age: 36 });
    });

    test('filter values with reviver', () => {
      const json = '{"name":"Tom","age":18,"password":"secret"}';
      const result = parse(json, {
        reviver: (key, value) => {
          if (key === 'password') {
            return undefined;
          }
          return value;
        },
      });

      expect(result).toEqual({ name: 'Tom', age: 18 });
    });

    test('reviver is called for each key-value pair', () => {
      const json = '{"a":1,"b":2,"c":3}';
      const keys: string[] = [];

      parse(json, {
        reviver: (key) => {
          keys.push(key);
          return;
        },
      });

      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });
  });

  describe('Error Handling', () => {
    test('unexpected character', () => {
      expect(() => parse('{invalid}')).toThrow(TokenizerError);
    });

    test('unterminated string', () => {
      expect(() => parse('"hello')).toThrow(TokenizerError);
    });

    test('unterminated object', () => {
      expect(() => parse('{"name":"Tom"')).toThrow(ParserError);
    });

    test('unterminated array', () => {
      expect(() => parse('[1,2,3')).toThrow(ParserError);
    });

    test('missing colon in object', () => {
      expect(() => parse('{"name" "Tom"}')).toThrow(ParserError);
    });

    test('trailing comma in object', () => {
      expect(() => parse('{"name":"Tom",}')).toThrow(ParserError);
    });

    test('trailing comma in array', () => {
      expect(() => parse('[1,2,3,]')).toThrow(ParserError);
    });

    test('duplicate keys (last one wins)', () => {
      const result = parse('{"name":"Tom","name":"Jerry"}');
      expect(result).toEqual({ name: 'Jerry' });
    });

    test('invalid escape sequence', () => {
      expect(() => parse('"\\x"')).toThrow(TokenizerError);
    });

    test('incomplete unicode escape', () => {
      expect(() => parse('"\\u123"')).toThrow(TokenizerError);
    });

    test('invalid unicode escape', () => {
      expect(() => parse('"\\u12G4"')).toThrow(TokenizerError);
    });

    test('leading zero in number', () => {
      expect(() => parse('01')).toThrow(TokenizerError);
    });

    test('invalid number format', () => {
      expect(() => parse('1.2.3')).toThrow(TokenizerError);
    });

    test('expected digit after decimal', () => {
      expect(() => parse('1.')).toThrow(TokenizerError);
    });

    test('expected digit after exponent', () => {
      expect(() => parse('1e')).toThrow(TokenizerError);
    });

    test('unexpected trailing content', () => {
      expect(() => parse('{"name":"Tom"} extra')).toThrow();
    });

    test('non-string object key', () => {
      expect(() => parse('{1:"value"}')).toThrow(ParserError);
    });
  });

  describe('Edge Cases', () => {
    test('empty input', () => {
      expect(() => parse('')).toThrow();
    });

    test('whitespace only', () => {
      expect(() => parse('   ')).toThrow();
    });

    test('negative zero', () => {
      expect(parse('-0')).toBe(-0);
    });

    test('large numbers', () => {
      expect(parse('9999999999')).toBe(9999999999);
      expect(parse('1e308')).toBe(1e308);
    });

    test('very small numbers', () => {
      expect(parse('0.000001')).toBe(0.000001);
      expect(parse('1e-308')).toBe(1e-308);
    });

    test('string with various Unicode', () => {
      expect(parse('"©"')).toBe('©');
      expect(parse('"Ω"')).toBe('Ω');
      expect(parse('"中文"')).toBe('中文');
    });

    test('object with numeric-like string keys', () => {
      expect(parse('{"123":"value"}')).toEqual({ 123: 'value' });
    });
  });

  describe('Compatibility with Native JSON', () => {
    test('should match JSON.parse for simple object', () => {
      const json = '{"name":"Tom","age":18}';
      expect(parse(json)).toEqual(JSON.parse(json));
    });

    test('should match JSON.parse for nested structures', () => {
      const json = '{"users":[{"name":"Tom","age":18},{"name":"Jerry","age":20}]}';
      expect(parse(json)).toEqual(JSON.parse(json));
    });

    test('should match JSON.parse with special characters', () => {
      const json = '{"message":"Hello\\nWorld!\\""}';
      expect(parse(json)).toEqual(JSON.parse(json));
    });

    test('should match JSON.parse with arrays', () => {
      const json = '[1,2,3,[4,5],{"key":"value"}]';
      expect(parse(json)).toEqual(JSON.parse(json));
    });

    test('should match JSON.parse with unicode', () => {
      const json = '"\\u0041\\u03A9\\u4E2D\\u6587"';
      expect(parse(json)).toEqual(JSON.parse(json));
    });
  });

  describe('Whitespace Handling', () => {
    test('spaces', () => {
      expect(parse(' { "a" : 1 } ')).toEqual({ a: 1 });
    });

    test('tabs', () => {
      expect(parse('\t{\t"a"\t:\t1\t}\t')).toEqual({ a: 1 });
    });

    test('newlines', () => {
      expect(parse('\n{\n"a"\n:\n1\n}\n')).toEqual({ a: 1 });
    });

    test('carriage returns', () => {
      expect(parse('\r{\r"a"\r:\r1\r}\r')).toEqual({ a: 1 });
    });

    test('mixed whitespace', () => {
      expect(parse(' \t\n\r{ \t\n\r"a" \t\n\r: \t\n\r1 \t\n\r} \t\n\r')).toEqual({ a: 1 });
    });
  });
});
