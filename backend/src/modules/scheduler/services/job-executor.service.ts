import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/services/queue.service';
import { TasksService } from '../../tasks/tasks.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  ScheduledJob,
  JobAction,
  ActionType,
  ExecutionStatus,
  JobError,
} from '../interfaces';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JobExecutorService {
  private readonly logger = new Logger(JobExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private tasksService: TasksService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private httpService: HttpService,
  ) {}

  /**
   * Execute a scheduled job
   */
  async executeJob(job: ScheduledJob, executionId: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing job ${job.id} (${job.name})`);

      // Update execution status
      await this.updateExecutionStatus(executionId, ExecutionStatus.RUNNING);

      // Execute based on action type
      const result = await this.executeAction(job.action, job.userId, job.metadata);

      // Mark as completed
      await this.completeExecution(executionId, result, Date.now() - startTime);

      this.logger.log(`Job ${job.id} completed successfully`);
    } catch (error: any) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      
      const jobError: JobError = {
        code: error.code || 'EXECUTION_ERROR',
        message: error.message,
        stack: error.stack,
        retryable: this.isRetryableError(error),
      };

      await this.failExecution(executionId, jobError, Date.now() - startTime);

      // Handle retry if needed
      if (jobError.retryable && job.action.retryPolicy) {
        await this.scheduleRetry(job, executionId);
      }

      throw error;
    }
  }

  /**
   * Execute job action
   */
  private async executeAction(
    action: JobAction,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<any> {
    switch (action.type) {
      case ActionType.TASK_CREATE:
        return this.executeTaskCreate(userId, action.parameters);
      
      case ActionType.TASK_UPDATE:
        return this.executeTaskUpdate(userId, action.parameters);
      
      case ActionType.EMAIL_SEND:
        return this.executeEmailSend(userId, action.parameters);
      
      case ActionType.NOTIFICATION_SEND:
        return this.executeNotificationSend(userId, action.parameters);
      
      case ActionType.REPORT_GENERATE:
        return this.executeReportGenerate(userId, action.parameters);
      
      case ActionType.DATA_CLEANUP:
        return this.executeDataCleanup(userId, action.parameters);
      
      case ActionType.SYNC_INTEGRATION:
        return this.executeSyncIntegration(userId, action.parameters);
      
      case ActionType.WEBHOOK_CALL:
        return this.executeWebhookCall(action.parameters);
      
      case ActionType.WORKFLOW_TRIGGER:
        return this.executeWorkflowTrigger(userId, action.parameters);
      
      case ActionType.CUSTOM_FUNCTION:
        return this.executeCustomFunction(action.parameters, metadata);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Action executors
   */
  private async executeTaskCreate(
    userId: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    const task = await this.tasksService.create(userId, {
      title: parameters?.title || 'Scheduled Task',
      description: parameters?.description,
      dueDate: parameters?.dueDate ? new Date(parameters.dueDate) : undefined,
      priority: parameters?.priority || 'medium',
      labels: parameters?.labels || [],
      metadata: {
        createdBy: 'scheduler',
        ...parameters?.metadata,
      },
    });

    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
    };
  }

  private async executeTaskUpdate(
    userId: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    if (!parameters?.taskId && !parameters?.taskIds) {
      throw new Error('Task ID(s) required for update');
    }

    const taskIds = parameters.taskIds || [parameters.taskId];
    const updates = {
      status: parameters.status,
      priority: parameters.priority,
      dueDate: parameters.dueDate ? new Date(parameters.dueDate) : undefined,
      assignedTo: parameters.assignedTo,
    };

    const results = [];
    for (const taskId of taskIds) {
      const task = await this.tasksService.update(userId, taskId, updates);
      results.push({
        taskId: task.id,
        updated: true,
      });
    }

    return { updatedTasks: results };
  }

  private async executeEmailSend(
    userId: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    if (!parameters?.to || !parameters?.subject) {
      throw new Error('Email recipient and subject required');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const email = await this.emailService.sendEmail({
      from: parameters.from || 'noreply@aurelius.ai',
      to: parameters.to,
      subject: parameters.subject,
      content: parameters.content || parameters.text || '',
      html: parameters.html,
    });

    return {
      messageId: email.messageId,
      sentAt: new Date(),
      recipient: parameters.to,
    };
  }

  private async executeNotificationSend(
    userId: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    const notification = await this.notificationsService.sendToUser(userId, {
      type: parameters?.type || 'scheduled',
      title: parameters?.title || 'Scheduled Notification',
      message: parameters?.message || '',
    });

    return {
      notificationId: notification.id,
      sentAt: new Date(),
      channels: notification.channels,
    };
  }

  private async executeReportGenerate(
    userId: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    const reportType = parameters?.reportType || 'summary';
    const timeRange = parameters?.timeRange || '7d';

    // Queue report generation
    const job = await this.queueService.addAnalyticsEventJob({
      type: 'generate_report',
      userId,
      reportType,
      timeRange,
      format: parameters?.format || 'pdf',
      emailTo: parameters?.emailTo,
    });

    return {
      jobId: job.id,
      reportType,
      status: 'queued',
    };
  }

  private async executeDataCleanup(
    userId: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    const olderThan = parameters?.olderThanDays || 30;
    const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

    const results: Record<string, number> = {};

    // Clean old notifications
    if (parameters?.cleanNotifications !== false) {
      const deleted = await this.prisma.notification.deleteMany({
        where: {
          userId,
          createdAt: { lt: cutoffDate },
          isRead: true,
        },
      });
      results.notifications = deleted.count;
    }

    // Clean old activity logs
    if (parameters?.cleanActivityLogs !== false) {
      const deleted = await this.prisma.activityLog.deleteMany({
        where: {
          userId,
          timestamp: { lt: cutoffDate },
        },
      });
      results.activityLogs = deleted.count;
    }

    // Clean completed tasks
    if (parameters?.cleanCompletedTasks === true) {
      const deleted = await this.prisma.task.deleteMany({
        where: {
          userId,
          status: 'completed',
          completedAt: { lt: cutoffDate },
        },
      });
      results.tasks = deleted.count;
    }

    return {
      cleanedAt: new Date(),
      olderThanDays: olderThan,
      deleted: results,
    };
  }

  private async executeSyncIntegration(
    userId: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    const integrationId = parameters?.integrationId;
    if (!integrationId) {
      throw new Error('Integration ID required');
    }

    // Queue integration sync
    const job = await this.queueService.addIntegrationSyncJob({
      type: 'sync',
      userId,
      integrationId,
      syncType: parameters?.syncType || 'full',
      options: parameters?.options,
    });

    return {
      jobId: job.id,
      integrationId,
      syncType: parameters?.syncType || 'full',
      status: 'queued',
    };
  }

  private async executeWebhookCall(parameters?: Record<string, any>): Promise<any> {
    if (!parameters?.url) {
      throw new Error('Webhook URL required');
    }

    const response = await firstValueFrom(
      this.httpService.request({
        method: parameters.method || 'POST',
        url: parameters.url,
        headers: parameters.headers,
        data: parameters.data,
        timeout: parameters.timeout || 30000,
      }),
    );

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    };
  }

  private async executeWorkflowTrigger(
    userId: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    const triggerId = parameters?.triggerId;
    if (!triggerId) {
      throw new Error('Trigger ID required');
    }

    // Queue workflow execution
    const job = await this.queueService.addWorkflowJob({
      userId,
      triggerId,
      triggerType: 'scheduled_job',
      triggerData: parameters?.data || {},
    });

    return {
      jobId: job.id,
      triggerId,
      status: 'triggered',
    };
  }

  private async executeCustomFunction(
    parameters?: Record<string, any>,
    metadata?: Record<string, any>,
  ): Promise<any> {
    // Custom function execution would be implemented based on specific needs
    // For now, just log and return parameters
    this.logger.log(`Executing custom function: ${parameters?.functionName}`);

    return {
      functionName: parameters?.functionName,
      executed: true,
      result: 'Custom function executed',
      metadata,
    };
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
  ): Promise<void> {
    await this.prisma.jobExecution.update({
      where: { id: executionId },
      data: { status },
    });
  }

  /**
   * Complete execution
   */
  private async completeExecution(
    executionId: string,
    result: any,
    duration: number,
  ): Promise<void> {
    await this.prisma.jobExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
        duration,
        result,
      },
    });
  }

  /**
   * Fail execution
   */
  private async failExecution(
    executionId: string,
    error: JobError,
    duration: number,
  ): Promise<void> {
    await this.prisma.jobExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.FAILED,
        completedAt: new Date(),
        duration,
        error: {
          code: error.code,
          message: error.message,
          retryable: this.isRetryableError(error),
        },
      },
    });
  }

  /**
   * Schedule retry
   */
  private async scheduleRetry(
    job: ScheduledJob,
    executionId: string,
  ): Promise<void> {
    const execution = await this.prisma.jobExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution || !job.action.retryPolicy) return;

    const { maxRetries, retryDelayMs, backoffMultiplier = 1 } = job.action.retryPolicy;

    if (execution.retryCount < maxRetries) {
      const delay = retryDelayMs * Math.pow(backoffMultiplier, execution.retryCount);

      await this.queueService.addAIAnalysisJob(
        {
          type: 'retry_job',
          jobId: job.id,
          executionId,
          retryCount: execution.retryCount + 1,
        },
        { delay },
      );

      await this.prisma.jobExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.RETRYING,
          retryCount: { increment: 1 },
        },
      });
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      return true;
    }

    // HTTP errors
    if (error.response?.status && [408, 429, 500, 502, 503, 504].includes(error.response.status)) {
      return true;
    }

    // Database errors
    if (error.code === 'P2024') { // Prisma timeout
      return true;
    }

    return false;
  }
}