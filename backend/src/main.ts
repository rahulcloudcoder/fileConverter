// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Lazy load heavy dependencies
  const helmet = await import('helmet');
  const compression = await import('compression');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Reduce log verbosity
    bufferLogs: true, // Buffer logs for performance
  });

  // Security middleware
  app.use(helmet.default({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable for file operations
  }));
  
  app.use(compression.default());

  // Global prefix
  app.setGlobalPrefix('api');
  
  // Optimized CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://file-converter-green.vercel.app',
      'https://file-converter-pro.vercel.app',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production', // Hide errors in prod
    }),
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  
  logger.log(`🚀 Server running on port ${port}`);
  logger.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
}
bootstrap();