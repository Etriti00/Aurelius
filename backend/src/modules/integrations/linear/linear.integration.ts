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

interface LinearWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface LinearUser {
  id: string,
  name: string
  displayName: string,
  email: string
  avatarUrl?: string
  admin: boolean,
  active: boolean
  createdAt: string,
  updatedAt: string
  timezone?: string
  locale?: string
}

interface LinearTeam {
  id: string,
  name: string
  key: string
  description?: string
  icon?: string
  color?: string
  private: boolean,
  issueEstimationType: 'notUsed' | 'exponential' | 'fibonacci' | 'linear' | 'tShirt'
  issueOrderingNoPriorityFirst: boolean,
  issueEstimationAllowZero: boolean
  issueEstimationExtended: boolean
  defaultIssueEstimate?: number
  cycleDuration: number,
  cycleStartDay: number
  cycleCalendarUrl?: string
  upcomingCycleCount: number
  cycleEnabledStartWeek?: string
  cycleLockToActive: boolean,
  cycleCooldownTime: number
  autoArchivePeriod: number
  autoCloseStateId?: string
  autoCloseStatePeriod: number,
  organization: {
    id: string,
    name: string
  }
  createdAt: string,
  updatedAt: string
}

interface LinearProject {
  id: string,
  name: string
  description?: string
  slug: string
  icon?: string
  color?: string
  state: 'backlog' | 'started' | 'paused' | 'completed' | 'cancelled'
  status?: string
  priority: number,
  sortOrder: number
  startDate?: string
  targetDate?: string
  completedAt?: string
  canceledAt?: string
  autoArchivedAt?: string
  progress: number,
  scope: number
  url: string,
  creator: LinearUser
  lead?: LinearUser
  members: LinearUser[],
  teams: LinearTeam[]
  requirements?: string[]
  createdAt: string,
  updatedAt: string
}

interface LinearIssue {
  id: string,
  number: number
  title: string
  description?: string
  priority: 0 | 1 | 2 | 3 | 4 // No priority, Urgent, High, Normal, Low
  estimate?: number
  sortOrder: number,
  boardOrder: number
  previousIdentifiers: string[],
  createdAt: string
  updatedAt: string
  completedAt?: string
  canceledAt?: string
  autoArchivedAt?: string
  autoClosedAt?: string
  dueDate?: string
  triagedAt?: string
  snoozedUntilAt?: string
  url: string,
  branchName: string
  customerTicketCount: number,
  identifier: string
  assignee?: LinearUser
  creator: LinearUser,
  team: LinearTeam
  project?: LinearProject
  cycle?: {
    id: string,
    number: number
    name?: string
  }
  parent?: {
    id: string,
    identifier: string
    title: string
  }
  children: {,
    nodes: Array<{
      id: string,
      identifier: string
      title: string
    }>
  }
  state: LinearWorkflowState,
  labels: {
    nodes: LinearLabel[]
  }
  comments: {,
    nodes: LinearComment[]
  }
  attachments: {,
    nodes: LinearAttachment[]
  }
}

interface LinearWorkflowState {
  id: string,
  name: string
  color: string
  description?: string
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled',
  position: number
  team: LinearTeam,
  createdAt: string
  updatedAt: string
}

interface LinearLabel {
  id: string,
  name: string
  description?: string
  color: string
  team?: LinearTeam
  parent?: LinearLabel
  children: {,
    nodes: LinearLabel[]
  }
  createdAt: string,
  updatedAt: string
}

interface LinearComment {
  id: string,
  body: string
  bodyData?: Record<string, unknown>
  url?: string
  createdAt: string,
  updatedAt: string
  editedAt?: string
  user: LinearUser,
  issue: {
    id: string,
    identifier: string
    title: string
  }
  parent?: {
    id: string,
    body: string
  }
  children: {,
    nodes: LinearComment[]
  }
  reactionData?: Array<{
    emoji: string,
    users: LinearUser[]
  }>
}

