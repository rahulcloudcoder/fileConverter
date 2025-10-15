// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Enhanced File Converter API',
      environment: process.env.NODE_ENV || 'development',
      features: [
        'PDF to DOCX conversion',
        'Document format conversion',
        'Image format conversion',
        'No external dependencies'
      ],
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      },
      conversionEngine: 'Enhanced PDF-to-DOCX with structure preservation'
    };
  }
}