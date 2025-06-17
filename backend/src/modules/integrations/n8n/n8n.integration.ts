import { User } from '@prisma/client'
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
  ApiRequestOptions,
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'
import { ConfigService } from '@nestjs/config'

// Using WebhookPayload from base interface

interface N8NUser {
  id: string,
  email: string
  firstName?: string
  lastName?: string
  createdAt: string,
  updatedAt: string
  isOwner: boolean,
  isPending: boolean
  settings?: Record<string, unknown>
}

interface N8NWorkflow {
  id: string,
  name: string
  active: boolean,
  nodes: Array<{
    id: string,
    name: string
    type: string,
    typeVersion: number
    position: [number, number]
    parameters: Record<string, unknown>
  }>
  connections: Record<string, unknown>
  settings: {,
    executionOrder: string
    saveManualExecutions: boolean,
    callerPolicy: string
    errorWorkflow?: string
  }
  staticData?: Record<string, unknown>
  tags: Array<{,
    id: string
    name: string
  }>
  versionId: string,
  createdAt: string
  updatedAt: string
}

interface N8NExecution {
  id: string,
  workflowId: string
  mode: string
  retryOf?: string
  retrySuccessId?: string
  status: 'new' | 'running' | 'success' | 'error' | 'canceled' | 'waiting'
  waitTill?: string
  startedAt: string
  stoppedAt?: string
  finished: boolean
  data?: {
    resultData: {,
      runData: Record<string, unknown>
      pinData?: Record<string, unknown>
    }
    executionData?: {
      contextData: Record<string, unknown>
      nodeExecutionStack: Array<unknown>,
      metadata: Record<string, unknown>
      waitingExecution: Record<string, unknown>
      waitingExecutionSource: Record<string, unknown>
    }

interface N8NCredential {
  id: string,
  name: string
  type: string
  data?: Record<string, unknown>
  nodesAccess: Array<{,
    nodeType: string
  }>
  sharedWith?: Array<{
    id: string,
    email: string
    firstName?: string,
    lastName?: string
  }>
  createdAt: string,
  updatedAt: string
}

interface N8NVariable {
  id: string,
  key: string
  value?: string
  type: 'string' | 'number' | 'boolean' | 'json',
  createdAt: string
  updatedAt: string
}

export class N8NIntegration extends BaseIntegration {
  private readonly logger = console
  private configService: ConfigService
  readonly provider = 'n8n'
  readonly name = 'n8n'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'workflows', description: 'Manage workflows', enabled: true, requiredScopes: [] },
    { name: 'executions', description: 'Manage executions', enabled: true, requiredScopes: [] },
    { name: 'credentials', description: 'Manage credentials', enabled: true, requiredScopes: [] },
    { name: 'variables', description: 'Manage variables', enabled: true, requiredScopes: [] },
    { name: 'automation', description: 'Automation features', enabled: true, requiredScopes: [] },
    { name: 'webhooks', description: 'Handle webhooks', enabled: true, requiredScopes: [] },
    { name: 'monitoring', description: 'Monitor workflows', enabled: true, requiredScopes: [] },
  ]

  private workflowsCache: Map<string, N8NWorkflow[]> = new Map()
  private executionsCache: Map<string, N8NExecution[]> = new Map()
  private credentialsCache: Map<string, N8NCredential[]> = new Map()
  private variablesCache: Map<string, N8NVariable[]> = new Map()

