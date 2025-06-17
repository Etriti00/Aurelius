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

interface PlannerWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface PlannerTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  scope: string
}

interface PlannerPlan {
  id: string,
  title: string
  createdDateTime: string,
  owner: string
  container: {,
    containerId: string
    type: string
  }
}

interface PlannerBucket {
  id: string,
  name: string
  planId: string,
  orderHint: string
}

interface PlannerTask {
  id: string,
  planId: string
  bucketId: string,
  title: string
  orderHint: string,
  assigneePriority: string
  percentComplete: number
  startDateTime?: string
  createdDateTime: string
  dueDateTime?: string
  hasDescription: boolean,
  previewType: string
  completedDateTime?: string
  completedBy?: {
    user: {,
      displayName: string
      id: string
    }
  }
  referenceCount: number,
  checklistItemCount: number
  activeChecklistItemCount: number
  conversationThreadId?: string
}

export class MicrosoftPlannerIntegration extends BaseIntegration {
  readonly provider = 'microsoft-planner'
  readonly name = 'Microsoft Planner'
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
        return this.makeApiCall('/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: [
          'https://graph.microsoft.com/Tasks.ReadWrite',
          'https://graph.microsoft.com/Group.Read.All',
        ],
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
          scope:
            'https://graph.microsoft.com/Tasks.ReadWrite https://graph.microsoft.com/Group.Read.All'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: PlannerTokenResponse = await response.json()

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
      IntegrationCapability.PROJECTS,
      IntegrationCapability.TEAMS,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/me', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: response.id
          displayName: response.displayName,
          userPrincipalName: response.userPrincipalName
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

