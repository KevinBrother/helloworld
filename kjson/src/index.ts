/**
 * KJSON - A TypeScript JSON Implementation
 *
 * A custom JSON library for learning purposes
 */

// Export all stringify related exports
export {
  stringify,
  StringifyOptions,
  ReplacerFunction,
  CircularReferenceError,
} from './stringify';

// Export all parse related exports
export {
  parse,
  ParseOptions,
  ReviverFunction,
} from './parse';

// Export tokenizer
export {
  Tokenizer,
  tokenize,
  TokenType,
  TokenizerError,
  type Token,
} from './tokenizer';

// Export parser
export {
  Parser,
  parseTokens,
  ParserError,
} from './parser';

// Export utilities
export {
  isNull,
  isUndefined,
  isBoolean,
  isNumber,
  isString,
  isSymbol,
  isBigInt,
  isFunction,
  isArray,
  isPlainObject,
  isDate,
  isMap,
  isSet,
  isValidJSONNumber,
  escapeString,
  unescapeString,
  isWhitespace,
} from './utils';
