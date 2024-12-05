import { Controller, Get, Ip, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('cats')
export class CatsController {
  @Get()
  findAll(@Req() request: Request, @Ip() ip: string) {
    console.log(request.url);
    console.log(ip, request.ip);
    return 'This action returns all cats';
  }
}
