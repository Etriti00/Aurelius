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
  JobMetadata,
  JobActionParameters,
} from '../interfaces';

// Define proper parameter types for job execution
interface TaskCreateParams {
  title?: string;
  description?: string;
  dueDate?: string | Date;
  priority?: string;
  labels?: string[];
  metadata?: Record<string, string | number | boolean>;
}

interface TaskUpdateParams {
  taskId?: string;
  taskIds?: string[];
  status?: string;
  priority?: string;
  dueDate?: string | Date;
  assignedTo?: string;
}

interface EmailSendParams {
  to: string;
  subject: string;
  from?: string;
  content?: string;
  text?: string;
  html?: string;
}

interface NotificationSendParams {
  type?: string;
  title?: string;
  message?: string;
}

interface ReportGenerateParams {
  reportType?: string;
  timeRange?: string;
  format?: string;
  emailTo?: string;
}

interface DataCleanupParams {
  olderThanDays?: number;
  cleanNotifications?: boolean;
  cleanActivityLogs?: boolean;
  cleanCompletedTasks?: boolean;
}

interface SyncIntegrationParams {
  integrationId: string;
  syncType?: string;
  options?: Record<string, string | number | boolean>;
}

interface WebhookCallParams {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  data?: Record<string, string | number | boolean>;
  timeout?: number;
}

interface WorkflowTriggerParams {
  triggerId: string;
  data?: Record<string, string | number | boolean>;
}

interface CustomFunctionParams {
  functionName?: string;
  [key: string]: string | number | boolean | undefined;
}

type JobExecutionParams =
  | TaskCreateParams
  | TaskUpdateParams
  | EmailSendParams
  | NotificationSendParams
  | ReportGenerateParams
  | DataCleanupParams
  | SyncIntegrationParams
  | WebhookCallParams
  | WorkflowTriggerParams
  | CustomFunctionParams;

interface JobExecutionResult {
  [key: string]: string | number | boolean | Date | Record<string, string | number | boolean>;
}
import { HttpService } from '@nestjs/axios';

@Injectable()
export class JobExecutorService {
  private readonly logger = new Logger(JobExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private tasksService: TasksService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private httpService: HttpService
  ) {}

  /**
   * Validate job execution parameters
   */
  private validateJobParams(type: string, params: JobExecutionParams): boolean {
    // Basic validation for job parameters based on type
    switch (type) {
      case 'task_create':
        return 'title' in params && typeof params.title === 'string';
      case 'email_send':
        return 'to' in params && 'subject' in params;
      case 'notification_send':
        return 'userId' in params && 'message' in params;
      case 'report_generate':
        return 'reportType' in params && typeof params.reportType === 'string';
      case 'data_cleanup':
        return 'olderThanDays' in params && typeof params.olderThanDays === 'number';
      case 'sync_integration':
        return 'integrationId' in params && typeof params.integrationId === 'string';
      case 'webhook_call':
        return 'url' in params && typeof params.url === 'string';
      case 'workflow_trigger':
        return 'triggerId' in params && typeof params.triggerId === 'string';
      case 'custom_function':
        return 'functionName' in params && typeof params.functionName === 'string';
      default:
        return true;
    }
  }

