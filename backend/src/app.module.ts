import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { redisStore } from 'cache-manager-redis-store';
import type { CacheModuleOptions } from '@nestjs/cache-manager';
import { CsrfMiddleware } from './middleware/csrf.middleware';

import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { EmailModule } from './modules/email/email.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AIGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { VoiceModule } from './modules/voice/voice.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { BillingModule } from './modules/billing/billing.module';
import { HealthModule } from './modules/health/health.module';
import { CacheModule as CustomCacheModule } from './modules/cache/cache.module';
import { QueueModule } from './modules/queue/queue.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SearchModule } from './modules/search/search.module';
import { SecurityModule } from './modules/security/security.module';
import { StorageModule } from './modules/storage/storage.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { ProactivityEngineService } from './common/services/proactivity-engine.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Event Emitter
    EventEmitterModule.forRoot(),

    // Winston Logger
    WinstonModule.forRootAsync({
      useFactory: () => ({
        transports: [
          new winston.transports.Console({
            level: process.env.LOG_LEVEL ?? 'info',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, context, trace }) => {
                return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
              })
            ),
          }),
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
        ],
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          name: 'default',
          ttl: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
          limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        },
      ],
    }),

    // Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (): Promise<CacheModuleOptions> => ({
        store: redisStore as unknown as string,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        ttl: 300, // 5 minutes default
      }),
    }),

    // Bull Queue
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      }),
    }),

    // Queue Registrations
    BullModule.registerQueue({ name: 'ai-processing' }, { name: 'proactivity' }),

    // Core Modules
    PrismaModule,
    AuthModule,
    UsersModule,

    // Feature Modules
    TasksModule,
    EmailModule,
    CalendarModule,
    AIGatewayModule,
    VoiceModule,
    IntegrationsModule,
    BillingModule,

    // Infrastructure Modules
    WebSocketModule,
    HealthModule,
    CustomCacheModule,
    QueueModule,
    NotificationsModule,
    AnalyticsModule,
    SchedulerModule,
    SearchModule,
    SecurityModule,
    StorageModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [AppService, ProactivityEngineService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply CSRF middleware to all routes except those excluded in the middleware itself
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
