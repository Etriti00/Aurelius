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

export class TodoistIntegration extends BaseIntegration {
  readonly provider = 'todoist'
  readonly name = 'Todoist'
  readonly version = '1.0.0'

  private todoistClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Create rate-limited axios client
    this.todoistClient = rateLimit(
      axios.create({
        baseURL: 'https://api.todoist.com/rest/v2',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }),
      {
        maxRequests: 450, // 450 requests per 15 minutes
        perMilliseconds: 900000, // 15 minutes
      },
    )
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user projects
      await this.todoistClient.get('/projects')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Todoist tokens don't expire by default
        scope: ['data:read_write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Todoist tokens don't expire by default, so just return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Todoist doesn't have a direct API to revoke access tokens
      // They must be revoked manually in Todoist app settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.todoistClient.get('/projects')
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.response?.status === 401 || err.response?.status === 403) {
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
            limit: 450,
            remaining: 0
            resetTime: new Date(Date.now() + 900000), // 15 minutes
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
        description: 'Access and manage Todoist projects'
        enabled: true,
        requiredScopes: ['data:read_write']
      },
      {
        name: 'Tasks',
        description: 'Create, read, update, and manage tasks',
        enabled: true,
        requiredScopes: ['data:read_write']
      },
      {
        name: 'Sections',
        description: 'Organize tasks with sections'
        enabled: true,
        requiredScopes: ['data:read_write']
      },
      {
        name: 'Comments',
        description: 'Add and manage task comments'
        enabled: true,
        requiredScopes: ['data:read_write']
      },
      {
        name: 'Labels',
        description: 'Create and manage task labels'
        enabled: true,
        requiredScopes: ['data:read_write']
      },
      {
        name: 'Filters',
        description: 'Use custom filters to organize tasks'
        enabled: true,
        requiredScopes: ['data:read_write']
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

      this.logInfo('syncData', 'Starting Todoist sync', { lastSyncTime })

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
        console.error('Error in todoist.integration.ts:', error)
        throw error
      }
      // Sync Tasks
      try {
        const tasksResult = await this.syncTasks(lastSyncTime)
        totalProcessed += tasksResult.processed,
        totalSkipped += tasksResult.skipped
      } catch (error) {
        errors.push(`Tasks sync failed: ${(error as Error).message}`)
        this.logError('syncTasks', error as Error)
      }

