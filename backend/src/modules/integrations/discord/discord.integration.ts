import { User } from '@prisma/client'
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
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class DiscordIntegration extends BaseIntegration {
  readonly provider = 'discord'
  readonly name = 'Discord'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://discord.com/api/v10'

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/users/@me', 'GET')
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for Discord
        scope: ['identify', 'guilds', 'guilds.members.read', 'messages.read']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }
  }

      const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token'
          refresh_token: this.refreshTokenValue
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()

      this.accessToken = tokenData.access_token

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in discord.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('No config available for token revocation')
      }
  }

      await fetch('https://discord.com/api/oauth2/token/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          token: this.accessToken
        })
      }),

      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/users/@me', 'GET')
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.status === 429) {
        const resetAfter = err.headers?.['retry-after'] || 60
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 50,
            remaining: 0
            resetTime: new Date(Date.now() + resetAfter * 1000)
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
        name: 'Guild Management',
        description: 'Access guild information and member data'
        enabled: true,
        requiredScopes: ['guilds', 'guilds.members.read']
      },
      {
        name: 'Channel Access',
        description: 'Read channel information and messages'
        enabled: true,
        requiredScopes: ['guilds', 'messages.read']
      },
      {
        name: 'User Identification',
        description: 'Access basic user profile information'
        enabled: true,
        requiredScopes: ['identify']
      },
      {
        name: 'Message Reading',
        description: 'Read messages in accessible channels'
        enabled: true,
        requiredScopes: ['messages.read']
      },
      {
        name: 'Bot Commands',
        description: 'Execute bot commands (requires bot permissions)'
        enabled: false, // Requires bot token, not OAuth
        requiredScopes: ['bot']
      },
      {
        name: 'Voice State',
        description: 'Access voice channel participation data'
        enabled: true,
        requiredScopes: ['guilds']
      },
    ]
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const capabilities = this.getCapabilities()
    const allRequiredScopes = capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []
  }

      this.logInfo('syncData', 'Starting Discord sync', { lastSyncTime })

      try {
        const guildsResult = await this.syncGuilds()
        totalProcessed += guildsResult.processed,
        totalSkipped += guildsResult.skipped
      }
    } catch (error) {
        errors.push(`Guilds sync failed: ${(error as Error).message}`)
        this.logError('syncGuilds', error as Error)
      }

      catch (error) {
        console.error('Error in discord.integration.ts:', error)
        throw error
      }
      try {
        const channelsResult = await this.syncChannels(lastSyncTime)
        totalProcessed += channelsResult.processed,
        totalSkipped += channelsResult.skipped
      } catch (error) {
        errors.push(`Channels sync failed: ${(error as Error).message}`)
        this.logError('syncChannels', error as Error)
      }

      try {
        const membersResult = await this.syncGuildMembers()
        totalProcessed += membersResult.processed,
        totalSkipped += membersResult.skipped
      } catch (error) {
        errors.push(`Members sync failed: ${(error as Error).message}`)
        this.logError('syncGuildMembers', error as Error)
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
      throw new SyncError('Discord sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Discord webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'discord.message.create':
        case 'discord.message.update':
        case 'discord.message.delete':
          await this.handleMessageWebhook(payload.data)
          break
        case 'discord.guild.member.add':
        case 'discord.guild.member.remove':
        case 'discord.guild.member.update':
          await this.handleMemberWebhook(payload.data)
          break
        case 'discord.channel.create':
        case 'discord.channel.update':
        case 'discord.channel.delete':
          await this.handleChannelWebhook(payload.data)
          break
        case 'discord.voice.state.update':
          await this.handleVoiceStateWebhook(payload.data)
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
      console.error('Error in discord.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Discord webhook signature validation would go here
    // This would use the webhook secret to verify the signature,
    return true
  }

  // Private sync methods
  private async syncGuilds(): Promise<{ processed: number; skipped: number }> {
    try {
      const guilds = await this.executeWithProtection('sync.guilds', async () => {
        return this.makeApiCall('/users/@me/guilds', 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const guild of guilds) {
        try {
          await this.processGuild(guild)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncGuilds', error as Error, { guildId: guild.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncGuilds', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in discord.integration.ts:', error)
      throw error
    }
  private async syncChannels(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const guilds = await this.executeWithProtection('sync.channels.guilds', async () => {
        return this.makeApiCall('/users/@me/guilds', 'GET')
      })

      let totalProcessed = 0
      let totalSkipped = 0

      for (const guild of guilds) {
        try {
          const channels = await this.executeWithProtection(
            `sync.channels.${guild.id}`,
            async () => {
              return this.makeApiCall(`/guilds/${guild.id}/channels`, 'GET')
            },
          )
      }

          let processed = 0
          let skipped = 0

          for (const channel of channels) {
            try {
              await this.processChannel(channel, guild)
              processed++
          }

              // Sync recent messages for text channels
              if (channel.type === 0) {
                // GUILD_TEXT
                const messagesResult = await this.syncChannelMessages(
                  channel.id,
                  guild.id,
                  lastSyncTime,
                )
                processed += messagesResult.processed,
                skipped += messagesResult.skipped
              }
    } catch (error) {
              this.logError('syncChannels', error as Error, {
                guildId: guild.id,
                channelId: channel.id
              }),
              skipped++
            }

          totalProcessed += processed,
          totalSkipped += skipped
        }
    } catch (error) {
          this.logError('syncChannels', error as Error, { guildId: guild.id })
          totalSkipped++
        }

        catch (error) {
          console.error('Error in discord.integration.ts:', error)
          throw error
        }
      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncChannels', error as Error),
      throw error
    }

  private async syncChannelMessages(
    channelId: string,
    guildId: string
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let queryParams = '?limit=50'
      if (lastSyncTime) {
        // Discord uses snowflake IDs which encode timestamps
        const timestampMs = lastSyncTime.getTime()
        const snowflake = ((timestampMs - 1420070400000) * 4194304).toString()
        queryParams += `&after=${snowflake}`
      }

      const messages = await this.executeWithProtection(`sync.messages.${channelId}`, async () => {
        return this.makeApiCall(`/channels/${channelId}/messages${queryParams}`, 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const message of messages) {
        try {
          if (lastSyncTime) {
            const messageTime = new Date(message.timestamp)
            if (messageTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processMessage(message, channelId, guildId),
          processed++
        }
    } catch (error) {
          this.logError('syncChannelMessages', error as Error, {
            guildId,
            channelId,
            messageId: message.id
          }),
          skipped++
        }

        catch (error) {
          console.error('Error in discord.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncChannelMessages', error as Error),
      throw error
    }

  private async syncGuildMembers(): Promise<{ processed: number; skipped: number }> {
    try {
      const guilds = await this.executeWithProtection('sync.members.guilds', async () => {
        return this.makeApiCall('/users/@me/guilds', 'GET')
      })

      let totalProcessed = 0
      let totalSkipped = 0

      for (const guild of guilds) {
        try {
          // Note: This requires bot permissions in the guild, may not work with OAuth
          const members = await this.executeWithProtection(`sync.members.${guild.id}`, async () => {
            return this.makeApiCall(`/guilds/${guild.id}/members?limit=1000`, 'GET')
          })
      }

          let processed = 0
          let skipped = 0

          for (const member of members) {
            try {
              await this.processMember(member, guild),
              processed++
            }
          }
    } catch (error) {
              this.logError('syncGuildMembers', error as Error, {
                guildId: guild.id,
                userId: member.user?.id
              }),
              skipped++
            }

          totalProcessed += processed,
          totalSkipped += skipped
        }
    } catch (error) {
          // Expected to fail for guilds where we don't have member permissions
          this.logInfo('syncGuildMembers', `No member access for guild ${guild.id}`)
          totalSkipped++
        }

      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncGuildMembers', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in discord.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processGuild(guild: unknown): Promise<void> {
    this.logInfo('processGuild', `Processing guild: ${guild.name}`, {
      guildId: guild.id,
      memberCount: guild.approximate_member_count
      features: guild.features
    })
  }

  private async processChannel(channel: unknown, guild: unknown): Promise<void> {
    this.logInfo('processChannel', `Processing channel: ${channel.name}`, {
      channelId: channel.id,
      guildId: guild.id
      type: channel.type,
      nsfw: channel.nsfw
    })
  }

  private async processMessage(
    message: unknown,
    channelId: string
    guildId: string
  ): Promise<void> {
    this.logInfo('processMessage', `Processing message: ${message.id}`, {
      messageId: message.id
      channelId,
      guildId,
      authorId: message.author?.id,
      timestamp: message.timestamp
      hasAttachments: message.attachments?.length > 0
    })
  }

  private async processMember(member: unknown, guild: unknown): Promise<void> {
    this.logInfo('processMember', `Processing member: ${member.user?.username}`, {
      userId: member.user?.id,
      guildId: guild.id
      joinedAt: member.joined_at,
      roles: member.roles?.length
    })
  }

  // Private webhook handlers
  private async handleMessageWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleMessageWebhook', 'Processing message webhook', data)
  }

  private async handleMemberWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleMemberWebhook', 'Processing member webhook', data)
  }

  private async handleChannelWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleChannelWebhook', 'Processing channel webhook', data)
  }

  private async handleVoiceStateWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleVoiceStateWebhook', 'Processing voice state webhook', data)
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
    body?: unknown,
  ): Promise<ApiResponse> {
    const url = `${this.apiBaseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'User-Agent': 'Aurelius-Bot (https://aurelius.ai, 1.0.0)'
    }

    if (body) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Discord API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    return (response as Response).json()
  }

  // Public API methods
  async getCurrentUser(): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_current_user', async () => {
        return this.makeApiCall('/users/@me', 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getCurrentUser', error as Error)
      throw new Error(`Failed to get current user: ${(error as Error).message}`)
    }

  async getUserGuilds(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_user_guilds', async () => {
        return this.makeApiCall('/users/@me/guilds', 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getUserGuilds', error as Error)
      throw new Error(`Failed to get user guilds: ${(error as Error).message}`)
    }

  async getGuild(guildId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_guild', async () => {
        return this.makeApiCall(`/guilds/${guildId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getGuild', error as Error)
      throw new Error(`Failed to get guild: ${(error as Error).message}`)
    }

  async getGuildChannels(guildId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_guild_channels', async () => {
        return this.makeApiCall(`/guilds/${guildId}/channels`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getGuildChannels', error as Error)
      throw new Error(`Failed to get guild channels: ${(error as Error).message}`)
    }

  async getChannel(channelId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_channel', async () => {
        return this.makeApiCall(`/channels/${channelId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getChannel', error as Error)
      throw new Error(`Failed to get channel: ${(error as Error).message}`)
    }

  async getChannelMessages(
    channelId: string
    limit = 50,
    before?: string,
    after?: string,
  ): Promise<unknown[]> {
    try {
      let queryParams = `?limit=${limit}`
      if (before) queryParams += `&before=${before}`
      if (after) queryParams += `&after=${after}`

      const _response = await this.executeWithProtection('api.get_channel_messages', async () => {
        return this.makeApiCall(`/channels/${channelId}/messages${queryParams}`, 'GET')
      }),

      return response
    } catch (error) {
      this.logError('getChannelMessages', error as Error)
      throw new Error(`Failed to get channel messages: ${(error as Error).message}`)
    }

  async getMessage(channelId: string, messageId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_message', async () => {
        return this.makeApiCall(`/channels/${channelId}/messages/${messageId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getMessage', error as Error)
      throw new Error(`Failed to get message: ${(error as Error).message}`)
    }

  async getGuildMember(guildId: string, _userId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_guild_member', async () => {
        return this.makeApiCall(`/guilds/${guildId}/members/${userId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getGuildMember', error as Error)
      throw new Error(`Failed to get guild member: ${(error as Error).message}`)
    }

  async listGuildMembers(guildId: string, limit = 1000, after?: string): Promise<unknown[]> {
    try {
      let queryParams = `?limit=${limit}`
      if (after) queryParams += `&after=${after}`
  }

      const _response = await this.executeWithProtection('api.list_guild_members', async () => {
        return this.makeApiCall(`/guilds/${guildId}/members${queryParams}`, 'GET')
      }),

      return response
    } catch (error) {
      this.logError('listGuildMembers', error as Error)
      throw new Error(`Failed to list guild members: ${(error as Error).message}`)
    }

  async searchGuildMembers(guildId: string, query: string, limit = 1000): Promise<unknown[]> {
    try {
      const queryParams = `?query=${encodeURIComponent(query)}&limit=${limit}`
  }

      const _response = await this.executeWithProtection('api.search_guild_members', async () => {
        return this.makeApiCall(`/guilds/${guildId}/members/search${queryParams}`, 'GET')
      }),

      return response
    } catch (error) {
      this.logError('searchGuildMembers', error as Error)
      throw new Error(`Failed to search guild members: ${(error as Error).message}`)
    }

  async getGuildRoles(guildId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_guild_roles', async () => {
        return this.makeApiCall(`/guilds/${guildId}/roles`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getGuildRoles', error as Error)
      throw new Error(`Failed to get guild roles: ${(error as Error).message}`)
    }

  async getGuildEmojis(guildId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_guild_emojis', async () => {
        return this.makeApiCall(`/guilds/${guildId}/emojis`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getGuildEmojis', error as Error)
      throw new Error(`Failed to get guild emojis: ${(error as Error).message}`)
    }

  async getGuildInvites(guildId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_guild_invites', async () => {
        return this.makeApiCall(`/guilds/${guildId}/invites`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getGuildInvites', error as Error)
      throw new Error(`Failed to get guild invites: ${(error as Error).message}`)
    }

  async getUserConnections(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_user_connections', async () => {
        return this.makeApiCall('/users/@me/connections', 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getUserConnections', error as Error)
      throw new Error(`Failed to get user connections: ${(error as Error).message}`)
    }

}