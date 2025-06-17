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

interface TodoWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface TodoTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  scope: string
}

interface TodoList {
  id: string,
  displayName: string
  isOwner: boolean,
  isShared: boolean
  wellknownListName?: 'none' | 'defaultList' | 'flaggedEmails'
  '@odata.etag': string
}

interface TodoTask {
  id: string
  body?: {
    content: string,
    contentType: 'text' | 'html'
  }
  bodyLastModifiedDateTime?: string
  completedDateTime?: {
    dateTime: string,
    timeZone: string
  }
  createdDateTime: string
  dueDateTime?: {
    dateTime: string,
    timeZone: string
  }
  hasAttachments: boolean,
  importance: 'low' | 'normal' | 'high'
  isReminderOn: boolean,
  lastModifiedDateTime: string
  recurrence?: {
    pattern: {,
      type:
        | 'daily'
        | 'weekly'
        | 'absoluteMonthly'
        | 'relativeMonthly'
        | 'absoluteYearly'
        | 'relativeYearly'
      interval: number
      month?: number
      dayOfMonth?: number
      daysOfWeek?: (
        | 'sunday'
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
      )[]
      firstDayOfWeek?:
        | 'sunday'
        | 'monday'
        | 'tuesday'
        | 'wednesday'
        | 'thursday'
        | 'friday'
        | 'saturday'
      index?: 'first' | 'second' | 'third' | 'fourth' | 'last'
    }
    range: {,
      type: 'endDate' | 'noEnd' | 'numbered'
      startDate: string
      endDate?: string
      numberOfOccurrences?: number
    }
  }
  reminderDateTime?: {
    dateTime: string,
    timeZone: string
  }
  startDateTime?: {
    dateTime: string,
    timeZone: string
  }
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred',
  title: string
  '@odata.etag': string
  categories?: string[]
}

interface TodoTaskAttachment {
  id: string,
  name: string
  contentType: string,
  size: number
  lastModifiedDateTime: string
  '@odata.type': string
}

interface TodoLinkedResource {
  id: string,
  webUrl: string
  applicationName: string,
  displayName: string
  '@odata.type': string
}

interface TodoChecklistItem {
  id: string,
  displayName: string
  isChecked: boolean,
  createdDateTime: string
  checkedDateTime?: string
  '@odata.etag': string
}

