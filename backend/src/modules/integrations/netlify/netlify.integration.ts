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

export class NetlifyIntegration extends BaseIntegration {
  readonly provider = 'netlify'
  readonly name = 'Netlify'
  readonly version = '1.0.0'

  private baseUrl = 'https://api.netlify.com/api/v1'

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
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
        scope: ['netlify:read', 'netlify:write'],
        metadata: { userInfo: data }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue) {
        return this.authenticate()
      }
  }

      const response = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          grant_type: 'refresh_token'
          refresh_token: this.refreshTokenValue,
          client_id: this.config?.clientId || ''
          client_secret: this.config?.clientSecret || ''
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        accessToken: data.access_token
        refreshToken: data.refresh_token || this.refreshTokenValue,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined
        scope: data.scope?.split(' ') || ['netlify:read', 'netlify:write']
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/tokens/${this.accessToken}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
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
            userName: data.full_name
            userEmail: data.email
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
            limit: 500,
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
        name: 'Sites',
        description: 'Manage Netlify sites and configurations'
        enabled: true,
        requiredScopes: ['netlify:read', 'netlify:write']
      },
      {
        name: 'Deployments',
        description: 'Monitor and trigger Netlify deployments'
        enabled: true,
        requiredScopes: ['netlify:read', 'netlify:write']
      },
      {
        name: 'Build Hooks',
        description: 'Manage build hooks for automated deployments'
        enabled: true,
        requiredScopes: ['netlify:read', 'netlify:write']
      },
      {
        name: 'Forms',
        description: 'Manage form submissions and settings'
        enabled: true,
        requiredScopes: ['netlify:read', 'netlify:write']
      },
      {
        name: 'Functions',
        description: 'Manage serverless functions'
        enabled: true,
        requiredScopes: ['netlify:read', 'netlify:write']
      },
      {
        name: 'DNS',
        description: 'Manage DNS records and domains'
        enabled: true,
        requiredScopes: ['netlify:read', 'netlify:write']
      },
      {
        name: 'Analytics',
        description: 'Access site analytics and metrics'
        enabled: true,
        requiredScopes: ['netlify:read']
      },
      {
        name: 'Environment Variables',
        description: 'Manage site environment variables'
        enabled: true,
        requiredScopes: ['netlify:read', 'netlify:write']
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

      this.logInfo('syncData', 'Starting Netlify sync', { lastSyncTime })

      // Sync Sites
      try {
        const sitesResult = await this.syncSites(lastSyncTime)
        totalProcessed += sitesResult.processed,
        totalSkipped += sitesResult.skipped
      }
    } catch (error) {
        errors.push(`Sites sync failed: ${(error as Error).message}`)
        this.logError('syncSites', error as Error)
      }

      catch (error) {
        console.error('Error in netlify.integration.ts:', error)
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
      throw new SyncError('Netlify sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Netlify webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'deploy_building':
        case 'deploy_created':
        case 'deploy_failed':
          await this.handleDeploymentWebhook(payload.data)
          break
        case 'submission_created':
          await this.handleFormWebhook(payload.data)
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
      console.error('Error in netlify.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Netlify webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncSites(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/sites`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch sites: ${response.statusText}`)
      }

      const sites = await response.json()

      let processed = 0
      let skipped = 0

      for (const site of sites) {
        try {
          await this.processSite(site)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncSites', error as Error, { siteId: site.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncSites', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in netlify.integration.ts:', error)
      throw error
    }
  private async syncDeployments(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      // This would sync deployments for each site
      const processed = 0
      const skipped = 0

      // For demo purposes, we'll just return counts
      return { processed, skipped }
    } catch (error) {
      this.logError('syncDeployments', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in netlify.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processSite(site: unknown): Promise<void> {
    this.logInfo('processSite', `Processing site: ${site.name}`)
  }

  // Private webhook handlers
  private async handleDeploymentWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleDeploymentWebhook', 'Processing deployment webhook', data)
  }

  private async handleFormWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleFormWebhook', 'Processing form webhook', data)
  }

  // Public API methods
  async getSites(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sites`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get sites: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getSites', error as Error)
      throw new Error(`Failed to get Netlify sites: ${(error as Error).message}`)
    }

  async getSite(siteId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get site: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getSite', error as Error)
      throw new Error(`Failed to get Netlify site: ${(error as Error).message}`)
    }

  async createSite(siteData: {
    name?: string
    customDomain?: string
    repo?: {
      provider: string,
      repo: string
      branch?: string
      buildCommand?: string,
      publishDir?: string
    }): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create site: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createSite', error as Error)
      throw new Error(`Failed to create Netlify site: ${(error as Error).message}`)
    }

  async updateSite(siteId: string, siteData: unknown): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(siteData)
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to update site: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('updateSite', error as Error)
      throw new Error(`Failed to update Netlify site: ${(error as Error).message}`)
    }

  async deleteSite(siteId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('deleteSite', error as Error)
      throw new Error(`Failed to delete Netlify site: ${(error as Error).message}`)
    }

  async getDeployments(siteId: string): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/deploys`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get deployments: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getDeployments', error as Error)
      throw new Error(`Failed to get Netlify deployments: ${(error as Error).message}`)
    }

  async getDeployment(deployId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/deploys/${deployId}`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get deployment: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getDeployment', error as Error)
      throw new Error(`Failed to get Netlify deployment: ${(error as Error).message}`)
    }

  async createDeployment(
    siteId: string,
    deploymentData: {
      files?: { [key: string]: string }
      functions?: { [key: string]: unknown }
      title?: string,
      branch?: string
    },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/deploys`, {
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
      throw new Error(`Failed to create Netlify deployment: ${(error as Error).message}`)
    }

  async cancelDeployment(deployId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/deploys/${deployId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('cancelDeployment', error as Error)
      throw new Error(`Failed to cancel Netlify deployment: ${(error as Error).message}`)
    }

  async getBuildHooks(siteId: string): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/build_hooks`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get build hooks: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getBuildHooks', error as Error)
      throw new Error(`Failed to get Netlify build hooks: ${(error as Error).message}`)
    }

  async createBuildHook(
    siteId: string,
    hookData: {
      title: string
      branch?: string
    },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/build_hooks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hookData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create build hook: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createBuildHook', error as Error)
      throw new Error(`Failed to create Netlify build hook: ${(error as Error).message}`)
    }

  async deleteBuildHook(hookId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/build_hooks/${hookId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('deleteBuildHook', error as Error)
      throw new Error(`Failed to delete Netlify build hook: ${(error as Error).message}`)
    }

  async getForms(siteId: string): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/forms`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get forms: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getForms', error as Error)
      throw new Error(`Failed to get Netlify forms: ${(error as Error).message}`)
    }

  async getFormSubmissions(formId: string): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/forms/${formId}/submissions`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get form submissions: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getFormSubmissions', error as Error)
      throw new Error(`Failed to get Netlify form submissions: ${(error as Error).message}`)
    }

  async getFunctions(siteId: string): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/functions`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get functions: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getFunctions', error as Error)
      throw new Error(`Failed to get Netlify functions: ${(error as Error).message}`)
    }

  async getEnvironmentVariables(siteId: string): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/env`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get environment variables: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getEnvironmentVariables', error as Error)
      throw new Error(`Failed to get Netlify environment variables: ${(error as Error).message}`)
    }

  async setEnvironmentVariable(siteId: string, key: string, value: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/env/${key}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value })
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to set environment variable: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('setEnvironmentVariable', error as Error)
      throw new Error(`Failed to set Netlify environment variable: ${(error as Error).message}`)
    }

  async deleteEnvironmentVariable(siteId: string, key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sites/${siteId}/env/${key}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('deleteEnvironmentVariable', error as Error)
      throw new Error(`Failed to delete Netlify environment variable: ${(error as Error).message}`)
    }

}