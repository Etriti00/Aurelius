import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './services/queue.service';
import { EmailProcessor } from './processors/email.processor';
import { AITaskProcessor } from './processors/ai-task.processor';
import { IntegrationSyncProcessor } from './processors/integration-sync.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'ai-tasks' },
      { name: 'integrations' },
      { name: 'notifications' },
      { name: 'analytics' },
    ),
  ],
  providers: [
    QueueService,
    EmailProcessor,
    AITaskProcessor,
    IntegrationSyncProcessor,
    NotificationProcessor,
    AnalyticsProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}