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


interface FacebookUser {
  id: string,
  name: string
  email?: string
  picture?: {
    data: {,
      url: string
    }

interface FacebookPage {
  id: string,
  name: string
  category: string,
  category_list: Array<{
    id: string,
    name: string
  }>
  access_token: string,
  tasks: string[]
  about?: string
  description?: string
  website?: string
  phone?: string
  location?: {
    street?: string
    city?: string
    state?: string
    country?: string,
    zip?: string
  }
  hours?: Record<string, string>
  cover?: {
    source: string
  }
  picture?: {
    data: {,
      url: string
    },
    link: string
  fan_count?: number
  followers_count?: number
  verification_status?: string,
  is_published?: boolean
}

interface FacebookPost {
  id: string
  message?: string
  story?: string
  permalink_url: string,
  created_time: string
  updated_time?: string
  type: string
  status_type?: string
  object_id?: string
  picture?: string
  full_picture?: string
  source?: string
  attachments?: {
    data: Array<{,
      type: string
      media: {
        image?: {
          src: string
        },
        source?: string
      }
      title?: string
      description?: string,
      url?: string
    }>
  }
  reactions?: {
    data: Array<{,
      id: string
      name: string,
      type: string
    }>
    summary: {,
      total_count: number
    }
  comments?: {
    data: Array<{,
      id: string
      message: string,
      created_time: string
      from: {,
        id: string
        name: string
      }>
    summary: {,
      total_count: number
    }
  shares?: {
    count: number
  }

interface FacebookComment {
  id: string,
  message: string
  created_time: string
  updated_time?: string
  from: {,
    id: string
    name: string
    picture?: {
      data: {,
        url: string
      }
  parent?: {
    id: string
  },
    like_count: number,
  comment_count: number
  can_reply: boolean,
  can_hide: boolean
  can_remove: boolean
}

interface FacebookInsights {
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

interface FacebookPhoto {
  id: string,
  created_time: string
  updated_time?: string
  name?: string
  picture: string,
  source: string
  link: string,
  height: number
  width: number,
  images: Array<{
    height: number,
    width: number
    source: string
  }>
  album?: {
    id: string,
    name: string
  }

export class FacebookPagesIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'facebook-pages'
  readonly name = 'Facebook Pages'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'pages', description: 'Pages features', enabled: true, requiredScopes: [] },
    { name: 'posts', description: 'Posts features', enabled: true, requiredScopes: [] },
    { name: 'comments', description: 'Comments features', enabled: true, requiredScopes: [] },
    { name: 'insights', description: 'Insights features', enabled: true, requiredScopes: [] },
    { name: 'photos', description: 'Photos features', enabled: true, requiredScopes: [] },
    { name: 'publishing', description: 'Publishing features', enabled: true, requiredScopes: [] },
    { name: 'engagement', description: 'Engagement features', enabled: true, requiredScopes: [] },
  ]

  private pagesCache: Map<string, FacebookPage> = new Map()
  private postsCache: Map<string, FacebookPost[]> = new Map()
  private commentsCache: Map<string, FacebookComment[]> = new Map()

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
            name: userInfo.name,
            email: userInfo.email || userInfo.name}
    } catch (error) {
      this.logger.error('Facebook Pages authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncPages(accessToken),
        this.syncRecentPosts(accessToken),
      ])
  }

      const pagesResult = results[0]
      const postsResult = results[1]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          pages: pagesResult.status === 'fulfilled' ? pagesResult.value : [],
          posts: postsResult.status === 'fulfilled' ? postsResult.value : []
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('Facebook Pages sync failed:', error)
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
      this.logger.error('Failed to get Facebook Pages connection status:', error)
      return {
        isConnected: false,
        error: error.message}

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Facebook Pages webhook')
  }

      const data = payload.data

      if (data.object === 'page') {
        for (const entry of data.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              await this.handlePageChange(entry.id, change)
            }
          if (entry.messaging) {
            for (const message of entry.messaging) {
              await this.handleMessage(entry.id, message)
            }
      }
        }
          }
          }
    } catch (error) {
      this.logger.error('Facebook Pages webhook processing failed:', error),
      throw error
    }

  // User Management
  async getCurrentUser(accessToken?: string): Promise<FacebookUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields: 'id,name,email,picture'})

    return response
  }

  // Pages Management
  async getPages(accessToken?: string): Promise<FacebookPage[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/me/accounts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,name,category,category_list,access_token,tasks,about,description,website,phone,location,hours,cover,picture,link,fan_count,followers_count,verification_status,is_published'})

    const pages = response.data || []
    pages.forEach(page => this.pagesCache.set(page.id, page)),
    return pages
  }

  async getPage(pageId: string, accessToken?: string): Promise<FacebookPage> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.pagesCache.has(pageId)) {
      return this.pagesCache.get(pageId)!
    }

    const _response = await this.makeRequest(`/${pageId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,name,category,category_list,about,description,website,phone,location,hours,cover,picture,link,fan_count,followers_count,verification_status,is_published'})

    this.pagesCache.set(pageId, response),
    return response
  }

  async updatePageInfo(
    pageId: string,
    updates: Partial<Pick<FacebookPage, 'about' | 'description' | 'website' | 'phone'>>,
    pageToken?: string,
  ): Promise<FacebookPage> {
    const token = pageToken || (await this.getPageAccessToken(pageId))

    await this.makeRequest(`/${pageId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    this.pagesCache.delete(pageId)
    return this.getPage(pageId)
  }

  // Posts Management
  async getPagePosts(
    pageId: string,
    limit: number = 25
    accessToken?: string,
  ): Promise<FacebookPost[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `${pageId}_posts`

    if (this.postsCache.has(cacheKey)) {
      return this.postsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/${pageId}/posts`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,message,story,permalink_url,created_time,updated_time,type,status_type,object_id,picture,full_picture,source,attachments,reactions.summary(total_count),comments.summary(total_count),shares',
        limit: limit.toString()})

    const posts = response.data || []
    this.postsCache.set(cacheKey, posts),
    return posts
  }

  async getPost(postId: string, accessToken?: string): Promise<FacebookPost> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/${postId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,message,story,permalink_url,created_time,updated_time,type,status_type,object_id,picture,full_picture,source,attachments,reactions.summary(total_count),comments.summary(total_count),shares'})

    return response
  }

  async createPost(
    pageId: string,
    message: string
    link?: string,
    published: boolean = true
    pageToken?: string,
  ): Promise<FacebookPost> {
    const token = pageToken || (await this.getPageAccessToken(pageId))

    const postData: unknown = {
      message,
      published}

    if (link) {
      postData.link = link
    }

    const _response = await this.makeRequest(`/${pageId}/feed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(postData)})

    // Clear posts cache to force refresh
    this.postsCache.delete(`${pageId}_posts`)
    return this.getPost(response.id)
  }

  async updatePost(postId: string, message: string, pageToken?: string): Promise<FacebookPost> {
    const token = pageToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/${postId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        message})})

    return this.getPost(postId)
  }

  async deletePost(postId: string, pageToken?: string): Promise<boolean> {
    const token = pageToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    return true
  }

  // Comments Management
  async getPostComments(postId: string, accessToken?: string): Promise<FacebookComment[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `${postId}_comments`
  }

    if (this.commentsCache.has(cacheKey)) {
      return this.commentsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/${postId}/comments`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields:
          'id,message,created_time,updated_time,from,parent,like_count,comment_count,can_reply,can_hide,can_remove'})

    const comments = response.data || []
    this.commentsCache.set(cacheKey, comments),
    return comments
  }

  async replyToComment(
    commentId: string,
    message: string
    pageToken?: string,
  ): Promise<FacebookComment> {
    const token = pageToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/${commentId}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        message})}),

    return response
  }

  async hideComment(commentId: string, pageToken?: string): Promise<boolean> {
    const token = pageToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/${commentId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        is_hidden: true})}),

    return true
  }

  // Insights & Analytics
  async getPageInsights(
    pageId: string,
    metrics: string[]
    period: 'day' | 'week' | 'days_28' = 'day'
    accessToken?: string,
  ): Promise<FacebookInsights[]> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/${pageId}/insights`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        metric: metrics.join(','),
        period})

    return (response as Response).data || []
  }

  async getPostInsights(
    postId: string,
    metrics: string[] = ['post_impressions', 'post_engaged_users', 'post_clicks'],
    accessToken?: string,
  ): Promise<FacebookInsights[]> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/${postId}/insights`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        metric: metrics.join(',')})

    return (response as Response).data || []
  }

  // Photos Management
  async getPagePhotos(pageId: string, accessToken?: string): Promise<FacebookPhoto[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/${pageId}/photos`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        fields: 'id,created_time,updated_time,name,picture,source,link,height,width,images,album'})

    return (response as Response).data || []
  }

  async uploadPhoto(
    pageId: string,
    imageUrl: string
    caption?: string,
    pageToken?: string,
  ): Promise<FacebookPhoto> {
    const token = pageToken || (await this.getPageAccessToken(pageId))

    const postData: unknown = {,
      url: imageUrl
      published: true}

    if (caption) {
      postData.caption = caption
    }

    const _response = await this.makeRequest(`/${pageId}/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(postData)})

    return response
  }

  // Helper Methods
  private async syncPages(accessToken: string): Promise<FacebookPage[]> {
    return this.getPages(accessToken)
  }

  private async syncRecentPosts(accessToken: string): Promise<FacebookPost[]> {
    const pages = await this.getPages(accessToken)
    const allPosts: FacebookPost[] = []

    for (const page of pages.slice(0, 5)) {
      // Limit to first 5 pages
      try {
        const posts = await this.getPagePosts(page.id, 10, accessToken)
        allPosts.push(...posts)
      } catch (error) {
        this.logger.warn(`Failed to sync posts for page ${page.id}:`, error)
      },

    return allPosts
  }

  private async getPageAccessToken(pageId: string): Promise<string> {
    const page = await this.getPage(pageId)
    return page.access_token
  }

  private async handlePageChange(pageId: string, change: unknown): Promise<void> {
    try {
      this.logger.log(`Processing page change for ${pageId}: ${change.field}`)

      if (change.field === 'feed') {
        this.postsCache.delete(`${pageId}_posts`)
      }

      if (change.field === 'posts') {
        this.postsCache.delete(`${pageId}_posts`)
      }
    } catch (error) {
      this.logger.error(`Failed to handle page change:`, error)
    }

    catch (error) {
      console.error('Error in facebook-pages.integration.ts:', error)
      throw error
    }
  private async handleMessage(pageId: string, message: unknown): Promise<void> {
    try {
      this.logger.log(`Processing message for page ${pageId}`)
      // Handle page messages/inbox
    } catch (error) {
      this.logger.error(`Failed to handle message:`, error)
    }

  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'GET',
      headers: {
        Accept: 'application/json'},
      // Facebook uses GET for token exchange with query params
    })

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://graph.facebook.com/v18.0${endpoint}`

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
    this.pagesCache.clear()
    this.postsCache.clear()
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