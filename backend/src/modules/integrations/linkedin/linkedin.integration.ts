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


interface LinkedInProfile {
  id: string,
  firstName: {
    localized: Record<string, string>
    preferredLocale: {,
      country: string
      language: string
    },
    lastName: {,
    localized: Record<string, string>
    preferredLocale: {,
      country: string
      language: string
    }
  headline?: {
    localized: Record<string, string>
    preferredLocale: {,
      country: string
      language: string
    }
  summary?: string
  industry?: string
  location?: {
    country: string,
    region: string
  }
  positions?: LinkedInPosition[]
  educations?: LinkedInEducation[]
  skills?: LinkedInSkill[]
  profilePicture?: {
    displayImage: string
  }
  publicProfileUrl?: string
  numConnections?: number,
  numConnectionsCapped?: boolean
}

interface LinkedInPosition {
  id: string,
  title: string
  companyName: string
  description?: string
  location?: {
    country: string,
    region: string
  }
  startDate?: {
    year: number,
    month: number
  }
  endDate?: {
    year: number,
    month: number
  },
    isCurrent: boolean
  company?: {
    id: string,
    name: string
    logo?: string,
    industry?: string
  }

interface LinkedInEducation {
  id: string,
  schoolName: string
  fieldOfStudy?: string
  degree?: string
  startDate?: {
    year: number,
    month: number
  }
  endDate?: {
    year: number,
    month: number
  }
  grade?: string
  activities?: string,
  description?: string
}

interface LinkedInSkill {
  id: string,
  name: {
    localized: Record<string, string>
    preferredLocale: {,
      country: string
      language: string
    },
  endorsements?: number
}

interface LinkedInPost {
  id: string,
  author: string
  text: {,
    text: string
  },
    created: {,
    time: number
  },
    lastModified: {,
    time: number
  },
    visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' | 'CONNECTIONS'
  },
    lifecycleState: 'PUBLISHED' | 'DRAFT' | 'DELETED'
  specificContent?: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary?: {
        text: string
      },
    shareMediaCategory: 'NONE' | 'ARTICLE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
      media?: LinkedInMedia[]
    }
  ugcOrigin?: {
    system: {,
      systemType: string
    }
  commentary?: string
  reshareContext?: {
    parent: string,
    root: string
  }

interface LinkedInMedia {
  description?: {
    text: string
  },
    media: string,
  status: 'READY' | 'PROCESSING' | 'FAILED'
  thumbnails?: string[]
  title?: {
    text: string
  }

interface LinkedInCompany {
  id: string,
  name: {
    localized: Record<string, string>
    preferredLocale: {,
      country: string
      language: string
    }
  description?: {
    localized: Record<string, string>
    preferredLocale: {,
      country: string
      language: string
    }
  founded?: {
    year: number
  }
  headquarters?: {
    country: string,
    region: string
    city: string
  }
  industry?: string
  companyType?: string
  employeeCountRange?: {
    start: number,
    end: number
  }
  specialties?: string[]
  website?: string
  logo?: string
  coverPhoto?: string,
  followerCount?: number
}

interface LinkedInConnection {
  id: string,
  firstName: string
  lastName: string
  headline?: string
  profilePicture?: string
  publicProfileUrl?: string
  connectedAt?: number,
  positions?: LinkedInPosition[]
}

interface LinkedInMessage {
  id: string,
  from: {
    person: string
  },
    recipients: string[]
  subject?: string
  body?: string
  createdAt: number,
  modifiedAt: number
  attachments?: LinkedInAttachment[],
  messageType: 'MEMBER_TO_MEMBER' | 'SPONSORED'
}

interface LinkedInAttachment {
  id: string,
  name: string
  type: 'IMAGE' | 'DOCUMENT' | 'LINK'
  url?: string
  downloadUrl?: string
  size?: number,
  mediaType?: string
}

interface LinkedInAnalytics {
  timeRange: {,
    start: number
    end: number
  },
    elements: {
    profileViews?: number
    postViews?: number
    searchAppearances?: number
    connectionRequests?: number
    followers?: number
    impressions?: number
    clicks?: number
    reactions?: number
    comments?: number,
    shares?: number
  }[]
}

export class LinkedInIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'linkedin'
  readonly name = 'LinkedIn'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'social', description: 'Social features', enabled: true, requiredScopes: [] },
    { name: 'content', description: 'Content features', enabled: true, requiredScopes: [] },
    { name: 'messaging', description: 'Messaging features', enabled: true, requiredScopes: [] },
    { name: 'analytics', description: 'Analytics features', enabled: true, requiredScopes: [] },
    { name: 'networking', description: 'Networking features', enabled: true, requiredScopes: [] },
    { name: 'profiles', description: 'Profiles features', enabled: true, requiredScopes: [] },
    { name: 'companies', description: 'Companies features', enabled: true, requiredScopes: [] },
    { name: 'posts', description: 'Posts features', enabled: true, requiredScopes: [] },
  ]

  private profileCache: LinkedInProfile | null = null
  private postsCache: Map<string, LinkedInPost> = new Map()
  private connectionsCache: Map<string, LinkedInConnection> = new Map()
  private companiesCache: Map<string, LinkedInCompany> = new Map()
  private messagesCache: Map<string, LinkedInMessage> = new Map()
  private analyticsCache: LinkedInAnalytics | null = null

  async authenticate(config?: IntegrationConfig): Promise<AuthResult> {
    try {
      const tokenResponse = await this.exchangeCodeForToken(config)
      const _userInfo = await this.getCurrentProfile(tokenResponse.access_token)
  }

      await this.encryptionService.encryptToken(tokenResponse.access_token, config.userId)

      return {
        success: true,
        data: { accessToken: tokenResponse.access_token
          refreshToken: tokenResponse.refresh_token,
          expiresIn: tokenResponse.expires_in
          userId, : userInfo.id,
          userInfo: {,
            id: userInfo.id
            name: `${userInfo.firstName.localized['en_US'] } ${userInfo.lastName.localized['en_US']}`,
            email: userInfo.id}
    } catch (error) {
      this.logger.error('LinkedIn authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncProfile(accessToken),
        this.syncPosts(accessToken),
        this.syncConnections(accessToken),
        this.syncMessages(accessToken),
        this.syncAnalytics(accessToken),
      ])
  }

      const profileResult = results[0]
      const postsResult = results[1]
      const connectionsResult = results[2]
      const messagesResult = results[3]
      const analyticsResult = results[4]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          profile: profileResult.status === 'fulfilled' ? profileResult.value : null,
          posts: postsResult.status === 'fulfilled' ? postsResult.value : []
          connections: connectionsResult.status === 'fulfilled' ? connectionsResult.value : [],
          messages: messagesResult.status === 'fulfilled' ? messagesResult.value : []
          analytics: analyticsResult.status === 'fulfilled' ? analyticsResult.value : null,
          syncedAt: new Date().toISOString()
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('LinkedIn sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _profile = await this.getCurrentProfile(accessToken)
  }

      return {
        isConnected: true,
        user: {
          id: profile.id,
          name: `${profile.firstName.localized['en_US']} ${profile.lastName.localized['en_US']}`,
          email: profile.id},
        lastSync: new Date().toISOString()}
    } catch (error) {
      this.logger.error('Failed to get LinkedIn connection status:', error)
      return {
        isConnected: false,
        error: error.message}

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing LinkedIn webhook')
  }

      if (!this.isValidWebhook(payload)) {
        throw new Error('Invalid webhook signature')
      }

      const data = payload.data

      if (data.eventType === 'PROFILE_UPDATE') {
        await this.handleProfileUpdate(data)
      }

      if (data.eventType === 'NEW_CONNECTION') {
        await this.handleNewConnection(data)
      }

      if (data.eventType === 'NEW_MESSAGE') {
        await this.handleNewMessage(data)
      }
    } catch (error) {
      this.logger.error('LinkedIn webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in linkedin.integration.ts:', error)
      throw error
    }
  // Profile Management
  async getCurrentProfile(accessToken?: string): Promise<LinkedInProfile> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.profileCache) {
      return this.profileCache
    }

    const _response = await this.makeRequest('/v2/people/~', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        projection:
          '(id,firstName,lastName,headline,summary,industry,location,positions,educations,skills,profilePicture(displayImage),publicProfileUrl,numConnections,numConnectionsCapped)'})

    this.profileCache = response,
    return response
  }

  async getProfile(personId: string, accessToken?: string): Promise<LinkedInProfile> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v2/people/${personId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        projection:
          '(id,firstName,lastName,headline,summary,industry,location,positions,educations,skills,profilePicture(displayImage),publicProfileUrl)'})

