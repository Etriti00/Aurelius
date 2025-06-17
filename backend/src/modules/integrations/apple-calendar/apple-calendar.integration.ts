import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig
} from '../base/integration.interface'
import { ApiResponse, GenericWebhookPayload } from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface AppleCalendarEvent {
  id: string,
  title: string
  description?: string
  location?: string
  startDate: Date,
  endDate: Date
  isAllDay: boolean
  recurrenceRule?: string
  attendees?: AppleCalendarAttendee[]
  alarms?: AppleCalendarAlarm[]
  calendar: string
  url?: string
  created: Date,
  modified: Date
}

interface AppleCalendarAttendee {
  name?: string
  email: string,
  status: 'pending' | 'accepted' | 'declined' | 'tentative'
  role: 'required' | 'optional' | 'chair'
}

interface AppleCalendarAlarm {
  type: 'display' | 'audio' | 'email',
  trigger: string // ISO duration like "-PT15M" for 15 minutes before
  description?: string
}

interface AppleCalendar {
  id: string,
  title: string
  description?: string
  color: string,
  isDefault: boolean
  isReadOnly: boolean,
  timeZone: string
  type: 'local' | 'subscribed' | 'exchange' | 'caldav'
}

export class AppleCalendarIntegration extends BaseIntegration {
  readonly provider = 'apple-calendar'
  readonly name = 'Apple Calendar'
  readonly version = '1.0.0'

