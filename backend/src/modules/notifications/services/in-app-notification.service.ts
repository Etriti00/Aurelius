import { Injectable } from '@nestjs/common';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';
import { Prisma } from '@prisma/client';

interface NotificationAction {
  id: string;
  label: string;
  action: string;
  data?: Prisma.JsonValue;
}

interface NotificationUpdate {
  isRead?: boolean;
  isActioned?: boolean;
  readAt?: Date;
  actions?: NotificationAction[];
  metadata?: Prisma.JsonValue;
}

@Injectable()
export class InAppNotificationService {
  constructor(private wsGateway: AppWebSocketGateway) {}

  async sendInAppNotification(
    userId: string,
    notification: {
      id: string;
      title: string;
      message: string;
      type: string;
      priority: string;
      actions?: NotificationAction[];
    }
  ) {
    // Send via WebSocket for real-time notification
    const serializedNotification: Record<string, string | number | boolean | null> = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      actions: notification.actions ? JSON.stringify(notification.actions) : null,
    };
    this.wsGateway.sendToUser(userId, 'notification:new', serializedNotification);
  }

  async sendNotificationUpdate(userId: string, notificationId: string, update: NotificationUpdate) {
    const serializedUpdate: Record<string, string | number | boolean | null> = {
      id: notificationId,
      isRead: update.isRead ?? null,
      isActioned: update.isActioned ?? null,
      readAt: update.readAt ? update.readAt.toISOString() : null,
      actions: update.actions ? JSON.stringify(update.actions) : null,
      metadata: update.metadata ? JSON.stringify(update.metadata) : null,
    };
    this.wsGateway.sendToUser(userId, 'notification:update', serializedUpdate);
  }
}
