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

export class ZendeskIntegration extends BaseIntegration {
  readonly provider = 'zendesk'
  readonly name = 'Zendesk'
  readonly version = '1.0.0'

  private zendeskClient: AxiosInstance
  private subdomain: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Parse access token to get subdomain and token
    const credentials = this.parseAccessToken(accessToken)
    this.subdomain = credentials.subdomain

    // Create rate-limited axios client
    this.zendeskClient = rateLimit(
      axios.create({
        baseURL: `https://${this.subdomain}.zendesk.com/api/v2`,
        headers: {,
          Authorization: `Bearer ${credentials.token}`,
          'Content-Type': 'application/json'
        }
      }),
      {
        maxRequests: 700, // Zendesk rate limit: 700 requests per minute,
        perMilliseconds: 60000, // 1 minute
      },
    )
  }

  private parseAccessToken(token: string): { subdomain: string; token: string } {
    try {
      // Token format: "subdomain:token" (base64 encoded)
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      if (decoded.includes(':')) {
        const [subdomain, tokenValue] = decoded.split(':')
        return { subdomain, token: tokenValue } else {
        return { subdomain: this.config?.subdomain || 'company', token: decoded } catch {
      // Fallback: assume token is already in correct format
      return { subdomain: this.config?.subdomain || 'company', token }
      }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.zendeskClient.get('/users/me.json')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Zendesk tokens have long expiry
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config?.clientId || !this.config?.clientSecret) {
        return this.authenticate()
      }
  }

      const _response = await axios.post(`https://${this.subdomain}.zendesk.com/oauth/tokens`, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshTokenValue
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })

      return {
        success: true,
        accessToken: response.data.access_token
        refreshToken: response.data.refresh_token || this.refreshTokenValue,
        expiresAt: response.data.expires_in
          ? new Date(Date.now() + response.data.expires_in * 1000)
          : undefined,
        scope: response.data.scope?.split(' ') || ['read', 'write']
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      await axios.delete(`https://${this.subdomain}.zendesk.com/oauth/tokens/current`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      }),
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.zendeskClient.get('/users/me.json')
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
            limit: 700,
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
        name: 'Tickets',
        description: 'Access and manage support tickets'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Users',
        description: 'Manage users and agents'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Organizations',
        description: 'Manage customer organizations'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Groups',
        description: 'Manage agent groups'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Brands',
        description: 'Access brand information'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Views',
        description: 'Access ticket views and filters'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Macros',
        description: 'Access and manage ticket macros'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'SLA Policies',
        description: 'Access SLA policy information'
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

      this.logInfo('syncData', 'Starting Zendesk sync', { lastSyncTime })

      // Sync Tickets
      try {
        const ticketsResult = await this.syncTickets(lastSyncTime)
        totalProcessed += ticketsResult.processed,
        totalSkipped += ticketsResult.skipped
      }
    } catch (error) {
        errors.push(`Tickets sync failed: ${(error as Error).message}`)
        this.logError('syncTickets', error as Error)
      }

      catch (error) {
        console.error('Error in zendesk.integration.ts:', error)
        throw error
      }
      // Sync Users
      try {
        const usersResult = await this.syncUsers(lastSyncTime)
        totalProcessed += usersResult.processed,
        totalSkipped += usersResult.skipped
      } catch (error) {
        errors.push(`Users sync failed: ${(error as Error).message}`)
        this.logError('syncUsers', error as Error)
      }

      // Sync Organizations
      try {
        const organizationsResult = await this.syncOrganizations(lastSyncTime)
        totalProcessed += organizationsResult.processed,
        totalSkipped += organizationsResult.skipped
      } catch (error) {
        errors.push(`Organizations sync failed: ${(error as Error).message}`)
        this.logError('syncOrganizations', error as Error)
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
      throw new SyncError('Zendesk sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Zendesk webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'ticket.created':
        case 'ticket.updated':
        case 'ticket.solved':
        case 'ticket.closed':
          await this.handleTicketWebhook(payload.data)
          break
        case 'user.created':
        case 'user.updated':
          await this.handleUserWebhook(payload.data)
          break
        case 'organization.created':
        case 'organization.updated':
          await this.handleOrganizationWebhook(payload.data)
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
      console.error('Error in zendesk.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Zendesk webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncTickets(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let url = '/search.json?query=type:ticket'
      if (lastSyncTime) {
        url += ` updated>${Math.floor(lastSyncTime.getTime() / 1000)}`
      }
      url += '&sort_by=updated_at&sort_order=desc'

      const _response = await this.zendeskClient.get(url)
      const tickets = response.data.results || []

      let processed = 0
      let skipped = 0

      for (const ticket of tickets) {
        try {
          await this.processTicket(ticket)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncTickets', error as Error, { ticketId: ticket.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTickets', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in zendesk.integration.ts:', error)
      throw error
    }
  private async syncUsers(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const url = '/users.json?per_page=100'

      const _response = await this.zendeskClient.get(url)
      const users = response.data.users || []

      let processed = 0
      let skipped = 0

      for (const user of users) {
        try {
          // Filter by lastSyncTime if provided
          if (lastSyncTime && new Date(user.updated_at) <= lastSyncTime) {
            skipped++,
            continue
          }
      }

          await this.processUser(user)
          processed++
        }
    } catch (error) {
          this.logError('syncUsers', error as Error, { userId: user.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncUsers', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in zendesk.integration.ts:', error)
      throw error
    }
  private async syncOrganizations(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const url = '/organizations.json?per_page=100'

      const _response = await this.zendeskClient.get(url)
      const organizations = response.data.organizations || []

      let processed = 0
      let skipped = 0

      for (const organization of organizations) {
        try {
          // Filter by lastSyncTime if provided
          if (lastSyncTime && new Date(organization.updated_at) <= lastSyncTime) {
            skipped++,
            continue
          }
      }

          await this.processOrganization(organization)
          processed++
        }
    } catch (error) {
          this.logError('syncOrganizations', error as Error, { organizationId: organization.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncOrganizations', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in zendesk.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processTicket(ticket: unknown): Promise<void> {
    this.logInfo('processTicket', `Processing ticket: ${ticket.id}`)
  }

  private async processUser(user: unknown): Promise<void> {
    this.logInfo('processUser', `Processing user: ${user.id}`)
  }

  private async processOrganization(organization: unknown): Promise<void> {
    this.logInfo('processOrganization', `Processing organization: ${organization.id}`)
  }

  // Private webhook handlers
  private async handleTicketWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleTicketWebhook', 'Processing ticket webhook', data)
  }

  private async handleUserWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleUserWebhook', 'Processing user webhook', data)
  }

  private async handleOrganizationWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleOrganizationWebhook', 'Processing organization webhook', data)
  }

  // Public API methods
  async createTicket(ticketData: {,
    subject: string
    comment: {,
      body: string
      html_body?: string,
      public?: boolean
    }
    requester_id?: number
    assignee_id?: number
    group_id?: number
    priority?: 'urgent' | 'high' | 'normal' | 'low'
    status?: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed'
    type?: 'problem' | 'incident' | 'question' | 'task'
    tags?: string[]
    custom_fields?: Array<{ id: number; value: unknown }>
  }): Promise<number> {
    try {
      const _response = await this.zendeskClient.post('/tickets.json', { ticket: ticketData })
      return (response as Response).data.ticket.id
    } catch (error) {
      this.logError('createTicket', error as Error)
      throw new Error(`Failed to create Zendesk ticket: ${(error as Error).message}`)
    }

  async updateTicket(
    ticketId: number,
    updateData: {
      subject?: string
      comment?: {
        body: string
        html_body?: string,
        public?: boolean
      }
      assignee_id?: number
      group_id?: number
      priority?: 'urgent' | 'high' | 'normal' | 'low'
      status?: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed'
      tags?: string[]
      custom_fields?: Array<{ id: number; value: unknown }>
    },
  ): Promise<void> {
    try {
      await this.zendeskClient.put(`/tickets/${ticketId}.json`, { ticket: updateData })
    } catch (error) {
      this.logError('updateTicket', error as Error)
      throw new Error(`Failed to update Zendesk ticket: ${(error as Error).message}`)
    }

  async getTicket(ticketId: number, includeComments?: boolean): Promise<ApiResponse> {
    try {
      let url = `/tickets/${ticketId}.json`
      if (includeComments) {
        url += '?include=comments'
      }
  }

      const _response = await this.zendeskClient.get(url)
      return (response as Response).data.ticket
    } catch (error) {
      this.logError('getTicket', error as Error)
      throw new Error(`Failed to get Zendesk ticket: ${(error as Error).message}`)
    }

  async searchTickets(
    query: string
    options?: {
      sort_by?: string
      sort_order?: 'asc' | 'desc',
      per_page?: number
    },
  ): Promise<unknown[]> {
    try {
      const params = new URLSearchParams({
        query: `type:ticket ${query}`,
        sort_by: options?.sort_by || 'updated_at',
        sort_order: options?.sort_order || 'desc'
        per_page: (_options?.per_page || 25).toString()
      })

      const _response = await this.zendeskClient.get(`/search.json?${params.toString()}`)
      return (response as Response).data.results || []
    } catch (error) {
      this.logError('searchTickets', error as Error)
      throw new Error(`Failed to search Zendesk tickets: ${(error as Error).message}`)
    }

  async createUser(userData: {,
    name: string
    email?: string
    phone?: string
    role?: 'end-user' | 'agent' | 'admin'
    verified?: boolean
    organization_id?: number
    tags?: string[]
    custom_fields?: Record<string, unknown>
  }): Promise<number> {
    try {
      const _response = await this.zendeskClient.post('/users.json', { user: userData })
      return (response as Response).data.user.id
    } catch (error) {
      this.logError('createUser', error as Error)
      throw new Error(`Failed to create Zendesk user: ${(error as Error).message}`)
    }

  async updateUser(
    userId: number,
    updateData: {
      name?: string
      email?: string
      phone?: string
      role?: 'end-user' | 'agent' | 'admin'
      verified?: boolean
      organization_id?: number
      tags?: string[]
      custom_fields?: Record<string, unknown>
    },
  ): Promise<void> {
    try {
      await this.zendeskClient.put(`/users/${userId}.json`, { user: updateData })
    } catch (error) {
      this.logError('updateUser', error as Error)
      throw new Error(`Failed to update Zendesk user: ${(error as Error).message}`)
    }

  async getUser(userId: number): Promise<ApiResponse> {
    try {
      const _response = await this.zendeskClient.get(`/users/${userId}.json`)
      return (response as Response).data.user
    } catch (error) {
      this.logError('getUser', error as Error)
      throw new Error(`Failed to get Zendesk user: ${(error as Error).message}`)
    }

  async createOrganization(organizationData: {,
    name: string
    domain_names?: string[]
    details?: string
    notes?: string
    tags?: string[]
    custom_fields?: Record<string, unknown>
  }): Promise<number> {
    try {
      const _response = await this.zendeskClient.post('/organizations.json', { organization: organizationData })
      return (response as Response).data.organization.id
    } catch (error) {
      this.logError('createOrganization', error as Error)
      throw new Error(`Failed to create Zendesk organization: ${(error as Error).message}`)
    }

  async getOrganization(organizationId: number): Promise<ApiResponse> {
    try {
      const _response = await this.zendeskClient.get(`/organizations/${organizationId}.json`)
      return (response as Response).data.organization
    } catch (error) {
      this.logError('getOrganization', error as Error)
      throw new Error(`Failed to get Zendesk organization: ${(error as Error).message}`)
    }

  async getTicketComments(ticketId: number): Promise<unknown[]> {
    try {
      const _response = await this.zendeskClient.get(`/tickets/${ticketId}/comments.json`)
      return (response as Response).data.comments || []
    } catch (error) {
      this.logError('getTicketComments', error as Error)
      throw new Error(`Failed to get Zendesk ticket comments: ${(error as Error).message}`)
    }

  async addTicketComment(
    ticketId: number,
    commentData: {
      body: string
      html_body?: string
      public?: boolean,
      author_id?: number
    },
  ): Promise<number> {
    try {
      const _response = await this.zendeskClient.put(`/tickets/${ticketId}.json`, { ticket: {,
          comment: commentData }
      })
      return (response as Response).data.ticket.id
    } catch (error) {
      this.logError('addTicketComment', error as Error)
      throw new Error(`Failed to add Zendesk ticket comment: ${(error as Error).message}`)
    }

  async getGroups(): Promise<unknown[]> {
    try {
      const _response = await this.zendeskClient.get('/groups.json')
      return (response as Response).data.groups || []
    } catch (error) {
      this.logError('getGroups', error as Error)
      throw new Error(`Failed to get Zendesk groups: ${(error as Error).message}`)
    }

  async getBrands(): Promise<unknown[]> {
    try {
      const _response = await this.zendeskClient.get('/brands.json')
      return (response as Response).data.brands || []
    } catch (error) {
      this.logError('getBrands', error as Error)
      throw new Error(`Failed to get Zendesk brands: ${(error as Error).message}`)
    }

  async getViews(): Promise<unknown[]> {
    try {
      const _response = await this.zendeskClient.get('/views.json')
      return (response as Response).data.views || []
    } catch (error) {
      this.logError('getViews', error as Error)
      throw new Error(`Failed to get Zendesk views: ${(error as Error).message}`)
    }

  async getMacros(): Promise<unknown[]> {
    try {
      const _response = await this.zendeskClient.get('/macros.json')
      return (response as Response).data.macros || []
    } catch (error) {
      this.logError('getMacros', error as Error)
      throw new Error(`Failed to get Zendesk macros: ${(error as Error).message}`)
    }

}