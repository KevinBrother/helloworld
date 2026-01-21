/**
 * JSON Deserialization Implementation
 *
 * Parses JSON strings into JavaScript/TypeScript values
 */

import { Tokenizer, TokenizerError } from './tokenizer';
import { Parser, ParserError } from './parser';

/**
 * Custom reviver function type
 */
export type ReviverFunction = (this: unknown, key: string, value: unknown) => unknown;

/**
 * Options for parse
 */
export interface ParseOptions {
  reviver?: ReviverFunction;
}

/**
 * Parses a JSON string and returns the corresponding JavaScript value
 *
 * @param text - The JSON string to parse
 * @param options - Optional configuration for reviver function
 * @returns The parsed JavaScript value with type T
 * @throws TokenizerError if the JSON string has lexical errors
 * @throws ParserError if the JSON string has syntax errors
 */
export function parse<T = unknown>(text: string, options?: ParseOptions): T {
  // Step 1: Tokenization (Lexical Analysis)
  const tokenizer = new Tokenizer(text);
  const tokens = tokenizer.tokenize();

  // Step 2: Parsing (Syntax Analysis)
  const parser = new Parser(tokens);
  let result = parser.parse() as T;

  // Step 3: Apply reviver function if provided
  if (options?.reviver) {
    result = applyReviver(result, options.reviver) as T;
  }

  return result;
}

/**
 * Applies a reviver function to transform the parsed value
 * Walks the object/tree depth-first and applies the reviver
 */
function applyReviver(value: unknown, reviver: ReviverFunction): unknown {
  const walk = (holder: Record<string, unknown> | unknown[], key: string | number): unknown => {
    const item = Array.isArray(holder) ? holder[key as number] : (holder as Record<string, unknown>)[key as string];

    // If item is an array or object, recursively process its properties
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; i++) {
        item[i] = walk(item, i);
      }
    } else if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      for (const k of Object.keys(item)) {
        (item as Record<string, unknown>)[k] = walk(item as Record<string, unknown>, k);
      }
    }

    // Apply the reviver function
    return reviver.call(holder, String(key), item);
  };

  // Wrap the root value in a holder object
  const holder: Record<string, unknown> = { '': value };
  const result = walk(holder, '');

  return result;
}

/**
 * Default export - parse function
 */
export default parse;
