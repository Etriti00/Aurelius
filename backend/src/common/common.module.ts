import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

// Services
import { PrismaService } from '../modules/prisma/prisma.service';
import { RedisService } from '../modules/cache/services/redis.service';
import { HealthCheckService } from './services/health-check.service';
import { LoggingService } from './services/logging.service';
import { MetricsService } from './services/metrics.service';

// Controllers
import { HealthController } from './controllers/health.controller';
import { MetricsController } from './controllers/metrics.controller';

// Filters
import { GlobalExceptionFilter } from './filters/global-exception.filter';

// Middleware
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';

@Global()
@Module({
  imports: [ConfigModule, TerminusModule],
  providers: [
    PrismaService,
    RedisService,
    HealthCheckService,
    LoggingService,
    MetricsService,
    GlobalExceptionFilter,
    RequestLoggingMiddleware,
  ],
  controllers: [HealthController, MetricsController],
  exports: [
    PrismaService,
    RedisService,
    HealthCheckService,
    LoggingService,
    MetricsService,
    GlobalExceptionFilter,
    RequestLoggingMiddleware,
  ],
})
export class CommonModule {}
