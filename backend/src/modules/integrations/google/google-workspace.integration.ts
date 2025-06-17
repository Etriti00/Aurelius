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

interface GoogleWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  scope: string
}

export class GoogleWorkspaceIntegration extends BaseIntegration {
  readonly provider = 'google'
  readonly name = 'Google Workspace'
  readonly version = '1.0.0'

  private oauth2Client: OAuth2Client
  private gmail: any
  private calendar: any
  private drive: any
  private tasks: any
  private contacts: any

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

    // Initialize Google APIs
    this.initializeApis()
  }

  private initializeApis(): void {
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client })
    this.tasks = google.tasks({ version: 'v1', auth: this.oauth2Client })
    this.contacts = google.people({ version: 'v1', auth: this.oauth2Client })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication with a simple API call
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.gmail.users.getProfile({ userId: 'me' })
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // Assume 1 hour expiry
        scope: this.config?.scopes,
        data: response.data
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

      // Use Google's OAuth2 client to refresh token
      const { credentials } = await this.oauth2Client.refreshAccessToken()

      if (!credentials.access_token) {
        throw new AuthenticationError('Failed to refresh access token')
      }

      // Update tokens
      this.accessToken = credentials.access_token
      if (credentials.refresh_token) {
        this.refreshTokenValue = credentials.refresh_token
      }

      // Update OAuth client credentials
      this.oauth2Client.setCredentials(credentials)

      // Reinitialize APIs with new credentials
      this.initializeApis()

      return {
        success: true,
        accessToken: credentials.access_token
        refreshToken: credentials.refresh_token || this.refreshTokenValue,
        expiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
        scope: credentials.scope?.split(' ')
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
      const profile = await this.executeWithProtection('connection.test', async () => {
        return this.gmail.users.getProfile({ userId: 'me' })
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          emailAddress: profile.data.emailAddress
          messagesTotal: profile.data.messagesTotal,
          threadsTotal: profile.data.threadsTotal
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

      // Sync Gmail messages
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

      // Sync Calendar events
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

      // Sync Contacts
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

      // Sync Tasks
      try {
        const tasksResult = await this.syncTasks()
        totalProcessed += tasksResult.processed
        totalErrors += tasksResult.errors
        if (tasksResult.errorMessages) {
          errors.push(...tasksResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Tasks sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Google Workspace sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const googlePayload = payload as GoogleWebhookPayload

      switch (googlePayload.type) {
        case 'gmail.message.received':
          await this.handleEmailWebhook(googlePayload)
          break
        case 'calendar.event.created':
        case 'calendar.event.updated':
          await this.handleCalendarWebhook(googlePayload)
          break
        case 'contact.created':
        case 'contact.updated':
          await this.handleContactWebhook(googlePayload)
          break
        case 'task.created':
        case 'task.updated':
          await this.handleTaskWebhook(googlePayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${googlePayload.type}`)
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
      // Revoke tokens
      if (this.oauth2Client) {
        await this.oauth2Client.revokeCredentials()
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
      const response = await this.executeWithProtection('sync.emails', async () => {
        return this.gmail.users.messages.list({
          userId: 'me',
          maxResults: 50
          q: 'in:inbox'
        })
      })

      let processed = 0
      const errors: string[] = []

      const messages = response.data.messages || []

      for (const message of messages) {
        try {
          const fullMessage = await this.gmail.users.messages.get({
            userId: 'me',
            id: message.id
          })
          await this.processEmailMessage(fullMessage.data)
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
      const response = await this.executeWithProtection('sync.calendar', async () => {
        return this.calendar.events.list({
          calendarId: 'primary',
          maxResults: 50
          singleEvents: true,
          orderBy: 'startTime'
          timeMin: new Date().toISOString()
        })
      })

      let processed = 0
      const errors: string[] = []

      const events = response.data.items || []

      for (const event of events) {
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
      const response = await this.executeWithProtection('sync.contacts', async () => {
        return this.contacts.people.connections.list({
          resourceName: 'people/me',
          pageSize: 50
          personFields: 'names,emailAddresses,phoneNumbers'
        })
      })

      let processed = 0
      const errors: string[] = []

      const connections = response.data.connections || []

      for (const contact of connections) {
        try {
          await this.processContact(contact)
          processed++
        } catch (error) {
          errors.push(
            `Failed to process contact ${contact.resourceName}: ${(error as Error).message}`,
          )
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

  private async syncTasks(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      // First get task lists
      const taskListsResponse = await this.executeWithProtection('sync.taskLists', async () => {
        return this.tasks.tasklists.list({ maxResults: 10 })
      })

      let processed = 0
      const errors: string[] = []

      const taskLists = taskListsResponse.data.items || []

      for (const taskList of taskLists) {
        try {
          const tasksResponse = await this.tasks.tasks.list({
            tasklist: taskList.id,
            maxResults: 50
          })

          const tasks = tasksResponse.data.items || []

          for (const task of tasks) {
            try {
              await this.processTask(task, taskList)
              processed++
            } catch (error) {
              errors.push(`Failed to process task ${task.id}: ${(error as Error).message}`)
            }
          }
        } catch (error) {
          errors.push(`Failed to sync task list ${taskList.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Tasks sync failed: ${(error as Error).message}`)
    }
  }

  private async processEmailMessage(message: any): Promise<void> {
    // Process individual email message
    // This would integrate with your email processing system
    this.logger.debug(`Processing email: ${message.snippet}`)
  }

  private async processCalendarEvent(event: any): Promise<void> {
    // Process individual calendar event
    // This would integrate with your calendar processing system
    this.logger.debug(`Processing event: ${event.summary}`)
  }

  private async processContact(contact: any): Promise<void> {
    // Process individual contact
    // This would integrate with your contact processing system
    const name = contact.names?.[0]?.displayName || 'Unknown'
    this.logger.debug(`Processing contact: ${name}`)
  }

  private async processTask(task: any, taskList: any): Promise<void> {
    // Process individual task
    // This would integrate with your task processing system
    this.logger.debug(`Processing task: ${task.title} from ${taskList.title}`)
  }

  private async handleEmailWebhook(payload: GoogleWebhookPayload): Promise<void> {
    this.logger.debug(`Handling email webhook: ${payload.id}`)
    // Handle email webhook processing
  }

  private async handleCalendarWebhook(payload: GoogleWebhookPayload): Promise<void> {
    this.logger.debug(`Handling calendar webhook: ${payload.id}`)
    // Handle calendar webhook processing
  }

  private async handleContactWebhook(payload: GoogleWebhookPayload): Promise<void> {
    this.logger.debug(`Handling contact webhook: ${payload.id}`)
    // Handle contact webhook processing
  }

  private async handleTaskWebhook(payload: GoogleWebhookPayload): Promise<void> {
    this.logger.debug(`Handling task webhook: ${payload.id}`)
    // Handle task webhook processing
  }
}
