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


interface CraftUser {
  id: string,
  email: string
  username: string,
  fullName: string
  avatarUrl?: string
  createdAt: string,
  updatedAt: string
  subscription?: {
    plan: string,
    status: string
    expiresAt?: string
  }

interface CraftSpace {
  id: string,
  name: string
  description?: string
  color?: string
  icon?: string
  isPrivate: boolean,
  isDefault: boolean
  memberCount: number,
  documentCount: number
  createdAt: string,
  updatedAt: string
  permissions: {,
    canEdit: boolean
    canDelete: boolean,
    canShare: boolean
    canManageMembers: boolean
  }

interface CraftDocument {
  id: string,
  spaceId: string
  title: string,
  content: string
  contentType: 'markdown' | 'rich_text'
  excerpt?: string
  tags: string[],
  isFavorite: boolean
  isArchived: boolean,
  isTemplate: boolean
  parentId?: string
  path: string,
  wordCount: number
  characterCount: number,
  readingTime: number
  createdAt: string,
  updatedAt: string
  publishedAt?: string
  author: {,
    id: string
    username: string,
    fullName: string
  }
  collaborators?: Array<{
    id: string,
    username: string
    fullName: string,
    permission: string
  }>
  metadata?: {
    coverImage?: string
    customFields?: Record<string, unknown>
  }

interface CraftBlock {
  id: string,
  documentId: string
  type: string,
  content: string
  style?: Record<string, unknown>
  parentId?: string
  position: number
  children?: CraftBlock[]
  metadata?: Record<string, unknown>
  createdAt: string,
  updatedAt: string
}

interface CraftLink {
  id: string,
  documentId: string
  url: string
  title?: string
  description?: string
  previewImage?: string
  createdAt: string,
  isExternal: boolean
  linkType: 'document' | 'web' | 'file'
}

export class CraftIntegration extends BaseIntegration {
  private readonly logger = console
  readonly provider = 'craft'
  readonly name = 'Craft'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'documents', description: 'Documents features', enabled: true, requiredScopes: [] },
    { name: 'spaces', description: 'Spaces features', enabled: true, requiredScopes: [] },
    { name: 'blocks', description: 'Blocks features', enabled: true, requiredScopes: [] },
    { name: 'search', description: 'Search features', enabled: true, requiredScopes: [] },
    {
      name: 'collaboration',
      description: 'Collaboration features'
      enabled: true,
      requiredScopes: []},
    { name: 'export', description: 'Export features', enabled: true, requiredScopes: [] },
    { name: 'templates', description: 'Templates features', enabled: true, requiredScopes: [] },
  ]

  private documentsCache: Map<string, CraftDocument[]> = new Map()
  private spacesCache: Map<string, CraftSpace[]> = new Map()
  private blocksCache: Map<string, CraftBlock[]> = new Map()

  async authenticate(config?: IntegrationConfig): Promise<AuthResult> {
    try {
      const tokenResponse = await this.exchangeCodeForToken(config)
      const _userProfile = await this.getUserProfile(tokenResponse.access_token)
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
          userId, : userProfile.id,
          userInfo: {,
            id: userProfile.id
            name: userProfile.fullName,
            email: userProfile.email}
    } catch (error) {
      this.logger.error('Craft authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncSpaces(accessToken),
        this.syncRecentDocuments(accessToken),
        this.syncFavoriteDocuments(accessToken),
      ])
  }

      const spacesResult = results[0]
      const documentsResult = results[1]
      const favoritesResult = results[2]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      const allDocuments = [
        ...(documentsResult.status === 'fulfilled' ? documentsResult.value : []),
        ...(favoritesResult.status === 'fulfilled' ? favoritesResult.value : []),
      ]

