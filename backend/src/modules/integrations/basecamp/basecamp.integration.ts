import { User } from '@prisma/client'
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

export class BasecampIntegration extends BaseIntegration {
  readonly provider = 'basecamp'
  readonly name = 'Basecamp'
  readonly version = '1.0.0'

  private basecampClient: AxiosInstance
  private accountId: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Parse access token to get account ID
    const credentials = this.parseAccessToken(accessToken)
    this.accountId = credentials.accountId

    // Create rate-limited axios client
    this.basecampClient = rateLimit(
      axios.create({
        baseURL: `https://3.basecampapi.com/${this.accountId}`,
        headers: {,
          Authorization: `Bearer ${credentials.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Aurelius (contact@aurelius.ai)'
        }
      }),
      {
        maxRequests: 50,
        perMilliseconds: 10000, // 50 requests per 10 seconds
      },
    )
  }

  private parseAccessToken(token: string): { accountId: string; token: string } {
    try {
      // Token format: "accountId:token" (base64 encoded)
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [accountId, tokenValue] = decoded.split(':')
      return { accountId, token: tokenValue } catch {
      // Fallback: assume token is already in correct format
      return JSON.parse(token)
    }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.basecampClient.get('/my/profile.json')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Personal tokens don't have expiration
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Basecamp personal tokens don't expire, so just return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Basecamp doesn't have a programmatic way to revoke tokens
      // They must be revoked manually in Basecamp settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.basecampClient.get('/my/profile.json')
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
            limit: 50,
            remaining: 0
            resetTime: new Date(Date.now() + 10000)
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
        description: 'Access and manage Basecamp projects'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'To-dos',
        description: 'Create, read, update, and manage to-do items',
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Messages',
        description: 'Post and read message board messages'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Documents',
        description: 'Access and manage documents'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Campfires',
        description: 'Access chat rooms and messages'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Schedule',
        description: 'Manage schedule events and milestones'
        enabled: true,
        requiredScopes: ['read', 'write']
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

      this.logInfo('syncData', 'Starting Basecamp sync', { lastSyncTime })

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
        console.error('Error in basecamp.integration.ts:', error)
        throw error
      }
      // Sync To-dos
      try {
        const todosResult = await this.syncTodos(lastSyncTime)
        totalProcessed += todosResult.processed,
        totalSkipped += todosResult.skipped
      } catch (error) {
        errors.push(`To-dos sync failed: ${(error as Error).message}`)
        this.logError('syncTodos', error as Error)
      }

      // Sync Messages
      try {
        const messagesResult = await this.syncMessages(lastSyncTime)
        totalProcessed += messagesResult.processed,
        totalSkipped += messagesResult.skipped
      } catch (error) {
        errors.push(`Messages sync failed: ${(error as Error).message}`)
        this.logError('syncMessages', error as Error)
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
      throw new SyncError('Basecamp sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Basecamp webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'recording_created':
        case 'recording_updated':
          await this.handleRecordingWebhook(payload.data)
          break
        case 'recording_trashed':
          await this.handleRecordingTrashedWebhook(payload.data)
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
      console.error('Error in basecamp.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Basecamp webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncProjects(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.basecampClient.get('/projects.json')
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
      console.error('Error in basecamp.integration.ts:', error)
      throw error
    }
  private async syncTodos(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const projectsResponse = await this.basecampClient.get('/projects.json')
      const projects = projectsResponse.data

      let processed = 0
      let skipped = 0

      for (const project of projects) {
        try {
          // Get todosets for this project
          const todosetResponse = await this.basecampClient.get(
            `/projects/${project.id}/todosets.json`,
          )
          const todosets = todosetResponse.data
      }

          for (const todoset of todosets) {
            try {
              // Get todos from each todoset
              const todosResponse = await this.basecampClient.get(
                `/projects/${project.id}/todosets/${todoset.id}/todos.json`,
              )
              const todos = todosResponse.data
          }

              for (const todo of todos) {
                try {
                  // Filter by lastSyncTime if provided
                  if (lastSyncTime && new Date(todo.updated_at) <= lastSyncTime) {
                    skipped++,
                    continue
                  }
              }

                  await this.processTodo(todo, project, todoset),
                  processed++
                }
    } catch (error) {
                  this.logError('syncTodos', error as Error, { todoId: todo.id })
                  skipped++
                }
    } catch (error) {
              this.logError('syncTodos', error as Error, { todosetId: todoset.id })
            }
    } catch (error) {
          this.logError('syncTodos', error as Error, { projectId: project.id })
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTodos', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in basecamp.integration.ts:', error)
      throw error
    }
  private async syncMessages(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const projectsResponse = await this.basecampClient.get('/projects.json')
      const projects = projectsResponse.data

      let processed = 0
      let skipped = 0

      for (const project of projects) {
        try {
          // Get message board for this project
          const messageboardResponse = await this.basecampClient.get(
            `/projects/${project.id}/message_board.json`,
          )
          const messageboard = messageboardResponse.data
      }

          if (messageboard) {
            // Get messages from the message board
            const messagesResponse = await this.basecampClient.get(
              `/projects/${project.id}/message_boards/${messageboard.id}/messages.json`,
            )
            const messages = messagesResponse.data
          }

            for (const message of messages) {
              try {
                // Filter by lastSyncTime if provided
                if (lastSyncTime && new Date(message.updated_at) <= lastSyncTime) {
                  skipped++,
                  continue
                }
            }

                await this.processMessage(message, project),
                processed++
              }
    } catch (error) {
                this.logError('syncMessages', error as Error, { messageId: message.id })
                skipped++
              }
    } catch (error) {
          this.logError('syncMessages', error as Error, { projectId: project.id })
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncMessages', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in basecamp.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processProject(_project: unknown): Promise<void> {
    this.logInfo('processProject', `Processing project: ${project.id}`)
  }

  private async processTodo(todo: unknown, project: unknown, _todoset: unknown): Promise<void> {
    this.logInfo('processTodo', `Processing todo: ${todo.id}`)
  }

  private async processMessage(message: unknown, project: unknown): Promise<void> {
    this.logInfo('processMessage', `Processing message: ${message.id}`)
  }

  // Private webhook handlers
  private async handleRecordingWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleRecordingWebhook', 'Processing recording webhook', data)
  }

  private async handleRecordingTrashedWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleRecordingTrashedWebhook', 'Processing recording trashed webhook', data)
  }

  // Public API methods
  async createTodo(
    projectId: string,
    todolistId: string
    todoData: {,
      content: string
      description?: string
      assigneeIds?: number[]
      dueOn?: Date
      startsOn?: Date,
      notes?: string
    },
  ): Promise<string> {
    try {
      const data: Record<string, unknown> = {
        content: todoData.content
        ...(todoData.description && { description: todoData.description }),
        ...(todoData.assigneeIds && { assignee_ids: todoData.assigneeIds }),
        ...(todoData.dueOn && { due_on: todoData.dueOn.toISOString().split('T')[0] }),
        ...(todoData.startsOn && { starts_on: todoData.startsOn.toISOString().split('T')[0] }),
        ...(todoData.notes && { notes: todoData.notes })
      }

      const _response = await this.basecampClient.post(
        `/projects/${projectId}/todolists/${todolistId}/todos.json`,
        data,
      )
      return (response as Response).data.id.toString()
    } catch (error) {
      this.logError('createTodo', error as Error)
      throw new Error(`Failed to create Basecamp todo: ${(error as Error).message}`)
    }

  async updateTodo(
    projectId: string,
    todoId: string
    updateData: {
      content?: string
      description?: string
      completed?: boolean
      assigneeIds?: number[],
      dueOn?: Date
    },
  ): Promise<void> {
    try {
      const data: Record<string, unknown> = {}
      if (updateData.content) data.content = updateData.content
      if (updateData.description !== undefined) data.description = updateData.description
      if (updateData.completed !== undefined) data.completed = updateData.completed
      if (updateData.assigneeIds) data.assignee_ids = updateData.assigneeIds
      if (updateData.dueOn) data.due_on = updateData.dueOn.toISOString().split('T')[0]

      await this.basecampClient.put(`/projects/${projectId}/todos/${todoId}.json`, data)
    } catch (error) {
      this.logError('updateTodo', error as Error)
      throw new Error(`Failed to update Basecamp todo: ${(error as Error).message}`)
    }

  async createMessage(
    projectId: string,
    messageboardId: string
    messageData: {,
      subject: string
      content: string
      categoryId?: number
    },
  ): Promise<string> {
    try {
      const data: Record<string, unknown> = {
        subject: messageData.subject,
        content: messageData.content
        ...(messageData.categoryId && { category_id: messageData.categoryId })
      }

      const _response = await this.basecampClient.post(
        `/projects/${projectId}/message_boards/${messageboardId}/messages.json`,
        data,
      )
      return (response as Response).data.id.toString()
    } catch (error) {
      this.logError('createMessage', error as Error)
      throw new Error(`Failed to create Basecamp message: ${(error as Error).message}`)
    }

  async createProject(projectData: { name: string; description?: string }): Promise<string> {
    try {
      const data: Record<string, unknown> = {
        name: projectData.name
        ...(projectData.description && { description: projectData.description })
      }
  }

      const _response = await this.basecampClient.post('/projects.json', data)
      return (response as Response).data.id.toString()
    } catch (error) {
      this.logError('createProject', error as Error)
      throw new Error(`Failed to create Basecamp project: ${(error as Error).message}`)
    }

  async getTodo(projectId: string, todoId: string): Promise<ApiResponse> {
    try {
      const _response = await this.basecampClient.get(`/projects/${projectId}/todos/${todoId}.json`)
      return (response as Response).data
    } catch (error) {
      this.logError('getTodo', error as Error)
      throw new Error(`Failed to get Basecamp todo: ${(error as Error).message}`)
    }

  async getProjects(): Promise<unknown[]> {
    try {
      const _response = await this.basecampClient.get('/projects.json')
      return (response as Response).data
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get Basecamp projects: ${(error as Error).message}`)
    }

  async getTodolists(projectId: string): Promise<unknown[]> {
    try {
      const _response = await this.basecampClient.get(`/projects/${projectId}/todosets.json`)
      return (response as Response).data
    } catch (error) {
      this.logError('getTodolists', error as Error)
      throw new Error(`Failed to get Basecamp todolists: ${(error as Error).message}`)
    }

  async getTodos(projectId: string, todolistId: string, completed?: boolean): Promise<unknown[]> {
    try {
      let url = `/projects/${projectId}/todosets/${todolistId}/todos.json`
      if (completed !== undefined) {
        url += `?completed=${completed}`
      }
  }

      const _response = await this.basecampClient.get(url)
      return (response as Response).data
    } catch (error) {
      this.logError('getTodos', error as Error)
      throw new Error(`Failed to get Basecamp todos: ${(error as Error).message}`)
    }

  async searchRecordings(query: string, projectId?: string): Promise<unknown[]> {
    try {
      let url = `/search.json?q=${encodeURIComponent(query)}`
      if (projectId) {
        url += `&project_id=${projectId}`
      }
  }

      const _response = await this.basecampClient.get(url)
      return (response as Response).data
    } catch (error) {
      this.logError('searchRecordings', error as Error)
      throw new Error(`Failed to search Basecamp recordings: ${(error as Error).message}`)
    }

}