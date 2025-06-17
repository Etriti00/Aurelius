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

interface JiraWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface JiraTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  scope: string
}

interface JiraUser {
  accountId: string,
  accountType: 'atlassian' | 'customer' | 'app'
  emailAddress: string,
  displayName: string
  active: boolean,
  timeZone: string
  locale: string
  groups?: {
    size: number,
    items: JiraGroup[]
  }
  applicationRoles?: {
    size: number,
    items: JiraApplicationRole[]
  }
  expand?: string
  avatarUrls?: {
    '48x48': string
    '24x24': string
    '16x16': string
    '32x32': string
  }
}

interface JiraGroup {
  name: string
  groupId?: string
}

interface JiraApplicationRole {
  key: string,
  groups: string[]
  name: string,
  defaultGroups: string[]
  selectedByDefault: boolean,
  defined: boolean
  numberOfSeats: number,
  remainingSeats: number
  userCount: number,
  userCountDescription: string
  hasUnlimitedSeats: boolean,
  platform: boolean
}

interface JiraProject {
  expand?: string
  self: string,
  id: string
  key: string
  description?: string
  lead: JiraUser,
  components: JiraComponent[]
  issueTypes: JiraIssueType[],
  assigneeType: 'PROJECT_LEAD' | 'UNASSIGNED'
  versions: JiraVersion[],
  name: string
  roles: Record<string, string>
  avatarUrls: {
    '48x48': string
    '24x24': string
    '16x16': string
    '32x32': string
  }
  projectCategory?: JiraProjectCategory
  projectTypeKey: 'software' | 'service_desk' | 'business',
  simplified: boolean
  style: 'classic' | 'next-gen',
  isPrivate: boolean
  properties?: Record<string, unknown>
  uuid?: string
  insight?: {
    totalIssueCount: number,
    lastIssueUpdateTime: string
  }
  deleted?: boolean
  retentionTillDate?: string
  deletedDate?: string
  deletedBy?: JiraUser
  archived?: boolean
  archivedDate?: string
  archivedBy?: JiraUser
}

interface JiraComponent {
  self: string,
  id: string
  name: string
  description?: string
  lead?: JiraUser
  assigneeType: 'PROJECT_DEFAULT' | 'COMPONENT_LEAD' | 'PROJECT_LEAD' | 'UNASSIGNED'
  assignee?: JiraUser
  realAssigneeType: 'PROJECT_DEFAULT' | 'COMPONENT_LEAD' | 'PROJECT_LEAD' | 'UNASSIGNED'
  realAssignee?: JiraUser
  isAssigneeTypeValid: boolean,
  project: string
  projectId: number
}

interface JiraIssueType {
  self: string,
  id: string
  description: string,
  iconUrl: string
  name: string,
  subtask: boolean
  avatarId?: number
  entityId?: string
  hierarchyLevel?: number
  scope?: {
    type: 'PROJECT',
    project: {
      id: string
    }
  }
}

interface JiraVersion {
  self: string,
  id: string
  name: string
  description?: string
  archived: boolean,
  released: boolean
  startDate?: string
  releaseDate?: string
  overdue?: boolean
  userStartDate?: string
  userReleaseDate?: string
  project?: string
  projectId?: number
  moveUnfixedIssuesTo?: string
  operations?: JiraOperation[]
  issuesStatusForFixVersion?: {
    unmapped: number,
    toDo: number
    inProgress: number,
    done: number
  }
}

interface JiraOperation {
  id: string,
  styleClass: string
  iconClass: string,
  label: string
  href: string,
  weight: number
}

interface JiraProjectCategory {
  self: string,
  id: string
  name: string,
  description: string
}