      return {
        success: true,
        data: {
          spaces: spacesResult.status === 'fulfilled' ? spacesResult.value : [],
          documents: allDocuments
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('Craft sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _profile = await this.getUserProfile(accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      this.logger.error('Failed to get Craft connection status:', error)
      return {
        isConnected: false,
        error: error.message}

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Craft webhook')
  }

      const data = payload.data
      const eventType = data.event

      switch (eventType) {
        case 'document.created':
        case 'document.updated':
        case 'document.deleted':
          await this.handleDocumentEvent(data)
          break
        case 'space.created':
        case 'space.updated':
        case 'space.deleted':
          await this.handleSpaceEvent(data)
          break
        default:
          this.logger.log(`Unhandled Craft webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logger.error('Craft webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in craft.integration.ts:', error)
      throw error
    }
  // User Management
  async getUserProfile(accessToken?: string): Promise<CraftUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Spaces Management
  async getSpaces(accessToken?: string): Promise<CraftSpace[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = 'spaces_all'
  }

    if (this.spacesCache.has(cacheKey)) {
      return this.spacesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/spaces', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const spaces = response.data || []
    this.spacesCache.set(cacheKey, spaces),
    return spaces
  }

  async getSpace(spaceId: string, accessToken?: string): Promise<CraftSpace> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/spaces/${spaceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  async createSpace(
    name: string,
    options: {
      description?: string
      color?: string
      icon?: string,
      isPrivate?: boolean
    } = {},
    accessToken?: string,
  ): Promise<CraftSpace> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/spaces', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        name,
        ...options})})

    return (response as Response).data
  }

  async updateSpace(
    spaceId: string,
    updates: {
      name?: string
      description?: string
      color?: string
      icon?: string,
      isPrivate?: boolean
    },
    accessToken?: string,
  ): Promise<CraftSpace> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/spaces/${spaceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    return (response as Response).data
  }

  async deleteSpace(spaceId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/spaces/${spaceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).status === 204 || response.status === 200
  }

  // Documents Management
  async getDocuments(
    spaceId?: string,
    limit: number = 50,
    offset: number = 0
    accessToken?: string,
  ): Promise<CraftDocument[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `documents_${spaceId || 'all'}_${limit}_${offset}`

    if (this.documentsCache.has(cacheKey)) {
      return this.documentsCache.get(cacheKey)!
    }

    const params: unknown = { limit: limit.toString(), offset: offset.toString() }
    if (spaceId) params.spaceId = spaceId

    const _response = await this.makeRequest('/documents', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const documents = response.data || []
    this.documentsCache.set(cacheKey, documents),
    return documents
  }

  async getDocument(documentId: string, accessToken?: string): Promise<CraftDocument> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/documents/${documentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  async createDocument(
    spaceId: string,
    title: string
    content: string,
    options: {
      contentType?: 'markdown' | 'rich_text'
      tags?: string[]
      parentId?: string
      isTemplate?: boolean
      metadata?: Record<string, unknown>
    } = {},
    accessToken?: string,
  ): Promise<CraftDocument> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/documents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        spaceId,
        title,
        content,
        contentType: 'markdown'
        ...options})})

    return (response as Response).data
  }

  async updateDocument(
    documentId: string,
    updates: {
      title?: string
      content?: string
      tags?: string[]
      isFavorite?: boolean
      isArchived?: boolean
      metadata?: Record<string, unknown>
    },
    accessToken?: string,
  ): Promise<CraftDocument> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    return (response as Response).data
  }

  async deleteDocument(documentId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).status === 204 || response.status === 200
  }

  async duplicateDocument(documentId: string, accessToken?: string): Promise<CraftDocument> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/documents/${documentId}/duplicate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Blocks Management
  async getBlocks(documentId: string, accessToken?: string): Promise<CraftBlock[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `blocks_${documentId}`
  }

    if (this.blocksCache.has(cacheKey)) {
      return this.blocksCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/documents/${documentId}/blocks`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const blocks = response.data || []
    this.blocksCache.set(cacheKey, blocks),
    return blocks
  }

  async createBlock(
    documentId: string,
    type: string
    content: string,
    options: {
      parentId?: string
      position?: number
      style?: Record<string, unknown>
      metadata?: Record<string, unknown>
    } = {},
    accessToken?: string,
  ): Promise<CraftBlock> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/documents/${documentId}/blocks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        type,
        content,
        ...options})})

    return (response as Response).data
  }

  async updateBlock(
    documentId: string,
    blockId: string
    updates: {
      content?: string
      style?: Record<string, unknown>
      position?: number
      metadata?: Record<string, unknown>
    },
    accessToken?: string,
  ): Promise<CraftBlock> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/documents/${documentId}/blocks/${blockId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(updates)})

    return (response as Response).data
  }

  async deleteBlock(documentId: string, blockId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/documents/${documentId}/blocks/${blockId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).status === 204 || response.status === 200
  }

  // Search
  async searchDocuments(
    query: string
    spaceId?: string,
    limit: number = 20
    accessToken?: string,
  ): Promise<CraftDocument[]> {
    const token = accessToken || (await this.getAccessToken())

    const params: unknown = { q: query, limit: limit.toString() }
    if (spaceId) params.spaceId = spaceId

    const _response = await this.makeRequest('/search/documents', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    return (response as Response).data || []
  }

  // Export
  async exportDocument(
    documentId: string,
    format: 'markdown' | 'pdf' | 'docx' = 'markdown'
    accessToken?: string,
  ): Promise<string> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/documents/${documentId}/export`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: { format })

    return (response as Response).data.downloadUrl
  }

  // Links Management
  async getLinks(documentId: string, accessToken?: string): Promise<CraftLink[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/documents/${documentId}/links`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data || []
  }

  // Helper Methods
  private async syncSpaces(accessToken: string): Promise<CraftSpace[]> {
    return this.getSpaces(accessToken)
  }

  private async syncRecentDocuments(accessToken: string): Promise<CraftDocument[]> {
    return this.getDocuments(undefined, 20, 0, accessToken)
  }

  private async syncFavoriteDocuments(accessToken: string): Promise<CraftDocument[]> {
    const allDocuments = await this.getDocuments(undefined, 100, 0, accessToken)
    return allDocuments.filter(doc => doc.isFavorite)
  }

  private async handleDocumentEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing document event: ${data._event}`)
      this.documentsCache.clear()
      this.blocksCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle document _event:', error)
    }

  private async handleSpaceEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing space event: ${data._event}`)
      this.spacesCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle space _event:', error)
    }

  private async exchangeCodeForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://api.craft.do/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({,
        grant_type: 'authorization_code'
        code: config.code!,
        redirect_uri: config.redirectUri!
        client_id: config.clientId!,
        client_secret: config.clientSecret!})})

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.craft.do/v1${endpoint}`

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
    if (!userId) {
      throw new Error('User ID required for token retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  // Cleanup method
  clearCache(): void {
    this.documentsCache.clear()
    this.spacesCache.clear()
    this.blocksCache.clear()
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