  private eventsCache: Map<string, AppleCalendarEvent> = new Map()
  private calendarsCache: Map<string, AppleCalendar> = new Map()
  private lastSyncTimestamp: Date | null = null

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
      this.logInfo('authenticate', 'Authenticating Apple Calendar integration')
  }

      // Apple Calendar uses CloudKit for third-party access
      // This requires Apple Developer credentials and CloudKit setup
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.makeCloudKitRequest('GET', '/database/1/_default/zones/list')
      })

      if (!response.zones) {
        throw new AuthenticationError('Failed to authenticate with Apple CloudKit')
      }

      this.logInfo('authenticate', 'Apple Calendar integration authenticated successfully')

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: ['cloudkit-calendar']
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

      // Apple tokens are typically long-lived, but we simulate refresh
      const _response = await this.executeWithProtection('auth.refresh', async () => {
        return this.makeCloudKitRequest('POST', '/auth/refresh', { refreshToken: this.refreshTokenValue })
      })

      return {
        success: true,
        accessToken: response.accessToken || this.accessToken
        refreshToken: response.refreshToken || this.refreshTokenValue,
        expiresAt: response.expiresAt ? new Date(response.expiresAt) : undefined
        scope: ['cloudkit-calendar']
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      await this.executeWithProtection('auth.revoke', async () => {
        return this.makeCloudKitRequest('POST', '/auth/revoke', { token: this.accessToken })
      }),
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _response = await this.executeWithProtection('connection.test', async () => {
        return this.makeCloudKitRequest('GET', '/database/1/_default/zones/list')
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
            resetTime: new Date(Date.now() + 3600000)
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: 'Connection test failed: ' + (error as Error).message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Calendar Management',
        description: 'Create, read, update, and delete calendars',
        enabled: true,
        requiredScopes: ['cloudkit-calendar']
        methods: ['getCalendars', 'createCalendar', 'updateCalendar', 'deleteCalendar']
      },
      {
        name: 'Event Management',
        description: 'Comprehensive event CRUD operations with rich metadata'
        enabled: true,
        requiredScopes: ['cloudkit-calendar']
        methods: ['getEvents', 'createEvent', 'updateEvent', 'deleteEvent', 'searchEvents']
      },
      {
        name: 'Scheduling & Availability',
        description: 'Check availability and find meeting times'
        enabled: true,
        requiredScopes: ['cloudkit-calendar']
        methods: ['checkAvailability', 'findMeetingTimes', 'getFreeBusyInfo']
      },
      {
        name: 'Attendee Management',
        description: 'Manage event attendees and invitations'
        enabled: true,
        requiredScopes: ['cloudkit-calendar']
        methods: ['addAttendee', 'removeAttendee', 'updateAttendeeStatus']
      },
      {
        name: 'Recurring Events',
        description: 'Handle recurring events and exceptions'
        enabled: true,
        requiredScopes: ['cloudkit-calendar']
        methods: ['createRecurringEvent', 'updateRecurrenceRule', 'createException']
      },
      {
        name: 'Reminders & Alarms',
        description: 'Manage event alarms and notifications'
        enabled: true,
        requiredScopes: ['cloudkit-calendar']
        methods: ['addAlarm', 'removeAlarm', 'updateAlarmSettings']
      },
      {
        name: 'Time Zone Support',
        description: 'Handle multiple time zones and conversions'
        enabled: true,
        requiredScopes: ['cloudkit-calendar']
        methods: ['convertTimeZone', 'getTimeZoneInfo', 'setDefaultTimeZone']
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
      this.logInfo('syncData', 'Starting Apple Calendar sync', { lastSyncTime })
  }

      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []

      try {
        // Sync calendars first
        const calendarsResult = await this.syncCalendars()
        totalProcessed += calendarsResult.processed
        totalSkipped += calendarsResult.skipped

        // Sync events from all calendars
        const eventsResult = await this.syncEvents(lastSyncTime)
        totalProcessed += eventsResult.processed
        totalSkipped += eventsResult.skipped

        // Update cache timestamp
        this.lastSyncTimestamp = new Date()

        this.logInfo('syncData', 'Apple Calendar sync completed successfully', {
          totalProcessed,
          totalSkipped,
          errors: errors.length
        })
      }
    } catch (error) {
        errors.push(`Sync failed: ${(error as Error).message}`)
        this.logError('syncData', error as Error)
      }

      catch (error) {
        console.error('Error in apple-calendar.integration.ts:', error)
        throw error
      }
      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider
          lastSyncTime,
          calendarsInCache: this.calendarsCache.size,
          eventsInCache: this.eventsCache.size
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Apple Calendar sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return this.lastSyncTimestamp
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Apple Calendar webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Handle CloudKit change notifications
      switch (payload._event) {
        case 'calendar.created':
        case 'calendar.updated':
          await this.handleCalendarUpdate(payload.data)
          break
        case 'calendar.deleted':
          await this.handleCalendarDelete(payload.data)
          break
        case 'event.created':
        case 'event.updated':
          await this.handleEventUpdate(payload.data)
          break
        case 'event.deleted':
          await this.handleEventDelete(payload.data)
          break
        default:
          this.logInfo('handleWebhook', 'Unhandled webhook event', { event: payload._event })
      }
      }

      // Track webhook metrics
      if (this.metricsService) {
        this.metricsService.track(
          this.userId,
          this.integrationId || `apple-calendar-${this.userId}`,
          this.provider,
          payload.event,
          200,
        )
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in apple-calendar.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      // Apple CloudKit webhook validation
      // This would use the webhook secret from configuration,
      return true // Simplified for now
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // === Private Helper Methods ===

  private async makeCloudKitRequest(
    method: string,
    endpoint: string
    data?: unknown,
  ): Promise<ApiResponse> {
    const baseUrl = this.config?.apiBaseUrl || 'https://api.apple-cloudkit.com/database/1'
    const url = `${baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    }

    const requestOptions: RequestInit = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      throw new Error(`Apple CloudKit API error: ${response.status} ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async syncCalendars(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.makeCloudKitRequest('GET', '/_default/records/query', {
        query: {,
          recordType: 'Calendar'
          filterBy: []
        }
      })

      let processed = 0
      for (const record of response.records || []) {
        try {
          const calendar: AppleCalendar = {,
            id: record.recordName
            title: record.fields.title?.value || 'Untitled Calendar',
            description: record.fields.description?.value
            color: record.fields.color?.value || '#007AFF',
            isDefault: record.fields.isDefault?.value || false
            isReadOnly: record.fields.isReadOnly?.value || false,
            timeZone: record.fields.timeZone?.value || 'America/New_York'
            type: record.fields.type?.value || 'local'
          }
      }

          this.calendarsCache.set(record.recordName, calendar),
          processed++
        }
    } catch (error) {
          this.logError('syncCalendars', error as Error, { recordName: record.recordName })
        }

      return { processed, skipped: 0 }
    } catch (error) {
      this.logError('syncCalendars', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in apple-calendar.integration.ts:', error)
      throw error
    }
  private async syncEvents(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const query: unknown = {,
        recordType: 'Event'
        filterBy: []
      }

      if (lastSyncTime) {
        query.filterBy.push({
          fieldName: 'modifiedTimestamp',
          comparator: 'GREATER_THAN'
          fieldValue: {,
            value: lastSyncTime.getTime()
            type: 'TIMESTAMP'
          }
        })
      }

      const _response = await this.makeCloudKitRequest('GET', '/_default/records/query', {
        query
      })

      let processed = 0
      for (const record of response.records || []) {
        try {
          const event: AppleCalendarEvent = {,
            id: record.recordName
            title: record.fields.title?.value || 'Untitled Event',
            description: record.fields.description?.value
            location: record.fields.location?.value,
            startDate: new Date(record.fields.startDate?.value)
            endDate: new Date(record.fields.endDate?.value),
            isAllDay: record.fields.isAllDay?.value || false
            recurrenceRule: record.fields.recurrenceRule?.value,
            calendar: record.fields.calendar?.value?.recordName || 'default'
            url: record.fields.url?.value,
            created: new Date(record.created.timestamp)
            modified: new Date(record.modified.timestamp),
            attendees: this.parseAttendees(record.fields.attendees?.value)
            alarms: this.parseAlarms(record.fields.alarms?.value)
          }
      }

          this.eventsCache.set(record.recordName, _event),
          processed++
        }
    } catch (error) {
          this.logError('syncEvents', error as Error, { recordName: record.recordName })
        }

      return { processed, skipped: 0 }
    } catch (error) {
      this.logError('syncEvents', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in apple-calendar.integration.ts:', error)
      throw error
    }
  private parseAttendees(attendeesData: unknown[]): AppleCalendarAttendee[] {
    if (!Array.isArray(attendeesData)) return []

    return attendeesData.map(attendee => ({
      name: attendee.name,
      email: attendee.email
      status: attendee.status || 'pending',
      role: attendee.role || 'required'
    }))
  }

  private parseAlarms(alarmsData: unknown[]): AppleCalendarAlarm[] {
    if (!Array.isArray(alarmsData)) return []

    return alarmsData.map(alarm => ({
      type: alarm.type || 'display',
      trigger: alarm.trigger || '-PT15M'
      description: alarm.description
    }))
  }

  private async handleCalendarUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      await this.syncCalendars()
      this.logInfo('handleCalendarUpdate', 'Calendar cache updated', { calendarId: data.id })
    } catch (error) {
      this.logError('handleCalendarUpdate', error as Error)
    }

  private async handleCalendarDelete(data: Record<string, unknown>): Promise<void> {
    try {
      this.calendarsCache.delete(data.id)
      this.logInfo('handleCalendarDelete', 'Calendar removed from cache', { calendarId: data.id })
    } catch (error) {
      this.logError('handleCalendarDelete', error as Error)
    }

  private async handleEventUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      await this.syncEvents()
      this.logInfo('handleEventUpdate', 'Event cache updated', { eventId: data.id })
    } catch (error) {
      this.logError('handleEventUpdate', error as Error)
    }

  private async handleEventDelete(data: Record<string, unknown>): Promise<void> {
    try {
      this.eventsCache.delete(data.id)
      this.logInfo('handleEventDelete', 'Event removed from cache', { eventId: data.id })
    } catch (error) {
      this.logError('handleEventDelete', error as Error)
    }

  // === Public API Methods ===

  async getCalendars(filters?: { type?: string; isReadOnly?: boolean }): Promise<AppleCalendar[]> {
    try {
      await this.executeWithProtection('calendars.list', async () => {
        await this.syncCalendars()
      })
  }

      let calendars = Array.from(this.calendarsCache.values())

      if (filters?.type) {
        calendars = calendars.filter(cal => cal.type === filters.type)
      }

      if (filters?.isReadOnly !== undefined) {
        calendars = calendars.filter(cal => cal.isReadOnly === filters.isReadOnly)
      },

      return calendars
    } catch (error) {
      this.logError('getCalendars', error as Error)
      throw new Error(`Failed to get calendars: ${(error as Error).message}`)
    }

  async createCalendar(calendarData: {,
    title: string
    description?: string
    color?: string,
    timeZone?: string
  }): Promise<string> {
    try {
      return await this.executeWithProtection('calendars.create', async () => {
        const _response = await this.makeCloudKitRequest('POST', '/_default/records/modify', {
          operations: [
            {
              operationType: 'create',
              record: {
                recordType: 'Calendar',
                fields: {
                  title: { value: calendarData.title },
                  description: { value: calendarData.description || '' },
                  color: { value: calendarData.color || '#007AFF' },
                  timeZone: { value: calendarData.timeZone || 'America/New_York' },
                  isDefault: { value: false },
                  isReadOnly: { value: false },
                  type: { value: 'local' }
                }
              }
            },
          ]
        })

        const calendarId = response.records[0].recordName
        this.logInfo('createCalendar', 'Calendar created successfully', { calendarId })

        return calendarId
      })
    } catch (error) {
      this.logError('createCalendar', error as Error)
      throw new Error(`Failed to create calendar: ${(error as Error).message}`)
    }

  async getEvents(filters?: {
    calendarId?: string
    startDate?: Date
    endDate?: Date
    searchText?: string,
    limit?: number
  }): Promise<AppleCalendarEvent[]> {
    try {
      await this.executeWithProtection('events.list', async () => {
        await this.syncEvents()
      })

      let events = Array.from(this.eventsCache.values())

      if (filters?.calendarId) {
        events = events.filter(event => _event.calendar === filters.calendarId)
      }

      if (filters?.startDate) {
        events = events.filter(event => _event.startDate >= filters.startDate)
      }

      if (filters?.endDate) {
        events = events.filter(event => _event.endDate <= filters.endDate)
      }

      if (filters?.searchText) {
        const searchLower = filters.searchText.toLowerCase()
        events = events.filter(
          event =>
            event.title.toLowerCase().includes(searchLower) ||
            event.description?.toLowerCase().includes(searchLower),
        )
      }

      if (filters?.limit) {
        events = events.slice(0, filters.limit)
      }

      return events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    } catch (error) {
      this.logError('getEvents', error as Error)
      throw new Error(`Failed to get events: ${(error as Error).message}`)
    }

  async createEvent(eventData: {,
    title: string
    description?: string
    location?: string
    startDate: Date,
    endDate: Date
    isAllDay?: boolean
    calendarId?: string
    attendees?: AppleCalendarAttendee[],
    alarms?: AppleCalendarAlarm[]
  }): Promise<string> {
    try {
      return await this.executeWithProtection('events.create', async () => {
        const _response = await this.makeCloudKitRequest('POST', '/_default/records/modify', {
          operations: [
            {
              operationType: 'create',
              record: {
                recordType: 'Event',
                fields: {
                  title: { value: eventData.title },
                  description: { value: eventData.description || '' },
                  location: { value: eventData.location || '' },
                  startDate: { value: eventData.startDate.getTime(), type: 'TIMESTAMP' },
                  endDate: { value: eventData.endDate.getTime(), type: 'TIMESTAMP' },
                  isAllDay: { value: eventData.isAllDay || false },
                  calendar: {,
                    value: { recordName: eventData.calendarId || 'default' },
                    type: 'REFERENCE'
                  },
                  attendees: { value: eventData.attendees || [] },
                  alarms: { value: eventData.alarms || [] }
                }
              }
            },
          ]
        })

        const eventId = response.records[0].recordName
        this.logInfo('createEvent', 'Event created successfully', { eventId })

        return eventId
      })
    } catch (error) {
      this.logError('createEvent', error as Error)
      throw new Error(`Failed to create _event: ${(error as Error).message}`)
    }

  async updateEvent(
    eventId: string,
    updateData: {
      title?: string
      description?: string
      location?: string
      startDate?: Date
      endDate?: Date,
      attendees?: AppleCalendarAttendee[]
    },
  ): Promise<void> {
    try {
      await this.executeWithProtection('events.update', async () => {
        const fields: unknown = {}

        if (updateData.title) fields.title = { value: updateData.title }
        if (updateData.description !== undefined)
          fields.description = { value: updateData.description }
        if (updateData.location !== undefined) fields.location = { value: updateData.location }
        if (updateData.startDate)
          fields.startDate = { value: updateData.startDate.getTime(), type: 'TIMESTAMP' }
        if (updateData.endDate)
          fields.endDate = { value: updateData.endDate.getTime(), type: 'TIMESTAMP' }
        if (updateData.attendees) fields.attendees = { value: updateData.attendees }

        await this.makeCloudKitRequest('POST', '/_default/records/modify', {
          operations: [
            {
              operationType: 'update',
              record: {
                recordName: eventId,
                recordType: 'Event'
                fields
              }
            },
          ]
        })

        this.logInfo('updateEvent', 'Event updated successfully', { eventId })
      })
    } catch (error) {
      this.logError('updateEvent', error as Error)
      throw new Error(`Failed to update _event: ${(error as Error).message}`)
    }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.executeWithProtection('events.delete', async () => {
        await this.makeCloudKitRequest('POST', '/_default/records/modify', {
          operations: [
            {
              operationType: 'delete',
              record: { recordName: eventId }
            },
          ]
        })
  }

        this.eventsCache.delete(eventId)
        this.logInfo('deleteEvent', 'Event deleted successfully', { eventId })
      })
    } catch (error) {
      this.logError('deleteEvent', error as Error)
      throw new Error(`Failed to delete _event: ${(error as Error).message}`)
    }

  async checkAvailability(
    startDate,
    endDate,
    attendeeEmails: string[]
  ): Promise<{
    available: boolean,
    conflicts: AppleCalendarEvent[]
    suggestions: Date[]
  }> {
    try {
      const events = await this.getEvents({
        startDate,
        endDate
      })

      const conflicts = events.filter(event => {
        return event.attendees?.some(attendee => attendeeEmails.includes(attendee.email))
      })

      const available = conflicts.length === 0

      // Generate alternative time suggestions if conflicts exist
      const suggestions: Date[] = []
      if (!available) {
        // Simple algorithm to suggest nearby available times
        for (let i = 1; i <= 3; i++) {
          const suggestedStart = new Date(startDate.getTime() + i * 30 * 60 * 1000) // 30 minutes later
          suggestions.push(suggestedStart)
        }
      }

      return {
        available,
        conflicts,
        suggestions
      }
    } catch (error) {
      this.logError('checkAvailability', error as Error)
      throw new Error(`Failed to check availability: ${(error as Error).message}`)
    }

}
catch (error) {
  console.error('Error in apple-calendar.integration.ts:', error)
  throw error
}