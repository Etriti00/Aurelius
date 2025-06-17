import { google } from 'googleapis'
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
  GenericWebhookPayload,
  ThirdPartyClient
} from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class GoogleChatIntegration extends BaseIntegration {
  readonly provider = 'google-chat'
  readonly name = 'Google Chat'
  readonly version = '1.0.0'

  private oauth2Client: ThirdPartyClient
  private chat: unknown

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.oauth2Client = new google.auth.OAuth2(
      config?.clientId,
      config?.clientSecret,
      config?.redirectUri,
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    this.chat = google.chat({ version: 'v1', auth: this.oauth2Client })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by listing spaces
      await this.chat.spaces.list({ pageSize: 1 })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: [
          'https://www.googleapis.com/auth/chat.spaces.readonly',
          'https://www.googleapis.com/auth/chat.messages',
        ]
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue) {
        return this.authenticate()
      }
  }

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      return {
        success: true,
        accessToken: credentials.access_token
        refreshToken: credentials.refresh_token || this.refreshTokenValue,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
        scope: credentials.scope?.split(' ') || [
          'https://www.googleapis.com/auth/chat.spaces.readonly',
          'https://www.googleapis.com/auth/chat.messages',
        ]
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      await this.oauth2Client.revokeCredentials()
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.chat.spaces.list({ pageSize: 1 })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.code === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.code === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 100,
            remaining: 0
            resetTime: new Date(Date.now() + 60000)
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
        name: 'Spaces',
        description: 'Access and manage Google Chat spaces'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/chat.spaces.readonly']
      },
      {
        name: 'Messages',
        description: 'Send and receive messages in Chat'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/chat.messages']
      },
      {
        name: 'Members',
        description: 'Manage space members and memberships'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/chat.memberships']
      },
      {
        name: 'Bots',
        description: 'Create and manage Chat bots'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/chat.bot']
      },
      {
        name: 'Reactions',
        description: 'Add and manage message reactions'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/chat.messages']
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

      this.logInfo('syncData', 'Starting Google Chat sync', { lastSyncTime })

      // Sync Spaces
      try {
        const spacesResult = await this.syncSpaces()
        totalProcessed += spacesResult.processed,
        totalSkipped += spacesResult.skipped
      }
    } catch (error) {
        errors.push(`Spaces sync failed: ${(error as Error).message}`)
        this.logError('syncSpaces', error as Error)
      }

      catch (error) {
        console.error('Error in google-chat.integration.ts:', error)
        throw error
      }
      // Sync Messages
      try {
        const messagesResult = await this.syncMessages(lastSyncTime)
        totalProcessed += messagesResult.processed,
        totalSkipped += messagesResult.skipped
      } catch (error) {
        errors.push(`Messages sync failed: ${(error as Error).message}`)
        this.logError('syncMessages', error as Error)
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
      throw new SyncError('Google Chat sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Google Chat webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'MESSAGE':
          await this.handleMessageWebhook(payload.data)
          break
        case 'ADDED_TO_SPACE':
        case 'REMOVED_FROM_SPACE':
          await this.handleSpaceWebhook(payload.data)
          break
        case 'CARD_CLICKED':
          await this.handleCardWebhook(payload.data)
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
      console.error('Error in google-chat.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Google Chat webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncSpaces(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.chat.spaces.list({ pageSize: 100 })

      const spaces = response.data.spaces || []

      let processed = 0
      let skipped = 0

      for (const space of spaces) {
        try {
          await this.processSpace(space)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncSpaces', error as Error, { spaceName: space.name })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncSpaces', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-chat.integration.ts:', error)
      throw error
    }
  private async syncMessages(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      // Get all spaces first
      const spacesResponse = await this.chat.spaces.list({ pageSize: 100 })
      const spaces = spacesResponse.data.spaces || []

      let processed = 0
      let skipped = 0

      for (const space of spaces) {
        try {
          const messagesResponse = await this.chat.spaces.messages.list({
            parent: space.name,
            pageSize: 100
            orderBy: 'createTime desc'
          })
      }

          const messages = messagesResponse.data.messages || []

          for (const message of messages) {
            try {
              // Filter by lastSyncTime if provided
              if (lastSyncTime && new Date(message.createTime) <= lastSyncTime) {
                skipped++,
                continue
              }
          }

              await this.processMessage(message, space),
              processed++
            }
    } catch (error) {
              this.logError('syncMessages', error as Error, { messageName: message.name })
              skipped++
            }
    } catch (error) {
          this.logError('syncMessages', error as Error, { spaceName: space.name })
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncMessages', error as Error),
      throw error
    }

  // Private processing methods
  private async processSpace(space: unknown): Promise<void> {
    this.logInfo('processSpace', `Processing space: ${space.name}`)
  }

  private async processMessage(message: unknown, space: unknown): Promise<void> {
    this.logInfo('processMessage', `Processing message: ${message.name}`)
  }

  // Private webhook handlers
  private async handleMessageWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleMessageWebhook', 'Processing message webhook', data)
  }

  private async handleSpaceWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleSpaceWebhook', 'Processing space webhook', data)
  }

  private async handleCardWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleCardWebhook', 'Processing card webhook', data)
  }

  // Public API methods
  async sendMessage(
    spaceName: string,
    messageData: {
      text?: string
      cards?: unknown[],
      thread?: string
    },
  ): Promise<string> {
    try {
      const message: unknown = {}

      if (messageData.text) {
        message.text = messageData.text
      }

      if (messageData.cards) {
        message.cards = messageData.cards
      }

      const params: unknown = {,
        parent: spaceName
        resource: message
      }

      if (messageData.thread) {
        params.threadKey = messageData.thread
      }

      const _response = await this.chat.spaces.messages.create(params)
      return (response as Response).data.name
    }
    } catch (error) {
      this.logError('sendMessage', error as Error)
      throw new Error(`Failed to send Google Chat message: ${(error as Error).message}`)
    }

  async updateMessage(
    messageName: string,
    updateData: {
      text?: string,
      cards?: unknown[]
    },
  ): Promise<void> {
    try {
      const message: unknown = {}

      if (updateData.text) {
        message.text = updateData.text
      }

      if (updateData.cards) {
        message.cards = updateData.cards
      }

      await this.chat.spaces.messages.patch({
        name: messageName,
        resource: message
      })
    }
    } catch (error) {
      this.logError('updateMessage', error as Error)
      throw new Error(`Failed to update Google Chat message: ${(error as Error).message}`)
    }

  async deleteMessage(messageName: string): Promise<void> {
    try {
      await this.chat.spaces.messages.delete({ name: messageName })
    }
    } catch (error) {
      this.logError('deleteMessage', error as Error)
      throw new Error(`Failed to delete Google Chat message: ${(error as Error).message}`)
    }

  async getMessage(messageName: string): Promise<ApiResponse> {
    try {
      const _response = await this.chat.spaces.messages.get({ name: messageName })
  }

      return (response as Response).data
    }
    } catch (error) {
      this.logError('getMessage', error as Error)
      throw new Error(`Failed to get Google Chat message: ${(error as Error).message}`)
    }

  async getSpaces(): Promise<unknown[]> {
    try {
      const _response = await this.chat.spaces.list({ pageSize: 100 })
  }

      return (response as Response).data.spaces || []
    }
    } catch (error) {
      this.logError('getSpaces', error as Error)
      throw new Error(`Failed to get Google Chat spaces: ${(error as Error).message}`)
    }

  async getSpace(spaceName: string): Promise<ApiResponse> {
    try {
      const _response = await this.chat.spaces.get({ name: spaceName })
  }

      return (response as Response).data
    }
    } catch (error) {
      this.logError('getSpace', error as Error)
      throw new Error(`Failed to get Google Chat space: ${(error as Error).message}`)
    }

  async getSpaceMembers(spaceName: string): Promise<unknown[]> {
    try {
      const _response = await this.chat.spaces.members.list({
        parent: spaceName,
        pageSize: 100
      })
  }

      return (response as Response).data.memberships || []
    }
    } catch (error) {
      this.logError('getSpaceMembers', error as Error)
      throw new Error(`Failed to get Google Chat space members: ${(error as Error).message}`)
    }

  async addSpaceMember(
    spaceName: string,
    memberData: {
      email: string
      role?: 'ROLE_MEMBER' | 'ROLE_MANAGER'
    },
  ): Promise<string> {
    try {
      const _response = await this.chat.spaces.members.create({
        parent: spaceName,
        resource: {
          member: {,
            name: `users/${memberData.email}`,
            type: 'HUMAN'
          },
          role: memberData.role || 'ROLE_MEMBER'
        }
      })

      return (response as Response).data.name
    }
    } catch (error) {
      this.logError('addSpaceMember', error as Error)
      throw new Error(`Failed to add Google Chat space member: ${(error as Error).message}`)
    }

  async removeSpaceMember(membershipName: string): Promise<void> {
    try {
      await this.chat.spaces.members.delete({ name: membershipName })
    }
    } catch (error) {
      this.logError('removeSpaceMember', error as Error)
      throw new Error(`Failed to remove Google Chat space member: ${(error as Error).message}`)
    }

  async createSpace(spaceData: {,
    displayName: string
    spaceType?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE',
    threaded?: boolean
  }): Promise<string> {
    try {
      const _response = await this.chat.spaces.create({
        resource: {,
          displayName: spaceData.displayName
          spaceType: spaceData.spaceType || 'SPACE',
          spaceThreadingState: spaceData.threaded ? 'THREADED_MESSAGES' : 'UNTHREADED_MESSAGES'
        }
      })

      return (response as Response).data.name
    }
    } catch (error) {
      this.logError('createSpace', error as Error)
      throw new Error(`Failed to create Google Chat space: ${(error as Error).message}`)
    }

  async searchMessages(query: string, spaceName?: string): Promise<unknown[]> {
    try {
      // Note: Google Chat API doesn't have a direct search endpoint
      // This would need to be implemented by fetching messages and filtering
      this.logInfo('searchMessages', 'Google Chat API search not directly available'),
      return []
    }
    } catch (error) {
      this.logError('searchMessages', error as Error)
      throw new Error(`Failed to search Google Chat messages: ${(error as Error).message}`)
    }

}
catch (error) {
  console.error('Error in google-chat.integration.ts:', error)
  throw error
}