interface LinearAttachment {
  id: string,
  title: string
  subtitle?: string
  url: string
  metadata?: Record<string, unknown>
  source?: string
  sourceType: 'github' | 'figma' | 'slack' | 'url' | 'zendesk' | 'intercom',
  groupBySource: boolean
  createdAt: string,
  updatedAt: string
  creator: LinearUser,
  issue: {
    id: string,
    identifier: string
    title: string
  }
}

interface LinearCycle {
  id: string,
  number: number
  name?: string
  description?: string
  startsAt: string,
  endsAt: string
  completedAt?: string
  autoArchivedAt?: string
  progress: number,
  completedScopeHistory: number[]
  scopeHistory: number[],
  inProgressScopeHistory: number[]
  url: string,
  team: LinearTeam
  issues: {,
    nodes: LinearIssue[]
  }
  createdAt: string,
  updatedAt: string
}

interface LinearMilestone {
  id: string,
  name: string
  description?: string
  targetDate?: string
  sortOrder: number,
  createdAt: string
  updatedAt: string,
  projects: {
    nodes: LinearProject[]
  }
}

interface LinearNotification {
  id: string,
  type: string
  readAt?: string
  emailedAt?: string
  snoozedUntilAt?: string
  createdAt: string,
  updatedAt: string
  user: LinearUser
  issue?: LinearIssue
  project?: LinearProject
  team?: LinearTeam
}

