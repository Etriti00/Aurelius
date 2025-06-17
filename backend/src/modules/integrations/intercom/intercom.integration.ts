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
import * as crypto from 'crypto'

interface IntercomWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface IntercomAdmin {
  id: string,
  type: 'admin'
  name: string,
  email: string
  avatar?: {
    type: 'avatar',
    image_url: string
  }
  away_mode_enabled: boolean,
  away_mode_reassign: boolean
  has_inbox_seat: boolean,
  team_ids: string[]
  app_id?: string
}

interface IntercomUser {
  id: string,
  type: 'user'
  user_id?: string
  email?: string
  phone?: string
  name?: string
  avatar?: {
    type: 'avatar',
    image_url: string
  }
  app_id?: string
  companies?: {
    type: 'company.list',
    companies: IntercomCompany[]
  }
  location_data?: {
    type: 'location_data',
    city_name: string
    continent_code: string,
    country_code: string
    country_name: string,
    latitude: number
    longitude: number,
    postal_code: string
    region_name: string,
    timezone: string
  }
  last_request_at?: number
  created_at: number,
  updated_at: number
  session_count: number
  social_profiles?: {
    type: 'social_profile.list',
    social_profiles: Array<{
      type: 'social_profile',
      name: string
      url: string
    }>
  }
  unsubscribed_from_emails: boolean,
  marked_email_as_spam: boolean
  has_hard_bounced: boolean
  tags?: {
    type: 'tag.list',
    tags: IntercomTag[]
  }
  segments?: {
    type: 'segment.list',
    segments: IntercomSegment[]
  }
  custom_attributes?: Record<string, unknown>
}

interface IntercomCompany {
  id: string,
  type: 'company'
  company_id?: string
  name?: string
  app_id?: string
  created_at: number,
  updated_at: number
  last_request_at?: number
  monthly_spend?: number
  session_count?: number
  user_count?: number
  size?: number
  website?: string
  industry?: string
  remote_created_at?: number
  custom_attributes?: Record<string, unknown>
  tags?: {
    type: 'tag.list',
    tags: IntercomTag[]
  }
  segments?: {
    type: 'segment.list',
    segments: IntercomSegment[]
  }
  plan?: {
    type: 'plan'
    id?: string
    name?: string
  }
}

interface IntercomConversation {
  id: string,
  type: 'conversation'
  created_at: number,
  updated_at: number
  waiting_since?: number
  snoozed_until?: number
  source: {,
    type: string
    id: string,
    delivered_as: string
    subject: string,
    body: string
    author: {,
      type: string
      id: string
      name?: string
      email?: string
    }
    attachments: Array<{,
      type: 'upload'
      name: string,
      url: string
      content_type: string,
      filesize: number
    }>
    url?: string
    redacted: boolean
  }
  contacts?: {
    type: 'contact.list',
    contacts: IntercomUser[]
  }
  teammates?: {
    type: 'admin.list',
    teammates: IntercomAdmin[]
  }
  assignee?: IntercomAdmin | null
  open: boolean,
  state: 'open' | 'closed' | 'snoozed'
  read: boolean
  tags?: {
    type: 'tag.list',
    tags: IntercomTag[]
  }
  priority: 'not_priority' | 'priority'
  conversation_rating?: {
    rating: 1 | 2 | 3 | 4 | 5
    remark?: string
    contact?: IntercomUser
    teammate?: IntercomAdmin
    created_at: number
  }
  statistics?: {
    type: 'conversation_statistics'
    time_to_assignment?: number
    time_to_admin_reply?: number
    time_to_first_close?: number
    time_to_last_close?: number
    median_time_to_reply?: number
    first_contact_reply_at?: number
    first_assignment_at?: number
    first_admin_reply_at?: number
    first_close_at?: number
    last_assignment_at?: number
    last_assignment_admin_reply_at?: number
    last_contact_reply_at?: number
    last_admin_reply_at?: number
    last_close_at?: number
    count_reopens?: number
    count_assignments?: number
    count_conversation_parts?: number
  }
  conversation_parts?: {
    type: 'conversation_part.list',
    conversation_parts: IntercomConversationPart[]
    total_count: number
  }
}

interface IntercomConversationPart {
  id: string,
  type: 'conversation_part'
  part_type: 'comment' | 'note' | 'quick_reply',
  body: string
  created_at: number,
  updated_at: number
  notified_at?: number
  assigned_to?: IntercomAdmin | null
  author: IntercomAdmin | IntercomUser,
  attachments: Array<{
    type: 'upload',
    name: string
    url: string,
    content_type: string
    filesize: number
  }>
  external_id?: string
  redacted: boolean
}