  /**
   * Convert JobMetadata to simple Record for action execution
   */
  private convertMetadataToRecord(
    metadata: JobMetadata
  ): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      } else if (Array.isArray(value)) {
        result[key] = JSON.stringify(value);
      } else if (value && typeof value === 'object') {
        result[key] = JSON.stringify(value);
      }
    }

    return result;
  }

  /**
   * Convert JobActionParameters to EmailSendParams
   */
  private convertToEmailParams(params: JobActionParameters | undefined): EmailSendParams {
    if (!params) {
      throw new Error('Email parameters are required');
    }

    return {
      to: typeof params.to === 'string' ? params.to : '',
      from: typeof params.from === 'string' ? params.from : undefined,
      subject: typeof params.subject === 'string' ? params.subject : '',
      content: typeof params.content === 'string' ? params.content : undefined,
      text: typeof params.text === 'string' ? params.text : undefined,
      html: typeof params.html === 'string' ? params.html : undefined,
    };
  }

  /**
   * Convert JobActionParameters to ReportGenerateParams
   */
  private convertToReportParams(params: JobActionParameters | undefined): ReportGenerateParams {
    if (!params) {
      throw new Error('Report parameters are required');
    }

    return {
      reportType: typeof params.reportType === 'string' ? params.reportType : '',
      timeRange: typeof params.timeRange === 'string' ? params.timeRange : undefined,
      format: typeof params.format === 'string' ? params.format : undefined,
      emailTo: typeof params.emailTo === 'string' ? params.emailTo : undefined,
    };
  }

  /**
   * Convert JobActionParameters to SyncIntegrationParams
   */
  private convertToSyncParams(params: JobActionParameters | undefined): SyncIntegrationParams {
    if (!params) {
      throw new Error('Sync integration parameters are required');
    }

    return {
      integrationId: typeof params.integrationId === 'string' ? params.integrationId : '',
      syncType: typeof params.syncType === 'string' ? params.syncType : undefined,
      options:
        typeof params.options === 'object' && params.options !== null
          ? (params.options as Record<string, string | number | boolean>)
          : undefined,
    };
  }

  /**
   * Convert JobActionParameters to WebhookCallParams
   */
  private convertToWebhookParams(params: JobActionParameters | undefined): WebhookCallParams {
    if (!params) {
      throw new Error('Webhook parameters are required');
    }

    return {
      url: typeof params.url === 'string' ? params.url : '',
      method: typeof params.method === 'string' ? params.method : 'POST',
      headers:
        typeof params.headers === 'object' && params.headers !== null
          ? (params.headers as Record<string, string>)
          : undefined,
      data:
        typeof params.data === 'object' && params.data !== null
          ? (params.data as Record<string, string | number | boolean>)
          : undefined,
      timeout: typeof params.timeout === 'number' ? params.timeout : undefined,
    };
  }

  /**
   * Convert JobActionParameters to WorkflowTriggerParams
   */
  private convertToWorkflowParams(params: JobActionParameters | undefined): WorkflowTriggerParams {
    if (!params) {
      throw new Error('Workflow trigger parameters are required');
    }

    return {
      triggerId: typeof params.triggerId === 'string' ? params.triggerId : '',
      data:
        typeof params.triggerData === 'object' && params.triggerData !== null
          ? (params.triggerData as Record<string, string | number | boolean>)
          : undefined,
    };
  }

  /**
   * Convert Axios headers to simple Record
   */
  private convertHeadersToRecord(
    headers: Record<string, unknown>
  ): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string' && value.length > 0) {
        result[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        result[key] = value.filter(item => typeof item === 'string').join(', ');
      } else if (typeof value === 'number') {
        result[key] = value;
      } else if (typeof value === 'boolean') {
        result[key] = value;
      } else if (value !== null) {
        result[key] = String(value);
      }
    }

    return result;
  }

  /**
   * Execute a scheduled job
   */
  async executeJob(job: ScheduledJob, executionId: string): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing job ${job.id} (${job.name})`);

      // Validate job parameters
      const params = job.action.parameters || {};
      if (!this.validateJobParams(job.action.type, params)) {
        throw new Error(`Invalid parameters for job type ${job.action.type}`);
      }

      // Update execution status
      await this.updateExecutionStatus(executionId, ExecutionStatus.RUNNING);

      // Execute based on action type
      const result = await this.executeAction(
        job.action,
        job.userId,
        this.convertMetadataToRecord(job.metadata || {})
      );

      // Mark as completed
      await this.completeExecution(executionId, result, Date.now() - startTime);

      this.logger.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof Error && 'code' in error ? String(error.code) : 'EXECUTION_ERROR';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Job ${job.id} failed: ${errorMessage}`, error);

      const jobError: JobError = {
        code: errorCode,
        message: errorMessage,
        stack: errorStack,
        retryable: error instanceof Error ? this.isRetryableError(error) : false,
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
    metadata: Record<string, string | number | boolean>
  ): Promise<JobExecutionResult> {
    switch (action.type) {
      case ActionType.TASK_CREATE:
        return this.executeTaskCreate(userId, action.parameters);

      case ActionType.TASK_UPDATE:
        return this.executeTaskUpdate(userId, action.parameters);

      case ActionType.EMAIL_SEND:
        return this.executeEmailSend(userId, this.convertToEmailParams(action.parameters));

      case ActionType.NOTIFICATION_SEND:
        return this.executeNotificationSend(userId, action.parameters);

      case ActionType.REPORT_GENERATE:
        return this.executeReportGenerate(userId, this.convertToReportParams(action.parameters));

      case ActionType.DATA_CLEANUP:
        return this.executeDataCleanup(userId, action.parameters);

      case ActionType.SYNC_INTEGRATION:
        return this.executeSyncIntegration(this.convertToSyncParams(action.parameters));

      case ActionType.WEBHOOK_CALL:
        return this.executeWebhookCall(this.convertToWebhookParams(action.parameters));

      case ActionType.WORKFLOW_TRIGGER:
        return this.executeWorkflowTrigger(userId, this.convertToWorkflowParams(action.parameters));

      case ActionType.CUSTOM_FUNCTION:
        return this.executeCustomFunction(action.parameters as CustomFunctionParams, metadata);

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Action executors
   */
  private async executeTaskCreate(
    userId: string,
    parameters?: TaskCreateParams
  ): Promise<JobExecutionResult> {
    const task = await this.tasksService.create(userId, {
      title: parameters?.title || 'Scheduled Task',
      description: parameters?.description,
      dueDate: parameters?.dueDate ? new Date(parameters.dueDate) : undefined,
      priority: parameters?.priority || 'medium',
      labels: parameters?.labels || [],
    });

    return {
      taskId: task.id,
      title: task.title,
      status: task.status,
    };
  }

  private async executeTaskUpdate(
    userId: string,
    parameters?: TaskUpdateParams
  ): Promise<JobExecutionResult> {
    if (!parameters?.taskId && !parameters?.taskIds) {
      throw new Error('Task ID(s) required for update');
    }

    const taskIds = parameters.taskIds || (parameters.taskId ? [parameters.taskId] : []);
    const updates: Record<string, string | Date | undefined> = {
      status: parameters.status,
      priority: parameters.priority,
      dueDate: parameters.dueDate ? new Date(parameters.dueDate) : undefined,
      assignedTo: parameters.assignedTo,
    };

    const results: Array<{ taskId: string; updated: boolean }> = [];
    for (const taskId of taskIds) {
      const task = await this.tasksService.update(userId, taskId, updates);
      results.push({
        taskId: task.id,
        updated: true,
      });
    }

    return {
      success: true,
      actionType: 'task_update',
      timestamp: new Date(),
      updatedTasksJson: JSON.stringify(results),
    };
  }

  private async executeEmailSend(
    userId: string,
    parameters?: EmailSendParams
  ): Promise<JobExecutionResult> {
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
    parameters?: NotificationSendParams
  ): Promise<JobExecutionResult> {
    const notification = await this.notificationsService.sendToUser(userId, {
      type: parameters?.type || 'scheduled',
      title: parameters?.title || 'Scheduled Notification',
      message: parameters?.message || '',
    });

    return {
      notificationId: notification.id,
      sentAt: new Date(),
      channels: Array.isArray(notification.channels)
        ? notification.channels.join(',')
        : String(notification.channels),
    };
  }

  private async executeReportGenerate(
    userId: string,
    parameters?: ReportGenerateParams
  ): Promise<JobExecutionResult> {
    const reportType = parameters?.reportType || 'summary';
    // Report generation with time filtering would be implemented here

    // Queue report generation
    const job = await this.queueService.addAnalyticsEventJob({
      userId,
      event: {
        name: 'report_generation',
        category: 'system_event',
        action: 'generate_report',
        label: reportType,
      },
      properties: {
        duration: 0,
        success: true,
      },
    });

    return {
      jobId: job.id,
      reportType,
      status: 'queued',
    };
  }

  private async executeDataCleanup(
    userId: string,
    parameters?: DataCleanupParams
  ): Promise<JobExecutionResult> {
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
    parameters?: SyncIntegrationParams
  ): Promise<JobExecutionResult> {
    const integrationId = parameters?.integrationId;
    if (!integrationId) {
      throw new Error('Integration ID required');
    }

    // Queue integration sync
    const job = await this.queueService.addIntegrationSyncJob({
      integrationId,
      syncType: (parameters?.syncType as 'full' | 'incremental' | 'delta') || 'full',
      metadata: {
        triggeredBy: 'schedule',
        priority: 'medium',
      },
    });

    return {
      jobId: job.id,
      integrationId,
      syncType: parameters?.syncType || 'full',
      status: 'queued',
    };
  }

  private async executeWebhookCall(parameters?: WebhookCallParams): Promise<JobExecutionResult> {
    if (!parameters?.url) {
      throw new Error('Webhook URL required');
    }

    const response = await this.httpService.axiosRef.request({
      method: parameters.method || 'POST',
      url: parameters.url,
      headers: parameters.headers,
      data: parameters.data,
      timeout: parameters.timeout || 30000,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: this.convertHeadersToRecord(response.headers),
      data: response.data,
    };
  }

  private async executeWorkflowTrigger(
    userId: string,
    parameters?: WorkflowTriggerParams
  ): Promise<JobExecutionResult> {
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
    parameters?: CustomFunctionParams,
    metadata?: Record<string, string | number | boolean>
  ): Promise<JobExecutionResult> {
    // Validate required function name
    if (!parameters?.functionName) {
      throw new Error('Custom function name is required for execution');
    }

    // Custom function execution would be implemented based on specific needs
    // For now, just log and return parameters
    this.logger.log(`Executing custom function: ${parameters.functionName}`);

    return {
      functionName: parameters.functionName,
      executed: true,
      result: 'Custom function executed',
      metadata: metadata || {},
    };
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(executionId: string, status: ExecutionStatus): Promise<void> {
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
    result: JobExecutionResult,
    duration: number
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
    duration: number
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
          retryable: error.retryable,
        },
      },
    });
  }

  /**
   * Schedule retry
   */
  private async scheduleRetry(job: ScheduledJob, executionId: string): Promise<void> {
    const execution = await this.prisma.jobExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution || !job.action.retryPolicy) return;

    const { maxRetries, retryDelayMs, backoffMultiplier = 1 } = job.action.retryPolicy;

    if (execution.retryCount < maxRetries) {
      const delay = retryDelayMs * Math.pow(backoffMultiplier, execution.retryCount);

      await this.queueService.addAIAnalysisJob(
        {
          userId: job.userId,
          type: 'task',
          entityId: executionId,
          metadata: {
            source: 'retry',
            priority: 'medium',
            context: {
              jobId: job.id,
              retryCount: execution.retryCount + 1,
            },
          },
        },
        { delay }
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
  private isRetryableError(
    error: Error & { code?: string; response?: { status?: number } }
  ): boolean {
    // Network errors
    if (error.code && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      return true;
    }

    // HTTP errors
    if (error.response?.status && [408, 429, 500, 502, 503, 504].includes(error.response.status)) {
      return true;
    }

    // Database errors
    if (error.code === 'P2024') {
      // Prisma timeout
      return true;
    }

    return false;
  }
}
