import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ScheduledJob,
  JobType,
  JobSchedule,
  ExecutionStatus,
  JobAction,
  JobMetadata,
  JobExecutionResult,
  ActionType,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';
import * as cronParser from 'cron-parser';
import { v4 as uuidv4 } from 'uuid';

// Define the exact payload structure for scheduled jobs
interface JobPayload {
  action?: {
    type: string;
    target: string;
    method: string;
    parameters?: Record<string, string | number | boolean | Date>;
  };
  metadata?: {
    [key: string]: string | number | boolean | string[];
  };
}

@Injectable()
export class JobSchedulerService {
  private readonly logger = new Logger(JobSchedulerService.name);
  private readonly activeJobs = new Map<string, CronJob>();

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private prisma: PrismaService
  ) {
    this.loadActiveJobs();
  }

  /**
   * Schedule a new job
   */
  async scheduleJob(job: ScheduledJob): Promise<void> {
    try {
      // Validate schedule
      this.validateSchedule(job.schedule);

      // Calculate next run time
      const nextRun = this.calculateNextRun(job.schedule);
      job.nextRun = nextRun;

      // Store job in database
      await this.prisma.scheduledJob.create({
        data: {
          id: job.id,
          userId: job.userId,
          name: job.name,
          description: job.description,
          type: job.type,
          schedule: this.serializeSchedule(job.schedule),
          payload: this.serializePayload(job.action, job.metadata || {}),
          enabled: job.enabled,
          nextRun,
        },
      });

      // Activate job if enabled
      if (job.enabled) {
        await this.activateJob(job);
      }

      this.logger.log(`Scheduled job ${job.id} for user ${job.userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to schedule job: ${errorMessage}`);
      throw new BusinessException(
        'Failed to schedule job',
        'JOB_SCHEDULE_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Activate a job
   */
  async activateJob(job: ScheduledJob): Promise<void> {
    try {
      switch (job.type) {
        case JobType.ONE_TIME:
          await this.scheduleOneTimeJob(job);
          break;
        case JobType.RECURRING:
          await this.scheduleRecurringJob(job);
          break;
        case JobType.CRON:
          await this.scheduleCronJob(job);
          break;
        case JobType.INTERVAL:
          await this.scheduleIntervalJob(job);
          break;
        case JobType.DELAYED:
          await this.scheduleDelayedJob(job);
          break;
      }

      this.activeJobs.set(job.id, this.schedulerRegistry.getCronJob(job.id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to activate job: ${errorMessage}`);
      throw new BusinessException(
        'Failed to activate job',
        'JOB_ACTIVATION_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Deactivate a job
   */
  async deactivateJob(jobId: string): Promise<void> {
    try {
      const cronJob = this.activeJobs.get(jobId);
      if (cronJob) {
        cronJob.stop();
        this.schedulerRegistry.deleteCronJob(jobId);
        this.activeJobs.delete(jobId);
      }

      await this.prisma.scheduledJob.update({
        where: { id: jobId },
        data: { enabled: false },
      });

      this.logger.log(`Deactivated job ${jobId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to deactivate job: ${errorMessage}`);
      throw new BusinessException(
        'Failed to deactivate job',
        'JOB_DEACTIVATION_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Update job schedule
   */
  async updateJobSchedule(jobId: string, newSchedule: JobSchedule): Promise<void> {
    try {
      // Validate new schedule
      this.validateSchedule(newSchedule);

      // Get existing job
      const job = await this.prisma.scheduledJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      // Deactivate current job
      await this.deactivateJob(jobId);

      // Update schedule
      const nextRun = this.calculateNextRun(newSchedule);
      const updatedJob = await this.prisma.scheduledJob.update({
        where: { id: jobId },
        data: {
          schedule: this.serializeSchedule(newSchedule),
          nextRun,
        },
      });

      // Reactivate if enabled
      if (updatedJob.enabled) {
        const scheduledJob = this.mapDatabaseJobToScheduledJob(
          updatedJob as {
            id: string;
            userId: string | null;
            name: string;
            description: string | null;
            type: string;
            schedule: string | null;
            payload: {
              [key: string]:
                | string
                | number
                | boolean
                | Date
                | null
                | Record<string, string | number | boolean | Date | null>;
            } | null;
            enabled: boolean;
            lastRun: Date | null;
            nextRun: Date | null;
            createdAt: Date;
            updatedAt: Date;
          }
        );
        await this.activateJob(scheduledJob);
      }

      this.logger.log(`Updated schedule for job ${jobId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update job schedule: ${errorMessage}`);
      throw new BusinessException(
        'Failed to update job schedule',
        'JOB_UPDATE_FAILED',
        undefined,
        error instanceof Error ? { message: error.message } : undefined
      );
    }
  }

  /**
   * Schedule one-time job
   */
  private async scheduleOneTimeJob(job: ScheduledJob): Promise<void> {
    if (!job.schedule.runAt) {
      throw new Error('One-time job requires runAt date');
    }

    const cronJob = new CronJob(
      job.schedule.runAt,
      async () => {
        await this.executeJob(job);
        // Disable job after execution
        await this.deactivateJob(job.id);
      },
      null,
      true,
      job.schedule.timezone || 'UTC'
    );

    this.schedulerRegistry.addCronJob(job.id, cronJob);
  }

  /**
   * Schedule recurring job
   */
  private async scheduleRecurringJob(job: ScheduledJob): Promise<void> {
    const cronExpression = this.buildCronExpression(job.schedule);

    const cronJob = new CronJob(
      cronExpression,
      async () => {
        await this.executeJob(job);
        await this.updateNextRun(job.id);
      },
      null,
      true,
      job.schedule.timezone || 'UTC'
    );

    this.schedulerRegistry.addCronJob(job.id, cronJob);
  }

  /**
   * Schedule cron job
   */
  private async scheduleCronJob(job: ScheduledJob): Promise<void> {
    if (!job.schedule.cronExpression) {
      throw new Error('Cron job requires cronExpression');
    }

    const cronJob = new CronJob(
      job.schedule.cronExpression,
      async () => {
        await this.executeJob(job);
        await this.updateNextRun(job.id);
      },
      null,
      true,
      job.schedule.timezone || 'UTC'
    );

    this.schedulerRegistry.addCronJob(job.id, cronJob);
  }

  /**
   * Schedule interval job
   */
  private async scheduleIntervalJob(job: ScheduledJob): Promise<void> {
    const intervalMs = (job.schedule.intervalMinutes || 60) * 60 * 1000;

    const executeAndReschedule = async () => {
      await this.executeJob(job);
      await this.updateNextRun(job.id);
    };

    // Execute immediately if needed
    if (job.metadata?.executeImmediately) {
      executeAndReschedule();
    }

    const interval = setInterval(executeAndReschedule, intervalMs);

    // Store interval reference
    this.schedulerRegistry.addInterval(`interval-${job.id}`, interval);
  }

  /**
   * Schedule delayed job
   */
  private async scheduleDelayedJob(job: ScheduledJob): Promise<void> {
    const delayMs = (job.schedule.delayMinutes || 5) * 60 * 1000;

    const timeout = setTimeout(async () => {
      await this.executeJob(job);
      // Disable job after execution
      await this.deactivateJob(job.id);
    }, delayMs);

    this.schedulerRegistry.addTimeout(`timeout-${job.id}`, timeout);
  }

  /**
   * Execute job
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    const executionId = uuidv4();

    try {
      // Create execution record
      await this.prisma.jobExecution.create({
        data: {
          id: executionId,
          jobId: job.id,
          status: ExecutionStatus.RUNNING,
          startedAt: new Date(),
          retryCount: 0,
        },
      });

      // Execute job action
      const result = await this.executeJobAction(job);

      // Update execution record
      await this.prisma.jobExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date(),
          result,
        },
      });

      // Update job last run
      await this.prisma.scheduledJob.update({
        where: { id: job.id },
        data: { lastRun: new Date() },
      });

      this.logger.log(`Successfully executed job ${job.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof Error && 'code' in error ? String(error.code) : 'EXECUTION_ERROR';
      this.logger.error(`Job execution failed: ${errorMessage}`);

      // Update execution record
      await this.prisma.jobExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          completedAt: new Date(),
          error: {
            code: errorCode,
            message: errorMessage,
            retryable: true,
          },
        },
      });

      // Handle retry if policy exists
      if (job.action.retryPolicy) {
        await this.handleRetry(job, executionId);
      }
    }
  }

  /**
   * Execute job action
   */
  private async executeJobAction(job: ScheduledJob): Promise<JobExecutionResult> {
    // This would call the appropriate service based on action type
    // For now, returning mock result
    return {
      success: true,
      actionType: job.action.type,
      timestamp: new Date(),
    };
  }

  /**
   * Handle job retry
   */
  private async handleRetry(job: ScheduledJob, executionId: string): Promise<void> {
    const execution = await this.prisma.jobExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution || !job.action.retryPolicy) {
      return;
    }

    const { maxRetries, retryDelayMs, backoffMultiplier = 1 } = job.action.retryPolicy;

    if (execution.retryCount < maxRetries) {
      const delay = retryDelayMs * Math.pow(backoffMultiplier, execution.retryCount);

      setTimeout(async () => {
        await this.executeJob(job);
      }, delay);

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
   * Build cron expression from schedule
   */
  private buildCronExpression(schedule: JobSchedule): string {
    const { frequency, time = '00:00', daysOfWeek, daysOfMonth } = schedule;
    const [hour, minute] = time.split(':').map(Number);

    switch (frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        const days = daysOfWeek?.join(',') || '1'; // Default Monday
        return `${minute} ${hour} * * ${days}`;
      case 'monthly':
        const dates = daysOfMonth?.join(',') || '1'; // Default 1st
        return `${minute} ${hour} ${dates} * *`;
      case 'yearly':
        return `${minute} ${hour} 1 1 *`; // January 1st
      default:
        return '0 * * * *'; // Hourly default
    }
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: JobSchedule): Date {
    try {
      if (schedule.runAt) {
        return new Date(schedule.runAt);
      }

      if (schedule.cronExpression) {
        const interval = cronParser.parseExpression(schedule.cronExpression, {
          tz: schedule.timezone,
        });
        return interval.next().toDate();
      }

      if (schedule.intervalMinutes) {
        return new Date(Date.now() + schedule.intervalMinutes * 60 * 1000);
      }

      if (schedule.delayMinutes) {
        return new Date(Date.now() + schedule.delayMinutes * 60 * 1000);
      }

      // For recurring jobs
      const cronExpression = this.buildCronExpression(schedule);
      const interval = cronParser.parseExpression(cronExpression, { tz: schedule.timezone });
      return interval.next().toDate();
    } catch (error) {
      this.logger.warn(`Failed to calculate next run: ${error}`);
      return new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    }
  }

  /**
   * Update next run time
   */
  private async updateNextRun(jobId: string): Promise<void> {
    const job = await this.prisma.scheduledJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return;

    const nextRun = this.calculateNextRun(this.parseSchedule(job.schedule));

    await this.prisma.scheduledJob.update({
      where: { id: jobId },
      data: { nextRun },
    });
  }

  /**
   * Validate schedule
   */
  private validateSchedule(schedule: JobSchedule): void {
    if (schedule.type === JobType.ONE_TIME && !schedule.runAt) {
      throw new BusinessException('One-time job requires runAt date', 'INVALID_SCHEDULE');
    }

    if (schedule.type === JobType.CRON && !schedule.cronExpression) {
      throw new BusinessException('Cron job requires cronExpression', 'INVALID_SCHEDULE');
    }

    if (schedule.cronExpression) {
      try {
        cronParser.parseExpression(schedule.cronExpression);
      } catch (error) {
        throw new BusinessException('Invalid cron expression', 'INVALID_CRON_EXPRESSION');
      }
    }

    if (schedule.startDate && schedule.endDate) {
      if (new Date(schedule.startDate) >= new Date(schedule.endDate)) {
        throw new BusinessException('Start date must be before end date', 'INVALID_DATE_RANGE');
      }
    }
  }

  /**
   * Load active jobs on startup
   */
  private async loadActiveJobs(): Promise<void> {
    try {
      const jobs = await this.prisma.scheduledJob.findMany({
        where: { enabled: true },
      });

      for (const job of jobs) {
        try {
          const scheduledJob = this.mapDatabaseJobToScheduledJob(
            job as {
              id: string;
              userId: string | null;
              name: string;
              description: string | null;
              type: string;
              schedule: string | null;
              payload: {
                [key: string]:
                  | string
                  | number
                  | boolean
                  | Date
                  | null
                  | Record<string, string | number | boolean | Date | null>;
              } | null;
              enabled: boolean;
              lastRun: Date | null;
              nextRun: Date | null;
              createdAt: Date;
              updatedAt: Date;
            }
          );
          await this.activateJob(scheduledJob);
        } catch (error) {
          this.logger.error(`Failed to load job ${job.id}: ${error}`);
        }
      }

      this.logger.log(`Loaded ${jobs.length} active jobs`);
    } catch (error) {
      this.logger.error(`Failed to load active jobs: ${error}`);
    }
  }

  private serializeSchedule(schedule: JobSchedule): string {
    return JSON.stringify(schedule);
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

  private serializePayload(
    action: JobAction,
    metadata: JobMetadata
  ): Record<string, string | number | boolean | Date | null> {
    const result: Record<string, string | number | boolean | Date | null> = {};
    result.action = JSON.stringify({
      type: action.type,
      target: action.target,
      method: action.method,
      parameters: action.parameters || {},
      retryPolicy: action.retryPolicy || null,
    });

    if (metadata) {
      result.metadata = JSON.stringify(metadata);
    } else {
      result.metadata = '{}';
    }

    return result;
  }

  /**
   * Map database job record to ScheduledJob interface
   */
  private mapDatabaseJobToScheduledJob(job: {
    id: string;
    userId: string | null;
    name: string;
    description: string | null;
    type: string;
    schedule: string | null;
    payload: {
      [key: string]:
        | string
        | number
        | boolean
        | Date
        | null
        | Record<string, string | number | boolean | Date | null>;
    } | null;
    enabled: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ScheduledJob {
    if (!job.userId) {
      throw new BusinessException('Job has no associated user', 'INVALID_JOB_DATA');
    }

    const validatedPayload = this.validateAndParsePayload(job.payload);

    return {
      id: job.id,
      userId: job.userId,
      name: job.name,
      description: job.description ? job.description : 'Scheduled job',
      type: job.type as JobType,
      schedule: this.parseSchedule(job.schedule),
      action: this.parseAction(validatedPayload),
      enabled: job.enabled,
      metadata: this.parseMetadata(validatedPayload),
      lastRun: job.lastRun ? job.lastRun : new Date(0),
      nextRun: job.nextRun ? job.nextRun : new Date(Date.now() + 86400000),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private validateAndParsePayload(
    payload: {
      [key: string]:
        | string
        | number
        | boolean
        | Date
        | null
        | Record<string, string | number | boolean | Date | null>;
    } | null
  ): JobPayload {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const validatedPayload: JobPayload = {};

    if (payload.action && typeof payload.action === 'object') {
      const action = payload.action as Record<string, string | number | boolean | Date | null>;
      validatedPayload.action = {
        type: typeof action.type === 'string' ? action.type : 'custom_function',
        target: typeof action.target === 'string' ? action.target : 'default',
        method: typeof action.method === 'string' ? action.method : 'execute',
        parameters:
          action.parameters &&
          typeof action.parameters === 'object' &&
          !Array.isArray(action.parameters) &&
          !(action.parameters instanceof Date)
            ? (action.parameters as Record<string, string | number | boolean | Date>)
            : {},
      };
    }

    if (payload.metadata && typeof payload.metadata === 'object') {
      const metadata = payload.metadata as Record<string, string | number | boolean | string[]>;
      validatedPayload.metadata = metadata;
    }

    return validatedPayload;
  }

  /**
   * Parse action from payload
   */
  private parseAction(payload: JobPayload | null): JobAction {
    if (!payload?.action) {
      return {
        type: ActionType.CUSTOM_FUNCTION,
        target: 'default',
        method: 'execute',
      };
    }

    return {
      type: payload.action.type as ActionType,
      target: payload.action.target,
      method: payload.action.method,
      parameters: payload.action.parameters,
    };
  }

  /**
   * Parse metadata from payload
   */
  private parseMetadata(payload: JobPayload | null): JobMetadata {
    if (!payload?.metadata) {
      return {};
    }

    return payload.metadata;
  }
}
