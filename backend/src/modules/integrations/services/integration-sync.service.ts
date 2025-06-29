import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Integration, SyncStatistics } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/services/queue.service';
import { CacheService } from '../../cache/services/cache.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { SyncResult, IntegrationStatusEnum, SyncItem } from '../interfaces';
import { IntegrationSyncStatusResponse } from '../dto/integration.dto';

// Define additional interfaces
// SyncStatistics is imported from Prisma - adding computed stats interface
interface ComputedSyncStatistics extends SyncStatistics {
  successRate?: number;
  errorRate?: number;
  averageItemsPerSync?: number;
}

interface HealthCheckData {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastChecked: Date;
  errors?: string[];
}

interface SyncProgressInfo {
  integrationId: string;
  status: 'idle' | 'syncing' | 'error' | 'paused';
  lastSync?: Date;
  nextSync?: Date;
  progress?: number;
  currentOperation?: string;
  errors: string[];
}

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
          integrationId: integration.id,
          syncType: 'incremental',
          metadata: {
            triggeredBy: 'system',
            priority: 'medium',
          },
        });
      }

      this.logger.log(`Queued sync for ${integrations.length} integrations`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Periodic sync scheduling failed: ${errorMessage}`, error);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Health check failed: ${errorMessage}`, error);
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
            metadata: {
              integrationId,
              result: {
                success: result.success,
                itemsProcessed: result.itemsProcessed,
                itemsSynced: result.itemsSynced,
                errors: result.errors,
                syncType: result.syncType,
                startedAt: result.startedAt.toISOString(),
                completedAt: result.completedAt?.toISOString(),
                nextSyncAt: result.nextSyncAt?.toISOString(),
              },
            },
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process sync result: ${errorMessage}`, error);
    }
  }

  /**
   * Handle sync conflicts
   */
  async handleSyncConflict(
    integrationId: string,
    localItem: SyncItem,
    remoteItem: SyncItem,
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
      const settingsObj = integration.settings as Prisma.JsonObject;
      if (settingsObj.conflictResolution && typeof settingsObj.conflictResolution === 'string') {
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
   * Get sync progress information
   */
  private async getSyncProgressInfo(integrationId: string): Promise<SyncProgressInfo | null> {
    // Implementation for getting detailed sync progress
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return null;
    }

    return {
      integrationId,
      status: integration.status === 'ACTIVE' ? 'idle' : 'error',
      lastSync: integration.lastSyncAt ? integration.lastSyncAt : undefined,
      nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24h from now
      progress: 0,
      errors: integration.syncError ? [integration.syncError] : [],
    };
  }

  /**
   * Get detailed sync progress for an integration
   */
  async getSyncProgress(integrationId: string): Promise<SyncProgressInfo | null> {
    return this.getSyncProgressInfo(integrationId);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(integrationId: string): Promise<IntegrationSyncStatusResponse | null> {
    const cacheKey = `sync:status:${integrationId}`;
    const cached = await this.cacheService.get<IntegrationSyncStatusResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return null;
    }

    const syncStatsDb = await this.getSyncStatistics(integrationId);
    const syncStats = {
      totalSyncs: syncStatsDb.totalSyncs,
      successfulSyncs: syncStatsDb.successfulSyncs,
      failedSyncs: syncStatsDb.failedSyncs,
      itemsSynced: syncStatsDb.itemsSynced,
      successRate: syncStatsDb.successRate,
      errorRate: syncStatsDb.errorRate,
      averageItemsPerSync: syncStatsDb.averageItemsPerSync,
    };

    const status: IntegrationSyncStatusResponse = {
      integrationId,
      status: integration.status as 'idle' | 'syncing' | 'error' | 'paused',
      lastSync: integration.lastSyncAt || undefined,
      nextSync: this.calculateNextSyncTime(integration) || undefined,
      syncStats,
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
      integrationId,
      syncType,
      forceFull: true,
      metadata: {
        triggeredBy: 'user',
        priority: 'high',
      },
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
  private async checkHealth(integration: Integration): Promise<void> {
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
      if (stats.errorRate !== undefined && stats.errorRate > 0.2) {
        // 20% error rate
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: {
            status: IntegrationStatusEnum.ERROR,
            settings: this.updateSettingsWithHealthCheck(integration, {
              endpoint: `integration-${integration.provider}`,
              status: 'unhealthy',
              lastChecked: new Date(),
              errors: ['high_error_rate'],
            }),
          },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Health check failed for integration ${integration.id}: ${errorMessage}`,
        error
      );
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
  private async getSyncStatistics(integrationId: string): Promise<ComputedSyncStatistics> {
    const cacheKey = `sync:stats:${integrationId}`;
    const cached = await this.cacheService.get<ComputedSyncStatistics>(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await this.prisma.syncStatistics.findUnique({
      where: { integrationId },
    });

    if (!stats) {
      return {
        id: '',
        integrationId,
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        itemsSynced: 0,
        lastSyncAt: null,
        updatedAt: new Date(),
        successRate: 0,
        errorRate: 0,
        averageItemsPerSync: 0,
        averageDuration: 0,
        errors: [],
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
        integrationId,
        syncType: 'incremental',
        metadata: {
          triggeredBy: 'system',
          priority: 'low',
          retryAttempt: 1,
        },
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
    localItem: SyncItem,
    remoteItem: SyncItem,
    conflictType: string
  ): Promise<void> {
    await this.prisma.syncConflict.create({
      data: {
        integrationId,
        resourceType: this.getResourceType(localItem),
        resourceId: localItem.id,
        conflictType,
        localData: {
          id: localItem.id,
          type: localItem.type,
          data: localItem.data,
          lastModified: localItem.lastModified.toISOString(),
          checksum: localItem.checksum,
          createdAt: localItem.createdAt.toISOString(),
          updatedAt: localItem.updatedAt?.toISOString(),
        },
        remoteData: {
          id: remoteItem.id,
          type: remoteItem.type,
          data: remoteItem.data,
          lastModified: remoteItem.lastModified.toISOString(),
          checksum: remoteItem.checksum,
          createdAt: remoteItem.createdAt.toISOString(),
          updatedAt: remoteItem.updatedAt?.toISOString(),
        },
      },
    });
  }

  /**
   * Calculate next sync time
   */
  private calculateNextSyncTime(integration: Integration): Date | null {
    if (
      !integration.settings ||
      typeof integration.settings !== 'object' ||
      Array.isArray(integration.settings)
    ) {
      return null;
    }

    const settingsObj = integration.settings as Prisma.JsonObject;
    if (!settingsObj.syncInterval) {
      return null;
    }

    let lastSync = integration.createdAt;
    if (integration.lastSyncAt) {
      lastSync = integration.lastSyncAt;
    }
    const intervalMinutes =
      typeof settingsObj.syncInterval === 'number' ? settingsObj.syncInterval : 30; // Default to 30 minutes

    return new Date(new Date(lastSync).getTime() + intervalMinutes * 60 * 1000);
  }

  /**
   * Get integration errors from settings
   */
  private getIntegrationErrors(integration: Integration): string[] {
    if (
      !integration.settings ||
      typeof integration.settings !== 'object' ||
      Array.isArray(integration.settings)
    ) {
      return [];
    }

    const settingsObj = integration.settings as Prisma.JsonObject;
    if (
      settingsObj.lastSyncResult &&
      typeof settingsObj.lastSyncResult === 'object' &&
      !Array.isArray(settingsObj.lastSyncResult)
    ) {
      const lastSyncResult = settingsObj.lastSyncResult as Prisma.JsonObject;
      if (Array.isArray(lastSyncResult.errors)) {
        return lastSyncResult.errors.filter((error): error is string => typeof error === 'string');
      }
    }

    return [];
  }

  /**
   * Get settings object safely
   */
  private getSettingsObject(integration: Integration): Prisma.JsonObject {
    if (
      !integration.settings ||
      typeof integration.settings !== 'object' ||
      Array.isArray(integration.settings)
    ) {
      return {};
    }
    return integration.settings as Prisma.JsonObject;
  }

  /**
   * Update settings with health check data
   */
  private updateSettingsWithHealthCheck(
    integration: Integration,
    healthCheckData: HealthCheckData
  ): Prisma.JsonObject {
    const currentSettings = this.getSettingsObject(integration);
    const newSettings: Record<string, Prisma.JsonValue> = {};

    // Copy existing settings
    for (const key in currentSettings) {
      if (currentSettings.hasOwnProperty(key)) {
        const value = currentSettings[key];
        if (value !== undefined) {
          newSettings[key] = value;
        }
      }
    }

    // Add health check data as serializable object
    newSettings.healthCheck = {
      endpoint: healthCheckData.endpoint,
      status: healthCheckData.status,
      responseTime: healthCheckData.responseTime,
      lastChecked: healthCheckData.lastChecked.toISOString(),
      errors: healthCheckData.errors || [],
    };

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
  private buildUpdateData(result: SyncResult): Prisma.JsonObject {
    const updateData: Record<string, Prisma.JsonValue> = {
      totalSyncs: { increment: 1 },
      itemsSynced: { increment: result.itemsSynced },
      lastSyncAt: new Date().toISOString(),
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
  private computeStatistics(stats: SyncStatistics): ComputedSyncStatistics {
    const computed: ComputedSyncStatistics = {
      ...stats, // Copy all existing properties
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
  private getResourceType(item: SyncItem): string {
    if (item.type) {
      return item.type;
    }
    return 'unknown';
  }
}
