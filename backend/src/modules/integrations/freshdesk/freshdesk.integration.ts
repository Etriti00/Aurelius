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

interface FreshdeskWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface FreshdeskTicket {
  id: number,
  subject: string
  description: string,
  description_text: string
  status: number,
  priority: number
  type: string,
  source: number
  created_at: string,
  updated_at: string
  due_by: string,
  fr_due_by: string
  is_escalated: boolean,
  fr_escalated: boolean
  requester_id: number,
  responder_id: number
  group_id: number,
  company_id: number
  product_id: number,
  tags: string[]
  custom_fields: Record<string, unknown>
  cc_emails: string[],
  fwd_emails: string[]
  reply_cc_emails: string[],
  ticket_cc_emails: string[]
  spam: boolean,
  email_config_id: number
  to_emails: string[]
}

interface FreshdeskContact {
  id: number,
  name: string
  email: string,
  phone: string
  mobile: string,
  twitter_id: string
  unique_external_id: string,
  other_emails: string[]
  company_id: number,
  view_all_tickets: boolean
  deleted: boolean,
  active: boolean
  address: string,
  avatar: {
    avatar_url: string,
    content_type: string
    id: number,
    name: string
    size: number,
    created_at: string
    updated_at: string
  }
  custom_fields: Record<string, unknown>
  description: string,
  job_title: string
  language: string,
  tags: string[]
  time_zone: string,
  created_at: string
  updated_at: string
}

interface FreshdeskAgent {
  id: number,
  contact: {
    active: boolean,
    email: string
    job_title: string,
    language: string
    last_login_at: string,
    mobile: string
    name: string,
    phone: string
    time_zone: string,
    created_at: string
    updated_at: string
  }
  available: boolean,
  available_since: string
  type: string,
  created_at: string
  updated_at: string,
  group_ids: number[]
  role_ids: number[],
  skill_ids: number[]
  signature: string
}

export class FreshdeskIntegration extends BaseIntegration {
  readonly provider = 'freshdesk'
  readonly name = 'Freshdesk'
  readonly version = '1.0.0'

