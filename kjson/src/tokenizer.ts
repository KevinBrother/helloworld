/**
 * JSON Tokenizer (Lexical Analyzer)
 *
 * Converts a JSON string into a stream of tokens for parsing
 */

import { isWhitespace } from './utils';

/**
 * Token types in JSON
 */
export enum TokenType {
  LeftBrace = 'LeftBrace',      // {
  RightBrace = 'RightBrace',     // }
  LeftBracket = 'LeftBracket',   // [
  RightBracket = 'RightBracket', // ]
  Colon = 'Colon',               // :
  Comma = 'Comma',               // ,
  String = 'String',             // "string"
  Number = 'Number',             // 123, -123, 1.23, 1e2, -1E-2
  True = 'True',                 // true
  False = 'False',               // false
  Null = 'Null',                 // null
  EOF = 'EOF',                   // End of file
}

/**
 * Token structure
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

/**
 * Tokenizer error
 */
export class TokenizerError extends Error {
  constructor(message: string, public position: number, public line: number, public column: number) {
    super(message);
    this.name = 'TokenizerError';
  }
}

/**
 * JSON Tokenizer
 *
 * Converts a JSON string into tokens
 */
export class Tokenizer {
  private json: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(json: string) {
    this.json = json;
  }

  /**
   * Tokenizes the entire JSON string
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (true) {
      const token = this.nextToken();
      tokens.push(token);

      if (token.type === TokenType.EOF) {
        break;
      }
    }

    return tokens;
  }

  /**
   * Gets the next token
   */
  nextToken(): Token {
    this.skipWhitespace();

    if (this.isEOF()) {
      return this.createToken(TokenType.EOF, '');
    }

    const char = this.peek();

    switch (char) {
      case '{': {
        const token = this.createToken(TokenType.LeftBrace, '{');
        this.advance();
        return token;
      }
      case '}': {
        const token = this.createToken(TokenType.RightBrace, '}');
        this.advance();
        return token;
      }
      case '[': {
        const token = this.createToken(TokenType.LeftBracket, '[');
        this.advance();
        return token;
      }
      case ']': {
        const token = this.createToken(TokenType.RightBracket, ']');
        this.advance();
        return token;
      }
      case ':': {
        const token = this.createToken(TokenType.Colon, ':');
        this.advance();
        return token;
      }
      case ',': {
        const token = this.createToken(TokenType.Comma, ',');
        this.advance();
        return token;
      }
      case '"':
        return this.readString();
      case '-':
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        return this.readNumber();
      case 't':
        return this.readKeyword('true', TokenType.True);
      case 'f':
        return this.readKeyword('false', TokenType.False);
      case 'n':
        return this.readKeyword('null', TokenType.Null);
      default:
        throw new TokenizerError(
          `Unexpected character '${char}'`,
          this.position,
          this.line,
          this.column,
        );
    }
  }

  /**
   * Reads a string token
   */
  private readString(): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    // Skip opening quote
    this.advance();
    let value = '';

    while (!this.isEOF()) {
      const char = this.peek();

      if (char === '"') {
        this.advance();
        return {
          type: TokenType.String,
          value,
          position: startPos,
          line: startLine,
          column: startColumn,
        };
      }

      if (char === '\\') {
        this.advance();

        if (this.isEOF()) {
          throw new TokenizerError(
            'Unterminated string literal',
            startPos,
            startLine,
            startColumn,
          );
        }

        const escaped = this.peek();
        this.advance();

        // Handle escape sequences
        switch (escaped) {
          case '"':
          case '\\':
          case '/':
            value += escaped;
            break;
          case 'b':
            value += '\b';
            break;
          case 'f':
            value += '\f';
            break;
          case 'n':
            value += '\n';
            break;
          case 'r':
            value += '\r';
            break;
          case 't':
            value += '\t';
            break;
          case 'u': {
            // Unicode escape \uXXXX
            if (this.position + 4 >= this.json.length) {
              throw new TokenizerError(
                'Invalid Unicode escape sequence',
                this.position,
                this.line,
                this.column,
              );
            }

            const hex = this.json.substring(this.position, this.position + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
              throw new TokenizerError(
                `Invalid Unicode escape sequence \\u${hex}`,
                this.position,
                this.line,
                this.column,
              );
            }

            const codePoint = parseInt(hex, 16);
            value += String.fromCharCode(codePoint);
            this.advance();
            this.advance();
            this.advance();
            this.advance();
            break;
          }
          default:
            throw new TokenizerError(
              `Invalid escape sequence \\${escaped}`,
              this.position - 1,
              this.line,
              this.column,
            );
        }
      } else {
        // Regular character
        // Check for control characters (U+0000 to U+001F)
        const code = char.charCodeAt(0);
        if (code < 32) {
          throw new TokenizerError(
            `Control character U+${code.toString(16).padStart(4, '0')} in string must be escaped`,
            this.position,
            this.line,
            this.column,
          );
        }

        value += char;
        this.advance();
      }
    }