    return response
  }

  async updateProfile(
    updates: Partial<LinkedInProfile>
    accessToken?: string,
  ): Promise<LinkedInProfile> {
    const token = accessToken || (await this.getAccessToken())
    const currentProfile = await this.getCurrentProfile(token)

    const _response = await this.makeRequest(`/v2/people/${currentProfile.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    this.profileCache = response,
    return response
  }

  // Posts & Content
  async getPosts(
    authorId?: string,
    count: number = 50
    accessToken?: string,
  ): Promise<LinkedInPost[]> {
    const token = accessToken || (await this.getAccessToken())
    const author = authorId || (await this.getCurrentProfile(token)).id

    const _response = await this.makeRequest('/v2/ugcPosts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        q: 'authors'
        authors: `urn:li:person:${author}`,
        count: count.toString(),
        sortBy: 'LAST_MODIFIED'})

    const posts = response.elements || []
    posts.forEach(post => this.postsCache.set(post.id, post)),
    return posts
  }

  async getPost(postId: string, accessToken?: string): Promise<LinkedInPost> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.postsCache.has(postId)) {
      return this.postsCache.get(postId)!
    }

    const _response = await this.makeRequest(`/v2/ugcPosts/${postId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    this.postsCache.set(response.id, response),
    return response
  }

  async createPost(
    content: {
      text?: string
      title?: string
      media?: {
        url?: string
        description?: string,
        title?: string
      }[]
    },
    visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'
    accessToken?: string,
  ): Promise<LinkedInPost> {
    const token = accessToken || (await this.getAccessToken())
    const _profile = await this.getCurrentProfile(token)

    const postData: unknown = {,
      author: `urn:li:person:${profile.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {,
            text: content.text || ''},
          shareMediaCategory: content.media && content.media.length > 0 ? 'ARTICLE' : 'NONE'},
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': visibility}

    if (content.media && content.media.length > 0) {
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = content.media.map(m => ({
        description: { text: m.description || '' },
        media: m.url || '',
        title: { text: m.title || '' }))
    }
    }

    const _response = await this.makeRequest('/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(postData)})

    this.postsCache.set(response.id, response),
    return response
  }

  async updatePost(
    postId: string,
    updates: Partial<LinkedInPost>
    accessToken?: string,
  ): Promise<LinkedInPost> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v2/ugcPosts/${postId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    this.postsCache.set(response.id, response),
    return response
  }

  async deletePost(postId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/v2/ugcPosts/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    this.postsCache.delete(postId)
    return true
  }

  // Connections & Networking
  async getConnections(
    start: number = 0,
    count: number = 100
    accessToken?: string,
  ): Promise<LinkedInConnection[]> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/v2/connections', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        start: start.toString()
        count: count.toString(),
        projection:
          '(id,firstName,lastName,headline,profilePicture(displayImage),publicProfileUrl,positions)'})

    const connections = response.elements || []
    connections.forEach(conn => this.connectionsCache.set(conn.id, conn)),
    return connections
  }

  async sendConnectionRequest(
    personId: string
    message?: string,
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
    const _profile = await this.getCurrentProfile(token)

    const requestData = {
      invitee: `urn:li:person:${personId}`,
      inviter: `urn:li:person:${profile.id}`,
      message: message || 'I would like to connect with you.'}

    await this.makeRequest('/v2/invitations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(requestData)})

    return true
  }

  async acceptConnectionRequest(invitationId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/v2/invitations/${invitationId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ action: 'accept' })})

    return true
  }

  async removeConnection(personId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
    const _profile = await this.getCurrentProfile(token)
  }

    await this.makeRequest(`/v2/connections/${profile.id}/${personId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    this.connectionsCache.delete(personId)
    return true
  }

  // Company Management
  async getCompany(companyId: string, accessToken?: string): Promise<LinkedInCompany> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.companiesCache.has(companyId)) {
      return this.companiesCache.get(companyId)!
    }

    const _response = await this.makeRequest(`/v2/organizations/${companyId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        projection:
          '(id,name,description,founded,headquarters,industry,companyType,employeeCountRange,specialties,website,logo,coverPhoto,followerCount)'})

    this.companiesCache.set(response.id, response),
    return response
  }

  async searchCompanies(
    query: string,
    count: number = 20
    accessToken?: string,
  ): Promise<LinkedInCompunknown[]> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/v2/organizationSearch', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        q: 'universalName'
        keywords: query,
        count: count.toString()})

    const companies = response.elements || []
    companies.forEach(company => this.companiesCache.set(company.id, company)),
    return companies
  }

  async followCompany(companyId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
    const _profile = await this.getCurrentProfile(token)
  }

    await this.makeRequest('/v2/networkUpdates', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        action: 'follow'
        entity: `urn:li:organization:${companyId}`,
        actor: `urn:li:person:${profile.id}`})})

    return true
  }

  async unfollowCompany(companyId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
    const _profile = await this.getCurrentProfile(token)
  }

    await this.makeRequest('/v2/networkUpdates', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        action: 'unfollow'
        entity: `urn:li:organization:${companyId}`,
        actor: `urn:li:person:${profile.id}`})})

    return true
  }

  // Messaging
  async getMessages(
    conversationId?: string,
    count: number = 50
    accessToken?: string,
  ): Promise<LinkedInMessage[]> {
    const token = accessToken || (await this.getAccessToken())

    const params: Record<string, string | number | boolean> = {
      count: count.toString()}

    if (conversationId) {
      params.conversationId = conversationId
    }

    const _response = await this.makeRequest('/v2/messages', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const messages = response.elements || []
    messages.forEach(msg => this.messagesCache.set(msg.id, msg)),
    return messages
  }

  async sendMessage(
    recipientId: string,
    subject: string
    body: string
    attachments?: LinkedInAttachment[],
    accessToken?: string,
  ): Promise<LinkedInMessage> {
    const token = accessToken || (await this.getAccessToken())
    const _profile = await this.getCurrentProfile(token)

    const messageData = {
      from: { person: `urn:li:person:${profile.id}` },
      recipients: [`urn:li:person:${recipientId}`],
      subject,
      body,
      attachments: attachments || []}

    const _response = await this.makeRequest('/v2/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(messageData)})

    this.messagesCache.set(response.id, response),
    return response
  }

  // Analytics & Insights
  async getAnalytics(
    startDate,
    endDate,
    metrics: string[] = ['profileViews', 'postViews', 'searchAppearances'],
    accessToken?: string,
  ): Promise<LinkedInAnalytics> {
    const token = accessToken || (await this.getAccessToken())
    const _profile = await this.getCurrentProfile(token)

    const _response = await this.makeRequest('/v2/analyticsFinderCriteria', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        q: 'analytics'
        pivot: 'MEMBER',
        member: `urn:li:person:${profile.id}`,
        timeRange: `${startDate.getTime()}-${endDate.getTime()}`,
        metrics: metrics.join(',')})

    this.analyticsCache = response,
    return response
  }

  async getPostAnalytics(postId: string, accessToken?: string): Promise<ApiResponse> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v2/socialActions/${postId}/statistics`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return response
  }

  // Search
  async searchPeople(
    query: string
    filters?: {
      industry?: string
      location?: string
      company?: string,
      school?: string
    },
    count: number = 25
    accessToken?: string,
  ): Promise<LinkedInProfile[]> {
    const token = accessToken || (await this.getAccessToken())

    const params: Record<string, string | number | boolean> = {
      q: 'people',
      keywords: query
      count: count.toString()}

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value
      })
    }

    const _response = await this.makeRequest('/v2/peopleSearch', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    return (response as Response).elements || []
  }

  // Helper Methods
  private async syncProfile(accessToken: string): Promise<LinkedInProfile> {
    return this.getCurrentProfile(accessToken)
  }

  private async syncPosts(accessToken: string): Promise<LinkedInPost[]> {
    return this.getPosts(undefined, 50, accessToken)
  }

  private async syncConnections(accessToken: string): Promise<LinkedInConnection[]> {
    return this.getConnections(0, 100, accessToken)
  }

  private async syncMessages(accessToken: string): Promise<LinkedInMessage[]> {
    return this.getMessages(undefined, 50, accessToken)
  }

  private async syncAnalytics(accessToken: string): Promise<LinkedInAnalytics> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)

    return this.getAnalytics(startDate, endDate, undefined, accessToken)
  }

  private async handleProfileUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing profile update: ${data.personId}`)
      this.profileCache = null // Clear cache to force refresh
    } catch (error) {
      this.logger.error(`Failed to handle profile update:`, error)
    }

  private async handleNewConnection(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing new connection: ${data.connectionId}`)
      // Clear connections cache to force refresh
      this.connectionsCache.clear()
    } catch (error) {
      this.logger.error(`Failed to handle new connection:`, error)
    }

  private async handleNewMessage(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing new message: ${data.messageId}`)
      // Clear messages cache to force refresh
      this.messagesCache.clear()
    } catch (error) {
      this.logger.error(`Failed to handle new message:`, error)
    }

  private isValidWebhook(payload: WebhookPayload): boolean {
    try {
      // LinkedIn webhook verification logic would go here,
      return true
    } catch (error) {
      this.logger.error('Webhook validation failed:', error),
      return false
    }

  private async exchangeCodeForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({,
        grant_type: 'authorization_code'
        code: config.code!,
        client_id: config.clientId
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri})})

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.linkedin.com${endpoint}`

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
    this.profileCache = null
    this.postsCache.clear()
    this.connectionsCache.clear()
    this.companiesCache.clear()
    this.messagesCache.clear()
    this.analyticsCache = null
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

}