import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  SchedulerMetrics,
  UpcomingJob,
  JobStatistics,
  ExecutionStatus,
} from '../interfaces';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SchedulerMonitorService {
  private readonly logger = new Logger(SchedulerMonitorService.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private notificationsService: NotificationsService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Monitor job health - runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorJobHealth(): Promise<void> {
    try {
      const unhealthyJobs = await this.findUnhealthyJobs();
      
      if (unhealthyJobs.length > 0) {
        this.logger.warn(`Found ${unhealthyJobs.length} unhealthy jobs`);
        
        for (const job of unhealthyJobs) {
          await this.handleUnhealthyJob(job);
        }
      }

      // Update metrics cache
      await this.updateMetricsCache();
    } catch (error: any) {
      this.logger.error(`Job health monitoring failed: ${error.message}`);
    }
  }

  /**
   * Clean up stuck executions - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStuckExecutions(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Find executions stuck in running state
      const stuckExecutions = await this.prisma.jobExecution.findMany({
        where: {
          status: ExecutionStatus.RUNNING,
          startedAt: { lt: oneHourAgo },
        },
      });

      for (const execution of stuckExecutions) {
        await this.prisma.jobExecution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.FAILED,
            completedAt: new Date(),
            error: {
              code: 'EXECUTION_TIMEOUT',
              message: 'Execution timed out after 1 hour',
              retryable: true,
            },
          },
        });

        this.logger.warn(`Marked execution ${execution.id} as failed due to timeout`);
      }

      this.logger.log(`Cleaned up ${stuckExecutions.length} stuck executions`);
    } catch (error: any) {
      this.logger.error(`Stuck execution cleanup failed: ${error.message}`);
    }
  }

  /**
   * Get scheduler metrics
   */
  async getMetrics(): Promise<SchedulerMetrics> {
    // Check cache first
    const cached = await this.cacheService.get<SchedulerMetrics>('scheduler:metrics');
    if (cached) {
      return cached;
    }

    const [
      totalJobs,
      activeJobs,
      pausedJobs,
      executionsToday,
      successfulToday,
      upcomingJobs,
    ] = await Promise.all([
      this.prisma.scheduledJob.count(),
      this.prisma.scheduledJob.count({ where: { enabled: true } }),
      this.prisma.scheduledJob.count({ where: { enabled: false } }),
      this.getExecutionsToday(),
      this.getSuccessfulExecutionsToday(),
      this.getUpcomingJobs(10),
    ]);

    const metrics: SchedulerMetrics = {
      totalJobs,
      activeJobs,
      pausedJobs,
      executionsToday,
      successRate: executionsToday > 0 ? (successfulToday / executionsToday) * 100 : 100,
      averageExecutionTime: await this.getAverageExecutionTime(),
      failureRate: executionsToday > 0 ? ((executionsToday - successfulToday) / executionsToday) * 100 : 0,
      upcomingJobs,
    };

    // Cache for 5 minutes
    await this.cacheService.set('scheduler:metrics', metrics, 300);

    return metrics;
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(jobId: string): Promise<JobStatistics> {
    const [
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      avgDuration,
      lastExecution,
    ] = await Promise.all([
      this.prisma.jobExecution.count({ where: { jobId } }),
      this.prisma.jobExecution.count({
        where: { jobId, status: ExecutionStatus.COMPLETED },
      }),
      this.prisma.jobExecution.count({
        where: { jobId, status: ExecutionStatus.FAILED },
      }),
      this.getAverageJobDuration(jobId),
      this.getLastExecution(jobId),
    ]);

    const job = await this.prisma.scheduledJob.findUnique({
      where: { id: jobId },
      select: { nextRun: true },
    });

    return {
      jobId,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDuration: avgDuration,
      lastExecution: lastExecution?.completedAt,
      nextExecution: job?.nextRun || undefined,
    };
  }

  /**
   * Monitor job performance
   */
  async monitorJobPerformance(jobId: string): Promise<void> {
    const stats = await this.getJobStatistics(jobId);
    
    // Check failure rate
    if (stats.totalExecutions > 10) {
      const failureRate = (stats.failedExecutions / stats.totalExecutions) * 100;
      
      if (failureRate > 20) {
        this.eventEmitter.emit('scheduler.job.unhealthy', {
          jobId,
          failureRate,
          stats,
        });

        // Notify admin
        const job = await this.prisma.scheduledJob.findUnique({
          where: { id: jobId },
        });

        if (job && job.userId) {
          await this.notificationsService.sendToUser(job.userId, {
            type: 'job_unhealthy',
            title: 'Scheduled Job Issues',
            message: `Job "${job.name}" has a ${failureRate.toFixed(1)}% failure rate`,
          });
        }
      }
    }

    // Check execution time
    if (stats.averageDuration > 300000) { // 5 minutes
      this.logger.warn(`Job ${jobId} average execution time is ${stats.averageDuration}ms`);
    }
  }

  /**
   * Find unhealthy jobs
   */
  private async findUnhealthyJobs(): Promise<any[]> {
    const jobs = await this.prisma.scheduledJob.findMany({
      where: { enabled: true },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    });

    const unhealthyJobs = [];

    for (const job of jobs) {
      // Check if job hasn't run when it should have
      if (job.nextRun && job.nextRun < new Date() && (!job.lastRun || job.lastRun < job.nextRun)) {
        unhealthyJobs.push({
          ...job,
          issue: 'missed_execution',
        });
        continue;
      }

      // Check recent failures
      const recentFailures = await this.prisma.jobExecution.count({
        where: {
          jobId: job.id,
          status: ExecutionStatus.FAILED,
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentFailures > 3) {
        unhealthyJobs.push({
          ...job,
          issue: 'high_failure_rate',
          failures: recentFailures,
        });
      }
    }

    return unhealthyJobs;
  }

  /**
   * Handle unhealthy job
   */
  private async handleUnhealthyJob(job: any): Promise<void> {
    this.logger.warn(`Handling unhealthy job ${job.id}: ${job.issue}`);

    switch (job.issue) {
      case 'missed_execution':
        // Try to execute the job
        this.eventEmitter.emit('scheduler.job.missed', {
          jobId: job.id,
          nextRun: job.nextRun,
        });
        break;

      case 'high_failure_rate':
        // Consider disabling the job
        if (job.failures > 5) {
          await this.prisma.scheduledJob.update({
            where: { id: job.id },
            data: {
              enabled: false,
            },
          });

          // Notify user
          await this.notificationsService.sendToUser(job.userId, {
            type: 'job_disabled',
            title: 'Scheduled Job Disabled',
            message: `Job "${job.name}" was disabled due to repeated failures`,
          });
        }
        break;
    }
  }

  /**
   * Helper methods
   */
  private async getExecutionsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.jobExecution.count({
      where: {
        startedAt: { gte: today },
      },
    });
  }

  private async getSuccessfulExecutionsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.jobExecution.count({
      where: {
        startedAt: { gte: today },
        status: ExecutionStatus.COMPLETED,
      },
    });
  }

  private async getUpcomingJobs(limit: number): Promise<UpcomingJob[]> {
    const jobs = await this.prisma.scheduledJob.findMany({
      where: {
        enabled: true,
        nextRun: { gte: new Date() },
      },
      orderBy: { nextRun: 'asc' },
      take: limit,
    });

    return jobs.map(job => ({
      jobId: job.id,
      jobName: job.name,
      nextRun: job.nextRun!,
      type: job.type as any,
    }));
  }

  private async getAverageExecutionTime(): Promise<number> {
    const result = await this.prisma.jobExecution.aggregate({
      where: {
        status: ExecutionStatus.COMPLETED,
        duration: { not: null },
      },
      _avg: { duration: true },
    });

    return result._avg.duration || 0;
  }

  private async getAverageJobDuration(jobId: string): Promise<number> {
    const result = await this.prisma.jobExecution.aggregate({
      where: {
        jobId,
        status: ExecutionStatus.COMPLETED,
        duration: { not: null },
      },
      _avg: { duration: true },
    });

    return result._avg.duration || 0;
  }

  private async getLastExecution(jobId: string): Promise<any> {
    return this.prisma.jobExecution.findFirst({
      where: { jobId },
      orderBy: { startedAt: 'desc' },
    });
  }

  private async updateMetricsCache(): Promise<void> {
    const metrics = await this.getMetrics();
    await this.cacheService.set('scheduler:metrics', metrics, 300);
  }
}