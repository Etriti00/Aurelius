import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationJobData,
  BatchNotificationJobData,
} from '../interfaces/queue-job-data.interface';

@Processor('notifications')
@Injectable()
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('send')
  async handleSend(job: Job<NotificationJobData>) {
    const { userId, type, title, message, priority, channels, metadata } = job.data;

    try {
      // TODO: Implement notification sending
      this.logger.log(`Sending ${type} notification to user ${userId}`, {
        title,
        priority,
        channels,
      });

      // Mark remaining as intentionally unused for TODO implementation
      void message;
      void metadata;

      return { success: true, notificationId: `notif_${Date.now()}` };
    } catch (error) {
      this.logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  @Process('send-batch')
  async handleSendBatch(job: Job<BatchNotificationJobData>) {
    const { userIds, type, title, message, priority, channels, batchSize } = job.data;

    try {
      // TODO: Implement batch notification sending
      this.logger.log(`Sending ${type} notification to ${userIds.length} users`, {
        title,
        priority,
        channels,
        batchSize,
      });

      // Mark remaining as intentionally unused for TODO implementation
      void message;

      return { success: true, sent: userIds.length };
    } catch (error) {
      this.logger.error('Failed to send batch notifications:', error);
      throw error;
    }
  }
}
