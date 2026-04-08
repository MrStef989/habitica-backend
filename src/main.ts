import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // --- Security ---
  app.use(helmet());

  // --- CORS ---
  const origins = cfg.get<string>('CORS_ORIGINS', 'http://localhost:5173');
  app.enableCors({
    origin: origins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // --- Global prefix ---
  app.setGlobalPrefix('api/v1');

  // --- Validation: strip unknown fields, throw on bad input ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip properties not in DTO
      forbidNonWhitelisted: true,
      transform: true,        // auto-convert types (string → number etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = cfg.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}/api/v1`);
}

bootstrap();
