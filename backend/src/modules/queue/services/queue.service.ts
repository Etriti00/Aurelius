import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JobOptions } from 'bull';
import {
  AIAnalysisJobData,
  AISuggestionJobData,
  IntegrationSyncJobData,
  NotificationJobData,
  BatchNotificationJobData,
  AnalyticsEventJobData,
  UsageCalculationJobData,
} from '../interfaces/queue-job-data.interface';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('ai-tasks') private aiTaskQueue: Queue,
    @InjectQueue('integrations') private integrationsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
    @InjectQueue('analytics') private analyticsQueue: Queue
  ) {}

  /**
   * Email Queue Methods
   */
  async addEmailJob(
    data: {
      to: string;
      subject: string;
      html?: string;
      text?: string;
      template?: string;
      context?: Record<string, string | number | boolean>;
    },
    options?: JobOptions
  ) {
    return await this.emailQueue.add('send-email', data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
    });
  }

  async addEmailProcessingJob(
    data: { userId: string; emailId: string; action: 'parse' | 'classify' | 'extract' },
    options?: JobOptions
  ) {
    return await this.emailQueue.add('process-email', data, {
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    });
  }

  /**
   * AI Task Queue Methods
   */
  async addAIAnalysisJob(data: AIAnalysisJobData, options?: JobOptions) {
    return await this.aiTaskQueue.add('analyze', data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      timeout: 60000, // 1 minute
      ...options,
    });
  }

  async addAISuggestionJob(data: AISuggestionJobData, options?: JobOptions) {
    return await this.aiTaskQueue.add('generate-suggestions', data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      ...options,
    });
  }

  /**
   * Integration Sync Queue Methods
   */
  async addIntegrationSyncJob(data: IntegrationSyncJobData, options?: JobOptions) {
    return await this.integrationsQueue.add('sync', data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      ...options,
    });
  }

  async scheduleIntegrationSync(integrationId: string, delay: number) {
    return await this.integrationsQueue.add(
      'sync',
      { integrationId },
      {
        delay,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  }

  /**
   * Notification Queue Methods
   */
  async addNotificationJob(data: NotificationJobData, options?: JobOptions) {
    return await this.notificationsQueue.add('send', data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      ...options,
    });
  }

  async addBatchNotificationJob(data: BatchNotificationJobData, options?: JobOptions) {
    return await this.notificationsQueue.add('send-batch', data, {
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    });
  }

  /**
   * Workflow Queue Methods
   */
  async addWorkflowJob(
    data: {
      userId: string;
      triggerId: string;
      triggerType: string;
      triggerData: Record<string, string | number | boolean>;
    },
    options?: JobOptions
  ) {
    return await this.aiTaskQueue.add('workflow-execution', data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      timeout: 120000, // 2 minutes
      ...options,
    });
  }

  /**
   * Analytics Queue Methods
   */
  async addAnalyticsEventJob(data: AnalyticsEventJobData, options?: JobOptions) {
    return await this.analyticsQueue.add('track-event', data, {
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    });
  }

  async addUsageCalculationJob(data: UsageCalculationJobData, options?: JobOptions) {
    return await this.analyticsQueue.add('calculate-usage', data, {
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    });
  }

  /**
   * Queue Management Methods
   */
  async getQueueStats(queueName: string) {
    let queue: Queue;

    switch (queueName) {
      case 'email':
        queue = this.emailQueue;
        break;
      case 'ai-tasks':
        queue = this.aiTaskQueue;
        break;
      case 'integrations':
        queue = this.integrationsQueue;
        break;
      case 'notifications':
        queue = this.notificationsQueue;
        break;
      case 'analytics':
        queue = this.analyticsQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  async getAllQueueStats() {
    const queueNames = ['email', 'ai-tasks', 'integrations', 'notifications', 'analytics'];
    return await Promise.all(queueNames.map(name => this.getQueueStats(name)));
  }

  /**
   * Clean completed jobs older than specified hours
   */
  async cleanCompletedJobs(hours: number = 24) {
    const queues = [
      this.emailQueue,
      this.aiTaskQueue,
      this.integrationsQueue,
      this.notificationsQueue,
      this.analyticsQueue,
    ];

    const grace = hours * 60 * 60 * 1000; // Convert to milliseconds

    await Promise.all(queues.map(queue => queue.clean(grace, 'completed')));
  }
}
