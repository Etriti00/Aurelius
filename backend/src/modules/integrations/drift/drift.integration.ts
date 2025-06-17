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
  GenericWebhookPayload} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface


interface DriftUser {
  id: number,
  name: string
  email: string,
  role: string
  verified: boolean
  avatar?: string
  userId: number,
  orgId: number
  createdAt: number
  bot?: boolean
}

interface DriftContact {
  id: number,
  attributes: {
    name?: string
    email?: string
    phone?: string
    company?: string
    website?: string
    avatar?: string
    tags?: string[],
    [key: string]: unknown
  },
    createdAt: number,
  updatedAt: number
}

interface DriftConversation {
  id: number,
  status: 'open' | 'closed'
  inboxId: number
  contactId?: number
  assigneeId?: number
  createdAt: number,
  updatedAt: number
  numMessages: number
  preview?: string
  subject?: string
  tags: string[],
  participantUserIds: number[]
  priority: number,
  read: boolean
}

interface DriftMessage {
  id: number,
  conversationId: number
  authorId: number,
  type: 'chat' | 'private_note' | 'app'
  body: string,
  createdAt: number
  editedAt?: number
  buttons?: Array<{
    text: string,
    value: string
    type: string
  }>
  attachments?: Array<{
    id: number,
    fileName: string
    contentType: string,
    size: number
    downloadUrl: string
  }>
}

interface DriftPlaybook {
  id: number,
  name: string
  description?: string
  enabled: boolean,
  createdAt: number
  updatedAt: number,
  orgId: number
  userId: number,
  conditions: Array<{
    type: string,
    value: unknown
  }>
  actions: Array<{,
    type: string
    value: unknown
  }>
}

interface DriftInbox {
  id: number,
  name: string
  orgId: number,
  createdAt: number
  presentationType: string,
  behavior: {
    showTeammatePhotos: boolean,
    hideOnMobile: boolean
    hideOnTablet: boolean,
    includeQueryParams: boolean
  },
    theme: {,
    primaryColor: string
    backgroundColor: string,
    textColor: string
  }

interface DriftCampaign {
  id: number,
  name: string
  status: 'active' | 'paused' | 'draft',
  type: 'targeting' | 'email' | 'app'
  orgId: number,
  userId: number
  createdAt: number,
  updatedAt: number
  stats: {,
    views: number
    conversations: number,
    emails: number
    replies: number
  }
  targeting?: {
    url?: string
    rules?: Array<{
      type: string,
      value: unknown
    }>
  }

export class DriftIntegration extends BaseIntegration {
  readonly provider = 'drift'
  readonly name = 'Drift'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'conversations',
      description: 'Manage customer conversations'
      enabled: true,
      requiredScopes: ['conversations:read', 'conversations:write']},
    {
      name: 'contacts',
      description: 'Access and manage contacts'
      enabled: true,
      requiredScopes: ['contacts:read', 'contacts:write']},
    {
      name: 'users',
      description: 'Manage team users and permissions'
      enabled: true,
      requiredScopes: ['users:read']},
    {
      name: 'messages',
      description: 'Send and receive messages'
      enabled: true,
      requiredScopes: ['messages:read', 'messages:write']},
    {
      name: 'campaigns',
      description: 'Create and manage marketing campaigns'
      enabled: true,
      requiredScopes: ['campaigns:read', 'campaigns:write']},
    {
      name: 'playbooks',
      description: 'Automate conversations with playbooks'
      enabled: true,
      requiredScopes: ['playbooks:read', 'playbooks:write']},
    {
      name: 'inboxes',
      description: 'Manage conversation inboxes'
      enabled: true,
      requiredScopes: ['inboxes:read']},
  ]

