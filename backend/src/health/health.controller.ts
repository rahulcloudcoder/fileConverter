// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { execSync } from 'child_process';

@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    // Check if LibreOffice is available
    let libreOfficeStatus = 'unknown';
    try {
      execSync('soffice --version', { stdio: 'pipe' });
      libreOfficeStatus = 'available';
    } catch {
      libreOfficeStatus = 'unavailable';
    }

    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'File Converter API',
      environment: process.env.NODE_ENV || 'development',
      libreOffice: libreOfficeStatus,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };
  }
}