interface JiraIssue {
  expand?: string
  id: string,
  self: string
  key: string,
  fields: {
    statuscategorychangedate: string,
    issuetype: JiraIssueType
    timespent?: number
    project: JiraProject,
    fixVersions: JiraVersion[]
    aggregatetimespent?: number
    resolution?: JiraResolution
    resolutiondate?: string
    workratio: number
    lastViewed?: string
    watches: {,
      self: string
      watchCount: number,
      isWatching: boolean
    }
    created: string,
    priority: JiraPriority
    labels: string[]
    timeestimate?: number
    aggregatetimeoriginalestimate?: number
    versions: JiraVersion[],
    issuelinks: JiraIssueLink[]
    assignee?: JiraUser
    updated: string,
    status: JiraStatus
    components: JiraComponent[]
    timeoriginalestimate?: number
    description?: JiraContent
    timetracking?: {
      originalEstimate?: string
      remainingEstimate?: string
      timeSpent?: string
      originalEstimateSeconds?: number
      remainingEstimateSeconds?: number
      timeSpentSeconds?: number
    }
    attachment: JiraAttachment[]
    aggregatetimeestimate?: number
    summary: string,
    creator: JiraUser
    subtasks: JiraIssue[],
    reporter: JiraUser
    aggregateprogress?: {
      progress: number,
      total: number
      percent: number
    }
    environment?: JiraContent
    duedate?: string
    progress?: {
      progress: number,
      total: number
      percent: number
    }
    comment?: {
      comments: JiraComment[],
      self: string
      maxResults: number,
      total: number
      startAt: number
    }
    votes?: {
      self: string,
      votes: number
      hasVoted: boolean
    }
    worklog?: {
      startAt: number,
      maxResults: number
      total: number,
      worklogs: JiraWorklog[]
    }
  }
  renderedFields?: Record<string, unknown>
  properties?: Record<string, unknown>
  names?: Record<string, string>
  schema?: Record<string, unknown>
  transitions?: JiraTransition[]
  operations?: {
    linkGroups: JiraLinkGroup[]
  }
  editmeta?: {
    fields: Record<string, unknown>
  }
  changelog?: {
    id: string,
    author: JiraUser
    created: string,
    items: JiraChangelogItem[]
    historyMetadata?: {
      type: string,
      description: string
      descriptionKey: string,
      activityDescription: string
      activityDescriptionKey: string,
      emailDescription: string
      emailDescriptionKey: string,
      actor: {
        id: string,
        displayName: string
        type: string,
        avatarUrl: string
        url: string
      }
      generator: {,
        id: string
        type: string
      }
      cause: {,
        id: string
        type: string
      }
      extraData: Record<string, unknown>
    }
  }
  versionedRepresentations?: Record<string, unknown>
  fieldsToInclude?: {
    included: string[],
    actuallyIncluded: string[]
    excluded: string[]
  }
}

interface JiraResolution {
  self: string,
  id: string
  description: string,
  name: string
}

interface JiraPriority {
  self: string,
  iconUrl: string
  name: string,
  id: string
  statusColor: string,
  description: string
}

interface JiraStatus {
  self: string,
  description: string
  iconUrl: string,
  name: string
  id: string,
  statusCategory: {
    self: string,
    id: number
    key: string,
    colorName: string
    name: string
  }
  scope?: {
    type: 'PROJECT',
    project: {
      id: string
    }
  }
  usages?: Array<{
    project: {,
      id: string
    }
    issueTypes: string[]
  }>
}

interface JiraContent {
  type: 'doc',
  version: number
  content: Array<{,
    type: string
    content?: Array<{
      type: string
      text?: string
      marks?: Array<{
        type: string
        attrs?: Record<string, unknown>
      }>
      attrs?: Record<string, unknown>
    }>
    attrs?: Record<string, unknown>
  }>
}

interface JiraIssueLink {
  id: string,
  self: string
  type: {,
    id: string
    name: string,
    inward: string
    outward: string,
    self: string
  }
  inwardIssue?: {
    id: string,
    key: string
    self: string,
    fields: {
      summary: string,
      status: JiraStatus
      priority: JiraPriority,
      issuetype: JiraIssueType
    }
  }
  outwardIssue?: {
    id: string,
    key: string
    self: string,
    fields: {
      summary: string,
      status: JiraStatus
      priority: JiraPriority,
      issuetype: JiraIssueType
    }
  }
}

interface JiraAttachment {
  self: string,
  id: string
  filename: string,
  author: JiraUser
  created: string,
  size: number
  mimeType: string,
  content: string
  thumbnail?: string
}

