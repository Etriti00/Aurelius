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

interface MakeWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface MakeTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  token_type: string
}

interface MakeUser {
  id: number,
  name: string
  email: string,
  timezone: string
  currency: string,
  locale: string
  tier: string,
  features: string[]
  created_at: string,
  updated_at: string
}

interface MakeOrganization {
  id: number,
  name: string
  currency: string,
  tier: string
  features: string[],
  created_at: string
  updated_at: string
}

interface MakeTeam {
  id: number,
  name: string
  description?: string
  organization_id: number,
  created_at: string
  updated_at: string
}

interface MakeScenario {
  id: number,
  name: string
  description?: string
  folder_id?: number
  team_id: number,
  organization_id: number
  is_enabled: boolean,
  is_locked: boolean
  scheduling: {,
    type: 'indefinitely' | 'once' | 'interval'
    interval?: number
    interval_unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
    start_date?: string
    end_date?: string
    max_cycles?: number
  }
  created_at: string,
  updated_at: string
  blueprint?: {
    flow: MakeModule[],
    metadata: Record<string, unknown>
  }
  statistics?: {
    executions: number,
    operations: number
    data_transfers: number,
    errors: number
    warnings: number
    last_execution_at?: string
  }
}

interface MakeModule {
  id: number,
  app: string
  module: string,
  version: number
  metadata: {,
    designer: {
      x: number,
      y: number
    }
    restore: Record<string, unknown>
    parameters: Record<string, unknown>
    expect: Array<{,
      name: string
      type: string,
      label: string
      required?: boolean
    }>
  }
  mapper: Record<string, unknown>
  filter?: {
    conditions: Array<{,
      a: any
      b: any,
      o: string
    }>
    logic: 'and' | 'or'
  }
}

interface MakeExecution {
  id: number,
  scenario_id: number
  status: 'success' | 'error' | 'warning' | 'incomplete' | 'running',
  started_at: string
  finished_at?: string
  operations: number,
  data_transfer: number
  execution_time: number,
  cycle: number
  log?: MakeExecutionLog[]
}

interface MakeExecutionLog {
  id: number,
  module_id: number
  module_name: string,
  status: 'success' | 'error' | 'warning' | 'incomplete'
  started_at: string
  finished_at?: string
  operations: number,
  data_transfer: number
  data?: any
  error?: {
    message: string
    code?: string
    type?: string
  }
}

interface MakeWebhook {
  id: number,
  name: string
  url: string,
  scenario_id: number
  module_id: number,
  is_enabled: boolean
  created_at: string,
  updated_at: string
}

interface MakeDataStore {
  id: number,
  name: string
  team_id: number,
  size: number
  records: number,
  created_at: string
  updated_at: string
}

interface MakeDataStoreRecord {
  key: string,
  value: any
  created_at: string,
  updated_at: string
}

interface MakeConnection {
  id: number,
  name: string
  app: string,
  type: string
  scope?: string[]
  team_id: number,
  created_at: string
  updated_at: string,
  is_verified: boolean
  metadata?: Record<string, unknown>
}

export class MakeIntegration extends BaseIntegration {
  readonly provider = 'make'
  readonly name = 'Make (Integromat)'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://eu1.make.com/api/v2'

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
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: ['read', 'write'],
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

