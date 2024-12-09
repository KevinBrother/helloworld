import { HttpException, HttpStatus } from '@nestjs/common';

export class MyForbiddenException extends HttpException {
  constructor() {
    super('MyForbidden', HttpStatus.FORBIDDEN);
  }
}
