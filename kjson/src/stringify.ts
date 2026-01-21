/**
 * JSON Serialization Implementation
 *
 * Converts JavaScript/TypeScript values to JSON strings
 */

import {
  isNull,
  isUndefined,
  isBoolean,
  isNumber,
  isString,
  isBigInt,
  isFunction,
  isArray,
  isPlainObject,
  isDate,
  isMap,
  isSet,
  isSymbol,
  isValidJSONNumber,
  escapeString,
} from './utils';

/**
 * Custom replacer function type
 */
export type ReplacerFunction = (this: unknown, key: string, value: unknown) => unknown;

/**
 * Options for stringify
 */
export interface StringifyOptions {
  replacer?: ReplacerFunction | (string | number)[];
  space?: string | number;
}

/**
 * Circular reference error
 */
export class CircularReferenceError extends Error {
  constructor() {
    super('Converting circular structure to JSON');
    this.name = 'CircularReferenceError';
  }
}

/**
 * Converts a JavaScript value to a JSON string
 *
 * @param value - The value to convert to JSON
 * @param options - Optional configuration for replacer and space
 * @returns JSON string representation of the value
 * @throws Error if the value contains circular references or unsupported types
 */
export function stringify(
  value: unknown,
  options?: StringifyOptions,
): string {
  const seen = new WeakSet();

  const internalStringify = (val: unknown, key?: string, skipReplacer = false): string => {
    // Handle replacer function (only if not already handled)
    if (!skipReplacer && options?.replacer && typeof options.replacer === 'function') {
      const newValue = (options.replacer as ReplacerFunction).call(
        value,
        key || '',
        val,
      );
      val = newValue;
    }

    // Handle undefined (returned from replacer means skip)
    if (isUndefined(val)) {
      return 'null';
    }

    // Handle null
    if (isNull(val)) {
      return 'null';
    }

    // Handle boolean
    if (isBoolean(val)) {
      return val ? 'true' : 'false';
    }

    // Handle number
    if (isNumber(val)) {
      if (!isValidJSONNumber(val)) {
        return 'null';
      }
      return String(val);
    }

    // Handle bigint
    if (isBigInt(val)) {
      throw new TypeError('Do not know how to serialize a BigInt');
    }

    // Handle string
    if (isString(val)) {
      return `"${escapeString(val)}"`;
    }

    // Handle symbol - can't be serialized
    if (isSymbol(val)) {
      return 'null';
    }

    // Handle function - can't be serialized
    if (isFunction(val)) {
      return 'null';
    }

    // Handle Date objects
    if (isDate(val)) {
      if (isNaN(val.getTime())) {
        return 'null';
      }
      return `"${val.toISOString()}"`;
    }

    // Handle Map - convert to plain object
    if (isMap(val)) {
      const obj: Record<string, unknown> = {};
      val.forEach((v, k) => {
        const stringKey = String(k);
        obj[stringKey] = v;
      });
      val = obj;
    }

    // Handle Set - convert to array
    if (isSet(val)) {
      val = Array.from(val);
    }

    // Handle array
    if (isArray(val)) {
      // Check for circular reference
      if (seen.has(val)) {
        throw new CircularReferenceError();
      }
      seen.add(val);

      const elements: string[] = [];
      for (let i = 0; i < val.length; i++) {
        let itemValue = val[i];

        // Apply replacer function if provided
        if (options?.replacer && typeof options.replacer === 'function') {
          const replaced = (options.replacer as ReplacerFunction).call(val, String(i), itemValue);
          if (isUndefined(replaced)) {
            continue; // Skip this element if replacer returns undefined
          }
          itemValue = replaced;
        }

        // internalStringify with skipReplacer=true since we already applied it
        elements.push(internalStringify(itemValue, String(i), true));
      }
      return `[${elements.join(',')}]`;
    }

    // Handle plain object
    if (isPlainObject(val)) {
      // Check for circular reference
      if (seen.has(val)) {
        throw new CircularReferenceError();
      }
      seen.add(val);

      // Check for toJSON method (before serializing the object)
      if ('toJSON' in val && typeof val.toJSON === 'function') {
        return internalStringify(val.toJSON(), undefined, skipReplacer);
      }

      const entries: string[] = [];
      const keys = Object.keys(val);

      // Handle replacer array (filter keys)
      let filteredKeys = keys;
      if (options?.replacer && Array.isArray(options.replacer)) {
        filteredKeys = keys.filter((k) => (options.replacer as (string | number)[]).includes(k));
      }

      for (const key of filteredKeys) {
        // Skip if key is not enumerable or value is a function/symbol (these are non-enumerable by default)
        if (!Object.prototype.propertyIsEnumerable.call(val, key)) {
          continue;
        }

        let itemValue = (val as Record<string, unknown>)[key];

        // Skip function and symbol values (before replacer, as they're not serializable)
        if (isFunction(itemValue) || isSymbol(itemValue)) {
          continue;
        }

        // Apply replacer function if provided
        if (options?.replacer && typeof options.replacer === 'function') {
          const replaced = (options.replacer as ReplacerFunction).call(val, key, itemValue);
          if (isUndefined(replaced)) {
            continue; // Skip this property if replacer returns undefined
          }
          itemValue = replaced;
        }

        // Skip undefined values
        if (isUndefined(itemValue)) {
          continue;
        }

        // internalStringify with skipReplacer=true since we already applied it
        const stringValue = internalStringify(itemValue, key, true);
        entries.push(`"${escapeString(key)}":${stringValue}`);
      }

      return `{${entries.join(',')}}`;
    }

    // Handle objects with toJSON method (check own property first, then prototype)
    if (val !== null && typeof val === 'object') {
      if ('toJSON' in val && typeof val.toJSON === 'function') {
        return internalStringify(val.toJSON());
      }
    }

    // Fallback for other object types (empty object for class instances, etc.)
    return '{}';
  };

  const result = internalStringify(value);

  // Apply space formatting
  if (options?.space !== undefined) {
    return formatJSON(result, options.space);
  }

  return result;
}

/**
 * Formats a JSON string with indentation
 */
function formatJSON(json: string, space: string | number): string {
  const indent = typeof space === 'number' ? ' '.repeat(Math.min(space, 10)) : space;
  const indentLevel = (level: number) => indent.repeat(level);

  let formatted = '';
  let level = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const prevChar = i > 0 ? json[i - 1] : '';

    // Handle string context and escape sequences
    if (char === '\\' && !escapeNext) {
      escapeNext = true;
      formatted += char;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      formatted += char;
      continue;
    }

    escapeNext = false;

    // Don't format inside strings
    if (inString) {
      formatted += char;
      continue;
    }

    // Handle structural characters
    switch (char) {
      case '{':
      case '[':
        formatted += char;
        if (i + 1 < json.length && json[i + 1] !== '}' && json[i + 1] !== ']') {
          level++;
          formatted += '\n' + indentLevel(level);
        }
        break;

      case '}':
      case ']':
        if (
          (i > 0 && (prevChar === '{' || prevChar === '[')) === false &&
          level > 0
        ) {
          level--;
          formatted += '\n' + indentLevel(level);
        }
        formatted += char;
        break;

      case ',':
        formatted += char;
        formatted += '\n' + indentLevel(level);
        break;

      case ':':
        formatted += char + ' ';
        break;

      default:
        // Skip whitespace
        if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
          formatted += char;
        }
    }
  }

  return formatted;
}

/**
 * Default export - stringify function
 */
export default stringify;
