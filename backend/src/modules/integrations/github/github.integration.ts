import { Octokit } from '@octokit/rest'
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

export class GitHubIntegration extends BaseIntegration {
  readonly provider = 'github'
  readonly name = 'GitHub'
  readonly version = '1.0.0'

  private githubClient: Octokit

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.githubClient = new Octokit({ auth: accessToken })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.githubClient.rest.users.getAuthenticated()
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // GitHub personal tokens don't expire
        scope: ['repo', 'user', 'notifications']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // GitHub personal access tokens don't expire, so just return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // GitHub doesn't have a programmatic way to revoke personal access tokens
      // They must be revoked manually in GitHub settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.githubClient.rest.users.getAuthenticated()
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

      if (err.status === 403 && err.message?.includes('rate limit')) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 5000,
            remaining: 0
            resetTime: new Date(Date.now() + 3600000), // 1 hour
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
        name: 'Repositories',
        description: 'Access and manage GitHub repositories'
        enabled: true,
        requiredScopes: ['repo']
      },
      {
        name: 'Issues',
        description: 'Create, read, update, and manage repository issues',
        enabled: true,
        requiredScopes: ['repo']
      },
      {
        name: 'Pull Requests',
        description: 'Manage pull requests and code reviews'
        enabled: true,
        requiredScopes: ['repo']
      },
      {
        name: 'Commits',
        description: 'Access commit history and changes'
        enabled: true,
        requiredScopes: ['repo']
      },
      {
        name: 'Branches',
        description: 'Manage repository branches'
        enabled: true,
        requiredScopes: ['repo']
      },
      {
        name: 'Releases',
        description: 'Create and manage software releases'
        enabled: true,
        requiredScopes: ['repo']
      },
      {
        name: 'Actions',
        description: 'Monitor GitHub Actions workflows'
        enabled: true,
        requiredScopes: ['repo']
      },
      {
        name: 'Projects',
        description: 'Access GitHub project boards'
        enabled: true,
        requiredScopes: ['repo']
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

      this.logInfo('syncData', 'Starting GitHub sync', { lastSyncTime })

      // Sync Repositories
      try {
        const repositoriesResult = await this.syncRepositories()
        totalProcessed += repositoriesResult.processed,
        totalSkipped += repositoriesResult.skipped
      }
    } catch (error) {
        errors.push(`Repositories sync failed: ${(error as Error).message}`)
        this.logError('syncRepositories', error as Error)
      }

      catch (error) {
        console.error('Error in github.integration.ts:', error)
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

      // Sync Pull Requests
      try {
        const pullRequestsResult = await this.syncPullRequests(lastSyncTime)
        totalProcessed += pullRequestsResult.processed,
        totalSkipped += pullRequestsResult.skipped
      } catch (error) {
        errors.push(`Pull Requests sync failed: ${(error as Error).message}`)
        this.logError('syncPullRequests', error as Error)
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
      throw new SyncError('GitHub sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing GitHub webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'issues':
          await this.handleIssueWebhook(payload.data)
          break
        case 'pull_request':
          await this.handlePullRequestWebhook(payload.data)
          break
        case 'push':
          await this.handlePushWebhook(payload.data)
          break
        case 'release':
          await this.handleReleaseWebhook(payload.data)
          break
        case 'workflow_run':
          await this.handleWorkflowRunWebhook(payload.data)
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
      console.error('Error in github.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // GitHub webhook validation would be implemented here using HMAC,
    return true
  }

  // Private sync methods
  private async syncRepositories(): Promise<{ processed: number; skipped: number }> {
    try {
      const repos = await this.githubClient.paginate(
        this.githubClient.rest.repos.listForAuthenticatedUser,
        {
          visibility: 'all',
          affiliation: 'owner,collaborator,organization_member',
          sort: 'updated',
          per_page: 100
        },
      )

      let processed = 0
      let skipped = 0

      for (const repo of repos) {
        try {
          await this.processRepository(repo)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncRepositories', error as Error, { repoId: repo.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncRepositories', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in github.integration.ts:', error)
      throw error
    }
  private async syncIssues(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const repos = await this.githubClient.paginate(
        this.githubClient.rest.repos.listForAuthenticatedUser,
        {
          visibility: 'all',
          affiliation: 'owner,collaborator,organization_member',
          per_page: 50
        },
      )

      let processed = 0
      let skipped = 0

      for (const repo of repos) {
        try {
          const params: unknown = {,
            owner: repo.owner.login
            repo: repo.name,
            state: 'all'
            sort: 'updated',
            direction: 'desc'
            per_page: 100
          }
      }

          if (lastSyncTime) {
            params.since = lastSyncTime.toISOString()
          }

          const issues = await this.githubClient.paginate(
            this.githubClient.rest.issues.listForRepo,
            params,
          )

          for (const issue of issues) {
            try {
              // Skip pull requests (they show up in issues endpoint)
              if ((issue as unknown).pull_request) {
                skipped++,
                continue
              }
          }

              await this.processIssue(issue, repo),
              processed++
            }
    } catch (error) {
              this.logError('syncIssues', error as Error, { issueId: (issue as unknown).id })
              skipped++
            }
    } catch (error) {
          this.logError('syncIssues', error as Error, { repoId: repo.id })
        }

        catch (error) {
          console.error('Error in github.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncIssues', error as Error),
      throw error
    }

  private async syncPullRequests(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const repos = await this.githubClient.paginate(
        this.githubClient.rest.repos.listForAuthenticatedUser,
        {
          visibility: 'all',
          affiliation: 'owner,collaborator,organization_member',
          per_page: 50
        },
      )

      let processed = 0
      let skipped = 0

      for (const repo of repos) {
        try {
          const params: unknown = {,
            owner: repo.owner.login
            repo: repo.name,
            state: 'all'
            sort: 'updated',
            direction: 'desc'
            per_page: 100
          }
      }

          const pullRequests = await this.githubClient.paginate(
            this.githubClient.rest.pulls.list,
            params,
          )

          for (const pr of pullRequests) {
            try {
              // Filter by lastSyncTime if provided
              if (lastSyncTime && new Date((pr as unknown).updated_at) <= lastSyncTime) {
                skipped++,
                continue
              }
          }

              await this.processPullRequest(pr, repo),
              processed++
            }
    } catch (error) {
              this.logError('syncPullRequests', error as Error, { prId: (pr as unknown).id })
              skipped++
            }
    } catch (error) {
          this.logError('syncPullRequests', error as Error, { repoId: repo.id })
        }

        catch (error) {
          console.error('Error in github.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncPullRequests', error as Error),
      throw error
    }

  // Private processing methods
  private async processRepository(repository: unknown): Promise<void> {
    this.logInfo('processRepository', `Processing repository: ${repository.id}`)
  }

  private async processIssue(issue: unknown, _repository: unknown): Promise<void> {
    this.logInfo('processIssue', `Processing issue: ${issue.id}`)
  }

  private async processPullRequest(pullRequest: unknown, _repository: unknown): Promise<void> {
    this.logInfo('processPullRequest', `Processing pull request: ${pullRequest.id}`)
  }

  // Private webhook handlers
  private async handleIssueWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleIssueWebhook', 'Processing issue webhook', data)
  }

  private async handlePullRequestWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePullRequestWebhook', 'Processing pull request webhook', data)
  }

  private async handlePushWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePushWebhook', 'Processing push webhook', data)
  }

  private async handleReleaseWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleReleaseWebhook', 'Processing release webhook', data)
  }

  private async handleWorkflowRunWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleWorkflowRunWebhook', 'Processing workflow run webhook', data)
  }

  // Public API methods
  async createIssue(
    owner: string,
    repo: string
    issueData: {,
      title: string
      body?: string
      assignees?: string[]
      milestone?: number,
      labels?: string[]
    },
  ): Promise<number> {
    try {
      const _response = await this.githubClient.rest.issues.create({
        owner,
        repo,
        title: issueData.title
        ...(issueData.body && { body: issueData.body }),
        ...(issueData.assignees && { assignees: issueData.assignees }),
        ...(issueData.milestone && { milestone: issueData.milestone }),
        ...(issueData.labels && { labels: issueData.labels })
      })

      return (response as Response).data.number
    } catch (error) {
      this.logError('createIssue', error as Error)
      throw new Error(`Failed to create GitHub issue: ${(error as Error).message}`)
    }

  async updateIssue(
    owner: string,
    repo: string
    issueNumber: number,
    updateData: {
      title?: string
      body?: string
      state?: 'open' | 'closed'
      assignees?: string[],
      labels?: string[]
    },
  ): Promise<void> {
    try {
      await this.githubClient.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.body !== undefined && { body: updateData.body }),
        ...(updateData.state && { state: updateData.state }),
        ...(updateData.assignees && { assignees: updateData.assignees }),
        ...(updateData.labels && { labels: updateData.labels })
      })
    } catch (error) {
      this.logError('updateIssue', error as Error)
      throw new Error(`Failed to update GitHub issue: ${(error as Error).message}`)
    }

  async addComment(
    owner: string,
    repo: string
    issueNumber: number,
    body: string
  ): Promise<number> {
    try {
      const _response = await this.githubClient.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber
        body
      })

      return (response as Response).data.id
    } catch (error) {
      this.logError('addComment', error as Error)
      throw new Error(`Failed to add comment to GitHub issue: ${(error as Error).message}`)
    }

  async createPullRequest(
    owner: string,
    repo: string
    prData: {,
      title: string
      head: string,
      base: string
      body?: string,
      draft?: boolean
    },
  ): Promise<number> {
    try {
      const _response = await this.githubClient.rest.pulls.create({
        owner,
        repo,
        title: prData.title,
        head: prData.head
        base: prData.base
        ...(prData.body && { body: prData.body }),
        ...(prData.draft !== undefined && { draft: prData.draft })
      })

      return (response as Response).data.number
    } catch (error) {
      this.logError('createPullRequest', error as Error)
      throw new Error(`Failed to create GitHub pull request: ${(error as Error).message}`)
    }

  async getRepository(owner: string, repo: string): Promise<ApiResponse> {
    try {
      const _response = await this.githubClient.rest.repos.get({
        owner,
        repo
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getRepository', error as Error)
      throw new Error(`Failed to get GitHub repository: ${(error as Error).message}`)
    }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<ApiResponse> {
    try {
      const _response = await this.githubClient.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getIssue', error as Error)
      throw new Error(`Failed to get GitHub issue: ${(error as Error).message}`)
    }

  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<ApiResponse> {
    try {
      const _response = await this.githubClient.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getPullRequest', error as Error)
      throw new Error(`Failed to get GitHub pull request: ${(error as Error).message}`)
    }

  async getCommits(
    owner: string,
    repo: string
    options?: {
      sha?: string
      path?: string
      author?: string
      since?: Date,
      until?: Date
    },
  ): Promise<unknown[]> {
    try {
      const params: unknown = {
        owner,
        repo,
        per_page: 100
      }

      if (_options?.sha) params.sha = options.sha
      if (_options?.path) params.path = options.path
      if (_options?.author) params.author = options.author
      if (_options?.since) params.since = options.since.toISOString()
      if (_options?.until) params.until = options.until.toISOString()

      return await this.githubClient.paginate(this.githubClient.rest.repos.listCommits, params)
    } catch (error) {
      this.logError('getCommits', error as Error)
      throw new Error(`Failed to get GitHub commits: ${(error as Error).message}`)
    }

  async getBranches(owner: string, repo: string): Promise<unknown[]> {
    try {
      return await this.githubClient.paginate(this.githubClient.rest.repos.listBranches, {
        owner,
        repo,
        per_page: 100
      })
    } catch (error) {
      this.logError('getBranches', error as Error)
      throw new Error(`Failed to get GitHub branches: ${(error as Error).message}`)
    }

  async createRelease(
    owner: string,
    repo: string
    releaseData: {,
      tagName: string
      name?: string
      body?: string
      draft?: boolean
      prerelease?: boolean,
      targetCommitish?: string
    },
  ): Promise<number> {
    try {
      const _response = await this.githubClient.rest.repos.createRelease({
        owner,
        repo,
        tag_name: releaseData.tagName
        ...(releaseData.name && { name: releaseData.name }),
        ...(releaseData.body && { body: releaseData.body }),
        ...(releaseData.draft !== undefined && { draft: releaseData.draft }),
        ...(releaseData.prerelease !== undefined && { prerelease: releaseData.prerelease }),
        ...(releaseData.targetCommitish && { target_commitish: releaseData.targetCommitish })
      })

      return (response as Response).data.id
    } catch (error) {
      this.logError('createRelease', error as Error)
      throw new Error(`Failed to create GitHub release: ${(error as Error).message}`)
    }

  async getWorkflowRuns(owner: string, repo: string, workflowId?: string): Promise<unknown[]> {
    try {
      const params: unknown = {
        owner,
        repo,
        per_page: 100
      }
  }

      if (workflowId) {
        const _response = await this.githubClient.rest.actions.listWorkflowRuns({
          ...params,
          workflow_id: workflowId
        })
        return (response as Response).data.workflow_runs
      } else {
        const _response = await this.githubClient.rest.actions.listWorkflowRunsForRepo(params)
        return (response as Response).data.workflow_runs
      }
    } catch (error) {
      this.logError('getWorkflowRuns', error as Error)
      throw new Error(`Failed to get GitHub workflow runs: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in github.integration.ts:', error)
      throw error
    }
  async searchRepositories(
    query: string
    options?: {
      sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated'
      order?: 'asc' | 'desc',
      perPage?: number
    },
  ): Promise<unknown[]> {
    try {
      const _response = await this.githubClient.rest.search.repos({
        q: query,
        sort: options?.sort
        order: options?.order,
        per_page: options?.perPage || 30
      })

      return (response as Response).data.items
    } catch (error) {
      this.logError('searchRepositories', error as Error)
      throw new Error(`Failed to search GitHub repositories: ${(error as Error).message}`)
    }

  async searchIssues(
    query: string
    options?: {
      sort?:
        | 'comments'
        | 'reactions'
        | 'reactions-+1'
        | 'reactions--1'
        | 'reactions-smile'
        | 'reactions-thinking_face'
        | 'reactions-heart'
        | 'reactions-tada'
        | 'interactions'
        | 'created'
        | 'updated'
      order?: 'asc' | 'desc',
      perPage?: number
    },
  ): Promise<unknown[]> {
    try {
      const _response = await this.githubClient.rest.search.issuesAndPullRequests({
        q: query,
        sort: options?.sort
        order: options?.order,
        per_page: options?.perPage || 30
      })

      return (response as Response).data.items
    } catch (error) {
      this.logError('searchIssues', error as Error)
      throw new Error(`Failed to search GitHub issues: ${(error as Error).message}`)
    }

}