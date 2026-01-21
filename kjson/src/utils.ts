/**
 * Type checking utilities for JSON serialization
 */

/**
 * Checks if a value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Checks if a value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Checks if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

/**
 * Checks if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a symbol
 */
export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

/**
 * Checks if a value is a bigint
 */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Checks if a value is a function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Checks if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is a plain object (created by {} or new Object())
 * Excludes arrays, null, dates, maps, sets, etc.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Checks if a value is a Date object
 */
export function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === '[object Date]';
}

/**
 * Checks if a value is a Map
 */
export function isMap(value: unknown): value is Map<unknown, unknown> {
  return Object.prototype.toString.call(value) === '[object Map]';
}

/**
 * Checks if a value is a Set
 */
export function isSet(value: unknown): value is Set<unknown> {
  return Object.prototype.toString.call(value) === '[object Set]';
}

/**
 * Checks if a value is a valid JSON number
 * Returns false for NaN and Infinity
 */
export function isValidJSONNumber(value: number): boolean {
  return (
    isNumber(value) &&
    !isNaN(value) &&
    value !== Infinity &&
    value !== -Infinity
  );
}

/**
 * Escapes a string for JSON serialization
 * Handles: ", \, /, \b, \f, \n, \r, \t and Unicode control characters
 */
export function escapeString(str: string): string {
  const escapeMap: Record<string, string> = {
    '"': '\\"',
    '\\': '\\\\',
    '\b': '\\b',
    '\f': '\\f',
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
  };

  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    // Check for simple escape sequences
    if (escapeMap[char] !== undefined) {
      result += escapeMap[char];
      continue;
    }

    const code = char.charCodeAt(0);

    // Handle control characters (U+0000 to U+001F)
    if (code < 32) {
      result += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }

    // Handle Unicode surrogate pairs (U+D800 to U+DFFF)
    // These are invalid in UTF-16 and should be escaped
    if (code >= 0xd800 && code <= 0xdfff) {
      result += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }

    // Regular characters
    result += char;
  }

  return result;
}

/**
 * Unescapes a JSON string
 */
export function unescapeString(str: string): string {
  const escapeMap: Record<string, string> = {
    '"': '"',
    '\\': '\\',
    '/': '/',  // Forward slash is allowed but optional in JSON
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
  };

  let result = '';
  let i = 0;

  while (i < str.length) {
    const char = str[i];

    if (char === '\\' && i + 1 < str.length) {
      const nextChar = str[i + 1];

      // Handle Unicode escape \uXXXX
      if (nextChar === 'u' && i + 5 < str.length) {
        const hex = str.substring(i + 2, i + 6);
        const codePoint = parseInt(hex, 16);
        result += String.fromCharCode(codePoint);
        i += 6;
        continue;
      }

      // Handle simple escape sequences
      if (escapeMap[nextChar] !== undefined) {
        result += escapeMap[nextChar];
        i += 2;
        continue;
      }
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Checks if a character is a whitespace character
 */
export function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}
