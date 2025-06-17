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


interface InstagramUser {
  id: string,
  account_type: string
  media_count: number,
  username: string
  name?: string
  biography?: string
  website?: string
  profile_picture_url: string,
  followers_count: number
  follows_count: number,
  ig_id: string
}

interface InstagramMedia {
  id: string,
  ig_id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM',
  media_url: string
  thumbnail_url?: string
  permalink: string,
  timestamp: string
  username: string
  like_count?: number
  comments_count?: number
  children?: {
    data: Array<{,
      id: string
      media_type: string,
      media_url: string
      thumbnail_url?: string
    }>
  }
  insights?: {
    data: Array<{,
      name: string
      period: string,
      values: Array<{
        value: number,
        end_time: string
      }>
      title: string,
      description: string
    }>
  }

interface InstagramComment {
  id: string,
  text: string
  timestamp: string,
  username: string
  user: {,
    id: string
    username: string
    profile_picture_url?: string
  },
    like_count: number
  replies?: {
    data: Array<{,
      id: string
      text: string,
      timestamp: string
      username: string
    }>
  },
    hidden: boolean
}

interface InstagramStory {
  id: string,
  ig_id: string
  media_type: 'IMAGE' | 'VIDEO',
  media_url: string
  thumbnail_url?: string
  timestamp: string,
  expires_at: string
  insights?: {
    data: Array<{,
      name: string
      values: Array<{,
        value: number
      }>
    }>
  }

interface InstagramHashtag {
  id: string,
  name: string
  media_count?: number
  top_posts?: {
    data: InstagramMedia[]
  }
  recent_posts?: {
    data: InstagramMedia[]
  }

interface InstagramInsights {
  name: string,
  period: string
  values: Array<{,
    value: number
    end_time: string
  }>
  title: string,
  description: string
  id: string
}

interface InstagramAudience {
  name: string,
  period: string
  values: Array<{,
    value: {
      [key: string]: number
    },
    end_time: string
  }>
  title: string,
  description: string
}

export class InstagramBusinessIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'instagram-business'
  readonly name = 'Instagram Business'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'media', description: 'Media features', enabled: true, requiredScopes: [] },
    { name: 'stories', description: 'Stories features', enabled: true, requiredScopes: [] },
    { name: 'comments', description: 'Comments features', enabled: true, requiredScopes: [] },
    { name: 'insights', description: 'Insights features', enabled: true, requiredScopes: [] },
    { name: 'hashtags', description: 'Hashtags features', enabled: true, requiredScopes: [] },
    { name: 'publishing', description: 'Publishing features', enabled: true, requiredScopes: [] },
    { name: 'audience', description: 'Audience features', enabled: true, requiredScopes: [] },
    { name: 'engagement', description: 'Engagement features', enabled: true, requiredScopes: [] },
  ]

