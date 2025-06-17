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

export class ZoomIntegration extends BaseIntegration {
  readonly provider = 'zoom'
  readonly name = 'Zoom'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.zoom.us/v2'

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
        return this.makeApiCall('/users/me', 'GET')
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: ['meeting:read', 'meeting:write', 'webinar:read', 'webinar:write', 'user:read']
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

      const response = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
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
      console.error('Error in zoom.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('No config available for token revocation')
      }
  }

      await fetch('https://zoom.us/oauth/revoke', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ token: this.accessToken })
      }),

      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/users/me', 'GET')
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
            limit: 10,
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
        name: 'Meeting Management',
        description: 'Create, update, and manage Zoom meetings',
        enabled: true,
        requiredScopes: ['meeting:read', 'meeting:write']
      },
      {
        name: 'Webinar Management',
        description: 'Create and manage Zoom webinars'
        enabled: true,
        requiredScopes: ['webinar:read', 'webinar:write']
      },
      {
        name: 'User Management',
        description: 'Access user information and settings'
        enabled: true,
        requiredScopes: ['user:read']
      },
      {
        name: 'Recording Access',
        description: 'Access meeting and webinar recordings'
        enabled: true,
        requiredScopes: ['recording:read']
      },
      {
        name: 'Reports Access',
        description: 'Access meeting and webinar reports'
        enabled: true,
        requiredScopes: ['report:read']
      },
      {
        name: 'Cloud Storage',
        description: 'Access cloud recordings and files'
        enabled: true,
        requiredScopes: ['recording:read']
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

      this.logInfo('syncData', 'Starting Zoom sync', { lastSyncTime })

      try {
        const meetingsResult = await this.syncMeetings(lastSyncTime)
        totalProcessed += meetingsResult.processed,
        totalSkipped += meetingsResult.skipped
      }
    } catch (error) {
        errors.push(`Meetings sync failed: ${(error as Error).message}`)
        this.logError('syncMeetings', error as Error)
      }

      catch (error) {
        console.error('Error in zoom.integration.ts:', error)
        throw error
      }
      try {
        const webinarsResult = await this.syncWebinars(lastSyncTime)
        totalProcessed += webinarsResult.processed,
        totalSkipped += webinarsResult.skipped
      } catch (error) {
        errors.push(`Webinars sync failed: ${(error as Error).message}`)
        this.logError('syncWebinars', error as Error)
      }

      try {
        const recordingsResult = await this.syncRecordings(lastSyncTime)
        totalProcessed += recordingsResult.processed,
        totalSkipped += recordingsResult.skipped
      } catch (error) {
        errors.push(`Recordings sync failed: ${(error as Error).message}`)
        this.logError('syncRecordings', error as Error)
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
      throw new SyncError('Zoom sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Zoom webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'zoom.meeting.created':
        case 'zoom.meeting.updated':
        case 'zoom.meeting.deleted':
        case 'zoom.meeting.started':
        case 'zoom.meeting.ended':
          await this.handleMeetingWebhook(payload.data)
          break
        case 'zoom.webinar.created':
        case 'zoom.webinar.updated':
        case 'zoom.webinar.started':
        case 'zoom.webinar.ended':
          await this.handleWebinarWebhook(payload.data)
          break
        case 'zoom.recording.completed':
        case 'zoom.recording.transcript_completed':
          await this.handleRecordingWebhook(payload.data)
          break
        case 'zoom.participant.joined':
        case 'zoom.participant.left':
          await this.handleParticipantWebhook(payload.data)
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
      console.error('Error in zoom.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Zoom webhook signature validation would go here
    // This would use the webhook secret to verify the signature,
    return true
  }

  // Private sync methods
  private async syncMeetings(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let queryParams = '?page_size=300&type=scheduled'
      if (lastSyncTime) {
        queryParams += `&from=${lastSyncTime.toISOString().split('T')[0]}`
      }

      const meetings = await this.executeWithProtection('sync.meetings', async () => {
        return this.makeApiCall(`/users/me/meetings${queryParams}`, 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const meeting of meetings.meetings || []) {
        try {
          if (lastSyncTime && meeting.created_at) {
            const createdTime = new Date(meeting.created_at)
            if (createdTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processMeeting(meeting)
          processed++
        }
    } catch (error) {
          this.logError('syncMeetings', error as Error, { meetingId: meeting.id })
          skipped++
        }

        catch (error) {
          console.error('Error in zoom.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncMeetings', error as Error),
      throw error
    }

  private async syncWebinars(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let queryParams = '?page_size=300'
      if (lastSyncTime) {
        queryParams += `&from=${lastSyncTime.toISOString().split('T')[0]}`
      }

      const webinars = await this.executeWithProtection('sync.webinars', async () => {
        return this.makeApiCall(`/users/me/webinars${queryParams}`, 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const webinar of webinars.webinars || []) {
        try {
          if (lastSyncTime && webinar.created_at) {
            const createdTime = new Date(webinar.created_at)
            if (createdTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processWebinar(webinar)
          processed++
        }
    } catch (error) {
          this.logError('syncWebinars', error as Error, { webinarId: webinar.id })
          skipped++
        }

        catch (error) {
          console.error('Error in zoom.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncWebinars', error as Error),
      throw error
    }

  private async syncRecordings(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const fromDate =
        lastSyncTime?.toISOString().split('T')[0] ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 30 days
      const toDate = new Date().toISOString().split('T')[0]

      const recordings = await this.executeWithProtection('sync.recordings', async () => {
        return this.makeApiCall(
          `/users/me/recordings?from=${fromDate}&to=${toDate}&page_size=300`,
          'GET',
        )
      })

      let processed = 0
      let skipped = 0

      for (const meetingRecording of recordings.meetings || []) {
        try {
          await this.processRecording(meetingRecording)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncRecordings', error as Error, { meetingUuid: meetingRecording.uuid })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncRecordings', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in zoom.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processMeeting(meeting: unknown): Promise<void> {
    this.logInfo('processMeeting', `Processing meeting: ${meeting.topic}`, {
      meetingId: meeting.id,
      startTime: meeting.start_time
      duration: meeting.duration,
      type: meeting.type
      status: meeting.status
    })
  }

  private async processWebinar(webinar: unknown): Promise<void> {
    this.logInfo('processWebinar', `Processing webinar: ${webinar.topic}`, {
      webinarId: webinar.id,
      startTime: webinar.start_time
      duration: webinar.duration,
      status: webinar.status
    })
  }

  private async processRecording(recording: unknown): Promise<void> {
    this.logInfo('processRecording', `Processing recording: ${recording.topic}`, {
      meetingUuid: recording.uuid,
      recordingStart: recording.start_time
      totalSize: recording.total_size,
      recordingCount: recording.recording_count
    })
  }

  // Private webhook handlers
  private async handleMeetingWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleMeetingWebhook', 'Processing meeting webhook', data)
  }

  private async handleWebinarWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleWebinarWebhook', 'Processing webinar webhook', data)
  }

  private async handleRecordingWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleRecordingWebhook', 'Processing recording webhook', data)
  }

  private async handleParticipantWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleParticipantWebhook', 'Processing participant webhook', data)
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
      'Content-Type': 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Zoom API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    return (response as Response).json()
  }

  // Public API methods
  async getCurrentUser(): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_current_user', async () => {
        return this.makeApiCall('/users/me', 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getCurrentUser', error as Error)
      throw new Error(`Failed to get current user: ${(error as Error).message}`)
    }

  async createMeeting(meetingData: {,
    topic: string
    type?: number
    start_time?: string
    duration?: number
    timezone?: string
    password?: string
    agenda?: string
    settings?: Record<string, unknown>
  }): Promise<ApiResponse> {
    try {
      const defaultMeetingData = {
        type: 2, // Scheduled meeting
        timezone: 'UTC',
        settings: {
          host_video: true,
          participant_video: true
          join_before_host: false,
          mute_upon_entry: true
          watermark: false,
          use_pmi: false
          approval_type: 2,
          audio: 'both'
          auto_recording: 'none'
        },
        ...meetingData
      }

      const _response = await this.executeWithProtection('api.create_meeting', async () => {
        return this.makeApiCall('/users/me/meetings', 'POST', defaultMeetingData)
      }),

      return response
    } catch (error) {
      this.logError('createMeeting', error as Error)
      throw new Error(`Failed to create meeting: ${(error as Error).message}`)
    }

  async getMeeting(meetingId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_meeting', async () => {
        return this.makeApiCall(`/meetings/${meetingId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getMeeting', error as Error)
      throw new Error(`Failed to get meeting: ${(error as Error).message}`)
    }

  async updateMeeting(meetingId: string, updateData: unknown): Promise<void> {
    try {
      await this.executeWithProtection('api.update_meeting', async () => {
        return this.makeApiCall(`/meetings/${meetingId}`, 'PUT', updateData)
      })
    } catch (error) {
      this.logError('updateMeeting', error as Error)
      throw new Error(`Failed to update meeting: ${(error as Error).message}`)
    }

  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_meeting', async () => {
        return this.makeApiCall(`/meetings/${meetingId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteMeeting', error as Error)
      throw new Error(`Failed to delete meeting: ${(error as Error).message}`)
    }

  async listMeetings(
    type: 'scheduled' | 'live' | 'upcoming' = 'scheduled'
    pageSize = 30,
  ): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_meetings', async () => {
        return this.makeApiCall(`/users/me/meetings?type=${type}&page_size=${pageSize}`, 'GET')
      })

      return (response as Response).meetings || []
    } catch (error) {
      this.logError('listMeetings', error as Error)
      throw new Error(`Failed to list meetings: ${(error as Error).message}`)
    }

  async getMeetingParticipants(meetingUuid: string, pageSize = 30): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection(
        'api.get_meeting_participants',
        async () => {
          return this.makeApiCall(
            `/report/meetings/${meetingUuid}/participants?page_size=${pageSize}`,
            'GET',
          )
        },
      )
  }

      return (response as Response).participants || []
    } catch (error) {
      this.logError('getMeetingParticipants', error as Error)
      throw new Error(`Failed to get meeting participants: ${(error as Error).message}`)
    }

  async createWebinar(webinarData: {,
    topic: string
    type?: number
    start_time?: string
    duration?: number
    timezone?: string
    password?: string
    agenda?: string
    settings?: Record<string, unknown>
  }): Promise<ApiResponse> {
    try {
      const defaultWebinarData = {
        type: 5, // Webinar
        timezone: 'UTC',
        settings: {
          host_video: true,
          panelists_video: true
          practice_session: false,
          hd_video: false
          approval_type: 2,
          audio: 'both'
          auto_recording: 'none',
          registrants_email_notification: true
        },
        ...webinarData
      }

      const _response = await this.executeWithProtection('api.create_webinar', async () => {
        return this.makeApiCall('/users/me/webinars', 'POST', defaultWebinarData)
      }),

      return response
    } catch (error) {
      this.logError('createWebinar', error as Error)
      throw new Error(`Failed to create webinar: ${(error as Error).message}`)
    }

  async getWebinar(webinarId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_webinar', async () => {
        return this.makeApiCall(`/webinars/${webinarId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getWebinar', error as Error)
      throw new Error(`Failed to get webinar: ${(error as Error).message}`)
    }

  async listWebinars(pageSize = 30): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_webinars', async () => {
        return this.makeApiCall(`/users/me/webinars?page_size=${pageSize}`, 'GET')
      })
  }

      return (response as Response).webinars || []
    } catch (error) {
      this.logError('listWebinars', error as Error)
      throw new Error(`Failed to list webinars: ${(error as Error).message}`)
    }

  async getMeetingRecordings(meetingId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_meeting_recordings', async () => {
        return this.makeApiCall(`/meetings/${meetingId}/recordings`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getMeetingRecordings', error as Error)
      throw new Error(`Failed to get meeting recordings: ${(error as Error).message}`)
    }

  async listCloudRecordings(from?: string, to?: string, pageSize = 30): Promise<unknown[]> {
    try {
      const fromDate =
        from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const toDate = to || new Date().toISOString().split('T')[0]
  }

      const _response = await this.executeWithProtection('api.list_cloud_recordings', async () => {
        return this.makeApiCall(
          `/users/me/recordings?from=${fromDate}&to=${toDate}&page_size=${pageSize}`,
          'GET',
        )
      })

      return (response as Response).meetings || []
    } catch (error) {
      this.logError('listCloudRecordings', error as Error)
      throw new Error(`Failed to list cloud recordings: ${(error as Error).message}`)
    }

  async deleteRecording(meetingId: string, action: 'trash' | 'delete' = 'trash'): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_recording', async () => {
        return this.makeApiCall(`/meetings/${meetingId}/recordings?action=${action}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteRecording', error as Error)
      throw new Error(`Failed to delete recording: ${(error as Error).message}`)
    }

  async getUserSettings(): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_user_settings', async () => {
        return this.makeApiCall('/users/me/settings', 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getUserSettings', error as Error)
      throw new Error(`Failed to get user settings: ${(error as Error).message}`)
    }

  async updateUserSettings(settings: unknown): Promise<void> {
    try {
      await this.executeWithProtection('api.update_user_settings', async () => {
        return this.makeApiCall('/users/me/settings', 'PUT', settings)
      })
    } catch (error) {
      this.logError('updateUserSettings', error as Error)
      throw new Error(`Failed to update user settings: ${(error as Error).message}`)
    }

  async getDashboardMeetings(
    from: string,
    to: string
    type: 'past' | 'pastOne' | 'live' = 'past'
    pageSize = 30,
  ): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_dashboard_meetings', async () => {
        return this.makeApiCall(
          `/report/users/me/meetings?from=${from}&to=${to}&type=${type}&page_size=${pageSize}`,
          'GET',
        )
      })

      return (response as Response).meetings || []
    } catch (error) {
      this.logError('getDashboardMeetings', error as Error)
      throw new Error(`Failed to get dashboard meetings: ${(error as Error).message}`)
    }

  async getMeetingPolls(meetingId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_meeting_polls', async () => {
        return this.makeApiCall(`/meetings/${meetingId}/polls`, 'GET')
      })
  }

      return (response as Response).polls || []
    } catch (error) {
      this.logError('getMeetingPolls', error as Error)
      throw new Error(`Failed to get meeting polls: ${(error as Error).message}`)
    }

  async createMeetingPoll(
    meetingId: string,
    pollData: {
      title: string,
      questions: Array<{
        name: string,
        type: 'single' | 'multiple'
        answers: string[]
      }>
    },
  ): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.create_meeting_poll', async () => {
        return this.makeApiCall(`/meetings/${meetingId}/polls`, 'POST', pollData)
      }),

      return response
    } catch (error) {
      this.logError('createMeetingPoll', error as Error)
      throw new Error(`Failed to create meeting poll: ${(error as Error).message}`)
    }

}