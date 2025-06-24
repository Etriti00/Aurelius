import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/services/queue.service';
import { CacheService } from '../../cache/services/cache.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { SyncResult, IntegrationStatusEnum } from '../interfaces';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class IntegrationSyncService {
  private readonly logger = new Logger(IntegrationSyncService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private cacheService: CacheService,
    private notificationsService: NotificationsService,
    private eventEmitter: EventEmitter2
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
          status: IntegrationStatusEnum.ACTIVE,
          syncEnabled: true,
        },
      });

      for (const integration of integrations) {
        await this.queueService.addIntegrationSyncJob({
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
          status: { in: [IntegrationStatusEnum.ACTIVE, IntegrationStatusEnum.ERROR] },
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
  async processSyncResult(integrationId: string, result: SyncResult): Promise<void> {
    try {
      // Update sync statistics
      await this.updateSyncStatistics(integrationId, result);

      // Handle errors
      if (result.errors.length > 0) {
        const errorObjects = result.errors.map(error => ({
          item: 'sync_item',
          error: error,
          retryable: true,
        }));
        await this.handleSyncErrors(integrationId, errorObjects);
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
          await this.notificationsService.sendToUser(integration.userId, {
            type: 'integration_sync_complete',
            title: 'Integration Sync Complete',
            message: this.buildSyncMessage(integration.provider, result),
            metadata: { integrationId, result },
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
    conflictType: 'update' | 'delete'
  ): Promise<'local' | 'remote' | 'merge'> {
    // Get integration conflict resolution strategy
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return 'remote'; // Default to remote wins
    }

    let strategy = 'remote_wins';
    if (
      integration.settings &&
      typeof integration.settings === 'object' &&
      !Array.isArray(integration.settings)
    ) {
      const settingsObj = integration.settings as Record<string, any>;
      if (settingsObj.conflictResolution) {
        strategy = settingsObj.conflictResolution;
      }
    }

    switch (strategy) {
      case 'local_wins':
        return 'local';
      case 'remote_wins':
        return 'remote';
      case 'newest_wins':
        const localDate = new Date(localItem.updatedAt ? localItem.updatedAt : localItem.createdAt);
        const remoteDate = new Date(
          remoteItem.updatedAt ? remoteItem.updatedAt : remoteItem.createdAt
        );
        if (localDate > remoteDate) {
          return 'local';
        } else {
          return 'remote';
        }
      case 'manual':
        // Queue for manual resolution
        await this.queueManualConflictResolution(
          integrationId,
          localItem,
          remoteItem,
          conflictType
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
      errors: this.getIntegrationErrors(integration),
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
    syncType: 'full' | 'incremental' = 'incremental'
  ): Promise<void> {
    // Check if sync is already running
    const isRunning = await this.isSyncRunning(integrationId);
    if (isRunning) {
      throw new Error('Sync is already in progress');
    }

    // Queue sync job with high priority
    await this.queueService.addIntegrationSyncJob({
      type: 'sync',
      integrationId,
      syncType,
      forced: true,
    });

    // Mark as syncing
    await this.cacheService.set(
      `sync:running:${integrationId}`,
      true,
      600 // 10 minutes max
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

        if (hoursSinceSync > 24 && integration.status === IntegrationStatusEnum.ACTIVE) {
          await this.notificationsService.sendToUser(integration.userId, {
            type: 'integration_sync_delayed',
            title: 'Integration Sync Delayed',
            message: `${integration.provider} hasn't synced in ${Math.floor(hoursSinceSync)} hours`,
            metadata: { integrationId: integration.id },
          });
        }
      }

      // Check error rate
      const stats = await this.getSyncStatistics(integration.id);
      if (stats.errorRate > 0.2) {
        // 20% error rate
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: IntegrationStatusEnum.ERROR,
            settings: this.updateSettingsWithHealthCheck(integration, {
              lastCheck: new Date(),
              issue: 'high_error_rate',
              errorRate: stats.errorRate,
            }),
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
  private async updateSyncStatistics(integrationId: string, result: SyncResult): Promise<void> {
    await this.prisma.syncStatistics.upsert({
      where: { integrationId },
      create: {
        integrationId,
        totalSyncs: 1,
        successfulSyncs: this.getSuccessfulSyncs(result),
        failedSyncs: this.getFailedSyncs(result),
        itemsSynced: result.itemsSynced,
      },
      update: this.buildUpdateData(result),
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

    const computed = this.computeStatistics(stats);

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, computed, 300);

    return computed;
  }

  /**
   * Handle sync errors
   */
  private async handleSyncErrors(
    integrationId: string,
    errors: Array<{ item: string; error: string; retryable: boolean }>
  ): Promise<void> {
    // Group errors by type
    const errorGroups = errors.reduce(
      (acc, error) => {
        const key = this.getErrorCategory(error);
        if (!acc[key]) acc[key] = [];
        acc[key].push(error);
        return acc;
      },
      {} as Record<string, typeof errors>
    );

    // Queue retryable errors
    if (errorGroups.retryable && errorGroups.retryable.length > 0) {
      await this.queueService.addIntegrationSyncJob({
        type: 'retry_sync_errors',
        integrationId,
        errors: errorGroups.retryable,
      });
    }

    // Log permanent errors
    if (errorGroups.permanent && errorGroups.permanent.length > 0) {
      this.logger.error(
        `Permanent sync errors for integration ${integrationId}: ` +
          `${errorGroups.permanent.length} items failed`
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
    conflictType: string
  ): Promise<void> {
    await this.prisma.syncConflict.create({
      data: {
        integrationId,
        resourceType: this.getResourceType(localItem),
        resourceId: localItem.id,
        conflictType,
        localData: localItem,
        remoteData: remoteItem,
      },
    });
  }

  /**
   * Calculate next sync time
   */
  private calculateNextSyncTime(integration: any): Date | null {
    if (
      !integration.settings ||
      typeof integration.settings !== 'object' ||
      Array.isArray(integration.settings)
    ) {
      return null;
    }

    const settingsObj = integration.settings as Record<string, any>;
    if (!settingsObj.syncInterval) {
      return null;
    }

    let lastSync = integration.createdAt;
    if (integration.lastSyncAt) {
      lastSync = integration.lastSyncAt;
    }
    const intervalMinutes = settingsObj.syncInterval;

    return new Date(new Date(lastSync).getTime() + intervalMinutes * 60 * 1000);
  }

  /**
   * Get integration errors from settings
   */
  private getIntegrationErrors(integration: any): string[] {
    if (
      !integration.settings ||
      typeof integration.settings !== 'object' ||
      Array.isArray(integration.settings)
    ) {
      return [];
    }

    const settingsObj = integration.settings as Record<string, any>;
    if (
      settingsObj.lastSyncResult &&
      typeof settingsObj.lastSyncResult === 'object' &&
      !Array.isArray(settingsObj.lastSyncResult)
    ) {
      const lastSyncResult = settingsObj.lastSyncResult as Record<string, any>;
      if (Array.isArray(lastSyncResult.errors)) {
        return lastSyncResult.errors;
      }
    }

    return [];
  }

  /**
   * Get settings object safely
   */
  private getSettingsObject(integration: any): Record<string, any> {
    if (
      !integration.settings ||
      typeof integration.settings !== 'object' ||
      Array.isArray(integration.settings)
    ) {
      return {};
    }
    return integration.settings as Record<string, any>;
  }

  /**
   * Update settings with health check data
   */
  private updateSettingsWithHealthCheck(
    integration: any,
    healthCheckData: any
  ): Record<string, any> {
    const currentSettings = this.getSettingsObject(integration);
    const newSettings: Record<string, any> = {};

    // Copy existing settings
    for (const key in currentSettings) {
      if (currentSettings.hasOwnProperty(key)) {
        newSettings[key] = currentSettings[key];
      }
    }

    // Add health check data
    newSettings.healthCheck = healthCheckData;

    return newSettings;
  }

  /**
   * Get successful syncs count
   */
  private getSuccessfulSyncs(result: SyncResult): number {
    if (result.errors.length === 0) {
      return 1;
    }
    return 0;
  }

  /**
   * Get failed syncs count
   */
  private getFailedSyncs(result: SyncResult): number {
    if (result.errors.length > 0) {
      return 1;
    }
    return 0;
  }

  /**
   * Build sync message
   */
  private buildSyncMessage(provider: string, result: SyncResult): string {
    let message = `Synced ${result.itemsSynced} items from ${provider}`;
    if (result.errors.length > 0) {
      message = message + ` with ${result.errors.length} errors`;
    }
    return message;
  }

  /**
   * Build update data for sync statistics
   */
  private buildUpdateData(result: SyncResult): Record<string, any> {
    const updateData: Record<string, any> = {
      totalSyncs: { increment: 1 },
      itemsSynced: { increment: result.itemsSynced },
      lastSyncAt: new Date(),
    };

    if (result.errors.length === 0) {
      updateData.successfulSyncs = { increment: 1 };
    }

    if (result.errors.length > 0) {
      updateData.failedSyncs = { increment: 1 };
    }

    return updateData;
  }

  /**
   * Compute statistics with proper calculations
   */
  private computeStatistics(stats: any): any {
    const computed: any = {
      id: stats.id,
      integrationId: stats.integrationId,
      totalSyncs: stats.totalSyncs,
      successfulSyncs: stats.successfulSyncs,
      failedSyncs: stats.failedSyncs,
      lastSyncAt: stats.lastSyncAt,
      averageDuration: stats.averageDuration,
      itemsSynced: stats.itemsSynced,
      errors: stats.errors,
      updatedAt: stats.updatedAt,
    };

    if (stats.totalSyncs > 0) {
      computed.successRate = stats.successfulSyncs / stats.totalSyncs;
      computed.errorRate = stats.failedSyncs / stats.totalSyncs;
      computed.averageItemsPerSync = stats.itemsSynced / stats.totalSyncs;
    } else {
      computed.successRate = 0;
      computed.errorRate = 0;
      computed.averageItemsPerSync = 0;
    }

    return computed;
  }

  /**
   * Get error category
   */
  private getErrorCategory(error: { retryable: boolean }): string {
    if (error.retryable) {
      return 'retryable';
    } else {
      return 'permanent';
    }
  }

  /**
   * Get resource type from item
   */
  private getResourceType(item: any): string {
    if (item.type) {
      return item.type;
    }
    return 'unknown';
  }
}