      // Sync Labels
      try {
        const labelsResult = await this.syncLabels()
        totalProcessed += labelsResult.processed,
        totalSkipped += labelsResult.skipped
      } catch (error) {
        errors.push(`Labels sync failed: ${(error as Error).message}`)
        this.logError('syncLabels', error as Error)
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
      throw new SyncError('Todoist sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Todoist webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'item:added':
        case 'item:updated':
        case 'item:completed':
        case 'item:uncompleted':
        case 'item:deleted':
          await this.handleTaskWebhook(payload.data)
          break
        case 'project:added':
        case 'project:updated':
        case 'project:deleted':
          await this.handleProjectWebhook(payload.data)
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
      console.error('Error in todoist.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Todoist webhook validation would be implemented here using HMAC,
    return true
  }

  // Private sync methods
  private async syncProjects(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.todoistClient.get('/projects')
      const projects = response.data

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
      console.error('Error in todoist.integration.ts:', error)
      throw error
    }
  private async syncTasks(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let processed = 0
      let skipped = 0

      // Get active tasks
      const activeResponse = await this.todoistClient.get('/tasks')
      const activeTasks = activeResponse.data

      for (const task of activeTasks) {
        try {
          await this.processTask(task)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncTasks', error as Error, { taskId: task.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTasks', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in todoist.integration.ts:', error)
      throw error
    }
  private async syncLabels(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.todoistClient.get('/labels')
      const labels = response.data

      let processed = 0
      let skipped = 0

      for (const label of labels) {
        try {
          await this.processLabel(label)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncLabels', error as Error, { labelId: label.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncLabels', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in todoist.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processProject(_project: unknown): Promise<void> {
    this.logInfo('processProject', `Processing project: ${project.id}`)
  }

  private async processTask(task: unknown): Promise<void> {
    this.logInfo('processTask', `Processing task: ${task.id}`)
  }

  private async processLabel(label: unknown): Promise<void> {
    this.logInfo('processLabel', `Processing label: ${label.id}`)
  }

  // Private webhook handlers
  private async handleTaskWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleTaskWebhook', 'Processing task webhook', data)
  }

  private async handleProjectWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleProjectWebhook', 'Processing project webhook', data)
  }

  // Public API methods
  async createTask(taskData: {,
    content: string
    description?: string
    projectId?: string
    sectionId?: string
    parentId?: string
    order?: number
    labels?: string[]
    priority?: number
    dueString?: string
    dueDate?: string
    dueDatetime?: string
    dueLang?: string,
    assigneeId?: string
  }): Promise<string> {
    try {
      const _response = await this.todoistClient.post('/tasks', taskData)
      return (response as Response).data.id
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create Todoist task: ${(error as Error).message}`)
    }

  async updateTask(
    taskId: string,
    updateData: {
      content?: string
      description?: string
      labels?: string[]
      priority?: number
      dueString?: string
      dueDate?: string
      dueDatetime?: string
      dueLang?: string,
      assigneeId?: string
    },
  ): Promise<void> {
    try {
      await this.todoistClient.post(`/tasks/${taskId}`, updateData)
    } catch (error) {
      this.logError('updateTask', error as Error)
      throw new Error(`Failed to update Todoist task: ${(error as Error).message}`)
    }

  async closeTask(taskId: string): Promise<void> {
    try {
      await this.todoistClient.post(`/tasks/${taskId}/close`)
    } catch (error) {
      this.logError('closeTask', error as Error)
      throw new Error(`Failed to close Todoist task: ${(error as Error).message}`)
    }

  async reopenTask(taskId: string): Promise<void> {
    try {
      await this.todoistClient.post(`/tasks/${taskId}/reopen`)
    } catch (error) {
      this.logError('reopenTask', error as Error)
      throw new Error(`Failed to reopen Todoist task: ${(error as Error).message}`)
    }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.todoistClient.delete(`/tasks/${taskId}`)
    } catch (error) {
      this.logError('deleteTask', error as Error)
      throw new Error(`Failed to delete Todoist task: ${(error as Error).message}`)
    }

  async getTask(taskId: string): Promise<ApiResponse> {
    try {
      const _response = await this.todoistClient.get(`/tasks/${taskId}`)
      return (response as Response).data
    } catch (error) {
      this.logError('getTask', error as Error)
      throw new Error(`Failed to get Todoist task: ${(error as Error).message}`)
    }

  async getTasks(options?: {
    projectId?: string
    sectionId?: string
    label?: string
    filter?: string
    lang?: string,
    ids?: string[]
  }): Promise<unknown[]> {
    try {
      const params = new URLSearchParams()
      if (_options?.projectId) params.append('project_id', _options.projectId)
      if (_options?.sectionId) params.append('section_id', _options.sectionId)
      if (_options?.label) params.append('label', _options.label)
      if (_options?.filter) params.append('filter', _options.filter)
      if (_options?.lang) params.append('lang', _options.lang)
      if (_options?.ids) params.append('ids', _options.ids.join(','))

      const _response = await this.todoistClient.get(`/tasks?${params.toString()}`)
      return (response as Response).data
    } catch (error) {
      this.logError('getTasks', error as Error)
      throw new Error(`Failed to get Todoist tasks: ${(error as Error).message}`)
    }

  async createProject(projectData: {,
    name: string
    parentId?: string
    color?: string
    isFavorite?: boolean,
    viewStyle?: string
  }): Promise<string> {
    try {
      const _response = await this.todoistClient.post('/projects', projectData)
      return (response as Response).data.id
    } catch (error) {
      this.logError('createProject', error as Error)
      throw new Error(`Failed to create Todoist project: ${(error as Error).message}`)
    }

  async updateProject(
    projectId: string,
    updateData: {
      name?: string
      color?: string
      isFavorite?: boolean,
      viewStyle?: string
    },
  ): Promise<void> {
    try {
      await this.todoistClient.post(`/projects/${projectId}`, updateData)
    } catch (error) {
      this.logError('updateProject', error as Error)
      throw new Error(`Failed to update Todoist project: ${(error as Error).message}`)
    }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await this.todoistClient.delete(`/projects/${projectId}`)
    } catch (error) {
      this.logError('deleteProject', error as Error)
      throw new Error(`Failed to delete Todoist project: ${(error as Error).message}`)
    }

  async getProject(projectId: string): Promise<ApiResponse> {
    try {
      const _response = await this.todoistClient.get(`/projects/${projectId}`)
      return (response as Response).data
    } catch (error) {
      this.logError('getProject', error as Error)
      throw new Error(`Failed to get Todoist project: ${(error as Error).message}`)
    }

  async getProjects(): Promise<unknown[]> {
    try {
      const _response = await this.todoistClient.get('/projects')
      return (response as Response).data
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get Todoist projects: ${(error as Error).message}`)
    }

  async createSection(sectionData: {,
    name: string
    projectId: string
    order?: number
  }): Promise<string> {
    try {
      const _response = await this.todoistClient.post('/sections', sectionData)
      return (response as Response).data.id
    } catch (error) {
      this.logError('createSection', error as Error)
      throw new Error(`Failed to create Todoist section: ${(error as Error).message}`)
    }

  async getSections(projectId?: string): Promise<unknown[]> {
    try {
      const params = projectId ? `?project_id=${projectId}` : ''
      const _response = await this.todoistClient.get(`/sections${params}`)
      return (response as Response).data
    } catch (error) {
      this.logError('getSections', error as Error)
      throw new Error(`Failed to get Todoist sections: ${(error as Error).message}`)
    }

  async createLabel(labelData: {,
    name: string
    order?: number
    color?: string,
    isFavorite?: boolean
  }): Promise<string> {
    try {
      const _response = await this.todoistClient.post('/labels', labelData)
      return (response as Response).data.id
    } catch (error) {
      this.logError('createLabel', error as Error)
      throw new Error(`Failed to create Todoist label: ${(error as Error).message}`)
    }

  async getLabels(): Promise<unknown[]> {
    try {
      const _response = await this.todoistClient.get('/labels')
      return (response as Response).data
    } catch (error) {
      this.logError('getLabels', error as Error)
      throw new Error(`Failed to get Todoist labels: ${(error as Error).message}`)
    }

  async createComment(commentData: {
    taskId?: string
    projectId?: string
    content: string
    attachment?: {
      fileName: string,
      fileType: string
      fileUrl: string
    }): Promise<string> {
    try {
      const _response = await this.todoistClient.post('/comments', commentData)
      return (response as Response).data.id
    } catch (error) {
      this.logError('createComment', error as Error)
      throw new Error(`Failed to create Todoist comment: ${(error as Error).message}`)
    }

  async getComments(_options?: { projectId?: string; taskId?: string }): Promise<unknown[]> {
    try {
      const params = new URLSearchParams()
      if (_options?.projectId) params.append('project_id', _options.projectId)
      if (_options?.taskId) params.append('task_id', _options.taskId)
  }

      const _response = await this.todoistClient.get(`/comments?${params.toString()}`)
      return (response as Response).data
    } catch (error) {
      this.logError('getComments', error as Error)
      throw new Error(`Failed to get Todoist comments: ${(error as Error).message}`)
    }

}