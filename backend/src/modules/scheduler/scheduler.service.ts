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
} from './interfaces';
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
    metadata?: Record<string, any>
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
    } catch (error: any) {
      this.logger.error(`Failed to create job: ${error.message}`);
      throw new BusinessException(
        'Failed to create scheduled job',
        'JOB_CREATE_FAILED',
        undefined,
        error
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

    return jobs.map(job => this.mapJobToScheduledJob(job));
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
        await this.jobScheduler.activateJob(updated as any);
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
      status: execution.status as any,
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
      status: exec.status as any,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt || undefined,
      duration: exec.duration || undefined,
      result: exec.result,
      error: exec.error as any,
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
        frequency: 'daily' as any,
        time: '18:00',
      },
      action: {
        type: 'email_send' as any,
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
        frequency: 'weekly' as any,
        daysOfWeek: [5], // Friday
        time: '16:00',
      },
      action: {
        type: 'report_generate' as any,
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
        frequency: 'monthly' as any,
        daysOfMonth: [1], // 1st of month
        time: '02:00',
      },
      action: {
        type: 'data_cleanup' as any,
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
        type: 'sync_integration' as any,
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
        frequency: 'daily' as any,
        time: '08:00',
      },
      action: {
        type: 'notification_send' as any,
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

  private mapJobToScheduledJob(job: any): ScheduledJob {
    return {
      id: job.id,
      userId: job.userId || '',
      name: job.name,
      description: job.description || undefined,
      type: job.type as JobType,
      schedule: this.parseSchedule(job.schedule),
      action: this.parseAction(job.payload),
      enabled: job.enabled,
      metadata: this.parseMetadata(job.payload),
      lastRun: job.lastRun || undefined,
      nextRun: job.nextRun || undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private parseSchedule(schedule: string | null): JobSchedule {
    if (!schedule) {
      return { type: JobType.ONE_TIME };
    }
    try {
      return JSON.parse(schedule);
    } catch {
      return { type: JobType.ONE_TIME };
    }
  }

  private parseAction(payload: any): JobAction {
    if (!payload || typeof payload !== 'object') {
      return {
        type: 'custom_function' as any,
        target: 'default',
        method: 'execute',
      };
    }
    return (
      payload.action || {
        type: 'custom_function' as any,
        target: 'default',
        method: 'execute',
      }
    );
  }

  private parseMetadata(payload: any): Record<string, any> {
    if (!payload || typeof payload !== 'object') {
      return {};
    }
    return payload.metadata || {};
  }
}
