import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import { QueueService } from '../../queue/queue.service';
import { EncryptionService } from '../../security/services/encryption.service';
import {
  Integration,
  IntegrationConfig,
  IntegrationStatus,
  IntegrationType,
  SyncResult,
  OAuthTokens,
  IntegrationCapability,
} from '../interfaces';
import { BusinessException } from '../../../common/exceptions';

export abstract class BaseIntegrationService {
  protected abstract readonly logger: Logger;
  protected abstract readonly integrationType: IntegrationType;
  protected abstract readonly capabilities: IntegrationCapability[];

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly cacheService: CacheService,
    protected readonly queueService: QueueService,
    protected readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get integration name
   */
  abstract getName(): string;

  /**
   * Get integration description
   */
  abstract getDescription(): string;

  /**
   * Initialize integration
   */
  abstract initialize(config: IntegrationConfig): Promise<void>;

  /**
   * Test connection
   */
  abstract testConnection(integration: Integration): Promise<boolean>;

  /**
   * Sync data from integration
   */
  abstract sync(integration: Integration, syncType: 'full' | 'incremental'): Promise<SyncResult>;

  /**
   * Handle webhook
   */
  async handleWebhook(integration: Integration, data: any): Promise<void> {
    this.logger.warn(`Webhook handling not implemented for ${this.getName()}`);
  }