      // Sync plans
      try {
        const planResult = await this.syncPlans()
        totalProcessed += planResult.processed
        totalErrors += planResult.errors
        if (planResult.errorMessages) {
          errors.push(...planResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Plan sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Microsoft Planner sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const plannerPayload = payload as PlannerWebhookPayload

      switch (plannerPayload.type) {
        case 'planner.plan.created':
        case 'planner.plan.updated':
          await this.handlePlanWebhook(plannerPayload)
          break
        case 'planner.task.created':
        case 'planner.task.updated':
        case 'planner.task.completed':
          await this.handleTaskWebhook(plannerPayload)
          break
        case 'planner.bucket.created':
        case 'planner.bucket.updated':
          await this.handleBucketWebhook(plannerPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${plannerPayload.type}`)
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
  private async syncPlans(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.plans', async () => {
        return this.makeApiCall('/me/planner/plans', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const plans = response.value || []

      for (const plan of plans) {
        try {
          await this.processPlan(plan)
          processed++
        } catch (error) {
          errors.push(`Failed to process plan ${plan.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Plan sync failed: ${(error as Error).message}`)
    }
  }

  private async syncTasks(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.tasks', async () => {
        return this.makeApiCall('/me/planner/tasks', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const tasks = response.value || []

      for (const task of tasks) {
        try {
          await this.processTask(task)
          processed++
        } catch (error) {
          errors.push(`Failed to process task ${task.id}: ${(error as Error).message}`)
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
  private async processPlan(plan: any): Promise<void> {
    this.logger.debug(`Processing Planner plan: ${plan.title}`)
    // Process plan data for Aurelius AI system
  }

  private async processTask(task: any): Promise<void> {
    this.logger.debug(`Processing Planner task: ${task.title}`)
    // Process task data for Aurelius AI system
  }

  // Private webhook handlers
  private async handlePlanWebhook(payload: PlannerWebhookPayload): Promise<void> {
    this.logger.debug(`Handling plan webhook: ${payload.id}`)
    // Handle plan webhook processing
  }

  private async handleTaskWebhook(payload: PlannerWebhookPayload): Promise<void> {
    this.logger.debug(`Handling task webhook: ${payload.id}`)
    // Handle task webhook processing
  }

  private async handleBucketWebhook(payload: PlannerWebhookPayload): Promise<void> {
    this.logger.debug(`Handling bucket webhook: ${payload.id}`)
    // Handle bucket webhook processing
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
        `Planner API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getPlans(): Promise<PlannerPlan[]> {
    try {
      const response = await this.executeWithProtection('api.get_plans', async () => {
        return this.makeApiCall('/me/planner/plans', 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getPlans', error as Error)
      throw new Error(`Failed to get plans: ${(error as Error).message}`)
    }
  }

  async getPlan(planId: string): Promise<PlannerPlan> {
    try {
      const response = await this.executeWithProtection('api.get_plan', async () => {
        return this.makeApiCall(`/planner/plans/${planId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getPlan', error as Error)
      throw new Error(`Failed to get plan: ${(error as Error).message}`)
    }
  }

  async createPlan(planData: {,
    title: string
    container: {,
      containerId: string
      type: string
    }
  }): Promise<PlannerPlan> {
    try {
      const response = await this.executeWithProtection('api.create_plan', async () => {
        return this.makeApiCall('/planner/plans', 'POST', planData)
      })

      return response
    } catch (error) {
      this.logError('createPlan', error as Error)
      throw new Error(`Failed to create plan: ${(error as Error).message}`)
    }
  }

  async updatePlan(
    planId: string,
    planData: {
      title?: string
    },
  ): Promise<PlannerPlan> {
    try {
      const response = await this.executeWithProtection('api.update_plan', async () => {
        return this.makeApiCall(`/planner/plans/${planId}`, 'PATCH', planData)
      })

      return response
    } catch (error) {
      this.logError('updatePlan', error as Error)
      throw new Error(`Failed to update plan: ${(error as Error).message}`)
    }
  }

  async deletePlan(planId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_plan', async () => {
        return this.makeApiCall(`/planner/plans/${planId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deletePlan', error as Error)
      throw new Error(`Failed to delete plan: ${(error as Error).message}`)
    }
  }

  async getBuckets(planId: string): Promise<PlannerBucket[]> {
    try {
      const response = await this.executeWithProtection('api.get_buckets', async () => {
        return this.makeApiCall(`/planner/plans/${planId}/buckets`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getBuckets', error as Error)
      throw new Error(`Failed to get buckets: ${(error as Error).message}`)
    }
  }

  async createBucket(bucketData: {,
    name: string
    planId: string
    orderHint?: string
  }): Promise<PlannerBucket> {
    try {
      const response = await this.executeWithProtection('api.create_bucket', async () => {
        return this.makeApiCall('/planner/buckets', 'POST', bucketData)
      })

      return response
    } catch (error) {
      this.logError('createBucket', error as Error)
      throw new Error(`Failed to create bucket: ${(error as Error).message}`)
    }
  }

  async updateBucket(
    bucketId: string,
    bucketData: {
      name?: string
      orderHint?: string
    },
  ): Promise<PlannerBucket> {
    try {
      const response = await this.executeWithProtection('api.update_bucket', async () => {
        return this.makeApiCall(`/planner/buckets/${bucketId}`, 'PATCH', bucketData)
      })

      return response
    } catch (error) {
      this.logError('updateBucket', error as Error)
      throw new Error(`Failed to update bucket: ${(error as Error).message}`)
    }
  }

  async deleteBucket(bucketId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_bucket', async () => {
        return this.makeApiCall(`/planner/buckets/${bucketId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteBucket', error as Error)
      throw new Error(`Failed to delete bucket: ${(error as Error).message}`)
    }
  }

  async getTasks(planId?: string, bucketId?: string): Promise<PlannerTask[]> {
    try {
      let endpoint = '/me/planner/tasks'
      if (planId) {
        endpoint = `/planner/plans/${planId}/tasks`
      } else if (bucketId) {
        endpoint = `/planner/buckets/${bucketId}/tasks`
      }

      const response = await this.executeWithProtection('api.get_tasks', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getTasks', error as Error)
      throw new Error(`Failed to get tasks: ${(error as Error).message}`)
    }
  }

  async getTask(taskId: string): Promise<PlannerTask> {
    try {
      const response = await this.executeWithProtection('api.get_task', async () => {
        return this.makeApiCall(`/planner/tasks/${taskId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getTask', error as Error)
      throw new Error(`Failed to get task: ${(error as Error).message}`)
    }
  }

  async createTask(taskData: {,
    planId: string
    bucketId?: string
    title: string
    orderHint?: string
    assigneePriority?: string
    percentComplete?: number
    startDateTime?: string
    dueDateTime?: string
  }): Promise<PlannerTask> {
    try {
      const response = await this.executeWithProtection('api.create_task', async () => {
        return this.makeApiCall('/planner/tasks', 'POST', taskData)
      })

      return response
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create task: ${(error as Error).message}`)
    }
  }

  async updateTask(
    taskId: string,
    taskData: {
      title?: string
      bucketId?: string
      orderHint?: string
      assigneePriority?: string
      percentComplete?: number
      startDateTime?: string
      dueDateTime?: string
    },
  ): Promise<PlannerTask> {
    try {
      const response = await this.executeWithProtection('api.update_task', async () => {
        return this.makeApiCall(`/planner/tasks/${taskId}`, 'PATCH', taskData)
      })

      return response
    } catch (error) {
      this.logError('updateTask', error as Error)
      throw new Error(`Failed to update task: ${(error as Error).message}`)
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_task', async () => {
        return this.makeApiCall(`/planner/tasks/${taskId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteTask', error as Error)
      throw new Error(`Failed to delete task: ${(error as Error).message}`)
    }
  }

  async completeTask(taskId: string): Promise<PlannerTask> {
    try {
      const response = await this.executeWithProtection('api.complete_task', async () => {
        return this.makeApiCall(`/planner/tasks/${taskId}`, 'PATCH', {
          percentComplete: 100,
          completedDateTime: new Date().toISOString()
        })
      })

      return response
    } catch (error) {
      this.logError('completeTask', error as Error)
      throw new Error(`Failed to complete task: ${(error as Error).message}`)
    }
  }

  async assignTask(taskId: string, userId: string): Promise<PlannerTask> {
    try {
      // Get current assignments first
      const currentTask = await this.getTask(taskId)

      const response = await this.executeWithProtection('api.assign_task', async () => {
        return this.makeApiCall(`/planner/tasks/${taskId}`, 'PATCH', {
          assignments: {
            ...currentTask.assignments,
            [userId]: {
              '@odata.type': 'microsoft.graph.plannerAssignment',
              orderHint: ' !'
            }
          }
        })
      })

      return response
    } catch (error) {
      this.logError('assignTask', error as Error)
      throw new Error(`Failed to assign task: ${(error as Error).message}`)
    }
  }

  async unassignTask(taskId: string, userId: string): Promise<PlannerTask> {
    try {
      // Get current assignments first
      const currentTask = await this.getTask(taskId)
      const assignments = { ...currentTask.assignments }
      delete assignments[userId]

      const response = await this.executeWithProtection('api.unassign_task', async () => {
        return this.makeApiCall(`/planner/tasks/${taskId}`, 'PATCH', {
          assignments
        })
      })

      return response
    } catch (error) {
      this.logError('unassignTask', error as Error)
      throw new Error(`Failed to unassign task: ${(error as Error).message}`)
    }
  }
}
