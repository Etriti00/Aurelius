import { Injectable } from '@nestjs/common';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';

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
      actions?: any[];
    },
  ) {
    // Send via WebSocket for real-time notification
    this.wsGateway.sendToUser(userId, 'notification:new', notification);
  }

  async sendNotificationUpdate(
    userId: string,
    notificationId: string,
    update: any,
  ) {
    this.wsGateway.sendToUser(userId, 'notification:update', {
      id: notificationId,
      ...update,
    });
  }
}