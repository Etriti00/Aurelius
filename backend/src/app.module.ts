import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { BullModule } from '@nestjs/bull'

// Modules
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { BillingModule } from './modules/billing/billing.module'
import { IntegrationsModule } from './modules/integrations/integrations.module'
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { CalendarModule } from './modules/calendar/calendar.module'
import { EmailModule } from './modules/email/email.module'
import { WebsocketModule } from './modules/websocket/websocket.module'
import { HealthModule } from './modules/health/health.module'
import { PrismaModule } from './prisma/prisma.module'
import { RedisModule } from './common/redis/redis.module'

// Common
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { CacheInterceptor } from './common/interceptors/cache.interceptor'
import { WorkersModule } from './common/workers/workers.module'

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Queue management
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
    }),

    // Core modules
    PrismaModule,
    RedisModule,
    WorkersModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BillingModule,
    IntegrationsModule,
    AiGatewayModule,
    TasksModule,
    CalendarModule,
    EmailModule,
    WebsocketModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
