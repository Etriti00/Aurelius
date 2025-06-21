import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { EmailNotificationService } from './services/email-notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, QueueModule, WebSocketModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailNotificationService,
    PushNotificationService,
    InAppNotificationService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}