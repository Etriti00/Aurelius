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
import { ApiResponse, GenericWebhookPayload } from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface SegmentWorkspace {
  id: string,
  name: string
  display_name: string,
  slug: string
  created_at: string,
  updated_at: string
}

interface SegmentSource {
  id: string,
  workspace_id: string
  name: string,
  slug: string
  write_keys: string[],
  library_config: Record<string, unknown>
  enabled: boolean,
  catalog_id: string
  created_at: string,
  updated_at: string
  metadata: {,
    id: string
    name: string,
    description: string
    slug: string,
    logos: {
      default: string
      mark?: string,
      alt?: string
    },
    options: Array<{,
      name: string
      type: string,
      description: string
      required: boolean
    }>,
    categories: string[]
  }
  settings: Record<string, unknown>
}

interface SegmentDestination {
  id: string,
  source_id: string
  name: string,
  enabled: boolean
  connection_mode: string,
  metadata: {
    id: string,
    name: string
    description: string,
    slug: string
    logos: {,
      default: string
      mark?: string,
      alt?: string
    },
    options: Array<{,
      name: string
      type: string,
      description: string
      required: boolean
    }>
    categories: string[]
    website?: string
  }
  settings: Record<string, unknown>
  created_at: string,
  updated_at: string
}

interface SegmentUser {
  id: string,
  workspace_id: string
  email: string,
  first_name: string
  last_name: string,
  permissions: Array<{
    resource_type: string,
    resource_id: string
    role_id: string,
    role_name: string
  }>
  created_at: string,
  updated_at: string
}

interface SegmentSchema {
  source_id: string,
  collection: string
  key: string,
  type: string
  description?: string
  required: boolean
  properties?: Record<
    string,
    {
      type: string
      description?: string,
      required: boolean
    },
  >
}

interface SegmentEvent {
  event: string,
  properties: Record<string, unknown>
  context: {,
    library: {
      name: string,
      version: string
    }
    user_agent?: string
    ip?: string
    locale?: string,
    timezone?: string
  },
    createdAt: string
  user_id?: string
  anonymous_id?: string
  message_id: string,
  type: 'track' | 'page' | 'screen' | 'identify' | 'group' | 'alias'
}

interface SegmentAudience {
  id: string,
  workspace_id: string
  name: string
  description?: string
  definition: {,
    source_id: string
    conditions: Array<{,
      type: string
      property: string,
      operator: string
      value: unknown
    }>
  },
    created_at: string,
  updated_at: string
  computed_at?: string,
  size?: number
}

interface SegmentProfile {
  id: string,
  workspace_id: string
  user_id?: string
  anonymous_id?: string
  email?: string
  traits: Record<string, unknown>
  events_count: number,
  first_seen: string
  last_seen: string,
  created_at: string
  updated_at: string
}

