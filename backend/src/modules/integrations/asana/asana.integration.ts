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

interface AsanaWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface AsanaTokenResponse {
  access_token: string,
  refresh_token: string
  expires_in: number,
  token_type: string
}

interface AsanaUser {
  gid: string,
  name: string
  email: string,
  photo: {
    image_21x21: string,
    image_27x27: string
    image_36x36: string,
    image_60x60: string
    image_128x128: string
  }
  resource_type: string,
  workspaces: AsanaWorkspace[]
}

interface AsanaWorkspace {
  gid: string,
  name: string
  resource_type: string,
  email_domains: string[]
  is_organization: boolean
}

interface AsanaProject {
  gid: string,
  name: string
  archived: boolean,
  color: string
  completed: boolean,
  completed_at: string | null
  completed_by: AsanaUser | null,
  created_at: string
  current_status: {,
    gid: string
    title: string,
    text: string
    color: string,
    created_at: string
    created_by: AsanaUser,
    html_text: string
  } | null
  custom_field_settings: unknown[],
  default_view: string
  due_date: string | null,
  due_on: string | null
  html_notes: string,
  icon: string
  members: AsanaUser[],
  modified_at: string
  notes: string,
  owner: AsanaUser | null
  permalink_url: string,
  privacy_setting: string
  public: boolean,
  resource_type: string
  start_on: string | null,
  team: {
    gid: string,
    name: string
    resource_type: string
  } | null
  workspace: AsanaWorkspace
}

interface AsanaTask {
  gid: string,
  name: string
  approval_status: string,
  assignee_status: string
  completed: boolean,
  completed_at: string | null
  completed_by: AsanaUser | null,
  created_at: string
  dependencies: AsanaTask[],
  dependents: AsanaTask[]
  due_at: string | null,
  due_on: string | null
  external: {,
    gid: string
    data: string
  } | null
  hearted: boolean,
  hearts: unknown[]
  html_notes: string,
  is_rendered_as_separator: boolean
  liked: boolean,
  likes: unknown[]
  memberships: {,
    project: AsanaProject
    section: {,
      gid: string
      name: string
    }
  }[]
  modified_at: string,
  notes: string
  num_hearts: number,
  num_likes: number
  num_subtasks: number,
  parent: AsanaTask | null
  permalink_url: string,
  projects: AsanaProject[]
  resource_type: string,
  start_at: string | null
  start_on: string | null,
  tags: {
    gid: string,
    name: string
    color: string,
    notes: string
  }[]
  resource_subtype: string,
  assignee: AsanaUser | null
  custom_fields: unknown[],
  followers: AsanaUser[]
  workspace: AsanaWorkspace
}

export class AsanaIntegration extends BaseIntegration {
  readonly provider = 'asana'
  readonly name = 'Asana'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://app.asana.com/api/1.0'

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
        return this.makeApiCall('/users/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour typical OAuth token expiry
        scope: ['default'],
        data: response?.data
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

      const response = await fetch('https://app.asana.com/-/oauth_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          grant_type: 'refresh_token'
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
          refresh_token: this.refreshTokenValue
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: AsanaTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      this.refreshTokenValue = tokenData.refresh_token

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: ['default']
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
      IntegrationCapability.TASKS,
      IntegrationCapability.PROJECTS,
      IntegrationCapability.TEAMS,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/users/me', 'GET')
      })

      const userData = response?.data

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: userData?.gid
          userName: userData?.name,
          userEmail: userData?.email
          workspaces: userData?.workspaces?.length || 0
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

