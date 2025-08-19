import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Web Crawler API is running!';
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('info')
  getInfo(): { name: string; version: string; description: string } {
    return {
      name: 'Web Crawler API',
      version: '2.0.0',
      description: 'A powerful web crawler service with improved architecture',
    };
  }
}