import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'file-converter-api',
      version: '1.0.0',
    };
  }
}