import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
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

export class GoogleCalendarIntegration extends BaseIntegration {
  readonly provider = 'google-calendar'
  readonly name = 'Google Calendar'
  readonly version = '1.0.0'

  private oauth2Client: OAuth2Client
  private calendar: unknown

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

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting calendar list
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.calendar.calendarList.list({ maxResults: 1 })
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: ['https://www.googleapis.com/auth/calendar']
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
        throw new AuthenticationError('No refresh token available')
      }
  }

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      this.oauth2Client.setCredentials(credentials)
      this.accessToken = credentials.access_token!

      return {
        success: true,
        accessToken: credentials.access_token!
        refreshToken: credentials.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(credentials.expiry_date!)
        scope: credentials.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in google-calendar.integration.ts:', error)
      throw error
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
      await this.executeWithProtection('connection.test', async () => {
        return this.calendar.calendarList.list({ maxResults: 1 })
      })
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
            limit: 1000,
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
        name: 'Calendar Events',
        description: 'Create, read, update, and delete calendar events',
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/calendar']
      },
      {
        name: 'Calendar Management',
        description: 'Manage calendar settings and sharing'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/calendar']
      },
      {
        name: 'Event Reminders',
        description: 'Set and manage event reminders'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/calendar']
      },
      {
        name: 'Recurring Events',
        description: 'Create and manage recurring events'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/calendar']
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

      this.logInfo('syncData', 'Starting Google Calendar sync', { lastSyncTime })

      // Sync calendars
      try {
        const calendarsResult = await this.syncCalendars()
        totalProcessed += calendarsResult.processed,
        totalSkipped += calendarsResult.skipped
      }
    } catch (error) {
        errors.push(`Calendars sync failed: ${(error as Error).message}`)
        this.logError('syncCalendars', error as Error)
      }

      catch (error) {
        console.error('Error in google-calendar.integration.ts:', error)
        throw error
      }
      // Sync events
      try {
        const eventsResult = await this.syncEvents(lastSyncTime)
        totalProcessed += eventsResult.processed,
        totalSkipped += eventsResult.skipped
      } catch (error) {
        errors.push(`Events sync failed: ${(error as Error).message}`)
        this.logError('syncEvents', error as Error)
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
      throw new SyncError('Google Calendar sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    // This would typically be stored in database,
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Google Calendar webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'calendar.event.created':
        case 'calendar.event.updated':
        case 'calendar.event.deleted':
          await this.handleEventWebhook(payload.data)
          break
        case 'calendar.acl.updated':
          await this.handleAclWebhook(payload.data)
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
      console.error('Error in google-calendar.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Google Calendar uses push notifications with verification tokens
    // Implementation would depend on the specific webhook setup,
    return true
  }

  // Private sync methods
  private async syncCalendars(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.executeWithProtection('sync.calendars', async () => {
        return this.calendar.calendarList.list({
          maxResults: 250,
          showHidden: false
        })
      })

      const calendars = response.data.items || []
      let processed = 0
      let skipped = 0

      for (const calendar of calendars) {
        try {
          await this.processCalendar(calendar)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncCalendars', error as Error, { calendarId: calendar.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncCalendars', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-calendar.integration.ts:', error)
      throw error
    }
  private async syncEvents(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const timeMin =
        lastSyncTime?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      const timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ahead

      // Get all calendars first
      const calendarsResponse = await this.executeWithProtection(
        'sync.events.calendars',
        async () => {
          return this.calendar.calendarList.list({ maxResults: 50 })
        },
      )

      const calendars = calendarsResponse.data.items || []
      let totalProcessed = 0
      let totalSkipped = 0

      for (const calendar of calendars) {
        try {
          // Skip calendars we don't have read access to
          if (!calendar.accessRole || calendar.accessRole === 'freeBusyReader') {
            continue
          }
      }

          const eventsResponse = await this.executeWithProtection(
            `sync.events.${calendar.id}`,
            async () => {
              return this.calendar.events.list({
                calendarId: calendar.id
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime'
                maxResults: 2500,
                updatedMin: lastSyncTime?.toISOString()
              })
            },
          )

          const events = eventsResponse.data.items || []
          let processed = 0
          let skipped = 0

          for (const _event of events) {
            try {
              await this.processEvent(_event, calendar),
              processed++
            }
          }
    } catch (error) {
              this.logError('syncEvents', error as Error, {
                eventId: event.id,
                calendarId: calendar.id
              }),
              skipped++
            }

          totalProcessed += processed
          totalSkipped += skipped

          this.logInfo('syncEvents', `Synced calendar ${calendar.summary}`, {
            calendarId: calendar.id
            processed,
            skipped
          })
        }
    } catch (error) {
          this.logError('syncEvents', error as Error, { calendarId: calendar.id })
          totalSkipped++
        }

      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncEvents', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-calendar.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processCalendar(calendar: unknown): Promise<void> {
    this.logInfo('processCalendar', `Processing calendar: ${calendar.summary}`, {
      calendarId: calendar.id,
      accessRole: calendar.accessRole
    })

    // Here you would save the calendar to your database
    // For now, just log the processing
  }

  private async processEvent(_event: unknown, calendar: unknown): Promise<void> {
    this.logInfo('processEvent', `Processing event: ${event.summary}`, {
      eventId: event.id,
      calendarId: calendar.id
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date
    })

    // Here you would save the event to your database
    // For now, just log the processing
  }

  // Private webhook handlers
  private async handleEventWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleEventWebhook', 'Processing _event webhook', data),
    // Handle event changes from webhook
  }

  private async handleAclWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleAclWebhook', 'Processing ACL webhook', data),
    // Handle calendar permission changes
  }

  // Public API methods for calendar operations
  async createEvent(event: {
    calendarId?: string
    summary: string
    description?: string
    start: Date | string,
    end: Date | string
    attendees?: string[]
    location?: string
    reminders?: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> }
    recurrence?: string[]
  }): Promise<string> {
    try {
      const calendarId = event.calendarId || 'primary'

      const startDateTime =
        typeof event.start === 'string' ? event.start : event.start.toISOString()
      const endDateTime = typeof event.end === 'string' ? event.end : event.end.toISOString()

      const eventData = {
        summary: event.summary,
        description: event.description
        start: {,
          dateTime: startDateTime
          timeZone: 'UTC'
        },
        end: {,
          dateTime: endDateTime
          timeZone: 'UTC'
        },
        attendees: event.attendees?.map(email => ({ email })),
        location: event.location,
        reminders: event.reminders
        recurrence: event.recurrence
      }

      const _response = await this.executeWithProtection('api.create_event', async () => {
        return this.calendar.events.insert({
          calendarId,
          requestBody: eventData
        })
      })

      return (response as Response).data.id!
    } catch (error) {
      this.logError('createEvent', error as Error)
      throw new Error(`Failed to create calendar _event: ${(error as Error).message}`)
    }

  async updateEvent(
    eventId: string,
    updates: {
      calendarId?: string
      summary?: string
      description?: string
      start?: Date | string
      end?: Date | string
      attendees?: string[],
      location?: string
    },
  ): Promise<void> {
    try {
      const calendarId = updates.calendarId || 'primary'

      const eventData: unknown = {}

      if (updates.summary) eventData.summary = updates.summary
      if (updates.description) eventData.description = updates.description
      if (updates.location) eventData.location = updates.location
      if (updates.attendees) eventData.attendees = updates.attendees.map(email => ({ email }))

      if (updates.start) {
        const startDateTime =
          typeof updates.start === 'string' ? updates.start : updates.start.toISOString()
        eventData.start = { dateTime: startDateTime, timeZone: 'UTC' }
      }

      if (updates.end) {
        const endDateTime =
          typeof updates.end === 'string' ? updates.end : updates.end.toISOString()
        eventData.end = { dateTime: endDateTime, timeZone: 'UTC' }
      }

      await this.executeWithProtection('api.update_event', async () => {
        return this.calendar.events.patch({
          calendarId,
          eventId,
          requestBody: eventData
        })
      })
    }
    } catch (error) {
      this.logError('updateEvent', error as Error)
      throw new Error(`Failed to update calendar _event: ${(error as Error).message}`)
    }

  async deleteEvent(eventId: string, calendarId = 'primary'): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_event', async () => {
        return this.calendar.events.delete({
          calendarId,
          eventId
        })
      })
    }
    } catch (error) {
      this.logError('deleteEvent', error as Error)
      throw new Error(`Failed to delete calendar _event: ${(error as Error).message}`)
    }

  async getEvent(eventId: string, calendarId = 'primary'): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_event', async () => {
        return this.calendar.events.get({
          calendarId,
          eventId
        })
      })
  }

      return (response as Response).data
    }
    } catch (error) {
      this.logError('getEvent', error as Error)
      throw new Error(`Failed to get calendar _event: ${(error as Error).message}`)
    }

  async listEvents(
    options: {
      calendarId?: string
      timeMin?: Date
      timeMax?: Date
      maxResults?: number,
      query?: string
    } = {},
  ): Promise<unknown[]> {
    try {
      const { calendarId = 'primary', timeMin, timeMax, maxResults = 250, query } = options

      const _response = await this.executeWithProtection('api.list_events', async () => {
        return this.calendar.events.list({
          calendarId,
          timeMin: timeMin?.toISOString(),
          timeMax: timeMax?.toISOString()
          maxResults,
          singleEvents: true,
          orderBy: 'startTime'
          q: query
        })
      })

      return (response as Response).data.items || []
    }
    } catch (error) {
      this.logError('listEvents', error as Error)
      throw new Error(`Failed to list calendar events: ${(error as Error).message}`)
    }

  async getFreeBusy(calendars: string[], timeMin: Date, timeMax: Date): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.freebusy', async () => {
        return this.calendar.freebusy.query({
          requestBody: {,
            timeMin: timeMin.toISOString()
            timeMax: timeMax.toISOString(),
            items: calendars.map(id => ({ id }))
          }
        })
      })
  }

      return (response as Response).data
    }
    } catch (error) {
      this.logError('getFreeBusy', error as Error)
      throw new Error(`Failed to get free/busy information: ${(error as Error).message}`)
    }

  async listCalendars(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_calendars', async () => {
        return this.calendar.calendarList.list({ maxResults: 250 })
      })
  }

      return (response as Response).data.items || []
    }
    } catch (error) {
      this.logError('listCalendars', error as Error)
      throw new Error(`Failed to list calendars: ${(error as Error).message}`)
    }

}
catch (error) {
  console.error('Error in google-calendar.integration.ts:', error)
  throw error
}