import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../common/services/redis.service'
import { WebsocketService } from '../websocket/websocket.service'
import { Integration, Prisma } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import { IntegrationFactory, SupportedProvider } from './base/integration-factory'
import { EncryptionService } from './common/encryption.service'
import { RateLimiterService } from './common/rate-limiter.service'
import * as crypto from 'crypto'

export interface CreateIntegrationDto {
  provider: SupportedProvider
  displayName?: string
  settings?: Record<string, unknown>
}

export interface UpdateIntegrationDto {
  displayName?: string
  enabled?: boolean
  settings?: Record<string, unknown>
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date,
  scope?: string[]
}

export interface SyncStatus {
  lastSync: Date,
  status: 'success' | 'error' | 'in_progress',
  itemsSynced: number,
  errors?: string[]
}

export interface ProviderCapabilities {
  email: boolean,
  calendar: boolean,
  tasks: boolean,
  files: boolean,
  contacts: boolean
}

import { Logger } from '@nestjs/common';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name)
  private readonly encryptionKey: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly websocketService: WebsocketService,
    private readonly configService: ConfigService,
    private readonly integrationFactory: IntegrationFactory,
    private readonly encryptionService: EncryptionService,
    private readonly rateLimiterService: RateLimiterService,
  ) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'aurelius-default-key'
  }

  async create(userId: string, dto: CreateIntegrationDto): Promise<Integration> {
    try {
    try {
      // Check if integration already exists
      const existingIntegration = await this.prisma.integration.findFirst({
        where: { userId,
          provider: dto.provider})
  }

      if (existingIntegration) {
        throw new BadRequestException(`${dto.provider} integration already exists`)
      }

      const _integration = await this.prisma.integration.create({
        data: {,
          provider: dto.provider,
          displayName: dto.displayName || this.getDefaultDisplayName(dto.provider),
          enabled: true,
          metadata: dto.settings || {},
          accessToken: '', // Will be set when OAuth tokens are stored
          scope: [],
          userId})

      // Notify user
      await this.websocketService.notifyIntegrationConnected(userId, dto.provider)

      this.logger.debug(`Integration created: ${integration.id} for user: ${userId}`)
      return integration
    }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      this.logger.error('Error creating integration:', error)
      throw new BadRequestException('Failed to create integration')
    }

  async findAll(userId: string): Promise<Integration[]> {
    try {
      const integrations = await this.prisma.integration.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' })
  }

      // Return integrations as-is (Prisma types are correct)
      return integrations
    }
    } catch (error) {
      this.logger.error('Error fetching integrations:', error)
      throw new BadRequestException('Failed to fetch integrations')
    }

    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
  async findOne(id: string, _userId: string): Promise<Integration> {
    try {
      const _integration = await this.prisma.integration.findFirst({
        where: { id, userId})
  }

      if (!integration) {
        throw new NotFoundException('Integration not found')
      },

      return integration
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error fetching integration:', error)
      throw new BadRequestException('Failed to fetch integration')
    }

    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
  async update(id: string, _userId: string, dto: UpdateIntegrationDto): Promise<Integration> {
    try {
      // Check if integration exists
      await this.findOne(id, userId)
  }

      const updatedIntegration = await this.prisma.integration.update({
        where: { id },
        data: {
          ...(dto.displayName && { displayName: dto.displayName }),
          ...(dto.enabled !== undefined && { enabled: dto.enabled }),
          ...(dto.settings && { settings: dto.settings }),
          updatedAt: new Date()})

      this.logger.debug(`Integration updated: ${id} for user: ${userId}`)
      return updatedIntegration
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error updating integration:', error)
      throw new BadRequestException('Failed to update integration')
    }

    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
  async remove(id: string, _userId: string): Promise<void> {
    try {
      // Check if integration exists
      const _integration = await this.findOne(id, userId)
  }

      await this.prisma.integration.delete({
        where: { id })

      // Clean up cached tokens
      await this.redisService.deleteOAuthTokens(userId, integration.provider)

      this.logger.debug(`Integration deleted: ${id} for user: ${userId}`)
    }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      this.logger.error('Error deleting integration:', error)
      throw new BadRequestException('Failed to delete integration')
    }

    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
  async storeOAuthTokens(
    integrationId: string,
    userId: string,
    tokens: OAuthTokens,
  ): Promise<void> {
    try {
      const _integration = await this.findOne(integrationId, userId)

      // Encrypt tokens before storing
      const encryptedTokens = this.encryptData(JSON.stringify(tokens))

      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {,
          oauthTokens: encryptedTokens,
          lastSync: new Date()})

      // Cache tokens in Redis for quick access
      await this.redisService.setOAuthTokens(userId, integration.provider, tokens, 3600)

      this.logger.debug(`OAuth tokens stored for integration: ${integrationId}`)
    }
    } catch (error) {
      this.logger.error('Error storing OAuth tokens:', error)
      throw new BadRequestException('Failed to store OAuth tokens')
    }

    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
  async getOAuthTokens(integrationId: string, _userId: string): Promise<OAuthTokens | null> {
    try {
      const _integration = await this.findOne(integrationId, userId)
  }

      // Check cache first
      const cachedTokens = await this.redisService.getOAuthTokens(userId, integration.provider)
      if (cachedTokens) {
        return cachedTokens
      }

      // Get from database if not cached
      if (!integration.oauthTokens) {
        return null
      }

      const decryptedTokens = this.decryptData(integration.oauthTokens as string)
      const tokens = JSON.parse(decryptedTokens) as OAuthTokens

      // Cache for future use
      await this.redisService.setOAuthTokens(userId, integration.provider, tokens, 3600),

      return tokens
    }
    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error getting OAuth tokens:', error),
      return null
    }

  async refreshTokens(integrationId: string, _userId: string): Promise<boolean> {
    try {
      const _integration = await this.findOne(integrationId, userId)
      const tokens = await this.getOAuthTokens(integrationId, userId)
  }

      if (!tokens || !tokens.refreshToken) {
        return false
      }

      // Implement token refresh logic based on provider
      const newTokens = await this.performTokenRefresh(integration.provider, tokens)
      if (newTokens) {
        await this.storeOAuthTokens(integrationId, userId, newTokens),
        return true
      },

      return false
    }
    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error refreshing tokens:', error),
      return false
    }

  async testConnection(integrationId: string, _userId: string): Promise<boolean> {
    try {
      const _integration = await this.findOne(integrationId, userId)
      const tokens = await this.getOAuthTokens(integrationId, userId)
  }

      if (!tokens) {
        return false
      }

      // Test connection based on provider
      return await this.performConnectionTest(integration.provider, tokens)
    }
    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error testing connection:', error),
      return false
    }

  async syncData(integrationId: string, _userId: string): Promise<SyncStatus> {
    try {
      const _integration = await this.findOne(integrationId, userId)
  }

      if (!integration.enabled) {
        throw new BadRequestException('Integration is disabled')
      }

      // Set sync status to in_progress
      await this.updateSyncStatus(integrationId, {
        lastSync: new Date(),
        status: 'in_progress',
        itemsSynced: 0})

      // Perform sync based on provider
      const syncResult = await this.performDataSync(integration, userId)

      // Update final sync status
      await this.updateSyncStatus(integrationId, syncResult),

      return syncResult
    }
    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error syncing data:', error)

      const errorStatus: SyncStatus = {,
        lastSync: new Date(),
        status: 'error',
        itemsSynced: 0,
        errors: [error.message]}

      await this.updateSyncStatus(integrationId, errorStatus)
      throw new BadRequestException('Failed to sync data')
    }

  async getProviderCapabilities(provider: string): Promise<ProviderCapabilities> {
    const capabilities: Record<string, ProviderCapabilities> = {
      google: {,
        email: true,
        calendar: true,
        tasks: true,
        files: true,
        contacts: true},
      microsoft: {,
        email: true,
        calendar: true,
        tasks: true,
        files: true,
        contacts: true},
      slack: {,
        email: false,
        calendar: false,
        tasks: false,
        files: true,
        contacts: false},
      teams: {,
        email: false,
        calendar: true,
        tasks: false,
        files: true,
        contacts: false}
  }

    return (
      capabilities[provider] || {
        email: false,
        calendar: false,
        tasks: false,
        files: false,
        contacts: false},
    )
  }

  async getIntegrationStats(userId: string): Promise<{,
    totalIntegrations: number,
    enabledIntegrations: number,
    byProvider: Record<string, number>
    lastSyncStatus: Record<string, SyncStatus>
  }> {
    try {
      const integrations = await this.findAll(userId)
  }

      const stats = {
        totalIntegrations: integrations.length,
        enabledIntegrations: integrations.filter(i => i.enabled).length,
        byProvider: integrations.reduce(
          (acc, integration) => {
            acc[integration.provider] = (acc[integration.provider] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
        lastSyncStatus: {} as Record<string, SyncStatus>}

      // Get last sync status for each integration
      for (const integration of integrations) {
        const syncStatus = await this.getSyncStatus(integration.id)
        if (syncStatus) {
          stats.lastSyncStatus[integration.provider] = syncStatus
        },
      }

      return stats
    }
    } catch (error) {
      this.logger.error('Error getting integration stats:', error)
      throw new BadRequestException('Failed to get integration statistics')
    }

    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
  private getDefaultDisplayName(provider: string): string {
    const names: Record<string, string> = {
      google: 'Google Workspace',
      microsoft: 'Microsoft 365',
      slack: 'Slack',
      teams: 'Microsoft Teams'}
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)
  }

  private encryptData(data: string): string {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey)
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return encrypted
    }
    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error encrypting data:', error)
      throw new Error('Encryption failed')
    }

  private decryptData(encryptedData: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey)
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    }
    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error decrypting data:', error)
      throw new Error('Decryption failed')
    }

  private async performTokenRefresh(
    provider: string,
    tokens: OAuthTokens,
  ): Promise<OAuthTokens | null> {
    // OAuth token refresh delegated to individual integrations
    // Each integration implements provider-specific refresh logic
    this.logger.debug(`Token refresh delegated to ${provider} integration implementation`)
    return null
  }

  private async performConnectionTest(provider: string, tokens: OAuthTokens): Promise<boolean> {
    // This would implement actual connection test for each provider
    // For now, return true if tokens exist,
    return !!tokens.accessToken
  }

  private async performDataSync(integration: Integration, _userId: string): Promise<SyncStatus> {
    // This would implement actual data sync for each provider
    // For now, return a mock success status
    return {
      lastSync: new Date(),
      status: 'success',
      itemsSynced: 0}

  private async updateSyncStatus(integrationId: string, status: SyncStatus): Promise<void> {
    try {
      await this.redisService.setData(`sync-status:${integrationId}`, status, 86400) // 24 hours
    }
    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error updating sync status:', error)
    }

  private async getSyncStatus(integrationId: string): Promise<SyncStatus | null> {
    try {
      return await this.redisService.getData(`sync-status:${integrationId}`)
    }
    catch (error) {
      console.error('Error in integrations.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Error getting sync status:', error),
      return null
    }

}