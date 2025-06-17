import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { Queue, Job, Worker } from 'bullmq'
import { PrismaService } from '../../../prisma/prisma.service'
import { RedisService } from '../../../common/services/redis.service'
import { IntegrationsService } from '../integrations.service'
import { IntegrationFactory, SupportedProvider } from '../base/integration-factory'
import { IntegrationRegistryService } from '../core/integration-registry.service'
import { RateLimiterService } from '../common/rate-limiter.service'
import { ConfigService } from '@nestjs/config'
import { IntegrationSyncStatus } from '@prisma/client'

export interface SyncJobData {
  userId: string,
  integrationId: string,
  provider: string,
  syncType: 'full' | 'incremental' | 'manual'
  lastSyncedAt?: Date
  priority?: 'low' | 'normal' | 'high'
  retryCount?: number,
  maxRetries?: number
}

export interface SyncResult {
  success: boolean,
  itemsProcessed: number,
  itemsSkipped: number,
  itemsFailed: number,
  errors: string[],
  duration: number,
  nextSyncAt?: Date
}

import { Logger } from '@nestjs/common'

@Injectable()
export class SyncOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(SyncOrchestratorService.name)
  private syncQueue: Queue
  private worker: Worker
  private readonly queueName = 'integration-sync'

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly integrationsService: IntegrationsService,
    private readonly integrationFactory: IntegrationFactory,
    private readonly registryService: IntegrationRegistryService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly configService: ConfigService,
  ) {
    this.initializeQueue()
  }

  async onModuleInit() {
    await this.startWorker()
    this.logger.log('Sync Orchestrator initialized successfully')
  }

  private initializeQueue(): void {
    const redisConnection = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
    }

    this.syncQueue = new Queue(this.queueName, {
      connection: redisConnection,
      defaultJobOptions: {,
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {,
          type: 'exponential',
          delay: 2000,
        },
      },
    })

    this.logger.debug('Sync queue initialized')
  }

  private async startWorker(): Promise<void> {
    const redisConnection = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
    }

    this.worker = new Worker(
      this.queueName,
      async (job: Job<SyncJobData>) => {
        return this.processSyncJob(job)
      },
      {
        connection: redisConnection,
        concurrency: 5, // Process up to 5 jobs concurrently
        stalledInterval: 30000, // 30 seconds
        maxStalledCount: 1,
      },
    )

    this.worker.on('completed', (job: Job, result: SyncResult) => {
      this.logger.log(`Sync job completed: ${job.id}`, {
        userId: job.data.userId,
        provider: job.data.provider,
        duration: result.duration,
        itemsProcessed: result.itemsProcessed,
      })
    })

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      this.logger.error(`Sync job failed: ${job?.id}`, {
        userId: job?.data?.userId,
        provider: job?.data?.provider,
        error: error.message,
        stack: error.stack,
      })
    })

    this.worker.on('stalled', (jobId: string) => {
      this.logger.warn(`Sync job stalled: ${jobId}`)
    })

    this.logger.debug('Sync worker started')
  }

  // Scheduled sync orchestration
  @Cron('*/5 * * * *') // Every 5 minutes
  async orchestrateIncrementalSync(): Promise<void> {
    try {
      this.logger.debug('Starting incremental sync orchestration')
  }

      const activeIntegrations = await this.getActiveIntegrations()

      for (const integration of activeIntegrations) {
        try {
          const shouldSync = await this.shouldSyncIntegration(integration)
      }

          if (shouldSync) {
            await this.scheduleSyncJob({
              userId: integration.userId,
              integrationId: integration.id,
              provider: integration.provider,
              syncType: 'incremental',
              lastSyncedAt: integration.lastSync,
              priority: 'normal',
            })
          }
    } catch (error) {
          this.logger.error(`Failed to schedule sync for integration ${integration.id}`, {
            error: error.message,
            integrationId: integration.id,
            userId: integration.userId,
          })
        }

      this.logger.debug(
        `Incremental sync orchestration completed for ${activeIntegrations.length} integrations`,
      )
    }
    } catch (error) {
      this.logger.error('Incremental sync orchestration failed', {
        error: error.message,
        stack: error.stack,
      })
    }

    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
  @Cron('0 2 * * *') // Daily at 2 AM
  async orchestrateDailyFullSync(): Promise<void> {
    try {
      this.logger.log('Starting daily full sync orchestration')
  }

      const integrations = await this.getIntegrationsForFullSync()

      for (const integration of integrations) {
        try {
          await this.scheduleSyncJob(
            {
              userId: integration.userId,
              integrationId: integration.id,
              provider: integration.provider,
              syncType: 'full',
              priority: 'low',
            },
            {
              delay: Math.random() * 3600000, // Random delay up to 1 hour to spread load
            },
          )
        }
      }
    } catch (error) {
          this.logger.error(`Failed to schedule full sync for integration ${integration.id}`, {
            error: error.message,
            integrationId: integration.id,
          })
        }

      this.logger.log(`Daily full sync scheduled for ${integrations.length} integrations`)
    }
    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Daily full sync orchestration failed', {
        error: error.message,
        stack: error.stack,
      })
    }

  // Public API methods
  async scheduleSyncJob(
    data: SyncJobData,
    options?: {
      delay?: number
      priority?: number,
      attempts?: number
    },
  ): Promise<string> {
    try {
      // Check rate limits before scheduling
      const rateLimitKey = `sync:${data.provider}:${data.userId}`
      const rateLimits = this.registryService.getRateLimits(data.provider)

      if (rateLimits) {
        await this.rateLimiterService.enforceRateLimit(rateLimitKey, rateLimits)
      }

      const job = await this.syncQueue.add(
        'sync-integration',
        {
          ...data,
          retryCount: 0,
          maxRetries: options?.attempts || 3,
        },
        {
          delay: options?.delay || 0,
          priority: options?.priority || this.getPriorityValue(data.priority || 'normal'),
          attempts: options?.attempts || 3,
          jobId: `${data.integrationId}-${data.syncType}-${Date.now()}`,
        },
      )

      this.logger.debug(`Sync job scheduled: ${job.id}`, {
        userId: data.userId,
        provider: data.provider,
        syncType: data.syncType,
      }),

      return job.id!
    }
    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to schedule sync job', {
        error: error.message,
        data,
      }),
      throw error
    }

  async scheduleManualSync(integrationId: string, _userId: string): Promise<string> {
    try {
      const _integration = await this.integrationsService.findOne(integrationId, userId)
  }

      return this.scheduleSyncJob({
        userId,
        integrationId,
        provider: integration.provider,
        syncType: 'manual',
        priority: 'high',
      })
    }
    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to schedule manual sync', {
        error: error.message,
        integrationId,
        userId,
      }),
      throw error
    }

  async pauseSync(integrationId: string, _userId: string): Promise<void> {
    try {
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { syncStatus: IntegrationSyncStatus.PAUSED },
      })
  }

      // Remove pending jobs for this integration
      const jobs = await this.syncQueue.getJobs(['waiting', 'delayed'])
      for (const job of jobs) {
        if (job.data.integrationId === integrationId) {
          await job.remove()
          this.logger.debug(`Removed pending sync job: ${job.id}`)
        }
      }

      this.logger.log(`Sync paused for integration: ${integrationId}`)
    }
    } catch (error) {
      this.logger.error('Failed to pause sync', {
        error: error.message,
        integrationId,
      }),
      throw error
    }

    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
  async resumeSync(integrationId: string, _userId: string): Promise<void> {
    try {
      const _integration = await this.integrationsService.findOne(integrationId, userId)
  }

      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { syncStatus: IntegrationSyncStatus.IDLE },
      })

      // Schedule immediate incremental sync
      await this.scheduleSyncJob({
        userId,
        integrationId,
        provider: integration.provider,
        syncType: 'incremental',
        priority: 'high',
      })

      this.logger.log(`Sync resumed for integration: ${integrationId}`)
    }
    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to resume sync', {
        error: error.message,
        integrationId,
      }),
      throw error
    }

  // Private methods
  private async processSyncJob(job: Job<SyncJobData>): Promise<SyncResult> {
    const startTime = Date.now()
    const { userId, integrationId, provider, syncType, lastSyncedAt } = job.data

    try {
      this.logger.debug(`Processing sync job: ${job.id}`, {
        userId,
        provider,
        syncType,
      })

      // Update sync status to SYNCING
      await this.updateSyncStatus(integrationId, IntegrationSyncStatus.SYNCING)

      // Get OAuth tokens
      const tokens = await this.integrationsService.getOAuthTokens(integrationId, userId)
      if (!tokens) {
        throw new Error('No valid OAuth tokens found')
      }

      // Create integration instance
      const integrationInstance = await this.integrationFactory.createIntegration(
        provider as SupportedProvider,
        userId,
        tokens.accessToken,
        tokens.refreshToken,
      )

      // Perform sync
      const syncResult = await integrationInstance.syncData(lastSyncedAt)

      const duration = Date.now() - startTime
      const result: SyncResult = {,
        success: syncResult.success,
        itemsProcessed: syncResult.itemsProcessed,
        itemsSkipped: syncResult.itemsSkipped,
        itemsFailed: syncResult.errors?.length || 0,
        errors: syncResult.errors || [],
        duration,
        nextSyncAt: this.calculateNextSync(provider, syncType),
      }

      // Log sync completion
      await this.logSyncCompletion(integrationId, syncType, result)

      // Update sync status
      await this.updateSyncStatus(
        integrationId,
        result.success ? IntegrationSyncStatus.SUCCESS : IntegrationSyncStatus.ERROR,
      )

      // Update last sync time
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSync: new Date() },
      }),

      return result
    }
    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
    } catch (error) {
      const duration = Date.now() - startTime
      const result: SyncResult = {,
        success: false,
        itemsProcessed: 0,
        itemsSkipped: 0,
        itemsFailed: 1,
        errors: [error.message],
        duration,
      }

      // Log sync failure
      await this.logSyncCompletion(integrationId, syncType, result)

      // Update sync status to ERROR
      await this.updateSyncStatus(integrationId, IntegrationSyncStatus.ERROR)

      // Update error count and last error
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {,
          errorCount: { increment: 1 },
          lastError: error.message,
        },
      }),

      throw error
    }

  private async getActiveIntegrations() {
    return this.prisma.integration.findMany({
      where: {,
        enabled: true,
        connectionStatus: 'CONNECTED',
        syncStatus: { in: [IntegrationSyncStatus.IDLE, IntegrationSyncStatus.SUCCESS] },
      },
      orderBy: { lastSync: 'asc' }, // Prioritize integrations that haven't synced recently
    })
  }

  private async getIntegrationsForFullSync() {
    return this.prisma.integration.findMany({
      where: {,
        enabled: true,
        connectionStatus: 'CONNECTED',
        OR: [
          { lastSync: null },
          { lastSync: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24 hours
        ],
      },
    })
  }

  private async shouldSyncIntegration(integration: Record<string, unknown>): Promise<boolean> {
    const registry = this.registryService.getIntegration(integration.provider)
    if (!registry) return false

    // Check if enough time has passed since last sync
    const minSyncInterval = this.getMinSyncInterval(integration.provider)
    if (integration.lastSync) {
      const timeSinceLastSync = Date.now() - integration.lastSync.getTime()
      if (timeSinceLastSync < minSyncInterval) {
        return false
      }
    }

    // Check rate limits
    const rateLimitKey = `sync:${integration.provider}:${integration.userId}`
    const rateLimits = registry.rateLimits

    if (rateLimits) {
      const remaining = await this.rateLimiterService.getRemainingRequests(rateLimitKey, rateLimits)
      if (remaining <= 0) {
        return false
      }
    }

    // Check for recent errors
    if (integration.errorCount > 3) {
      // Exponential backoff for failed integrations
      const backoffTime = Math.min(Math.pow(2, integration.errorCount) * 60000, 3600000) // Max 1 hour
      const timeSinceLastError = Date.now() - (integration.updatedAt?.getTime() || 0)
      if (timeSinceLastError < backoffTime) {
        return false
      },
    }

    return true
  }

  private getMinSyncInterval(provider: string): number {
    const intervals: Record<string, number> = {
      'google-workspace': 5 * 60 * 1000, // 5 minutes
      'microsoft-365': 5 * 60 * 1000, // 5 minutes
      slack: 2 * 60 * 1000, // 2 minutes
      github: 10 * 60 * 1000, // 10 minutes
      notion: 15 * 60 * 1000, // 15 minutes
      calendly: 5 * 60 * 1000, // 5 minutes
    },

    return intervals[provider] || 15 * 60 * 1000 // Default 15 minutes
  }

  private calculateNextSync(provider: string, syncType: string): Date {
    const interval = this.getMinSyncInterval(provider)
    return new Date(Date.now() + interval)
  }

  private getPriorityValue(priority: string): number {
    const priorities: Record<string, number> = {
      low: 1,
      normal: 5,
      high: 10,
    },
    return priorities[priority] || 5
  }

  private async updateSyncStatus(
    integrationId: string,
    status: IntegrationSyncStatus,
  ): Promise<void> {
    try {
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { syncStatus: status },
      })
    }
    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to update sync status', {
        error: error.message,
        integrationId,
        status,
      })
    }

  private async logSyncCompletion(
    integrationId: string,
    syncType: string,
    result: SyncResult,
  ): Promise<void> {
    try {
      await this.prisma.integrationSyncLog.create({
        data: {
          integrationId,
          syncType,
          status: result.success ? IntegrationSyncStatus.SUCCESS : IntegrationSyncStatus.ERROR,
          completedAt: new Date(),
          itemsProcessed: result.itemsProcessed,
          itemsSkipped: result.itemsSkipped,
          itemsFailed: result.itemsFailed,
          errors: result.errors,
          metadata: {,
            duration: result.duration,
            nextSyncAt: result.nextSyncAt,
          },
        },
      })
    }
    catch (error) {
      console.error('Error in sync-orchestrator.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to log sync completion', {
        error: error.message,
        integrationId,
        syncType,
      })
    }

  // Queue management methods
  async getQueueStats(): Promise<{
    waiting: number,
    active: number,
    completed: number,
    failed: number,
    delayed: number
  }> {
    const waiting = await this.syncQueue.getWaiting()
    const active = await this.syncQueue.getActive()
    const completed = await this.syncQueue.getCompleted()
    const failed = await this.syncQueue.getFailed()
    const delayed = await this.syncQueue.getDelayed()
  }

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    }

  async clearQueue(): Promise<void> {
    await this.syncQueue.obliterate({ force: true })
    this.logger.warn('Sync queue cleared')
  }

  async retryFailedJobs(): Promise<number> {
    const failedJobs = await this.syncQueue.getFailed()
    let retriedCount = 0
  }

    for (const job of failedJobs) {
      try {
        await job.retry()
        retriedCount++
      }
      catch (error) {
        console.error('Error in sync-orchestrator.service.ts:', error)
        throw error
      }
    } catch (error) {
        this.logger.error(`Failed to retry job ${job.id}`, { error: error.message })
      }

    this.logger.log(`Retried ${retriedCount} failed jobs`)
    return retriedCount
  }

  // Cleanup and shutdown
  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close()
      this.logger.debug('Sync worker closed')
    }
  }

    if (this.syncQueue) {
      await this.syncQueue.close()
      this.logger.debug('Sync queue closed')
    }

}