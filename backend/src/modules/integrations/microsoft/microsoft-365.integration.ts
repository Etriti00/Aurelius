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

interface MicrosoftWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface MicrosoftTokenResponse {
  access_token: string,
  refresh_token: string
  expires_in: number,
  scope: string
}

class CustomAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken
  }
}

export class MicrosoftIntegration extends BaseIntegration {
  readonly provider = 'microsoft'
  readonly name = 'Microsoft 365'
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
      // Test authentication with a simple Graph API call
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.graphClient.api('/me').get()
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // Assume 1 hour expiry
        scope: this.config?.scopes,
        data: response
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }
    }
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }

      // Microsoft Graph token refresh
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
        throw new AuthenticationError(`Token refresh failed: ${response.status}`)
      }

      const tokenData: MicrosoftTokenResponse = await response.json()

      // Update tokens
      this.accessToken = tokenData.access_token
      this.refreshTokenValue = tokenData.refresh_token

      // Update graph client with new token
      const authProvider = new CustomAuthProvider(this.accessToken)
      this.graphClient = Client.initWithMiddleware({ authProvider })

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.EMAIL,
      IntegrationCapability.CALENDAR,
      IntegrationCapability.CONTACTS,
      IntegrationCapability.TASKS,
      IntegrationCapability.FILES,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const user = await this.executeWithProtection('connection.test', async () => {
        return this.graphClient.api('/me').get()
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: user.id
          userPrincipalName: user.userPrincipalName,
          displayName: user.displayName
        }
      }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        status: 'error',
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }

  async sync(): Promise<SyncResult> {
    try {
      const startTime = new Date()
      let totalProcessed = 0
      let totalErrors = 0
      const errors: string[] = []

      // Sync emails
      try {
        const emailResult = await this.syncEmails()
        totalProcessed += emailResult.processed
        totalErrors += emailResult.errors
        if (emailResult.errorMessages) {
          errors.push(...emailResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Email sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync calendar events
      try {
        const calendarResult = await this.syncCalendarEvents()
        totalProcessed += calendarResult.processed
        totalErrors += calendarResult.errors
        if (calendarResult.errorMessages) {
          errors.push(...calendarResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Calendar sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync contacts
      try {
        const contactsResult = await this.syncContacts()
        totalProcessed += contactsResult.processed
        totalErrors += contactsResult.errors
        if (contactsResult.errorMessages) {
          errors.push(...contactsResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Contacts sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      return {
        success: totalErrors === 0,
        timestamp: new Date()
        duration: Date.now() - startTime.getTime(),
        itemsProcessed: totalProcessed
        itemsAdded: totalProcessed - totalErrors,
        itemsUpdated: 0
        itemsDeleted: 0,
        errors: totalErrors
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      this.logError('sync', error as Error)
      throw new SyncError(`Microsoft 365 sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const microsoftPayload = payload as MicrosoftWebhookPayload

      switch (microsoftPayload.type) {
        case 'mail.received':
          await this.handleEmailWebhook(microsoftPayload)
          break
        case 'calendar.event.created':
        case 'calendar.event.updated':
          await this.handleCalendarWebhook(microsoftPayload)
          break
        case 'contact.created':
        case 'contact.updated':
          await this.handleContactWebhook(microsoftPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${microsoftPayload.type}`)
      }

      return {
        success: true,
        data: { processed: true },
        message: 'Webhook processed successfully'
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // Revoke tokens if possible
      if (this.refreshTokenValue && this.config) {
        const revokeUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout'
        await fetch(revokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({,
            token: this.refreshTokenValue
            client_id: this.config.clientId
          })
        })
      }

      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private helper methods
  private async syncEmails(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const messages = await this.executeWithProtection('sync.emails', async () => {
        return this.graphClient.api('/me/messages').top(50).orderby('receivedDateTime desc').get()
      })

      // Process messages
      let processed = 0
      const errors: string[] = []

      for (const message of messages.value || []) {
        try {
          await this.processEmailMessage(message)
          processed++
        } catch (error) {
          errors.push(`Failed to process email ${message.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Email sync failed: ${(error as Error).message}`)
    }
  }

  private async syncCalendarEvents(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const events = await this.executeWithProtection('sync.calendar', async () => {
        return this.graphClient
          .api('/me/calendar/events')
          .top(50)
          .orderby('createdDateTime desc')
          .get()
      })

      let processed = 0
      const errors: string[] = []

      for (const event of events.value || []) {
        try {
          await this.processCalendarEvent(event)
          processed++
        } catch (error) {
          errors.push(`Failed to process event ${event.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Calendar sync failed: ${(error as Error).message}`)
    }
  }

  private async syncContacts(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const contacts = await this.executeWithProtection('sync.contacts', async () => {
        return this.graphClient.api('/me/contacts').top(50).get()
      })

      let processed = 0
      const errors: string[] = []

      for (const contact of contacts.value || []) {
        try {
          await this.processContact(contact)
          processed++
        } catch (error) {
          errors.push(`Failed to process contact ${contact.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Contacts sync failed: ${(error as Error).message}`)
    }
  }

  private async processEmailMessage(message: any): Promise<void> {
    // Process individual email message
    // This would integrate with your email processing system
    this.logger.debug(`Processing email: ${message.subject}`)
  }

  private async processCalendarEvent(event: any): Promise<void> {
    // Process individual calendar event
    // This would integrate with your calendar processing system
    this.logger.debug(`Processing event: ${event.subject}`)
  }

  private async processContact(contact: any): Promise<void> {
    // Process individual contact
    // This would integrate with your contact processing system
    this.logger.debug(`Processing contact: ${contact.displayName}`)
  }

  private async handleEmailWebhook(payload: MicrosoftWebhookPayload): Promise<void> {
    this.logger.debug(`Handling email webhook: ${payload.id}`)
    // Handle email webhook processing
  }

  private async handleCalendarWebhook(payload: MicrosoftWebhookPayload): Promise<void> {
    this.logger.debug(`Handling calendar webhook: ${payload.id}`)
    // Handle calendar webhook processing
  }

  private async handleContactWebhook(payload: MicrosoftWebhookPayload): Promise<void> {
    this.logger.debug(`Handling contact webhook: ${payload.id}`)
    // Handle contact webhook processing
  }
}
