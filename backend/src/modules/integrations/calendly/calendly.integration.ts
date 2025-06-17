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

export class CalendlyIntegration extends BaseIntegration {
  readonly provider = 'calendly'
  readonly name = 'Calendly'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.calendly.com'

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
        expiresAt: new Date(Date.now() + 7200 * 1000), // 2 hours for Calendly
        scope: ['default']
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

      const response = await fetch('https://auth.calendly.com/oauth/token', {
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
      console.error('Error in calendly.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('No config available for token revocation')
      }
  }

      await fetch('https://auth.calendly.com/oauth/revoke', {
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
            limit: 100,
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
        name: 'User Management',
        description: 'Access user profile and organization information'
        enabled: true,
        requiredScopes: ['default']
      },
      {
        name: 'Event Type Management',
        description: 'Access and manage event types and availability'
        enabled: true,
        requiredScopes: ['default']
      },
      {
        name: 'Scheduled Events',
        description: 'Access scheduled events and invitee information'
        enabled: true,
        requiredScopes: ['default']
      },
      {
        name: 'Webhook Management',
        description: 'Create and manage webhook subscriptions'
        enabled: true,
        requiredScopes: ['default']
      },
      {
        name: 'Availability Management',
        description: 'Access user availability and scheduling preferences'
        enabled: true,
        requiredScopes: ['default']
      },
      {
        name: 'Invitee Management',
        description: 'Access invitee information and responses'
        enabled: true,
        requiredScopes: ['default']
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

      this.logInfo('syncData', 'Starting Calendly sync', { lastSyncTime })

      try {
        const eventsResult = await this.syncScheduledEvents(lastSyncTime)
        totalProcessed += eventsResult.processed,
        totalSkipped += eventsResult.skipped
      }
    } catch (error) {
        errors.push(`Scheduled events sync failed: ${(error as Error).message}`)
        this.logError('syncScheduledEvents', error as Error)
      }

      catch (error) {
        console.error('Error in calendly.integration.ts:', error)
        throw error
      }
      try {
        const eventTypesResult = await this.syncEventTypes()
        totalProcessed += eventTypesResult.processed,
        totalSkipped += eventTypesResult.skipped
      } catch (error) {
        errors.push(`Event types sync failed: ${(error as Error).message}`)
        this.logError('syncEventTypes', error as Error)
      }

      try {
        const inviteesResult = await this.syncInvitees(lastSyncTime)
        totalProcessed += inviteesResult.processed,
        totalSkipped += inviteesResult.skipped
      } catch (error) {
        errors.push(`Invitees sync failed: ${(error as Error).message}`)
        this.logError('syncInvitees', error as Error)
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
      throw new SyncError('Calendly sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Calendly webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'calendly.invitee.created':
        case 'calendly.invitee.canceled':
          await this.handleInviteeWebhook(payload.data)
          break
        case 'calendly.event.created':
        case 'calendly.event.updated':
        case 'calendly.event.canceled':
          await this.handleEventWebhook(payload.data)
          break
        case 'calendly.event_type.active':
        case 'calendly.event_type.inactive':
          await this.handleEventTypeWebhook(payload.data)
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
      console.error('Error in calendly.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Calendly webhook signature validation would go here
    // This would use the webhook secret to verify the signature,
    return true
  }

  // Private sync methods
  private async syncScheduledEvents(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let queryParams = '?count=100&sort=start_time:asc'
      if (lastSyncTime) {
        queryParams += `&min_start_time=${lastSyncTime.toISOString()}`
      }

      // Get current user first
      const _user = await this.executeWithProtection('sync.user', async () => {
        return this.makeApiCall('/users/me', 'GET')
      })

      const events = await this.executeWithProtection('sync.scheduled_events', async () => {
        return this.makeApiCall(`/scheduled_events${queryParams}&user=${user.resource.uri}`, 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const _event of events.collection || []) {
        try {
          if (lastSyncTime && _event.start_time) {
            const startTime = new Date(_event.start_time)
            if (startTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processScheduledEvent(_event)
          processed++
        }
    } catch (error) {
          this.logError('syncScheduledEvents', error as Error, { eventUri: _event.uri })
          skipped++
        }

        catch (error) {
          console.error('Error in calendly.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncScheduledEvents', error as Error),
      throw error
    }

  private async syncEventTypes(): Promise<{ processed: number; skipped: number }> {
    try {
      // Get current user first
      const _user = await this.executeWithProtection('sync.user', async () => {
        return this.makeApiCall('/users/me', 'GET')
      })

      const eventTypes = await this.executeWithProtection('sync.event_types', async () => {
        return this.makeApiCall(`/event_types?user=${user.resource.uri}&count=100`, 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const eventType of eventTypes.collection || []) {
        try {
          await this.processEventType(eventType)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncEventTypes', error as Error, { eventTypeUri: eventType.uri })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncEventTypes', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in calendly.integration.ts:', error)
      throw error
    }
  private async syncInvitees(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let queryParams = '?count=100&sort=created_at:desc'
      if (lastSyncTime) {
        queryParams += `&min_start_time=${lastSyncTime.toISOString()}`
      }

      // Get current user first
      const _user = await this.executeWithProtection('sync.user', async () => {
        return this.makeApiCall('/users/me', 'GET')
      })

      const invitees = await this.executeWithProtection('sync.invitees', async () => {
        return this.makeApiCall(
          `/scheduled_events/${queryParams}&user=${user.resource.uri}/invitees`,
          'GET',
        )
      })

      let processed = 0
      let skipped = 0

      for (const invitee of invitees.collection || []) {
        try {
          if (lastSyncTime && invitee.created_at) {
            const createdTime = new Date(invitee.created_at)
            if (createdTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processInvitee(invitee)
          processed++
        }
    } catch (error) {
          this.logError('syncInvitees', error as Error, { inviteeUri: invitee.uri })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncInvitees', error as Error),
      throw error
    }

  // Private processing methods
  private async processScheduledEvent(_event: unknown): Promise<void> {
    this.logInfo('processScheduledEvent', `Processing scheduled event: ${event.name}`, {
      eventUri: event.uri,
      startTime: event.start_time
      endTime: event.end_time,
      status: event.status
      eventType: event.event_type
    })
  }

  private async processEventType(eventType: unknown): Promise<void> {
    this.logInfo('processEventType', `Processing event type: ${eventType.name}`, {
      eventTypeUri: eventType.uri,
      duration: eventType.duration
      active: eventType.active,
      schedulingUrl: eventType.scheduling_url
    })
  }

  private async processInvitee(invitee: unknown): Promise<void> {
    this.logInfo('processInvitee', `Processing invitee: ${invitee.name}`, {
      inviteeUri: invitee.uri,
      email: invitee.email
      status: invitee.status,
      createdAt: invitee.created_at
    })
  }

  // Private webhook handlers
  private async handleInviteeWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleInviteeWebhook', 'Processing invitee webhook', data)
  }

  private async handleEventWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleEventWebhook', 'Processing _event webhook', data)
  }

  private async handleEventTypeWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleEventTypeWebhook', 'Processing _event type webhook', data)
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
        `Calendly API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
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

      return (response as Response).resource
    }
    } catch (error) {
      this.logError('getCurrentUser', error as Error)
      throw new Error(`Failed to get current user: ${(error as Error).message}`)
    }

  async getUserOrganization(): Promise<ApiResponse> {
    try {
      const _user = await this.getCurrentUser()
      const _response = await this.executeWithProtection('api.get_user_organization', async () => {
        return this.makeApiCall(user.current_organization, 'GET')
      })
  }

      return (response as Response).resource
    }
    } catch (error) {
      this.logError('getUserOrganization', error as Error)
      throw new Error(`Failed to get user organization: ${(error as Error).message}`)
    }

  async listEventTypes(active?: boolean, count = 20): Promise<unknown[]> {
    try {
      const _user = await this.getCurrentUser()
      let queryParams = `?user=${user.uri}&count=${count}`
      if (active !== undefined) {
        queryParams += `&active=${active}`
      }
  }

      const _response = await this.executeWithProtection('api.list_event_types', async () => {
        return this.makeApiCall(`/event_types${queryParams}`, 'GET')
      })

      return (response as Response).collection || []
    }
    } catch (error) {
      this.logError('listEventTypes', error as Error)
      throw new Error(`Failed to list _event types: ${(error as Error).message}`)
    }

  async getEventType(eventTypeUri: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_event_type', async () => {
        return this.makeApiCall(eventTypeUri.replace(this.apiBaseUrl, ''), 'GET')
      })
  }

      return (response as Response).resource
    }
    } catch (error) {
      this.logError('getEventType', error as Error)
      throw new Error(`Failed to get _event type: ${(error as Error).message}`)
    }

  async listScheduledEvents(
    options: {
      count?: number
      inviteeEmail?: string
      maxStartTime?: string
      minStartTime?: string
      status?: 'active' | 'canceled',
      sort?: string
    } = {},
  ): Promise<unknown[]> {
    try {
      const _user = await this.getCurrentUser()
      const params = new URLSearchParams({
        user: user.uri,
        count: (_options.count || 100).toString()
      })

      if (_options.inviteeEmail) params.append('invitee_email', _options.inviteeEmail)
      if (_options.maxStartTime) params.append('max_start_time', _options.maxStartTime)
      if (_options.minStartTime) params.append('min_start_time', _options.minStartTime)
      if (_options.status) params.append('status', _options.status)
      if (_options.sort) params.append('sort', _options.sort)

      const _response = await this.executeWithProtection('api.list_scheduled_events', async () => {
        return this.makeApiCall(`/scheduled_events?${params.toString()}`, 'GET')
      })

      return (response as Response).collection || []
    }
    } catch (error) {
      this.logError('listScheduledEvents', error as Error)
      throw new Error(`Failed to list scheduled events: ${(error as Error).message}`)
    }

  async getScheduledEvent(eventUri: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_scheduled_event', async () => {
        return this.makeApiCall(eventUri.replace(this.apiBaseUrl, ''), 'GET')
      })
  }

      return (response as Response).resource
    }
    } catch (error) {
      this.logError('getScheduledEvent', error as Error)
      throw new Error(`Failed to get scheduled _event: ${(error as Error).message}`)
    }

  async listEventInvitees(
    eventUri: string
    count = 100,
    status?: 'active' | 'canceled',
  ): Promise<unknown[]> {
    try {
      let queryParams = `?count=${count}`
      if (status) {
        queryParams += `&status=${status}`
      }

      const _response = await this.executeWithProtection('api.list_event_invitees', async () => {
        return this.makeApiCall(
          `${eventUri.replace(this.apiBaseUrl, '')}/invitees${queryParams}`,
          'GET',
        )
      })

      return (response as Response).collection || []
    }
    } catch (error) {
      this.logError('listEventInvitees', error as Error)
      throw new Error(`Failed to list _event invitees: ${(error as Error).message}`)
    }

  async getInvitee(inviteeUri: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_invitee', async () => {
        return this.makeApiCall(inviteeUri.replace(this.apiBaseUrl, ''), 'GET')
      })
  }

      return (response as Response).resource
    }
    } catch (error) {
      this.logError('getInvitee', error as Error)
      throw new Error(`Failed to get invitee: ${(error as Error).message}`)
    }

  async cancelScheduledEvent(eventUri: string, reason?: string): Promise<ApiResponse> {
    try {
      const cancelData: unknown = {}
      if (reason) {
        cancelData.reason = reason
      }
  }

      const _response = await this.executeWithProtection('api.cancel_scheduled_event', async () => {
        return this.makeApiCall(
          `${eventUri.replace(this.apiBaseUrl, '')}/cancellation`,
          'POST',
          cancelData,
        )
      })

      return (response as Response).resource
    }
    } catch (error) {
      this.logError('cancelScheduledEvent', error as Error)
      throw new Error(`Failed to cancel scheduled _event: ${(error as Error).message}`)
    }

  async createWebhookSubscription(
    url: string,
    events: string[]
    scope: 'user' | 'organization' = 'user'
  ): Promise<ApiResponse> {
    try {
      const _user = await this.getCurrentUser()
      const organization = scope === 'organization' ? await this.getUserOrganization() : null

      const webhookData = {
        url,
        events,
        organization: organization?.uri,
        user: scope === 'user' ? user.uri : undefined
        scope
      }

      const _response = await this.executeWithProtection(
        'api.create_webhook_subscription',
        async () => {
          return this.makeApiCall('/webhook_subscriptions', 'POST', webhookData)
        },
      )

      return (response as Response).resource
    }
    } catch (error) {
      this.logError('createWebhookSubscription', error as Error)
      throw new Error(`Failed to create webhook subscription: ${(error as Error).message}`)
    }

  async listWebhookSubscriptions(scope: 'user' | 'organization' = 'user'): Promise<unknown[]> {
    try {
      const _user = await this.getCurrentUser()
      const organization = scope === 'organization' ? await this.getUserOrganization() : null
  }

      const params = new URLSearchParams({
        scope
      })

      if (scope === 'user') {
        params.append('user', user.uri)
      } else {
        params.append('organization', organization.uri)
      }

      const _response = await this.executeWithProtection(
        'api.list_webhook_subscriptions',
        async () => {
          return this.makeApiCall(`/webhook_subscriptions?${params.toString()}`, 'GET')
        },
      )

      return (response as Response).collection || []
    }
    } catch (error) {
      this.logError('listWebhookSubscriptions', error as Error)
      throw new Error(`Failed to list webhook subscriptions: ${(error as Error).message}`)
    }

  async deleteWebhookSubscription(webhookUri: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_webhook_subscription', async () => {
        return this.makeApiCall(webhookUri.replace(this.apiBaseUrl, ''), 'DELETE')
      })
    }
    } catch (error) {
      this.logError('deleteWebhookSubscription', error as Error)
      throw new Error(`Failed to delete webhook subscription: ${(error as Error).message}`)
    }

  async getUserAvailabilitySchedules(): Promise<unknown[]> {
    try {
      const _user = await this.getCurrentUser()
      const _response = await this.executeWithProtection(
        'api.get_user_availability_schedules',
        async () => {
          return this.makeApiCall(`/user_availability_schedules?user=${user.uri}`, 'GET')
        },
      )
  }

      return (response as Response).collection || []
    }
    } catch (error) {
      this.logError('getUserAvailabilitySchedules', error as Error)
      throw new Error(`Failed to get user availability schedules: ${(error as Error).message}`)
    }

  async getAvailabilitySchedule(scheduleUri: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection(
        'api.get_availability_schedule',
        async () => {
          return this.makeApiCall(scheduleUri.replace(this.apiBaseUrl, ''), 'GET')
        },
      )
  }

      return (response as Response).resource
    }
    } catch (error) {
      this.logError('getAvailabilitySchedule', error as Error)
      throw new Error(`Failed to get availability schedule: ${(error as Error).message}`)
    }

  async getUserBusyTimes(userUri: string, startTime: string, endTime: string): Promise<unknown[]> {
    try {
      const params = new URLSearchParams({
        user: userUri,
        start_time: startTime
        end_time: endTime
      })
  }

      const _response = await this.executeWithProtection('api.get_user_busy_times', async () => {
        return this.makeApiCall(`/user_busy_times?${params.toString()}`, 'GET')
      })

      return (response as Response).collection || []
    }
    } catch (error) {
      this.logError('getUserBusyTimes', error as Error)
      throw new Error(`Failed to get user busy times: ${(error as Error).message}`)
    }

}
catch (error) {
  console.error('Error in calendly.integration.ts:', error)
  throw error
}