interface JiraComment {
  self: string,
  id: string
  author: JiraUser,
  body: JiraContent
  updateAuthor: JiraUser,
  created: string
  updated: string
  visibility?: {
    type: 'group' | 'role',
    value: string
    identifier?: string
  }
  jsdPublic?: boolean
  jsdAuthorCanEdit?: boolean
  properties?: Array<{
    key: string,
    value: any
  }>
}

interface JiraWorklog {
  self: string,
  author: JiraUser
  updateAuthor: JiraUser
  comment?: JiraContent
  created: string,
  updated: string
  visibility?: {
    type: 'group' | 'role',
    value: string
    identifier?: string
  }
  started: string,
  timeSpent: string
  timeSpentSeconds: number,
  id: string
  issueId: string
  properties?: Array<{
    key: string,
    value: any
  }>
}

interface JiraTransition {
  id: string,
  name: string
  to: JiraStatus,
  hasScreen: boolean
  isGlobal: boolean,
  isInitial: boolean
  isAvailable: boolean,
  isConditional: boolean
  fields?: Record<string, unknown>
  expand?: string
  looped?: boolean
}

interface JiraLinkGroup {
  id: string,
  styleClass: string
  header?: {
    id: string,
    styleClass: string
    iconClass: string,
    label: string
    title: string,
    href: string
    weight: number
  }
  weight: number,
  links: Array<{
    id: string,
    styleClass: string
    iconClass: string,
    label: string
    title: string,
    href: string
    weight: number
  }>
  groups: JiraLinkGroup[]
}

interface JiraChangelogItem {
  field: string,
  fieldtype: string
  fieldId?: string
  from?: string
  fromString?: string
  to?: string
  toString?: string
}

interface JiraBoard {
  id: number,
  self: string
  name: string,
  type: 'scrum' | 'kanban' | 'simple'
  admins?: {
    users: JiraUser[],
    groups: JiraGroup[]
  }
  location?: {
    projectId: number,
    userId: number
    userAccountId: string,
    displayName: string
    projectName: string,
    projectKey: string
    projectTypeKey: string,
    avatarURI: string
    name: string
  }
  canEdit: boolean,
  isPrivate: boolean
  favourite: boolean
}

interface JiraSprint {
  id: number,
  self: string
  state: 'closed' | 'active' | 'future',
  name: string
  startDate?: string
  endDate?: string
  completeDate?: string
  activatedDate?: string
  originBoardId?: number
  goal?: string
}

export class JiraIntegration extends BaseIntegration {
  readonly provider = 'jira'
  readonly name = 'Jira'
  readonly version = '1.0.0'

