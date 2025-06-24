import { Module } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';
import { UsageTrackingService } from './services/usage-tracking.service';
import { PerformanceService } from './services/performance.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, CacheModule, QueueModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, UsageTrackingService, PerformanceService],
  exports: [AnalyticsService, UsageTrackingService],
})
export class AnalyticsModule {}
