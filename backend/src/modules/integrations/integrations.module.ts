import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import {
  OAuthService,
  IntegrationSyncService,
  IntegrationRegistryService,
  GoogleIntegrationService,
} from './services';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { QueueModule } from '../queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    HttpModule,
    ScheduleModule,
    ConfigModule,
    PrismaModule,
    CacheModule,
    QueueModule,
    NotificationsModule,
    SecurityModule,
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    OAuthService,
    IntegrationSyncService,
    IntegrationRegistryService,
    GoogleIntegrationService,
  ],
  exports: [
    IntegrationsService,
    OAuthService,
    IntegrationSyncService,
    IntegrationRegistryService,
  ],
})
export class IntegrationsModule {}