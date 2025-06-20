import { Injectable } from '@nestjs/common';
import { QueueService } from '../../queue/services/queue.service';

@Injectable()
export class EmailNotificationService {
  constructor(private queueService: QueueService) {}

  async sendEmailNotification(
    userId: string,
    notification: {
      title: string;
      message: string;
      type: string;
    },
  ) {
    // Queue email sending job
    await this.queueService.addEmailJob({
      to: userId, // Will be resolved to user email in processor
      subject: notification.title,
      template: 'notification',
      data: {
        title: notification.title,
        message: notification.message,
        type: notification.type,
      },
    });
  }
}