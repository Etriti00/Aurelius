import axios, { AxiosInstance } from 'axios'
import rateLimit from 'axios-rate-limit'
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig
} from '../base/integration.interface'
import {
  ApiResponse,
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class ZapierIntegration extends BaseIntegration {
  readonly provider = 'zapier'
  readonly name = 'Zapier'
  readonly version = '1.0.0'

  private zapierClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Create rate-limited axios client
    this.zapierClient = rateLimit(
      axios.create({
        baseURL: 'https://zapier.com/api/v1',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }),
      {
        maxRequests: 1000, // Zapier rate limit
        perMilliseconds: 60000, // 1 minute
      },
    )
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting user info
      await this.zapierClient.get('/me')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Zapier tokens have long expiry
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Zapier API keys typically don't need refresh
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Zapier API keys can be deactivated via dashboard,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.zapierClient.get('/me')
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.response?.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.response?.status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 1000,
            remaining: 0
            resetTime: new Date(Date.now() + 60000), // 1 minute
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: err.message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Zaps',
        description: 'Create and manage automation workflows'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Triggers',
        description: 'Set up workflow triggers'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Actions',
        description: 'Configure workflow actions'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'History',
        description: 'Access workflow execution history'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Apps',
        description: 'Access connected apps and services'
        enabled: true,
        requiredScopes: ['read']
      },
    ]
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const capabilities = this.getCapabilities()
    const allRequiredScopes = capabilities.flatMap(cap => cap.requiredScopes)
  }

    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []
  }

      this.logInfo('syncData', 'Starting Zapier sync', { lastSyncTime })

      // Sync Zaps
      try {
        const zapsResult = await this.syncZaps()
        totalProcessed += zapsResult.processed,
        totalSkipped += zapsResult.skipped
      }
    } catch (error) {
        errors.push(`Zaps sync failed: ${(error as Error).message}`)
        this.logError('syncZaps', error as Error)
      }

      catch (error) {
        console.error('Error in zapier.integration.ts:', error)
        throw error
      }
      // Sync History
      try {
        const historyResult = await this.syncHistory(lastSyncTime)
        totalProcessed += historyResult.processed,
        totalSkipped += historyResult.skipped
      } catch (error) {
        errors.push(`History sync failed: ${(error as Error).message}`)
        this.logError('syncHistory', error as Error)
      }

      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Zapier sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Zapier webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'zap.on':
        case 'zap.off':
        case 'zap.created':
        case 'zap.updated':
          await this.handleZapWebhook(payload.data)
          break
        case 'task.success':
        case 'task.error':
          await this.handleTaskWebhook(payload.data)
          break
        default:
          this.logInfo('handleWebhook', `Unhandled webhook event: ${payload._event}`)
      }
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in zapier.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Zapier webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncZaps(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.zapierClient.get('/zaps')
      const zaps = response.data || []

      let processed = 0
      let skipped = 0

      for (const zap of zaps) {
        try {
          await this.processZap(zap)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncZaps', error as Error, { zapId: zap.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncZaps', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in zapier.integration.ts:', error)
      throw error
    }
  private async syncHistory(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let url = '/history'
      if (lastSyncTime) {
        url += `?since=${lastSyncTime.toISOString()}`
      }

      const _response = await this.zapierClient.get(url)
      const history = response.data || []

      let processed = 0
      let skipped = 0

      for (const item of history) {
        try {
          await this.processHistoryItem(item)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncHistory', error as Error, { itemId: item.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncHistory', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in zapier.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processZap(zap: unknown): Promise<void> {
    this.logInfo('processZap', `Processing zap: ${zap.id}`)
  }

  private async processHistoryItem(item: unknown): Promise<void> {
    this.logInfo('processHistoryItem', `Processing history item: ${item.id}`)
  }

  // Private webhook handlers
  private async handleZapWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleZapWebhook', 'Processing zap webhook', data)
  }

  private async handleTaskWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleTaskWebhook', 'Processing task webhook', data)
  }

  // Public API methods
  async getZaps(): Promise<unknown[]> {
    try {
      const _response = await this.zapierClient.get('/zaps')
      return (response as Response).data || []
    } catch (error) {
      this.logError('getZaps', error as Error)
      throw new Error(`Failed to get Zapier zaps: ${(error as Error).message}`)
    }

  async getZap(zapId: string): Promise<ApiResponse> {
    try {
      const _response = await this.zapierClient.get(`/zaps/${zapId}`)
      return (response as Response).data
    } catch (error) {
      this.logError('getZap', error as Error)
      throw new Error(`Failed to get Zapier zap: ${(error as Error).message}`)
    }

  async toggleZap(zapId: string, enabled: boolean): Promise<void> {
    try {
      await this.zapierClient.patch(`/zaps/${zapId}`, { status: enabled ? 'on' : 'off' })
    } catch (error) {
      this.logError('toggleZap', error as Error)
      throw new Error(`Failed to toggle Zapier zap: ${(error as Error).message}`)
    }

  async getHistory(options?: {
    zapId?: string
    status?: 'success' | 'error' | 'halted'
    since?: Date,
    limit?: number
  }): Promise<unknown[]> {
    try {
      const params = new URLSearchParams()
      if (_options?.zapId) params.append('zap_id', _options.zapId)
      if (_options?.status) params.append('status', _options.status)
      if (_options?.since) params.append('since', _options.since.toISOString())
      if (_options?.limit) params.append('limit', _options.limit.toString())

      const _response = await this.zapierClient.get(`/history?${params.toString()}`)
      return (response as Response).data || []
    } catch (error) {
      this.logError('getHistory', error as Error)
      throw new Error(`Failed to get Zapier history: ${(error as Error).message}`)
    }

  async getApps(): Promise<unknown[]> {
    try {
      const _response = await this.zapierClient.get('/apps')
      return (response as Response).data || []
    } catch (error) {
      this.logError('getApps', error as Error)
      throw new Error(`Failed to get Zapier apps: ${(error as Error).message}`)
    }

  async triggerZap(zapId: string, data?: unknown): Promise<ApiResponse> {
    try {
      const _response = await this.zapierClient.post(`/zaps/${zapId}/trigger`, data || {})
      return (response as Response).data
    } catch (error) {
      this.logError('triggerZap', error as Error)
      throw new Error(`Failed to trigger Zapier zap: ${(error as Error).message}`)
    }

  async createWebhook(
    zapId: string,
    webhookData: {
      url: string,
      events: string[]
    },
  ): Promise<string> {
    try {
      const _response = await this.zapierClient.post(`/zaps/${zapId}/webhooks`, webhookData)
      return (response as Response).data.id
    } catch (error) {
      this.logError('createWebhook', error as Error)
      throw new Error(`Failed to create Zapier webhook: ${(error as Error).message}`)
    }

  async deleteWebhook(zapId: string, webhookId: string): Promise<void> {
    try {
      await this.zapierClient.delete(`/zaps/${zapId}/webhooks/${webhookId}`)
    } catch (error) {
      this.logError('deleteWebhook', error as Error)
      throw new Error(`Failed to delete Zapier webhook: ${(error as Error).message}`)
    }

  async getProfile(): Promise<ApiResponse> {
    try {
      const _response = await this.zapierClient.get('/me')
      return (response as Response).data
    } catch (error) {
      this.logError('getProfile', error as Error)
      throw new Error(`Failed to get Zapier profile: ${(error as Error).message}`)
    }

  async getUsage(): Promise<ApiResponse> {
    try {
      const _response = await this.zapierClient.get('/usage')
      return (response as Response).data
    } catch (error) {
      this.logError('getUsage', error as Error)
      throw new Error(`Failed to get Zapier usage: ${(error as Error).message}`)
    }

}