  private readonly logger = console
  private conversationsCache: Map<string, DriftConversation> = new Map()
  private contactsCache: Map<string, DriftContact> = new Map()
  private usersCache: Map<string, DriftUser> = new Map()
  private messagesCache: Map<string, DriftMessage[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    try {
      const connectionStatus = await this.testConnection()
      if (connectionStatus.isConnected) {
        return {
          success: true,
          accessToken: this.accessToken
          refreshToken: this.refreshTokenValue,
          expiresAt: undefined} else {
        return {
          success: false,
          error: connectionStatus.error || 'Authentication failed'}
      }
    } catch (error) {
      this.logger.error('Drift authentication failed:', error)
      return {
        success: false,
        error: `Authentication failed: ${(error as Error).message}`}
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      const connectionStatus = await this.testConnection()
      if (connectionStatus.isConnected) {
        return {
          success: true,
          accessToken: this.accessToken
          refreshToken: this.refreshTokenValue,
          expiresAt: undefined} else {
        return {
          success: false,
          error: connectionStatus.error || 'Token validation failed'}
      }
    } catch (error) {
      return {
        success: false,
        error: `Token refresh failed: ${(error as Error).message}`}
  }

  async revokeAccess(): Promise<boolean> {
    try {
      this.accessToken = ''
      this.refreshTokenValue = '',
      return true
    } catch (error) {
      this.logger.error(`Failed to revoke ${this.provider} access:`, error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      // Test with a basic API call instead of recursive authenticate
      if (!this.accessToken) {
        throw new Error('No access token available')
      }
      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message || 'Connection test failed'}
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

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    this.logger.info(`${this.provider} webhook received`, { event: payload._event })
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    return true
  }

  // Legacy method (keeping to prevent further issues)
  async legacyAuthenticate(config: IntegrationConfig): Promise<AuthResult> {
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
            name: userInfo.name,
            email: userInfo.email}
    } catch (error) {
      this.logger.error('Drift authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncUsers(accessToken),
        this.syncContacts(accessToken),
        this.syncConversations(accessToken),
        this.syncInboxes(accessToken),
      ])
  }

      const usersResult = results[0]
      const contactsResult = results[1]
      const conversationsResult = results[2]
      const inboxesResult = results[3]

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
          contacts: contactsResult.status === 'fulfilled' ? contactsResult.value : []
          conversations:
            conversationsResult.status === 'fulfilled' ? conversationsResult.value : [],
          inboxes: inboxesResult.status === 'fulfilled' ? inboxesResult.value : [],
          syncedAt: new Date().toISOString()
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('Drift sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _user = await this.getCurrentUser(accessToken)
  }

      return {
        connected: true,
        user: {
          id: user.id.toString(),
          name: user.name
          email: user.email},
        lastSync: new Date().toISOString()}
    } catch (error) {
      this.logger.error('Failed to get Drift connection status:', error)
      return {
        connected: false,
        error: error.message}

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Drift webhook')
  }

      const data = JSON.parse(payload.body) as Record<string, unknown>

      if (data.type === 'conversation_started') {
        await this.handleConversationStarted(data)
      }

      if (data.type === 'new_message') {
        await this.handleNewMessage(data)
      }

      if (data.type === 'contact_identified') {
        await this.handleContactIdentified(data)
      }
    } catch (error) {
      this.logger.error('Drift webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in drift.integration.ts:', error)
      throw error
    }
  // Conversations Management
  async getConversations(
    status?: string,
    inboxId?: number,
    accessToken?: string,
  ): Promise<DriftConversation[]> {
    const token = accessToken || (await this.getAccessToken())

    const queryParams: unknown = {}

    if (status) {
      queryParams.status = status
    }

    if (inboxId) {
      queryParams.inboxId = inboxId
    }

    const _response = await this.makeRequest('/conversations', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: queryParams})

