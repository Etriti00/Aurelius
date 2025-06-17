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

export class WrikeIntegration extends BaseIntegration {
  readonly provider = 'wrike'
  readonly name = 'Wrike'
  readonly version = '1.0.0'

  private wrikeClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Create rate-limited axios client
    this.wrikeClient = rateLimit(
      axios.create({
        baseURL: 'https://www.wrike.com/api/v4',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }),
      {
        maxRequests: 100,
        perMilliseconds: 60000, // 100 requests per minute
      },
    )
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.wrikeClient.get('/contacts')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Permanent tokens don't expire
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Wrike permanent tokens don't expire, so just return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Wrike doesn't have a programmatic way to revoke tokens
      // They must be revoked manually in Wrike settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.wrikeClient.get('/contacts')
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
            limit: 100,
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
        name: 'Tasks',
        description: 'Create, read, update, and manage Wrike tasks',
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Folders',
        description: 'Access and manage project folders'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Projects',
        description: 'Manage projects and their configurations'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Comments',
        description: 'Add and read task comments'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Attachments',
        description: 'Handle task attachments and files'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Time Tracking',
        description: 'Track time on tasks'
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

      this.logInfo('syncData', 'Starting Wrike sync', { lastSyncTime })

      // Sync Folders
      try {
        const foldersResult = await this.syncFolders()
        totalProcessed += foldersResult.processed,
        totalSkipped += foldersResult.skipped
      }
    } catch (error) {
        errors.push(`Folders sync failed: ${(error as Error).message}`)
        this.logError('syncFolders', error as Error)
      }

      catch (error) {
        console.error('Error in wrike.integration.ts:', error)
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
      throw new SyncError('Wrike sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Wrike webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'TaskCreated':
        case 'TaskStatusChanged':
        case 'TaskTitleChanged':
          await this.handleTaskWebhook(payload.data)
          break
        case 'TaskDeleted':
          await this.handleTaskDeletedWebhook(payload.data)
          break
        case 'CommentAdded':
          await this.handleCommentWebhook(payload.data)
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
      console.error('Error in wrike.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Wrike webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncFolders(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.wrikeClient.get('/folders')
      const folders = response.data.data

      let processed = 0
      let skipped = 0

      for (const folder of folders) {
        try {
          await this.processFolder(folder)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncFolders', error as Error, { folderId: folder.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncFolders', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in wrike.integration.ts:', error)
      throw error
    }
  private async syncTasks(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const params: Record<string, string | number | boolean> = {}
      if (lastSyncTime) {
        params.updatedDate = `{"start":"${lastSyncTime.toISOString()}"}`
      }

      const _response = await this.wrikeClient.get('/tasks', { params })
      const tasks = response.data.data

      let processed = 0
      let skipped = 0

      for (const task of tasks) {
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
      console.error('Error in wrike.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processFolder(folder: unknown): Promise<void> {
    this.logInfo('processFolder', `Processing folder: ${folder.id}`)
  }

  private async processTask(task: unknown): Promise<void> {
    this.logInfo('processTask', `Processing task: ${task.id}`)
  }

  // Private webhook handlers
  private async handleTaskWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleTaskWebhook', 'Processing task webhook', data)
  }

  private async handleTaskDeletedWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleTaskDeletedWebhook', 'Processing task deleted webhook', data)
  }

  private async handleCommentWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleCommentWebhook', 'Processing comment webhook', data)
  }

  // Public API methods
  async createTask(
    folderId: string,
    taskData: {
      title: string
      description?: string
      status?: string
      importance?: string
      assignees?: string[]
      dates?: {
        type?: string
        duration?: number
        start?: Date,
        due?: Date
      },
  ): Promise<string> {
    try {
      const data: Record<string, unknown> = {
        title: taskData.title
        ...(taskData.description && { description: taskData.description }),
        ...(taskData.status && { status: taskData.status }),
        ...(taskData.importance && { importance: taskData.importance }),
        ...(taskData.assignees && { responsibles: taskData.assignees }),
        ...(taskData.dates && { dates: taskData.dates })
      }

      const _response = await this.wrikeClient.post(`/folders/${folderId}/tasks`, data)
      return (response as Response).data.data[0].id
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create Wrike task: ${(error as Error).message}`)
    }

  async updateTask(
    taskId: string,
    updateData: {
      title?: string
      description?: string
      status?: string
      importance?: string
      assignees?: string[]
      dates?: {
        type?: string
        duration?: number
        start?: Date,
        due?: Date
      },
  ): Promise<void> {
    try {
      const data: Record<string, unknown> = {}
      if (updateData.title) data.title = updateData.title
      if (updateData.description !== undefined) data.description = updateData.description
      if (updateData.status) data.status = updateData.status
      if (updateData.importance) data.importance = updateData.importance
      if (updateData.assignees) data.responsibles = updateData.assignees
      if (updateData.dates) data.dates = updateData.dates

      await this.wrikeClient.put(`/tasks/${taskId}`, data)
    } catch (error) {
      this.logError('updateTask', error as Error)
      throw new Error(`Failed to update Wrike task: ${(error as Error).message}`)
    }

  async addComment(taskId: string, text: string): Promise<string> {
    try {
      const _response = await this.wrikeClient.post(`/tasks/${taskId}/comments`, {
        text
      })
      return (response as Response).data.data[0].id
    } catch (error) {
      this.logError('addComment', error as Error)
      throw new Error(`Failed to add comment to Wrike task: ${(error as Error).message}`)
    }

  async getTask(taskId: string): Promise<ApiResponse> {
    try {
      const _response = await this.wrikeClient.get(`/tasks/${taskId}`)
      return (response as Response).data.data[0]
    } catch (error) {
      this.logError('getTask', error as Error)
      throw new Error(`Failed to get Wrike task: ${(error as Error).message}`)
    }

  async createFolder(
    parentFolderId: string,
    folderData: {
      title: string
      description?: string
      color?: string,
      sharingPolicy?: string
    },
  ): Promise<string> {
    try {
      const data: Record<string, unknown> = {
        title: folderData.title
        ...(folderData.description && { description: folderData.description }),
        ...(folderData.color && { metadata: [{ key: 'color', value: folderData.color }] }),
        ...(folderData.sharingPolicy && { sharingPolicy: folderData.sharingPolicy })
      }

      const _response = await this.wrikeClient.post(`/folders/${parentFolderId}/folders`, data)
      return (response as Response).data.data[0].id
    } catch (error) {
      this.logError('createFolder', error as Error)
      throw new Error(`Failed to create Wrike folder: ${(error as Error).message}`)
    }

  async createProject(
    folderId: string,
    projectData: {
      title: string
      description?: string
      status?: string
      startDate?: Date
      endDate?: Date,
      ownerIds?: string[]
    },
  ): Promise<string> {
    try {
      const data: Record<string, unknown> = {
        title: projectData.title
        ...(projectData.description && { description: projectData.description }),
        ...(projectData.status && { status: projectData.status }),
        ...(projectData.startDate &&
          projectData.endDate && {
            dates: {,
              type: 'Planned'
              start: projectData.startDate.toISOString(),
              due: projectData.endDate.toISOString()
            }
          }),
        ...(projectData.ownerIds && { ownerIds: projectData.ownerIds })
      }

      // First create the folder/project
      const folderResponse = await this.wrikeClient.post(`/folders/${folderId}/folders`, data)
      const newFolderId = folderResponse.data.data[0].id

      // Then convert it to a project if needed
      const projectResponse = await this.wrikeClient.put(`/folders/${newFolderId}`, {
        project: {,
          ownerIds: projectData.ownerIds || []
          status: projectData.status || 'Green',
          startDate: projectData.startDate?.toISOString()
          endDate: projectData.endDate?.toISOString()
        }
      }),

      return newFolderId
    } catch (error) {
      this.logError('createProject', error as Error)
      throw new Error(`Failed to create Wrike project: ${(error as Error).message}`)
    }

  async getFolders(parentId?: string): Promise<unknown[]> {
    try {
      let url = '/folders'
      if (parentId) {
        url = `/folders/${parentId}/folders`
      }
  }

      const _response = await this.wrikeClient.get(url)
      return (response as Response).data.data
    } catch (error) {
      this.logError('getFolders', error as Error)
      throw new Error(`Failed to get Wrike folders: ${(error as Error).message}`)
    }

  async getTasks(folderId?: string, status?: string): Promise<unknown[]> {
    try {
      const params: Record<string, string | number | boolean> = {}
      if (folderId) params.folderId = folderId
      if (status) params.status = status
  }

      const _response = await this.wrikeClient.get('/tasks', { params })
      return (response as Response).data.data
    } catch (error) {
      this.logError('getTasks', error as Error)
      throw new Error(`Failed to get Wrike tasks: ${(error as Error).message}`)
    }

  async searchTasks(query: {
    title?: string
    status?: string[]
    importance?: string[]
    assignees?: string[]
    folderId?: string
    startDate?: Date,
    endDate?: Date
  }): Promise<unknown[]> {
    try {
      const params: Record<string, string | number | boolean> = {}

      if (query.title) params.title = query.title
      if (query.status) params.status = query.status.join(',')
      if (query.importance) params.importance = query.importance.join(',')
      if (query.assignees) params.responsibles = query.assignees.join(',')
      if (query.folderId) params.folderId = query.folderId
      if (query.startDate && query.endDate) {
        params.updatedDate = JSON.stringify({
          start: query.startDate.toISOString(),
          end: query.endDate.toISOString()
        })
      }

      const _response = await this.wrikeClient.get('/tasks', { params })
      return (response as Response).data.data
    } catch (error) {
      this.logError('searchTasks', error as Error)
      throw new Error(`Failed to search Wrike tasks: ${(error as Error).message}`)
    }

  async getComments(taskId: string): Promise<unknown[]> {
    try {
      const _response = await this.wrikeClient.get(`/tasks/${taskId}/comments`)
      return (response as Response).data.data
    } catch (error) {
      this.logError('getComments', error as Error)
      throw new Error(`Failed to get Wrike comments: ${(error as Error).message}`)
    }

  async addTimeEntry(
    taskId: string,
    timeData: {
      hours: number
      comment?: string,
      date?: Date
    },
  ): Promise<string> {
    try {
      const data: Record<string, unknown> = {
        hours: timeData.hours
        ...(timeData.comment && { comment: timeData.comment }),
        ...(timeData.date && { trackedDate: timeData.date.toISOString().split('T')[0] })
      }

      const _response = await this.wrikeClient.post(`/tasks/${taskId}/timelogs`, data)
      return (response as Response).data.data[0].id
    } catch (error) {
      this.logError('addTimeEntry', error as Error)
      throw new Error(`Failed to add time entry to Wrike task: ${(error as Error).message}`)
    }

}