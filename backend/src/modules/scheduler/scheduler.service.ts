import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobSchedulerService } from './services/job-scheduler.service';
import { JobExecutorService } from './services/job-executor.service';
import { SchedulerMonitorService } from './services/scheduler-monitor.service';
import {
  ScheduledJob,
  JobType,
  JobSchedule,
  JobAction,
  JobFilter,
  JobTemplate,
  BulkJobOperation,
  JobExecution,
  SchedulerMetrics,
  JobStatistics,
  JobMetadata,
  ActionType,
  ExecutionStatus,
  JobExecutionResult,
  JobError,
  RecurrenceFrequency,
} from './interfaces';

// Define database job interface
interface DatabaseJob {
  id: string;
  userId: string | null;
  name: string;
  description?: string | null;
  type: string;
  schedule?: string | null;
  payload: string | number | boolean | object | null; // Prisma JsonValue - remove undefined
  enabled: boolean;
  lastRun?: Date | null;
  nextRun?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  action?: Record<string, unknown>;
}
import { BusinessException } from '../../common/exceptions';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly templates = new Map<string, JobTemplate>();

  constructor(
    private prisma: PrismaService,
    private jobScheduler: JobSchedulerService,
    private jobExecutor: JobExecutorService,
    private monitorService: SchedulerMonitorService
  ) {
    this.loadJobTemplates();
  }

  /**
   * Create a scheduled job
   */
  async createJob(
    userId: string,
    name: string,
    description: string,
    schedule: JobSchedule,
    action: JobAction,
    metadata?: JobMetadata
  ): Promise<ScheduledJob> {
    try {
      const job: ScheduledJob = {
        id: uuidv4(),
        userId,
        name,
        description,
        type: schedule.type,
        schedule,
        action,
        enabled: true,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.jobScheduler.scheduleJob(job);

      return job;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create job: ${errorMessage}`, error);
      throw new BusinessException(
        'Failed to create scheduled job',
        'JOB_CREATE_FAILED',
        undefined,
        error instanceof Error ? { message: error.message, stack: error.stack } : undefined
      );
    }
  }

  /**
   * Create job from template
   */
  async createFromTemplate(
    userId: string,
    templateId: string,
    customizations?: {
      name?: string;
      schedule?: Partial<JobSchedule>;
      action?: Partial<JobAction>;
    }
  ): Promise<ScheduledJob> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new BusinessException('Template not found', 'TEMPLATE_NOT_FOUND');
    }

    const schedule: JobSchedule = {
      ...template.schedule,
      ...customizations?.schedule,
    } as JobSchedule;

    const action: JobAction = {
      ...template.action,
      ...customizations?.action,
    } as JobAction;

    return this.createJob(
      userId,
      customizations?.name || template.name,
      template.description,
      schedule,
      action,
      { templateId }
    );
  }

  /**
   * Get user jobs
   */
  async getUserJobs(userId: string, filter?: JobFilter): Promise<ScheduledJob[]> {
    const jobs = await this.prisma.scheduledJob.findMany({
      where: {
        userId,
        ...(filter?.type != null && { type: filter.type }),
        ...(filter?.enabled !== undefined && { enabled: filter.enabled }),
        ...(filter?.startDate && { createdAt: { gte: filter.startDate } }),
        ...(filter?.endDate && { createdAt: { lte: filter.endDate } }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs
      .map(job => this.mapJobToScheduledJob(job))
      .filter((job): job is ScheduledJob => job !== null);
  }

  /**
   * Get job details
   */
  async getJob(jobId: string, userId: string): Promise<ScheduledJob | null> {
    const job = await this.prisma.scheduledJob.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      return null;
    }

    return this.mapJobToScheduledJob(job);
  }

  /**
   * Update job
   */
  async updateJob(
    jobId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      schedule?: JobSchedule;
      action?: JobAction;
      enabled?: boolean;
    }
  ): Promise<ScheduledJob> {
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new BusinessException('Job not found', 'JOB_NOT_FOUND');
    }

    // Update schedule if provided
    if (updates.schedule) {
      await this.jobScheduler.updateJobSchedule(jobId, updates.schedule);
    }

    // Update job record
    const updated = await this.prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.action && { action: updates.action }),
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
        updatedAt: new Date(),
      },
    });

    // Handle enable/disable
    if (updates.enabled !== undefined && updates.enabled !== job.enabled) {
      if (updates.enabled) {
        const mappedJob = this.mapJobToScheduledJob(updated);
        if (mappedJob) {
          await this.jobScheduler.activateJob(mappedJob);
        }
      } else {
        await this.jobScheduler.deactivateJob(jobId);
      }
    }

    const updatedJob = await this.getJob(jobId, userId);
    if (!updatedJob) {
      throw new Error('Job not found after update');
    }
    return updatedJob;
  }

  /**
   * Delete job
   */
  async deleteJob(jobId: string, userId: string): Promise<void> {
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new BusinessException('Job not found', 'JOB_NOT_FOUND');
    }

    // Deactivate job first
    await this.jobScheduler.deactivateJob(jobId);

    // Delete from database
    await this.prisma.scheduledJob.delete({
      where: { id: jobId },
    });
  }

  /**
   * Execute job manually
   */
  async executeJob(jobId: string, userId: string): Promise<JobExecution> {
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new BusinessException('Job not found', 'JOB_NOT_FOUND');
    }

    const executionId = uuidv4();

    // Create execution record
    const execution = await this.prisma.jobExecution.create({
      data: {
        id: executionId,
        jobId,
        status: 'pending',
        startedAt: new Date(),
        retryCount: 0,
      },
    });

    // Execute job asynchronously
    this.jobExecutor.executeJob(job, executionId).catch(error => {
      this.logger.error(`Manual job execution failed: ${error.message}`);
    });

    return {
      id: execution.id,
      jobId: execution.jobId,
      status: execution.status as ExecutionStatus,
      startedAt: execution.startedAt,
      retryCount: execution.retryCount,
    };
  }

  /**
   * Bulk operation on jobs
   */
  async bulkOperation(userId: string, operation: BulkJobOperation): Promise<{ affected: number }> {
    const jobs = await this.prisma.scheduledJob.findMany({
      where: {
        userId,
        id: { in: operation.jobIds },
      },
    });

    let affected = 0;

    for (const job of jobs) {
      try {
        switch (operation.operation) {
          case 'enable':
            await this.updateJob(job.id, userId, { enabled: true });
            affected++;
            break;
          case 'disable':
            await this.updateJob(job.id, userId, { enabled: false });
            affected++;
            break;
          case 'delete':
            await this.deleteJob(job.id, userId);
            affected++;
            break;
        }
      } catch (error) {
        this.logger.error(`Bulk operation failed for job ${job.id}: ${error}`);
      }
    }

    return { affected };
  }

  /**
   * Get job executions
   */
  async getJobExecutions(
    jobId: string,
    userId: string,
    limit: number = 20
  ): Promise<JobExecution[]> {
    // Verify job ownership
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new BusinessException('Job not found', 'JOB_NOT_FOUND');
    }

    const executions = await this.prisma.jobExecution.findMany({
      where: { jobId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return executions.map(exec => ({
      id: exec.id,
      jobId: exec.jobId,
      status: exec.status as ExecutionStatus,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt || undefined,
      duration: exec.duration || undefined,
      result: exec.result as JobExecutionResult,
      error: this.convertToJobError(exec.error),
      retryCount: exec.retryCount,
    }));
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(jobId: string, userId: string): Promise<JobStatistics> {
    // Verify job ownership
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new BusinessException('Job not found', 'JOB_NOT_FOUND');
    }

    return this.monitorService.getJobStatistics(jobId);
  }

  /**
   * Get scheduler metrics
   */
  async getMetrics(): Promise<SchedulerMetrics> {
    return this.monitorService.getMetrics();
  }

  /**
   * Get job templates
   */
  getTemplates(category?: string): JobTemplate[] {
    const templates = Array.from(this.templates.values());

    if (category) {
      return templates.filter(t => t.category === category);
    }

    return templates;
  }

  /**
   * Load job templates
   */
  private loadJobTemplates(): void {
    // Daily summary template
    this.templates.set('daily-summary', {
      id: 'daily-summary',
      name: 'Daily Summary Email',
      description: 'Send a daily summary of tasks and activities',
      category: 'notifications',
      schedule: {
        type: JobType.RECURRING,
        frequency: RecurrenceFrequency.DAILY,
        time: '18:00',
      },
      action: {
        type: ActionType.EMAIL_SEND,
        target: 'user',
        method: 'sendDailySummary',
      },
      popularity: 85,
      tags: ['email', 'summary', 'daily'],
    });

    // Weekly review template
    this.templates.set('weekly-review', {
      id: 'weekly-review',
      name: 'Weekly Review',
      description: 'Generate and send weekly productivity review',
      category: 'analytics',
      schedule: {
        type: JobType.RECURRING,
        frequency: RecurrenceFrequency.WEEKLY,
        daysOfWeek: [5], // Friday
        time: '16:00',
      },
      action: {
        type: ActionType.REPORT_GENERATE,
        target: 'analytics',
        method: 'generateWeeklyReview',
        parameters: {
          reportType: 'weekly_review',
          format: 'pdf',
          emailTo: true,
        },
      },
      popularity: 72,
      tags: ['review', 'weekly', 'analytics'],
    });

    // Task cleanup template
    this.templates.set('task-cleanup', {
      id: 'task-cleanup',
      name: 'Completed Task Cleanup',
      description: 'Archive completed tasks older than 30 days',
      category: 'maintenance',
      schedule: {
        type: JobType.RECURRING,
        frequency: RecurrenceFrequency.MONTHLY,
        daysOfMonth: [1], // 1st of month
        time: '02:00',
      },
      action: {
        type: ActionType.DATA_CLEANUP,
        target: 'tasks',
        method: 'archiveCompleted',
        parameters: {
          olderThanDays: 30,
          cleanCompletedTasks: true,
        },
      },
      popularity: 45,
      tags: ['cleanup', 'tasks', 'maintenance'],
    });

    // Integration sync template
    this.templates.set('integration-sync', {
      id: 'integration-sync',
      name: 'Integration Data Sync',
      description: 'Sync data from connected integrations',
      category: 'integrations',
      schedule: {
        type: JobType.INTERVAL,
        intervalMinutes: 30,
      },
      action: {
        type: ActionType.SYNC_INTEGRATION,
        target: 'integrations',
        method: 'syncAll',
        parameters: {
          syncType: 'incremental',
        },
      },
      popularity: 68,
      tags: ['sync', 'integrations', 'data'],
    });

    // Reminder digest template
    this.templates.set('reminder-digest', {
      id: 'reminder-digest',
      name: 'Morning Reminder Digest',
      description: 'Send daily digest of upcoming tasks and events',
      category: 'notifications',
      schedule: {
        type: JobType.RECURRING,
        frequency: RecurrenceFrequency.DAILY,
        time: '08:00',
      },
      action: {
        type: ActionType.NOTIFICATION_SEND,
        target: 'user',
        method: 'sendReminderDigest',
        parameters: {
          includeToday: true,
          includeTomorrow: true,
          channels: ['email', 'push'],
        },
      },
      popularity: 90,
      tags: ['reminder', 'digest', 'morning'],
    });
  }

  private mapJobToScheduledJob(job: DatabaseJob): ScheduledJob | null {
    // Only process jobs with valid userId
    if (!job.userId) {
      return null;
    }

    return {
      id: job.id,
      userId: job.userId,
      name: String(job.name),
      description: job.description ? String(job.description) : undefined,
      type: job.type as JobType,
      schedule: this.parseSchedule(job.schedule as string | null),
      action: this.parseAction(job.payload),
      enabled: Boolean(job.enabled),
      metadata: this.parseMetadata(job.payload),
      lastRun: job.lastRun ? new Date(job.lastRun) : undefined,
      nextRun: job.nextRun ? new Date(job.nextRun) : undefined,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
    };
  }

  private parseSchedule(schedule: string | null): JobSchedule {
    if (!schedule) {
      return { type: JobType.ONE_TIME };
    }
    try {
      return JSON.parse(schedule) as JobSchedule;
    } catch {
      return { type: JobType.ONE_TIME };
    }
  }

  private parseAction(payload: string | number | boolean | object | null): JobAction {
    if (!payload || typeof payload !== 'object') {
      return {
        type: ActionType.CUSTOM_FUNCTION,
        target: 'default',
        method: 'execute',
      };
    }

    try {
      const payloadObj = payload as Record<string, string | number | boolean | object>;
      if (typeof payloadObj.action === 'string') {
        return JSON.parse(payloadObj.action) as JobAction;
      } else if (payloadObj.action && typeof payloadObj.action === 'object') {
        return payloadObj.action as JobAction;
      }
    } catch {
      // Fall through to default
    }

    return {
      type: ActionType.CUSTOM_FUNCTION,
      target: 'default',
      method: 'execute',
    };
  }

  private convertToJobError(
    error: string | number | boolean | object | null
  ): JobError | undefined {
    if (!error) {
      return undefined;
    }

    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, string | number | boolean>;
      return {
        code: typeof errorObj.code === 'string' ? errorObj.code : 'EXECUTION_ERROR',
        message: typeof errorObj.message === 'string' ? errorObj.message : 'Job execution failed',
        retryable: typeof errorObj.retryable === 'boolean' ? errorObj.retryable : false,
      };
    }

    if (typeof error === 'string') {
      return {
        code: 'EXECUTION_ERROR',
        message: error,
        retryable: false,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      retryable: false,
    };
  }

  private parseMetadata(payload: string | number | boolean | object | null): JobMetadata {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    try {
      const payloadObj = payload as Record<string, string | number | boolean | object>;
      if (typeof payloadObj.metadata === 'string') {
        return JSON.parse(payloadObj.metadata) as JobMetadata;
      } else if (payloadObj.metadata && typeof payloadObj.metadata === 'object') {
        return payloadObj.metadata as JobMetadata;
      }
    } catch {
      // Fall through to default
    }

    return {};
  }
}
