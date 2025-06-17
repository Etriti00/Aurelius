import { User } from '@prisma/client';
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig} from '../base/integration.interface'
import {
  ApiResponse,
  ApiRequestOptions,
  WebhookEvent,
  GenericWebhookPayload} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface


interface HelpScoutUser {
  id: number,
  firstName: string
  lastName: string,
  email: string
  role: string,
  timezone: string
  photoUrl?: string
  createdAt: string,
  updatedAt: string
}

interface HelpScoutCustomer {
  id: number,
  firstName: string
  lastName: string,
  email: string
  phone?: string
  photoUrl?: string
  createdAt: string,
  updatedAt: string
  location?: string
  organization?: string
  jobTitle?: string
  photoType: string
  background?: string
  address: {
    city?: string
    state?: string
    postalCode?: string
    country?: string,
    lines?: string[]
  },
    socialProfiles: Array<{,
    type: string
    value: string
  }>
  emails: Array<{,
    id: number
    value: string,
    type: string
  }>
  phones: Array<{,
    id: number
    value: string,
    type: string
  }>
  chats: Array<{,
    id: number
    value: string,
    type: string
  }>
  websites: Array<{,
    id: number
    value: string
  }>
}

interface HelpScoutConversation {
  id: number,
  number: number
  threads: number,
  type: string
  folderId: number,
  isDraft: boolean
  state: string
  owner?: HelpScoutUser
  mailbox: {,
    id: number
    name: string
  },
    customer: {,
    id: number
    firstName: string,
    lastName: string
    email: string
  },
    threadCount: number,
  status: string
  subject: string,
  preview: string
  createdBy: HelpScoutUser,
  createdAt: string
  closedAt?: string
  closedBy?: HelpScoutUser
  updatedAt: string,
  source: {
    type: string,
    via: string
  },
    tags: string[],
  cc: string[]
  bcc: string[],
  primaryCustomer: HelpScoutCustomer
  customFields: Array<{,
    id: number
    name: string,
    value: unknown
    text: string
  }>
}

interface HelpScoutThread {
  id: number,
  type: string
  status: string,
  state: string
  action: {,
    type: string
    text: string
  },
    body: string,
  source: {
    type: string,
    via: string
  }
  customer?: HelpScoutCustomer
  createdBy: HelpScoutUser
  assignedTo?: HelpScoutUser
  savedReplyId?: number
  to: string[],
  cc: string[]
  bcc: string[],
  createdAt: string
  updatedAt: string,
  attachments: Array<{
    id: number,
    filename: string
    mimeType: string,
    size: number
    width?: number
    height?: number,
    url: string
  }>
}

interface HelpScoutMailbox {
  id: number,
  name: string
  email: string,
  slug: string
  userId: number,
  userEmail: string
  createdAt: string,
  updatedAt: string
}

