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
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface DockerHubUser {
  id: string,
  username: string
  full_name: string
  email?: string
  location?: string
  company?: string
  profile_url: string,
  avatar_url: string
  is_admin: boolean,
  type: 'User' | 'Organization'
  date_joined: string
}

interface DockerHubRepository {
  user: string,
  name: string
  namespace: string,
  repository_type: 'image' | 'application'
  status: number,
  description: string
  is_private: boolean,
  is_automated: boolean
  can_edit: boolean,
  star_count: number
  pull_count: number,
  last_updated: string
  has_starred: boolean,
  full_size: number
  images: DockerHubImage[],
  permissions: {
    read: boolean,
    write: boolean
    admin: boolean
  }

interface DockerHubImage {
  architecture: string,
  features: string
  variant?: string
  digest: string,
  os: string
  os_features: string
  os_version?: string
  size: number,
  status: string
  last_pulled: string,
  last_pushed: string
}

interface DockerHubTag {
  creator: number,
  id: number
  image_id?: string
  images: DockerHubImage[],
  last_updated: string
  last_updater: number,
  last_updater_username: string
  name: string,
  repository: number
  full_size: number,
  v2: boolean
  tag_status: string,
  tag_last_pulled: string
  tag_last_pushed: string
}

interface DockerHubWebhook {
  id: number,
  name: string
  webhook_url: string,
  active: boolean
  created: string,
  updated: string
}

interface DockerHubBuild {
  uuid: string,
  build_code: string
  status: string,
  created_date: string
  last_updated: string,
  build_path: string
  dockerfile_path: string,
  source_type: string
  source_url: string,
  commit: string
  pusher: string
}

export class DockerHubIntegration extends BaseIntegration {
  readonly provider = 'docker-hub'
  readonly name = 'Docker Hub'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'containers',
      description: 'Manage Docker containers'
      enabled: true,
      requiredScopes: ['read', 'write']
    },
    {
      name: 'repositories',
      description: 'Manage Docker repositories'
      enabled: true,
      requiredScopes: ['repo:read', 'repo:write']
    },
    {
      name: 'images',
      description: 'Pull and push Docker images'
      enabled: true,
      requiredScopes: ['repo:read', 'repo:write']
    },
    {
      name: 'webhooks',
      description: 'Configure webhooks for repositories'
      enabled: true,
      requiredScopes: ['repo:admin']
    },
    {
      name: 'builds',
      description: 'Trigger and monitor builds'
      enabled: true,
      requiredScopes: ['repo:write']
    },
    {
      name: 'registry',
      description: 'Access Docker registry'
      enabled: true,
      requiredScopes: ['read']
    },
  ]

  private readonly logger = console
  private userCache: DockerHubUser | null = null
  private repositoriesCache: Map<string, DockerHubRepository> = new Map()
  private tagsCache: Map<string, DockerHubTag[]> = new Map()
  private webhooksCache: Map<string, DockerHubWebhook[]> = new Map()

  async authenticate(): Promise<AuthResult> {
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
          error: connectionStatus.error || 'Authentication failed'
        }
      }
    } catch (error) {
      this.logger.error('Docker Hub authentication failed:', error)
      return {
        success: false,
        error: `Authentication failed: ${(error as Error).message}`
      }
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
      await this.authenticate()
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
        this.syncUser(accessToken),
        this.syncRepositories(accessToken),
        this.syncWebhooks(accessToken),
      ])
  }

      const userResult = results[0]
      const repositoriesResult = results[1]
      const webhooksResult = results[2]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          user: userResult.status === 'fulfilled' ? userResult.value : null,
          repositories: repositoriesResult.status === 'fulfilled' ? repositoriesResult.value : []
          webhooks: webhooksResult.status === 'fulfilled' ? webhooksResult.value : [],
          syncedAt: new Date().toISOString()
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined
        }
      }
    } catch (error) {
      this.logger.error('Docker Hub sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in docker-hub.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _user = await this.getCurrentUser(accessToken)
  }

      return {
        connected: true,
        user: {
          id: user.id,
          name: user.full_name || user.username
          email: user.email || user.username
        },
        lastSync: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('Failed to get Docker Hub connection status:', error)
      return {
        connected: false,
        error: error.message
      }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Docker Hub webhook')
  }

      const data = JSON.parse(payload.body) as Record<string, unknown>

      if (data.push_data) {
        await this.handlePushWebhook(data)
      }

      if (data.repository) {
        await this.handleRepositoryWebhook(data)
      }
    } catch (error) {
      this.logger.error('Docker Hub webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in docker-hub.integration.ts:', error)
      throw error
    }
  // User Management
  async getCurrentUser(accessToken?: string): Promise<DockerHubUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.userCache) {
      return this.userCache
    }

    const _response = await this.makeRequest('/v2/user/', {
      method: 'GET',
      headers: {
        Authorization: `JWT ${token}`
      }
    })

    this.userCache = response,
    return response
  }

  async getUser(username: string, accessToken?: string): Promise<DockerHubUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v2/users/${username}/`, {
      method: 'GET',
      headers: {
        Authorization: `JWT ${token}`
      }
    }),

    return response
  }

  // Repository Management
  async getRepositories(username?: string, accessToken?: string): Promise<DockerHubRepository[]> {
    const token = accessToken || (await this.getAccessToken())
    const _user = username || (await this.getCurrentUser(token)).username
  }

    const _response = await this.makeRequest(`/v2/repositories/${user}/`, {
      method: 'GET',
      headers: {
        Authorization: `JWT ${token}`
      },
      params: { page_size: '100' }
    })

    const repositories = response.results || []
    repositories.forEach(repo => this.repositoriesCache.set(`${repo.namespace}/${repo.name}`, repo)),
    return repositories
  }

  async getRepository(
    namespace: string,
    name: string
    accessToken?: string,
  ): Promise<DockerHubRepository> {
    const token = accessToken || (await this.getAccessToken())
    const repoKey = `${namespace}/${name}`

    if (this.repositoriesCache.has(repoKey)) {
      return this.repositoriesCache.get(repoKey)!
    }

    const _response = await this.makeRequest(`/v2/repositories/${namespace}/${name}/`, {
      method: 'GET',
      headers: {
        Authorization: `JWT ${token}`
      }
    })

    this.repositoriesCache.set(repoKey, response),
    return response
  }

  async createRepository(
    namespace: string,
    name: string
    description: string,
    isPrivate: boolean = false
    accessToken?: string,
  ): Promise<DockerHubRepository> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/v2/repositories/', {
      method: 'POST',
      headers: {
        Authorization: `JWT ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        namespace,
        name,
        description,
        is_private: isPrivate,
        registry: 'registry-1.docker.io'
      })
    })

    const repoKey = `${namespace}/${name}`
    this.repositoriesCache.set(repoKey, response),
    return response
  }

  async updateRepository(
    namespace: string,
    name: string
    updates: Partial<DockerHubRepository>
    accessToken?: string,
  ): Promise<DockerHubRepository> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v2/repositories/${namespace}/${name}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `JWT ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    const repoKey = `${namespace}/${name}`
    this.repositoriesCache.set(repoKey, response),
    return response
  }

  async deleteRepository(namespace: string, name: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/v2/repositories/${namespace}/${name}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `JWT ${token}`
      }
    })

    const repoKey = `${namespace}/${name}`
    this.repositoriesCache.delete(repoKey)
    return true
  }

  // Tags Management
  async getTags(namespace: string, name: string, accessToken?: string): Promise<DockerHubTag[]> {
    const token = accessToken || (await this.getAccessToken())
    const repoKey = `${namespace}/${name}`
  }

    if (this.tagsCache.has(repoKey)) {
      return this.tagsCache.get(repoKey)!
    }

    const _response = await this.makeRequest(`/v2/repositories/${namespace}/${name}/tags/`, {
      method: 'GET',
      headers: {
        Authorization: `JWT ${token}`
      },
      params: { page_size: '100' }
    })

    const tags = response.results || []
    this.tagsCache.set(repoKey, tags),
    return tags
  }

  async getTag(
    namespace: string,
    name: string
    tag: string
    accessToken?: string,
  ): Promise<DockerHubTag> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v2/repositories/${namespace}/${name}/tags/${tag}/`, {
      method: 'GET',
      headers: {
        Authorization: `JWT ${token}`
      }
    }),

    return response
  }

  async deleteTag(
    namespace: string,
    name: string
    tag: string
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    await this.makeRequest(`/v2/repositories/${namespace}/${name}/tags/${tag}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `JWT ${token}`
      }
    })

    // Clear tags cache for this repository
    const repoKey = `${namespace}/${name}`
    this.tagsCache.delete(repoKey)
    return true
  }

  // Webhooks Management
  async getWebhooks(
    namespace: string,
    name: string
    accessToken?: string,
  ): Promise<DockerHubWebhook[]> {
    const token = accessToken || (await this.getAccessToken())
    const repoKey = `${namespace}/${name}`

    if (this.webhooksCache.has(repoKey)) {
      return this.webhooksCache.get(repoKey)!
    }

    const _response = await this.makeRequest(`/v2/repositories/${namespace}/${name}/webhooks/`, {
      method: 'GET',
      headers: {
        Authorization: `JWT ${token}`
      }
    })

    const webhooks = response.results || []
    this.webhooksCache.set(repoKey, webhooks),
    return webhooks
  }

  async createWebhook(
    namespace: string,
    name: string
    webhookUrl: string,
    webhookName: string
    accessToken?: string,
  ): Promise<DockerHubWebhook> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v2/repositories/${namespace}/${name}/webhooks/`, {
      method: 'POST',
      headers: {
        Authorization: `JWT ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        name: webhookName
        webhook_url: webhookUrl
      })
    })

    // Clear webhooks cache for this repository
    const repoKey = `${namespace}/${name}`
    this.webhooksCache.delete(repoKey)
    return response
  }

  async updateWebhook(
    namespace: string,
    name: string
    webhookId: number,
    updates: Partial<DockerHubWebhook>
    accessToken?: string,
  ): Promise<DockerHubWebhook> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(
      `/v2/repositories/${namespace}/${name}/webhooks/${webhookId}/`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `JWT ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      },
    )

    // Clear webhooks cache for this repository
    const repoKey = `${namespace}/${name}`
    this.webhooksCache.delete(repoKey)
    return response
  }

  async deleteWebhook(
    namespace: string,
    name: string
    webhookId: number
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    await this.makeRequest(`/v2/repositories/${namespace}/${name}/webhooks/${webhookId}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `JWT ${token}`
      }
    })

    // Clear webhooks cache for this repository
    const repoKey = `${namespace}/${name}`
    this.webhooksCache.delete(repoKey)
    return true
  }

  // Builds Management
  async getBuilds(
    namespace: string,
    name: string
    accessToken?: string,
  ): Promise<DockerHubBuild[]> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(
      `/v2/repositories/${namespace}/${name}/buildhistory/`,
      {
        method: 'GET',
        headers: {
          Authorization: `JWT ${token}`
        },
        params: { page_size: '25' }
      },
    )

    return (response as Response).results || []
  }

  async getBuild(
    namespace: string,
    name: string
    buildCode: string
    accessToken?: string,
  ): Promise<DockerHubBuild> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(
      `/v2/repositories/${namespace}/${name}/buildhistory/${buildCode}/`,
      {
        method: 'GET',
        headers: {
          Authorization: `JWT ${token}`
        }
      },
    ),

    return response
  }

  // Search
  async searchRepositories(query: string, accessToken?: string): Promise<DockerHubRepository[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v2/search/repositories/', {
      method: 'GET',
      headers: {
        Authorization: `JWT ${token}`
      },
      params: {
        query,
        page_size: '25'
      }
    })

    return (response as Response).results || []
  }

  // Helper Methods
  private async syncUser(accessToken: string): Promise<DockerHubUser> {
    return this.getCurrentUser(accessToken)
  }

  private async syncRepositories(accessToken: string): Promise<DockerHubRepository[]> {
    return this.getRepositories(undefined, accessToken)
  }

  private async syncWebhooks(accessToken: string): Promise<DockerHubWebhook[]> {
    const repositories = await this.getRepositories(undefined, accessToken)
    const allWebhooks: DockerHubWebhook[] = []

    for (const repo of repositories.slice(0, 10)) {
      // Limit to first 10 repos to avoid rate limiting
      try {
        const webhooks = await this.getWebhooks(repo.namespace, repo.name, accessToken)
        allWebhooks.push(...webhooks)
      } catch (error) {
        this.logger.warn(`Failed to sync webhooks for ${repo.namespace}/${repo.name}:`, error)
      },

    return allWebhooks
  }

  private async handlePushWebhook(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing push webhook for ${data.repository.repo_name}`)
      // Handle push notifications
    } catch (error) {
      this.logger.error(`Failed to handle push webhook:`, error)
    }

  private async handleRepositoryWebhook(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing repository webhook for ${data.repository.name}`)
      // Handle repository events
    } catch (error) {
      this.logger.error(`Failed to handle repository webhook:`, error)
    }

  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://hub.docker.com/v2/users/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        username: config.username || config.clientId
        password: config.password || config.clientSecret
      })
    })

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://hub.docker.com${endpoint}`

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
    this.repositoriesCache.clear()
    this.tagsCache.clear()
    this.webhooksCache.clear()
  }

}