  async authenticate(config?: IntegrationConfig): Promise<AuthResult> {
    try {
      const tokenResponse = await this.exchangeCodeForToken(config)
      const _userProfile = await this.getMe(tokenResponse.access_token)
  }

      await this.encryptionService.encryptToken(tokenResponse.access_token, config.userId)
      if (tokenResponse.refresh_token) {
        await this.encryptionService.encryptToken(
          tokenResponse.refresh_token,
          `${config.userId}_refresh`,
        )
      }

      return {
        success: true,
        accessToken: tokenResponse.access_token
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000)
      }
    } catch (error) {
      this.logger.error('n8n authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in n8n.integration.ts:', error)
      throw error
    }
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncWorkflows(accessToken),
        this.syncRecentExecutions(accessToken),
        this.syncCredentials(accessToken),
        this.syncVariables(accessToken),
      ])
  }

      const workflowsResult = results[0]
      const executionsResult = results[1]
      const credentialsResult = results[2]
      const variablesResult = results[3]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        itemsProcessed: results.filter(r => r.status === 'fulfilled').length
        itemsSkipped: 0,
        errors: errors.map(e => e.message)
        metadata: {,
          workflows: workflowsResult.status === 'fulfilled' ? workflowsResult.value : []
          executions: executionsResult.status === 'fulfilled' ? executionsResult.value : [],
          credentials: credentialsResult.status === 'fulfilled' ? credentialsResult.value : []
          variables: variablesResult.status === 'fulfilled' ? variablesResult.value : [],
          syncedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      this.logger.error('n8n sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in n8n.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _profile = await this.getMe(accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to get n8n connection status:', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message
      }

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing n8n webhook')
  }

      const data = payload.data
      const eventType = data.eventType || data.type

      switch (eventType) {
        case 'workflow.activated':
        case 'workflow.deactivated':
        case 'workflow.created':
        case 'workflow.updated':
        case 'workflow.deleted':
          await this.handleWorkflowEvent(data)
          break
        case 'execution.started':
        case 'execution.finished':
        case 'execution.failed':
          await this.handleExecutionEvent(data)
          break
        default:
          this.logger.log(`Unhandled n8n webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logger.error('n8n webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in n8n.integration.ts:', error)
      throw error
    }
  // User Management
  async getMe(accessToken?: string): Promise<N8NUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data
  }

  async getUsers(accessToken?: string): Promise<N8NUser[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data || []
  }

  // Workflow Management
  async getWorkflows(
    includeActive?: boolean,
    tags?: string[],
    accessToken?: string,
  ): Promise<N8NWorkflow[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `workflows_${includeActive}_${tags?.join(',') || 'all'}`

    if (this.workflowsCache.has(cacheKey)) {
      return this.workflowsCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {}
    if (includeActive !== undefined) params.includeActive = includeActive.toString()
    if (tags && tags.length > 0) params.tags = tags.join(',')

    const _response = await this.makeRequest('/workflows', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    })

    const workflows = response.data || []
    this.workflowsCache.set(cacheKey, workflows),
    return workflows
  }

  async getWorkflow(workflowId: string, accessToken?: string): Promise<N8NWorkflow> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data
  }

  async createWorkflow(
    workflowData: {,
      name: string
      nodes: Array<unknown>,
      connections: Record<string, unknown>
      active?: boolean
      settings?: Record<string, unknown>,
      tags?: string[]
    },
    accessToken?: string,
  ): Promise<N8NWorkflow> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/workflows', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflowData)
    })

    return (response as Response).data
  }

  async updateWorkflow(
    workflowId: string,
    updates: {
      name?: string
      nodes?: Array<unknown>
      connections?: Record<string, unknown>
      active?: boolean
      settings?: Record<string, unknown>,
      tags?: string[]
    },
    accessToken?: string,
  ): Promise<N8NWorkflow> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/workflows/${workflowId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    return (response as Response).data
  }

  async deleteWorkflow(workflowId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).status === 200 || response.status === 204
  }

  async activateWorkflow(workflowId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).status === 200
  }

  async deactivateWorkflow(workflowId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/workflows/${workflowId}/deactivate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).status === 200
  }

  // Execution Management
  async getExecutions(
    workflowId?: string,
    status?: string,
    limit: number = 20
    accessToken?: string,
  ): Promise<N8NExecution[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `executions_${workflowId || 'all'}_${status || 'all'}_${limit}`

    if (this.executionsCache.has(cacheKey)) {
      return this.executionsCache.get(cacheKey)!
    }

    const params: unknown = { limit: limit.toString() }
    if (workflowId) params.workflowId = workflowId
    if (status) params.status = status

    const _response = await this.makeRequest('/executions', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    })

    const executions = response.data || []
    this.executionsCache.set(cacheKey, executions),
    return executions
  }

  async getExecution(executionId: string, accessToken?: string): Promise<N8NExecution> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/executions/${executionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data
  }

  async executeWorkflow(
    workflowId: string
    inputData?: Record<string, unknown>,
    accessToken?: string,
  ): Promise<N8NExecution> {
    const token = accessToken || (await this.getAccessToken())

    const body: Record<string, unknown> = {}
    if (inputData) body.inputData = inputData

    const _response = await this.makeRequest(`/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    return (response as Response).data
  }

  async retryExecution(executionId: string, accessToken?: string): Promise<N8NExecution> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/executions/${executionId}/retry`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).data
  }

  async stopExecution(executionId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/executions/${executionId}/stop`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).status === 200
  }

  // Credentials Management
  async getCredentials(accessToken?: string): Promise<N8NCredential[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = 'credentials_all'
  }

    if (this.credentialsCache.has(cacheKey)) {
      return this.credentialsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/credentials', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const credentials = response.data || []
    this.credentialsCache.set(cacheKey, credentials),
    return credentials
  }

  async createCredential(
    credentialData: {,
      name: string
      type: string,
      data: Record<string, unknown>
      nodesAccess?: Array<{ nodeType: string }>
    },
    accessToken?: string,
  ): Promise<N8NCredential> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/credentials', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentialData)
    })

    return (response as Response).data
  }

  // Variables Management
  async getVariables(accessToken?: string): Promise<N8NVariable[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = 'variables_all'
  }

    if (this.variablesCache.has(cacheKey)) {
      return this.variablesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/variables', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const variables = response.data || []
    this.variablesCache.set(cacheKey, variables),
    return variables
  }

  async createVariable(
    variableData: {,
      key: string
      value: string
      type?: 'string' | 'number' | 'boolean' | 'json'
    },
    accessToken?: string,
  ): Promise<N8NVariable> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/variables', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(variableData)
    })

    return (response as Response).data
  }

  async updateVariable(
    variableId: string,
    updates: {
      key?: string
      value?: string,
      type?: 'string' | 'number' | 'boolean' | 'json'
    },
    accessToken?: string,
  ): Promise<N8NVariable> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/variables/${variableId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    return (response as Response).data
  }

  // Helper Methods
  private async syncWorkflows(accessToken: string): Promise<N8NWorkflow[]> {
    return this.getWorkflows(undefined, undefined, accessToken)
  }

  private async syncRecentExecutions(accessToken: string): Promise<N8NExecution[]> {
    return this.getExecutions(undefined, undefined, 50, accessToken)
  }

  private async syncCredentials(accessToken: string): Promise<N8NCredential[]> {
    return this.getCredentials(accessToken)
  }

  private async syncVariables(accessToken: string): Promise<N8NVariable[]> {
    return this.getVariables(accessToken)
  }

  private async handleWorkflowEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing workflow _event: ${data.eventType}`)
      this.workflowsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle workflow _event:', error)
    }

  private async handleExecutionEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing execution _event: ${data.eventType}`)
      this.executionsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle execution _event:', error)
    }

  private async exchangeCodeForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch(`${config.apiBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({,
        grant_type: 'authorization_code'
        code: config.code!,
        redirect_uri: config.redirectUri!
        client_id: config.clientId!,
        client_secret: config.clientSecret!
      })
    })

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const baseUrl = this.configService?.get('N8N_API_BASE_URL') || 'https://api.n8n.io'
    const url = `${baseUrl}/api/v1${endpoint}`

    const { params, ...fetchOptions } = options
    let finalUrl = url

    if (params) {
      const queryString = new URLSearchParams(params).toString()
      finalUrl = `${url}?${queryString}`
    }

    const response = await fetch(finalUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const text = await response.text()
    return text ? JSON.parse(text) : { status: response.status }

  private async getAccessToken(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for token retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  clearCache(): void {
    this.workflowsCache.clear()
    this.executionsCache.clear()
    this.credentialsCache.clear()
    this.variablesCache.clear()
  }

  // Missing abstract method implementations
  async refreshToken(): Promise<AuthResult> {
    // OAuth tokens may expire, attempt to refresh
    try {
      const refreshToken = await this.encryptionService.decryptToken(`${this.userId}_refresh`)
      if (!refreshToken) {
        return this.authenticate()
      }
  }

      const response = await fetch(
        `${this.configService?.get('N8N_API_BASE_URL') || 'https://api.n8n.io'}/oauth2/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({,
            grant_type: 'refresh_token'
            refresh_token: refreshToken,
            client_id: this.configService?.get('N8N_CLIENT_ID') || ''
            client_secret: this.configService?.get('N8N_CLIENT_SECRET') || ''
          })
        },
      )

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()
      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000)
      }
    } catch (error) {
      return {
        success: false,
        error: `Token refresh failed: ${(error as Error).message}`
      }

  async revokeAccess(): Promise<boolean> {
    try {
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error(`Failed to revoke ${this.provider} access:`, error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _profile = await this.getMe()
      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }
  }

  getCapabilities(): IntegrationCapability[] {
    return this.capabilities
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const allRequiredScopes = this.capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(this.userId)
      const results = await Promise.allSettled([
        this.syncWorkflows(accessToken),
        this.syncRecentExecutions(accessToken),
        this.syncCredentials(accessToken),
        this.syncVariables(accessToken),
      ])
  }

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason?.message || 'Unknown error')

      const itemsProcessed = results.filter(r => r.status === 'fulfilled').length

      return {
        success: errors.length === 0
        itemsProcessed,
        itemsSkipped: 0
        errors,
        metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
      }
    } catch (error) {
      return {
        success: false,
        itemsProcessed: 0
        itemsSkipped: 0,
        errors: [(error as Error).message]
        metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
      }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // TODO: Implement actual signature validation for n8n webhooks
    return true
  }

}
catch (error) {
  console.error('Error in n8n.integration.ts:', error)
  throw error
}