  private userCache: InstagramUser | null = null
  private mediaCache: Map<string, InstagramMedia[]> = new Map()
  private commentsCache: Map<string, InstagramComment[]> = new Map()

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
          userId, : userInfo.id,
          userInfo: {,
            id: userInfo.id
            name: userInfo.name || userInfo.username,
            email: userInfo.username}
    } catch (error) {
      this.logger.error('Instagram Business authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncRecentMedia(accessToken),
        this.syncRecentStories(accessToken),
      ])
  }

      const mediaResult = results[0]
      const storiesResult = results[1]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          media: mediaResult.status === 'fulfilled' ? mediaResult.value : [],
          stories: storiesResult.status === 'fulfilled' ? storiesResult.value : []
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('Instagram Business sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _user = await this.getCurrentUser(accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      this.logger.error('Failed to get Instagram Business connection status:', error)
      return {
        isConnected: false,
        error: error.message}

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Instagram Business webhook')
  }

      const data = payload.data

      if (data.object === 'instagram') {
        for (const entry of data.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              await this.handleInstagramChange(entry.id, change)
            }
      }
        }
          }
    } catch (error) {
      this.logger.error('Instagram Business webhook processing failed:', error),
      throw error
    }

  // User Management
  async getCurrentUser(accessToken?: string): Promise<InstagramUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.userCache) {
      return this.userCache
    }

    const _response = await this.makeRequest('/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,account_type,media_count,username,name,biography,website,profile_picture_url,followers_count,follows_count,ig_id'})

    this.userCache = response,
    return response
  }

  // Media Management
  async getMedia(limit: number = 25, accessToken?: string): Promise<InstagramMedia[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `media_${limit}`
  }

    if (this.mediaCache.has(cacheKey)) {
      return this.mediaCache.get(cacheKey)!
    }

    const _user = await this.getCurrentUser(token)
    const _response = await this.makeRequest(`/${user.ig_id}/media`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,ig_id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}',
        limit: limit.toString()})

    const media = response.data || []
    this.mediaCache.set(cacheKey, media),
    return media
  }

  async getMediaItem(mediaId: string, accessToken?: string): Promise<InstagramMedia> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/${mediaId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,ig_id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}'})

    return response
  }

  async publishMedia(
    imageUrl: string
    caption?: string,
    accessToken?: string,
  ): Promise<InstagramMedia> {
    const token = accessToken || (await this.getAccessToken())
    const _user = await this.getCurrentUser(token)

    // Step 1: Create media container
    const containerResponse = await this.makeRequest(`/${user.ig_id}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        image_url: imageUrl
        caption,
        access_token})})

    const containerId = containerResponse.id

    // Step 2: Publish the media
    const publishResponse = await this.makeRequest(`/${user.ig_id}/media_publish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        creation_id: containerId
        access_token})})

    // Clear media cache
    this.mediaCache.clear()
    return this.getMediaItem(publishResponse.id, token)
  }

  async publishStory(imageUrl: string, accessToken?: string): Promise<InstagramStory> {
    const token = accessToken || (await this.getAccessToken())
    const _user = await this.getCurrentUser(token)
  }

    // Create story container
    const containerResponse = await this.makeRequest(`/${user.ig_id}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        image_url: imageUrl
        media_type: 'STORIES'
        access_token})})

    const containerId = containerResponse.id

    // Publish the story
    const publishResponse = await this.makeRequest(`/${user.ig_id}/media_publish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        creation_id: containerId
        access_token})})

    return this.getStory(publishResponse.id, token)
  }

  // Comments Management
  async getMediaComments(mediaId: string, accessToken?: string): Promise<InstagramComment[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = mediaId
  }

    if (this.commentsCache.has(cacheKey)) {
      return this.commentsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/${mediaId}/comments`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,text,timestamp,username,user,like_count,replies{id,text,timestamp,username},hidden'})

    const comments = response.data || []
    this.commentsCache.set(cacheKey, comments),
    return comments
  }

  async replyToComment(
    commentId: string,
    message: string
    accessToken?: string,
  ): Promise<InstagramComment> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/${commentId}/replies`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        message,
        access_token})}),

    return response
  }

  async hideComment(commentId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/${commentId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        hide: true
        access_token})}),

    return true
  }

  // Stories Management
  async getStories(accessToken?: string): Promise<InstagramStory[]> {
    const token = accessToken || (await this.getAccessToken())
    const _user = await this.getCurrentUser(token)
  }

    const _response = await this.makeRequest(`/${user.ig_id}/stories`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields: 'id,ig_id,media_type,media_url,thumbnail_url,timestamp,expires_at'})

    return (response as Response).data || []
  }

  async getStory(storyId: string, accessToken?: string): Promise<InstagramStory> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/${storyId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields: 'id,ig_id,media_type,media_url,thumbnail_url,timestamp,expires_at'})

    return response
  }

  // Hashtags
  async searchHashtag(hashtag: string, accessToken?: string): Promise<InstagramHashtag> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/ig_hashtag_search', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        q: hashtag.replace('#', ''),
        user_id: (await this.getCurrentUser(token)).ig_id})

    const hashtagId = response.data[0]?.id
    if (!hashtagId) {
      throw new Error('Hashtag not found')
    }

    return this.getHashtag(hashtagId, token)
  }

  async getHashtag(hashtagId: string, accessToken?: string): Promise<InstagramHashtag> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/${hashtagId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,name,media_count,top_media{id,media_type,media_url,permalink},recent_media{id,media_type,media_url,permalink}'})

    return response
  }

  // Insights & Analytics
  async getAccountInsights(
    metrics: string[],
    period: 'day' | 'week' | 'days_28' = 'day'
    since?: string,
    until?: string,
    accessToken?: string,
  ): Promise<InstagramInsights[]> {
    const token = accessToken || (await this.getAccessToken())
    const _user = await this.getCurrentUser(token)

    const params: Record<string, string | number | boolean> = {
      metric: metrics.join(','),
      period}

    if (since) params.since = since
    if (until) params.until = until

    const _response = await this.makeRequest(`/${user.ig_id}/insights`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    return (response as Response).data || []
  }

  async getMediaInsights(
    mediaId: string,
    metrics: string[] = ['impressions', 'reach', 'engagement'],
    accessToken?: string,
  ): Promise<InstagramInsights[]> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/${mediaId}/insights`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        metric: metrics.join(',')})

    return (response as Response).data || []
  }

  async getAudienceInsights(
    metrics: string[] = ['audience_gender_age', 'audience_locale', 'audience_country'],
    period: 'lifetime' | 'day' | 'week' | 'days_28' = 'lifetime'
    accessToken?: string,
  ): Promise<InstagramAudience[]> {
    const token = accessToken || (await this.getAccessToken())
    const _user = await this.getCurrentUser(token)

    const _response = await this.makeRequest(`/${user.ig_id}/insights`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        metric: metrics.join(','),
        period})

    return (response as Response).data || []
  }

  // Helper Methods
  private async syncRecentMedia(accessToken: string): Promise<InstagramMedia[]> {
    return this.getMedia(25, accessToken)
  }

  private async syncRecentStories(accessToken: string): Promise<InstagramStory[]> {
    return this.getStories(accessToken)
  }

  private async handleInstagramChange(userId: string, change: unknown): Promise<void> {
    try {
      this.logger.log(`Processing Instagram change for ${userId}: ${change.field}`)

      if (change.field === 'media') {
        this.mediaCache.clear()
      }

      if (change.field === 'comments') {
        this.commentsCache.clear()
      }
    } catch (error) {
      this.logger.error(`Failed to handle Instagram change:`, error)
    }

    catch (error) {
      console.error('Error in instagram-business.integration.ts:', error)
      throw error
    }
  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({,
        client_id: config.clientId!
        client_secret: config.clientSecret!,
        grant_type: 'authorization_code'
        redirect_uri: config.redirectUri!,
        code: config.code!})})

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    const shortLivedToken = await response.json()

    // Exchange for long-lived token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${config.clientSecret}&access_token=${shortLivedToken.access_token}`,
      {
        method: 'GET'},
    )

    if (!longLivedResponse.ok) {
      throw new Error(`Long-lived token exchange failed: ${longLivedResponse.statusText}`)
    }

    return longLivedResponse.json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://graph.instagram.com/v18.0${endpoint}`

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
    this.userCache = null
    this.mediaCache.clear()
    this.commentsCache.clear()
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