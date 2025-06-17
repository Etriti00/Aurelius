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

export class CircleCIIntegration extends BaseIntegration {
  readonly provider = 'circleci'
  readonly name = 'CircleCI'
  readonly version = '1.0.0'

  private baseUrl = 'https://circleci.com/api/v2'

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
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Circle-Token': this.accessToken,
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
        scope: ['circleci:read', 'circleci:write'],
        metadata: { userInfo: data }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // CircleCI uses personal access tokens that don't expire, so just return current auth status
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // CircleCI doesn't have a revoke endpoint for tokens
      // The token would need to be deleted in the user's settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, { headers: {
          'Circle-Token': this.accessToken }
      })
  }

      if ((response as Response).ok) {
        const data = await response.json()
        return {
          isConnected: true,
          lastChecked: new Date()
          metadata: {,
            userName: data.name
            userLogin: data.login
          }
        }
      }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Invalid API token'
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
            limit: 300,
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
        description: 'Manage CircleCI projects and configurations'
        enabled: true,
        requiredScopes: ['circleci:read', 'circleci:write']
      },
      {
        name: 'Pipelines',
        description: 'Monitor and trigger CircleCI pipelines'
        enabled: true,
        requiredScopes: ['circleci:read', 'circleci:write']
      },
      {
        name: 'Workflows',
        description: 'View and manage workflow executions'
        enabled: true,
        requiredScopes: ['circleci:read', 'circleci:write']
      },
      {
        name: 'Jobs',
        description: 'Monitor CircleCI job executions'
        enabled: true,
        requiredScopes: ['circleci:read']
      },
      {
        name: 'Artifacts',
        description: 'Access and download build artifacts'
        enabled: true,
        requiredScopes: ['circleci:read']
      },
      {
        name: 'Environment Variables',
        description: 'Manage project environment variables'
        enabled: true,
        requiredScopes: ['circleci:read', 'circleci:write']
      },
      {
        name: 'SSH Keys',
        description: 'Manage project SSH keys'
        enabled: true,
        requiredScopes: ['circleci:read', 'circleci:write']
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

      this.logInfo('syncData', 'Starting CircleCI sync', { lastSyncTime })

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
        console.error('Error in circleci.integration.ts:', error)
        throw error
      }
      // Sync Pipelines
      try {
        const pipelinesResult = await this.syncPipelines(lastSyncTime)
        totalProcessed += pipelinesResult.processed,
        totalSkipped += pipelinesResult.skipped
      } catch (error) {
        errors.push(`Pipelines sync failed: ${(error as Error).message}`)
        this.logError('syncPipelines', error as Error)
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
      throw new SyncError('CircleCI sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing CircleCI webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'workflow-completed':
        case 'job-completed':
          await this.handleWorkflowWebhook(payload.data)
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
      console.error('Error in circleci.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // CircleCI webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncProjects(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, { headers: {
          'Circle-Token': this.accessToken }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`)
      }

      const data = await response.json()
      const projects = data.items || []

      let processed = 0
      let skipped = 0

      for (const project of projects) {
        try {
          await this.processProject(project)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncProjects', error as Error, { projectSlug: project.slug })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncProjects', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in circleci.integration.ts:', error)
      throw error
    }
  private async syncPipelines(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      // This would sync pipelines for each project
      const processed = 0
      const skipped = 0

      // For demo purposes, we'll just return counts
      return { processed, skipped }
    } catch (error) {
      this.logError('syncPipelines', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in circleci.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processProject(_project: unknown): Promise<void> {
    this.logInfo('processProject', `Processing project: ${project.slug}`)
  }

  // Private webhook handlers
  private async handleWorkflowWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleWorkflowWebhook', 'Processing workflow webhook', data)
  }

  // Public API methods
  async getProjects(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, { headers: {
          'Circle-Token': this.accessToken }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.statusText}`)
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get CircleCI projects: ${(error as Error).message}`)
    }

  async getProject(projectSlug: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectSlug}`, { headers: {
          'Circle-Token': this.accessToken }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get project: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getProject', error as Error)
      throw new Error(`Failed to get CircleCI project: ${(error as Error).message}`)
    }

  async getPipelines(
    projectSlug: string
    options?: {
      branch?: string,
      pageToken?: string
    },
  ): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/project/${projectSlug}/pipeline`
      const params = new URLSearchParams()

      if (_options?.branch) params.append('branch', _options.branch)
      if (_options?.pageToken) params.append('page-token', _options.pageToken)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, { headers: {
          'Circle-Token': this.accessToken }
      })

      if (!response.ok) {
        throw new Error(`Failed to get pipelines: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getPipelines', error as Error)
      throw new Error(`Failed to get CircleCI pipelines: ${(error as Error).message}`)
    }

  async triggerPipeline(
    projectSlug: string,
    pipelineData: {
      branch?: string
      tag?: string
      parameters?: Record<string, unknown>
    },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectSlug}/pipeline`, {
        method: 'POST',
        headers: {
          'Circle-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipelineData)
      })

      if (!response.ok) {
        throw new Error(`Failed to trigger pipeline: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('triggerPipeline', error as Error)
      throw new Error(`Failed to trigger CircleCI pipeline: ${(error as Error).message}`)
    }

  async getPipeline(pipelineId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/pipeline/${pipelineId}`, { headers: {
          'Circle-Token': this.accessToken }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get pipeline: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getPipeline', error as Error)
      throw new Error(`Failed to get CircleCI pipeline: ${(error as Error).message}`)
    }

  async getPipelineWorkflows(pipelineId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/pipeline/${pipelineId}/workflow`, { headers: {
          'Circle-Token': this.accessToken }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get pipeline workflows: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getPipelineWorkflows', error as Error)
      throw new Error(`Failed to get CircleCI pipeline workflows: ${(error as Error).message}`)
    }

  async getWorkflow(workflowId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/${workflowId}`, { headers: {
          'Circle-Token': this.accessToken }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get workflow: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getWorkflow', error as Error)
      throw new Error(`Failed to get CircleCI workflow: ${(error as Error).message}`)
    }

  async getWorkflowJobs(workflowId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/${workflowId}/job`, { headers: {
          'Circle-Token': this.accessToken }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get workflow jobs: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getWorkflowJobs', error as Error)
      throw new Error(`Failed to get CircleCI workflow jobs: ${(error as Error).message}`)
    }

  async approveJob(jobId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/${jobId}/approve`, {
        method: 'POST',
        headers: {
          'Circle-Token': this.accessToken
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to approve job: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('approveJob', error as Error)
      throw new Error(`Failed to approve CircleCI job: ${(error as Error).message}`)
    }

  async cancelWorkflow(workflowId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/${workflowId}/cancel`, {
        method: 'POST',
        headers: {
          'Circle-Token': this.accessToken
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to cancel workflow: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('cancelWorkflow', error as Error)
      throw new Error(`Failed to cancel CircleCI workflow: ${(error as Error).message}`)
    }

  async rerunWorkflow(workflowId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workflow/${workflowId}/rerun`, {
        method: 'POST',
        headers: {
          'Circle-Token': this.accessToken
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to rerun workflow: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('rerunWorkflow', error as Error)
      throw new Error(`Failed to rerun CircleCI workflow: ${(error as Error).message}`)
    }

  async getJobArtifacts(jobNumber: number): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/project/gh/owner/repo/${jobNumber}/artifacts`,
        { headers: {
            'Circle-Token': this.accessToken }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get job artifacts: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getJobArtifacts', error as Error)
      throw new Error(`Failed to get CircleCI job artifacts: ${(error as Error).message}`)
    }

  async getEnvironmentVariables(projectSlug: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectSlug}/envvar`, { headers: {
          'Circle-Token': this.accessToken }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get environment variables: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getEnvironmentVariables', error as Error)
      throw new Error(`Failed to get CircleCI environment variables: ${(error as Error).message}`)
    }

  async createEnvironmentVariable(
    projectSlug: string,
    envVar: {
      name: string,
      value: string
    },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/project/${projectSlug}/envvar`, {
        method: 'POST',
        headers: {
          'Circle-Token': this.accessToken,
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
      throw new Error(`Failed to create CircleCI environment variable: ${(error as Error).message}`)
    }

  async deleteEnvironmentVariable(projectSlug: string, envVarName: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/project/${projectSlug}/envvar/${encodeURIComponent(envVarName)}`,
        {
          method: 'DELETE',
          headers: {
            'Circle-Token': this.accessToken
          }
        },
      )
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('deleteEnvironmentVariable', error as Error)
      throw new Error(`Failed to delete CircleCI environment variable: ${(error as Error).message}`)
    }

}