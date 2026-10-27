import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppLogger } from './platform/logger/app-logger.service';
import { PlatformConfigService } from './platform/config/config.service';

async function bootstrap() {
  const logger = new AppLogger();
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const configService = app.get(PlatformConfigService);

  // Security & optimization middlewares
  app.use(helmet());
  app.use(compression());

  // Global Prefix: api/v1
  app.setGlobalPrefix('api/v1');

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Unified Business OS API')
    .setDescription('Platform Architecture, Monorepo, Public Website, and UI Foundation REST API')
    .setVersion('1.0.0')
    .addTag('Platform')
    .addTag('Public Catalog')
    .addTag('Public Enquiries')
    .addTag('Identity')
    .addTag('Super Admin')
    .addTag('Developer Console')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.port;
  await app.listen(port);
  logger.log(`Unified Business OS API running on http://localhost:${port}/api/v1`);
  logger.log(`OpenAPI Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
