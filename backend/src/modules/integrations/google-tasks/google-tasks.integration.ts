import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
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

// Using WebhookPayload from base interface

export class GoogleTasksIntegration extends BaseIntegration {
  readonly provider = 'google-tasks'
  readonly name = 'Google Tasks'
  readonly version = '1.0.0'

  private oauth2Client: OAuth2Client
  private tasks: unknown

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.oauth2Client = new google.auth.OAuth2(
      config?.clientId,
      config?.clientSecret,
      config?.redirectUri,
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    this.tasks = google.tasks({ version: 'v1', auth: this.oauth2Client })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting task lists
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.tasks.tasklists.list({ maxResults: 1 })
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: ['https://www.googleapis.com/auth/tasks']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue) {
        throw new AuthenticationError('No refresh token available')
      }
  }

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      this.oauth2Client.setCredentials(credentials)
      this.accessToken = credentials.access_token!

      return {
        success: true,
        accessToken: credentials.access_token!
        refreshToken: credentials.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(credentials.expiry_date!)
        scope: credentials.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in google-tasks.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      await this.oauth2Client.revokeCredentials()
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.executeWithProtection('connection.test', async () => {
        return this.tasks.tasklists.list({ maxResults: 1 })
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.code === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.code === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 500,
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
        name: 'Task Management',
        description: 'Create, read, update, and delete tasks',
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/tasks']
      },
      {
        name: 'Task Lists',
        description: 'Manage task lists and organization'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/tasks']
      },
      {
        name: 'Due Dates',
        description: 'Set and manage task due dates'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/tasks']
      },
      {
        name: 'Task Hierarchy',
        description: 'Create subtasks and task hierarchies'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/tasks']
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

      this.logInfo('syncData', 'Starting Google Tasks sync', { lastSyncTime })

      // Sync task lists
      try {
        const taskListsResult = await this.syncTaskLists()
        totalProcessed += taskListsResult.processed,
        totalSkipped += taskListsResult.skipped
      }
    } catch (error) {
        errors.push(`Task lists sync failed: ${(error as Error).message}`)
        this.logError('syncTaskLists', error as Error)
      }

      catch (error) {
        console.error('Error in google-tasks.integration.ts:', error)
        throw error
      }
      // Sync tasks
      try {
        const tasksResult = await this.syncTasks(lastSyncTime)
        totalProcessed += tasksResult.processed,
        totalSkipped += tasksResult.skipped
      } catch (error) {
        errors.push(`Tasks sync failed: ${(error as Error).message}`)
        this.logError('syncTasks', error as Error)
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
      throw new SyncError('Google Tasks sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Google Tasks webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Google Tasks API doesn't support webhooks natively
      // However, we can simulate webhook events through periodic sync or Google Pub/Sub
      switch (payload._event) {
        case 'task.created':
        case 'task.updated':
        case 'task.deleted':
          await this.handleTaskWebhook(payload.data)
          break
        case 'tasklist.created':
        case 'tasklist.updated':
        case 'tasklist.deleted':
          await this.handleTaskListWebhook(payload.data)
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
      console.error('Error in google-tasks.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Google Tasks doesn't currently support webhooks,
    return true
  }

  // Private sync methods
  private async syncTaskLists(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.executeWithProtection('sync.task_lists', async () => {
        return this.tasks.tasklists.list()
      })

      const taskLists = response.data.items || []
      let processed = 0
      let skipped = 0

      for (const taskList of taskLists) {
        try {
          await this.processTaskList(taskList)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncTaskLists', error as Error, { taskListId: taskList.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTaskLists', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-tasks.integration.ts:', error)
      throw error
    }
  private async syncTasks(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      // Get all task lists first
      const taskListsResponse = await this.executeWithProtection('sync.tasks.lists', async () => {
        return this.tasks.tasklists.list()
      })

      const taskLists = taskListsResponse.data.items || []
      let totalProcessed = 0
      let totalSkipped = 0

      for (const taskList of taskLists) {
        try {
          const tasksResponse = await this.executeWithProtection(
            `sync.tasks.${taskList.id}`,
            async () => {
              return this.tasks.tasks.list({
                tasklist: taskList.id,
                showCompleted: true
                showHidden: true,
                showDeleted: false
                updatedMin: lastSyncTime?.toISOString()
              })
            },
          )
      }

          const tasks = tasksResponse.data.items || []
          let processed = 0
          let skipped = 0

          for (const task of tasks) {
            try {
              if (lastSyncTime && task.updated && new Date(task.updated) <= lastSyncTime) {
                skipped++,
                continue
              }
          }

              await this.processTask(task, taskList),
              processed++
            }
    } catch (error) {
              this.logError('syncTasks', error as Error, {
                taskId: task.id,
                taskListId: taskList.id
              }),
              skipped++
            }

          totalProcessed += processed
          totalSkipped += skipped

          this.logInfo('syncTasks', `Synced task list ${taskList.title}`, {
            taskListId: taskList.id
            processed,
            skipped
          })
        }
    } catch (error) {
          this.logError('syncTasks', error as Error, { taskListId: taskList.id })
          totalSkipped++
        }

      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncTasks', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-tasks.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processTaskList(taskList: unknown): Promise<void> {
    this.logInfo('processTaskList', `Processing task list: ${taskList.title}`, {
      taskListId: taskList.id,
      updated: taskList.updated
    }),

    // Here you would save the task list to your database
  }

  private async processTask(task: unknown, taskList: unknown): Promise<void> {
    this.logInfo('processTask', `Processing task: ${task.title}`, {
      taskId: task.id,
      taskListId: taskList.id
      status: task.status,
      due: task.due
      updated: task.updated
    }),

    // Here you would save the task to your database
  }

  // Private webhook handlers
  private async handleTaskWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleTaskWebhook', 'Processing task webhook', data)
  }

  private async handleTaskListWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleTaskListWebhook', 'Processing task list webhook', data)
  }

  // Public API methods
  async createTaskList(title: string): Promise<string> {
    try {
      const _response = await this.executeWithProtection('api.create_task_list', async () => {
        return this.tasks.tasklists.insert({ requestBody: {
            title }
        })
      })
  }

      return (response as Response).data.id!
    } catch (error) {
      this.logError('createTaskList', error as Error)
      throw new Error(`Failed to create task list: ${(error as Error).message}`)
    }

  async updateTaskList(taskListId: string, title: string): Promise<void> {
    try {
      await this.executeWithProtection('api.update_task_list', async () => {
        return this.tasks.tasklists.update({
          tasklist: taskListId,
          requestBody: {
            id: taskListId
            title
          }
        })
      })
    } catch (error) {
      this.logError('updateTaskList', error as Error)
      throw new Error(`Failed to update task list: ${(error as Error).message}`)
    }

  async deleteTaskList(taskListId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_task_list', async () => {
        return this.tasks.tasklists.delete({ tasklist: taskListId })
      })
    } catch (error) {
      this.logError('deleteTaskList', error as Error)
      throw new Error(`Failed to delete task list: ${(error as Error).message}`)
    }

  async listTaskLists(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_task_lists', async () => {
        return this.tasks.tasklists.list()
      })
  }

      return (response as Response).data.items || []
    } catch (error) {
      this.logError('listTaskLists', error as Error)
      throw new Error(`Failed to list task lists: ${(error as Error).message}`)
    }

  async createTask(
    taskListId: string,
    task: {
      title: string
      notes?: string
      due?: Date
      parent?: string,
      previous?: string
    },
  ): Promise<string> {
    try {
      const taskData: unknown = {,
        title: task.title
        notes: task.notes
      }

      if (task.due) {
        taskData.due = task.due.toISOString().split('T')[0] + 'T00.000Z'
      }

      const _response = await this.executeWithProtection('api.create_task', async () => {
        return this.tasks.tasks.insert({
          tasklist: taskListId,
          parent: task.parent
          previous: task.previous,
          requestBody: taskData
        })
      })

      return (response as Response).data.id!
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create task: ${(error as Error).message}`)
    }

  async updateTask(
    taskListId: string,
    taskId: string
    updates: {
      title?: string
      notes?: string
      due?: Date | null,
      status?: 'needsAction' | 'completed'
    },
  ): Promise<void> {
    try {
      const taskData: unknown = {}

      if (updates.title) taskData.title = updates.title
      if (updates.notes !== undefined) taskData.notes = updates.notes
      if (updates.status) taskData.status = updates.status

      if (updates.due !== undefined) {
        if (updates.due === null) {
          taskData.due = null
        } else {
          taskData.due = updates.due.toISOString().split('T')[0] + 'T00.000Z'
        }
      }

      await this.executeWithProtection('api.update_task', async () => {
        return this.tasks.tasks.update({
          tasklist: taskListId,
          task: taskId
          requestBody: taskData
        })
      })
    }
    } catch (error) {
      this.logError('updateTask', error as Error)
      throw new Error(`Failed to update task: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in google-tasks.integration.ts:', error)
      throw error
    }
  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_task', async () => {
        return this.tasks.tasks.delete({
          tasklist: taskListId,
          task: taskId
        })
      })
    } catch (error) {
      this.logError('deleteTask', error as Error)
      throw new Error(`Failed to delete task: ${(error as Error).message}`)
    }

  async completeTask(taskListId: string, taskId: string): Promise<void> {
    try {
      await this.updateTask(taskListId, taskId, { status: 'completed' })
    } catch (error) {
      this.logError('completeTask', error as Error)
      throw new Error(`Failed to complete task: ${(error as Error).message}`)
    }

  async uncompleteTask(taskListId: string, taskId: string): Promise<void> {
    try {
      await this.updateTask(taskListId, taskId, { status: 'needsAction' })
    } catch (error) {
      this.logError('uncompleteTask', error as Error)
      throw new Error(`Failed to uncomplete task: ${(error as Error).message}`)
    }

  async getTask(taskListId: string, taskId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_task', async () => {
        return this.tasks.tasks.get({
          tasklist: taskListId,
          task: taskId
        })
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getTask', error as Error)
      throw new Error(`Failed to get task: ${(error as Error).message}`)
    }

  async listTasks(
    taskListId: string,
    options: {
      showCompleted?: boolean
      showHidden?: boolean
      dueMin?: Date
      dueMax?: Date
      updatedMin?: Date,
      maxResults?: number
    } = {},
  ): Promise<unknown[]> {
    try {
      const params: unknown = {,
        tasklist: taskListId
        showCompleted: options.showCompleted ?? false,
        showHidden: options.showHidden ?? false
        maxResults: options.maxResults || 100
      }

      if (_options.dueMin) {
        params.dueMin = options.dueMin.toISOString()
      }

      if (_options.dueMax) {
        params.dueMax = options.dueMax.toISOString()
      }

      if (_options.updatedMin) {
        params.updatedMin = options.updatedMin.toISOString()
      }

      const _response = await this.executeWithProtection('api.list_tasks', async () => {
        return this.tasks.tasks.list(params)
      })

      return (response as Response).data.items || []
    } catch (error) {
      this.logError('listTasks', error as Error)
      throw new Error(`Failed to list tasks: ${(error as Error).message}`)
    }

  async moveTask(
    taskListId: string,
    taskId: string
    options: {
      parent?: string,
      previous?: string
    },
  ): Promise<void> {
    try {
      await this.executeWithProtection('api.move_task', async () => {
        return this.tasks.tasks.move({
          tasklist: taskListId,
          task: taskId
          parent: options.parent,
          previous: options.previous
        })
      })
    } catch (error) {
      this.logError('moveTask', error as Error)
      throw new Error(`Failed to move task: ${(error as Error).message}`)
    }

  async clearCompletedTasks(taskListId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.clear_completed_tasks', async () => {
        return this.tasks.tasks.clear({ tasklist: taskListId })
      })
    } catch (error) {
      this.logError('clearCompletedTasks', error as Error)
      throw new Error(`Failed to clear completed tasks: ${(error as Error).message}`)
    }

  async getAllTasks(
    options: {
      showCompleted?: boolean
      dueMin?: Date,
      dueMax?: Date
    } = {},
  ): Promise<Array<{ taskList: unknown; tasks: unknown[] }>> {
    try {
      const taskLists = await this.listTaskLists()
      const allTasks: Array<{ taskList: unknown; tasks: unknown[] }> = []

      for (const taskList of taskLists) {
        try {
          const tasks = await this.listTasks(taskList.id, {
            showCompleted: options.showCompleted,
            dueMin: options.dueMin
            dueMax: options.dueMax,
            maxResults: 1000
          })
      }

          allTasks.push({
            taskList,
            tasks
          })
        }
    } catch (error) {
          this.logError('getAllTasks', error as Error, { taskListId: taskList.id })
        },

      return allTasks
    } catch (error) {
      this.logError('getAllTasks', error as Error)
      throw new Error(`Failed to get all tasks: ${(error as Error).message}`)
    }

}