  private readonly apiBaseUrl: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Extract Jira domain from config or token
    this.apiBaseUrl = this.config?.customFields?.domain
      ? `https://${this.config.customFields.domain}.atlassian.net/rest/api/3`
      : 'https://api.atlassian.com/ex/jira/v3'
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/myself', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: ['read:jira-work', 'write:jira-work'],
        data: response
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
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }

      const response = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({,
          grant_type: 'refresh_token'
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
          refresh_token: this.refreshTokenValue
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: JiraTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
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
      IntegrationCapability.ISSUE_TRACKING,
      IntegrationCapability.AGILE,
      IntegrationCapability.REPORTING,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/myself', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          accountId: response.accountId
          displayName: response.displayName,
          emailAddress: response.emailAddress
          timeZone: response.timeZone,
          active: response.active
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

      // Sync boards
      try {
        const boardResult = await this.syncBoards()
        totalProcessed += boardResult.processed
        totalErrors += boardResult.errors
        if (boardResult.errorMessages) {
          errors.push(...boardResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Board sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Jira sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const jiraPayload = payload as JiraWebhookPayload

      switch (jiraPayload.type) {
        case 'jira:issue_created':
        case 'jira:issue_updated':
        case 'jira:issue_deleted':
          await this.handleIssueWebhook(jiraPayload)
          break
        case 'project_created':
        case 'project_updated':
        case 'project_deleted':
          await this.handleProjectWebhook(jiraPayload)
          break
        case 'comment_created':
        case 'comment_updated':
        case 'comment_deleted':
          await this.handleCommentWebhook(jiraPayload)
          break
        case 'worklog_created':
        case 'worklog_updated':
        case 'worklog_deleted':
          await this.handleWorklogWebhook(jiraPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${jiraPayload.type}`)
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
      // Jira doesn't have a specific disconnect endpoint
      // The access token will naturally expire
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncProjects(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.projects', async () => {
        return this.makeApiCall('/project', 'GET', undefined, {
          expand: 'description,lead,issueTypes,url,projectKeys,permissions,insight'
        })
      })

      let processed = 0
      const errors: string[] = []

      const projects = response || []

      for (const project of projects) {
        try {
          await this.processProject(project)
          processed++
        } catch (error) {
          errors.push(`Failed to process project ${project.key}: ${(error as Error).message}`)
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
        return this.makeApiCall('/search', 'GET', undefined, {
          jql: 'order by updated DESC',
          maxResults: 100
          expand: 'changelog,operations,editmeta,transitions,renderedFields'
        })
      })

      let processed = 0
      const errors: string[] = []

      const issues = response.issues || []

      for (const issue of issues) {
        try {
          await this.processIssue(issue)
          processed++
        } catch (error) {
          errors.push(`Failed to process issue ${issue.key}: ${(error as Error).message}`)
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

  private async syncBoards(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.boards', async () => {
        return this.makeApiCall('/rest/agile/1.0/board', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const boards = response.values || []

      for (const board of boards) {
        try {
          await this.processBoard(board)
          processed++
        } catch (error) {
          errors.push(`Failed to process board ${board.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Board sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processProject(project: any): Promise<void> {
    this.logger.debug(`Processing Jira project: ${project.name}`)
    // Process project data for Aurelius AI system
  }

  private async processIssue(issue: any): Promise<void> {
    this.logger.debug(`Processing Jira issue: ${issue.key}`)
    // Process issue data for Aurelius AI system
  }

  private async processBoard(board: any): Promise<void> {
    this.logger.debug(`Processing Jira board: ${board.name}`)
    // Process board data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleIssueWebhook(payload: JiraWebhookPayload): Promise<void> {
    this.logger.debug(`Handling issue webhook: ${payload.id}`)
    // Handle issue webhook processing
  }

  private async handleProjectWebhook(payload: JiraWebhookPayload): Promise<void> {
    this.logger.debug(`Handling project webhook: ${payload.id}`)
    // Handle project webhook processing
  }

  private async handleCommentWebhook(payload: JiraWebhookPayload): Promise<void> {
    this.logger.debug(`Handling comment webhook: ${payload.id}`)
    // Handle comment webhook processing
  }

  private async handleWorklogWebhook(payload: JiraWebhookPayload): Promise<void> {
    this.logger.debug(`Handling worklog webhook: ${payload.id}`)
    // Handle worklog webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<any> {
    const url = new URL(`${this.apiBaseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString())
        }
      })
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Jira API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getProjects(): Promise<JiraProject[]> {
    try {
      const response = await this.executeWithProtection('api.get_projects', async () => {
        return this.makeApiCall('/project', 'GET', undefined, {
          expand: 'description,lead,issueTypes,url,projectKeys,permissions,insight'
        })
      })

      return response || []
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get projects: ${(error as Error).message}`)
    }
  }

  async getProject(projectIdOrKey: string): Promise<JiraProject> {
    try {
      const response = await this.executeWithProtection('api.get_project', async () => {
        return this.makeApiCall(`/project/${projectIdOrKey}`, 'GET', undefined, {
          expand: 'description,lead,issueTypes,url,projectKeys,permissions,insight'
        })
      })

      return response
    } catch (error) {
      this.logError('getProject', error as Error)
      throw new Error(`Failed to get project: ${(error as Error).message}`)
    }
  }

  async createProject(projectData: {,
    key: string
    name: string,
    projectTypeKey: 'software' | 'service_desk' | 'business'
    projectTemplateKey?: string
    description?: string
    lead?: string
    url?: string
    assigneeType?: 'PROJECT_LEAD' | 'UNASSIGNED'
    avatarId?: number
    issueSecurityScheme?: number
    permissionScheme?: number
    notificationScheme?: number
    categoryId?: number
  }): Promise<JiraProject> {
    try {
      const response = await this.executeWithProtection('api.create_project', async () => {
        return this.makeApiCall('/project', 'POST', projectData)
      })

      return response
    } catch (error) {
      this.logError('createProject', error as Error)
      throw new Error(`Failed to create project: ${(error as Error).message}`)
    }
  }

  async updateProject(
    projectIdOrKey: string,
    projectData: Partial<JiraProject>
  ): Promise<JiraProject> {
    try {
      const response = await this.executeWithProtection('api.update_project', async () => {
        return this.makeApiCall(`/project/${projectIdOrKey}`, 'PUT', projectData)
      })

      return response
    } catch (error) {
      this.logError('updateProject', error as Error)
      throw new Error(`Failed to update project: ${(error as Error).message}`)
    }
  }

  async deleteProject(projectIdOrKey: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_project', async () => {
        return this.makeApiCall(`/project/${projectIdOrKey}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteProject', error as Error)
      throw new Error(`Failed to delete project: ${(error as Error).message}`)
    }
  }

  async getIssues(params?: {
    jql?: string
    startAt?: number
    maxResults?: number
    fields?: string[]
    expand?: string[]
    properties?: string[]
    fieldsByKeys?: boolean
  }): Promise<{
    expand: string,
    startAt: number
    maxResults: number,
    total: number
    issues: JiraIssue[]
  }> {
    try {
      const queryParams: Record<string, unknown> = {
        jql: params?.jql || 'order by updated DESC',
        startAt: params?.startAt || 0
        maxResults: params?.maxResults || 50
      }

      if (params?.fields) {
        queryParams.fields = params.fields.join(',')
      }
      if (params?.expand) {
        queryParams.expand = params.expand.join(',')
      }
      if (params?.properties) {
        queryParams.properties = params.properties.join(',')
      }
      if (params?.fieldsByKeys !== undefined) {
        queryParams.fieldsByKeys = params.fieldsByKeys
      }

      const response = await this.executeWithProtection('api.get_issues', async () => {
        return this.makeApiCall('/search', 'GET', undefined, queryParams)
      })

      return response
    } catch (error) {
      this.logError('getIssues', error as Error)
      throw new Error(`Failed to get issues: ${(error as Error).message}`)
    }
  }

  async getIssue(
    issueIdOrKey: string
    params?: {
      fields?: string[]
      expand?: string[]
      properties?: string[]
      fieldsByKeys?: boolean
      updateHistory?: boolean
    },
  ): Promise<JiraIssue> {
    try {
      const queryParams: Record<string, unknown> = {}

      if (params?.fields) {
        queryParams.fields = params.fields.join(',')
      }
      if (params?.expand) {
        queryParams.expand = params.expand.join(',')
      }
      if (params?.properties) {
        queryParams.properties = params.properties.join(',')
      }
      if (params?.fieldsByKeys !== undefined) {
        queryParams.fieldsByKeys = params.fieldsByKeys
      }
      if (params?.updateHistory !== undefined) {
        queryParams.updateHistory = params.updateHistory
      }

      const response = await this.executeWithProtection('api.get_issue', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}`, 'GET', undefined, queryParams)
      })

      return response
    } catch (error) {
      this.logError('getIssue', error as Error)
      throw new Error(`Failed to get issue: ${(error as Error).message}`)
    }
  }

  async createIssue(issueData: {,
    fields: {
      project: {,
        key: string
      }
      summary: string
      description?: JiraContent
      issuetype: {,
        id: string
      }
      assignee?: {
        accountId: string
      }
      reporter?: {
        accountId: string
      }
      priority?: {
        id: string
      }
      labels?: string[]
      components?: Array<{
        id: string
      }>
      fixVersions?: Array<{
        id: string
      }>
      versions?: Array<{
        id: string
      }>
      environment?: JiraContent
      duedate?: string
      security?: {
        id: string
      }
      timetracking?: {
        originalEstimate?: string
        remainingEstimate?: string
      }
      parent?: {
        key: string
      }
      customfield_10000?: string
      [key: string]: any
    }
    properties?: Array<{
      key: string,
      value: any
    }>
    historyMetadata?: {
      type: string,
      description: string
      descriptionKey: string,
      activityDescription: string
      activityDescriptionKey: string,
      actor: {
        id: string,
        displayName: string
        type: string,
        avatarUrl: string
        url: string
      }
      generator: {,
        id: string
        type: string
      }
      cause: {,
        id: string
        type: string
      }
      extraData: Record<string, unknown>
    }
    transition?: {
      id: string
      fields?: Record<string, unknown>
    }
  }): Promise<JiraIssue> {
    try {
      const response = await this.executeWithProtection('api.create_issue', async () => {
        return this.makeApiCall('/issue', 'POST', issueData)
      })

      return response
    } catch (error) {
      this.logError('createIssue', error as Error)
      throw new Error(`Failed to create issue: ${(error as Error).message}`)
    }
  }

  async updateIssue(
    issueIdOrKey: string,
    issueData: {
      fields?: Record<string, unknown>
      update?: Record<string, unknown>
      historyMetadata?: {
        type: string,
        description: string
        descriptionKey: string,
        activityDescription: string
        activityDescriptionKey: string,
        actor: {
          id: string,
          displayName: string
          type: string,
          avatarUrl: string
          url: string
        }
        generator: {,
          id: string
          type: string
        }
        cause: {,
          id: string
          type: string
        }
        extraData: Record<string, unknown>
      }
      properties?: Array<{
        key: string,
        value: any
      }>
    },
    params?: {
      notifyUsers?: boolean
      overrideScreenSecurity?: boolean
      overrideEditableFlag?: boolean
      returnIssue?: boolean
      expand?: string
    },
  ): Promise<void> {
    try {
      await this.executeWithProtection('api.update_issue', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}`, 'PUT', issueData, params)
      })
    } catch (error) {
      this.logError('updateIssue', error as Error)
      throw new Error(`Failed to update issue: ${(error as Error).message}`)
    }
  }

  async deleteIssue(issueIdOrKey: string, deleteSubtasks: boolean = false): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_issue', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}`, 'DELETE', undefined, { deleteSubtasks })
      })
    } catch (error) {
      this.logError('deleteIssue', error as Error)
      throw new Error(`Failed to delete issue: ${(error as Error).message}`)
    }
  }

  async transitionIssue(
    issueIdOrKey: string,
    transitionData: {
      transition: {,
        id: string
      }
      fields?: Record<string, unknown>
      update?: Record<string, unknown>
      historyMetadata?: {
        type: string,
        description: string
        descriptionKey: string,
        activityDescription: string
        activityDescriptionKey: string,
        actor: {
          id: string,
          displayName: string
          type: string,
          avatarUrl: string
          url: string
        }
        generator: {,
          id: string
          type: string
        }
        cause: {,
          id: string
          type: string
        }
        extraData: Record<string, unknown>
      }
      properties?: Array<{
        key: string,
        value: any
      }>
    },
  ): Promise<void> {
    try {
      await this.executeWithProtection('api.transition_issue', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}/transitions`, 'POST', transitionData)
      })
    } catch (error) {
      this.logError('transitionIssue', error as Error)
      throw new Error(`Failed to transition issue: ${(error as Error).message}`)
    }
  }

  async getIssueTransitions(issueIdOrKey: string): Promise<{,
    expand: string
    transitions: JiraTransition[]
  }> {
    try {
      const response = await this.executeWithProtection('api.get_issue_transitions', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}/transitions`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getIssueTransitions', error as Error)
      throw new Error(`Failed to get issue transitions: ${(error as Error).message}`)
    }
  }

  async assignIssue(issueIdOrKey: string, accountId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.assign_issue', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}/assignee`, 'PUT', {
          accountId
        })
      })
    } catch (error) {
      this.logError('assignIssue', error as Error)
      throw new Error(`Failed to assign issue: ${(error as Error).message}`)
    }
  }

  async addComment(
    issueIdOrKey: string,
    commentData: {
      body: JiraContent
      visibility?: {
        type: 'group' | 'role',
        value: string
        identifier?: string
      }
      jsdPublic?: boolean
      properties?: Array<{
        key: string,
        value: any
      }>
    },
  ): Promise<JiraComment> {
    try {
      const response = await this.executeWithProtection('api.add_comment', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}/comment`, 'POST', commentData)
      })

      return response
    } catch (error) {
      this.logError('addComment', error as Error)
      throw new Error(`Failed to add comment: ${(error as Error).message}`)
    }
  }

  async getComments(
    issueIdOrKey: string
    params?: {
      startAt?: number
      maxResults?: number
      orderBy?: string
      expand?: string
    },
  ): Promise<{
    startAt: number,
    maxResults: number
    total: number,
    comments: JiraComment[]
  }> {
    try {
      const response = await this.executeWithProtection('api.get_comments', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}/comment`, 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getComments', error as Error)
      throw new Error(`Failed to get comments: ${(error as Error).message}`)
    }
  }

  async addWorklog(
    issueIdOrKey: string,
    worklogData: {
      comment?: JiraContent
      visibility?: {
        type: 'group' | 'role',
        value: string
        identifier?: string
      }
      started: string,
      timeSpent: string
      properties?: Array<{
        key: string,
        value: any
      }>
    },
    params?: {
      notifyUsers?: boolean
      adjustEstimate?: 'new' | 'leave' | 'manual' | 'auto'
      newEstimate?: string
      reduceBy?: string
      expand?: string
      overrideEditableFlag?: boolean
    },
  ): Promise<JiraWorklog> {
    try {
      const response = await this.executeWithProtection('api.add_worklog', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}/worklog`, 'POST', worklogData, params)
      })

      return response
    } catch (error) {
      this.logError('addWorklog', error as Error)
      throw new Error(`Failed to add worklog: ${(error as Error).message}`)
    }
  }

  async getWorklogs(
    issueIdOrKey: string
    params?: {
      startAt?: number
      maxResults?: number
      startedAfter?: number
      startedBefore?: number
      expand?: string
    },
  ): Promise<{
    startAt: number,
    maxResults: number
    total: number,
    worklogs: JiraWorklog[]
  }> {
    try {
      const response = await this.executeWithProtection('api.get_worklogs', async () => {
        return this.makeApiCall(`/issue/${issueIdOrKey}/worklog`, 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getWorklogs', error as Error)
      throw new Error(`Failed to get worklogs: ${(error as Error).message}`)
    }
  }

  async getBoards(params?: {
    startAt?: number
    maxResults?: number
    type?: 'scrum' | 'kanban' | 'simple'
    name?: string
    projectKeyOrId?: string
    accountIdLocation?: string
    projectLocation?: string
    includePrivate?: boolean
    negateLocationFiltering?: boolean
    orderBy?: string
    expand?: string
    filterId?: number
  }): Promise<{
    maxResults: number,
    startAt: number
    total: number,
    isLast: boolean
    values: JiraBoard[]
  }> {
    try {
      const response = await this.executeWithProtection('api.get_boards', async () => {
        return this.makeApiCall('/rest/agile/1.0/board', 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getBoards', error as Error)
      throw new Error(`Failed to get boards: ${(error as Error).message}`)
    }
  }

  async getBoard(boardId: number): Promise<JiraBoard> {
    try {
      const response = await this.executeWithProtection('api.get_board', async () => {
        return this.makeApiCall(`/rest/agile/1.0/board/${boardId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getBoard', error as Error)
      throw new Error(`Failed to get board: ${(error as Error).message}`)
    }
  }

  async getBoardIssues(
    boardId: number
    params?: {
      startAt?: number
      maxResults?: number
      jql?: string
      validateQuery?: boolean
      fields?: string[]
      expand?: string
    },
  ): Promise<{
    expand: string,
    startAt: number
    maxResults: number,
    total: number
    issues: JiraIssue[]
  }> {
    try {
      const response = await this.executeWithProtection('api.get_board_issues', async () => {
        return this.makeApiCall(`/rest/agile/1.0/board/${boardId}/issue`, 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getBoardIssues', error as Error)
      throw new Error(`Failed to get board issues: ${(error as Error).message}`)
    }
  }

  async getSprints(
    boardId: number
    params?: {
      startAt?: number
      maxResults?: number
      state?: 'closed' | 'active' | 'future'
    },
  ): Promise<{
    maxResults: number,
    startAt: number
    isLast: boolean,
    values: JiraSprint[]
  }> {
    try {
      const response = await this.executeWithProtection('api.get_sprints', async () => {
        return this.makeApiCall(`/rest/agile/1.0/board/${boardId}/sprint`, 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getSprints', error as Error)
      throw new Error(`Failed to get sprints: ${(error as Error).message}`)
    }
  }

  async getSprint(sprintId: number): Promise<JiraSprint> {
    try {
      const response = await this.executeWithProtection('api.get_sprint', async () => {
        return this.makeApiCall(`/rest/agile/1.0/sprint/${sprintId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getSprint', error as Error)
      throw new Error(`Failed to get sprint: ${(error as Error).message}`)
    }
  }

  async getSprintIssues(
    sprintId: number
    params?: {
      startAt?: number
      maxResults?: number
      jql?: string
      validateQuery?: boolean
      fields?: string[]
      expand?: string
    },
  ): Promise<{
    expand: string,
    startAt: number
    maxResults: number,
    total: number
    issues: JiraIssue[]
  }> {
    try {
      const response = await this.executeWithProtection('api.get_sprint_issues', async () => {
        return this.makeApiCall(
          `/rest/agile/1.0/sprint/${sprintId}/issue`,
          'GET',
          undefined,
          params,
        )
      })

      return response
    } catch (error) {
      this.logError('getSprintIssues', error as Error)
      throw new Error(`Failed to get sprint issues: ${(error as Error).message}`)
    }
  }

  async createSprint(sprintData: {,
    name: string
    originBoardId: number
    startDate?: string
    endDate?: string
    goal?: string
  }): Promise<JiraSprint> {
    try {
      const response = await this.executeWithProtection('api.create_sprint', async () => {
        return this.makeApiCall('/rest/agile/1.0/sprint', 'POST', sprintData)
      })

      return response
    } catch (error) {
      this.logError('createSprint', error as Error)
      throw new Error(`Failed to create sprint: ${(error as Error).message}`)
    }
  }

  async updateSprint(
    sprintId: number,
    sprintData: {
      name?: string
      goal?: string
      state?: 'closed' | 'active' | 'future'
      startDate?: string
      endDate?: string
      completeDate?: string
    },
  ): Promise<JiraSprint> {
    try {
      const response = await this.executeWithProtection('api.update_sprint', async () => {
        return this.makeApiCall(`/rest/agile/1.0/sprint/${sprintId}`, 'PUT', sprintData)
      })

      return response
    } catch (error) {
      this.logError('updateSprint', error as Error)
      throw new Error(`Failed to update sprint: ${(error as Error).message}`)
    }
  }

  async deleteSprint(sprintId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_sprint', async () => {
        return this.makeApiCall(`/rest/agile/1.0/sprint/${sprintId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteSprint', error as Error)
      throw new Error(`Failed to delete sprint: ${(error as Error).message}`)
    }
  }

  async getCurrentUser(): Promise<JiraUser> {
    try {
      const response = await this.executeWithProtection('api.get_current_user', async () => {
        return this.makeApiCall('/myself', 'GET')
      })

      return response
    } catch (error) {
      this.logError('getCurrentUser', error as Error)
      throw new Error(`Failed to get current user: ${(error as Error).message}`)
    }
  }

  async searchUsers(
    query: string
    params?: {
      startAt?: number
      maxResults?: number
      includeActive?: boolean
      includeInactive?: boolean
    },
  ): Promise<JiraUser[]> {
    try {
      const response = await this.executeWithProtection('api.search_users', async () => {
        return this.makeApiCall('/user/search', 'GET', undefined, {
          query,
          ...params
        })
      })

      return response
    } catch (error) {
      this.logError('searchUsers', error as Error)
      throw new Error(`Failed to search users: ${(error as Error).message}`)
    }
  }
}
