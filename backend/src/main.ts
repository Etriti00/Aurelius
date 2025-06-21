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
      .setDescription(`
        ## Aurelius AI Personal Assistant API
        
        Welcome to the Aurelius API documentation. Aurelius is a revolutionary AI Personal Assistant that acts as your "digital chief of staff," transforming how you manage tasks, communications, and workflows.
        
        ### Key Features
        - **AI-Powered Task Management**: Intelligent task creation, prioritization, and completion tracking
        - **Email Intelligence**: AI-driven email categorization, drafting, and response suggestions
        - **Calendar Optimization**: Smart scheduling with conflict detection and meeting preparation
        - **Voice Interaction**: Text-to-speech and speech-to-text capabilities with ElevenLabs integration
        - **Workflow Automation**: TASA (Trigger → Analysis → Suggestion → Action) engine for proactive task execution
        - **Semantic Search**: Vector-based search across all your content with AI-powered relevance
        - **Real-time Updates**: WebSocket-based live notifications and collaborative features
        - **Multi-Platform Integration**: Google Workspace, Microsoft 365, and more
        
        ### Authentication
        This API uses JWT Bearer tokens for authentication. Obtain tokens through OAuth2 flows with supported providers (Google, Microsoft, Apple) or use the refresh token endpoint to maintain sessions.
        
        ### Rate Limiting
        API endpoints are rate-limited to ensure fair usage:
        - **Standard endpoints**: 1000 requests per hour per user
        - **AI endpoints**: 100 requests per hour per user (varies by subscription tier)
        - **Authentication endpoints**: 10 attempts per 15 minutes
        
        ### Response Format
        All API responses follow a consistent format with success indicators, data payloads, and error details when applicable.
        
        ### Subscription Tiers
        - **Pro ($50/month)**: 1,000 AI actions, 1 workspace, 3 integrations
        - **Max ($100/month)**: 3,000 AI actions, unlimited integrations, advanced features  
        - **Teams ($70/user/month)**: 2,000 AI actions per user, team collaboration, admin controls
        
        ### Support
        For technical support, visit our [documentation](https://docs.aurelius.ai) or contact support@aurelius.ai
      `)
      .setVersion('1.0')
      .setContact(
        'Aurelius Support',
        'https://aurelius.ai',
        'support@aurelius.ai'
      )
      .setLicense(
        'Commercial License',
        'https://aurelius.ai/license'
      )
      .addServer('https://api.aurelius.ai', 'Production Server')
      .addServer('https://staging-api.aurelius.ai', 'Staging Server')
      .addServer('http://localhost:3001', 'Development Server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token obtained from authentication endpoints',
          in: 'header',
        },
        'JWT-auth'
      )
      .addSecurityRequirements('JWT-auth')
      .addTag('auth', 'Authentication & Authorization - OAuth2 flows, JWT token management, and user session handling')
      .addTag('users', 'User Management - User profiles, preferences, and account management')
      .addTag('tasks', 'Task Management - AI-powered task creation, tracking, and completion with smart insights')
      .addTag('email', 'Email Intelligence - Email processing, AI drafting, categorization, and integration management')
      .addTag('calendar', 'Calendar & Scheduling - Event management, scheduling optimization, and calendar integrations')
      .addTag('ai-gateway', 'AI Processing - Claude AI integration, chat interactions, and AI model management')
      .addTag('voice', 'Voice Interaction - Text-to-speech, speech-to-text, and voice cloning with ElevenLabs')
      .addTag('integrations', 'Third-party Integrations - Google Workspace, Microsoft 365, and other external service connections')
      .addTag('billing', 'Billing & Subscriptions - Stripe integration, subscription management, and usage tracking')
      .addTag('search', 'Search & Discovery - Semantic search, vector embeddings, and content discovery')
      .addTag('workflow', 'Workflow Automation - TASA engine, automated workflows, and proactive task execution')
      .addTag('notifications', 'Notifications - Multi-channel notifications, preferences, and delivery management')
      .addTag('analytics', 'Analytics & Insights - Productivity metrics, usage analytics, and AI-powered insights')
      .addTag('storage', 'File Management - File uploads, processing, CDN distribution, and storage management')
      .addTag('scheduler', 'Job Scheduling - Cron jobs, recurring tasks, and background job management')
      .addTag('security', 'Security & Audit - Audit logs, rate limiting, and security monitoring')
      .addTag('websocket', 'Real-time Communication - WebSocket connections, live updates, and collaborative features')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
      deepScanRoutes: true,
    });

    // Add custom CSS for better documentation appearance
    const customCss = `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #2c3e50; }
      .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
    `;

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customCss,
      customSiteTitle: 'Aurelius API Documentation',
      customfavIcon: 'https://aurelius.ai/favicon.ico',
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