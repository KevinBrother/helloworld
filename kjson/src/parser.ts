/**
 * JSON Parser (Syntax Analyzer)
 *
 * Parses JSON tokens into JavaScript objects using recursive descent
 */

import { Token, TokenType, TokenizerError } from './tokenizer';
import { unescapeString } from './utils';

/**
 * Parser error
 */
export class ParserError extends Error {
  constructor(
    message: string,
    public token: Token,
  ) {
    const location = `Line ${token.line}, Column ${token.column}`;
    super(`${message} at ${location}`);
    this.name = 'ParserError';
  }
}

/**
 * JSON Parser - Recursive descent parser
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parses the tokens and returns the resulting value
   */
  parse(): unknown {
    const value = this.parseValue();

    // Ensure we've consumed all tokens except EOF
    if (!this.check(TokenType.EOF)) {
      throw new ParserError(
        'Unexpected trailing content',
        this.peek(),
      );
    }

    return value;
  }

  /**
   * Parses a JSON value (object, array, string, number, boolean, null)
   */
  private parseValue(): unknown {
    if (this.check(TokenType.LeftBrace)) {
      return this.parseObject();
    }

    if (this.check(TokenType.LeftBracket)) {
      return this.parseArray();
    }

    if (this.check(TokenType.String)) {
      return this.parseString();
    }

    if (this.check(TokenType.Number)) {
      return this.parseNumber();
    }

    if (this.check(TokenType.True)) {
      this.advance();
      return true;
    }

    if (this.check(TokenType.False)) {
      this.advance();
      return false;
    }

    if (this.check(TokenType.Null)) {
      this.advance();
      return null;
    }

    throw this.createError('Expected JSON value');
  }

  /**
   * Parses a JSON object
   */
  private parseObject(): Record<string, unknown> {
    const object: Record<string, unknown> = {};

    this.consume(TokenType.LeftBrace, "Expected '{' to start object");

    // Check for empty object
    if (this.check(TokenType.RightBrace)) {
      this.advance();
      return object;
    }

    // Parse key-value pairs
    while (true) {
      // Parse key (must be a string)
      const keyToken = this.consume(TokenType.String, 'Object key must be a string');
      const key = this.parseStringValue(keyToken);

      // Parse colon separator
      this.consume(TokenType.Colon, "Expected ':' after object key");

      // Parse value
      const value = this.parseValue();
      object[key] = value;

      // Check for comma or end of object
      if (this.check(TokenType.Comma)) {
        this.advance();

        // Check for trailing comma
        if (this.check(TokenType.RightBrace)) {
          throw this.createError('Trailing comma is not allowed');
        }
      } else if (this.check(TokenType.RightBrace)) {
        break;
      } else {
        throw this.createError("Expected ',' or '}' after object property");
      }
    }

    this.consume(TokenType.RightBrace, "Expected '}' to end object");

    return object;
  }

  /**
   * Parses a JSON array
   */
  private parseArray(): unknown[] {
    const array: unknown[] = [];

    this.consume(TokenType.LeftBracket, "Expected '[' to start array");

    // Check for empty array
    if (this.check(TokenType.RightBracket)) {
      this.advance();
      return array;
    }

    // Parse elements
    while (true) {
      const element = this.parseValue();
      array.push(element);

      // Check for comma or end of array
      if (this.check(TokenType.Comma)) {
        this.advance();

        // Check for trailing comma
        if (this.check(TokenType.RightBracket)) {
          throw this.createError('Trailing comma is not allowed');
        }
      } else if (this.check(TokenType.RightBracket)) {
        break;
      } else {
        throw this.createError("Expected ',' or ']' after array element");
      }
    }

    this.consume(TokenType.RightBracket, "Expected ']' to end array");

    return array;
  }

  /**
   * Parses a string token and returns the unescaped string value
   */
  private parseString(): string {
    const token = this.consume(TokenType.String, 'Expected string value');
    return this.parseStringValue(token);
  }

  /**
   * Parses a string token value (without consuming it)
   */
  private parseStringValue(token: Token): string {
    return unescapeString(token.value);
  }

  /**
   * Parses a number token and returns the number value
   */
  private parseNumber(): number {
    const token = this.consume(TokenType.Number, 'Expected number value');
    const value = parseFloat(token.value);

    // Validate the number
    if (isNaN(value)) {
      throw new ParserError('Invalid number format', token);
    }

    return value;
  }

  /**
   * Checks if the current token is of the given type
   */
  private check(type: TokenType): boolean {
    // Special case: checking for EOF should return true if at end
    if (type === TokenType.EOF) {
      return this.isAtEnd();
    }
    if (this.isAtEnd()) {
      return false;
    }
    return this.peek().type === type;
  }

  /**
   * Consumes the current token if it matches the type, otherwise throws an error
   */
  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.createError(message);
  }

  /**
   * Advances to the next token and returns the previous one
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  /**
   * Returns the current token without consuming it
   */
  private peek(): Token {
    return this.tokens[this.current];
  }

  /**
   * Checks if we've reached the end of the token stream
   */
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  /**
   * Creates a parser error for the current token
   */
  private createError(message: string): ParserError {
    return new ParserError(message, this.peek());
  }
}

/**
 * Convenience function to parse tokens into a JavaScript value
 */
export function parseTokens(tokens: Token[]): unknown {
  const parser = new Parser(tokens);
  return parser.parse();
}

export default Parser;