  private readonly apiBaseUrl: string
  private readonly domain: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
    // Freshdesk domain is required - should be provided in config
    this.domain =
      this.config?.apiUrl?.replace('https://', '').replace('.freshdesk.com', '') || 'company'
    this.apiBaseUrl = `https://${this.domain}.freshdesk.com/api/v2`
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/agents/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Freshdesk API keys don't expire
        scope: ['read', 'write'],
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
      // Freshdesk uses API keys, not OAuth tokens, so we validate instead
      const response = await this.executeWithProtection('refresh.test', async () => {
        return this.makeApiCall('/agents/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        scope: ['read', 'write'],
        data: response
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'API key validation failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.TICKETS,
      IntegrationCapability.CONTACTS,
      IntegrationCapability.SUPPORT,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/agents/me', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          agentId: response.id
          agentName: response.contact?.name,
          agentEmail: response.contact?.email
          domain: this.domain
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

      // Sync tickets
      try {
        const ticketResult = await this.syncTickets()
        totalProcessed += ticketResult.processed
        totalErrors += ticketResult.errors
        if (ticketResult.errorMessages) {
          errors.push(...ticketResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Ticket sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync contacts
      try {
        const contactResult = await this.syncContacts()
        totalProcessed += contactResult.processed
        totalErrors += contactResult.errors
        if (contactResult.errorMessages) {
          errors.push(...contactResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Contact sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Freshdesk sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const freshdeskPayload = payload as FreshdeskWebhookPayload

      switch (freshdeskPayload.type) {
        case 'freshdesk.ticket.created':
        case 'freshdesk.ticket.updated':
        case 'freshdesk.ticket.deleted':
          await this.handleTicketWebhook(freshdeskPayload)
          break
        case 'freshdesk.contact.created':
        case 'freshdesk.contact.updated':
        case 'freshdesk.contact.deleted':
          await this.handleContactWebhook(freshdeskPayload)
          break
        case 'freshdesk.note.created':
          await this.handleNoteWebhook(freshdeskPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${freshdeskPayload.type}`)
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
      // Freshdesk uses API keys, so just mark as disconnected
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncTickets(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.tickets', async () => {
        return this.makeApiCall('/tickets?per_page=100', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const tickets = response || []

      for (const ticket of tickets) {
        try {
          await this.processTicket(ticket)
          processed++
        } catch (error) {
          errors.push(`Failed to process ticket ${ticket.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Ticket sync failed: ${(error as Error).message}`)
    }
  }

  private async syncContacts(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.contacts', async () => {
        return this.makeApiCall('/contacts?per_page=100', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const contacts = response || []

      for (const contact of contacts) {
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
      throw new SyncError(`Contact sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processTicket(ticket: any): Promise<void> {
    this.logger.debug(`Processing Freshdesk ticket: ${ticket.subject}`)
    // Process ticket data for Aurelius AI system
  }

  private async processContact(contact: any): Promise<void> {
    this.logger.debug(`Processing Freshdesk contact: ${contact.name}`)
    // Process contact data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleTicketWebhook(payload: FreshdeskWebhookPayload): Promise<void> {
    this.logger.debug(`Handling ticket webhook: ${payload.id}`)
    // Handle ticket webhook processing
  }

  private async handleContactWebhook(payload: FreshdeskWebhookPayload): Promise<void> {
    this.logger.debug(`Handling contact webhook: ${payload.id}`)
    // Handle contact webhook processing
  }

  private async handleNoteWebhook(payload: FreshdeskWebhookPayload): Promise<void> {
    this.logger.debug(`Handling note webhook: ${payload.id}`)
    // Handle note webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
    body?: unknown,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
      // Freshdesk uses API key authentication with base64 encoding
      Authorization: `Basic ${Buffer.from(`${this.accessToken}:X`).toString('base64')}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Freshdesk API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getTickets(options?: {
    filter?: string
    page?: number
    per_page?: number
    order_by?: string
    order_type?: 'asc' | 'desc'
    include?: string[]
  }): Promise<FreshdeskTicket[]> {
    try {
      const params = new URLSearchParams()
      if (options?.filter) params.append('filter', options.filter)
      if (options?.page) params.append('page', options.page.toString())
      if (options?.per_page) params.append('per_page', options.per_page.toString())
      if (options?.order_by) params.append('order_by', options.order_by)
      if (options?.order_type) params.append('order_type', options.order_type)
      if (options?.include) params.append('include', options.include.join(','))

      const queryString = params.toString()
      const endpoint = queryString ? `/tickets?${queryString}` : '/tickets'

      const response = await this.executeWithProtection('api.get_tickets', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getTickets', error as Error)
      throw new Error(`Failed to get tickets: ${(error as Error).message}`)
    }
  }

  async getTicket(ticketId: number, include?: string[]): Promise<FreshdeskTicket> {
    try {
      const params = include ? `?include=${include.join(',')}` : ''

      const response = await this.executeWithProtection('api.get_ticket', async () => {
        return this.makeApiCall(`/tickets/${ticketId}${params}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getTicket', error as Error)
      throw new Error(`Failed to get ticket: ${(error as Error).message}`)
    }
  }

  async createTicket(ticketData: {
    name?: string
    phone?: string
    email?: string
    subject: string,
    description: string
    status?: number
    priority?: number
    type?: string
    source?: number
    tags?: string[]
    cc_emails?: string[]
    custom_fields?: Record<string, unknown>
    due_by?: string
    group_id?: number
    product_id?: number
    responder_id?: number
    company_id?: number
  }): Promise<FreshdeskTicket> {
    try {
      const response = await this.executeWithProtection('api.create_ticket', async () => {
        return this.makeApiCall('/tickets', 'POST', ticketData)
      })

      return response
    } catch (error) {
      this.logError('createTicket', error as Error)
      throw new Error(`Failed to create ticket: ${(error as Error).message}`)
    }
  }

  async updateTicket(
    ticketId: number,
    ticketData: {
      subject?: string
      description?: string
      status?: number
      priority?: number
      type?: string
      tags?: string[]
      cc_emails?: string[]
      custom_fields?: Record<string, unknown>
      due_by?: string
      group_id?: number
      product_id?: number
      responder_id?: number
      company_id?: number
    },
  ): Promise<FreshdeskTicket> {
    try {
      const response = await this.executeWithProtection('api.update_ticket', async () => {
        return this.makeApiCall(`/tickets/${ticketId}`, 'PUT', ticketData)
      })

      return response
    } catch (error) {
      this.logError('updateTicket', error as Error)
      throw new Error(`Failed to update ticket: ${(error as Error).message}`)
    }
  }

  async deleteTicket(ticketId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_ticket', async () => {
        return this.makeApiCall(`/tickets/${ticketId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteTicket', error as Error)
      throw new Error(`Failed to delete ticket: ${(error as Error).message}`)
    }
  }

  async getContacts(options?: {
    email?: string
    mobile?: string
    phone?: string
    state?: 'verified' | 'unverified' | 'spam' | 'blocked'
    page?: number
    per_page?: number
  }): Promise<FreshdeskContact[]> {
    try {
      const params = new URLSearchParams()
      if (options?.email) params.append('email', options.email)
      if (options?.mobile) params.append('mobile', options.mobile)
      if (options?.phone) params.append('phone', options.phone)
      if (options?.state) params.append('state', options.state)
      if (options?.page) params.append('page', options.page.toString())
      if (options?.per_page) params.append('per_page', options.per_page.toString())

      const queryString = params.toString()
      const endpoint = queryString ? `/contacts?${queryString}` : '/contacts'

      const response = await this.executeWithProtection('api.get_contacts', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getContacts', error as Error)
      throw new Error(`Failed to get contacts: ${(error as Error).message}`)
    }
  }

  async createContact(contactData: {,
    name: string
    email?: string
    phone?: string
    mobile?: string
    twitter_id?: string
    unique_external_id?: string
    other_emails?: string[]
    company_id?: number
    view_all_tickets?: boolean
    address?: string
    avatar?: File
    custom_fields?: Record<string, unknown>
    description?: string
    job_title?: string
    language?: string
    tags?: string[]
    time_zone?: string
  }): Promise<FreshdeskContact> {
    try {
      const response = await this.executeWithProtection('api.create_contact', async () => {
        return this.makeApiCall('/contacts', 'POST', contactData)
      })

      return response
    } catch (error) {
      this.logError('createContact', error as Error)
      throw new Error(`Failed to create contact: ${(error as Error).message}`)
    }
  }

  async updateContact(
    contactId: number,
    contactData: {
      name?: string
      email?: string
      phone?: string
      mobile?: string
      twitter_id?: string
      unique_external_id?: string
      other_emails?: string[]
      company_id?: number
      view_all_tickets?: boolean
      address?: string
      custom_fields?: Record<string, unknown>
      description?: string
      job_title?: string
      language?: string
      tags?: string[]
      time_zone?: string
    },
  ): Promise<FreshdeskContact> {
    try {
      const response = await this.executeWithProtection('api.update_contact', async () => {
        return this.makeApiCall(`/contacts/${contactId}`, 'PUT', contactData)
      })

      return response
    } catch (error) {
      this.logError('updateContact', error as Error)
      throw new Error(`Failed to update contact: ${(error as Error).message}`)
    }
  }

  async deleteContact(contactId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_contact', async () => {
        return this.makeApiCall(`/contacts/${contactId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteContact', error as Error)
      throw new Error(`Failed to delete contact: ${(error as Error).message}`)
    }
  }

  async addNoteToTicket(
    ticketId: number,
    noteData: {
      body: string
      private?: boolean
      notify_emails?: string[]
      incoming?: boolean
      user_id?: number
    },
  ): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.add_note', async () => {
        return this.makeApiCall(`/tickets/${ticketId}/notes`, 'POST', noteData)
      })

      return response
    } catch (error) {
      this.logError('addNoteToTicket', error as Error)
      throw new Error(`Failed to add note to ticket: ${(error as Error).message}`)
    }
  }

  async getTicketConversations(ticketId: number): Promise<any[]> {
    try {
      const response = await this.executeWithProtection('api.get_conversations', async () => {
        return this.makeApiCall(`/tickets/${ticketId}/conversations`, 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getTicketConversations', error as Error)
      throw new Error(`Failed to get ticket conversations: ${(error as Error).message}`)
    }
  }

  async getAgents(): Promise<FreshdeskAgent[]> {
    try {
      const response = await this.executeWithProtection('api.get_agents', async () => {
        return this.makeApiCall('/agents', 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getAgents', error as Error)
      throw new Error(`Failed to get agents: ${(error as Error).message}`)
    }
  }

  async getGroups(): Promise<any[]> {
    try {
      const response = await this.executeWithProtection('api.get_groups', async () => {
        return this.makeApiCall('/groups', 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getGroups', error as Error)
      throw new Error(`Failed to get groups: ${(error as Error).message}`)
    }
  }

  async getCompanies(options?: { page?: number; per_page?: number }): Promise<any[]> {
    try {
      const params = new URLSearchParams()
      if (options?.page) params.append('page', options.page.toString())
      if (options?.per_page) params.append('per_page', options.per_page.toString())

      const queryString = params.toString()
      const endpoint = queryString ? `/companies?${queryString}` : '/companies'

      const response = await this.executeWithProtection('api.get_companies', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getCompanies', error as Error)
      throw new Error(`Failed to get companies: ${(error as Error).message}`)
    }
  }
}
