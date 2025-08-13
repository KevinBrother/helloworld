import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class AppController {
  @Get()
  getTestPage(@Res() res: Response) {
    return res.sendFile(join(__dirname, '..', 'api-test.html'));
  }
  
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '网页爬虫API服务'
    };
  }
}