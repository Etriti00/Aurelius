import axios, { AxiosInstance } from 'axios'
import rateLimit from 'axios-rate-limit'
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

export class BitbucketIntegration extends BaseIntegration {
  readonly provider = 'bitbucket'
  readonly name = 'Bitbucket'
  readonly version = '1.0.0'

  private bitbucketClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Create rate-limited axios client
    this.bitbucketClient = rateLimit(
      axios.create({
        baseURL: 'https://api.bitbucket.org/2.0',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }),
      {
        maxRequests: 1000,
        perMilliseconds: 3600000, // 1000 requests per hour
      },
    )
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.bitbucketClient.get('/user')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Will be set based on token response
        scope: ['repository', 'account']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config?.clientId || !this.config?.clientSecret) {
        return this.authenticate()
      }
  }

      const _response = await axios.post(
        'https://bitbucket.org/site/oauth2/access_token',
        {
          grant_type: 'refresh_token',
          refresh_token: this.refreshTokenValue
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        },
        { headers: {
            'Content-Type': 'application/x-www-form-urlencoded' }
        },
      )

      return {
        success: true,
        accessToken: response.data.access_token
        refreshToken: response.data.refresh_token || this.refreshTokenValue,
        expiresAt: response.data.expires_in
          ? new Date(Date.now() + response.data.expires_in * 1000)
          : undefined,
        scope: response.data.scopes?.split(' ') || ['repository', 'account']
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      // Bitbucket doesn't have a direct API to revoke access tokens
      // They expire naturally or can be revoked in Bitbucket settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.bitbucketClient.get('/user')
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
            limit: 1000,
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
        description: 'Access and manage Bitbucket repositories'
        enabled: true,
        requiredScopes: ['repository']
      },
      {
        name: 'Issues',
        description: 'Create, read, update, and manage repository issues',
        enabled: true,
        requiredScopes: ['repository']
      },
      {
        name: 'Pull Requests',
        description: 'Manage pull requests and code reviews'
        enabled: true,
        requiredScopes: ['repository']
      },
      {
        name: 'Commits',
        description: 'Access commit history and changes'
        enabled: true,
        requiredScopes: ['repository']
      },
      {
        name: 'Branches',
        description: 'Manage repository branches'
        enabled: true,
        requiredScopes: ['repository']
      },
      {
        name: 'Pipelines',
        description: 'Monitor Bitbucket Pipelines'
        enabled: true,
        requiredScopes: ['repository']
      },
      {
        name: 'Deployments',
        description: 'Track deployment information'
        enabled: true,
        requiredScopes: ['repository']
      },
      {
        name: 'Snippets',
        description: 'Manage code snippets'
        enabled: true,
        requiredScopes: ['repository']
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

      this.logInfo('syncData', 'Starting Bitbucket sync', { lastSyncTime })

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
        console.error('Error in bitbucket.integration.ts:', error)
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
      throw new SyncError('Bitbucket sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Bitbucket webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'repo:push':
          await this.handlePushWebhook(payload.data)
          break
        case 'issue:created':
        case 'issue:updated':
          await this.handleIssueWebhook(payload.data)
          break
        case 'pullrequest:created':
        case 'pullrequest:updated':
        case 'pullrequest:approved':
        case 'pullrequest:unapproved':
          await this.handlePullRequestWebhook(payload.data)
          break
        case 'repo:commit_status_created':
        case 'repo:commit_status_updated':
          await this.handleCommitStatusWebhook(payload.data)
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
      console.error('Error in bitbucket.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Bitbucket webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncRepositories(): Promise<{ processed: number; skipped: number }> {
    try {
      let url = '/repositories?role=member&pagelen=100'
      let processed = 0
      let skipped = 0

      while (url) {
        const _response = await this.bitbucketClient.get(url)
        const repositories = response.data.values || []
      }

        for (const repo of repositories) {
          try {
            await this.processRepository(repo)
            processed++
          }
        }
    } catch (error) {
            this.logError('syncRepositories', error as Error, { repoUuid: repo.uuid })
            skipped++
          }

        url = response.data.next
          ? new URL(response.data.next).pathname + new URL(response.data.next).search
          : null
      }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncRepositories', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in bitbucket.integration.ts:', error)
      throw error
    }
  private async syncIssues(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const reposResponse = await this.bitbucketClient.get('/repositories?role=member&pagelen=50')
      const repositories = reposResponse.data.values || []

      let processed = 0
      let skipped = 0

      for (const repo of repositories) {
        try {
          let url = `/repositories/${repo.full_name}/issues?pagelen=100&sort=-updated_on`
      }

          while (url) {
            const _response = await this.bitbucketClient.get(url)
            const issues = response.data.values || []
          }

            for (const issue of issues) {
              try {
                // Filter by lastSyncTime if provided
                if (lastSyncTime && new Date(issue.updated_on) <= lastSyncTime) {
                  skipped++,
                  continue
                }
            }

                await this.processIssue(issue, repo),
                processed++
              }
    } catch (error) {
                this.logError('syncIssues', error as Error, { issueId: issue.id })
                skipped++
              }

            url = response.data.next
              ? new URL(response.data.next).pathname + new URL(response.data.next).search
              : null
          }
    } catch (error) {
          this.logError('syncIssues', error as Error, { repoFullName: repo.full_name })
        }

        catch (error) {
          console.error('Error in bitbucket.integration.ts:', error)
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
      const reposResponse = await this.bitbucketClient.get('/repositories?role=member&pagelen=50')
      const repositories = reposResponse.data.values || []

      let processed = 0
      let skipped = 0

      for (const repo of repositories) {
        try {
          let url = `/repositories/${repo.full_name}/pullrequests?pagelen=100&sort=-updated_on`
      }

          while (url) {
            const _response = await this.bitbucketClient.get(url)
            const pullRequests = response.data.values || []
          }

            for (const pr of pullRequests) {
              try {
                // Filter by lastSyncTime if provided
                if (lastSyncTime && new Date(pr.updated_on) <= lastSyncTime) {
                  skipped++,
                  continue
                }
            }

                await this.processPullRequest(pr, repo),
                processed++
              }
    } catch (error) {
                this.logError('syncPullRequests', error as Error, { prId: pr.id })
                skipped++
              }

            url = response.data.next
              ? new URL(response.data.next).pathname + new URL(response.data.next).search
              : null
          }
    } catch (error) {
          this.logError('syncPullRequests', error as Error, { repoFullName: repo.full_name })
        }

        catch (error) {
          console.error('Error in bitbucket.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncPullRequests', error as Error),
      throw error
    }

  // Private processing methods
  private async processRepository(repository: unknown): Promise<void> {
    this.logInfo('processRepository', `Processing repository: ${repository.uuid}`)
  }

  private async processIssue(issue: unknown, _repository: unknown): Promise<void> {
    this.logInfo('processIssue', `Processing issue: ${issue.id}`)
  }

  private async processPullRequest(pullRequest: unknown, _repository: unknown): Promise<void> {
    this.logInfo('processPullRequest', `Processing pull request: ${pullRequest.id}`)
  }

  // Private webhook handlers
  private async handlePushWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePushWebhook', 'Processing push webhook', data)
  }

  private async handleIssueWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleIssueWebhook', 'Processing issue webhook', data)
  }

  private async handlePullRequestWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePullRequestWebhook', 'Processing pull request webhook', data)
  }

  private async handleCommitStatusWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleCommitStatusWebhook', 'Processing commit status webhook', data)
  }

  // Public API methods
  async createIssue(
    workspace: string,
    repoSlug: string
    issueData: {,
      title: string
      content?: {
        raw: string
        markup?: string
      }
      priority?: string
      kind?: string
      assignee?: {
        username: string
      },
  ): Promise<number> {
    try {
      const _response = await this.bitbucketClient.post(
        `/repositories/${workspace}/${repoSlug}/issues`,
        issueData,
      )
      return (response as Response).data.id
    } catch (error) {
      this.logError('createIssue', error as Error)
      throw new Error(`Failed to create Bitbucket issue: ${(error as Error).message}`)
    }

  async updateIssue(
    workspace: string,
    repoSlug: string
    issueId: number,
    updateData: {
      title?: string
      content?: {
        raw: string
        markup?: string
      }
      state?: string
      priority?: string
      assignee?: {
        username: string
      },
  ): Promise<void> {
    try {
      await this.bitbucketClient.put(
        `/repositories/${workspace}/${repoSlug}/issues/${issueId}`,
        updateData,
      )
    } catch (error) {
      this.logError('updateIssue', error as Error)
      throw new Error(`Failed to update Bitbucket issue: ${(error as Error).message}`)
    }

  async addComment(
    workspace: string,
    repoSlug: string
    issueId: number,
    content: {
      raw: string
      markup?: string
    },
  ): Promise<number> {
    try {
      const _response = await this.bitbucketClient.post(
        `/repositories/${workspace}/${repoSlug}/issues/${issueId}/comments`,
        { content },
      )
      return (response as Response).data.id
    } catch (error) {
      this.logError('addComment', error as Error)
      throw new Error(`Failed to add comment to Bitbucket issue: ${(error as Error).message}`)
    }

  async createPullRequest(
    workspace: string,
    repoSlug: string
    prData: {,
      title: string
      source: {,
        branch: {
          name: string
        },
    destination: {,
        branch: {
          name: string
        }
      description?: string
      reviewers?: Array<{
        username: string
      }>,
      closeSourceBranch?: boolean
    },
  ): Promise<number> {
    try {
      const _response = await this.bitbucketClient.post(
        `/repositories/${workspace}/${repoSlug}/pullrequests`,
        prData,
      )
      return (response as Response).data.id
    } catch (error) {
      this.logError('createPullRequest', error as Error)
      throw new Error(`Failed to create Bitbucket pull request: ${(error as Error).message}`)
    }

  async getRepository(workspace: string, repoSlug: string): Promise<ApiResponse> {
    try {
      const _response = await this.bitbucketClient.get(`/repositories/${workspace}/${repoSlug}`)
      return (response as Response).data
    } catch (error) {
      this.logError('getRepository', error as Error)
      throw new Error(`Failed to get Bitbucket repository: ${(error as Error).message}`)
    }

  async getIssue(workspace: string, repoSlug: string, issueId: number): Promise<ApiResponse> {
    try {
      const _response = await this.bitbucketClient.get(
        `/repositories/${workspace}/${repoSlug}/issues/${issueId}`,
      )
      return (response as Response).data
    } catch (error) {
      this.logError('getIssue', error as Error)
      throw new Error(`Failed to get Bitbucket issue: ${(error as Error).message}`)
    }

  async getPullRequest(workspace: string, repoSlug: string, prId: number): Promise<ApiResponse> {
    try {
      const _response = await this.bitbucketClient.get(
        `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`,
      )
      return (response as Response).data
    } catch (error) {
      this.logError('getPullRequest', error as Error)
      throw new Error(`Failed to get Bitbucket pull request: ${(error as Error).message}`)
    }

  async getCommits(
    workspace: string,
    repoSlug: string
    options?: {
      include?: string
      exclude?: string,
      pagelen?: number
    },
  ): Promise<unknown[]> {
    try {
      let url = `/repositories/${workspace}/${repoSlug}/commits?pagelen=${options?.pagelen || 100}`
      if (_options?.include) url += `&include=${options.include}`
      if (_options?.exclude) url += `&exclude=${options.exclude}`

      const commits = []
      while (url) {
        const _response = await this.bitbucketClient.get(url)
        commits.push(...(response.data.values || []))
        url = response.data.next
          ? new URL(response.data.next).pathname + new URL(response.data.next).search
          : null
      }
      },

      return commits
    } catch (error) {
      this.logError('getCommits', error as Error)
      throw new Error(`Failed to get Bitbucket commits: ${(error as Error).message}`)
    }

  async getBranches(workspace: string, repoSlug: string): Promise<unknown[]> {
    try {
      let url = `/repositories/${workspace}/${repoSlug}/refs/branches?pagelen=100`
      const branches = []
  }

      while (url) {
        const _response = await this.bitbucketClient.get(url)
        branches.push(...(response.data.values || []))
        url = response.data.next
          ? new URL(response.data.next).pathname + new URL(response.data.next).search
          : null
      }
      },

      return branches
    } catch (error) {
      this.logError('getBranches', error as Error)
      throw new Error(`Failed to get Bitbucket branches: ${(error as Error).message}`)
    }

  async getPipelines(workspace: string, repoSlug: string): Promise<unknown[]> {
    try {
      let url = `/repositories/${workspace}/${repoSlug}/pipelines?pagelen=100&sort=-created_on`
      const pipelines = []
  }

      while (url) {
        const _response = await this.bitbucketClient.get(url)
        pipelines.push(...(response.data.values || []))
        url = response.data.next
          ? new URL(response.data.next).pathname + new URL(response.data.next).search
          : null
      }
      },

      return pipelines
    } catch (error) {
      this.logError('getPipelines', error as Error)
      throw new Error(`Failed to get Bitbucket pipelines: ${(error as Error).message}`)
    }

  async getDeployments(workspace: string, repoSlug: string): Promise<unknown[]> {
    try {
      let url = `/repositories/${workspace}/${repoSlug}/deployments?pagelen=100`
      const deployments = []
  }

      while (url) {
        const _response = await this.bitbucketClient.get(url)
        deployments.push(...(response.data.values || []))
        url = response.data.next
          ? new URL(response.data.next).pathname + new URL(response.data.next).search
          : null
      }
      },

      return deployments
    } catch (error) {
      this.logError('getDeployments', error as Error)
      throw new Error(`Failed to get Bitbucket deployments: ${(error as Error).message}`)
    }

  async searchRepositories(query: string): Promise<unknown[]> {
    try {
      const _response = await this.bitbucketClient.get(
        `/repositories?q=${encodeURIComponent(query)}&pagelen=50`,
      )
      return (response as Response).data.values || []
    } catch (error) {
      this.logError('searchRepositories', error as Error)
      throw new Error(`Failed to search Bitbucket repositories: ${(error as Error).message}`)
    }

  async getWorkspaces(): Promise<unknown[]> {
    try {
      let url = '/workspaces?pagelen=100'
      const workspaces = []
  }

      while (url) {
        const _response = await this.bitbucketClient.get(url)
        workspaces.push(...(response.data.values || []))
        url = response.data.next
          ? new URL(response.data.next).pathname + new URL(response.data.next).search
          : null
      }
      },

      return workspaces
    } catch (error) {
      this.logError('getWorkspaces', error as Error)
      throw new Error(`Failed to get Bitbucket workspaces: ${(error as Error).message}`)
    }

}