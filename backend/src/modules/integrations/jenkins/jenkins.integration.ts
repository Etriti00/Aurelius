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

export class JenkinsIntegration extends BaseIntegration {
  readonly provider = 'jenkins'
  readonly name = 'Jenkins'
  readonly version = '1.0.0'

  private baseUrl: string
  private username: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig & {
      jenkinsUrl?: string,
      username?: string
    },
  ) {
    super(userId, accessToken, refreshToken)
    this.baseUrl = config?.jenkinsUrl || 'https://jenkins.example.com',
    this.username = config?.username || ''
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/me/api/json`, {
        headers: {,
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`,
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
        scope: ['jenkins:read', 'jenkins:write'],
        metadata: { userInfo: data }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Jenkins uses API tokens that don't expire, so just return current auth status
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Jenkins doesn't have a revoke endpoint for API tokens
      // The token would need to be regenerated in the user's profile,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/json`, {
        headers: {,
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
        }
      })
  }

      if ((response as Response).ok) {
        const data = await response.json()
        return {
          isConnected: true,
          lastChecked: new Date()
          metadata: {,
            jenkinsVersion: data.version
            nodeDescription: data.nodeDescription
          }
        }
      }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Invalid credentials'
        }
    }
  }
      }

      if ((response as Response).status === 403) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Access forbidden'
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
        name: 'Jobs',
        description: 'Manage Jenkins jobs and builds'
        enabled: true,
        requiredScopes: ['jenkins:read', 'jenkins:write']
      },
      {
        name: 'Builds',
        description: 'Monitor and trigger Jenkins builds'
        enabled: true,
        requiredScopes: ['jenkins:read', 'jenkins:write']
      },
      {
        name: 'Pipelines',
        description: 'Manage Jenkins pipelines'
        enabled: true,
        requiredScopes: ['jenkins:read', 'jenkins:write']
      },
      {
        name: 'Nodes',
        description: 'Manage Jenkins nodes and agents'
        enabled: true,
        requiredScopes: ['jenkins:read', 'jenkins:write']
      },
      {
        name: 'Queue',
        description: 'Monitor build queue'
        enabled: true,
        requiredScopes: ['jenkins:read']
      },
      {
        name: 'Plugins',
        description: 'View installed plugins'
        enabled: true,
        requiredScopes: ['jenkins:read']
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

      this.logInfo('syncData', 'Starting Jenkins sync', { lastSyncTime })

      // Sync Jobs
      try {
        const jobsResult = await this.syncJobs(lastSyncTime)
        totalProcessed += jobsResult.processed,
        totalSkipped += jobsResult.skipped
      }
    } catch (error) {
        errors.push(`Jobs sync failed: ${(error as Error).message}`)
        this.logError('syncJobs', error as Error)
      }

      catch (error) {
        console.error('Error in jenkins.integration.ts:', error)
        throw error
      }
      // Sync Builds
      try {
        const buildsResult = await this.syncBuilds(lastSyncTime)
        totalProcessed += buildsResult.processed,
        totalSkipped += buildsResult.skipped
      } catch (error) {
        errors.push(`Builds sync failed: ${(error as Error).message}`)
        this.logError('syncBuilds', error as Error)
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
      throw new SyncError('Jenkins sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Jenkins webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'build_started':
        case 'build_completed':
        case 'build_failed':
          await this.handleBuildWebhook(payload.data)
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
      console.error('Error in jenkins.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Jenkins webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncJobs(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/json?tree=jobs[name,url,lastBuild[timestamp]]`,
        {
          headers: {,
            Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
          }
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.statusText}`)
      }

      const data = await response.json()
      const jobs = data.jobs || []

      let processed = 0
      let skipped = 0

      for (const job of jobs) {
        try {
          await this.processJob(job)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncJobs', error as Error, { jobName: job.name })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncJobs', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in jenkins.integration.ts:', error)
      throw error
    }
  private async syncBuilds(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      // This would sync recent builds across all jobs
      const processed = 0
      const skipped = 0

      // For demo purposes, we'll just return counts
      return { processed, skipped }
    } catch (error) {
      this.logError('syncBuilds', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in jenkins.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processJob(job: unknown): Promise<void> {
    this.logInfo('processJob', `Processing job: ${job.name}`)
  }

  // Private webhook handlers
  private async handleBuildWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleBuildWebhook', 'Processing build webhook', data)
  }

  // Public API methods
  async getJobs(): Promise<unknown[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/json?tree=jobs[name,url,color,lastBuild[number,result,timestamp,duration]]`,
        {
          headers: {,
            Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get jobs: ${response.statusText}`)
      }

      const data = await response.json()
      return data.jobs || []
    } catch (error) {
      this.logError('getJobs', error as Error)
      throw new Error(`Failed to get Jenkins jobs: ${(error as Error).message}`)
    }

  async getJob(jobName: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/job/${encodeURIComponent(jobName)}/api/json`, {
        headers: {,
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get job: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getJob', error as Error)
      throw new Error(`Failed to get Jenkins job: ${(error as Error).message}`)
    }

  async buildJob(jobName: string, parameters?: Record<string, unknown>): Promise<ApiResponse> {
    try {
      const endpoint = parameters ? '/buildWithParameters' : '/build'
      let url = `${this.baseUrl}/job/${encodeURIComponent(jobName)}${endpoint}`
  }

      if (parameters) {
        const params = new URLSearchParams(parameters)
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to build job: ${response.statusText}`)
      }

      return { success: true, location: response.headers.get('Location') }
    } catch (error) {
      this.logError('buildJob', error as Error)
      throw new Error(`Failed to build Jenkins job: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in jenkins.integration.ts:', error)
      throw error
    }
  async getBuild(jobName: string, buildNumber: number): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json`,
        {
          headers: {,
            Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get build: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getBuild', error as Error)
      throw new Error(`Failed to get Jenkins build: ${(error as Error).message}`)
    }

  async getLastBuild(jobName: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/job/${encodeURIComponent(jobName)}/lastBuild/api/json`,
        {
          headers: {,
            Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get last build: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getLastBuild', error as Error)
      throw new Error(`Failed to get Jenkins last build: ${(error as Error).message}`)
    }

  async getBuildLog(jobName: string, buildNumber: number): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/job/${encodeURIComponent(jobName)}/${buildNumber}/consoleText`,
        {
          headers: {,
            Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get build log: ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      this.logError('getBuildLog', error as Error)
      throw new Error(`Failed to get Jenkins build log: ${(error as Error).message}`)
    }

  async stopBuild(jobName: string, buildNumber: number): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/job/${encodeURIComponent(jobName)}/${buildNumber}/stop`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
          }
        },
      )
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('stopBuild', error as Error)
      throw new Error(`Failed to stop Jenkins build: ${(error as Error).message}`)
    }

  async getQueue(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/queue/api/json`, {
        headers: {,
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get queue: ${response.statusText}`)
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      this.logError('getQueue', error as Error)
      throw new Error(`Failed to get Jenkins queue: ${(error as Error).message}`)
    }

  async getNodes(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/computer/api/json`, {
        headers: {,
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get nodes: ${response.statusText}`)
      }

      const data = await response.json()
      return data.computer || []
    } catch (error) {
      this.logError('getNodes', error as Error)
      throw new Error(`Failed to get Jenkins nodes: ${(error as Error).message}`)
    }

  async getSystemInfo(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/systemInfo`, {
        headers: {,
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get system info: ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      this.logError('getSystemInfo', error as Error)
      throw new Error(`Failed to get Jenkins system info: ${(error as Error).message}`)
    }

  async createJob(jobName: string, configXml: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/createItem?name=${encodeURIComponent(jobName)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`,
            'Content-Type': 'text/xml'
          },
          body: configXml
        },
      )
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('createJob', error as Error)
      throw new Error(`Failed to create Jenkins job: ${(error as Error).message}`)
    }

  async deleteJob(jobName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/job/${encodeURIComponent(jobName)}/doDelete`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.username}:${this.accessToken}`).toString('base64')}`
        }
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('deleteJob', error as Error)
      throw new Error(`Failed to delete Jenkins job: ${(error as Error).message}`)
    }

}