interface IntercomTag {
  id: string,
  type: 'tag'
  name: string
  applied_at?: number
  applied_by?: IntercomAdmin
}

interface IntercomSegment {
  id: string,
  type: 'segment'
  name: string,
  created_at: number
  updated_at: number,
  person_type: 'user' | 'lead'
  count?: number
}

interface IntercomNote {
  id: string,
  type: 'note'
  body: string,
  author: IntercomAdmin
  created_at: number
  contact?: {
    type: 'contact',
    id: string
  }
}

interface IntercomMessage {
  id: string,
  type: 'user_message' | 'admin_message'
  subject?: string
  body: string,
  message_type: 'email' | 'inapp' | 'facebook' | 'twitter'
  template?: string
  created_at: number
  owner?: IntercomAdmin
  to?: {
    type: 'contact.list' | 'user.list'
    users?: IntercomUser[]
    contacts?: IntercomUser[]
  }
}

export class IntercomIntegration extends BaseIntegration {
  readonly provider = 'intercom'
  readonly name = 'Intercom'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.intercom.io'
  private readonly apiVersion = '2.10'

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
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
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
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }

      const response = await fetch('https://api.intercom.io/auth/eagle/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshTokenValue
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
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
      IntegrationCapability.COMMUNICATIONS,
      IntegrationCapability.CUSTOMER_SUPPORT,
      IntegrationCapability.CONTACTS,
      IntegrationCapability.MESSAGING,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/me', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          adminId: response.id
          adminName: response.name,
          adminEmail: response.email
          appId: response.app?.id_code,
          appName: response.app?.name
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

      // Sync conversations
      try {
        const conversationResult = await this.syncConversations()
        totalProcessed += conversationResult.processed
        totalErrors += conversationResult.errors
        if (conversationResult.errorMessages) {
          errors.push(...conversationResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Conversation sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync users
      try {
        const userResult = await this.syncUsers()
        totalProcessed += userResult.processed
        totalErrors += userResult.errors
        if (userResult.errorMessages) {
          errors.push(...userResult.errorMessages)
        }
      } catch (error) {
        errors.push(`User sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync companies
      try {
        const companyResult = await this.syncCompanies()
        totalProcessed += companyResult.processed
        totalErrors += companyResult.errors
        if (companyResult.errorMessages) {
          errors.push(...companyResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Company sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Intercom sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const intercomPayload = payload as IntercomWebhookPayload

      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload.body || '', payload.headers || {})) {
        throw new Error('Invalid webhook signature')
      }

      switch (intercomPayload.type) {
        case 'conversation.user.created':
        case 'conversation.user.replied':
        case 'conversation.admin.replied':
        case 'conversation.admin.assigned':
        case 'conversation.admin.closed':
        case 'conversation.admin.opened':
          await this.handleConversationWebhook(intercomPayload)
          break
        case 'user.created':
        case 'user.deleted':
        case 'user.email.updated':
        case 'user.unsubscribed':
          await this.handleUserWebhook(intercomPayload)
          break
        case 'contact.created':
        case 'contact.signed_up':
        case 'contact.added_email':
        case 'contact.removed_email':
        case 'contact.tag.created':
        case 'contact.tag.deleted':
          await this.handleContactWebhook(intercomPayload)
          break
        case 'company.created':
        case 'company.user.created':
        case 'company.user.deleted':
          await this.handleCompanyWebhook(intercomPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${intercomPayload.type}`)
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
      // Intercom doesn't have a specific disconnect endpoint
      // The access token will naturally expire
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncConversations(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.conversations', async () => {
        return this.makeApiCall('/conversations', 'GET', undefined, {
          order: 'desc',
          sort: 'updated_at'
        })
      })

      let processed = 0
      const errors: string[] = []

      const conversations = response.conversations || []

      for (const conversation of conversations) {
        try {
          await this.processConversation(conversation)
          processed++
        } catch (error) {
          errors.push(
            `Failed to process conversation ${conversation.id}: ${(error as Error).message}`,
          )
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Conversation sync failed: ${(error as Error).message}`)
    }
  }

  private async syncUsers(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.users', async () => {
        return this.makeApiCall('/contacts', 'GET', undefined, { per_page: 150 })
      })

      let processed = 0
      const errors: string[] = []

      const users = response.data || []

      for (const user of users) {
        try {
          await this.processUser(user)
          processed++
        } catch (error) {
          errors.push(`Failed to process user ${user.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`User sync failed: ${(error as Error).message}`)
    }
  }

  private async syncCompanies(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.companies', async () => {
        return this.makeApiCall('/companies', 'GET', undefined, { per_page: 150 })
      })

      let processed = 0
      const errors: string[] = []

      const companies = response.data || []

      for (const company of companies) {
        try {
          await this.processCompany(company)
          processed++
        } catch (error) {
          errors.push(`Failed to process company ${company.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Company sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processConversation(conversation: any): Promise<void> {
    this.logger.debug(`Processing Intercom conversation: ${conversation.id}`)
    // Process conversation data for Aurelius AI system
  }

  private async processUser(user: any): Promise<void> {
    this.logger.debug(`Processing Intercom user: ${user.id}`)
    // Process user data for Aurelius AI system
  }

  private async processCompany(company: any): Promise<void> {
    this.logger.debug(`Processing Intercom company: ${company.id}`)
    // Process company data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleConversationWebhook(payload: IntercomWebhookPayload): Promise<void> {
    this.logger.debug(`Handling conversation webhook: ${payload.id}`)
    // Handle conversation webhook processing
  }

  private async handleUserWebhook(payload: IntercomWebhookPayload): Promise<void> {
    this.logger.debug(`Handling user webhook: ${payload.id}`)
    // Handle user webhook processing
  }

  private async handleContactWebhook(payload: IntercomWebhookPayload): Promise<void> {
    this.logger.debug(`Handling contact webhook: ${payload.id}`)
    // Handle contact webhook processing
  }

  private async handleCompanyWebhook(payload: IntercomWebhookPayload): Promise<void> {
    this.logger.debug(`Handling company webhook: ${payload.id}`)
    // Handle company webhook processing
  }

  // Helper method for webhook signature verification
  private verifyWebhookSignature(body: string, headers: Record<string, string>): boolean {
    try {
      const signature = headers['x-hub-signature-256'] || headers['X-Hub-Signature-256']
      if (!signature || !this.config?.webhookSecret) {
        return false
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('hex')

      return signature === `sha256=${expectedSignature}`
    } catch (error) {
      this.logError('verifyWebhookSignature' error as Error)
      return false
    }
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<any> {
    const url = new URL(`${this.apiBaseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString())
        }
      })
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
      'Intercom-Version': this.apiVersion
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Intercom API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getConversations(params?: {
    state?: 'open' | 'closed' | 'snoozed'
    sort?: 'created_at' | 'updated_at' | 'waiting_since'
    order?: 'asc' | 'desc'
    per_page?: number
    starting_after?: string
  }): Promise<IntercomConversation[]> {
    try {
      const response = await this.executeWithProtection('api.get_conversations', async () => {
        return this.makeApiCall('/conversations', 'GET', undefined, params)
      })

      return response.conversations || []
    } catch (error) {
      this.logError('getConversations', error as Error)
      throw new Error(`Failed to get conversations: ${(error as Error).message}`)
    }
  }

  async getConversation(conversationId: string): Promise<IntercomConversation> {
    try {
      const response = await this.executeWithProtection('api.get_conversation', async () => {
        return this.makeApiCall(`/conversations/${conversationId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getConversation', error as Error)
      throw new Error(`Failed to get conversation: ${(error as Error).message}`)
    }
  }

  async replyToConversation(
    conversationId: string,
    replyData: {
      type: 'user' | 'admin',
      message_type: 'comment' | 'note'
      body: string
      attachment_urls?: string[]
    },
  ): Promise<IntercomConversation> {
    try {
      const response = await this.executeWithProtection('api.reply_conversation', async () => {
        return this.makeApiCall(`/conversations/${conversationId}/reply`, 'POST', replyData)
      })

      return response
    } catch (error) {
      this.logError('replyToConversation', error as Error)
      throw new Error(`Failed to reply to conversation: ${(error as Error).message}`)
    }
  }

  async assignConversation(conversationId: string, adminId: string): Promise<IntercomConversation> {
    try {
      const response = await this.executeWithProtection('api.assign_conversation', async () => {
        return this.makeApiCall(`/conversations/${conversationId}`, 'PUT', {
          assignee: {,
            type: 'admin'
            id: adminId
          }
        })
      })

      return response
    } catch (error) {
      this.logError('assignConversation', error as Error)
      throw new Error(`Failed to assign conversation: ${(error as Error).message}`)
    }
  }

  async closeConversation(conversationId: string): Promise<IntercomConversation> {
    try {
      const response = await this.executeWithProtection('api.close_conversation', async () => {
        return this.makeApiCall(`/conversations/${conversationId}`, 'PUT', {
          state: 'closed'
        })
      })

      return response
    } catch (error) {
      this.logError('closeConversation', error as Error)
      throw new Error(`Failed to close conversation: ${(error as Error).message}`)
    }
  }

  async snoozeConversation(
    conversationId: string,
    snoozedUntil: number
  ): Promise<IntercomConversation> {
    try {
      const response = await this.executeWithProtection('api.snooze_conversation', async () => {
        return this.makeApiCall(`/conversations/${conversationId}`, 'PUT', {
          state: 'snoozed',
          snoozed_until: snoozedUntil
        })
      })

      return response
    } catch (error) {
      this.logError('snoozeConversation', error as Error)
      throw new Error(`Failed to snooze conversation: ${(error as Error).message}`)
    }
  }

  async getUsers(params?: {
    page?: number
    per_page?: number
    order?: 'asc' | 'desc'
    sort?: 'created_at' | 'updated_at' | 'signed_up_at' | 'last_request_at'
  }): Promise<IntercomUser[]> {
    try {
      const response = await this.executeWithProtection('api.get_users', async () => {
        return this.makeApiCall('/contacts', 'GET', undefined, params)
      })

      return response.data || []
    } catch (error) {
      this.logError('getUsers', error as Error)
      throw new Error(`Failed to get users: ${(error as Error).message}`)
    }
  }

  async getUser(userId: string): Promise<IntercomUser> {
    try {
      const response = await this.executeWithProtection('api.get_user', async () => {
        return this.makeApiCall(`/contacts/${userId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getUser', error as Error)
      throw new Error(`Failed to get user: ${(error as Error).message}`)
    }
  }

  async createUser(userData: {
    email?: string
    user_id?: string
    phone?: string
    name?: string
    avatar?: {
      type: 'avatar',
      image_url: string
    }
    signed_up_at?: number
    last_request_at?: number
    last_seen_ip?: string
    unsubscribed_from_emails?: boolean
    custom_attributes?: Record<string, unknown>
  }): Promise<IntercomUser> {
    try {
      const response = await this.executeWithProtection('api.create_user', async () => {
        return this.makeApiCall('/contacts', 'POST', {
          type: 'user'
          ...userData
        })
      })

      return response
    } catch (error) {
      this.logError('createUser', error as Error)
      throw new Error(`Failed to create user: ${(error as Error).message}`)
    }
  }

  async updateUser(userId: string, userData: Partial<IntercomUser>): Promise<IntercomUser> {
    try {
      const response = await this.executeWithProtection('api.update_user', async () => {
        return this.makeApiCall(`/contacts/${userId}`, 'PUT', userData)
      })

      return response
    } catch (error) {
      this.logError('updateUser', error as Error)
      throw new Error(`Failed to update user: ${(error as Error).message}`)
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_user', async () => {
        return this.makeApiCall(`/contacts/${userId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteUser', error as Error)
      throw new Error(`Failed to delete user: ${(error as Error).message}`)
    }
  }

  async getCompanies(params?: {
    page?: number
    per_page?: number
    order?: 'asc' | 'desc'
    sort?: 'created_at' | 'updated_at' | 'name' | 'monthly_spend'
  }): Promise<IntercomCompany[]> {
    try {
      const response = await this.executeWithProtection('api.get_companies', async () => {
        return this.makeApiCall('/companies', 'GET', undefined, params)
      })

      return response.data || []
    } catch (error) {
      this.logError('getCompanies', error as Error)
      throw new Error(`Failed to get companies: ${(error as Error).message}`)
    }
  }

  async getCompany(companyId: string): Promise<IntercomCompany> {
    try {
      const response = await this.executeWithProtection('api.get_company', async () => {
        return this.makeApiCall(`/companies/${companyId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getCompany', error as Error)
      throw new Error(`Failed to get company: ${(error as Error).message}`)
    }
  }

  async createCompany(companyData: {
    company_id?: string
    name?: string
    created_at?: number
    plan?: string
    monthly_spend?: number
    user_count?: number
    size?: number
    website?: string
    industry?: string
    custom_attributes?: Record<string, unknown>
  }): Promise<IntercomCompany> {
    try {
      const response = await this.executeWithProtection('api.create_company', async () => {
        return this.makeApiCall('/companies', 'POST', {
          type: 'company'
          ...companyData
        })
      })

      return response
    } catch (error) {
      this.logError('createCompany', error as Error)
      throw new Error(`Failed to create company: ${(error as Error).message}`)
    }
  }

  async updateCompany(
    companyId: string,
    companyData: Partial<IntercomCompany>
  ): Promise<IntercomCompany> {
    try {
      const response = await this.executeWithProtection('api.update_company', async () => {
        return this.makeApiCall(`/companies/${companyId}`, 'PUT', companyData)
      })

      return response
    } catch (error) {
      this.logError('updateCompany', error as Error)
      throw new Error(`Failed to update company: ${(error as Error).message}`)
    }
  }

  async deleteCompany(companyId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_company', async () => {
        return this.makeApiCall(`/companies/${companyId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteCompany', error as Error)
      throw new Error(`Failed to delete company: ${(error as Error).message}`)
    }
  }

  async sendMessage(messageData: {,
    message_type: 'inapp' | 'email' | 'push'
    subject?: string
    body: string
    template?: string
    from: {,
      type: 'admin'
      id: string
    }
    to: {,
      type: 'user'
      id?: string
      user_id?: string
      email?: string
    }
  }): Promise<IntercomMessage> {
    try {
      const response = await this.executeWithProtection('api.send_message', async () => {
        return this.makeApiCall('/messages', 'POST', messageData)
      })

      return response
    } catch (error) {
      this.logError('sendMessage', error as Error)
      throw new Error(`Failed to send message: ${(error as Error).message}`)
    }
  }

  async createNote(noteData: {,
    body: string
    admin_id: string
    contact?: {
      type: 'user' | 'lead',
      id: string
    }
  }): Promise<IntercomNote> {
    try {
      const response = await this.executeWithProtection('api.create_note', async () => {
        return this.makeApiCall('/notes', 'POST', {
          type: 'note'
          ...noteData
        })
      })

      return response
    } catch (error) {
      this.logError('createNote', error as Error)
      throw new Error(`Failed to create note: ${(error as Error).message}`)
    }
  }

  async getTags(): Promise<IntercomTag[]> {
    try {
      const response = await this.executeWithProtection('api.get_tags', async () => {
        return this.makeApiCall('/tags', 'GET')
      })

      return response.data || []
    } catch (error) {
      this.logError('getTags', error as Error)
      throw new Error(`Failed to get tags: ${(error as Error).message}`)
    }
  }

  async createTag(tagData: { name: string }): Promise<IntercomTag> {
    try {
      const response = await this.executeWithProtection('api.create_tag', async () => {
        return this.makeApiCall('/tags', 'POST', {
          type: 'tag'
          ...tagData
        })
      })

      return response
    } catch (error) {
      this.logError('createTag', error as Error)
      throw new Error(`Failed to create tag: ${(error as Error).message}`)
    }
  }

  async tagContact(contactId: string, tagId: string): Promise<IntercomTag> {
    try {
      const response = await this.executeWithProtection('api.tag_contact', async () => {
        return this.makeApiCall(`/contacts/${contactId}/tags`, 'POST', {
          id: tagId
        })
      })

      return response
    } catch (error) {
      this.logError('tagContact', error as Error)
      throw new Error(`Failed to tag contact: ${(error as Error).message}`)
    }
  }

  async untagContact(contactId: string, tagId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.untag_contact', async () => {
        return this.makeApiCall(`/contacts/${contactId}/tags/${tagId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('untagContact', error as Error)
      throw new Error(`Failed to untag contact: ${(error as Error).message}`)
    }
  }

  async searchContacts(
    query: {,
      field: string
      operator: '=' | '!=' | 'IN' | 'NIN' | '>' | '<' | '~' | '!~' | '^' | '$',
      value: string | number | boolean
    }[],
  ): Promise<IntercomUser[]> {
    try {
      const response = await this.executeWithProtection('api.search_contacts', async () => {
        return this.makeApiCall('/contacts/search', 'POST', {
          query: {,
            operator: 'AND'
            operands: query
          }
        })
      })

      return response.data || []
    } catch (error) {
      this.logError('searchContacts', error as Error)
      throw new Error(`Failed to search contacts: ${(error as Error).message}`)
    }
  }

  async getAdmins(): Promise<IntercomAdmin[]> {
    try {
      const response = await this.executeWithProtection('api.get_admins', async () => {
        return this.makeApiCall('/admins', 'GET')
      })

      return response.admins || []
    } catch (error) {
      this.logError('getAdmins', error as Error)
      throw new Error(`Failed to get admins: ${(error as Error).message}`)
    }
  }

  async getSegments(): Promise<IntercomSegment[]> {
    try {
      const response = await this.executeWithProtection('api.get_segments', async () => {
        return this.makeApiCall('/segments', 'GET')
      })

      return response.segments || []
    } catch (error) {
      this.logError('getSegments', error as Error)
      throw new Error(`Failed to get segments: ${(error as Error).message}`)
    }
  }
}
