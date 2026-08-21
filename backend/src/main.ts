import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { winstonLogger } from './common/logger/winston.logger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

import { RedisIoAdapter } from './redis/redis-io.adapter';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
  });

  const redisIoAdapter = new RedisIoAdapter(app);
  app.useWebSocketAdapter(redisIoAdapter);

  // ─── CORS ────────────────────────────────────────────────────────────────────
  // Set ALLOWED_ORIGINS in .env as a comma-separated list, e.g.:
  //   ALLOWED_ORIGINS=https://ludoarena.in,https://www.ludoarena.in
  // For local development, localhost origins are added automatically.
  const rawOrigins = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins: (string | RegExp)[] = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Always allow local dev origins when not in production
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    );
  }

  if (allowedOrigins.length === 0) {
    logger.warn(
      'ALLOWED_ORIGINS is not set and NODE_ENV=production — CORS will block all cross-origin requests!',
    );
  } else {
    logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  }

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  // ─────────────────────────────────────────────────────────────────────────────

  app.use(helmet());
  app.use(compression());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.enableShutdownHooks();

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ─── Swagger (disable in production via SWAGGER_ENABLED=false) ────────────
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Ludo Arena API')
      .setDescription('The Ludo Arena backend API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('v1/api/docs', app, document);
    logger.log('Swagger UI available at /v1/api/docs');
  } else {
    logger.log('Swagger UI disabled (SWAGGER_ENABLED=false)');
  }
  // ─────────────────────────────────────────────────────────────────────────────

  await app.listen(process.env.PORT || 3000);
  logger.log(`Application running on port ${process.env.PORT || 3000}`);
}
bootstrap();
