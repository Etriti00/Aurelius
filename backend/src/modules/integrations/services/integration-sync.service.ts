import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { CacheService } from '../../cache/services/cache.service';
import { NotificationService } from '../../notifications/notifications.service';
import { IntegrationStatus, SyncResult } from '../interfaces';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class IntegrationSyncService {
  private readonly logger = new Logger(IntegrationSyncService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private cacheService: CacheService,
    private notificationService: NotificationService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Schedule periodic sync for all active integrations
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async schedulePeriodincSync(): Promise<void> {
    try {
      this.logger.log('Starting periodic integration sync');

      const integrations = await this.prisma.integration.findMany({
        where: {
          status: IntegrationStatus.ACTIVE,
          config: {
            path: '$.syncEnabled',
            equals: true,
          },
        },
      });

      for (const integration of integrations) {
        await this.queueService.addJob('integration', {
          type: 'sync',
          integrationId: integration.id,
          syncType: 'incremental',
        });
      }

      this.logger.log(`Queued sync for ${integrations.length} integrations`);
    } catch (error: any) {
      this.logger.error(`Periodic sync scheduling failed: ${error.message}`);
    }
  }

  /**
   * Check integration health
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkIntegrationHealth(): Promise<void> {
    try {
      const integrations = await this.prisma.integration.findMany({
        where: {
          status: { in: [IntegrationStatus.ACTIVE, IntegrationStatus.ERROR] },
        },
      });

      for (const integration of integrations) {
        await this.checkHealth(integration);
      }
    } catch (error: any) {
      this.logger.error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Process sync result
   */
  async processSyncResult(
    integrationId: string,
    result: SyncResult,
  ): Promise<void> {
    try {
      // Update sync statistics
      await this.updateSyncStatistics(integrationId, result);

      // Handle errors
      if (result.errors.length > 0) {
        await this.handleSyncErrors(integrationId, result.errors);
      }

      // Emit sync completed event
      this.eventEmitter.emit('integration.sync.completed', {
        integrationId,
        result,
      });

      // Notify user if significant changes
      if (result.itemsSynced > 100 || result.errors.length > 5) {
        const integration = await this.prisma.integration.findUnique({
          where: { id: integrationId },
          include: { user: true },
        });

        if (integration) {
          await this.notificationService.sendNotification(integration.userId, {
            type: 'integration_sync_complete',
            title: 'Integration Sync Complete',
            message: `Synced ${result.itemsSynced} items from ${integration.name}` +
                    (result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''),
            data: { integrationId, result },
            channels: ['in_app'],
          });
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to process sync result: ${error.message}`);
    }
  }

  /**
   * Handle sync conflicts
   */
  async handleSyncConflict(
    integrationId: string,
    localItem: any,
    remoteItem: any,
    conflictType: 'update' | 'delete',
  ): Promise<'local' | 'remote' | 'merge'> {
    // Get integration conflict resolution strategy
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return 'remote'; // Default to remote wins
    }

    const strategy = integration.config?.conflictResolution || 'remote_wins';

    switch (strategy) {
      case 'local_wins':
        return 'local';
      case 'remote_wins':
        return 'remote';
      case 'newest_wins':
        const localDate = new Date(localItem.updatedAt || localItem.createdAt);
        const remoteDate = new Date(remoteItem.updatedAt || remoteItem.createdAt);
        return localDate > remoteDate ? 'local' : 'remote';
      case 'manual':
        // Queue for manual resolution
        await this.queueManualConflictResolution(
          integrationId,
          localItem,
          remoteItem,
          conflictType,
        );
        return 'local'; // Keep local until resolved
      default:
        return 'remote';
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(integrationId: string): Promise<any> {
    const cacheKey = `sync:status:${integrationId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return null;
    }

    const status = {
      integrationId,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      nextSyncAt: this.calculateNextSyncTime(integration),
      syncStats: await this.getSyncStatistics(integrationId),
      errors: integration.metadata?.lastSyncResult?.errors || [],
    };

    // Cache for 1 minute
    await this.cacheService.set(cacheKey, status, 60);

    return status;
  }

  /**
   * Force sync
   */
  async forceSync(
    integrationId: string,
    syncType: 'full' | 'incremental' = 'incremental',
  ): Promise<void> {
    // Check if sync is already running
    const isRunning = await this.isSyncRunning(integrationId);
    if (isRunning) {
      throw new Error('Sync is already in progress');
    }

    // Queue sync job with high priority
    await this.queueService.addJob(
      'integration',
      {
        type: 'sync',
        integrationId,
        syncType,
        forced: true,
      },
      { priority: 1 },
    );

    // Mark as syncing
    await this.cacheService.set(
      `sync:running:${integrationId}`,
      true,
      600, // 10 minutes max
    );
  }

  /**
   * Check if sync is running
   */
  private async isSyncRunning(integrationId: string): Promise<boolean> {
    return !!(await this.cacheService.get(`sync:running:${integrationId}`));
  }

  /**
   * Check integration health
   */
  private async checkHealth(integration: any): Promise<void> {
    try {
      // Check last sync time
      if (integration.lastSyncAt) {
        const hoursSinceSync = 
          (Date.now() - new Date(integration.lastSyncAt).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceSync > 24 && integration.status === IntegrationStatus.ACTIVE) {
          await this.notificationService.sendNotification(integration.userId, {
            type: 'integration_sync_delayed',
            title: 'Integration Sync Delayed',
            message: `${integration.name} hasn't synced in ${Math.floor(hoursSinceSync)} hours`,
            data: { integrationId: integration.id },
            channels: ['in_app'],
          });
        }
      }

      // Check error rate
      const stats = await this.getSyncStatistics(integration.id);
      if (stats.errorRate > 0.2) { // 20% error rate
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: IntegrationStatus.ERROR,
            metadata: {
              ...integration.metadata,
              healthCheck: {
                lastCheck: new Date(),
                issue: 'high_error_rate',
                errorRate: stats.errorRate,
              },
            },
          },
        });
      }
    } catch (error: any) {
      this.logger.error(`Health check failed for integration ${integration.id}: ${error.message}`);
    }
  }

  /**
   * Update sync statistics
   */
  private async updateSyncStatistics(
    integrationId: string,
    result: SyncResult,
  ): Promise<void> {
    const stats = await this.prisma.syncStatistics.upsert({
      where: { integrationId },
      create: {
        integrationId,
        totalSyncs: 1,
        successfulSyncs: result.errors.length === 0 ? 1 : 0,
        failedSyncs: result.errors.length > 0 ? 1 : 0,
        totalItemsSynced: result.itemsSynced,
        totalErrors: result.errors.length,
      },
      update: {
        totalSyncs: { increment: 1 },
        successfulSyncs: result.errors.length === 0 
          ? { increment: 1 } 
          : undefined,
        failedSyncs: result.errors.length > 0 
          ? { increment: 1 } 
          : undefined,
        totalItemsSynced: { increment: result.itemsSynced },
        totalErrors: { increment: result.errors.length },
        lastSyncAt: new Date(),
      },
    });

    // Clear cache
    await this.cacheService.del(`sync:stats:${integrationId}`);
  }

  /**
   * Get sync statistics
   */
  private async getSyncStatistics(integrationId: string): Promise<any> {
    const cacheKey = `sync:stats:${integrationId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await this.prisma.syncStatistics.findUnique({
      where: { integrationId },
    });

    if (!stats) {
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        successRate: 0,
        errorRate: 0,
        totalItemsSynced: 0,
        averageItemsPerSync: 0,
      };
    }

    const computed = {
      ...stats,
      successRate: stats.totalSyncs > 0 
        ? stats.successfulSyncs / stats.totalSyncs 
        : 0,
      errorRate: stats.totalSyncs > 0 
        ? stats.failedSyncs / stats.totalSyncs 
        : 0,
      averageItemsPerSync: stats.totalSyncs > 0 
        ? stats.totalItemsSynced / stats.totalSyncs 
        : 0,
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, computed, 300);

    return computed;
  }

  /**
   * Handle sync errors
   */
  private async handleSyncErrors(
    integrationId: string,
    errors: Array<{ item: string; error: string; retryable: boolean }>,
  ): Promise<void> {
    // Group errors by type
    const errorGroups = errors.reduce((acc, error) => {
      const key = error.retryable ? 'retryable' : 'permanent';
      if (!acc[key]) acc[key] = [];
      acc[key].push(error);
      return acc;
    }, {} as Record<string, typeof errors>);

    // Queue retryable errors
    if (errorGroups.retryable?.length > 0) {
      await this.queueService.addJob(
        'integration',
        {
          type: 'retry_sync_errors',
          integrationId,
          errors: errorGroups.retryable,
        },
        { delay: 300000 }, // 5 minutes
      );
    }

    // Log permanent errors
    if (errorGroups.permanent?.length > 0) {
      this.logger.error(
        `Permanent sync errors for integration ${integrationId}: ` +
        `${errorGroups.permanent.length} items failed`,
      );
    }
  }

  /**
   * Queue manual conflict resolution
   */
  private async queueManualConflictResolution(
    integrationId: string,
    localItem: any,
    remoteItem: any,
    conflictType: string,
  ): Promise<void> {
    await this.prisma.syncConflict.create({
      data: {
        integrationId,
        itemType: localItem.type || 'unknown',
        itemId: localItem.id,
        conflictType,
        localData: localItem,
        remoteData: remoteItem,
        status: 'pending',
      },
    });
  }

  /**
   * Calculate next sync time
   */
  private calculateNextSyncTime(integration: any): Date | null {
    if (!integration.config?.syncInterval) {
      return null;
    }

    const lastSync = integration.lastSyncAt || integration.createdAt;
    const intervalMinutes = integration.config.syncInterval;
    
    return new Date(
      new Date(lastSync).getTime() + intervalMinutes * 60 * 1000,
    );
  }
}