export class LinearIntegration extends BaseIntegration {
  readonly provider = 'linear'
  readonly name = 'Linear'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.linear.app/graphql'

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
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeGraphQLCall(`
          query {
            viewer {
              id
              name
              displayName
              email
              avatarUrl
              admin
              active
              createdAt
              updatedAt
            }
          }
        `)
      })

      const user = response.data.viewer

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Personal API keys don't expire
        scope: ['read', 'write', 'issues:create', 'issues:update', 'projects:create'],
        data: user
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }
    }
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      // Linear API keys don't expire, so just validate the connection
      return this.authenticate()
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.PROJECT_MANAGEMENT,
      IntegrationCapability.TASKS,
      IntegrationCapability.ISSUES,
      IntegrationCapability.COLLABORATION,
      IntegrationCapability.WEBHOOKS,
      IntegrationCapability.REPORTS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeGraphQLCall(`
          query {
            viewer {
              id
              name
              email
              admin
            }
            teams {
              nodes {
                id
                name
              }
            }
          }
        `)
      })

      const user = response.data.viewer
      const teams = response.data.teams.nodes

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: user.id
          userName: user.name,
          userEmail: user.email
          isAdmin: user.admin,
          teamsCount: teams.length
        }
      }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        status: 'error',
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }

  async sync(): Promise<SyncResult> {
    try {
      const startTime = new Date()
      let totalProcessed = 0
      let totalErrors = 0
      const errors: string[] = []

      // Sync teams
      try {
        const teamResult = await this.syncTeams()
        totalProcessed += teamResult.processed
        totalErrors += teamResult.errors
        if (teamResult.errorMessages) {
          errors.push(...teamResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Team sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync projects
      try {
        const projectResult = await this.syncProjects()
        totalProcessed += projectResult.processed
        totalErrors += projectResult.errors
        if (projectResult.errorMessages) {
          errors.push(...projectResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Project sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync issues
      try {
        const issueResult = await this.syncIssues()
        totalProcessed += issueResult.processed
        totalErrors += issueResult.errors
        if (issueResult.errorMessages) {
          errors.push(...issueResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Issue sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      return {
        success: totalErrors === 0,
        timestamp: new Date()
        duration: Date.now() - startTime.getTime(),
        itemsProcessed: totalProcessed
        itemsAdded: totalProcessed - totalErrors,
        itemsUpdated: 0
        itemsDeleted: 0,
        errors: totalErrors
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      this.logError('sync', error as Error)
      throw new SyncError(`Linear sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const linearPayload = payload as LinearWebhookPayload

      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload.body || '', payload.headers || {})) {
        throw new Error('Invalid webhook signature')
      }

      switch (linearPayload.type) {
        case 'Issue':
          await this.handleIssueWebhook(linearPayload)
          break
        case 'Project':
          await this.handleProjectWebhook(linearPayload)
          break
        case 'Comment':
          await this.handleCommentWebhook(linearPayload)
          break
        case 'Team':
          await this.handleTeamWebhook(linearPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${linearPayload.type}`)
      }

      return {
        success: true,
        data: { processed: true },
        message: 'Webhook processed successfully'
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // Linear doesn't have a specific disconnect endpoint
      // The API key remains valid until manually revoked
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncTeams(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.teams', async () => {
        return this.makeGraphQLCall(`
          query {
            teams {
              nodes {
                id
                name
                key
                description
                icon
                color
                private
                organization {
                  id
                  name
                }
                createdAt
                updatedAt
              }
            }
          }
        `)
      })

      let processed = 0
      const errors: string[] = []

      const teams = response.data.teams.nodes || []

      for (const team of teams) {
        try {
          await this.processTeam(team)
          processed++
        } catch (error) {
          errors.push(`Failed to process team ${team.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Team sync failed: ${(error as Error).message}`)
    }
  }

  private async syncProjects(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.projects', async () => {
        return this.makeGraphQLCall(`
          query {
            projects(first: 100) {
              nodes {
                id
                name
                description
                slug
                icon
                color
                state
                status
                priority
                startDate
                targetDate
                completedAt
                progress
                scope
                url
                creator {
                  id
                  name
                  email
                }
                lead {
                  id
                  name
                  email
                }
                createdAt
                updatedAt
              }
            }
          }
        `)
      })

      let processed = 0
      const errors: string[] = []

      const projects = response.data.projects.nodes || []

      for (const project of projects) {
        try {
          await this.processProject(project)
          processed++
        } catch (error) {
          errors.push(`Failed to process project ${project.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Project sync failed: ${(error as Error).message}`)
    }
  }

  private async syncIssues(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.issues', async () => {
        return this.makeGraphQLCall(`
          query {
            issues(first: 100, orderBy: { field: updatedAt, direction: DESC }) {
              nodes {
                id
                number
                title
                description
                priority
                estimate
                createdAt
                updatedAt
                completedAt
                dueDate
                url
                identifier
                assignee {
                  id
                  name
                  email
                }
                creator {
                  id
                  name
                  email
                }
                team {
                  id
                  name
                  key
                }
                state {
                  id
                  name
                  color
                  type
                }
                labels {
                  nodes {
                    id
                    name
                    color
                  }
                }
              }
            }
          }
        `)
      })

      let processed = 0
      const errors: string[] = []

      const issues = response.data.issues.nodes || []

      for (const issue of issues) {
        try {
          await this.processIssue(issue)
          processed++
        } catch (error) {
          errors.push(`Failed to process issue ${issue.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Issue sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processTeam(team: any): Promise<void> {
    this.logger.debug(`Processing Linear team: ${team.name}`)
    // Process team data for Aurelius AI system
  }

  private async processProject(project: any): Promise<void> {
    this.logger.debug(`Processing Linear project: ${project.name}`)
    // Process project data for Aurelius AI system
  }

  private async processIssue(issue: any): Promise<void> {
    this.logger.debug(`Processing Linear issue: ${issue.title}`)
    // Process issue data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleIssueWebhook(payload: LinearWebhookPayload): Promise<void> {
    this.logger.debug(`Handling issue webhook: ${payload.id}`)
    // Handle issue webhook processing
  }

  private async handleProjectWebhook(payload: LinearWebhookPayload): Promise<void> {
    this.logger.debug(`Handling project webhook: ${payload.id}`)
    // Handle project webhook processing
  }

  private async handleCommentWebhook(payload: LinearWebhookPayload): Promise<void> {
    this.logger.debug(`Handling comment webhook: ${payload.id}`)
    // Handle comment webhook processing
  }

  private async handleTeamWebhook(payload: LinearWebhookPayload): Promise<void> {
    this.logger.debug(`Handling team webhook: ${payload.id}`)
    // Handle team webhook processing
  }

  // Helper method for webhook signature verification
  private verifyWebhookSignature(body: string, headers: Record<string, string>): boolean {
    try {
      const signature = headers['linear-signature'] || headers['Linear-Signature']
      if (!signature || !this.config?.webhookSecret) {
        return false
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('hex')

      return signature === expectedSignature
    } catch (error) {
      this.logError('verifyWebhookSignature' error as Error)
      return false
    }
  }

  // Helper method for GraphQL calls
  private async makeGraphQLCall(query: string, variables?: Record<string, unknown>): Promise<any> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const body = {
      query,
      variables: variables || {}
    }

    const response = await fetch(this.apiBaseUrl, {
      method: 'POST'
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Linear GraphQL error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    const result = await response.json()

    if (result.errors && result.errors.length > 0) {
      throw new Error(`Linear GraphQL errors: ${JSON.stringify(result.errors)}`)
    }

    return result
  }

  // Public API methods
  async getTeams(): Promise<LinearTeam[]> {
    try {
      const response = await this.executeWithProtection('api.get_teams', async () => {
        return this.makeGraphQLCall(`
          query {
            teams {
              nodes {
                id
                name
                key
                description
                icon
                color
                private
                issueEstimationType
                cycleDuration
                organization {
                  id
                  name
                }
                createdAt
                updatedAt
              }
            }
          }
        `)
      })

      return response.data.teams.nodes || []
    } catch (error) {
      this.logError('getTeams', error as Error)
      throw new Error(`Failed to get teams: ${(error as Error).message}`)
    }
  }

  async getTeam(teamId: string): Promise<LinearTeam> {
    try {
      const response = await this.executeWithProtection('api.get_team', async () => {
        return this.makeGraphQLCall(
          `
          query($id: String!) {
            team(id: $id) {
              id
              name
              key
              description
              icon
              color
              private
              issueEstimationType
              cycleDuration
              organization {
                id
                name
              }
              createdAt
              updatedAt
            }
          }
        `,
          { id: teamId },
        )
      })

      return response.data.team
    } catch (error) {
      this.logError('getTeam', error as Error)
      throw new Error(`Failed to get team: ${(error as Error).message}`)
    }
  }

  async getProjects(params?: {
    first?: number
    after?: string
    filter?: Record<string, unknown>
  }): Promise<LinearProject[]> {
    try {
      const response = await this.executeWithProtection('api.get_projects', async () => {
        return this.makeGraphQLCall(
          `
          query($first: Int, $after: String, $filter: ProjectFilter) {
            projects(first: $first, after: $after, filter: $filter) {
              nodes {
                id
                name
                description
                slug
                icon
                color
                state
                status
                priority
                startDate
                targetDate
                completedAt
                progress
                scope
                url
                creator {
                  id
                  name
                  email
                }
                lead {
                  id
                  name
                  email
                }
                createdAt
                updatedAt
              }
            }
          }
        `,
          params,
        )
      })

      return response.data.projects.nodes || []
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get projects: ${(error as Error).message}`)
    }
  }

  async getProject(projectId: string): Promise<LinearProject> {
    try {
      const response = await this.executeWithProtection('api.get_project', async () => {
        return this.makeGraphQLCall(
          `
          query($id: String!) {
            project(id: $id) {
              id
              name
              description
              slug
              icon
              color
              state
              status
              priority
              startDate
              targetDate
              completedAt
              progress
              scope
              url
              creator {
                id
                name
                email
              }
              lead {
                id
                name
                email
              }
              members {
                nodes {
                  id
                  name
                  email
                }
              }
              teams {
                nodes {
                  id
                  name
                  key
                }
              }
              createdAt
              updatedAt
            }
          }
        `,
          { id: projectId },
        )
      })

      return response.data.project
    } catch (error) {
      this.logError('getProject', error as Error)
      throw new Error(`Failed to get project: ${(error as Error).message}`)
    }
  }

  async createProject(projectData: {,
    name: string
    description?: string
    icon?: string
    color?: string
    priority?: number
    startDate?: string
    targetDate?: string
    leadId?: string
    memberIds?: string[]
    teamIds?: string[]
  }): Promise<LinearProject> {
    try {
      const response = await this.executeWithProtection('api.create_project', async () => {
        return this.makeGraphQLCall(
          `
          mutation($input: ProjectCreateInput!) {
            projectCreate(input: $input) {
              success
              project {
                id
                name
                description
                slug
                state
                url
                createdAt
              }
            }
          }
        `,
          { input: projectData },
        )
      })

      if (!response.data.projectCreate.success) {
        throw new Error('Failed to create project')
      }

      return response.data.projectCreate.project
    } catch (error) {
      this.logError('createProject', error as Error)
      throw new Error(`Failed to create project: ${(error as Error).message}`)
    }
  }

  async updateProject(
    projectId: string,
    projectData: Partial<LinearProject>
  ): Promise<LinearProject> {
    try {
      const response = await this.executeWithProtection('api.update_project', async () => {
        return this.makeGraphQLCall(
          `
          mutation($id: String!, $input: ProjectUpdateInput!) {
            projectUpdate(id: $id, input: $input) {
              success
              project {
                id
                name
                description
                state
                progress
                updatedAt
              }
            }
          }
        `,
          { id: projectId, input: projectData },
        )
      })

      if (!response.data.projectUpdate.success) {
        throw new Error('Failed to update project')
      }

      return response.data.projectUpdate.project
    } catch (error) {
      this.logError('updateProject', error as Error)
      throw new Error(`Failed to update project: ${(error as Error).message}`)
    }
  }

  async getIssues(params?: {
    first?: number
    after?: string
    filter?: Record<string, unknown>
    orderBy?: Record<string, unknown>
  }): Promise<LinearIssue[]> {
    try {
      const response = await this.executeWithProtection('api.get_issues', async () => {
        return this.makeGraphQLCall(
          `
          query($first: Int, $after: String, $filter: IssueFilter, $orderBy: PaginationOrderBy) {
            issues(first: $first, after: $after, filter: $filter, orderBy: $orderBy) {
              nodes {
                id
                number
                title
                description
                priority
                estimate
                createdAt
                updatedAt
                completedAt
                dueDate
                url
                identifier
                assignee {
                  id
                  name
                  email
                }
                creator {
                  id
                  name
                  email
                }
                team {
                  id
                  name
                  key
                }
                project {
                  id
                  name
                }
                state {
                  id
                  name
                  color
                  type
                }
                labels {
                  nodes {
                    id
                    name
                    color
                  }
                }
              }
            }
          }
        `,
          params,
        )
      })

      return response.data.issues.nodes || []
    } catch (error) {
      this.logError('getIssues', error as Error)
      throw new Error(`Failed to get issues: ${(error as Error).message}`)
    }
  }

  async getIssue(issueId: string): Promise<LinearIssue> {
    try {
      const response = await this.executeWithProtection('api.get_issue', async () => {
        return this.makeGraphQLCall(
          `
          query($id: String!) {
            issue(id: $id) {
              id
              number
              title
              description
              priority
              estimate
              createdAt
              updatedAt
              completedAt
              dueDate
              url
              identifier
              assignee {
                id
                name
                email
              }
              creator {
                id
                name
                email
              }
              team {
                id
                name
                key
              }
              project {
                id
                name
              }
              state {
                id
                name
                color
                type
              }
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              comments {
                nodes {
                  id
                  body
                  createdAt
                  user {
                    id
                    name
                  }
                }
              }
              attachments {
                nodes {
                  id
                  title
                  url
                  sourceType
                  createdAt
                }
              }
            }
          }
        `,
          { id: issueId },
        )
      })

      return response.data.issue
    } catch (error) {
      this.logError('getIssue', error as Error)
      throw new Error(`Failed to get issue: ${(error as Error).message}`)
    }
  }

  async createIssue(issueData: {,
    title: string
    description?: string
    teamId: string
    assigneeId?: string
    projectId?: string
    priority?: number
    estimate?: number
    dueDate?: string
    labelIds?: string[]
    parentId?: string
    stateId?: string
  }): Promise<LinearIssue> {
    try {
      const response = await this.executeWithProtection('api.create_issue', async () => {
        return this.makeGraphQLCall(
          `
          mutation($input: IssueCreateInput!) {
            issueCreate(input: $input) {
              success
              issue {
                id
                number
                title
                identifier
                url
                createdAt
              }
            }
          }
        `,
          { input: issueData },
        )
      })

      if (!response.data.issueCreate.success) {
        throw new Error('Failed to create issue')
      }

      return response.data.issueCreate.issue
    } catch (error) {
      this.logError('createIssue', error as Error)
      throw new Error(`Failed to create issue: ${(error as Error).message}`)
    }
  }

  async updateIssue(issueId: string, issueData: Partial<LinearIssue>): Promise<LinearIssue> {
    try {
      const response = await this.executeWithProtection('api.update_issue', async () => {
        return this.makeGraphQLCall(
          `
          mutation($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
              success
              issue {
                id
                number
                title
                priority
                estimate
                updatedAt
              }
            }
          }
        `,
          { id: issueId, input: issueData },
        )
      })

      if (!response.data.issueUpdate.success) {
        throw new Error('Failed to update issue')
      }

      return response.data.issueUpdate.issue
    } catch (error) {
      this.logError('updateIssue', error as Error)
      throw new Error(`Failed to update issue: ${(error as Error).message}`)
    }
  }

  async deleteIssue(issueId: string): Promise<void> {
    try {
      const response = await this.executeWithProtection('api.delete_issue', async () => {
        return this.makeGraphQLCall(
          `
          mutation($id: String!) {
            issueDelete(id: $id) {
              success
            }
          }
        `,
          { id: issueId },
        )
      })

      if (!response.data.issueDelete.success) {
        throw new Error('Failed to delete issue')
      }
    } catch (error) {
      this.logError('deleteIssue', error as Error)
      throw new Error(`Failed to delete issue: ${(error as Error).message}`)
    }
  }

  async getWorkflowStates(teamId: string): Promise<LinearWorkflowState[]> {
    try {
      const response = await this.executeWithProtection('api.get_workflow_states', async () => {
        return this.makeGraphQLCall(
          `
          query($teamId: String!) {
            team(id: $teamId) {
              states {
                nodes {
                  id
                  name
                  color
                  description
                  type
                  position
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `,
          { teamId },
        )
      })

      return response.data.team.states.nodes || []
    } catch (error) {
      this.logError('getWorkflowStates', error as Error)
      throw new Error(`Failed to get workflow states: ${(error as Error).message}`)
    }
  }

  async getLabels(teamId?: string): Promise<LinearLabel[]> {
    try {
      const response = await this.executeWithProtection('api.get_labels', async () => {
        const query = teamId
          ? `query($teamId: String!) {
              team(id: $teamId) {
                labels {
                  nodes {
                    id
                    name
                    description
                    color
                    createdAt
                    updatedAt
                  }
                }
              }
            }`
          : `query {
              issueLabels {
                nodes {
                  id
                  name
                  description
                  color
                  team {
                    id
                    name
                  }
                  createdAt
                  updatedAt
                }
              }
            }`

        return this.makeGraphQLCall(query, teamId ? { teamId } : undefined)
      })

      return teamId ? response.data.team.labels.nodes || [] : response.data.issueLabels.nodes || []
    } catch (error) {
      this.logError('getLabels', error as Error)
      throw new Error(`Failed to get labels: ${(error as Error).message}`)
    }
  }

  async createComment(commentData: {,
    issueId: string
    body: string
    parentId?: string
  }): Promise<LinearComment> {
    try {
      const response = await this.executeWithProtection('api.create_comment', async () => {
        return this.makeGraphQLCall(
          `
          mutation($input: CommentCreateInput!) {
            commentCreate(input: $input) {
              success
              comment {
                id
                body
                createdAt
                user {
                  id
                  name
                }
                issue {
                  id
                  identifier
                }
              }
            }
          }
        `,
          { input: commentData },
        )
      })

      if (!response.data.commentCreate.success) {
        throw new Error('Failed to create comment')
      }

      return response.data.commentCreate.comment
    } catch (error) {
      this.logError('createComment', error as Error)
      throw new Error(`Failed to create comment: ${(error as Error).message}`)
    }
  }

  async getCycles(teamId: string): Promise<LinearCycle[]> {
    try {
      const response = await this.executeWithProtection('api.get_cycles', async () => {
        return this.makeGraphQLCall(
          `
          query($teamId: String!) {
            team(id: $teamId) {
              cycles {
                nodes {
                  id
                  number
                  name
                  description
                  startsAt
                  endsAt
                  completedAt
                  progress
                  url
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `,
          { teamId },
        )
      })

      return response.data.team.cycles.nodes || []
    } catch (error) {
      this.logError('getCycles', error as Error)
      throw new Error(`Failed to get cycles: ${(error as Error).message}`)
    }
  }

  async searchIssues(
    query: string
    params?: {
      first?: number
      teamId?: string
      includeArchived?: boolean
    },
  ): Promise<LinearIssue[]> {
    try {
      const filter: Record<string, unknown> = {}

      if (params?.teamId) {
        filter.team = { id: { eq: params.teamId } }
      }

      if (params?.includeArchived === false) {
        filter.state = { type: { neq: 'canceled' } }
      }

      const response = await this.executeWithProtection('api.search_issues', async () => {
        return this.makeGraphQLCall(
          `
          query($first: Int, $filter: IssueFilter) {
            issues(first: $first, filter: $filter) {
              nodes {
                id
                number
                title
                description
                priority
                createdAt
                updatedAt
                url
                identifier
                assignee {
                  id
                  name
                }
                team {
                  id
                  name
                }
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        `,
          {
            first: params?.first || 50,
            filter: Object.keys(filter).length > 0 ? filter : undefined
          },
        )
      })

      // Filter results by search query (Linear GraphQL doesn't support text search directly)
      const issues = response.data.issues.nodes || []
      const queryLower = query.toLowerCase()

      return issues.filter(
        (issue: any) =>
          issue.title.toLowerCase().includes(queryLower) ||
          (issue.description && issue.description.toLowerCase().includes(queryLower)) ||
          issue.identifier.toLowerCase().includes(queryLower),
      )
    } catch (error) {
      this.logError('searchIssues', error as Error)
      throw new Error(`Failed to search issues: ${(error as Error).message}`)
    }
  }

  async getUserProfile(): Promise<LinearUser> {
    try {
      const response = await this.executeWithProtection('api.get_user_profile', async () => {
        return this.makeGraphQLCall(`
          query {
            viewer {
              id
              name
              displayName
              email
              avatarUrl
              admin
              active
              timezone
              locale
              createdAt
              updatedAt
            }
          }
        `)
      })

      return response.data.viewer
    } catch (error) {
      this.logError('getUserProfile', error as Error)
      throw new Error(`Failed to get user profile: ${(error as Error).message}`)
    }
  }

  async getNotifications(params?: {
    first?: number
    includeRead?: boolean
  }): Promise<LinearNotification[]> {
    try {
      const response = await this.executeWithProtection('api.get_notifications', async () => {
        return this.makeGraphQLCall(
          `
          query($first: Int, $includeRead: Boolean) {
            notifications(first: $first, includeRead: $includeRead) {
              nodes {
                id
                type
                readAt
                createdAt
                updatedAt
                user {
                  id
                  name
                }
                issue {
                  id
                  identifier
                  title
                }
                project {
                  id
                  name
                }
                team {
                  id
                  name
                }
              }
            }
          }
        `,
          params,
        )
      })

      return response.data.notifications.nodes || []
    } catch (error) {
      this.logError('getNotifications', error as Error)
      throw new Error(`Failed to get notifications: ${(error as Error).message}`)
    }
  }
}
