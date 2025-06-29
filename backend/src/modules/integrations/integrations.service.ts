import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../security/services/encryption.service';
import { AppIntegrationException } from '../../common/exceptions';
import {
  UserIntegrationResponse,
  IntegrationStatusResponse,
  ConnectIntegrationResponse,
  DisconnectIntegrationResponse,
  IntegrationTokens,
} from './dto/integration.dto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService
  ) {}

  async getUserIntegrations(userId: string): Promise<UserIntegrationResponse[]> {
    const integrations = await this.prisma.integration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        syncError: true,
        settings: true,
        createdAt: true,
      },
    });

    return integrations.map(integration => ({
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      syncError: integration.syncError,
      settings: integration.settings as Record<string, string | number | boolean | object>,
      createdAt: integration.createdAt,
    }));
  }

  async getIntegrationStatus(
    userId: string,
    provider: string
  ): Promise<IntegrationStatusResponse | null> {
    const integration = await this.prisma.integration.findFirst({
      where: { userId, provider },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        syncError: true,
      },
    });

    if (!integration) {
      return null;
    }

    return {
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      syncError: integration.syncError,
    };
  }

  async connectIntegration(
    userId: string,
    provider: string,
    credentials: {
      accessToken: string;
      refreshToken?: string;
      tokenExpiry?: Date;
      tokenType?: string;
      providerAccountId?: string;
    }
  ): Promise<ConnectIntegrationResponse> {
    try {
      this.logger.debug(`Connecting ${provider} integration for user ${userId}`);

      // Encrypt the tokens before storing
      const encryptedAccessToken = await this.encryptionService.encrypt(credentials.accessToken);
      const encryptedRefreshToken = credentials.refreshToken
        ? await this.encryptionService.encrypt(credentials.refreshToken)
        : null;

      // Check if integration already exists
      const existingIntegration = await this.prisma.integration.findFirst({
        where: { userId, provider },
      });

      let integration;
      if (existingIntegration) {
        // Update existing integration
        integration = await this.prisma.integration.update({
          where: { id: existingIntegration.id },
          data: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: credentials.tokenExpiry,
            tokenType: credentials.tokenType || 'Bearer',
            providerAccountId: credentials.providerAccountId,
            status: 'active',
            lastSyncAt: new Date(),
            syncError: null,
            errorCount: 0,
          },
        });
        this.logger.debug(`Updated existing ${provider} integration for user ${userId}`);
      } else {
        // Create new integration
        integration = await this.prisma.integration.create({
          data: {
            userId,
            provider,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: credentials.tokenExpiry,
            tokenType: credentials.tokenType || 'Bearer',
            providerAccountId: credentials.providerAccountId,
            status: 'active',
            lastSyncAt: new Date(),
          },
        });
        this.logger.debug(`Created new ${provider} integration for user ${userId}`);
      }

      return {
        id: integration.id,
        provider: integration.provider,
        status: integration.status,
        message: `${provider} integration connected successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to connect ${provider} integration for user ${userId}`, error);
      throw new AppIntegrationException(
        provider,
        `Failed to connect integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async disconnectIntegration(
    userId: string,
    provider: string
  ): Promise<DisconnectIntegrationResponse> {
    const integration = await this.prisma.integration.findFirst({
      where: { userId, provider },
    });

    if (integration) {
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'PAUSED' },
      });
    }

    return { message: `${provider} integration disconnected` };
  }

  async getIntegrationTokens(userId: string, provider: string): Promise<IntegrationTokens | null> {
    try {
      const integration = await this.prisma.integration.findFirst({
        where: {
          userId,
          provider,
          status: 'active',
        },
        select: {
          accessToken: true,
          refreshToken: true,
          tokenExpiry: true,
          tokenType: true,
        },
      });

      if (!integration) {
        return null;
      }

      // Decrypt the tokens
      const accessToken = await this.encryptionService.decrypt(integration.accessToken);
      const refreshToken = integration.refreshToken
        ? await this.encryptionService.decrypt(integration.refreshToken)
        : undefined;

      return {
        accessToken,
        refreshToken,
        tokenExpiry: integration.tokenExpiry || undefined,
        tokenType: integration.tokenType || undefined,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retrieve tokens for ${provider} integration (user ${userId})`,
        error
      );
      throw new AppIntegrationException(
        provider,
        `Failed to retrieve integration tokens: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async refreshIntegrationTokens(
    userId: string,
    provider: string,
    newTokens: {
      accessToken: string;
      refreshToken?: string;
      tokenExpiry?: Date;
    }
  ): Promise<void> {
    try {
      this.logger.debug(`Refreshing tokens for ${provider} integration (user ${userId})`);

      const integration = await this.prisma.integration.findFirst({
        where: { userId, provider },
      });

      if (!integration) {
        throw new AppIntegrationException(provider, 'Integration not found');
      }

      // Encrypt the new tokens
      const encryptedAccessToken = await this.encryptionService.encrypt(newTokens.accessToken);
      const encryptedRefreshToken = newTokens.refreshToken
        ? await this.encryptionService.encrypt(newTokens.refreshToken)
        : integration.refreshToken; // Keep existing if not provided

      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry: newTokens.tokenExpiry,
          lastSyncAt: new Date(),
          syncError: null,
          errorCount: 0,
        },
      });

      this.logger.debug(
        `Successfully refreshed tokens for ${provider} integration (user ${userId})`
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh tokens for ${provider} integration (user ${userId})`,
        error
      );
      throw new AppIntegrationException(
        provider,
        `Failed to refresh tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
