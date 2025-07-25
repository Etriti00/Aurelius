import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaddleService } from './services/paddle.service';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AppConfigModule, PrismaModule, CacheModule, QueueModule],
  controllers: [BillingController],
  providers: [BillingService, PaddleService],
  exports: [BillingService, PaddleService],
})
export class BillingModule {}