export class MicrosoftToDoIntegration extends BaseIntegration {
  readonly provider = 'microsoft-todo'
  readonly name = 'Microsoft To Do'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://graph.microsoft.com/v1.0'

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
        return this.makeApiCall('/me/todo/lists', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: ['https://graph.microsoft.com/Tasks.ReadWrite'],
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
          scope: 'https://graph.microsoft.com/Tasks.ReadWrite'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: TodoTokenResponse = await response.json()

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
      IntegrationCapability.TASKS,
      IntegrationCapability.PRODUCTIVITY,
      IntegrationCapability.REMINDERS,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/me/todo/lists', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          listsCount: response.value?.length || 0
          defaultListId: response.value?.find(
            (list: any) => list.wellknownListName === 'defaultList'
          )?.id
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

      // Sync task lists
      try {
        const listResult = await this.syncTaskLists()
        totalProcessed += listResult.processed
        totalErrors += listResult.errors
        if (listResult.errorMessages) {
          errors.push(...listResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Task list sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Microsoft To Do sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const todoPayload = payload as TodoWebhookPayload

      switch (todoPayload.type) {
        case 'todo.task.created':
        case 'todo.task.updated':
        case 'todo.task.completed':
        case 'todo.task.deleted':
          await this.handleTaskWebhook(todoPayload)
          break
        case 'todo.list.created':
        case 'todo.list.updated':
        case 'todo.list.deleted':
          await this.handleListWebhook(todoPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${todoPayload.type}`)
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
      if (this.refreshTokenValue && this.config) {
        await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({,
            token: this.refreshTokenValue
            client_id: this.config.clientId
          })
        })
      }

      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncTaskLists(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.task_lists', async () => {
        return this.makeApiCall('/me/todo/lists', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const lists = response.value || []

      for (const list of lists) {
        try {
          await this.processTaskList(list)
          processed++
        } catch (error) {
          errors.push(`Failed to process task list ${list.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Task list sync failed: ${(error as Error).message}`)
    }
  }

  private async syncTasks(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      // Get all task lists first
      const listsResponse = await this.executeWithProtection('sync.get_lists', async () => {
        return this.makeApiCall('/me/todo/lists', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const lists = listsResponse.value || []

      for (const list of lists) {
        try {
          const tasksResponse = await this.executeWithProtection('sync.tasks', async () => {
            return this.makeApiCall(`/me/todo/lists/${list.id}/tasks`, 'GET')
          })

          const tasks = tasksResponse.value || []

          for (const task of tasks) {
            try {
              await this.processTask(task, list.id)
              processed++
            } catch (error) {
              errors.push(`Failed to process task ${task.id}: ${(error as Error).message}`)
            }
          }
        } catch (error) {
          errors.push(`Failed to sync tasks for list ${list.id}: ${(error as Error).message}`)
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
  private async processTaskList(list: any): Promise<void> {
    this.logger.debug(`Processing Microsoft To Do list: ${list.displayName}`)
    // Process task list data for Aurelius AI system
  }

  private async processTask(task: any, listId: string): Promise<void> {
    this.logger.debug(`Processing Microsoft To Do task: ${task.title}`)
    // Process task data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleTaskWebhook(payload: TodoWebhookPayload): Promise<void> {
    this.logger.debug(`Handling task webhook: ${payload.id}`)
    // Handle task webhook processing
  }

  private async handleListWebhook(payload: TodoWebhookPayload): Promise<void> {
    this.logger.debug(`Handling list webhook: ${payload.id}`)
    // Handle list webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
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
        `Microsoft To Do API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getTaskLists(): Promise<TodoList[]> {
    try {
      const response = await this.executeWithProtection('api.get_task_lists', async () => {
        return this.makeApiCall('/me/todo/lists', 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getTaskLists', error as Error)
      throw new Error(`Failed to get task lists: ${(error as Error).message}`)
    }
  }

  async getTaskList(listId: string): Promise<TodoList> {
    try {
      const response = await this.executeWithProtection('api.get_task_list', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getTaskList', error as Error)
      throw new Error(`Failed to get task list: ${(error as Error).message}`)
    }
  }

  async createTaskList(listData: { displayName: string }): Promise<TodoList> {
    try {
      const response = await this.executeWithProtection('api.create_task_list', async () => {
        return this.makeApiCall('/me/todo/lists', 'POST', listData)
      })

      return response
    } catch (error) {
      this.logError('createTaskList', error as Error)
      throw new Error(`Failed to create task list: ${(error as Error).message}`)
    }
  }

  async updateTaskList(
    listId: string,
    listData: {
      displayName?: string
    },
  ): Promise<TodoList> {
    try {
      const response = await this.executeWithProtection('api.update_task_list', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}`, 'PATCH', listData)
      })

      return response
    } catch (error) {
      this.logError('updateTaskList', error as Error)
      throw new Error(`Failed to update task list: ${(error as Error).message}`)
    }
  }

  async deleteTaskList(listId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_task_list', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteTaskList', error as Error)
      throw new Error(`Failed to delete task list: ${(error as Error).message}`)
    }
  }

  async getTasks(listId: string): Promise<TodoTask[]> {
    try {
      const response = await this.executeWithProtection('api.get_tasks', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getTasks', error as Error)
      throw new Error(`Failed to get tasks: ${(error as Error).message}`)
    }
  }

  async getTask(listId: string, taskId: string): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.get_task', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getTask', error as Error)
      throw new Error(`Failed to get task: ${(error as Error).message}`)
    }
  }

  async createTask(
    listId: string,
    taskData: {
      title: string
      body?: {
        content: string,
        contentType: 'text' | 'html'
      }
      dueDateTime?: {
        dateTime: string,
        timeZone: string
      }
      reminderDateTime?: {
        dateTime: string,
        timeZone: string
      }
      startDateTime?: {
        dateTime: string,
        timeZone: string
      }
      importance?: 'low' | 'normal' | 'high'
      isReminderOn?: boolean
      recurrence?: {
        pattern: {,
          type:
            | 'daily'
            | 'weekly'
            | 'absoluteMonthly'
            | 'relativeMonthly'
            | 'absoluteYearly'
            | 'relativeYearly'
          interval: number
          month?: number
          dayOfMonth?: number
          daysOfWeek?: (
            | 'sunday'
            | 'monday'
            | 'tuesday'
            | 'wednesday'
            | 'thursday'
            | 'friday'
            | 'saturday'
          )[]
          firstDayOfWeek?:
            | 'sunday'
            | 'monday'
            | 'tuesday'
            | 'wednesday'
            | 'thursday'
            | 'friday'
            | 'saturday'
          index?: 'first' | 'second' | 'third' | 'fourth' | 'last'
        }
        range: {,
          type: 'endDate' | 'noEnd' | 'numbered'
          startDate: string
          endDate?: string
          numberOfOccurrences?: number
        }
      }
      categories?: string[]
    },
  ): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.create_task', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks`, 'POST', taskData)
      })

      return response
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create task: ${(error as Error).message}`)
    }
  }

  async updateTask(listId: string, taskId: string, taskData: Partial<TodoTask>): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.update_task', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', taskData)
      })

      return response
    } catch (error) {
      this.logError('updateTask', error as Error)
      throw new Error(`Failed to update task: ${(error as Error).message}`)
    }
  }

  async deleteTask(listId: string, taskId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_task', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteTask', error as Error)
      throw new Error(`Failed to delete task: ${(error as Error).message}`)
    }
  }

  async completeTask(listId: string, taskId: string): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.complete_task', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', {
          status: 'completed',
          completedDateTime: {
            dateTime: new Date().toISOString(),
            timeZone: 'UTC'
          }
        })
      })

      return response
    } catch (error) {
      this.logError('completeTask', error as Error)
      throw new Error(`Failed to complete task: ${(error as Error).message}`)
    }
  }

  async reopenTask(listId: string, taskId: string): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.reopen_task', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', {
          status: 'notStarted',
          completedDateTime: null
        })
      })

      return response
    } catch (error) {
      this.logError('reopenTask', error as Error)
      throw new Error(`Failed to reopen task: ${(error as Error).message}`)
    }
  }

  async getTaskAttachments(listId: string, taskId: string): Promise<TodoTaskAttachment[]> {
    try {
      const response = await this.executeWithProtection('api.get_task_attachments', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}/attachments`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getTaskAttachments', error as Error)
      throw new Error(`Failed to get task attachments: ${(error as Error).message}`)
    }
  }

  async addTaskAttachment(
    listId: string,
    taskId: string
    attachmentData: {,
      name: string
      contentBytes: string
    },
  ): Promise<TodoTaskAttachment> {
    try {
      const response = await this.executeWithProtection('api.add_task_attachment', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}/attachments`, 'POST', {
          '@odata.type': 'microsoft.graph.taskFileAttachment',
          name: attachmentData.name,
          contentBytes: attachmentData.contentBytes
        })
      })

      return response
    } catch (error) {
      this.logError('addTaskAttachment', error as Error)
      throw new Error(`Failed to add task attachment: ${(error as Error).message}`)
    }
  }

  async deleteTaskAttachment(listId: string, taskId: string, attachmentId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_task_attachment', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks/${taskId}/attachments/${attachmentId}`,
          'DELETE',
        )
      })
    } catch (error) {
      this.logError('deleteTaskAttachment', error as Error)
      throw new Error(`Failed to delete task attachment: ${(error as Error).message}`)
    }
  }

  async getLinkedResources(listId: string, taskId: string): Promise<TodoLinkedResource[]> {
    try {
      const response = await this.executeWithProtection('api.get_linked_resources', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}/linkedResources`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getLinkedResources', error as Error)
      throw new Error(`Failed to get linked resources: ${(error as Error).message}`)
    }
  }

  async addLinkedResource(
    listId: string,
    taskId: string
    resourceData: {,
      webUrl: string
      applicationName: string,
      displayName: string
    },
  ): Promise<TodoLinkedResource> {
    try {
      const response = await this.executeWithProtection('api.add_linked_resource', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks/${taskId}/linkedResources`,
          'POST',
          resourceData,
        )
      })

      return response
    } catch (error) {
      this.logError('addLinkedResource', error as Error)
      throw new Error(`Failed to add linked resource: ${(error as Error).message}`)
    }
  }

  async deleteLinkedResource(listId: string, taskId: string, resourceId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_linked_resource', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks/${taskId}/linkedResources/${resourceId}`,
          'DELETE',
        )
      })
    } catch (error) {
      this.logError('deleteLinkedResource', error as Error)
      throw new Error(`Failed to delete linked resource: ${(error as Error).message}`)
    }
  }

  async getChecklistItems(listId: string, taskId: string): Promise<TodoChecklistItem[]> {
    try {
      const response = await this.executeWithProtection('api.get_checklist_items', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getChecklistItems', error as Error)
      throw new Error(`Failed to get checklist items: ${(error as Error).message}`)
    }
  }

  async addChecklistItem(
    listId: string,
    taskId: string
    itemData: {,
      displayName: string
    },
  ): Promise<TodoChecklistItem> {
    try {
      const response = await this.executeWithProtection('api.add_checklist_item', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`,
          'POST',
          itemData,
        )
      })

      return response
    } catch (error) {
      this.logError('addChecklistItem', error as Error)
      throw new Error(`Failed to add checklist item: ${(error as Error).message}`)
    }
  }

  async updateChecklistItem(
    listId: string,
    taskId: string
    itemId: string,
    itemData: {
      displayName?: string
      isChecked?: boolean
    },
  ): Promise<TodoChecklistItem> {
    try {
      const response = await this.executeWithProtection('api.update_checklist_item', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems/${itemId}`,
          'PATCH',
          itemData,
        )
      })

      return response
    } catch (error) {
      this.logError('updateChecklistItem', error as Error)
      throw new Error(`Failed to update checklist item: ${(error as Error).message}`)
    }
  }

  async deleteChecklistItem(listId: string, taskId: string, itemId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_checklist_item', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems/${itemId}`,
          'DELETE',
        )
      })
    } catch (error) {
      this.logError('deleteChecklistItem', error as Error)
      throw new Error(`Failed to delete checklist item: ${(error as Error).message}`)
    }
  }

  async getCompletedTasks(listId: string, days: number = 30): Promise<TodoTask[]> {
    try {
      const sinceDate = new Date()
      sinceDate.setDate(sinceDate.getDate() - days)

      const response = await this.executeWithProtection('api.get_completed_tasks', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks?$filter=status eq 'completed' and completedDateTime/dateTime ge '${sinceDate.toISOString()}'`,
          'GET',
        )
      })

      return response.value || []
    } catch (error) {
      this.logError('getCompletedTasks', error as Error)
      throw new Error(`Failed to get completed tasks: ${(error as Error).message}`)
    }
  }

  async getTasksWithDueDate(listId: string, startDate?: Date, endDate?: Date): Promise<TodoTask[]> {
    try {
      let filter = 'dueDateTime ne null'

      if (startDate) {
        filter += ` and dueDateTime/dateTime ge '${startDate.toISOString()}'`
      }

      if (endDate) {
        filter += ` and dueDateTime/dateTime le '${endDate.toISOString()}'`
      }

      const response = await this.executeWithProtection('api.get_tasks_with_due_date', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks?$filter=${encodeURIComponent(filter)}`,
          'GET',
        )
      })

      return response.value || []
    } catch (error) {
      this.logError('getTasksWithDueDate', error as Error)
      throw new Error(`Failed to get tasks with due date: ${(error as Error).message}`)
    }
  }

  async getImportantTasks(listId: string): Promise<TodoTask[]> {
    try {
      const response = await this.executeWithProtection('api.get_important_tasks', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks?$filter=importance eq 'high'`,
          'GET',
        )
      })

      return response.value || []
    } catch (error) {
      this.logError('getImportantTasks', error as Error)
      throw new Error(`Failed to get important tasks: ${(error as Error).message}`)
    }
  }

  async searchTasks(listId: string, query: string): Promise<TodoTask[]> {
    try {
      const response = await this.executeWithProtection('api.search_tasks', async () => {
        return this.makeApiCall(
          `/me/todo/lists/${listId}/tasks?$filter=contains(title,'${encodeURIComponent(query)}') or contains(body/content,'${encodeURIComponent(query)}')`,
          'GET',
        )
      })

      return response.value || []
    } catch (error) {
      this.logError('searchTasks', error as Error)
      throw new Error(`Failed to search tasks: ${(error as Error).message}`)
    }
  }

  async setTaskReminder(
    listId: string,
    taskId: string
    reminderDateTime: {,
      dateTime: string
      timeZone: string
    },
  ): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.set_task_reminder', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', {
          isReminderOn: true
          reminderDateTime
        })
      })

      return response
    } catch (error) {
      this.logError('setTaskReminder', error as Error)
      throw new Error(`Failed to set task reminder: ${(error as Error).message}`)
    }
  }

  async removeTaskReminder(listId: string, taskId: string): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.remove_task_reminder', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', {
          isReminderOn: false,
          reminderDateTime: null
        })
      })

      return response
    } catch (error) {
      this.logError('removeTaskReminder', error as Error)
      throw new Error(`Failed to remove task reminder: ${(error as Error).message}`)
    }
  }

  async setTaskRecurrence(
    listId: string,
    taskId: string
    recurrence: {,
      pattern: {
        type:
          | 'daily'
          | 'weekly'
          | 'absoluteMonthly'
          | 'relativeMonthly'
          | 'absoluteYearly'
          | 'relativeYearly'
        interval: number
        month?: number
        dayOfMonth?: number
        daysOfWeek?: (
          | 'sunday'
          | 'monday'
          | 'tuesday'
          | 'wednesday'
          | 'thursday'
          | 'friday'
          | 'saturday'
        )[]
        firstDayOfWeek?:
          | 'sunday'
          | 'monday'
          | 'tuesday'
          | 'wednesday'
          | 'thursday'
          | 'friday'
          | 'saturday'
        index?: 'first' | 'second' | 'third' | 'fourth' | 'last'
      }
      range: {,
        type: 'endDate' | 'noEnd' | 'numbered'
        startDate: string
        endDate?: string
        numberOfOccurrences?: number
      }
    },
  ): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.set_task_recurrence', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', {
          recurrence
        })
      })

      return response
    } catch (error) {
      this.logError('setTaskRecurrence', error as Error)
      throw new Error(`Failed to set task recurrence: ${(error as Error).message}`)
    }
  }

  async removeTaskRecurrence(listId: string, taskId: string): Promise<TodoTask> {
    try {
      const response = await this.executeWithProtection('api.remove_task_recurrence', async () => {
        return this.makeApiCall(`/me/todo/lists/${listId}/tasks/${taskId}`, 'PATCH', {
          recurrence: null
        })
      })

      return response
    } catch (error) {
      this.logError('removeTaskRecurrence', error as Error)
      throw new Error(`Failed to remove task recurrence: ${(error as Error).message}`)
    }
  }
}
