import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  }));

  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global prefix
  const apiVersion = configService.get<string>('API_VERSION', 'v1');
  app.setGlobalPrefix(`api/${apiVersion}`);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validateCustomDecorators: true,
    })
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new TimeoutInterceptor(),
    new ResponseInterceptor()
  );

  // Swagger documentation
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Aurelius API')
      .setDescription('Aurelius AI Personal Assistant API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth'
      )
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('tasks', 'Task management')
      .addTag('email', 'Email integration')
      .addTag('calendar', 'Calendar integration')
      .addTag('ai-gateway', 'AI processing')
      .addTag('voice', 'Voice interaction')
      .addTag('integrations', 'Third-party integrations')
      .addTag('billing', 'Billing and subscriptions')
      .addTag('websocket', 'Real-time communication')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  logger.log(`🚀 Aurelius Backend running on port ${port}`, 'Bootstrap');
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`, 'Bootstrap');
  logger.log(`🔧 Environment: ${configService.get<string>('NODE_ENV')}`, 'Bootstrap');
}

bootstrap().catch((error: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error.stack);
  process.exit(1);
});