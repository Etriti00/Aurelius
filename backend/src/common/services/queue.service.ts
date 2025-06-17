import { Injectable, Logger } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue, JobOptions, Job } from 'bull'

interface ScheduledJobOptions {
  delay?: number
  priority?: number
  attempts?: number
  backoff?: number | { type: string; delay: number }
  removeOnComplete?: boolean
  removeOnFail?: boolean
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name)

  constructor(@InjectQueue('ai-processing') private aiProcessingQueue: Queue) {}

  // Task-related queue operations
  async queueTaskAnalysis(
    userId: string,
    taskId: string,
    taskTitle: string,
    taskDescription?: string,
    options?: ScheduledJobOptions,
  ): Promise<Job> {
    try {
      const jobData = {
        type: 'task_analysis',
        userId,
        entityId: taskId,
        taskId,
        taskTitle,
        taskDescription,
      }

      const jobOptions: JobOptions = {,
        priority: options?.priority || 5,
        attempts: options?.attempts || 3,
        backoff: options?.backoff || { type: 'exponential', delay: 2000 },
        removeOnComplete: options?.removeOnComplete ?? 10,
        removeOnFail: options?.removeOnFail ?? 5,
        ...(options?.delay && { delay: options.delay }),
      }

      const job = await this.aiProcessingQueue.add('task_analysis', jobData, jobOptions)
      this.logger.debug(`Queued task analysis job: ${job.id} for task: ${taskId}`)
      return job
    } catch (error) {
      this.logger.error(`Error queueing task analysis for ${taskId}:`, error)
      throw error
    }
  }

  async queueEmailSummary(
    userId: string,
    emailId: string,
    emailContent: string,
    threadHistory?: string[],
    options?: ScheduledJobOptions,
  ): Promise<Job> {
    try {
      const jobData = {
        type: 'email_summary',
        userId,
        entityId: emailId,
        emailId,
        emailContent,
        threadHistory,
      }

      const jobOptions: JobOptions = {,
        priority: options?.priority || 7, // Higher priority for emails
        attempts: options?.attempts || 3,
        backoff: options?.backoff || { type: 'exponential', delay: 2000 },
        removeOnComplete: options?.removeOnComplete ?? 10,
        removeOnFail: options?.removeOnFail ?? 5,
        ...(options?.delay && { delay: options.delay }),
      }

      const job = await this.aiProcessingQueue.add('email_summary', jobData, jobOptions)
      this.logger.debug(`Queued email summary job: ${job.id} for email: ${emailId}`)
      return job
    } catch (error) {
      this.logger.error(`Error queueing email summary for ${emailId}:`, error)
      throw error
    }
  }

  async queueMeetingPrep(
    userId: string,
    eventId: string,
    eventTitle: string,
    eventDescription?: string,
    attendees?: string[],
    options?: ScheduledJobOptions,
  ): Promise<Job> {
    try {
      const jobData = {
        type: 'meeting_prep',
        userId,
        entityId: eventId,
        eventId,
        eventTitle,
        eventDescription,
        attendees: attendees || [],
      }

      const jobOptions: JobOptions = {,
        priority: options?.priority || 6,
        attempts: options?.attempts || 3,
        backoff: options?.backoff || { type: 'exponential', delay: 2000 },
        removeOnComplete: options?.removeOnComplete ?? 10,
        removeOnFail: options?.removeOnFail ?? 5,
        ...(options?.delay && { delay: options.delay }),
      }

      const job = await this.aiProcessingQueue.add('meeting_prep', jobData, jobOptions)
      this.logger.debug(`Queued meeting prep job: ${job.id} for event: ${eventId}`)
      return job
    } catch (error) {
      this.logger.error(`Error queueing meeting prep for ${eventId}:`, error)
      throw error
    }
  }

  async queueEmbeddingGeneration(
    userId: string,
    entityType: string,
    entityId: string,
    text: string,
    metadata?: Record<string, unknown>,
    options?: ScheduledJobOptions,
  ): Promise<Job> {
    try {
      const jobData = {
        type: 'embedding_generation',
        userId,
        entityId,
        entityType,
        text,
        metadata,
      }

      const jobOptions: JobOptions = {,
        priority: options?.priority || 3, // Lower priority for embeddings
        attempts: options?.attempts || 2,
        backoff: options?.backoff || { type: 'fixed', delay: 1000 },
        removeOnComplete: options?.removeOnComplete ?? 20,
        removeOnFail: options?.removeOnFail ?? 10,
        ...(options?.delay && { delay: options.delay }),
      }

      const job = await this.aiProcessingQueue.add('embedding_generation', jobData, jobOptions)
      this.logger.debug(`Queued embedding generation job: ${job.id} for ${entityType}: ${entityId}`)
      return job
    } catch (error) {
      this.logger.error(`Error queueing embedding generation for ${entityType}:${entityId}:`, error)
      throw error
    }
  }

  async queueInsightGeneration(
    userId: string,
    entityId: string,
    context: string,
    insightType: string,
    options?: ScheduledJobOptions,
  ): Promise<Job> {
    try {
      const jobData = {
        type: 'insight_generation',
        userId,
        entityId,
        context,
        insightType,
      }

      const jobOptions: JobOptions = {,
        priority: options?.priority || 4,
        attempts: options?.attempts || 3,
        backoff: options?.backoff || { type: 'exponential', delay: 2000 },
        removeOnComplete: options?.removeOnComplete ?? 15,
        removeOnFail: options?.removeOnFail ?? 5,
        ...(options?.delay && { delay: options.delay }),
      }

      const job = await this.aiProcessingQueue.add('insight_generation', jobData, jobOptions)
      this.logger.debug(`Queued insight generation job: ${job.id} for entity: ${entityId}`)
      return job
    } catch (error) {
      this.logger.error(`Error queueing insight generation for ${entityId}:`, error)
      throw error
    }
  }

  // Batch processing
  async queueBatchTaskAnalysis(
    tasks: Array<{ userId: string; taskId: string; taskTitle: string; taskDescription?: string }>,
    options?: ScheduledJobOptions,
  ): Promise<Job[]> {
    try {
      const jobs = await Promise.all(
        tasks.map(task =>
          this.queueTaskAnalysis(
            task.userId,
            task.taskId,
            task.taskTitle,
            task.taskDescription,
            options,
          ),
        ),
      )

      this.logger.debug(`Queued ${jobs.length} task analysis jobs in batch`)
      return jobs
    } catch (error) {
      this.logger.error(`Error queueing batch task analysis:`, error)
      throw error
    }
  }

  async queueBatchEmbeddingGeneration(
    embeddings: Array<{,
      userId: string
      entityType: string,
      entityId: string
      text: string
      metadata?: Record<string, unknown>
    }>,
    options?: ScheduledJobOptions,
  ): Promise<Job[]> {
    try {
      const jobs = await Promise.all(
        embeddings.map(embedding =>
          this.queueEmbeddingGeneration(
            embedding.userId,
            embedding.entityType,
            embedding.entityId,
            embedding.text,
            embedding.metadata,
            options,
          ),
        ),
      )

      this.logger.debug(`Queued ${jobs.length} embedding generation jobs in batch`)
      return jobs
    } catch (error) {
      this.logger.error(`Error queueing batch embedding generation:`, error)
      throw error
    }
  }

  // Queue management
  async getJobById(jobId: string): Promise<Job | null> {
    try {
      return await this.aiProcessingQueue.getJob(jobId)
    } catch (error) {
      this.logger.error(`Error getting job ${jobId}:`, error)
      return null
    }
  }

  async getJobStatus(jobId: string): Promise<string | null> {
    try {
      const job = await this.getJobById(jobId)
      if (!job) return null

      if (await job.isCompleted()) return 'completed'
      if (await job.isFailed()) return 'failed'
      if (await job.isActive()) return 'active'
      if (await job.isWaiting()) return 'waiting'
      if (await job.isDelayed()) return 'delayed'

      return 'unknown'
    } catch (error) {
      this.logger.error(`Error getting job status for ${jobId}:`, error)
      return null
    }
  }

  async getJobProgress(jobId: string): Promise<number | null> {
    try {
      const job = await this.getJobById(jobId)
      if (!job) return null

      return job.progress()
    } catch (error) {
      this.logger.error(`Error getting job progress for ${jobId}:`, error)
      return null
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJobById(jobId)
      if (!job) return false

      await job.remove()
      this.logger.debug(`Cancelled job: ${jobId}`)
      return true
    } catch (error) {
      this.logger.error(`Error cancelling job ${jobId}:`, error)
      return false
    }
  }

  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJobById(jobId)
      if (!job) return false

      await job.retry()
      this.logger.debug(`Retried job: ${jobId}`)
      return true
    } catch (error) {
      this.logger.error(`Error retrying job ${jobId}:`, error)
      return false
    }
  }

  // Queue statistics
  async getQueueStats(): Promise<{
    waiting: number,
    active: number
    completed: number,
    failed: number
    delayed: number
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.aiProcessingQueue.getWaiting(),
        this.aiProcessingQueue.getActive(),
        this.aiProcessingQueue.getCompleted(),
        this.aiProcessingQueue.getFailed(),
        this.aiProcessingQueue.getDelayed(),
      ])

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      }
    } catch (error) {
      this.logger.error('Error getting queue stats:', error)
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    }
  }

  async getUserJobStats(userId: string): Promise<{,
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.aiProcessingQueue.getWaiting(),
        this.aiProcessingQueue.getActive(),
        this.aiProcessingQueue.getCompleted(),
        this.aiProcessingQueue.getFailed(),
        this.aiProcessingQueue.getDelayed(),
      ])

      const allJobs = [...waiting, ...active, ...completed, ...failed, ...delayed]
      const userJobs = allJobs.filter(job => job.data.userId === userId)

      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}

      for (const job of userJobs) {
        const type = job.data.type || 'unknown'
        byType[type] = (byType[type] || 0) + 1

        let status = 'unknown'
        if (await job.isCompleted()) status = 'completed'
        else if (await job.isFailed()) status = 'failed'
        else if (await job.isActive()) status = 'active'
        else if (await job.isWaiting()) status = 'waiting'
        else if (await job.isDelayed()) status = 'delayed'

        byStatus[status] = (byStatus[status] || 0) + 1
      }

      return {
        total: userJobs.length,
        byType,
        byStatus,
      }
    } catch (error) {
      this.logger.error(`Error getting user job stats for ${userId}:`, error)
      return { total: 0, byType: {}, byStatus: {} }
    }
  }

  // Queue health check
  async isQueueHealthy(): Promise<boolean> {
    try {
      const stats = await this.getQueueStats()

      // Consider queue healthy if we can get stats and don't have too many failed jobs
      const failureRate = stats.failed / (stats.completed + stats.failed || 1)

      return failureRate < 0.1 // Less than 10% failure rate
    } catch (error) {
      this.logger.error('Error checking queue health:', error)
      return false
    }
  }

  // Cleanup operations
  async cleanupCompletedJobs(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cleaned = await this.aiProcessingQueue.clean(olderThanMs, 'completed')
      this.logger.debug(`Cleaned up ${cleaned.length} completed jobs`)
      return cleaned.length
    } catch (error) {
      this.logger.error('Error cleaning up completed jobs:', error)
      return 0
    }
  }

  async cleanupFailedJobs(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cleaned = await this.aiProcessingQueue.clean(olderThanMs, 'failed')
      this.logger.debug(`Cleaned up ${cleaned.length} failed jobs`)
      return cleaned.length
    } catch (error) {
      this.logger.error('Error cleaning up failed jobs:', error)
      return 0
    }
  }

  // Scheduled job helpers
  async scheduleTaskAnalysisForUser(userId: string, delayMs: number): Promise<Job[]> {
    try {
      // This would typically fetch user's tasks and schedule analysis
      // For now, return empty array as placeholder
      this.logger.debug(`Scheduled task analysis for user ${userId} with delay ${delayMs}ms`)
      return []
    } catch (error) {
      this.logger.error(`Error scheduling task analysis for user ${userId}:`, error)
      return []
    }
  }

  async scheduleWeeklyInsights(userId: string): Promise<Job> {
    try {
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000

      return await this.queueInsightGeneration(
        userId,
        `weekly-${Date.now()}`,
        'Generate weekly productivity insights based on user activity',
        'productivity',
        { delay: oneWeekMs, priority: 2 },
      )
    } catch (error) {
      this.logger.error(`Error scheduling weekly insights for user ${userId}:`, error)
      throw error
    }
  }

  async scheduleDailyDigest(userId: string): Promise<Job> {
    try {
      const oneDayMs = 24 * 60 * 60 * 1000

      return await this.queueInsightGeneration(
        userId,
        `daily-${Date.now()}`,
        'Generate daily summary and recommendations',
        'workflow',
        { delay: oneDayMs, priority: 4 },
      )
    } catch (error) {
      this.logger.error(`Error scheduling daily digest for user ${userId}:`, error)
      throw error
    }
  }
}
