import { HttpException, HttpStatus } from '@nestjs/common';

export class MyUnauthorizedException extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: message,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
