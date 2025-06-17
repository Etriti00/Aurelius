import { Gitlab } from '@gitbeaker/rest'
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

export class GitLabIntegration extends BaseIntegration {
  readonly provider = 'gitlab'
  readonly name = 'GitLab'
  readonly version = '1.0.0'

  private gitlabClient: InstanceType<typeof Gitlab>

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Parse access token to get host and token
    const credentials = this.parseAccessToken(accessToken)

    this.gitlabClient = new Gitlab({
      token: credentials.token,
      host: credentials.host || 'https://gitlab.com'
    })
  }

  private parseAccessToken(token: string): { host?: string; token: string } {
    try {
      // Token format: "host:token" (base64 encoded) or just token
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      if (decoded.includes(':')) {
        const [host, tokenValue] = decoded.split(':')
        return { host, token: tokenValue } else {
        return { token: decoded } catch {
      // Fallback: assume token is already in correct format
      return { token }
      }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.gitlabClient.Users.showCurrentUser()
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // GitLab personal access tokens don't expire by default
        scope: ['api', 'read_user', 'read_repository']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // GitLab personal access tokens don't expire by default
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // GitLab doesn't have a programmatic way to revoke personal access tokens
      // They must be revoked manually in GitLab settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.gitlabClient.Users.showCurrentUser()
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.response?.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.response?.status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 2000,
            remaining: 0
            resetTime: new Date(Date.now() + 60000)
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
        name: 'Projects',
        description: 'Access and manage GitLab projects'
        enabled: true,
        requiredScopes: ['api', 'read_repository']
      },
      {
        name: 'Issues',
        description: 'Create, read, update, and manage project issues',
        enabled: true,
        requiredScopes: ['api']
      },
      {
        name: 'Merge Requests',
        description: 'Manage merge requests and code reviews'
        enabled: true,
        requiredScopes: ['api']
      },
      {
        name: 'Commits',
        description: 'Access commit history and changes'
        enabled: true,
        requiredScopes: ['read_repository']
      },
      {
        name: 'Branches',
        description: 'Manage repository branches'
        enabled: true,
        requiredScopes: ['api']
      },
      {
        name: 'Pipelines',
        description: 'Monitor CI/CD pipelines'
        enabled: true,
        requiredScopes: ['api']
      },
      {
        name: 'Milestones',
        description: 'Manage project milestones'
        enabled: true,
        requiredScopes: ['api']
      },
      {
        name: 'Wiki',
        description: 'Access project wiki pages'
        enabled: true,
        requiredScopes: ['api']
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

      this.logInfo('syncData', 'Starting GitLab sync', { lastSyncTime })

      // Sync Projects
      try {
        const projectsResult = await this.syncProjects()
        totalProcessed += projectsResult.processed,
        totalSkipped += projectsResult.skipped
      }
    } catch (error) {
        errors.push(`Projects sync failed: ${(error as Error).message}`)
        this.logError('syncProjects', error as Error)
      }

      catch (error) {
        console.error('Error in gitlab.integration.ts:', error)
        throw error
      }
      // Sync Issues
      try {
        const issuesResult = await this.syncIssues(lastSyncTime)
        totalProcessed += issuesResult.processed,
        totalSkipped += issuesResult.skipped
      } catch (error) {
        errors.push(`Issues sync failed: ${(error as Error).message}`)
        this.logError('syncIssues', error as Error)
      }

      // Sync Merge Requests
      try {
        const mergeRequestsResult = await this.syncMergeRequests(lastSyncTime)
        totalProcessed += mergeRequestsResult.processed,
        totalSkipped += mergeRequestsResult.skipped
      } catch (error) {
        errors.push(`Merge Requests sync failed: ${(error as Error).message}`)
        this.logError('syncMergeRequests', error as Error)
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
      throw new SyncError('GitLab sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing GitLab webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'Issue Hook':
          await this.handleIssueWebhook(payload.data)
          break
        case 'Merge Request Hook':
          await this.handleMergeRequestWebhook(payload.data)
          break
        case 'Push Hook':
          await this.handlePushWebhook(payload.data)
          break
        case 'Pipeline Hook':
          await this.handlePipelineWebhook(payload.data)
          break
        case 'Release Hook':
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
      console.error('Error in gitlab.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // GitLab webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncProjects(): Promise<{ processed: number; skipped: number }> {
    try {
      const projects = await this.gitlabClient.Projects.all({
        membership: true,
        simple: false
        perPage: 100
      })

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
      console.error('Error in gitlab.integration.ts:', error)
      throw error
    }
  private async syncIssues(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const projects = await this.gitlabClient.Projects.all({
        membership: true,
        perPage: 50
      })

      let processed = 0
      let skipped = 0

      for (const project of projects) {
        try {
          const params: unknown = {,
            projectId: project.id
            state: 'all',
            orderBy: 'updated_at'
            sort: 'desc',
            perPage: 100
          }
      }

          if (lastSyncTime) {
            params.updatedAfter = lastSyncTime.toISOString()
          }

          const issues = await this.gitlabClient.Issues.all(params)

          for (const issue of issues) {
            try {
              await this.processIssue(issue, project),
              processed++
            }
          }
    } catch (error) {
              this.logError('syncIssues', error as Error, { issueId: issue.id })
              skipped++
            }
    } catch (error) {
          this.logError('syncIssues', error as Error, { projectId: project.id })
        }

        catch (error) {
          console.error('Error in gitlab.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncIssues', error as Error),
      throw error
    }

  private async syncMergeRequests(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const projects = await this.gitlabClient.Projects.all({
        membership: true,
        perPage: 50
      })

      let processed = 0
      let skipped = 0

      for (const project of projects) {
        try {
          const params: unknown = {,
            projectId: project.id
            state: 'all',
            orderBy: 'updated_at'
            sort: 'desc',
            perPage: 100
          }
      }

          if (lastSyncTime) {
            params.updatedAfter = lastSyncTime.toISOString()
          }

          const mergeRequests = await this.gitlabClient.MergeRequests.all(params)

          for (const mr of mergeRequests) {
            try {
              await this.processMergeRequest(mr, project),
              processed++
            }
          }
    } catch (error) {
              this.logError('syncMergeRequests', error as Error, { mrId: mr.id })
              skipped++
            }
    } catch (error) {
          this.logError('syncMergeRequests', error as Error, { projectId: project.id })
        }

        catch (error) {
          console.error('Error in gitlab.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncMergeRequests', error as Error),
      throw error
    }

  // Private processing methods
  private async processProject(_project: unknown): Promise<void> {
    this.logInfo('processProject', `Processing project: ${project.id}`)
  }

  private async processIssue(issue: unknown, project: unknown): Promise<void> {
    this.logInfo('processIssue', `Processing issue: ${issue.id}`)
  }

  private async processMergeRequest(mergeRequest: unknown, project: unknown): Promise<void> {
    this.logInfo('processMergeRequest', `Processing merge request: ${mergeRequest.id}`)
  }

  // Private webhook handlers
  private async handleIssueWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleIssueWebhook', 'Processing issue webhook', data)
  }

  private async handleMergeRequestWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleMergeRequestWebhook', 'Processing merge request webhook', data)
  }

  private async handlePushWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePushWebhook', 'Processing push webhook', data)
  }

  private async handlePipelineWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePipelineWebhook', 'Processing pipeline webhook', data)
  }

  private async handleReleaseWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleReleaseWebhook', 'Processing release webhook', data)
  }

  // Public API methods
  async createIssue(
    projectId: number,
    issueData: {
      title: string
      description?: string
      assigneeIds?: number[]
      milestoneId?: number
      labels?: string[],
      dueDate?: Date
    },
  ): Promise<number> {
    try {
      const data: Record<string, unknown> = {
        title: issueData.title
        ...(issueData.description && { description: issueData.description }),
        ...(issueData.assigneeIds && { assigneeIds: issueData.assigneeIds }),
        ...(issueData.milestoneId && { milestoneId: issueData.milestoneId }),
        ...(issueData.labels && { labels: issueData.labels.join(',') }),
        ...(issueData.dueDate && { dueDate: issueData.dueDate.toISOString().split('T')[0] })
      }

      const issue = await this.gitlabClient.Issues.create(projectId, data),
      return issue.iid
    } catch (error) {
      this.logError('createIssue', error as Error)
      throw new Error(`Failed to create GitLab issue: ${(error as Error).message}`)
    }

  async updateIssue(
    projectId: number,
    issueIid: number
    updateData: {
      title?: string
      description?: string
      stateEvent?: 'close' | 'reopen'
      assigneeIds?: number[],
      labels?: string[]
    },
  ): Promise<void> {
    try {
      const data: Record<string, unknown> = {}
      if (updateData.title) data.title = updateData.title
      if (updateData.description !== undefined) data.description = updateData.description
      if (updateData.stateEvent) data.stateEvent = updateData.stateEvent
      if (updateData.assigneeIds) data.assigneeIds = updateData.assigneeIds
      if (updateData.labels) data.labels = updateData.labels.join(',')

      await this.gitlabClient.Issues.edit(projectId, issueIid, data)
    } catch (error) {
      this.logError('updateIssue', error as Error)
      throw new Error(`Failed to update GitLab issue: ${(error as Error).message}`)
    }

  async addComment(projectId: number, issueIid: number, body: string): Promise<number> {
    try {
      const note = await this.gitlabClient.IssueNotes.create(projectId, issueIid, body),
      return note.id
    } catch (error) {
      this.logError('addComment', error as Error)
      throw new Error(`Failed to add comment to GitLab issue: ${(error as Error).message}`)
    }

  async createMergeRequest(
    projectId: number,
    mrData: {
      title: string,
      sourceBranch: string
      targetBranch: string
      description?: string
      assigneeId?: number
      targetProjectId?: number,
      removeSourceBranch?: boolean
    },
  ): Promise<number> {
    try {
      const data: Record<string, unknown> = {
        title: mrData.title,
        sourceBranch: mrData.sourceBranch
        targetBranch: mrData.targetBranch
        ...(mrData.description && { description: mrData.description }),
        ...(mrData.assigneeId && { assigneeId: mrData.assigneeId }),
        ...(mrData.targetProjectId && { targetProjectId: mrData.targetProjectId }),
        ...(mrData.removeSourceBranch !== undefined && { removeSourceBranch: mrData.removeSourceBranch })
      }

      const mr = await this.gitlabClient.MergeRequests.create(
        projectId,
        mrData.sourceBranch,
        mrData.targetBranch,
        mrData.title,
        data,
      ),
      return mr.iid
    } catch (error) {
      this.logError('createMergeRequest', error as Error)
      throw new Error(`Failed to create GitLab merge request: ${(error as Error).message}`)
    }

  async getProject(projectId: number): Promise<ApiResponse> {
    try {
      return await this.gitlabClient.Projects.show(projectId)
    } catch (error) {
      this.logError('getProject', error as Error)
      throw new Error(`Failed to get GitLab project: ${(error as Error).message}`)
    }

  async getIssue(projectId: number, issueIid: number): Promise<ApiResponse> {
    try {
      return await this.gitlabClient.Issues.show(issueIid, { projectId })
    } catch (error) {
      this.logError('getIssue', error as Error)
      throw new Error(`Failed to get GitLab issue: ${(error as Error).message}`)
    }

  async getMergeRequest(projectId: number, mergeRequestIid: number): Promise<ApiResponse> {
    try {
      return await this.gitlabClient.MergeRequests.show(projectId, mergeRequestIid)
    } catch (error) {
      this.logError('getMergeRequest', error as Error)
      throw new Error(`Failed to get GitLab merge request: ${(error as Error).message}`)
    }

  async getCommits(
    projectId: number
    options?: {
      refName?: string
      since?: Date
      until?: Date
      path?: string,
      author?: string
    },
  ): Promise<unknown[]> {
    try {
      const params: unknown = {
        projectId,
        perPage: 100
      }

      if (_options?.refName) params.refName = options.refName
      if (_options?.since) params.since = options.since.toISOString()
      if (_options?.until) params.until = options.until.toISOString()
      if (_options?.path) params.path = options.path
      if (_options?.author) params.author = options.author

      return await this.gitlabClient.Commits.all(params)
    } catch (error) {
      this.logError('getCommits', error as Error)
      throw new Error(`Failed to get GitLab commits: ${(error as Error).message}`)
    }

  async getBranches(projectId: number): Promise<unknown[]> {
    try {
      return await this.gitlabClient.Branches.all(projectId, { perPage: 100 })
    } catch (error) {
      this.logError('getBranches', error as Error)
      throw new Error(`Failed to get GitLab branches: ${(error as Error).message}`)
    }

  async getPipelines(
    projectId: number
    options?: {
      scope?: string[]
      status?: string
      ref?: string,
      yamlErrors?: boolean
    },
  ): Promise<unknown[]> {
    try {
      const params: unknown = {
        projectId,
        perPage: 100
      }

      if (_options?.scope) params.scope = options.scope
      if (_options?.status) params.status = options.status
      if (_options?.ref) params.ref = options.ref
      if (_options?.yamlErrors !== undefined) params.yamlErrors = options.yamlErrors

      return await this.gitlabClient.Pipelines.all(params)
    } catch (error) {
      this.logError('getPipelines', error as Error)
      throw new Error(`Failed to get GitLab pipelines: ${(error as Error).message}`)
    }

  async createMilestone(
    projectId: number,
    milestoneData: {
      title: string
      description?: string
      dueDate?: Date,
      startDate?: Date
    },
  ): Promise<number> {
    try {
      const data: Record<string, unknown> = {
        title: milestoneData.title
        ...(milestoneData.description && { description: milestoneData.description }),
        ...(milestoneData.dueDate && { dueDate: milestoneData.dueDate.toISOString().split('T')[0] }),
        ...(milestoneData.startDate && { startDate: milestoneData.startDate.toISOString().split('T')[0] })
      }

      const milestone = await this.gitlabClient.ProjectMilestones.create(projectId, data),
      return milestone.id
    } catch (error) {
      this.logError('createMilestone', error as Error)
      throw new Error(`Failed to create GitLab milestone: ${(error as Error).message}`)
    }

  async getMilestones(projectId: number): Promise<unknown[]> {
    try {
      return await this.gitlabClient.ProjectMilestones.all(projectId, { perPage: 100 })
    } catch (error) {
      this.logError('getMilestones', error as Error)
      throw new Error(`Failed to get GitLab milestones: ${(error as Error).message}`)
    }

  async searchProjects(
    search: string
    options?: {
      visibility?: 'private' | 'internal' | 'public'
      orderBy?: 'id' | 'name' | 'path' | 'created_at' | 'updated_at' | 'last_activity_at'
      sort?: 'asc' | 'desc',
      simple?: boolean
    },
  ): Promise<unknown[]> {
    try {
      const params: unknown = {
        search,
        perPage: 50
        ...(options?.visibility && { visibility: _options.visibility }),
        ...(options?.orderBy && { orderBy: _options.orderBy }),
        ...(options?.sort && { sort: _options.sort }),
        ...(options?.simple !== undefined && { simple: _options.simple })
      }

      return await this.gitlabClient.Projects.all(params)
    } catch (error) {
      this.logError('searchProjects', error as Error)
      throw new Error(`Failed to search GitLab projects: ${(error as Error).message}`)
    }

  async searchIssues(
    search: string
    options?: {
      projectId?: number
      scope?: 'created_by_me' | 'assigned_to_me' | 'all'
      state?: 'opened' | 'closed' | 'all',
      labels?: string[]
    },
  ): Promise<unknown[]> {
    try {
      const params: unknown = {
        search,
        perPage: 50
        ...(options?.scope && { scope: _options.scope }),
        ...(options?.state && { state: _options.state }),
        ...(options?.labels && { labels: _options.labels.join(',') })
      }

      if (_options?.projectId) {
        return await this.gitlabClient.Issues.all({ projectId: _options.projectId, ...params })
      } else {
        return await this.gitlabClient.Issues.all(params)
      }
    } catch (error) {
      this.logError('searchIssues', error as Error)
      throw new Error(`Failed to search GitLab issues: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in gitlab.integration.ts:', error)
      throw error
    }
}