export class SegmentIntegration extends BaseIntegration {
  private readonly logger = console
  readonly provider = 'segment'
  readonly name = 'Segment'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'Event Tracking',
      description: 'Track user events and analytics data'
      enabled: true,
      requiredScopes: ['workspace:read', 'events:write']
    },
    {
      name: 'Source Management',
      description: 'Manage data sources and their configuration'
      enabled: true,
      requiredScopes: ['workspace:read', 'sources:read', 'sources:write']
    },
    {
      name: 'Destination Management',
      description: 'Configure data destinations and routing'
      enabled: true,
      requiredScopes: ['workspace:read', 'destinations:read', 'destinations:write']
    },
    {
      name: 'User Profiles',
      description: 'Access and manage user profile data'
      enabled: true,
      requiredScopes: ['workspace:read', 'profiles:read']
    },
    {
      name: 'Audience Management',
      description: 'Create and manage user audiences'
      enabled: true,
      requiredScopes: ['workspace:read', 'audiences:read', 'audiences:write']
    },
    {
      name: 'Schema Management',
      description: 'Manage data schemas and validation'
      enabled: true,
      requiredScopes: ['workspace:read', 'schemas:read', 'schemas:write']
    },
  ]

  private workspacesCache: Map<string, SegmentWorkspace> = new Map()
  private sourcesCache: Map<string, SegmentSource[]> = new Map()
  private destinationsCache: Map<string, SegmentDestination[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication with current token
      const _userInfo = await this.getCurrentUser(this.accessToken)
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: [
          'workspace:read',
          'events:write',
          'sources:read',
          'sources:write',
          'destinations:read',
          'destinations:write',
          'profiles:read',
          'audiences:read',
          'audiences:write',
          'schemas:read',
          'schemas:write',
        ]
      }
    } catch (error) {
      this.logger.error('Segment authentication failed:', error)
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
      await this.getCurrentUser(this.accessToken)
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
    return {
      success: true,
      itemsProcessed: 0
      itemsSkipped: 0,
      errors: []
      metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
    }
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

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncWorkspaces(accessToken),
        this.syncSources(accessToken),
        this.syncDestinations(accessToken),
      ])
  }

      const workspacesResult = results[0]
      const sourcesResult = results[1]
      const destinationsResult = results[2]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          workspaces: workspacesResult.status === 'fulfilled' ? workspacesResult.value : [],
          sources: sourcesResult.status === 'fulfilled' ? sourcesResult.value : []
          destinations: destinationsResult.status === 'fulfilled' ? destinationsResult.value : [],
          syncedAt: new Date().toISOString()
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined
        }
      }
    } catch (error) {
      this.logger.error('Segment sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in segment.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _user = await this.getCurrentUser(accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to get Segment connection status:', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message
      }

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Segment webhook')
  }

      const data = JSON.parse(payload.body) as Record<string, unknown>

      switch (data.type) {
        case 'source.created':
        case 'source.updated':
        case 'source.deleted':
          await this.handleSourceChange(data.data)
          break
        case 'destination.created':
        case 'destination.updated':
        case 'destination.deleted':
          await this.handleDestinationChange(data.data)
          break
        case 'audience.computed':
          await this.handleAudienceChange(data.data)
          break
        default:
          this.logger.log(`Unhandled Segment webhook _event: ${data.type}`)
      }
      }
    } catch (error) {
      this.logger.error('Segment webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in segment.integration.ts:', error)
      throw error
    }
  // User Management
  async getCurrentUser(accessToken?: string): Promise<SegmentUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data
  }

  // Workspaces Management
  async getWorkspaces(accessToken?: string): Promise<SegmentWorkspace[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/workspaces', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const workspaces = response.data || []
    workspaces.forEach(workspace => this.workspacesCache.set(workspace.id, workspace)),
    return workspaces
  }

  async getWorkspace(workspaceId: string, accessToken?: string): Promise<SegmentWorkspace> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.workspacesCache.has(workspaceId)) {
      return this.workspacesCache.get(workspaceId)!
    }

    const _response = await this.makeRequest(`/workspaces/${workspaceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const workspace = response.data
    this.workspacesCache.set(workspaceId, workspace),
    return workspace
  }

  // Sources Management
  async getSources(workspaceId?: string, accessToken?: string): Promise<SegmentSource[]> {
    const token = accessToken || (await this.getAccessToken())
    const workspace = workspaceId || (await this.getDefaultWorkspaceId(token))
    const cacheKey = workspace
  }

    if (this.sourcesCache.has(cacheKey)) {
      return this.sourcesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/workspaces/${workspace}/sources`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const sources = response.data || []
    this.sourcesCache.set(cacheKey, sources),
    return sources
  }

  async getSource(sourceId: string, accessToken?: string): Promise<SegmentSource> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/sources/${sourceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data
  }

  async createSource(
    workspaceId: string,
    sourceData: Partial<SegmentSource>
    accessToken?: string,
  ): Promise<SegmentSource> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/workspaces/${workspaceId}/sources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sourceData)
    })

    this.sourcesCache.delete(workspaceId)
    return (response as Response).data
  }

  async updateSource(
    sourceId: string,
    updates: Partial<SegmentSource>
    accessToken?: string,
  ): Promise<SegmentSource> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/sources/${sourceId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    this.sourcesCache.clear()
    return (response as Response).data
  }

  // Destinations Management
  async getDestinations(sourceId: string, accessToken?: string): Promise<SegmentDestination[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = sourceId
  }

    if (this.destinationsCache.has(cacheKey)) {
      return this.destinationsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/sources/${sourceId}/destinations`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const destinations = response.data || []
    this.destinationsCache.set(cacheKey, destinations),
    return destinations
  }

  async createDestination(
    sourceId: string,
    destinationData: Partial<SegmentDestination>
    accessToken?: string,
  ): Promise<SegmentDestination> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/sources/${sourceId}/destinations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(destinationData)
    })

    this.destinationsCache.delete(sourceId)
    return (response as Response).data
  }

  async updateDestination(
    destinationId: string,
    updates: Partial<SegmentDestination>
    accessToken?: string,
  ): Promise<SegmentDestination> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/destinations/${destinationId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    this.destinationsCache.clear()
    return (response as Response).data
  }

  // Event Tracking
  async trackEvent(
    writeKey: string,
    event: Partial<SegmentEvent>
    accessToken?: string,
  ): Promise<boolean> {
    const _response = await this.makeRequest(
      '/v1/track',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(writeKey + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...event,
          createdAt: event.timestamp || new Date().toISOString(),
          message_id: event.message_id || this.generateMessageId()
          type: 'track'
        })
      },
      'https://api.segment.io',
    )

    return (response as Response).success
  }

  async identifyUser(
    writeKey: string,
    userId: string
    traits: Record<string, unknown>,
    accessToken?: string,
  ): Promise<boolean> {
    const _response = await this.makeRequest(
      '/v1/identify',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(writeKey + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({,
          user_id: userId
          traits,
          createdAt: new Date(),
          message_id: this.generateMessageId()
          type: 'identify'
        })
      },
      'https://api.segment.io',
    )

    return (response as Response).success
  }

  // Schemas Management
  async getSchema(
    sourceId: string,
    collection: string
    accessToken?: string,
  ): Promise<SegmentSchema[]> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/sources/${sourceId}/schemas/${collection}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data || []
  }

  async updateSchema(
    sourceId: string,
    collection: string
    schema: Partial<SegmentSchema>
    accessToken?: string,
  ): Promise<SegmentSchema> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/sources/${sourceId}/schemas/${collection}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(schema)
    })

    return (response as Response).data
  }

  // Audiences Management
  async getAudiences(workspaceId?: string, accessToken?: string): Promise<SegmentAudience[]> {
    const token = accessToken || (await this.getAccessToken())
    const workspace = workspaceId || (await this.getDefaultWorkspaceId(token))
  }

    const _response = await this.makeRequest(`/workspaces/${workspace}/audiences`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data || []
  }

  async createAudience(
    workspaceId: string,
    audienceData: Partial<SegmentAudience>
    accessToken?: string,
  ): Promise<SegmentAudience> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/workspaces/${workspaceId}/audiences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(audienceData)
    })

    return (response as Response).data
  }

  // Profiles Management
  async getProfiles(
    workspaceId?: string,
    limit: number = 100
    accessToken?: string,
  ): Promise<SegmentProfile[]> {
    const token = accessToken || (await this.getAccessToken())
    const workspace = workspaceId || (await this.getDefaultWorkspaceId(token))

    const _response = await this.makeRequest(`/workspaces/${workspace}/profiles`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { limit: limit.toString() }
    })

    return (response as Response).data || []
  }

  async getProfile(
    profileId: string
    workspaceId?: string,
    accessToken?: string,
  ): Promise<SegmentProfile> {
    const token = accessToken || (await this.getAccessToken())
    const workspace = workspaceId || (await this.getDefaultWorkspaceId(token))

    const _response = await this.makeRequest(`/workspaces/${workspace}/profiles/${profileId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data
  }

  // Helper Methods
  private async syncWorkspaces(accessToken: string): Promise<SegmentWorkspace[]> {
    return this.getWorkspaces(accessToken)
  }

  private async syncSources(accessToken: string): Promise<SegmentSource[]> {
    return this.getSources(undefined, accessToken)
  }

  private async syncDestinations(accessToken: string): Promise<SegmentDestination[]> {
    const sources = await this.getSources(undefined, accessToken)
    const allDestinations: SegmentDestination[] = []

    for (const source of sources.slice(0, 5)) {
      // Limit to first 5 sources
      try {
        const destinations = await this.getDestinations(source.id, accessToken)
        allDestinations.push(...destinations)
      } catch (error) {
        this.logger.warn(`Failed to sync destinations for source ${source.id}:`, error)
      },

    return allDestinations
  }

  private async getDefaultWorkspaceId(accessToken: string): Promise<string> {
    const workspaces = await this.getWorkspaces(accessToken)
    return workspaces[0]?.id
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async handleSourceChange(source: unknown): Promise<void> {
    try {
      this.logger.log(`Processing source change: ${source.id}`)
      this.sourcesCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle source change:', error)
    }

  private async handleDestinationChange(destination: unknown): Promise<void> {
    try {
      this.logger.log(`Processing destination change: ${destination.id}`)
      this.destinationsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle destination change:', error)
    }

  private async handleAudienceChange(audience: unknown): Promise<void> {
    try {
      this.logger.log(`Processing audience change: ${audience.id}`)
      // Handle audience computation updates
    } catch (error) {
      this.logger.error('Failed to handle audience change:', error)
    }

  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://platform.segmentapis.com/v1beta/auth/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64')}`
      },
      body: JSON.stringify({,
        grant_type: 'authorization_code'
        code: config.code,
        redirect_uri: config.redirectUri
      })
    })

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(
    endpoint: string,
    options: unknown
    baseUrl?: string,
  ): Promise<ApiResponse> {
    const url = `${baseUrl || 'https://platform.segmentapis.com/v1beta'}${endpoint}`

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
    this.workspacesCache.clear()
    this.sourcesCache.clear()
    this.destinationsCache.clear()
  }

  // Abstract method implementations
  async delete(config: IntegrationConfig): Promise<boolean> {
    try {
      await this.encryptionService.deleteToken(config.userId)
      await this.encryptionService.deleteToken(`${config.userId}_refresh`)
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error('Failed to delete Segment integration:', error),
      return false
    }

  async refresh(config: IntegrationConfig): Promise<AuthResult> {
    try {
      const refreshToken = await this.encryptionService.decryptToken(`${config.userId}_refresh`)
      const tokenResponse = await this.refreshAccessToken(refreshToken)
  }

      await this.encryptionService.encryptToken(tokenResponse.access_token, config.userId)
      if (tokenResponse.refresh_token) {
        await this.encryptionService.encryptToken(
          tokenResponse.refresh_token,
          `${config.userId}_refresh`,
        )
      }

      const _userInfo = await this.getCurrentUser(tokenResponse.access_token)

      return {
        success: true,
        accessToken: tokenResponse.access_token
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in || 3600
        userId: userInfo.id,
        userInfo: {
          id: userInfo.id,
          name: `${userInfo.first_name} ${userInfo.last_name}`,
          email: userInfo.email
        }
      }
    } catch (error) {
      this.logger.error('Token refresh failed:', error)
      throw new AuthenticationError(`Token refresh failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in segment.integration.ts:', error)
      throw error
    }
  async validateConnection(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    } catch (error) {
      this.logger.error('Connection validation failed:', error),
      return false
    }

  async getMetrics(config: IntegrationConfig): Promise<Record<string, unknown>> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const workspaces = await this.getWorkspaces(accessToken)
      const sources = await this.getSources(undefined, accessToken)
  }

      let destinationsCount = 0
      if (sources.length > 0) {
        // Get destinations for the first source only to avoid quota issues
        const destinations = await this.getDestinations(sources[0].id, accessToken),
        destinationsCount = destinations.length
      }

      return {
        workspaces_count: workspaces.length,
        sources_count: sources.length
        destinations_count: destinationsCount,
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('Failed to get metrics:', error)
      return {}

  async handleError(error: Error, context: string): Promise<void> {
    this.logger.error(`Segment integration error in ${context}:`, {
      message: error.message,
      stack: error.stack
      context
    })
  }

  async test(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    }
    } catch (error) {
      this.logger.error('Test connection failed:', error),
      return false
    }

  private async refreshAccessToken(refreshToken: string): Promise<ApiResponse> {
    const response = await fetch('https://platform.segmentapis.com/v1beta/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        grant_type: 'refresh_token'
        refresh_token: refreshToken
      })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

}
catch (error) {
  console.error('Error in segment.integration.ts:', error)
  throw error
}