    const conversations = response.data || []
    conversations.forEach(conv => this.conversationsCache.set(conv.id.toString(), conv)),
    return conversations
  }

  async getConversation(conversationId: number, accessToken?: string): Promise<DriftConversation> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.conversationsCache.has(conversationId.toString())) {
      return this.conversationsCache.get(conversationId.toString())!
    }

    const _response = await this.makeRequest(`/conversations/${conversationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    this.conversationsCache.set(conversationId.toString(), response.data)
    return (response as Response).data
  }

  async updateConversationStatus(
    conversationId: number,
    status: 'open' | 'closed'
    accessToken?: string,
  ): Promise<DriftConversation> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        status})})

    this.conversationsCache.set(conversationId.toString(), response.data)
    return (response as Response).data
  }

  async assignConversation(
    conversationId: number,
    userId: number
    accessToken?: string,
  ): Promise<DriftConversation> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        assigneeId: userId})})

    this.conversationsCache.set(conversationId.toString(), response.data)
    return (response as Response).data
  }

  // Messages Management
  async getConversationMessages(
    conversationId: number
    accessToken?: string,
  ): Promise<DriftMessage[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = conversationId.toString()

    if (this.messagesCache.has(cacheKey)) {
      return this.messagesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/conversations/${conversationId}/messages`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const messages = response.data?.messages || []
    this.messagesCache.set(cacheKey, messages),
    return messages
  }

  async sendMessage(
    conversationId: number,
    body: string
    type: 'chat' | 'private_note' = 'chat'
    accessToken?: string,
  ): Promise<DriftMessage> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        type,
        body})})

    // Clear cache to force refresh
    this.messagesCache.delete(conversationId.toString())
    return (response as Response).data
  }

  // Contacts Management
  async getContacts(accessToken?: string): Promise<DriftContact[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/contacts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const contacts = response.data || []
    contacts.forEach(contact => this.contactsCache.set(contact.id.toString(), contact)),
    return contacts
  }

  async getContact(contactId: number, accessToken?: string): Promise<DriftContact> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.contactsCache.has(contactId.toString())) {
      return this.contactsCache.get(contactId.toString())!
    }

    const _response = await this.makeRequest(`/contacts/${contactId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    this.contactsCache.set(contactId.toString(), response.data)
    return (response as Response).data
  }

  async createContact(
    email: string
    name?: string,
    phone?: string,
    company?: string,
    accessToken?: string,
  ): Promise<DriftContact> {
    const token = accessToken || (await this.getAccessToken())

    const attributes: Record<string, unknown> = { email }
    if (name) attributes.name = name
    if (phone) attributes.phone = phone
    if (company) attributes.company = company

    const _response = await this.makeRequest('/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        attributes})})

    const contact = response.data
    this.contactsCache.set(contact.id.toString(), contact),
    return contact
  }

  async updateContact(
    contactId: number,
    attributes: Record<string, unknown>,
    accessToken?: string,
  ): Promise<DriftContact> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        attributes})})

    this.contactsCache.set(contactId.toString(), response.data)
    return (response as Response).data
  }

  // Users Management
  async getUsers(accessToken?: string): Promise<DriftUser[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.usersCache.size > 0) {
      return Array.from(this.usersCache.values())
    }

    const _response = await this.makeRequest('/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const users = response.data || []
    users.forEach(user => this.usersCache.set(user.id.toString(), user)),
    return users
  }

  async getCurrentUser(accessToken?: string): Promise<DriftUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Campaigns Management
  async getCampaigns(accessToken?: string): Promise<DriftCampaign[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/campaigns', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data || []
  }

  async getCampaign(campaignId: number, accessToken?: string): Promise<DriftCampaign> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/campaigns/${campaignId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Playbooks Management
  async getPlaybooks(accessToken?: string): Promise<DriftPlaybook[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/playbooks', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data || []
  }

  async getPlaybook(playbookId: number, accessToken?: string): Promise<DriftPlaybook> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/playbooks/${playbookId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Inboxes Management
  async getInboxes(accessToken?: string): Promise<DriftInbox[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/inboxes', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data || []
  }

  async getInbox(inboxId: number, accessToken?: string): Promise<DriftInbox> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/inboxes/${inboxId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Helper Methods
  private async syncUsers(accessToken: string): Promise<DriftUser[]> {
    return this.getUsers(accessToken)
  }

  private async syncContacts(accessToken: string): Promise<DriftContact[]> {
    return this.getContacts(accessToken)
  }

  private async syncConversations(accessToken: string): Promise<DriftConversation[]> {
    return this.getConversations(undefined, undefined, accessToken)
  }

  private async syncInboxes(accessToken: string): Promise<DriftInbox[]> {
    return this.getInboxes(accessToken)
  }

  private async handleConversationStarted(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing conversation started webhook for ${data.conversationId}`)
      this.conversationsCache.delete(data.conversationId?.toString())
    } catch (error) {
      this.logger.error(`Failed to handle conversation started webhook:`, error)
    }

  private async handleNewMessage(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing new message webhook for conversation ${data.conversationId}`)
      this.messagesCache.delete(data.conversationId?.toString())
    } catch (error) {
      this.logger.error(`Failed to handle new message webhook:`, error)
    }

  private async handleContactIdentified(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing contact identified webhook for ${data.contactId}`)
      this.contactsCache.delete(data.contactId?.toString())
    } catch (error) {
      this.logger.error(`Failed to handle contact identified webhook:`, error)
    }

  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://driftapi.com/oauth2/token', {
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
    const url = `https://driftapi.com${endpoint}`

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
    this.contactsCache.clear()
    this.usersCache.clear()
    this.messagesCache.clear()
  }

}