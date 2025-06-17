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
import { AuthenticationError, SyncError } from '../common/integration.error'
import * as crypto from 'crypto'

// Using WebhookPayload from base interface

export class MicrosoftAzureDevOpsIntegration extends BaseIntegration {
  readonly provider = 'microsoft-azure-devops'
  readonly name = 'Microsoft Azure DevOps'
  readonly version = '1.0.0'

  private readonly apiBaseUrl: string
  private readonly organization: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
    this.organization = this.config?.organization || 'organization'
    this.apiBaseUrl = `https://dev.azure.com/${this.organization}`
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/_apis/profile/profiles/me', 'GET')
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: ['vso.work', 'vso.code', 'vso.build', 'vso.release', 'vso.project']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }
  }

      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshTokenValue
          grant_type: 'refresh_token',
          scope: 'https://app.vssps.visualstudio.com/.default'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()

      this.accessToken = tokenData.access_token

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in microsoft-azure-devops.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('No config available for token revocation')
      }
  }

      await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      }),

      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/_apis/profile/profiles/me', 'GET')
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.status === 429) {
        const resetAfter = err.headers?.['retry-after'] || 60
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 5000,
            remaining: 0
            resetTime: new Date(Date.now() + resetAfter * 1000)
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: err.message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Project Management',
        description: 'Manage Azure DevOps projects and teams'
        enabled: true,
        requiredScopes: ['vso.project']
      },
      {
        name: 'Work Item Management',
        description: 'Create, update, and query work items, tasks, bugs, and user stories',
        enabled: true,
        requiredScopes: ['vso.work']
      },
      {
        name: 'Repository Management',
        description: 'Access Git repositories, branches, and commits',
        enabled: true,
        requiredScopes: ['vso.code']
      },
      {
        name: 'Build Pipeline Management',
        description: 'Monitor, queue, and manage build pipelines',
        enabled: true,
        requiredScopes: ['vso.build']
      },
      {
        name: 'Release Pipeline Management',
        description: 'Monitor and manage release pipelines and deployments'
        enabled: true,
        requiredScopes: ['vso.release']
      },
    ]
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const capabilities = this.getCapabilities()
    const allRequiredScopes = capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []
  }

      this.logInfo('syncData', 'Starting Azure DevOps sync', { lastSyncTime })

      try {
        const projectsResult = await this.syncProjects()
        totalProcessed += projectsResult.processed,
        totalSkipped += projectsResult.skipped
      }
    } catch (error) {
        errors.push(`Projects sync failed: ${(error as Error).message}`)
        this.logError('syncProjects', error as Error)
      }

      try {
        const workItemsResult = await this.syncWorkItems(lastSyncTime)
        totalProcessed += workItemsResult.processed,
        totalSkipped += workItemsResult.skipped
      }
    } catch (error) {
        errors.push(`Work items sync failed: ${(error as Error).message}`)
        this.logError('syncWorkItems', error as Error)
      }

      try {
        const repositoriesResult = await this.syncRepositories()
        totalProcessed += repositoriesResult.processed,
        totalSkipped += repositoriesResult.skipped
      }
    } catch (error) {
        errors.push(`Repositories sync failed: ${(error as Error).message}`)
        this.logError('syncRepositories', error as Error)
      }

      try {
        const pullRequestsResult = await this.syncPullRequests(lastSyncTime)
        totalProcessed += pullRequestsResult.processed,
        totalSkipped += pullRequestsResult.skipped
      }
    } catch (error) {
        errors.push(`Pull requests sync failed: ${(error as Error).message}`)
        this.logError('syncPullRequests', error as Error)
      }

      try {
        const buildsResult = await this.syncBuilds(lastSyncTime)
        totalProcessed += buildsResult.processed,
        totalSkipped += buildsResult.skipped
      }
    } catch (error) {
        errors.push(`Builds sync failed: ${(error as Error).message}`)
        this.logError('syncBuilds', error as Error)
      }

      catch (error) {
        console.error('Error in microsoft-azure-devops.integration.ts:', error)
        throw error
      }
      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider,
          organization: this.organization
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Azure DevOps sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Azure DevOps webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'workitem.created':
        case 'workitem.updated':
        case 'workitem.deleted':
        case 'workitem.commented':
          await this.handleWorkItemWebhook(payload.data)
          break
        case 'git.push':
        case 'git.pullrequest.created':
        case 'git.pullrequest.updated':
        case 'git.pullrequest.merged':
          await this.handleGitWebhook(payload.data)
          break
        case 'build.complete':
        case 'build.queue':
          await this.handleBuildWebhook(payload.data)
          break
        case 'release.deployment.started':
        case 'release.deployment.completed':
        case 'release.deployment.approval.pending':
          await this.handleReleaseWebhook(payload.data)
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
      console.error('Error in microsoft-azure-devops.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      if (!this.config?.webhookSecret) {
        this.logError('validateWebhookSignature', new Error('No webhook secret configured'))
        return false
      }
  }

      // Azure DevOps webhook signature validation using SHA1
      const expectedSignature = crypto
        .createHmac('sha1', this.config.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature.replace('sha1=', ''), 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      )
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // Private sync methods
  private async syncProjects(): Promise<{ processed: number; skipped: number }> {
    try {
      const projects = await this.executeWithProtection('sync.projects', async () => {
        return this.makeApiCall('/_apis/projects', 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const project of projects.value || []) {
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
      console.error('Error in microsoft-azure-devops.integration.ts:', error)
      throw error
    }
  private async syncWorkItems(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      // Get all projects first
      const projects = await this.getProjects()
      let totalProcessed = 0
      let totalSkipped = 0

      for (const project of projects) {
        try {
          let query =
            'SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.CreatedDate], [System.ChangedDate] FROM WorkItems'
      }

          if (lastSyncTime) {
            query += ` WHERE [System.ChangedDate] > '${lastSyncTime.toISOString()}'`
          }

          const workItemsQuery = await this.executeWithProtection(
            'sync.work_items_query',
            async () => {
              return this.makeApiCall(`/${project.id}/_apis/wit/wiql`, 'POST', { query })
            },
          )

          const workItemIds = workItemsQuery.workItems?.map((wi: unknown) => wi.id) || []

          if (workItemIds.length > 0) {
            // Batch get work item details (max 200 at a time)
            const batchSize = 200
            for (let i = 0; i < workItemIds.length; i += batchSize) {
              const batch = workItemIds.slice(i, i + batchSize)
          }
            }

              try {
                const workItems = await this.executeWithProtection(
                  'sync.work_items_batch',
                  async () => {
                    return this.makeApiCall(
                      `/_apis/wit/workitems?ids=${batch.join(',')}&$expand=all`,
                      'GET',
                    )
                  },
                )

                for (const workItem of workItems.value || []) {
                  try {
                    if (lastSyncTime && workItem.fields?.['System.ChangedDate']) {
                      const changedDate = new Date(workItem.fields['System.ChangedDate'])
                      if (changedDate <= lastSyncTime) {
                        totalSkipped++,
                        continue
                      }
                }
                    }

                    await this.processWorkItem(workItem)
                    totalProcessed++
                  }
    } catch (error) {
                    this.logError('syncWorkItems', error as Error, { workItemId: workItem.id })
                    totalSkipped++
                  }
    } catch (error) {
                this.logError('syncWorkItems', error as Error, { batch })
                totalSkipped += batch.length
              }
    } catch (error) {
          this.logError('syncWorkItems', error as Error, { projectId: project.id })
        }

        catch (error) {
          console.error('Error in microsoft-azure-devops.integration.ts:', error)
          throw error
        }
      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncWorkItems', error as Error),
      throw error
    }

  private async syncRepositories(): Promise<{ processed: number; skipped: number }> {
    try {
      const repositories = await this.executeWithProtection('sync.repositories', async () => {
        return this.makeApiCall('/_apis/git/repositories', 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const repository of repositories.value || []) {
        try {
          await this.processRepository(repository)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncRepositories', error as Error, { repositoryId: repository.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncRepositories', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-azure-devops.integration.ts:', error)
      throw error
    }
  private async syncPullRequests(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const repositories = await this.getRepositories()
      let totalProcessed = 0
      let totalSkipped = 0

      for (const repository of repositories) {
        try {
          const queryParams = '?searchCriteria.status=all&$top=100'
          if (lastSyncTime) {
            // Note: Azure DevOps doesn't have a direct lastUpdated filter for PRs
            // We'll need to filter after fetching
          }
      }

          const pullRequests = await this.executeWithProtection('sync.pull_requests', async () => {
            return this.makeApiCall(
              `/_apis/git/repositories/${repository.id}/pullrequests${queryParams}`,
              'GET',
            )
          })

          for (const pr of pullRequests.value || []) {
            try {
              if (lastSyncTime && pr.lastMergeCommit?.date) {
                const lastUpdate = new Date(pr.lastMergeCommit.date)
                if (lastUpdate <= lastSyncTime) {
                  totalSkipped++,
                  continue
                }
          }
              }

              await this.processPullRequest(pr)
              totalProcessed++
            }
    } catch (error) {
              this.logError('syncPullRequests', error as Error, { pullRequestId: pr.pullRequestId })
              totalSkipped++
            }
    } catch (error) {
          this.logError('syncPullRequests', error as Error, { repositoryId: repository.id })
        }

      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncPullRequests', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-azure-devops.integration.ts:', error)
      throw error
    }
  private async syncBuilds(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const projects = await this.getProjects()
      let totalProcessed = 0
      let totalSkipped = 0

      for (const project of projects) {
        try {
          let queryParams = '?$top=100'
          if (lastSyncTime) {
            queryParams += `&minTime=${lastSyncTime.toISOString()}`
          }
      }

          const builds = await this.executeWithProtection('sync.builds', async () => {
            return this.makeApiCall(`/${project.id}/_apis/build/builds${queryParams}`, 'GET')
          })

          for (const build of builds.value || []) {
            try {
              if (lastSyncTime && build.queueTime) {
                const queueTime = new Date(build.queueTime)
                if (queueTime <= lastSyncTime) {
                  totalSkipped++,
                  continue
                }
          }
              }

              await this.processBuild(build)
              totalProcessed++
            }
    } catch (error) {
              this.logError('syncBuilds', error as Error, { buildId: build.id })
              totalSkipped++
            }
    } catch (error) {
          this.logError('syncBuilds', error as Error, { projectId: project.id })
        }

      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncBuilds', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-azure-devops.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processProject(_project: unknown): Promise<void> {
    this.logInfo('processProject', `Processing project: ${project.name}`, {
      projectId: project.id,
      name: project.name
      description: project.description,
      state: project.state
      visibility: project.visibility,
      lastUpdateTime: project.lastUpdateTime
    })
  }

  private async processWorkItem(workItem: unknown): Promise<void> {
    this.logInfo('processWorkItem', `Processing work item: ${workItem.fields?.['System.Title']}`, {
      workItemId: workItem.id,
      title: workItem.fields?.['System.Title']
      workItemType: workItem.fields?.['System.WorkItemType'],
      state: workItem.fields?.['System.State']
      assignedTo: workItem.fields?.['System.AssignedTo']?.displayName,
      priority: workItem.fields?.['Microsoft.VSTS.Common.Priority']
      createdDate: workItem.fields?.['System.CreatedDate'],
      changedDate: workItem.fields?.['System.ChangedDate']
    })
  }

  private async processRepository(repository: unknown): Promise<void> {
    this.logInfo('processRepository', `Processing repository: ${repository.name}`, {
      repositoryId: repository.id,
      name: repository.name
      url: repository.url,
      sshUrl: repository.sshUrl
      size: repository.size,
      project: repository.project?.name
      isDisabled: repository.isDisabled
    })
  }

  private async processPullRequest(pullRequest: unknown): Promise<void> {
    this.logInfo('processPullRequest', `Processing pull request: ${pullRequest.title}`, {
      pullRequestId: pullRequest.pullRequestId,
      title: pullRequest.title
      status: pullRequest.status,
      createdBy: pullRequest.createdBy?.displayName
      creationDate: pullRequest.creationDate,
      sourceRefName: pullRequest.sourceRefName
      targetRefName: pullRequest.targetRefName,
      repository: pullRequest.repository?.name
    })
  }

  private async processBuild(build: unknown): Promise<void> {
    this.logInfo('processBuild', `Processing build: ${build.buildNumber}`, {
      buildId: build.id,
      buildNumber: build.buildNumber
      status: build.status,
      result: build.result
      queueTime: build.queueTime,
      startTime: build.startTime
      finishTime: build.finishTime,
      definition: build.definition?.name
      project: build.project?.name
    })
  }

  // Private webhook handlers
  private async handleWorkItemWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleWorkItemWebhook', 'Processing work item webhook', data)
  }

  private async handleGitWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleGitWebhook', 'Processing git webhook', data)
  }

  private async handleBuildWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleBuildWebhook', 'Processing build webhook', data)
  }

  private async handleReleaseWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleReleaseWebhook', 'Processing release webhook', data)
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
  ): Promise<ApiResponse> {
    const url = `${this.apiBaseUrl}${endpoint}?api-version=7.0`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Azure DevOps API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    return (response as Response).json()
  }

  // Public API methods
  async getMe(): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_me', async () => {
        return this.makeApiCall('/_apis/profile/profiles/me', 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getMe', error as Error)
      throw new Error(`Failed to get user profile: ${(error as Error).message}`)
    }

  async getProjects(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_projects', async () => {
        return this.makeApiCall('/_apis/projects', 'GET')
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get projects: ${(error as Error).message}`)
    }

  async getProject(projectId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_project', async () => {
        return this.makeApiCall(`/_apis/projects/${projectId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getProject', error as Error)
      throw new Error(`Failed to get project: ${(error as Error).message}`)
    }

  async getWorkItems(projectId: string, workItemIds: number[]): Promise<unknown[]> {
    try {
      if (workItemIds.length === 0) return []
  }

      const _response = await this.executeWithProtection('api.get_work_items', async () => {
        return this.makeApiCall(
          `/_apis/wit/workitems?ids=${workItemIds.join(',')}&$expand=all`,
          'GET',
        )
      })

      return (response as Response).value || []
    } catch (error) {
      this.logError('getWorkItems', error as Error)
      throw new Error(`Failed to get work items: ${(error as Error).message}`)
    }

  async queryWorkItems(projectId: string, wiql: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.query_work_items', async () => {
        return this.makeApiCall(`/${projectId}/_apis/wit/wiql`, 'POST', { query: wiql })
      })
  }

      return response
    } catch (error) {
      this.logError('queryWorkItems', error as Error)
      throw new Error(`Failed to query work items: ${(error as Error).message}`)
    }

  async createWorkItem(
    projectId: string,
    workItemType: string
    fields: Record<string, unknown>,
  ): Promise<ApiResponse> {
    try {
      // Convert fields to JSON Patch format
      const patchDocument = Object.entries(fields).map(([field, value]) => ({
        op: 'add',
        path: `/fields/${field}`,
        value
      }))

      const _response = await this.executeWithProtection('api.create_work_item', async () => {
        return this.makeApiCall(
          `/${projectId}/_apis/wit/workitems/$${workItemType}`,
          'POST',
          patchDocument,
        )
      }),

      return response
    } catch (error) {
      this.logError('createWorkItem', error as Error)
      throw new Error(`Failed to create work item: ${(error as Error).message}`)
    }

  async updateWorkItem(workItemId: number, fields: Record<string, unknown>): Promise<ApiResponse> {
    try {
      // Convert fields to JSON Patch format
      const patchDocument = Object.entries(fields).map(([field, value]) => ({
        op: 'replace',
        path: `/fields/${field}`,
        value
      }))
  }

      const _response = await this.executeWithProtection('api.update_work_item', async () => {
        return this.makeApiCall(`/_apis/wit/workitems/${workItemId}`, 'PATCH', patchDocument)
      }),

      return response
    } catch (error) {
      this.logError('updateWorkItem', error as Error)
      throw new Error(`Failed to update work item: ${(error as Error).message}`)
    }

  async getRepositories(projectId?: string): Promise<unknown[]> {
    try {
      const endpoint = projectId
        ? `/${projectId}/_apis/git/repositories`
        : '/_apis/git/repositories'
  }

      const _response = await this.executeWithProtection('api.get_repositories', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return (response as Response).value || []
    } catch (error) {
      this.logError('getRepositories', error as Error)
      throw new Error(`Failed to get repositories: ${(error as Error).message}`)
    }

  async getRepository(repositoryId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_repository', async () => {
        return this.makeApiCall(`/_apis/git/repositories/${repositoryId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getRepository', error as Error)
      throw new Error(`Failed to get repository: ${(error as Error).message}`)
    }

  async getPullRequests(
    repositoryId: string
    status?: 'active' | 'completed' | 'abandoned' | 'all',
  ): Promise<unknown[]> {
    try {
      const queryParams = status ? `?searchCriteria.status=${status}` : ''

      const _response = await this.executeWithProtection('api.get_pull_requests', async () => {
        return this.makeApiCall(
          `/_apis/git/repositories/${repositoryId}/pullrequests${queryParams}`,
          'GET',
        )
      })

      return (response as Response).value || []
    } catch (error) {
      this.logError('getPullRequests', error as Error)
      throw new Error(`Failed to get pull requests: ${(error as Error).message}`)
    }

  async createPullRequest(
    repositoryId: string,
    pullRequestData: {
      title: string
      description?: string
      sourceRefName: string,
      targetRefName: string
      reviewers?: Array<{ id: string }>
    },
  ): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.create_pull_request', async () => {
        return this.makeApiCall(
          `/_apis/git/repositories/${repositoryId}/pullrequests`,
          'POST',
          pullRequestData,
        )
      }),

      return response
    } catch (error) {
      this.logError('createPullRequest', error as Error)
      throw new Error(`Failed to create pull request: ${(error as Error).message}`)
    }

  async getBuilds(projectId: string, definitionId?: number, status?: string): Promise<unknown[]> {
    try {
      const queryParams = new URLSearchParams()
      if (definitionId) queryParams.append('definitions', definitionId.toString())
      if (status) queryParams.append('statusFilter', status)
  }

      const _response = await this.executeWithProtection('api.get_builds', async () => {
        return this.makeApiCall(`/${projectId}/_apis/build/builds?${queryParams.toString()}`, 'GET')
      })

      return (response as Response).value || []
    } catch (error) {
      this.logError('getBuilds', error as Error)
      throw new Error(`Failed to get builds: ${(error as Error).message}`)
    }

  async getBuild(projectId: string, buildId: number): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_build', async () => {
        return this.makeApiCall(`/${projectId}/_apis/build/builds/${buildId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getBuild', error as Error)
      throw new Error(`Failed to get build: ${(error as Error).message}`)
    }

  async queueBuild(
    projectId: string,
    definitionId: number
    parameters?: Record<string, string>,
  ): Promise<ApiResponse> {
    try {
      const buildRequest: unknown = {,
        definition: { id: definitionId }
      }

      if (parameters) {
        buildRequest.parameters = JSON.stringify(parameters)
      }

      const _response = await this.executeWithProtection('api.queue_build', async () => {
        return this.makeApiCall(`/${projectId}/_apis/build/builds`, 'POST', buildRequest)
      }),

      return response
    } catch (error) {
      this.logError('queueBuild', error as Error)
      throw new Error(`Failed to queue build: ${(error as Error).message}`)
    }

  async getReleases(projectId: string, definitionId?: number): Promise<unknown[]> {
    try {
      const queryParams = definitionId ? `?definitionId=${definitionId}` : ''
  }

      const _response = await this.executeWithProtection('api.get_releases', async () => {
        return this.makeApiCall(`/${projectId}/_apis/release/releases${queryParams}`, 'GET')
      })

      return (response as Response).value || []
    } catch (error) {
      this.logError('getReleases', error as Error)
      throw new Error(`Failed to get releases: ${(error as Error).message}`)
    }

  async createRelease(
    projectId: string,
    releaseData: { definitionId: number; description?: string; artifacts?: unknown[] },
  ): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.create_release', async () => {
        return this.makeApiCall(`/${projectId}/_apis/release/releases`, 'POST', releaseData)
      }),

      return response
    } catch (error) {
      this.logError('createRelease', error as Error)
      throw new Error(`Failed to create release: ${(error as Error).message}`)
    }

}