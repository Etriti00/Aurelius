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
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class VercelIntegration extends BaseIntegration {
  readonly provider = 'vercel'
  readonly name = 'Vercel'
  readonly version = '1.0.0'

  private baseUrl = 'https://api.vercel.com'
  private teamId?: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig & { teamId?: string },
  ) {
    super(userId accessToken, refreshToken),
    this.teamId = config?.teamId
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/user`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: ['vercel:read', 'vercel:write'],
        metadata: { userInfo: data.user }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Vercel uses access tokens that don't expire, so just return current auth status
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Vercel doesn't have a revoke endpoint for tokens
      // The token would need to be deleted in the user's settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/user`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if ((response as Response).ok) {
        const data = await response.json()
        return {
          isConnected: true,
          lastChecked: new Date()
          metadata: {,
            userName: data.user?.name
            userEmail: data.user?.email
          }
        }
      }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Invalid access token'
        }
    }
  }
      }

      if ((response as Response).status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 100,
            remaining: 0
            resetTime: new Date(Date.now() + 3600000)
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: response.statusText
      }
    }
  }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Projects',
        description: 'Manage Vercel projects and configurations'
        enabled: true,
        requiredScopes: ['vercel:read', 'vercel:write']
      },
      {
        name: 'Deployments',
        description: 'Monitor and trigger Vercel deployments'
        enabled: true,
        requiredScopes: ['vercel:read', 'vercel:write']
      },
      {
        name: 'Domains',
        description: 'Manage custom domains'
        enabled: true,
        requiredScopes: ['vercel:read', 'vercel:write']
      },
      {
        name: 'Environment Variables',
        description: 'Manage project environment variables'
        enabled: true,
        requiredScopes: ['vercel:read', 'vercel:write']
      },
      {
        name: 'Teams',
        description: 'Manage team settings and members'
        enabled: true,
        requiredScopes: ['vercel:read', 'vercel:write']
      },
      {
        name: 'Logs',
        description: 'Access deployment and function logs'
        enabled: true,
        requiredScopes: ['vercel:read']
      },
      {
        name: 'Functions',
        description: 'Manage serverless functions'
        enabled: true,
        requiredScopes: ['vercel:read', 'vercel:write']
      },
    ]
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const capabilities = this.getCapabilities()
    const allRequiredScopes = capabilities.flatMap(cap => cap.requiredScopes)
  }

    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []
  }

      this.logInfo('syncData', 'Starting Vercel sync', { lastSyncTime })

      // Sync Projects
      try {
        const projectsResult = await this.syncProjects(lastSyncTime)
        totalProcessed += projectsResult.processed,
        totalSkipped += projectsResult.skipped
      }
    } catch (error) {
        errors.push(`Projects sync failed: ${(error as Error).message}`)
        this.logError('syncProjects', error as Error)
      }

      catch (error) {
        console.error('Error in vercel.integration.ts:', error)
        throw error
      }
      // Sync Deployments
      try {
        const deploymentsResult = await this.syncDeployments(lastSyncTime)
        totalProcessed += deploymentsResult.processed,
        totalSkipped += deploymentsResult.skipped
      } catch (error) {
        errors.push(`Deployments sync failed: ${(error as Error).message}`)
        this.logError('syncDeployments', error as Error)
      }

      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Vercel sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Vercel webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'deployment.created':
        case 'deployment.succeeded':
        case 'deployment.failed':
          await this.handleDeploymentWebhook(payload.data)
          break
        default:
          this.logInfo('handleWebhook', `Unhandled webhook event: ${payload._event}`)
      }
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in vercel.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Vercel webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncProjects(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/v9/projects`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`)
      }

      const data = await response.json()
      const projects = data.projects || []

      let processed = 0
      let skipped = 0

      for (const project of projects) {
        try {
          await this.processProject(project)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncProjects', error as Error, { projectId: project.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncProjects', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in vercel.integration.ts:', error)
      throw error
    }
  private async syncDeployments(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/v6/deployments`
      const params = new URLSearchParams()

      if (this.teamId) params.append('teamId', this.teamId)
      if (lastSyncTime) params.append('since', lastSyncTime.getTime().toString())

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch deployments: ${response.statusText}`)
      }

      const data = await response.json()
      const deployments = data.deployments || []

      let processed = 0
      let skipped = 0

      for (const deployment of deployments) {
        try {
          await this.processDeployment(deployment)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncDeployments', error as Error, { deploymentId: deployment.uid })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncDeployments', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in vercel.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processProject(_project: unknown): Promise<void> {
    this.logInfo('processProject', `Processing project: ${project.name}`)
  }

  private async processDeployment(deployment: unknown): Promise<void> {
    this.logInfo('processDeployment', `Processing deployment: ${deployment.uid}`)
  }

  // Private webhook handlers
  private async handleDeploymentWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleDeploymentWebhook', 'Processing deployment webhook', data)
  }

  // Public API methods
  async getProjects(): Promise<unknown[]> {
    try {
      let url = `${this.baseUrl}/v9/projects`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.statusText}`)
      }

      const data = await response.json()
      return data.projects || []
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get Vercel projects: ${(error as Error).message}`)
    }

  async getProject(projectId: string): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/v9/projects/${projectId}`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get project: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getProject', error as Error)
      throw new Error(`Failed to get Vercel project: ${(error as Error).message}`)
    }

  async createProject(projectData: {,
    name: string
    gitRepository?: {
      type: 'github' | 'gitlab' | 'bitbucket',
      repo: string
    }
    framework?: string,
    publicSource?: boolean
  }): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/v9/projects`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createProject', error as Error)
      throw new Error(`Failed to create Vercel project: ${(error as Error).message}`)
    }

  async updateProject(projectId: string, projectData: unknown): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/v9/projects/${projectId}`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      })

      if (!response.ok) {
        throw new Error(`Failed to update project: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('updateProject', error as Error)
      throw new Error(`Failed to update Vercel project: ${(error as Error).message}`)
    }

  async deleteProject(projectId: string): Promise<boolean> {
    try {
      let url = `${this.baseUrl}/v9/projects/${projectId}`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      return (response as Response).ok
    } catch (error) {
      this.logError('deleteProject', error as Error)
      throw new Error(`Failed to delete Vercel project: ${(error as Error).message}`)
    }

  async getDeployments(options?: {
    app?: string
    since?: string
    until?: string,
    limit?: number
  }): Promise<unknown[]> {
    try {
      let url = `${this.baseUrl}/v6/deployments`
      const params = new URLSearchParams()

      if (this.teamId) params.append('teamId', this.teamId)
      if (_options?.app) params.append('app', _options.app)
      if (_options?.since) params.append('since', _options.since)
      if (_options?.until) params.append('until', _options.until)
      if (_options?.limit) params.append('limit', _options.limit.toString())

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get deployments: ${response.statusText}`)
      }

      const data = await response.json()
      return data.deployments || []
    } catch (error) {
      this.logError('getDeployments', error as Error)
      throw new Error(`Failed to get Vercel deployments: ${(error as Error).message}`)
    }

  async getDeployment(deploymentId: string): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/v13/deployments/${deploymentId}`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get deployment: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getDeployment', error as Error)
      throw new Error(`Failed to get Vercel deployment: ${(error as Error).message}`)
    }

  async createDeployment(deploymentData: {,
    name: string
    files?: Array<{ file: string; data: string }>
    gitRepository?: {
      type: 'github' | 'gitlab' | 'bitbucket',
      repo: string
      ref?: string
    }
    env?: Record<string, string>
    build?: {
      env?: Record<string, string>
    }
    functions?: Record<string, unknown>
  }): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/v13/deployments`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create deployment: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createDeployment', error as Error)
      throw new Error(`Failed to create Vercel deployment: ${(error as Error).message}`)
    }

  async cancelDeployment(deploymentId: string): Promise<boolean> {
    try {
      let url = `${this.baseUrl}/v12/deployments/${deploymentId}/cancel`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      return (response as Response).ok
    } catch (error) {
      this.logError('cancelDeployment', error as Error)
      throw new Error(`Failed to cancel Vercel deployment: ${(error as Error).message}`)
    }

  async getDomains(): Promise<unknown[]> {
    try {
      let url = `${this.baseUrl}/v5/domains`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get domains: ${response.statusText}`)
      }

      const data = await response.json()
      return data.domains || []
    } catch (error) {
      this.logError('getDomains', error as Error)
      throw new Error(`Failed to get Vercel domains: ${(error as Error).message}`)
    }

  async addDomain(domain: string): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/v5/domains`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: domain })
      })

      if (!response.ok) {
        throw new Error(`Failed to add domain: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('addDomain', error as Error)
      throw new Error(`Failed to add Vercel domain: ${(error as Error).message}`)
    }

  async getEnvironmentVariables(projectId: string): Promise<unknown[]> {
    try {
      let url = `${this.baseUrl}/v9/projects/${projectId}/env`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }
  }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get environment variables: ${response.statusText}`)
      }

      const data = await response.json()
      return data.envs || []
    } catch (error) {
      this.logError('getEnvironmentVariables', error as Error)
      throw new Error(`Failed to get Vercel environment variables: ${(error as Error).message}`)
    }

  async createEnvironmentVariable(
    projectId: string,
    envVar: {
      key: string,
      value: string
      target: Array<'production' | 'preview' | 'development'>
      type?: 'encrypted' | 'plain'
    },
  ): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/v9/projects/${projectId}/env`
      if (this.teamId) {
        url += `?teamId=${this.teamId}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envVar)
      })

      if (!response.ok) {
        throw new Error(`Failed to create environment variable: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createEnvironmentVariable', error as Error)
      throw new Error(`Failed to create Vercel environment variable: ${(error as Error).message}`)
    }

}