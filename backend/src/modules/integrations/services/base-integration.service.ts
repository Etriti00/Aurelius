import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import { QueueService } from '../../queue/services/queue.service';
import { EncryptionService } from '../../security/services/encryption.service';
import {
  Integration,
  IntegrationConfig,
  IntegrationType,
  IntegrationStatusEnum,
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
    protected readonly encryptionService: EncryptionService
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
    // Parameters required for interface but not yet implemented
    void integration; // Mark as intentionally unused
    void data; // Mark as intentionally unused
    this.logger.warn(`Webhook handling not implemented for ${this.getName()}`);
  }

  /**
   * Create integration
   */
  async createIntegration(
    userId: string,
    name: string,
    config: IntegrationConfig
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
          provider: this.getName(),
          accountName: name,
          accessToken: config.oauth?.accessToken || '',
          refreshToken: config.oauth?.refreshToken,
          tokenExpiry: config.oauth?.expiresAt,
          tokenType: config.oauth?.tokenType || 'Bearer',
          status: 'active',
          scopes: config.scopes,
          permissions: {},
          settings: {
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUri: config.redirectUri,
            scopes: config.scopes,
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
        error
      );
    }
  }

  /**
   * Update integration
   */
  async updateIntegration(
    integrationId: string,
    updates: Partial<IntegrationConfig>
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
          settings: {
            clientId: newConfig.clientId,
            clientSecret: newConfig.clientSecret,
            redirectUri: newConfig.redirectUri,
            scopes: newConfig.scopes,
          },
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
        error
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
        error
      );
    }
  }

  /**
   * Get integration
   */
  async getIntegration(integrationId: string): Promise<Integration | null> {
    // Check cache first
    const cached = await this.cacheService.get<Integration>(`integration:${integrationId}`);
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
  async queueSync(integrationId: string, syncType: 'full' | 'incremental'): Promise<void> {
    await this.queueService.addIntegrationSyncJob({
      integrationId,
      syncType,
      integrationService: this.getName(),
    });
  }

  /**
   * Perform sync
   */
  async performSync(integrationId: string, syncType: 'full' | 'incremental'): Promise<SyncResult> {
    try {
      // Get raw integration from database
      const dbIntegration = await this.prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!dbIntegration) {
        throw new BusinessException('Integration not found', 'INTEGRATION_NOT_FOUND');
      }

      // Update status
      await this.updateStatus(integrationId, IntegrationStatusEnum.ACTIVE);

      // Decrypt tokens if needed
      const decryptedTokens = await this.decryptTokens({
        accessToken: dbIntegration.accessToken,
        refreshToken: dbIntegration.refreshToken || undefined,
      });

      // Map to interface and perform sync with decrypted tokens
      const integration = this.mapToIntegration(dbIntegration);
      // Use decrypted tokens for authentication
      integration.config.oauth = decryptedTokens;
      const result = await this.sync(integration, syncType);

      // Update sync metadata
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'active',
          lastSyncAt: new Date(),
          syncError: null,
          errorCount: 0,
        },
      });

      this.logger.log(
        `Sync completed for integration ${integrationId}: ` +
          `${result.itemsProcessed} items synced, ${result.errors.length} errors`
      );

      return result;
    } catch (error: any) {
      this.logger.error(`Sync failed for integration ${integrationId}: ${error.message}`);

      // Update status
      await this.updateStatus(integrationId, IntegrationStatusEnum.ERROR, error.message);

      throw new BusinessException(
        'Integration sync failed',
        'INTEGRATION_SYNC_FAILED',
        undefined,
        error
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
    status: IntegrationStatusEnum,
    error?: string
  ): Promise<void> {
    await this.prisma.integration.update({
      where: { id: integrationId },
      data: {
        status: status.toLowerCase(),
        ...(error && {
          syncError: error,
          errorCount: 1,
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
    const settings = dbIntegration.settings as Record<string, any>;

    let clientId = '';
    let clientSecret = '';
    let redirectUri = '';
    let scopes: string[] = [];

    if (settings) {
      if (settings.clientId) {
        clientId = settings.clientId;
      }
      if (settings.clientSecret) {
        clientSecret = settings.clientSecret;
      }
      if (settings.redirectUri) {
        redirectUri = settings.redirectUri;
      }
      if (settings.scopes && Array.isArray(settings.scopes)) {
        scopes = settings.scopes;
      }
    }

    let status: IntegrationStatusEnum;
    if (dbIntegration.status === 'active') {
      status = IntegrationStatusEnum.ACTIVE;
    } else if (dbIntegration.status === 'error') {
      status = IntegrationStatusEnum.ERROR;
    } else if (dbIntegration.status === 'paused') {
      status = IntegrationStatusEnum.PAUSED;
    } else {
      status = IntegrationStatusEnum.DISCONNECTED;
    }

    let updatedAt = dbIntegration.createdAt;
    if (dbIntegration.updatedAt) {
      updatedAt = dbIntegration.updatedAt;
    }

    return {
      id: dbIntegration.id,
      userId: dbIntegration.userId,
      provider: dbIntegration.provider,
      type: this.integrationType,
      config: {
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: redirectUri,
        scopes: scopes,
      },
      capabilities: this.capabilities,
      status: status,
      lastSyncAt: dbIntegration.lastSyncAt,
      createdAt: dbIntegration.createdAt,
      updatedAt: updatedAt,
    };
  }
}