      // Sync tasks
      try {
        const taskResult = await this.syncTasks()
        totalProcessed += taskResult.processed
        totalErrors += taskResult.errors
        if (taskResult.errorMessages) {
          errors.push(...taskResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Task sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Asana sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const asanaPayload = payload as AsanaWebhookPayload

      switch (asanaPayload.type) {
        case 'asana.task.added':
        case 'asana.task.changed':
        case 'asana.task.removed':
          await this.handleTaskWebhook(asanaPayload)
          break
        case 'asana.project.added':
        case 'asana.project.changed':
        case 'asana.project.removed':
          await this.handleProjectWebhook(asanaPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${asanaPayload.type}`)
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
      // Asana doesn't have a token revocation endpoint, but we can mark as disconnected
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
        return this.makeApiCall('/projects?limit=100', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const projects = response?.data || []

      for (const project of projects) {
        try {
          await this.processProject(project)
          processed++
        } catch (error) {
          errors.push(`Failed to process project ${project.gid}: ${(error as Error).message}`)
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

  private async syncTasks(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.tasks', async () => {
        return this.makeApiCall('/tasks?assignee=me&limit=100&completed_since=now', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const tasks = response?.data || []

      for (const task of tasks) {
        try {
          await this.processTask(task)
          processed++
        } catch (error) {
          errors.push(`Failed to process task ${task.gid}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Task sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processProject(project: any): Promise<void> {
    this.logger.debug(`Processing Asana project: ${project.name}`)
    // Process project data for Aurelius AI system
  }

  private async processTask(task: any): Promise<void> {
    this.logger.debug(`Processing Asana task: ${task.name}`)
    // Process task data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleTaskWebhook(payload: AsanaWebhookPayload): Promise<void> {
    this.logger.debug(`Handling task webhook: ${payload.id}`)
    // Handle task webhook processing
  }

  private async handleProjectWebhook(payload: AsanaWebhookPayload): Promise<void> {
    this.logger.debug(`Handling project webhook: ${payload.id}`)
    // Handle project webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
    body?: unknown,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`

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
        `Asana API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    return response.json()
  }

  // Public API methods
  async getUser(): Promise<AsanaUser> {
    try {
      const response = await this.executeWithProtection('api.get_user', async () => {
        return this.makeApiCall('/users/me', 'GET')
      })

      return response?.data
    } catch (error) {
      this.logError('getUser', error as Error)
      throw new Error(`Failed to get user: ${(error as Error).message}`)
    }
  }

  async getWorkspaces(): Promise<AsanaWorkspace[]> {
    try {
      const response = await this.executeWithProtection('api.get_workspaces', async () => {
        return this.makeApiCall('/workspaces', 'GET')
      })

      return response?.data || []
    } catch (error) {
      this.logError('getWorkspaces', error as Error)
      throw new Error(`Failed to get workspaces: ${(error as Error).message}`)
    }
  }

  async getProjects(workspaceGid?: string): Promise<AsanaProject[]> {
    try {
      const endpoint = workspaceGid ? `/workspaces/${workspaceGid}/projects` : '/projects'

      const response = await this.executeWithProtection('api.get_projects', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.data || []
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get projects: ${(error as Error).message}`)
    }
  }

  async getProject(projectGid: string): Promise<AsanaProject> {
    try {
      const response = await this.executeWithProtection('api.get_project', async () => {
        return this.makeApiCall(`/projects/${projectGid}`, 'GET')
      })

      return response?.data
    } catch (error) {
      this.logError('getProject', error as Error)
      throw new Error(`Failed to get project: ${(error as Error).message}`)
    }
  }

  async createProject(projectData: {,
    name: string
    notes?: string
    color?: string
    due_on?: string
    html_notes?: string
    privacy_setting?: 'public' | 'private_to_team' | 'private_to_workspace'
    team?: string
    workspace?: string
    default_view?: 'list' | 'board' | 'timeline' | 'calendar'
    icon?: string
  }): Promise<AsanaProject> {
    try {
      const response = await this.executeWithProtection('api.create_project', async () => {
        return this.makeApiCall('/projects', 'POST', { data: projectData })
      })

      return response?.data
    } catch (error) {
      this.logError('createProject', error as Error)
      throw new Error(`Failed to create project: ${(error as Error).message}`)
    }
  }

  async updateProject(
    projectGid: string,
    projectData: {
      name?: string
      notes?: string
      color?: string
      due_on?: string
      html_notes?: string
      privacy_setting?: 'public' | 'private_to_team' | 'private_to_workspace'
      default_view?: 'list' | 'board' | 'timeline' | 'calendar'
      icon?: string
      archived?: boolean
    },
  ): Promise<AsanaProject> {
    try {
      const response = await this.executeWithProtection('api.update_project', async () => {
        return this.makeApiCall(`/projects/${projectGid}`, 'PUT', { data: projectData })
      })

      return response?.data
    } catch (error) {
      this.logError('updateProject', error as Error)
      throw new Error(`Failed to update project: ${(error as Error).message}`)
    }
  }

  async deleteProject(projectGid: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_project', async () => {
        return this.makeApiCall(`/projects/${projectGid}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteProject', error as Error)
      throw new Error(`Failed to delete project: ${(error as Error).message}`)
    }
  }

  async getTasks(options?: {
    assignee?: string
    project?: string
    section?: string
    workspace?: string
    completed_since?: string
    modified_since?: string
    limit?: number
    offset?: string
  }): Promise<AsanaTask[]> {
    try {
      const params = new URLSearchParams()
      if (options?.assignee) params.append('assignee', options.assignee)
      if (options?.project) params.append('project', options.project)
      if (options?.section) params.append('section', options.section)
      if (options?.workspace) params.append('workspace', options.workspace)
      if (options?.completed_since) params.append('completed_since', options.completed_since)
      if (options?.modified_since) params.append('modified_since', options.modified_since)
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset)

      const queryString = params.toString()
      const endpoint = queryString ? `/tasks?${queryString}` : '/tasks'

      const response = await this.executeWithProtection('api.get_tasks', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.data || []
    } catch (error) {
      this.logError('getTasks', error as Error)
      throw new Error(`Failed to get tasks: ${(error as Error).message}`)
    }
  }

  async getTask(taskGid: string): Promise<AsanaTask> {
    try {
      const response = await this.executeWithProtection('api.get_task', async () => {
        return this.makeApiCall(`/tasks/${taskGid}`, 'GET')
      })

      return response?.data
    } catch (error) {
      this.logError('getTask', error as Error)
      throw new Error(`Failed to get task: ${(error as Error).message}`)
    }
  }

  async createTask(taskData: {,
    name: string
    notes?: string
    html_notes?: string
    assignee?: string
    projects?: string[]
    parent?: string
    due_on?: string
    due_at?: string
    start_on?: string
    start_at?: string
    completed?: boolean
    approval_status?: 'pending' | 'approved' | 'rejected' | 'changes_requested'
    external?: {
      gid: string,
      data: string
    }
    hearted?: boolean
    liked?: boolean
    resource_subtype?: 'default_task' | 'milestone' | 'section' | 'approval'
    tags?: string[]
    workspace?: string
  }): Promise<AsanaTask> {
    try {
      const response = await this.executeWithProtection('api.create_task', async () => {
        return this.makeApiCall('/tasks', 'POST', { data: taskData })
      })

      return response?.data
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create task: ${(error as Error).message}`)
    }
  }

  async updateTask(
    taskGid: string,
    taskData: {
      name?: string
      notes?: string
      html_notes?: string
      assignee?: string
      parent?: string
      due_on?: string
      due_at?: string
      start_on?: string
      start_at?: string
      completed?: boolean
      approval_status?: 'pending' | 'approved' | 'rejected' | 'changes_requested'
      external?: {
        gid: string,
        data: string
      }
      hearted?: boolean
      liked?: boolean
      resource_subtype?: 'default_task' | 'milestone' | 'section' | 'approval'
    },
  ): Promise<AsanaTask> {
    try {
      const response = await this.executeWithProtection('api.update_task', async () => {
        return this.makeApiCall(`/tasks/${taskGid}`, 'PUT', { data: taskData })
      })

      return response?.data
    } catch (error) {
      this.logError('updateTask', error as Error)
      throw new Error(`Failed to update task: ${(error as Error).message}`)
    }
  }

  async deleteTask(taskGid: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_task', async () => {
        return this.makeApiCall(`/tasks/${taskGid}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteTask', error as Error)
      throw new Error(`Failed to delete task: ${(error as Error).message}`)
    }
  }

  async addTaskToProject(
    taskGid: string,
    projectGid: string
    options?: {
      insertAfter?: string
      insertBefore?: string
      section?: string
    },
  ): Promise<void> {
    try {
      const requestData: unknown = { project: projectGid }
      if (options?.insertAfter) requestData.insert_after = options.insertAfter
      if (options?.insertBefore) requestData.insert_before = options.insertBefore
      if (options?.section) requestData.section = options.section

      await this.executeWithProtection('api.add_task_to_project', async () => {
        return this.makeApiCall(`/tasks/${taskGid}/addProject`, 'POST', { data: requestData })
      })
    } catch (error) {
      this.logError('addTaskToProject', error as Error)
      throw new Error(`Failed to add task to project: ${(error as Error).message}`)
    }
  }

  async removeTaskFromProject(taskGid: string, projectGid: string): Promise<void> {
    try {
      await this.executeWithProtection('api.remove_task_from_project', async () => {
        return this.makeApiCall(`/tasks/${taskGid}/removeProject`, 'POST', {
          data: { project: projectGid }
        })
      })
    } catch (error) {
      this.logError('removeTaskFromProject', error as Error)
      throw new Error(`Failed to remove task from project: ${(error as Error).message}`)
    }
  }

  async createWebhook(webhookData: {,
    resource: string
    target: string
    filters?: {
      action?: string
      fields?: string[]
      resource_type?: string
      resource_subtype?: string
    }[]
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.create_webhook', async () => {
        return this.makeApiCall('/webhooks', 'POST', { data: webhookData })
      })

      return response?.data
    } catch (error) {
      this.logError('createWebhook', error as Error)
      throw new Error(`Failed to create webhook: ${(error as Error).message}`)
    }
  }

  async getWebhooks(workspaceGid: string): Promise<any[]> {
    try {
      const response = await this.executeWithProtection('api.get_webhooks', async () => {
        return this.makeApiCall(`/webhooks?workspace=${workspaceGid}`, 'GET')
      })

      return response?.data || []
    } catch (error) {
      this.logError('getWebhooks', error as Error)
      throw new Error(`Failed to get webhooks: ${(error as Error).message}`)
    }
  }

  async deleteWebhook(webhookGid: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_webhook', async () => {
        return this.makeApiCall(`/webhooks/${webhookGid}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteWebhook', error as Error)
      throw new Error(`Failed to delete webhook: ${(error as Error).message}`)
    }
  }
}