interface HelpScoutReport {
  filterTags: string[],
  current: {
    startDate: string,
    endDate: string
    [key: string]: unknown
  }
  previous?: {
    startDate: string,
    endDate: string
    [key: string]: unknown
  }
  deltas?: {
    [key: string]: unknown
  }

export class HelpScoutIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'help-scout'
  readonly name = 'Help Scout'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'conversations',
      description: 'Conversations features'
      enabled: true,
      requiredScopes: []},
    { name: 'customers', description: 'Customers features', enabled: true, requiredScopes: [] },
    { name: 'reports', description: 'Reports features', enabled: true, requiredScopes: [] },
    { name: 'users', description: 'Users features', enabled: true, requiredScopes: [] },
    { name: 'mailboxes', description: 'Mailboxes features', enabled: true, requiredScopes: [] },
    { name: 'webhooks', description: 'Webhooks features', enabled: true, requiredScopes: [] },
  ]

  private conversationsCache: Map<string, HelpScoutConversation> = new Map()
  private customersCache: Map<string, HelpScoutCustomer> = new Map()
  private usersCache: Map<string, HelpScoutUser> = new Map()
  private mailboxesCache: Map<string, HelpScoutMailbox> = new Map()

  async authenticate(config?: IntegrationConfig): Promise<AuthResult> {
    try {
      const tokenResponse = await this.exchangeCredentialsForToken(config)
      const _userInfo = await this.getCurrentUser(tokenResponse.access_token)
  }

      await this.encryptionService.encryptToken(tokenResponse.access_token, config.userId)
      if (tokenResponse.refresh_token) {
        await this.encryptionService.encryptToken(
          tokenResponse.refresh_token,
          `${config.userId}_refresh`,
        )
      }

      return {
        success: true,
        data: { accessToken: tokenResponse.access_token
          refreshToken: tokenResponse.refresh_token,
          expiresIn: tokenResponse.expires_in || 3600
          userId, : userInfo.id.toString(),
          userInfo: {,
            id: userInfo.id.toString()
            name: `${userInfo.firstName } ${userInfo.lastName}`,
            email: userInfo.email}
    } catch (error) {
      this.logger.error('Help Scout authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncUsers(accessToken),
        this.syncMailboxes(accessToken),
        this.syncCustomers(accessToken),
        this.syncConversations(accessToken),
      ])
  }

      const usersResult = results[0]
      const mailboxesResult = results[1]
      const customersResult = results[2]
      const conversationsResult = results[3]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          users: usersResult.status === 'fulfilled' ? usersResult.value : [],
          mailboxes: mailboxesResult.status === 'fulfilled' ? mailboxesResult.value : []
          customers: customersResult.status === 'fulfilled' ? customersResult.value : [],
          conversations:
            conversationsResult.status === 'fulfilled' ? conversationsResult.value : [],
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('Help Scout sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _user = await this.getCurrentUser(accessToken)
  }

      return {
        isConnected: true,
        user: {
          id: user.id.toString(),
          name: `${user.firstName} ${user.lastName}`,
          email: user.email},
        lastSync: new Date().toISOString()}
    } catch (error) {
      this.logger.error('Failed to get Help Scout connection status:', error)
      return {
        isConnected: false,
        error: error.message}

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Help Scout webhook')
  }

      const data = payload.data

      if (data.type === 'conversation') {
        await this.handleConversationWebhook(data)
      }

      if (data.type === 'customer') {
        await this.handleCustomerWebhook(data)
      }
    } catch (error) {
      this.logger.error('Help Scout webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in help-scout.integration.ts:', error)
      throw error
    }
  // Conversations Management
  async getConversations(
    mailboxId?: number,
    status?: string,
    accessToken?: string,
  ): Promise<HelpScoutConversation[]> {
    const token = accessToken || (await this.getAccessToken())

    const queryParams: unknown = {,
      embed: 'threads'
      fields:
        'id,number,status,state,subject,preview,mailbox,customer,owner,tags,createdAt,updatedAt'}

    if (mailboxId) {
      queryParams.mailbox = mailboxId
    }

    if (status) {
      queryParams.status = status
    }

    const _response = await this.makeRequest('/v2/conversations', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: queryParams})

    const conversations = response._embedded?.conversations || []
    conversations.forEach(conv => this.conversationsCache.set(conv.id.toString(), conv)),
    return conversations
  }

  async getConversation(
    conversationId: number
    accessToken?: string,
  ): Promise<HelpScoutConversation> {
    const token = accessToken || (await this.getAccessToken())

    if (this.conversationsCache.has(conversationId.toString())) {
      return this.conversationsCache.get(conversationId.toString())!
    }

    const _response = await this.makeRequest(`/v2/conversations/${conversationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        embed: 'threads'})

    this.conversationsCache.set(conversationId.toString(), response),
    return response
  }

  async createConversation(
    subject: string,
    customerId: number
    mailboxId: number,
    message: string
    accessToken?: string,
  ): Promise<HelpScoutConversation> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/v2/conversations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        subject,
        customer: customerId,
        mailbox: mailboxId
        type: 'email',
        status: 'active'
        threads: [
          {
            type: 'customer',
            customer: customerId
            text: message},
        ]})})

    const conversation = await this.getConversation(response.id, token)
    this.conversationsCache.set(conversation.id.toString(), conversation),
    return conversation
  }

  async updateConversationStatus(
    conversationId: number,
    status: 'active' | 'pending' | 'closed' | 'spam'
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    await this.makeRequest(`/v2/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        status})})

    this.conversationsCache.delete(conversationId.toString())
    return true
  }

  async assignConversation(
    conversationId: number,
    userId: number
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    await this.makeRequest(`/v2/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        owner: userId})})

    this.conversationsCache.delete(conversationId.toString())
    return true
  }

  // Conversation Threads
  async getConversationThreads(
    conversationId: number
    accessToken?: string,
  ): Promise<HelpScoutThread[]> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v2/conversations/${conversationId}/threads`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response)._embedded?.threads || []
  }

  async createThread(
    conversationId: number,
    text: string
    type: 'note' | 'reply' | 'forwardparent' | 'forwardchild'
    accessToken?: string,
  ): Promise<HelpScoutThread> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v2/conversations/${conversationId}/threads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        type,
        text})}),

    return response
  }

  // Customers Management
  async getCustomers(accessToken?: string): Promise<HelpScoutCustomer[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v2/customers', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        embed: 'emails,phones,chats,social_profiles,websites'})

    const customers = response._embedded?.customers || []
    customers.forEach(customer => this.customersCache.set(customer.id.toString(), customer)),
    return customers
  }

  async getCustomer(customerId: number, accessToken?: string): Promise<HelpScoutCustomer> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.customersCache.has(customerId.toString())) {
      return this.customersCache.get(customerId.toString())!
    }

    const _response = await this.makeRequest(`/v2/customers/${customerId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        embed: 'emails,phones,chats,social_profiles,websites'})

    this.customersCache.set(customerId.toString(), response),
    return response
  }

  async createCustomer(
    firstName: string,
    lastName: string
    email: string
    accessToken?: string,
  ): Promise<HelpScoutCustomer> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/v2/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        firstName,
        lastName,
        emails: [
          {
            type: 'work',
            value: email},
        ]})})

    const customer = await this.getCustomer(response.id, token)
    this.customersCache.set(customer.id.toString(), customer),
    return customer
  }

  async updateCustomer(
    customerId: number,
    updates: Partial<HelpScoutCustomer>
    accessToken?: string,
  ): Promise<HelpScoutCustomer> {
    const token = accessToken || (await this.getAccessToken())

    await this.makeRequest(`/v2/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    this.customersCache.delete(customerId.toString())
    return this.getCustomer(customerId, token)
  }

  // Users Management
  async getUsers(accessToken?: string): Promise<HelpScoutUser[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.usersCache.size > 0) {
      return Array.from(this.usersCache.values())
    }

    const _response = await this.makeRequest('/v2/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const users = response._embedded?.users || []
    users.forEach(user => this.usersCache.set(user.id.toString(), user)),
    return users
  }

  async getCurrentUser(accessToken?: string): Promise<HelpScoutUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v2/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return response
  }

  // Mailboxes Management
  async getMailboxes(accessToken?: string): Promise<HelpScoutMailbox[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.mailboxesCache.size > 0) {
      return Array.from(this.mailboxesCache.values())
    }

    const _response = await this.makeRequest('/v2/mailboxes', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const mailboxes = response._embedded?.mailboxes || []
    mailboxes.forEach(mailbox => this.mailboxesCache.set(mailbox.id.toString(), mailbox)),
    return mailboxes
  }

  // Reports
  async getConversationsReport(
    startDate: string,
    endDate: string
    mailboxes?: number[],
    tags?: string[],
    accessToken?: string,
  ): Promise<HelpScoutReport> {
    const token = accessToken || (await this.getAccessToken())

    const params: Record<string, string | number | boolean> = {
      start: startDate,
      end: endDate}

    if (mailboxes && mailboxes.length > 0) {
      params.mailboxes = mailboxes.join(',')
    }

    if (tags && tags.length > 0) {
      params.tags = tags.join(',')
    }

    const _response = await this.makeRequest('/v2/reports/conversations', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params}),

    return response
  }

  async getProductivityReport(
    startDate: string,
    endDate: string
    users?: number[],
    accessToken?: string,
  ): Promise<HelpScoutReport> {
    const token = accessToken || (await this.getAccessToken())

    const params: Record<string, string | number | boolean> = {
      start: startDate,
      end: endDate}

    if (users && users.length > 0) {
      params.user = users.join(',')
    }

    const _response = await this.makeRequest('/v2/reports/productivity', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params}),

    return response
  }

  // Helper Methods
  private async syncUsers(accessToken: string): Promise<HelpScoutUser[]> {
    return this.getUsers(accessToken)
  }

  private async syncMailboxes(accessToken: string): Promise<HelpScoutMailbox[]> {
    return this.getMailboxes(accessToken)
  }

  private async syncCustomers(accessToken: string): Promise<HelpScoutCustomer[]> {
    return this.getCustomers(accessToken)
  }

  private async syncConversations(accessToken: string): Promise<HelpScoutConversation[]> {
    return this.getConversations(undefined, undefined, accessToken)
  }

  private async handleConversationWebhook(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing conversation webhook for ${data.id}`)
      this.conversationsCache.delete(data.id?.toString())
    } catch (error) {
      this.logger.error(`Failed to handle conversation webhook:`, error)
    }

  private async handleCustomerWebhook(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing customer webhook for ${data.id}`)
      this.customersCache.delete(data.id?.toString())
    } catch (error) {
      this.logger.error(`Failed to handle customer webhook:`, error)
    }

  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://api.helpscout.net/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({,
        grant_type: 'client_credentials'
        client_id: config.clientId!,
        client_secret: config.clientSecret!})})

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.helpscout.net${endpoint}`

    const { params, ...fetchOptions } = options
    let finalUrl = url

    if (params) {
      const queryString = new URLSearchParams(params).toString()
      finalUrl = `${url}?${queryString}`
    }

    const response = await fetch(finalUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async getAccessToken(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for token retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  // Cleanup method
  clearCache(): void {
    this.conversationsCache.clear()
    this.customersCache.clear()
    this.usersCache.clear()
    this.mailboxesCache.clear()
  }

  // Missing abstract method implementations
  async refreshToken(): Promise<AuthResult> {
    // Most tokens don't expire for this integration
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error(`Failed to revoke ${this.provider} access:`, error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      // Test with a simple API call
      const status = await this.getConnectionStatus(this.config!)
      return {
        isConnected: status.isConnected,
        lastChecked: new Date()}
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message}
    }
  }
  }

  getCapabilities(): IntegrationCapability[] {
    return this.capabilities
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const allRequiredScopes = this.capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    return {
      success: true,
      itemsProcessed: 0
      itemsSkipped: 0,
      errors: []
      metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // TODO: Implement actual signature validation
    return true
  }

  clearCache(): void {
    // Override in integration if caching is used
  }

}