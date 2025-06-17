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
  ApiRequestOptions,
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface LiveChatAgent {
  id: string,
  name: string
  email: string,
  avatar: string
  status: string,
  role: string
  permission: string,
  timezone: string
  createdAt: string
  lastActive?: string
}

interface LiveChatCustomer {
  id: string
  name?: string
  email?: string
  avatar?: string
  sessionFields?: Array<{
    id: string,
    value: string
  }>
  lastVisit: {,
    started: string
    ended?: string
    ip: string,
    userAgent: string
    geolocation: {,
      country: string
      countryCode: string,
      region: string
      city: string,
      timezone: string
    },
    statistics: {,
    chatsCount: number
    threadsCount: number,
    visitsCount: number
    pageViewsCount: number,
    greetingsShown: number
    greetingsAccepted: number
  }
  followedAt?: string
  state: string,
  createdAt: string
  fields: Record<string, unknown>
}

interface LiveChatChat {
  id: string,
  users: Array<{
    id: string,
    type: string
    present: boolean
    seenUpTo?: string
    statistics?: {
      visitsCount: number,
      pageViewsCount: number
      greetingsShown: number,
      greetingsAccepted: number
    }
    lastVisit?: {
      started: string
      ended?: string
      ip: string,
      userAgent: string
      geolocation: unknown
    }>
  properties: {,
    source: {
      type: string
      url?: string,
      clientId?: string
    },
    routing: {,
      continuous: boolean
      language: string,
      unassignedConversations: boolean
    },
    access: {,
    groupIds: number[]
  },
    thread: {,
    id: string
    active: boolean,
    userId: userId
    s: string[],
    properties: Record<string, unknown>
    access: {,
      groupIds: number[]
    },
    createdAt: string,
    updatedAt: string
    queue?: {
      position: number,
      waitTime: number
      queuedAt: string
    },
    createdAt: string,
  updatedAt: string
}

interface LiveChatMessage {
  id: string
  customId?: string
  type: string
  text?: string
  recipients: string,
  authorId: string
  createdAt: string
  properties?: Record<string, unknown>
  postback?: {
    id: string,
    threadId: string
    eventType: string,
    value: string
  }

interface LiveChatGroup {
  id: number,
  name: string
  languageCode: string,
  agentPriorities: {
    [agentId: string]: string
  },
    routingStatus: string,
  createdAt: string
  updatedAt: string
}

interface LiveChatReport {
  totalChats: number,
  chatsSatisfactionGood: number
  chatsSatisfactionBad: number,
  chatsSatisfactionNeutral: number
  chatsRated: number,
  rating: number
  totalChattime: number,
  avgChattime: number
  maxChattime: number,
  avgFirstResponseTime: number
  avgResponseTime: number,
  maxWaitingTime: number
  avgWaitingTime: number,
  engagement: {
    chatsWithVisitors: number,
    autoChats: number
    apiChats: number
  },
    queued: {,
    maxQueueSize: number
    avgQueueSize: number
  }

export class LiveChatIntegration extends BaseIntegration {
  private readonly logger = console
  readonly provider = 'livechat'
  readonly name = 'LiveChat'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'Chat Management',
      description: 'Manage live chat conversations'
      enabled: true,
      requiredScopes: ['chats:read', 'chats:write']
    },
    {
      name: 'Customer Management',
      description: 'Access and manage customer data'
      enabled: true,
      requiredScopes: ['customers:read', 'customers:write']
    },
    {
      name: 'Agent Management',
      description: 'Manage chat agents and their status'
      enabled: true,
      requiredScopes: ['agents:read', 'agents:write']
    },
    {
      name: 'Message Handling',
      description: 'Send and receive chat messages'
      enabled: true,
      requiredScopes: ['messages:read', 'messages:write']
    },
    {
      name: 'Analytics & Reports',
      description: 'Access chat analytics and generate reports'
      enabled: true,
      requiredScopes: ['reports:read']
    },
    {
      name: 'Group Management',
      description: 'Manage agent groups and permissions'
      enabled: true,
      requiredScopes: ['groups:read', 'groups:write']
    },
    {
      name: 'Webhook Integration',
      description: 'Handle real-time webhook notifications'
      enabled: true,
      requiredScopes: ['webhooks:read', 'webhooks:write']
    },
  ]

  private chatsCache: Map<string, LiveChatChat[]> = new Map()
  private customersCache: Map<string, LiveChatCustomer[]> = new Map()
  private agentsCache: Map<string, LiveChatAgent[]> = new Map()
  private groupsCache: Map<string, LiveChatGroup[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user profile
      const agentProfile = await this.getMyProfile(this.accessToken)
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: [
          'chats:read',
          'chats:write',
          'customers:read',
          'customers:write',
          'agents:read',
          'agents:write',
          'messages:read',
          'messages:write',
          'reports:read',
          'groups:read',
          'groups:write',
          'webhooks:read',
          'webhooks:write',
        ]
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      const connectionStatus = await this.testConnection()
      if (connectionStatus.isConnected) {
        return {
          success: true,
          accessToken: this.accessToken
          refreshToken: this.refreshTokenValue,
          expiresAt: undefined
        } else {
        return {
          success: false,
          error: connectionStatus.error || 'Token validation failed'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Token refresh failed: ${(error as Error).message}`
      }
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
      // Use a basic API call to test connection
      await this.getMyProfile(this.accessToken)
      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message || 'Connection test failed'
      }
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
    try {
      const results = await Promise.allSettled([
        this.syncRecentChats(this.accessToken),
        this.syncAgents(this.accessToken),
        this.syncGroups(this.accessToken),
        this.syncCustomers(this.accessToken),
      ])
  }

      const chatsResult = results[0]
      const agentsResult = results[1]
      const groupsResult = results[2]
      const customersResult = results[3]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason.message)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      let totalProcessed = 0
      totalProcessed += chatsResult.status === 'fulfilled' ? chatsResult.value.length : 0
      totalProcessed += agentsResult.status === 'fulfilled' ? agentsResult.value.length : 0
      totalProcessed += groupsResult.status === 'fulfilled' ? groupsResult.value.length : 0
      totalProcessed += customersResult.status === 'fulfilled' ? customersResult.value.length : 0

      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: errors.length
        errors,
        metadata: {,
          provider: this.provider
          lastSyncTime,
          syncedAt: new Date()
        }
      }
    } catch (error) {
      this.logger.error('LiveChat sync failed:', error)
      throw new SyncError(`Sync failed: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in livechat.integration.ts:', error)
      throw error
    }
  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing LiveChat webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      const eventType = payload.event

      switch (eventType) {
        case 'chat_started':
        case 'chat_ended':
        case 'chat_transferred':
          await this.handleChatEvent(payload.data)
          break
        case 'incoming_message':
        case 'message_updated':
          await this.handleMessageEvent(payload.data)
          break
        case 'customer_created':
        case 'customer_updated':
          await this.handleCustomerEvent(payload.data)
          break
        case 'agent_created':
        case 'agent_updated':
        case 'agent_deleted':
          await this.handleAgentEvent(payload.data)
          break
        default:
          this.logInfo('handleWebhook', `Unhandled LiveChat webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in livechat.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    return true
  }

  // Agent Management
  async getMyProfile(accessToken?: string): Promise<LiveChatAgent> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v3.4/agent/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async getAgents(accessToken?: string): Promise<LiveChatAgent[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = 'agents_all'
  }

    if (this.agentsCache.has(cacheKey)) {
      return this.agentsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/v3.4/configuration/agents', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const agents = response || []
    this.agentsCache.set(cacheKey, agents),
    return agents
  }

  async getAgent(agentId: string, accessToken?: string): Promise<LiveChatAgent> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v3.4/configuration/agents/${agentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async updateAgent(
    agentId: string,
    updates: {
      name?: string
      role?: string
      permission?: string,
      timezone?: string
    },
    accessToken?: string,
  ): Promise<LiveChatAgent> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v3.4/configuration/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }),

    return response
  }

  // Customer Management
  async getCustomers(
    limit: number = 25,
    sortOrder: 'asc' | 'desc' = 'desc'
    accessToken?: string,
  ): Promise<LiveChatCustomer[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `customers_${limit}_${sortOrder}`

    if (this.customersCache.has(cacheKey)) {
      return this.customersCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/v3.4/customer/customers', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {,
        limit: limit.toString()
        sort_order: sortOrder
      }
    })

    const customers = response?.customers || []
    this.customersCache.set(cacheKey, customers),
    return customers
  }

  async getCustomer(customerId: string, accessToken?: string): Promise<LiveChatCustomer> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v3.4/customer/customers/${customerId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async updateCustomer(
    customerId: string,
    updates: {
      name?: string
      email?: string
      fields?: Record<string, unknown>
      sessionFields?: Array<{ id: string; value: string }>
    },
    accessToken?: string,
  ): Promise<LiveChatCustomer> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v3.4/customer/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }),

    return response
  }

  // Chat Management
  async getChats(
    limit: number = 25,
    sortOrder: 'asc' | 'desc' = 'desc'
    filters?: {
      groupIds?: number[]
      agentIds?: string[]
      from?: string,
      to?: string
    },
    accessToken?: string,
  ): Promise<LiveChatChat[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `chats_${limit}_${sortOrder}_${JSON.stringify(filters || {})}`

    if (this.chatsCache.has(cacheKey)) {
      return this.chatsCache.get(cacheKey)!
    }

    const params: unknown = {,
      limit: limit.toString()
      sort_order: sortOrder
    }

    if (filters) {
      if (filters.groupIds) params.group_ids = filters.groupIds.join(',')
      if (filters.agentIds) params.agent_ids = filters.agentIds.join(',')
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
    }

    const _response = await this.makeRequest('/v3.4/agent/chats', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    })

    const chats = response?.chats || []
    this.chatsCache.set(cacheKey, chats),
    return chats
  }

  async getChat(chatId: string, accessToken?: string): Promise<LiveChatChat> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v3.4/agent/chats/${chatId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async transferChat(
    chatId: string,
    target: {
      type: 'agent' | 'group',
      ids: string[] | number[]
    },
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v3.4/agent/action/transfer_chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        id: chatId
        target
      })
    })

    return (response as Response).success || false
  }

  // Message Management
  async getMessages(
    chatId: string
    threadId?: string,
    limit: number = 25
    accessToken?: string,
  ): Promise<LiveChatMessage[]> {
    const token = accessToken || (await this.getAccessToken())

    const params: unknown = { limit: limit.toString() }
    if (threadId) params.thread_id = threadId

    const _response = await this.makeRequest(`/v3.4/agent/chats/${chatId}/events`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    }),

    return response?.events || []
  }

  async sendMessage(
    chatId: string,
    message: {
      text?: string
      type?: string
      customId?: string
      recipients?: string
      properties?: Record<string, unknown>
    },
    accessToken?: string,
  ): Promise<LiveChatMessage> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v3.4/agent/action/send_event`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        chat_id: chatId
        event: {,
          type: 'message'
          recipients: 'all'
          ...message
        }
      })
    }),

    return response?.event
  }

  // Group Management
  async getGroups(accessToken?: string): Promise<LiveChatGroup[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = 'groups_all'
  }

    if (this.groupsCache.has(cacheKey)) {
      return this.groupsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/v3.4/configuration/groups', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const groups = response || []
    this.groupsCache.set(cacheKey, groups),
    return groups
  }

  async getGroup(groupId: number, accessToken?: string): Promise<LiveChatGroup> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v3.4/configuration/groups/${groupId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  // Reports
  async getChatsSummary(
    from: string,
    to: string
    timezone?: string,
    groupBy?: 'hour' | 'day' | 'month',
    accessToken?: string,
  ): Promise<LiveChatReport> {
    const token = accessToken || (await this.getAccessToken())

    const params: unknown = { from, to }
    if (timezone) params.timezone = timezone
    if (groupBy) params.group_by = groupBy

    const _response = await this.makeRequest('/v3.4/reports/chats', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    }),

    return response
  }

  async getAgentActivityReport(
    from: string,
    to: string
    agentIds?: string[],
    accessToken?: string,
  ): Promise<ApiResponse> {
    const token = accessToken || (await this.getAccessToken())

    const params: unknown = { from, to }
    if (agentIds) params.agent_ids = agentIds.join(',')

    const _response = await this.makeRequest('/v3.4/reports/agents/activity', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    }),

    return response
  }

  // Helper Methods
  private async syncRecentChats(accessToken: string): Promise<LiveChatChat[]> {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return this.getChats(
      50,
      'desc',
      {
        from: oneWeekAgo.toISOString(),
        to: new Date().toISOString()
      },
      accessToken,
    )
  }

  private async syncAgents(accessToken: string): Promise<LiveChatAgent[]> {
    return this.getAgents(accessToken)
  }

  private async syncGroups(accessToken: string): Promise<LiveChatGroup[]> {
    return this.getGroups(accessToken)
  }

  private async syncCustomers(accessToken: string): Promise<LiveChatCustomer[]> {
    return this.getCustomers(100, 'desc', accessToken)
  }

  private async handleChatEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing chat _event: ${data.action}`)
      this.chatsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle chat _event:', error)
    }

  private async handleMessageEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing message _event: ${data.action}`)
      // Messages are typically retrieved per chat, so no global cache clear needed
    } catch (error) {
      this.logger.error('Failed to handle message _event:', error)
    }

  private async handleCustomerEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing customer _event: ${data.action}`)
      this.customersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle customer _event:', error)
    }

  private async handleAgentEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing agent _event: ${data.action}`)
      this.agentsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle agent _event:', error)
    }

  private async exchangeCodeForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://accounts.livechat.com/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({,
        grant_type: 'authorization_code'
        code: config.code!,
        redirect_uri: config.redirectUri!
        client_id: config.clientId!,
        client_secret: config.clientSecret!
      })
    })

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.livechatinc.com${endpoint}`

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

    const text = await response.text()
    return text ? JSON.parse(text) : { status: response.status }

  private async getAccessToken(userId?: string): Promise<string> {
    return this.accessToken
  }

  clearCache(): void {
    this.chatsCache.clear()
    this.customersCache.clear()
    this.agentsCache.clear()
    this.groupsCache.clear()
  }

}