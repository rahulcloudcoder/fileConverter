import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const helmet = require('helmet');
  const compression = require('compression');

  app.use(helmet());
  app.use(compression());
  app.setGlobalPrefix('api');
  
  // CORS - Updated for production
    app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://file-converter-green.vercel.app',
      'https://file-converter-pro.vercel.app',
      'https://*.vercel.app' // Allow all Vercel subdomains
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 Backend server running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
}
bootstrap();