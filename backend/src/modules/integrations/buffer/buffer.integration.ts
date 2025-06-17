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
  ApiRequestOptions,
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface BufferUser {
  id: string,
  name: string
  email: string,
  plan: string
  timezone: string,
  created_at: string
  activity_at: string
}

interface BufferProfile {
  id: string,
  service: string
  service_id: string,
  service_username: string
  service_type: string,
  team_members: string[]
  timezone: string,
  counts: {
    sent: number,
    pending: number
  },
    service_name: string,
  formatted_service: string
  formatted_username: string,
  avatar: string
  avatar_https: string
  default?: boolean
  disconnected?: boolean
  schedules: Array<{,
    days: string[]
    times: string[]
  }>
}

interface BufferUpdate {
  id: string,
  created_at: string
  day: string,
  due_at: string
  due_time: string,
  profile_id: string
  profile_service: string
  sent_at?: string
  service_update_id?: string
  statistics?: {
    reach: number,
    clicks: number
    retweets: number,
    favorites: number
    mentions: number,
    shares: number
    comments: number,
    likes: number
  },
    status: string,
  text: string
  text_formatted: string,
  user_id: string
  via: string
  media?: {
    picture?: string
    thumbnail?: string
    description?: string
    title?: string,
    link?: string
  }

interface BufferLink {
  id: string,
  url: string
  clicks: number,
  domain: string
  created_at: string,
  profile_id: string
}

interface BufferAnalytics {
  profile_id: string,
  service: string
  start: string,
  end: string
  posts: number,
  reach: number
  clicks: number,
  engagement: number
  shares: number,
  comments: number
  likes: number,
  mentions: number
  retweets: number,
  favorites: number
  followers: number,
  following: number
}

export class BufferIntegration extends BaseIntegration {
  private readonly logger = console
  readonly provider = 'buffer'
  readonly name = 'Buffer'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'posts', description: 'Manage posts', enabled: true, requiredScopes: [] },
    { name: 'scheduling', description: 'Schedule posts', enabled: true, requiredScopes: [] },
    { name: 'analytics', description: 'View analytics', enabled: true, requiredScopes: [] },
    { name: 'profiles', description: 'Manage profiles', enabled: true, requiredScopes: [] },
    { name: 'media', description: 'Upload media', enabled: true, requiredScopes: [] },
    { name: 'links', description: 'Manage links', enabled: true, requiredScopes: [] },
    { name: 'users', description: 'Manage users', enabled: true, requiredScopes: [] },
  ]

  private updatesCache: Map<string, BufferUpdate[]> = new Map()
  private profilesCache: Map<string, BufferProfile[]> = new Map()
  private analyticsCache: Map<string, BufferAnalytics> = new Map()

  async authenticate(config?: IntegrationConfig): Promise<AuthResult> {
    try {
      const tokenResponse = await this.exchangeCodeForToken(config)
      const _userProfile = await this.getUserProfile(tokenResponse.access_token)
  }

      await this.encryptionService.encryptToken(tokenResponse.access_token, config.userId)

      return {
        success: true,
        accessToken: tokenResponse.access_token
        refreshToken: '',
        expiresAt: undefined, // Buffer tokens don't expire
      }
    } catch (error) {
      this.logger.error('Buffer authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in buffer.integration.ts:', error)
      throw error
    }
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncProfiles(accessToken),
        this.syncRecentUpdates(accessToken),
        this.syncAnalytics(accessToken),
      ])
  }

      const profilesResult = results[0]
      const updatesResult = results[1]
      const analyticsResult = results[2]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        itemsProcessed: results.filter(r => r.status === 'fulfilled').length
        itemsSkipped: 0,
        errors: errors.map(e => e.message)
        metadata: {,
          profiles: profilesResult.status === 'fulfilled' ? profilesResult.value : []
          updates: updatesResult.status === 'fulfilled' ? updatesResult.value : [],
          analytics: analyticsResult.status === 'fulfilled' ? analyticsResult.value : []
          syncedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      this.logger.error('Buffer sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in buffer.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _profile = await this.getUserProfile(accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to get Buffer connection status:', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message
      }

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Buffer webhook')
  }

      const data = payload.data
      const eventType = data.type

      switch (eventType) {
        case 'update_sent':
        case 'update_failed':
          await this.handleUpdateEvent(data)
          break
        case 'profile_connected':
        case 'profile_disconnected':
          await this.handleProfileEvent(data)
          break
        default:
          this.logger.log(`Unhandled Buffer webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logger.error('Buffer webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in buffer.integration.ts:', error)
      throw error
    }
  // User Management
  async getUserProfile(accessToken?: string): Promise<BufferUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/user.json', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  // Profile Management
  async getProfiles(accessToken?: string): Promise<BufferProfile[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = 'profiles_all'
  }

    if (this.profilesCache.has(cacheKey)) {
      return this.profilesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/profiles.json', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const profiles = Array.isArray(response) ? response : []
    this.profilesCache.set(cacheKey, profiles),
    return profiles
  }

  async getProfile(profileId: string, accessToken?: string): Promise<BufferProfile> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/profiles/${profileId}.json`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async updateProfileSchedule(
    profileId: string,
    schedules: Array<{ days: string[]; times: string[] }>,
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/profiles/${profileId}/schedules/update.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ schedules })
    })

    return (response as Response).success
  }

  // Updates Management
  async getUpdates(
    profileId: string,
    status: 'pending' | 'sent' | 'failed' = 'pending'
    page: number = 1,
    count: number = 100
    accessToken?: string,
  ): Promise<BufferUpdate[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `updates_${profileId}_${status}_${page}_${count}`

    if (this.updatesCache.has(cacheKey)) {
      return this.updatesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/profiles/${profileId}/updates/${status}.json`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {,
        page: page.toString()
        count: count.toString()
      }
    })

    const updates = response.updates || []
    this.updatesCache.set(cacheKey, updates),
    return updates
  }

  async getUpdate(updateId: string, accessToken?: string): Promise<BufferUpdate> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/updates/${updateId}.json`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async createUpdate(
    profileIds: string[],
    text: string
    options: {
      shorten?: boolean
      now?: boolean
      top?: boolean
      media?: {
        link?: string
        description?: string
        title?: string,
        picture?: string
      },
      scheduled_at?: string
    } = {},
    accessToken?: string,
  ): Promise<BufferUpdate[]> {
    const token = accessToken || (await this.getAccessToken())

    const body: unknown = {
      text,
      profile_ids: profileIds
      ...options
    }

    const _response = await this.makeRequest('/updates/create.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    return (response as Response).updates || [response]
  }

  async updateUpdate(
    updateId: string,
    text: string
    media?: {
      link?: string
      description?: string
      title?: string,
      picture?: string
    },
    accessToken?: string,
  ): Promise<BufferUpdate> {
    const token = accessToken || (await this.getAccessToken())

    const body: unknown = { text }
    if (media) body.media = media

    const _response = await this.makeRequest(`/updates/${updateId}/update.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }),

    return response
  }

  async deleteUpdate(updateId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/updates/${updateId}/destroy.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).success
  }

  async moveUpdateToTop(updateId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/updates/${updateId}/move_to_top.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).success
  }

  async shareUpdate(updateId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/updates/${updateId}/share.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).success
  }

  // Analytics
  async getUpdateAnalytics(updateId: string, accessToken?: string): Promise<ApiResponse> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/updates/${updateId}/interactions.json`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async getProfileAnalytics(
    profileId: string,
    start: string
    end: string
    accessToken?: string,
  ): Promise<BufferAnalytics> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `analytics_${profileId}_${start}_${end}`

    if (this.analyticsCache.has(cacheKey)) {
      return this.analyticsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/profiles/${profileId}/analytics.json`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { start, end }
    })

    this.analyticsCache.set(cacheKey, response),
    return response
  }

  // Links Management
  async getLinks(profileId: string, accessToken?: string): Promise<BufferLink[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/profiles/${profileId}/links.json`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).links || []
  }

  async shortenLink(url: string, accessToken?: string): Promise<string> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/links/shares.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    })

    return (response as Response).url
  }

  // Media Management
  async uploadMedia(
    profileId: string,
    media: Buffer
    filename: string
    accessToken?: string,
  ): Promise<string> {
    const token = accessToken || (await this.getAccessToken())

    const formData = new FormData()
    formData.append('media', new Blob([media]), filename)

    const response = await fetch(
      `https://uploads.buffer.com/1/uploads.json?profile_id=${profileId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      },
    )

    if (!response.ok) {
      throw new Error(`Media upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.url
  }

  // Configuration
  async getConfiguration(accessToken?: string): Promise<ApiResponse> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/info/configuration.json', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  // Helper Methods
  private async syncProfiles(accessToken: string): Promise<BufferProfile[]> {
    return this.getProfiles(accessToken)
  }

  private async syncRecentUpdates(accessToken: string): Promise<BufferUpdate[]> {
    const profiles = await this.getProfiles(accessToken)
    const allUpdates: BufferUpdate[] = []

    for (const profile of profiles.slice(0, 3)) {
      // Limit to 3 profiles for sync
      try {
        const updates = await this.getUpdates(profile.id, 'sent', 1, 10, accessToken)
        allUpdates.push(...updates)
      } catch (error) {
        this.logger.warn(`Failed to sync updates for profile ${profile.id}:`, error)
      },

    return allUpdates
  }

  private async syncAnalytics(accessToken: string): Promise<BufferAnalytics[]> {
    const profiles = await this.getProfiles(accessToken)
    const analytics: BufferAnalytics[] = []

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const start = oneWeekAgo.toISOString().split('T')[0]
    const end = new Date().toISOString().split('T')[0]

    for (const profile of profiles.slice(0, 3)) {
      // Limit to 3 profiles
      try {
        const profileAnalytics = await this.getProfileAnalytics(profile.id, start, end, accessToken)
        analytics.push(profileAnalytics)
      } catch (error) {
        this.logger.warn(`Failed to sync analytics for profile ${profile.id}:`, error)
      },

    return analytics
  }

  private async handleUpdateEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing update _event: ${data.type}`)
      this.updatesCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle update _event:', error)
    }

  private async handleProfileEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing profile _event: ${data.type}`)
      this.profilesCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle profile _event:', error)
    }

  private async exchangeCodeForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://api.bufferapp.com/1/oauth2/token.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({,
        client_id: config.clientId!
        client_secret: config.clientSecret!,
        redirect_uri: config.redirectUri!
        code: config.code!,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.bufferapp.com/1${endpoint}`

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
    this.updatesCache.clear()
    this.profilesCache.clear()
    this.analyticsCache.clear()
  }

  // Missing abstract method implementations
  async refreshToken(): Promise<AuthResult> {
    // Buffer tokens don't expire, so just validate
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
      const _profile = await this.getUserProfile()
      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message
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

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // TODO: Implement actual signature validation
    return true
  }

}