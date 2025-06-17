import axios, { AxiosInstance } from 'axios'
import rateLimit from 'axios-rate-limit'
import * as crypto from 'crypto'
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig
} from '../base/integration.interface'
import { ApiResponse, GenericWebhookPayload } from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class ClickUpIntegration extends BaseIntegration {
  readonly provider = 'clickup'
  readonly name = 'ClickUp'
  readonly version = '1.0.0'

  private clickupClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.clickupClient = rateLimit(
      axios.create({
        baseURL: 'https://api.clickup.com/api/v2',
        headers: {
          Authorization: accessToken
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
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.clickupClient.get('/user')
      })
  }

      const _user = response.data.user

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Personal tokens don't expire
        scope: ['read', 'write', 'tasks:create', 'tasks:update', 'spaces:create'],
        metadata: {,
          userInfo: {
            id: user.id,
            username: user.username
            email: user.email
          }
        }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // ClickUp personal tokens don't expire, return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // ClickUp doesn't have a programmatic token revocation endpoint,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _response = await this.executeWithProtection('connection.test', async () => {
        return this.clickupClient.get('/user')
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
        metadata: {,
          userInfo: {
            id: response.data.user.id,
            username: response.data.user.username
            email: response.data.user.email
          }
        }
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
        name: 'Task Management',
        description:
          'Create, read, update and manage tasks with assignments, priorities, and due dates',
        enabled: true,
        requiredScopes: ['read', 'write', 'tasks:create', 'tasks:update'],
        methods: ['getTasks', 'getTask', 'createTask', 'updateTask', 'deleteTask']
      },
      {
        name: 'Space Management',
        description: 'Manage workspaces and organizational spaces'
        enabled: true,
        requiredScopes: ['read', 'write', 'spaces:create'],
        methods: ['getSpaces', 'getSpace', 'createSpace', 'updateSpace', 'deleteSpace']
      },
      {
        name: 'List Management',
        description: 'Organize tasks with lists and folders'
        enabled: true,
        requiredScopes: ['read', 'write'],
        methods: ['getLists', 'getList', 'createList', 'updateList', 'deleteList']
      },
      {
        name: 'Team Management',
        description: 'Access team information and manage team members'
        enabled: true,
        requiredScopes: ['read']
        methods: ['getTeams', 'getTeam', 'getTeamMembers']
      },
      {
        name: 'Comments',
        description: 'Manage task comments and collaboration'
        enabled: true,
        requiredScopes: ['read', 'write'],
        methods: ['getComments', 'createComment', 'updateComment', 'deleteComment']
      },
      {
        name: 'Time Tracking',
        description: 'Track time spent on tasks and projects'
        enabled: true,
        requiredScopes: ['read', 'write'],
        methods: ['getTimeEntries', 'createTimeEntry', 'updateTimeEntry', 'deleteTimeEntry']
      },
      {
        name: 'Real-time Sync',
        description: 'Real-time data synchronization with webhook support'
        enabled: true,
        requiredScopes: ['read', 'write'],
        methods: ['syncData', 'handleWebhook']
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

      this.logInfo('syncData', 'Starting ClickUp sync', { lastSyncTime })

      // Sync core objects in dependency order
      const syncOrder = ['Teams', 'Spaces', 'Lists', 'Tasks', 'Comments']

      for (const objectType of syncOrder) {
        try {
          const result = await this.syncObject(objectType, lastSyncTime)
          totalProcessed += result.processed,
          totalSkipped += result.skipped
        }
      }
    } catch (error) {
          errors.push(`${objectType} sync failed: ${(error as Error).message}`)
          this.logError(`sync${objectType}`, error as Error)
        }

      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider
          lastSyncTime
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('ClickUp sync failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in clickup.integration.ts:', error)
      throw error
    }
  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing ClickUp webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Process webhook based on event type
      switch (payload._event) {
        case 'taskCreated':
        case 'taskUpdated':
        case 'taskDeleted':
          await this.processTaskWebhook(payload.data)
          break
        case 'spaceCreated':
        case 'spaceUpdated':
          await this.processSpaceWebhook(payload.data)
          break
        case 'listCreated':
        case 'listUpdated':
          await this.processListWebhook(payload.data)
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
      console.error('Error in clickup.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      if (!this.config?.webhookSecret) {
        this.logError('validateWebhookSignature', new Error('No webhook secret configured'))
        return false
      }
  }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex')

      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // Private sync methods
  private async syncObject(
    objectType: string
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    let processed = 0,
      skipped = 0

    try {
      switch (objectType) {
        case 'Teams':
          const teams = await this.executeWithProtection('sync.teams', () =>
            this.clickupClient.get('/team'),
          )
          for (const team of teams.data.teams) {
            try {
              await this.processItem(team, 'team'),
              processed++
            } catch {
              skipped++
            }
            catch (error) {
              console.error('Error in clickup.integration.ts:', error)
              throw error
            }
          break
      }
          }

        case 'Spaces':
          const teamsForSpaces = await this.clickupClient.get('/team')
          for (const team of teamsForSpaces.data.teams) {
            const spaces = await this.executeWithProtection('sync.spaces', () =>
              this.clickupClient.get(`/team/${team.id}/space`),
            )
            for (const space of spaces.data.spaces) {
              try {
                await this.processItem(space, 'space'),
                processed++
              } catch {
                skipped++
              }
              catch (error) {
                console.error('Error in clickup.integration.ts:', error)
                throw error
              }
          }
            }
          break

        case 'Lists':
          const teamsForLists = await this.clickupClient.get('/team')
          for (const team of teamsForLists.data.teams) {
            const spaces = await this.clickupClient.get(`/team/${team.id}/space`)
            for (const space of spaces.data.spaces) {
              const lists = await this.executeWithProtection('sync.lists', () =>
                this.clickupClient.get(`/space/${space.id}/list`),
              )
              for (const list of lists.data.lists) {
                try {
                  await this.processItem(list, 'list'),
                  processed++
                } catch {
                  skipped++
                }
                catch (error) {
                  console.error('Error in clickup.integration.ts:', error)
                  throw error
                }
          }
            }
              }
          break

        case 'Tasks':
          const teamsForTasks = await this.clickupClient.get('/team')
          for (const team of teamsForTasks.data.teams) {
            const params = lastSyncTime ? { date_updated_gt: lastSyncTime.getTime() } : {}
            const tasks = await this.executeWithProtection('sync.tasks', () =>
              this.clickupClient.get(`/team/${team.id}/task`, { params }),
            )
            for (const task of tasks.data.tasks) {
              try {
                await this.processItem(task, 'task'),
                processed++
              } catch {
                skipped++
              },
              catch (error) {
                console.error('Error in clickup.integration.ts:', error)
                throw error
              }
          }
            }
          break
      }
    } catch (error) {
      this.logError(`syncObject.${objectType}`, error as Error),
      throw error
    }
    return { processed, skipped }

  // Consolidated processing and webhook handlers
  private async processItem(item: unknown, type: string): Promise<void> {
    // Processing logic consolidated
    this.logInfo(
      `process${type.charAt(0).toUpperCase() + type.slice(1)}`,
      `Processing ${type}: ${item.name} (${item.id})`,
    )
  }

  private async processTaskWebhook(data: Record<string, unknown>): Promise<void> {
    // Task webhook processing
    this.logInfo('processTaskWebhook', 'Processing task webhook', data)
  }

  private async processSpaceWebhook(data: Record<string, unknown>): Promise<void> {
    // Space webhook processing
    this.logInfo('processSpaceWebhook', 'Processing space webhook', data)
  }

  private async processListWebhook(data: Record<string, unknown>): Promise<void> {
    // List webhook processing
    this.logInfo('processListWebhook', 'Processing list webhook', data)
  }

  // Essential API Methods (35 methods total)

  // Task Management (5 methods)
  // Core task operations with full CRUD support
  async getTasks(filters?: {
    listId?: string
    assigneeId?: string
    status?: string
    priority?: number
    dueDateGt?: Date
    dueDateLt?: Date,
    limit?: number
  }): Promise<unknown[]> {
    try {
      const params: Record<string, string | number | boolean> = {}
      if (filters?.assigneeId) params.assignees = [filters.assigneeId]
      if (filters?.status) params.statuses = [filters.status]
      if (filters?.priority) params.priority = filters.priority
      if (filters?.dueDateGt) params.due_date_gt = filters.dueDateGt.getTime()
      if (filters?.dueDateLt) params.due_date_lt = filters.dueDateLt.getTime()

      const _response = await this.executeWithProtection('tasks.get', async () => {
        return this.clickupClient.get(`/list/${filters?.listId}/task`, { params })
      })

      return (response as Response).data.tasks
    } catch (error) {
      this.logError('getTasks', error as Error)
      throw new Error(`Failed to get ClickUp tasks: ${(error as Error).message}`)
    }

  async getTask(taskId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('task.get', async () => {
        return this.clickupClient.get(`/task/${taskId}`)
      })
      return (response as Response).data
    } catch (error) {
      this.logError('getTask', error as Error)
      throw new Error(`Failed to get ClickUp task: ${(error as Error).message}`)
    }

  async createTask(
    listId: string,
    taskData: {
      name: string
      description?: string
      assignees?: string[]
      tags?: string[]
      status?: string
      priority?: number
      dueDate?: Date,
      timeEstimate?: number
    },
  ): Promise<string> {
    try {
      const payload: unknown = {,
        name: taskData.name
        ...(taskData.description && { description: taskData.description }),
        ...(taskData.assignees && { assignees: taskData.assignees }),
        ...(taskData.tags && { tags: taskData.tags }),
        ...(taskData.status && { status: taskData.status }),
        ...(taskData.priority && { priority: taskData.priority }),
        ...(taskData.dueDate && { due_date: taskData.dueDate.getTime() }),
        ...(taskData.timeEstimate && { time_estimate: taskData.timeEstimate })
      }

      const _response = await this.executeWithProtection('task.create', async () => {
        return this.clickupClient.post(`/list/${listId}/task`, payload)
      })

      return (response as Response).data.id
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create ClickUp task: ${(error as Error).message}`)
    }

  async updateTask(
    taskId: string,
    updateData: {
      name?: string
      description?: string
      status?: string
      priority?: number
      dueDate?: Date
      assignees?: { add?: string[]; rem?: string[] }
      timeEstimate?: number
    },
  ): Promise<void> {
    try {
      const payload: unknown = {}
      if (updateData.name) payload.name = updateData.name
      if (updateData.description !== undefined) payload.description = updateData.description
      if (updateData.status) payload.status = updateData.status
      if (updateData.priority !== undefined) payload.priority = updateData.priority
      if (updateData.dueDate) payload.due_date = updateData.dueDate.getTime()
      if (updateData.assignees) payload.assignees = updateData.assignees
      if (updateData.timeEstimate !== undefined) payload.time_estimate = updateData.timeEstimate

      await this.executeWithProtection('task.update', async () => {
        return this.clickupClient.put(`/task/${taskId}`, payload)
      })
    } catch (error) {
      this.logError('updateTask', error as Error)
      throw new Error(`Failed to update ClickUp task: ${(error as Error).message}`)
    }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await this.executeWithProtection('task.delete', async () => {
        return this.clickupClient.delete(`/task/${taskId}`)
      }),
      return true
    } catch (error) {
      this.logError('deleteTask', error as Error)
      throw new Error(`Failed to delete ClickUp task: ${(error as Error).message}`)
    }

  // Space Management (5 methods)
  async getSpaces(teamId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('spaces.get', async () => {
        return this.clickupClient.get(`/team/${teamId}/space`)
      })
      return (response as Response).data.spaces
    } catch (error) {
      this.logError('getSpaces', error as Error)
      throw new Error(`Failed to get ClickUp spaces: ${(error as Error).message}`)
    }

  async getSpace(spaceId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('space.get', async () => {
        return this.clickupClient.get(`/space/${spaceId}`)
      })
      return (response as Response).data
    } catch (error) {
      this.logError('getSpace', error as Error)
      throw new Error(`Failed to get ClickUp space: ${(error as Error).message}`)
    }

  async createSpace(
    teamId: string,
    spaceData: {
      name: string
      color?: string
      avatar?: string
      features?: {
        dueDate?: boolean
        timeTracking?: boolean
        tags?: boolean
        timeEstimates?: boolean
        checklists?: boolean
        customFields?: boolean
        remap?: boolean
        dependencyWarning?: boolean,
        portfolios?: boolean
      },
  ): Promise<string> {
    try {
      const _response = await this.executeWithProtection('space.create', async () => {
        return this.clickupClient.post(`/team/${teamId}/space`, spaceData)
      })
      return (response as Response).data.id
    } catch (error) {
      this.logError('createSpace', error as Error)
      throw new Error(`Failed to create ClickUp space: ${(error as Error).message}`)
    }

  async updateSpace(
    spaceId: string,
    updateData: {
      name?: string
      color?: string,
      avatar?: string
    },
  ): Promise<void> {
    try {
      await this.executeWithProtection('space.update', async () => {
        return this.clickupClient.put(`/space/${spaceId}`, updateData)
      })
    } catch (error) {
      this.logError('updateSpace', error as Error)
      throw new Error(`Failed to update ClickUp space: ${(error as Error).message}`)
    }

  async deleteSpace(spaceId: string): Promise<boolean> {
    try {
      await this.executeWithProtection('space.delete', async () => {
        return this.clickupClient.delete(`/space/${spaceId}`)
      }),
      return true
    } catch (error) {
      this.logError('deleteSpace', error as Error)
      throw new Error(`Failed to delete ClickUp space: ${(error as Error).message}`)
    }

  // List Management (5 methods)
  async getLists(spaceId: string, archived = false): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('lists.get', async () => {
        return this.clickupClient.get(`/space/${spaceId}/list`, {
          params: { archived }
        })
      })
      return (response as Response).data.lists
    } catch (error) {
      this.logError('getLists', error as Error)
      throw new Error(`Failed to get ClickUp lists: ${(error as Error).message}`)
    }

  async getList(listId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('list.get', async () => {
        return this.clickupClient.get(`/list/${listId}`)
      })
      return (response as Response).data
    } catch (error) {
      this.logError('getList', error as Error)
      throw new Error(`Failed to get ClickUp list: ${(error as Error).message}`)
    }

  async createList(
    spaceId: string,
    listData: {
      name: string
      content?: string
      dueDate?: Date
      priority?: number
      assignee?: string,
      status?: string
    },
  ): Promise<string> {
    try {
      const payload: unknown = {,
        name: listData.name
        ...(listData.content && { content: listData.content }),
        ...(listData.dueDate && { due_date: listData.dueDate.getTime() }),
        ...(listData.priority && { priority: listData.priority }),
        ...(listData.assignee && { assignee: listData.assignee }),
        ...(listData.status && { status: listData.status })
      }

      const _response = await this.executeWithProtection('list.create', async () => {
        return this.clickupClient.post(`/space/${spaceId}/list`, payload)
      })
      return (response as Response).data.id
    } catch (error) {
      this.logError('createList', error as Error)
      throw new Error(`Failed to create ClickUp list: ${(error as Error).message}`)
    }

  async updateList(
    listId: string,
    updateData: {
      name?: string
      content?: string
      priority?: number
      assignee?: string,
      color?: string
    },
  ): Promise<void> {
    try {
      await this.executeWithProtection('list.update', async () => {
        return this.clickupClient.put(`/list/${listId}`, updateData)
      })
    } catch (error) {
      this.logError('updateList', error as Error)
      throw new Error(`Failed to update ClickUp list: ${(error as Error).message}`)
    }

  async deleteList(listId: string): Promise<boolean> {
    try {
      await this.executeWithProtection('list.delete', async () => {
        return this.clickupClient.delete(`/list/${listId}`)
      }),
      return true
    } catch (error) {
      this.logError('deleteList', error as Error)
      throw new Error(`Failed to delete ClickUp list: ${(error as Error).message}`)
    }

  // Team Management (3 methods)
  async getTeams(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('teams.get', async () => {
        return this.clickupClient.get('/team')
      })
      return (response as Response).data.teams
    } catch (error) {
      this.logError('getTeams', error as Error)
      throw new Error(`Failed to get ClickUp teams: ${(error as Error).message}`)
    }

  async getTeam(teamId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('team.get', async () => {
        return this.clickupClient.get(`/team/${teamId}`)
      })
      return (response as Response).data.team
    } catch (error) {
      this.logError('getTeam', error as Error)
      throw new Error(`Failed to get ClickUp team: ${(error as Error).message}`)
    }

  async getTeamMembers(teamId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('teamMembers.get', async () => {
        return this.clickupClient.get(`/team/${teamId}/member`)
      })
      return (response as Response).data.members
    } catch (error) {
      this.logError('getTeamMembers', error as Error)
      throw new Error(`Failed to get team members: ${(error as Error).message}`)
    }

  // Comments (4 methods)
  async getComments(taskId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('comments.get', async () => {
        return this.clickupClient.get(`/task/${taskId}/comment`)
      })
      return (response as Response).data.comments
    } catch (error) {
      this.logError('getComments', error as Error)
      throw new Error(`Failed to get ClickUp comments: ${(error as Error).message}`)
    }

  async createComment(
    taskId: string,
    commentData: {
      commentText: string
      assignee?: string,
      notifyAll?: boolean
    },
  ): Promise<string> {
    try {
      const _response = await this.executeWithProtection('comment.create', async () => {
        return this.clickupClient.post(`/task/${taskId}/comment`, {
          comment_text: commentData.commentText
          ...(commentData.assignee && { assignee: commentData.assignee }),
          ...(commentData.notifyAll !== undefined && { notify_all: commentData.notifyAll })
        })
      })
      return (response as Response).data.id
    } catch (error) {
      this.logError('createComment', error as Error)
      throw new Error(`Failed to create ClickUp comment: ${(error as Error).message}`)
    }

  async updateComment(
    commentId: string,
    updateData: {
      commentText: string
      resolved?: boolean
    },
  ): Promise<void> {
    try {
      await this.executeWithProtection('comment.update', async () => {
        return this.clickupClient.put(`/comment/${commentId}`, {
          comment_text: updateData.commentText
          ...(updateData.resolved !== undefined && { resolved: updateData.resolved })
        })
      })
    } catch (error) {
      this.logError('updateComment', error as Error)
      throw new Error(`Failed to update ClickUp comment: ${(error as Error).message}`)
    }

  async deleteComment(commentId: string): Promise<boolean> {
    try {
      await this.executeWithProtection('comment.delete', async () => {
        return this.clickupClient.delete(`/comment/${commentId}`)
      }),
      return true
    } catch (error) {
      this.logError('deleteComment', error as Error)
      throw new Error(`Failed to delete ClickUp comment: ${(error as Error).message}`)
    }

  // Time Tracking (4 methods)
  async getTimeEntries(taskId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('timeEntries.get', async () => {
        return this.clickupClient.get(`/task/${taskId}/time`)
      })
      return (response as Response).data.data
    } catch (error) {
      this.logError('getTimeEntries', error as Error)
      throw new Error(`Failed to get time entries: ${(error as Error).message}`)
    }

  async createTimeEntry(
    taskId: string,
    timeData: {
      description: string,
      time: number
      start?: Date,
      end?: Date
    },
  ): Promise<string> {
    try {
      const payload: unknown = {,
        description: timeData.description
        time: timeData.time
        ...(timeData.start && { start: timeData.start.getTime() }),
        ...(timeData.end && { end: timeData.end.getTime() })
      }

      const _response = await this.executeWithProtection('timeEntry.create', async () => {
        return this.clickupClient.post(`/task/${taskId}/time`, payload)
      })
      return (response as Response).data.data.id
    } catch (error) {
      this.logError('createTimeEntry', error as Error)
      throw new Error(`Failed to create time entry: ${(error as Error).message}`)
    }

  async updateTimeEntry(
    taskId: string,
    intervalId: string
    updateData: {
      description?: string
      time?: number
      start?: Date,
      end?: Date
    },
  ): Promise<void> {
    try {
      const payload: unknown = {}
      if (updateData.description) payload.description = updateData.description
      if (updateData.time !== undefined) payload.time = updateData.time
      if (updateData.start) payload.start = updateData.start.getTime()
      if (updateData.end) payload.end = updateData.end.getTime()

      await this.executeWithProtection('timeEntry.update', async () => {
        return this.clickupClient.put(`/task/${taskId}/time/${intervalId}`, payload)
      })
    } catch (error) {
      this.logError('updateTimeEntry', error as Error)
      throw new Error(`Failed to update time entry: ${(error as Error).message}`)
    }

  async deleteTimeEntry(taskId: string, intervalId: string): Promise<boolean> {
    try {
      await this.executeWithProtection('timeEntry.delete', async () => {
        return this.clickupClient.delete(`/task/${taskId}/time/${intervalId}`)
      }),
      return true
    } catch (error) {
      this.logError('deleteTimeEntry', error as Error)
      throw new Error(`Failed to delete time entry: ${(error as Error).message}`)
    }

  // Additional Helper Methods (9 methods)
  async searchTasks(query: string, teamId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('search.tasks', async () => {
        return this.clickupClient.get(`/team/${teamId}/task`, {
          params: {
            query,
            include_closed: true
          }
        })
      })
      return (response as Response).data.tasks
    } catch (error) {
      this.logError('searchTasks', error as Error)
      throw new Error(`Failed to search ClickUp tasks: ${(error as Error).message}`)
    }

  async getTasksByList(listId: string): Promise<unknown[]> {
    try {
      return this.getTasks({ listId })
    } catch (error) {
      this.logError('getTasksByList', error as Error)
      throw new Error(`Failed to get tasks by list: ${(error as Error).message}`)
    }

  async getTasksByAssignee(teamId: string, assigneeId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('tasksByAssignee.get', async () => {
        return this.clickupClient.get(`/team/${teamId}/task`, {
          params: { assignees: [assigneeId] }
        })
      })
      return (response as Response).data.tasks
    } catch (error) {
      this.logError('getTasksByAssignee', error as Error)
      throw new Error(`Failed to get tasks by assignee: ${(error as Error).message}`)
    }

  async assignTask(taskId: string, assigneeId: string): Promise<void> {
    await this.updateTask(taskId, { assignees: { add: [assigneeId] })
  }

  async unassignTask(taskId: string, assigneeId: string): Promise<void> {
    await this.updateTask(taskId, { assignees: { rem: [assigneeId] })
  }

  async setTaskStatus(taskId: string, status: string): Promise<void> {
    await this.updateTask(taskId, { status })
  }

  async setTaskPriority(taskId: string, priority: number): Promise<void> {
    await this.updateTask(taskId, { priority })
  }

  async setTaskDueDate(taskId: string, dueDate: Date): Promise<void> {
    await this.updateTask(taskId, { dueDate })
  }

  async addTaskTags(taskId: string, tags: string[]): Promise<void> {
    try {
      const task = await this.getTask(taskId)
      const existingTags = task.tags?.map((tag: unknown) => tag.name) || []
      const allTags = [...new Set([...existingTags, ...tags])]
  }
  }
  }

      await this.executeWithProtection('task.addTags', async () => {
        return this.clickupClient.post(`/task/${taskId}/tag`, { tags: allTags })
      })
    } catch (error) {
      this.logError('addTaskTags', error as Error)
      throw new Error(`Failed to add task tags: ${(error as Error).message}`)
    }

}