    throw new TokenizerError(
      'Unterminated string literal',
      startPos,
      startLine,
      startColumn,
    );
  }

  /**
   * Reads a number token
   */
  private readNumber(): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    let value = '';

    // Optional minus sign
    if (this.peek() === '-') {
      value += this.peek();
      this.advance();
    }

    // Integer part
    if (this.peek() === '0') {
      value += this.peek();
      this.advance();

      // After 0, only decimal point or exponent is allowed
      if (this.peek() >= '0' && this.peek() <= '9') {
        throw new TokenizerError(
          'Leading zero is not allowed',
          this.position,
          this.line,
          this.column,
        );
      }
    } else {
      while (this.peek() >= '0' && this.peek() <= '9') {
        value += this.peek();
        this.advance();
      }
    }

    // Fractional part
    if (this.peek() === '.') {
      value += this.peek();
      this.advance();

      if (this.peek() < '0' || this.peek() > '9') {
        throw new TokenizerError(
          'Expected digit after decimal point',
          this.position,
          this.line,
          this.column,
        );
      }

      while (this.peek() >= '0' && this.peek() <= '9') {
        value += this.peek();
        this.advance();
      }
    }

    // Exponent part
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.peek();
      this.advance();

      // Optional + or -
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.peek();
        this.advance();
      }

      if (this.peek() < '0' || this.peek() > '9') {
        throw new TokenizerError(
          'Expected digit after exponent',
          this.position,
          this.line,
          this.column,
        );
      }

      while (this.peek() >= '0' && this.peek() <= '9') {
        value += this.peek();
        this.advance();
      }
    }

    return {
      type: TokenType.Number,
      value,
      position: startPos,
      line: startLine,
      column: startColumn,
    };
  }

  /**
   * Reads a keyword (true, false, null)
   */
  private readKeyword(keyword: string, type: TokenType.True | TokenType.False | TokenType.Null): Token {
    const startPos = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    for (let i = 0; i < keyword.length; i++) {
      if (this.peek() !== keyword[i]) {
        throw new TokenizerError(
          `Expected '${keyword}'`,
          this.position,
          this.line,
          this.column,
        );
      }
      this.advance();
    }

    // Ensure we're reading a complete keyword, not a partial match
    if (!this.isEOF() && this.peek().match(/[a-zA-Z0-9]/)) {
      throw new TokenizerError(
        `Unexpected character after '${keyword}'`,
        this.position,
        this.line,
        this.column,
      );
    }

    return {
      type,
      value: keyword,
      position: startPos,
      line: startLine,
      column: startColumn,
    };
  }

  /**
   * Skips whitespace characters
   */
  private skipWhitespace(): void {
    while (!this.isEOF() && isWhitespace(this.peek())) {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }

  /**
   * Checks if we're at the end of the input
   */
  private isEOF(): boolean {
    return this.position >= this.json.length;
  }

  /**
   * Gets the current character without consuming it
   */
  private peek(): string {
    return this.json[this.position] || '';
  }

  /**
   * Consumes the current character and advances
   */
  private advance(): void {
    this.position++;
    this.column++;
  }

  /**
   * Creates a token with current position info
   */
  private createToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      position: this.position,
      line: this.line,
      column: this.column,
    };
  }
}

/**
 * Convenience function to tokenize a JSON string
 */
export function tokenize(json: string): Token[] {
  const tokenizer = new Tokenizer(json);
  return tokenizer.tokenize();
}

export default Tokenizer;