      const response = await fetch('https://www.integromat.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshTokenValue
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: MakeTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: ['read', 'write']
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
      IntegrationCapability.AUTOMATION,
      IntegrationCapability.WORKFLOWS,
      IntegrationCapability.DATA_PROCESSING,
      IntegrationCapability.WEBHOOKS,
      IntegrationCapability.INTEGRATIONS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/users/me', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: response.id
          userName: response.name,
          userEmail: response.email
          tier: response.tier,
          timezone: response.timezone
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

      // Sync scenarios
      try {
        const scenarioResult = await this.syncScenarios()
        totalProcessed += scenarioResult.processed
        totalErrors += scenarioResult.errors
        if (scenarioResult.errorMessages) {
          errors.push(...scenarioResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Scenario sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync executions
      try {
        const executionResult = await this.syncExecutions()
        totalProcessed += executionResult.processed
        totalErrors += executionResult.errors
        if (executionResult.errorMessages) {
          errors.push(...executionResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Execution sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync data stores
      try {
        const dataStoreResult = await this.syncDataStores()
        totalProcessed += dataStoreResult.processed
        totalErrors += dataStoreResult.errors
        if (dataStoreResult.errorMessages) {
          errors.push(...dataStoreResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Data store sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Make sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const makePayload = payload as MakeWebhookPayload

      switch (makePayload.type) {
        case 'scenario.execution.started':
        case 'scenario.execution.finished':
        case 'scenario.execution.error':
          await this.handleExecutionWebhook(makePayload)
          break
        case 'scenario.enabled':
        case 'scenario.disabled':
        case 'scenario.updated':
          await this.handleScenarioWebhook(makePayload)
          break
        case 'datastore.record.created':
        case 'datastore.record.updated':
        case 'datastore.record.deleted':
          await this.handleDataStoreWebhook(makePayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${makePayload.type}`)
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
      // Make doesn't have a specific disconnect endpoint
      // The access token will naturally expire
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncScenarios(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.scenarios', async () => {
        return this.makeApiCall('/scenarios', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const scenarios = response.scenarios || []

      for (const scenario of scenarios) {
        try {
          await this.processScenario(scenario)
          processed++
        } catch (error) {
          errors.push(`Failed to process scenario ${scenario.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Scenario sync failed: ${(error as Error).message}`)
    }
  }

  private async syncExecutions(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.executions', async () => {
        return this.makeApiCall('/executions', 'GET', undefined, { limit: 100 })
      })

      let processed = 0
      const errors: string[] = []

      const executions = response.executions || []

      for (const execution of executions) {
        try {
          await this.processExecution(execution)
          processed++
        } catch (error) {
          errors.push(`Failed to process execution ${execution.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Execution sync failed: ${(error as Error).message}`)
    }
  }

  private async syncDataStores(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.data_stores', async () => {
        return this.makeApiCall('/datastores', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const dataStores = response.datastores || []

      for (const dataStore of dataStores) {
        try {
          await this.processDataStore(dataStore)
          processed++
        } catch (error) {
          errors.push(`Failed to process data store ${dataStore.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Data store sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processScenario(scenario: any): Promise<void> {
    this.logger.debug(`Processing Make scenario: ${scenario.name}`)
    // Process scenario data for Aurelius AI system
  }

  private async processExecution(execution: any): Promise<void> {
    this.logger.debug(`Processing Make execution: ${execution.id}`)
    // Process execution data for Aurelius AI system
  }

  private async processDataStore(dataStore: any): Promise<void> {
    this.logger.debug(`Processing Make data store: ${dataStore.name}`)
    // Process data store data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleExecutionWebhook(payload: MakeWebhookPayload): Promise<void> {
    this.logger.debug(`Handling execution webhook: ${payload.id}`)
    // Handle execution webhook processing
  }

  private async handleScenarioWebhook(payload: MakeWebhookPayload): Promise<void> {
    this.logger.debug(`Handling scenario webhook: ${payload.id}`)
    // Handle scenario webhook processing
  }

  private async handleDataStoreWebhook(payload: MakeWebhookPayload): Promise<void> {
    this.logger.debug(`Handling data store webhook: ${payload.id}`)
    // Handle data store webhook processing
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
      Authorization: `Token ${this.accessToken}`,
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
        `Make API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getScenarios(): Promise<MakeScenario[]> {
    try {
      const response = await this.executeWithProtection('api.get_scenarios', async () => {
        return this.makeApiCall('/scenarios', 'GET')
      })

      return response.scenarios || []
    } catch (error) {
      this.logError('getScenarios', error as Error)
      throw new Error(`Failed to get scenarios: ${(error as Error).message}`)
    }
  }

  async getScenario(scenarioId: number): Promise<MakeScenario> {
    try {
      const response = await this.executeWithProtection('api.get_scenario', async () => {
        return this.makeApiCall(`/scenarios/${scenarioId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getScenario', error as Error)
      throw new Error(`Failed to get scenario: ${(error as Error).message}`)
    }
  }

  async createScenario(scenarioData: {,
    name: string
    description?: string
    folder_id?: number
    team_id: number
    blueprint?: {
      flow: MakeModule[],
      metadata: Record<string, unknown>
    }
    scheduling?: {
      type: 'indefinitely' | 'once' | 'interval'
      interval?: number
      interval_unit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
      start_date?: string
      end_date?: string
      max_cycles?: number
    }
  }): Promise<MakeScenario> {
    try {
      const response = await this.executeWithProtection('api.create_scenario', async () => {
        return this.makeApiCall('/scenarios', 'POST', scenarioData)
      })

      return response
    } catch (error) {
      this.logError('createScenario', error as Error)
      throw new Error(`Failed to create scenario: ${(error as Error).message}`)
    }
  }

  async updateScenario(
    scenarioId: number,
    scenarioData: Partial<MakeScenario>
  ): Promise<MakeScenario> {
    try {
      const response = await this.executeWithProtection('api.update_scenario', async () => {
        return this.makeApiCall(`/scenarios/${scenarioId}`, 'PATCH', scenarioData)
      })

      return response
    } catch (error) {
      this.logError('updateScenario', error as Error)
      throw new Error(`Failed to update scenario: ${(error as Error).message}`)
    }
  }

  async deleteScenario(scenarioId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_scenario', async () => {
        return this.makeApiCall(`/scenarios/${scenarioId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteScenario', error as Error)
      throw new Error(`Failed to delete scenario: ${(error as Error).message}`)
    }
  }

  async enableScenario(scenarioId: number): Promise<MakeScenario> {
    try {
      const response = await this.executeWithProtection('api.enable_scenario', async () => {
        return this.makeApiCall(`/scenarios/${scenarioId}/enable`, 'POST')
      })

      return response
    } catch (error) {
      this.logError('enableScenario', error as Error)
      throw new Error(`Failed to enable scenario: ${(error as Error).message}`)
    }
  }

  async disableScenario(scenarioId: number): Promise<MakeScenario> {
    try {
      const response = await this.executeWithProtection('api.disable_scenario', async () => {
        return this.makeApiCall(`/scenarios/${scenarioId}/disable`, 'POST')
      })

      return response
    } catch (error) {
      this.logError('disableScenario', error as Error)
      throw new Error(`Failed to disable scenario: ${(error as Error).message}`)
    }
  }

  async runScenario(scenarioId: number): Promise<MakeExecution> {
    try {
      const response = await this.executeWithProtection('api.run_scenario', async () => {
        return this.makeApiCall(`/scenarios/${scenarioId}/run`, 'POST')
      })

      return response
    } catch (error) {
      this.logError('runScenario', error as Error)
      throw new Error(`Failed to run scenario: ${(error as Error).message}`)
    }
  }

  async cloneScenario(
    scenarioId: number,
    cloneData: {
      name: string
      team_id?: number
      folder_id?: number
    },
  ): Promise<MakeScenario> {
    try {
      const response = await this.executeWithProtection('api.clone_scenario', async () => {
        return this.makeApiCall(`/scenarios/${scenarioId}/clone`, 'POST', cloneData)
      })

      return response
    } catch (error) {
      this.logError('cloneScenario', error as Error)
      throw new Error(`Failed to clone scenario: ${(error as Error).message}`)
    }
  }

  async getExecutions(
    scenarioId?: number,
    params?: {
      status?: 'success' | 'error' | 'warning' | 'incomplete' | 'running'
      from?: string
      to?: string
      limit?: number
      offset?: number
    },
  ): Promise<MakeExecution[]> {
    try {
      const endpoint = scenarioId ? `/scenarios/${scenarioId}/executions` : '/executions'

      const response = await this.executeWithProtection('api.get_executions', async () => {
        return this.makeApiCall(endpoint, 'GET', undefined, params)
      })

      return response.executions || []
    } catch (error) {
      this.logError('getExecutions', error as Error)
      throw new Error(`Failed to get executions: ${(error as Error).message}`)
    }
  }

  async getExecution(executionId: number): Promise<MakeExecution> {
    try {
      const response = await this.executeWithProtection('api.get_execution', async () => {
        return this.makeApiCall(`/executions/${executionId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getExecution', error as Error)
      throw new Error(`Failed to get execution: ${(error as Error).message}`)
    }
  }

  async getExecutionLog(executionId: number): Promise<MakeExecutionLog[]> {
    try {
      const response = await this.executeWithProtection('api.get_execution_log', async () => {
        return this.makeApiCall(`/executions/${executionId}/log`, 'GET')
      })

      return response.log || []
    } catch (error) {
      this.logError('getExecutionLog', error as Error)
      throw new Error(`Failed to get execution log: ${(error as Error).message}`)
    }
  }

  async stopExecution(executionId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.stop_execution', async () => {
        return this.makeApiCall(`/executions/${executionId}/stop`, 'POST')
      })
    } catch (error) {
      this.logError('stopExecution', error as Error)
      throw new Error(`Failed to stop execution: ${(error as Error).message}`)
    }
  }

  async getDataStores(): Promise<MakeDataStore[]> {
    try {
      const response = await this.executeWithProtection('api.get_data_stores', async () => {
        return this.makeApiCall('/datastores', 'GET')
      })

      return response.datastores || []
    } catch (error) {
      this.logError('getDataStores', error as Error)
      throw new Error(`Failed to get data stores: ${(error as Error).message}`)
    }
  }

  async getDataStore(dataStoreId: number): Promise<MakeDataStore> {
    try {
      const response = await this.executeWithProtection('api.get_data_store', async () => {
        return this.makeApiCall(`/datastores/${dataStoreId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getDataStore', error as Error)
      throw new Error(`Failed to get data store: ${(error as Error).message}`)
    }
  }

  async createDataStore(dataStoreData: { name: string; team_id: number }): Promise<MakeDataStore> {
    try {
      const response = await this.executeWithProtection('api.create_data_store', async () => {
        return this.makeApiCall('/datastores', 'POST', dataStoreData)
      })

      return response
    } catch (error) {
      this.logError('createDataStore', error as Error)
      throw new Error(`Failed to create data store: ${(error as Error).message}`)
    }
  }

  async deleteDataStore(dataStoreId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_data_store', async () => {
        return this.makeApiCall(`/datastores/${dataStoreId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteDataStore', error as Error)
      throw new Error(`Failed to delete data store: ${(error as Error).message}`)
    }
  }

  async getDataStoreRecords(
    dataStoreId: number
    params?: {
      limit?: number
      offset?: number
      key?: string
    },
  ): Promise<MakeDataStoreRecord[]> {
    try {
      const response = await this.executeWithProtection('api.get_data_store_records', async () => {
        return this.makeApiCall(`/datastores/${dataStoreId}/data`, 'GET', undefined, params)
      })

      return response.data || []
    } catch (error) {
      this.logError('getDataStoreRecords', error as Error)
      throw new Error(`Failed to get data store records: ${(error as Error).message}`)
    }
  }

  async getDataStoreRecord(dataStoreId: number, key: string): Promise<MakeDataStoreRecord> {
    try {
      const response = await this.executeWithProtection('api.get_data_store_record', async () => {
        return this.makeApiCall(`/datastores/${dataStoreId}/data/${encodeURIComponent(key)}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getDataStoreRecord', error as Error)
      throw new Error(`Failed to get data store record: ${(error as Error).message}`)
    }
  }

  async createDataStoreRecord(
    dataStoreId: number,
    recordData: {
      key: string,
      value: any
    },
  ): Promise<MakeDataStoreRecord> {
    try {
      const response = await this.executeWithProtection(
        'api.create_data_store_record',
        async () => {
          return this.makeApiCall(`/datastores/${dataStoreId}/data`, 'POST', recordData)
        },
      )

      return response
    } catch (error) {
      this.logError('createDataStoreRecord', error as Error)
      throw new Error(`Failed to create data store record: ${(error as Error).message}`)
    }
  }

  async updateDataStoreRecord(
    dataStoreId: number,
    key: string
    value: any
  ): Promise<MakeDataStoreRecord> {
    try {
      const response = await this.executeWithProtection(
        'api.update_data_store_record',
        async () => {
          return this.makeApiCall(
            `/datastores/${dataStoreId}/data/${encodeURIComponent(key)}`,
            'PUT',
            { value },
          )
        },
      )

      return response
    } catch (error) {
      this.logError('updateDataStoreRecord', error as Error)
      throw new Error(`Failed to update data store record: ${(error as Error).message}`)
    }
  }

  async deleteDataStoreRecord(dataStoreId: number, key: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_data_store_record', async () => {
        return this.makeApiCall(
          `/datastores/${dataStoreId}/data/${encodeURIComponent(key)}`,
          'DELETE',
        )
      })
    } catch (error) {
      this.logError('deleteDataStoreRecord', error as Error)
      throw new Error(`Failed to delete data store record: ${(error as Error).message}`)
    }
  }

  async getWebhooks(scenarioId?: number): Promise<MakeWebhook[]> {
    try {
      const endpoint = scenarioId ? `/scenarios/${scenarioId}/webhooks` : '/webhooks'

      const response = await this.executeWithProtection('api.get_webhooks', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response.webhooks || []
    } catch (error) {
      this.logError('getWebhooks', error as Error)
      throw new Error(`Failed to get webhooks: ${(error as Error).message}`)
    }
  }

  async createWebhook(webhookData: {,
    name: string
    scenario_id: number,
    module_id: number
  }): Promise<MakeWebhook> {
    try {
      const response = await this.executeWithProtection('api.create_webhook', async () => {
        return this.makeApiCall('/webhooks', 'POST', webhookData)
      })

      return response
    } catch (error) {
      this.logError('createWebhook', error as Error)
      throw new Error(`Failed to create webhook: ${(error as Error).message}`)
    }
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_webhook', async () => {
        return this.makeApiCall(`/webhooks/${webhookId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteWebhook', error as Error)
      throw new Error(`Failed to delete webhook: ${(error as Error).message}`)
    }
  }

  async getConnections(): Promise<MakeConnection[]> {
    try {
      const response = await this.executeWithProtection('api.get_connections', async () => {
        return this.makeApiCall('/connections', 'GET')
      })

      return response.connections || []
    } catch (error) {
      this.logError('getConnections', error as Error)
      throw new Error(`Failed to get connections: ${(error as Error).message}`)
    }
  }

  async getConnection(connectionId: number): Promise<MakeConnection> {
    try {
      const response = await this.executeWithProtection('api.get_connection', async () => {
        return this.makeApiCall(`/connections/${connectionId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getConnection', error as Error)
      throw new Error(`Failed to get connection: ${(error as Error).message}`)
    }
  }

  async deleteConnection(connectionId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_connection', async () => {
        return this.makeApiCall(`/connections/${connectionId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteConnection', error as Error)
      throw new Error(`Failed to delete connection: ${(error as Error).message}`)
    }
  }

  async getTeams(): Promise<MakeTeam[]> {
    try {
      const response = await this.executeWithProtection('api.get_teams', async () => {
        return this.makeApiCall('/teams', 'GET')
      })

      return response.teams || []
    } catch (error) {
      this.logError('getTeams', error as Error)
      throw new Error(`Failed to get teams: ${(error as Error).message}`)
    }
  }

  async getOrganizations(): Promise<MakeOrganization[]> {
    try {
      const response = await this.executeWithProtection('api.get_organizations', async () => {
        return this.makeApiCall('/organizations', 'GET')
      })

      return response.organizations || []
    } catch (error) {
      this.logError('getOrganizations', error as Error)
      throw new Error(`Failed to get organizations: ${(error as Error).message}`)
    }
  }

  async getScenarioStatistics(
    scenarioId: number
    params?: {
      from?: string
      to?: string
      granularity?: 'day' | 'hour' | 'minute'
    },
  ): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.get_scenario_statistics', async () => {
        return this.makeApiCall(`/scenarios/${scenarioId}/statistics`, 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getScenarioStatistics', error as Error)
      throw new Error(`Failed to get scenario statistics: ${(error as Error).message}`)
    }
  }

  async getUsageStatistics(params?: {
    from?: string
    to?: string
    granularity?: 'day' | 'hour' | 'minute'
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.get_usage_statistics', async () => {
        return this.makeApiCall('/statistics/usage', 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getUsageStatistics', error as Error)
      throw new Error(`Failed to get usage statistics: ${(error as Error).message}`)
    }
  }
}