  /**
   * Create integration
   */
  async createIntegration(
    userId: string,
    name: string,
    config: IntegrationConfig,
  ): Promise<Integration> {
    try {
      // Validate configuration
      await this.validateConfig(config);

      // Initialize integration
      await this.initialize(config);

      // Encrypt tokens if present
      if (config.oauth) {
        config.oauth = await this.encryptTokens(config.oauth);
      }

      // Create integration record
      const integration = await this.prisma.integration.create({
        data: {
          userId,
          name,
          type: this.integrationType,
          config: config as any,
          status: IntegrationStatus.ACTIVE,
          capabilities: this.capabilities,
          metadata: {
            createdAt: new Date(),
            syncedAt: null,
          },
        },
      });

      // Queue initial sync
      await this.queueSync(integration.id, 'full');

      return this.mapToIntegration(integration);
    } catch (error: any) {
      this.logger.error(`Failed to create integration: ${error.message}`);
      throw new BusinessException(
        'Failed to create integration',
        'INTEGRATION_CREATE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Update integration
   */
  async updateIntegration(
    integrationId: string,
    updates: Partial<IntegrationConfig>,
  ): Promise<Integration> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new BusinessException('Integration not found', 'INTEGRATION_NOT_FOUND');
      }

      // Merge configurations
      const newConfig = { ...integration.config, ...updates };

      // Validate new configuration
      await this.validateConfig(newConfig);

      // Encrypt new tokens if present
      if (updates.oauth) {
        newConfig.oauth = await this.encryptTokens(updates.oauth);
      }

      // Update integration
      const updated = await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          config: newConfig as any,
          updatedAt: new Date(),
        },
      });

      // Clear cache
      await this.clearIntegrationCache(integrationId);

      return this.mapToIntegration(updated);
    } catch (error: any) {
      this.logger.error(`Failed to update integration: ${error.message}`);
      throw new BusinessException(
        'Failed to update integration',
        'INTEGRATION_UPDATE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      // Delete all related data
      await this.deleteIntegrationData(integrationId);

      // Delete integration
      await this.prisma.integration.delete({
        where: { id: integrationId },
      });

      // Clear cache
      await this.clearIntegrationCache(integrationId);

      this.logger.log(`Deleted integration ${integrationId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete integration: ${error.message}`);
      throw new BusinessException(
        'Failed to delete integration',
        'INTEGRATION_DELETE_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Get integration
   */
  async getIntegration(integrationId: string): Promise<Integration | null> {
    // Check cache first
    const cached = await this.cacheService.get<Integration>(
      `integration:${integrationId}`,
    );
    if (cached) {
      return cached;
    }

    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return null;
    }

    const mapped = this.mapToIntegration(integration);

    // Cache for 5 minutes
    await this.cacheService.set(`integration:${integrationId}`, mapped, 300);

    return mapped;
  }

  /**
   * Queue sync job
   */
  async queueSync(
    integrationId: string,
    syncType: 'full' | 'incremental',
  ): Promise<void> {
    await this.queueService.addJob('integration', {
      type: 'sync',
      integrationId,
      syncType,
      integrationService: this.getName(),
    });
  }

  /**
   * Perform sync
   */
  async performSync(
    integrationId: string,
    syncType: 'full' | 'incremental',
  ): Promise<SyncResult> {
    try {
      const integration = await this.getIntegration(integrationId);
      if (!integration) {
        throw new BusinessException('Integration not found', 'INTEGRATION_NOT_FOUND');
      }

      // Update status
      await this.updateStatus(integrationId, IntegrationStatus.SYNCING);

      // Decrypt tokens if needed
      if (integration.config.oauth) {
        integration.config.oauth = await this.decryptTokens(integration.config.oauth);
      }

      // Perform sync
      const result = await this.sync(integration, syncType);

      // Update sync metadata
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: IntegrationStatus.ACTIVE,
          lastSyncAt: new Date(),
          metadata: {
            ...integration.metadata,
            lastSyncResult: result,
          },
        },
      });

      this.logger.log(
        `Sync completed for integration ${integrationId}: ` +
        `${result.itemsSynced} items synced, ${result.errors.length} errors`,
      );

      return result;
    } catch (error: any) {
      this.logger.error(`Sync failed for integration ${integrationId}: ${error.message}`);
      
      // Update status
      await this.updateStatus(integrationId, IntegrationStatus.ERROR, error.message);

      throw new BusinessException(
        'Integration sync failed',
        'INTEGRATION_SYNC_FAILED',
        undefined,
        error,
      );
    }
  }

  /**
   * Validate configuration
   */
  protected async validateConfig(config: IntegrationConfig): Promise<void> {
    // Override in subclasses for specific validation
    if (!config) {
      throw new BusinessException('Configuration is required', 'INVALID_CONFIG');
    }
  }

  /**
   * Encrypt OAuth tokens
   */
  protected async encryptTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
    return {
      ...tokens,
      accessToken: await this.encryptionService.encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken
        ? await this.encryptionService.encrypt(tokens.refreshToken)
        : undefined,
    };
  }

  /**
   * Decrypt OAuth tokens
   */
  protected async decryptTokens(tokens: OAuthTokens): Promise<OAuthTokens> {
    return {
      ...tokens,
      accessToken: await this.encryptionService.decrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken
        ? await this.encryptionService.decrypt(tokens.refreshToken)
        : undefined,
    };
  }

  /**
   * Update integration status
   */
  protected async updateStatus(
    integrationId: string,
    status: IntegrationStatus,
    error?: string,
  ): Promise<void> {
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        status,
        ...(error && {
          metadata: {
            lastError: error,
            lastErrorAt: new Date(),
          },
        }),
      },
    });

    await this.clearIntegrationCache(integrationId);
  }

  /**
   * Delete integration data
   */
  protected async deleteIntegrationData(integrationId: string): Promise<void> {
    // Override in subclasses to delete specific data
    this.logger.log(`Deleting data for integration ${integrationId}`);
  }

  /**
   * Clear integration cache
   */
  protected async clearIntegrationCache(integrationId: string): Promise<void> {
    await this.cacheService.del(`integration:${integrationId}`);
  }

  /**
   * Map database model to interface
   */
  protected mapToIntegration(dbIntegration: any): Integration {
    return {
      id: dbIntegration.id,
      userId: dbIntegration.userId,
      name: dbIntegration.name,
      type: dbIntegration.type,
      config: dbIntegration.config,
      status: dbIntegration.status,
      capabilities: dbIntegration.capabilities,
      lastSyncAt: dbIntegration.lastSyncAt,
      metadata: dbIntegration.metadata,
      createdAt: dbIntegration.createdAt,
      updatedAt: dbIntegration.updatedAt,
    };
  }
}