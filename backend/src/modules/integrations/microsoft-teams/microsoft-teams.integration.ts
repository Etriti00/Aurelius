import { Client } from '@microsoft/microsoft-graph-client'
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client'
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

class CustomAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken
  }

export class MicrosoftTeamsIntegration extends BaseIntegration {
  readonly provider = 'microsoft-teams'
  readonly name = 'Microsoft Teams'
  readonly version = '1.0.0'

  private graphClient: Client

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    const authProvider = new CustomAuthProvider(accessToken)
    this.graphClient = Client.initWithMiddleware({ authProvider })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.graphClient.api('/me/joinedTeams').top(1).get()
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: [
          'https://graph.microsoft.com/Chat.ReadWrite',
          'https://graph.microsoft.com/Team.ReadBasic.All',
          'https://graph.microsoft.com/Channel.ReadBasic.All',
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
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }
  }

      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshTokenValue
          grant_type: 'refresh_token',
          scope: this.config.scopes.join(' ')
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()

      const authProvider = new CustomAuthProvider(tokenData.access_token)
      this.graphClient = Client.initWithMiddleware({ authProvider })
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
      console.error('Error in microsoft-teams.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.executeWithProtection('connection.test', async () => {
        return this.graphClient.api('/me/joinedTeams').top(1).get()
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.statusCode === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.statusCode === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 10000,
            remaining: 0
            resetTime: new Date(Date.now() + 600000), // 10 minutes
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
        name: 'Teams Messaging',
        description: 'Send and receive messages in Teams channels'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Chat.ReadWrite']
      },
      {
        name: 'Team Management',
        description: 'Access team information and members'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Team.ReadBasic.All']
      },
      {
        name: 'Channel Management',
        description: 'Access channel information and messages'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Channel.ReadBasic.All']
      },
      {
        name: 'Meeting Management',
        description: 'Create and manage Teams meetings'
        enabled: true,
        requiredScopes: [
          'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
          'https://graph.microsoft.com/Calendars.ReadWrite',
        ]
      },
      {
        name: 'File Sharing',
        description: 'Share files in Teams channels'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'Presence Information',
        description: 'Access user presence and activity status'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Presence.Read.All']
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

      this.logInfo('syncData', 'Starting Microsoft Teams sync', { lastSyncTime })

      try {
        const teamsResult = await this.syncTeams(lastSyncTime)
        totalProcessed += teamsResult.processed,
        totalSkipped += teamsResult.skipped
      }
    } catch (error) {
        errors.push(`Teams sync failed: ${(error as Error).message}`)
        this.logError('syncTeams', error as Error)
      }

      catch (error) {
        console.error('Error in microsoft-teams.integration.ts:', error)
        throw error
      }
      try {
        const messagesResult = await this.syncMessages(lastSyncTime)
        totalProcessed += messagesResult.processed,
        totalSkipped += messagesResult.skipped
      } catch (error) {
        errors.push(`Messages sync failed: ${(error as Error).message}`)
        this.logError('syncMessages', error as Error)
      }

      try {
        const meetingsResult = await this.syncMeetings(lastSyncTime)
        totalProcessed += meetingsResult.processed,
        totalSkipped += meetingsResult.skipped
      } catch (error) {
        errors.push(`Meetings sync failed: ${(error as Error).message}`)
        this.logError('syncMeetings', error as Error)
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
      throw new SyncError('Microsoft Teams sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Microsoft Teams webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'teams.message.sent':
        case 'teams.message.updated':
        case 'teams.message.deleted':
          await this.handleMessageWebhook(payload.data)
          break
        case 'teams.meeting.created':
        case 'teams.meeting.updated':
        case 'teams.meeting.started':
        case 'teams.meeting.ended':
          await this.handleMeetingWebhook(payload.data)
          break
        case 'teams.member.added':
        case 'teams.member.removed':
          await this.handleMemberWebhook(payload.data)
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
      console.error('Error in microsoft-teams.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    return true
  }

  // Private sync methods
  private async syncTeams(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const teams = await this.executeWithProtection('sync.teams', async () => {
        return this.graphClient.api('/me/joinedTeams').get()
      })

      let processed = 0
      let skipped = 0

      for (const team of teams.value || []) {
        try {
          await this.processTeam(team)
          processed++
      }

          // Sync channels for this team
          const channelsResult = await this.syncTeamChannels(team.id, lastSyncTime)
          processed += channelsResult.processed,
          skipped += channelsResult.skipped
        }
    } catch (error) {
          this.logError('syncTeams', error as Error, { teamId: team.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTeams', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-teams.integration.ts:', error)
      throw error
    }
  private async syncTeamChannels(
    teamId: string
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const channels = await this.executeWithProtection(
        `sync.team.${teamId}.channels`,
        async () => {
          return this.graphClient.api(`/teams/${teamId}/channels`).get()
        },
      )

      let processed = 0
      let skipped = 0

      for (const channel of channels.value || []) {
        try {
          await this.processChannel(channel, teamId),
          processed++
        }
      }
    } catch (error) {
          this.logError('syncTeamChannels', error as Error, { teamId, channelId: channel.id }),
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTeamChannels', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-teams.integration.ts:', error)
      throw error
    }
  private async syncMessages(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const teams = await this.executeWithProtection('sync.messages.teams', async () => {
        return this.graphClient.api('/me/joinedTeams').get()
      })

      let totalProcessed = 0
      let totalSkipped = 0

      for (const team of teams.value || []) {
        try {
          const channels = await this.executeWithProtection(
            `sync.messages.team.${team.id}`,
            async () => {
              return this.graphClient.api(`/teams/${team.id}/channels`).get()
            },
          )
      }

          for (const channel of channels.value || []) {
            try {
              let filter = ''
              if (lastSyncTime) {
                filter = `$filter=createdDateTime ge ${lastSyncTime.toISOString()}`
              }
          }

              const messages = await this.executeWithProtection(
                `sync.messages.${team.id}.${channel.id}`,
                async () => {
                  return this.graphClient
                    .api(`/teams/${team.id}/channels/${channel.id}/messages`)
                    .filter(filter)
                    .top(50)
                    .get()
                }
                },
              )

              let processed = 0
              let skipped = 0

              for (const message of messages.value || []) {
                try {
                  await this.processMessage(message, team, channel),
                  processed++
                }
              }
    } catch (error) {
                  this.logError('syncMessages', error as Error, {
                    teamId: team.id,
                    channelId: channel.id
                    messageId: message.id
                  }),
                  skipped++
                }

              totalProcessed += processed,
              totalSkipped += skipped
            }
    } catch (error) {
              this.logError('syncMessages', error as Error, {
                teamId: team.id,
                channelId: channel.id
              }),
              totalSkipped++
            }
    } catch (error) {
          this.logError('syncMessages', error as Error, { teamId: team.id })
        }

        catch (error) {
          console.error('Error in microsoft-teams.integration.ts:', error)
          throw error
        }
      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncMessages', error as Error),
      throw error
    }

  private async syncMeetings(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const startTime =
        lastSyncTime?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
      const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ahead

      const meetings = await this.executeWithProtection('sync.meetings', async () => {
        return this.graphClient
          .api('/me/events')
          .filter(
            `isOnlineMeeting eq true and start/dateTime ge '${startTime}' and end/dateTime le '${endTime}'`,
          )
          .select('id,subject,start,end,onlineMeeting,organizer,attendees')
          .top(100)
          .get()
      })

      let processed = 0
      let skipped = 0

      for (const meeting of meetings.value || []) {
        try {
          await this.processMeeting(meeting)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncMeetings', error as Error, { meetingId: meeting.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncMeetings', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-teams.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processTeam(team: unknown): Promise<void> {
    this.logInfo('processTeam', `Processing team: ${team.displayName}`, {
      teamId: team.id,
      description: team.description
    })
  }

  private async processChannel(channel: unknown, teamId: string): Promise<void> {
    this.logInfo('processChannel', `Processing channel: ${channel.displayName}`, {
      channelId: channel.id
      teamId,
      channelType: channel.membershipType
    })
  }

  private async processMessage(message: unknown, team: unknown, channel: unknown): Promise<void> {
    this.logInfo('processMessage', `Processing message: ${message.id}`, {
      messageId: message.id,
      teamId: team.id
      channelId: channel.id,
      createdDateTime: message.createdDateTime
      fromUser: message.from?.user?.displayName
    })
  }

  private async processMeeting(meeting: unknown): Promise<void> {
    this.logInfo('processMeeting', `Processing meeting: ${meeting.subject}`, {
      meetingId: meeting.id,
      startTime: meeting.start?.dateTime
      endTime: meeting.end?.dateTime,
      joinUrl: meeting.onlineMeeting?.joinUrl
    })
  }

  // Private webhook handlers
  private async handleMessageWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleMessageWebhook', 'Processing message webhook', data)
  }

  private async handleMeetingWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleMeetingWebhook', 'Processing meeting webhook', data)
  }

  private async handleMemberWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleMemberWebhook', 'Processing member webhook', data)
  }

  // Public API methods
  async sendChannelMessage(teamId: string, channelId: string, message: string): Promise<string> {
    try {
      const chatMessage = {
        body: {,
          content: message
          contentType: 'text'
        }
      }
  }

      const _response = await this.executeWithProtection('api.send_channel_message', async () => {
        return this.graphClient
          .api(`/teams/${teamId}/channels/${channelId}/messages`)
          .post(chatMessage)
      })

      return (response as Response).id
    } catch (error) {
      this.logError('sendChannelMessage', error as Error)
      throw new Error(`Failed to send channel message: ${(error as Error).message}`)
    }

  async sendChatMessage(chatId: string, message: string): Promise<string> {
    try {
      const chatMessage = {
        body: {,
          content: message
          contentType: 'text'
        }
      }
  }

      const _response = await this.executeWithProtection('api.send_chat_message', async () => {
        return this.graphClient.api(`/chats/${chatId}/messages`).post(chatMessage)
      })

      return (response as Response).id
    } catch (error) {
      this.logError('sendChatMessage', error as Error)
      throw new Error(`Failed to send chat message: ${(error as Error).message}`)
    }

  async createMeeting(meeting: {,
    subject: string
    startTime: Date,
    endTime: Date
    attendees?: string[]
    allowMeetingChat?: boolean,
    allowRecording?: boolean
  }): Promise<{ meetingId: string; joinUrl: string }> {
    try {
      const onlineMeeting = {
        subject: meeting.subject,
        startDateTime: meeting.startTime.toISOString()
        endDateTime: meeting.endTime.toISOString(),
        participants: { attendees: meeting.attendees?.map(email => ({
            identity: {,
              user: {
                id: email }
            }
          }))
        },
        allowMeetingChat: meeting.allowMeetingChat ?? true,
        allowRecording: meeting.allowRecording ?? false
      }

      const _response = await this.executeWithProtection('api.create_meeting', async () => {
        return this.graphClient.api('/me/onlineMeetings').post(onlineMeeting)
      })

      return {
        meetingId: response.id,
        joinUrl: response.joinWebUrl
      }
    } catch (error) {
      this.logError('createMeeting', error as Error)
      throw new Error(`Failed to create meeting: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-teams.integration.ts:', error)
      throw error
    }
  async listTeams(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_teams', async () => {
        return this.graphClient.api('/me/joinedTeams').get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('listTeams', error as Error)
      throw new Error(`Failed to list teams: ${(error as Error).message}`)
    }

  async getTeam(teamId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_team', async () => {
        return this.graphClient.api(`/teams/${teamId}`).get()
      })
  }

      return response
    } catch (error) {
      this.logError('getTeam', error as Error)
      throw new Error(`Failed to get team: ${(error as Error).message}`)
    }

  async listChannels(teamId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_channels', async () => {
        return this.graphClient.api(`/teams/${teamId}/channels`).get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('listChannels', error as Error)
      throw new Error(`Failed to list channels: ${(error as Error).message}`)
    }

  async getChannel(teamId: string, channelId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_channel', async () => {
        return this.graphClient.api(`/teams/${teamId}/channels/${channelId}`).get()
      })
  }

      return response
    } catch (error) {
      this.logError('getChannel', error as Error)
      throw new Error(`Failed to get channel: ${(error as Error).message}`)
    }

  async listChannelMessages(teamId: string, channelId: string, top = 50): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_channel_messages', async () => {
        return this.graphClient
          .api(`/teams/${teamId}/channels/${channelId}/messages`)
          .top(top)
          .orderby('createdDateTime desc')
          .get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('listChannelMessages', error as Error)
      throw new Error(`Failed to list channel messages: ${(error as Error).message}`)
    }

  async getMessage(teamId: string, channelId: string, messageId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_message', async () => {
        return this.graphClient
          .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}`)
          .get()
      })
  }

      return response
    } catch (error) {
      this.logError('getMessage', error as Error)
      throw new Error(`Failed to get message: ${(error as Error).message}`)
    }

  async listTeamMembers(teamId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_team_members', async () => {
        return this.graphClient.api(`/teams/${teamId}/members`).get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('listTeamMembers', error as Error)
      throw new Error(`Failed to list team members: ${(error as Error).message}`)
    }

  async getUserPresence(userId?: string): Promise<ApiResponse> {
    try {
      const userPath = userId ? `/users/${userId}` : '/me'
      const _response = await this.executeWithProtection('api.get_user_presence', async () => {
        return this.graphClient.api(`${userPath}/presence`).get()
      })
  }

      return response
    } catch (error) {
      this.logError('getUserPresence', error as Error)
      throw new Error(`Failed to get user presence: ${(error as Error).message}`)
    }

  async setPresence(
    availability: 'Available' | 'Busy' | 'Away' | 'BeRightBack' | 'DoNotDisturb'
  ): Promise<void> {
    try {
      await this.executeWithProtection('api.set_presence', async () => {
        return this.graphClient.api('/me/presence/setPresence').post({
          sessionId: 'session-' + Date.now()
          availability,
          activity: availability,
          expirationDuration: 'PT1H', // 1 hour
        })
      })
    } catch (error) {
      this.logError('setPresence', error as Error)
      throw new Error(`Failed to set presence: ${(error as Error).message}`)
    }

  async shareFileToChannel(
    teamId: string,
    channelId: string
    fileId: string
    message?: string,
  ): Promise<string> {
    try {
      const shareMessage = {
        body: {,
          content: message || 'Shared a file'
          contentType: 'text'
        },
        attachments: [
          {
            id: fileId,
            contentType: 'reference'
          },
        ]
      }

      const _response = await this.executeWithProtection('api.share_file_to_channel', async () => {
        return this.graphClient
          .api(`/teams/${teamId}/channels/${channelId}/messages`)
          .post(shareMessage)
      })

      return (response as Response).id
    } catch (error) {
      this.logError('shareFileToChannel', error as Error)
      throw new Error(`Failed to share file to channel: ${(error as Error).message}`)
    }

  async replyToMessage(
    teamId: string,
    channelId: string
    messageId: string,
    reply: string
  ): Promise<string> {
    try {
      const replyMessage = {
        body: {,
          content: reply
          contentType: 'text'
        }
      }

      const _response = await this.executeWithProtection('api.reply_to_message', async () => {
        return this.graphClient
          .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`)
          .post(replyMessage)
      })

      return (response as Response).id
    } catch (error) {
      this.logError('replyToMessage', error as Error)
      throw new Error(`Failed to reply to message: ${(error as Error).message}`)
    }

}