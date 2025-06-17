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
import { AuthenticationError, RateLimitError, SyncError } from '../common/integration.error'
import * as crypto from 'crypto'

// Using WebhookPayload from base interface

export class MicrosoftPowerAutomateIntegration extends BaseIntegration {
  readonly provider = 'microsoft-power-automate'
  readonly name = 'Microsoft Power Automate'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.flow.microsoft.com'

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
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/providers/Microsoft.ProcessSimple/environments', 'GET')
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: ['https://service.flow.microsoft.com//.default']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }
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
          scope: 'https://service.flow.microsoft.com//.default'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()

      this.accessToken = tokenData.access_token

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in microsoft-power-automate.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('No config available for token revocation')
      }
  }

      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          token: this.accessToken
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        })
      })

      return (response as Response).ok
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/providers/Microsoft.ProcessSimple/environments', 'GET')
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
        details: {,
          environmentCount: response.value?.length || 0
          apiVersion: '2016-11-01'
        }
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      if (error instanceof AuthenticationError) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (error instanceof RateLimitError) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 10000,
            remaining: 0
            resetTime: new Date(Date.now() + 3600000)
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Flows Management',
        description:
          'Create, read, update, delete, and manage Power Automate flows with comprehensive lifecycle control',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: [
          'createFlow',
          'getFlow',
          'updateFlow',
          'deleteFlow',
          'getFlows',
          'enableFlow',
          'disableFlow',
        ]
      },
      {
        name: 'Flow Execution & Runs',
        description:
          'Execute flows, monitor runs, track performance, and manage flow execution lifecycle',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: [
          'runFlow',
          'getFlowRuns',
          'getFlowRun',
          'cancelFlowRun',
          'getRunHistory',
          'getRunAnalytics',
        ]
      },
      {
        name: 'Triggers & Conditions',
        description: 'Configure automated triggers, conditions, and event-driven flow execution',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: ['getTriggers', 'createTrigger', 'updateTrigger', 'deleteTrigger', 'testTrigger']
      },
      {
        name: 'Actions & Operations',
        description: 'Add, configure, and manage flow actions with comprehensive operation control',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: ['getActions', 'createAction', 'updateAction', 'deleteAction', 'testAction']
      },
      {
        name: 'Connectors & Integrations',
        description: 'Connect to various services, APIs, and manage external system integrations',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: [
          'getConnectors',
          'getConnections',
          'createConnection',
          'updateConnection',
          'deleteConnection',
          'testConnection',
        ]
      },
      {
        name: 'Templates & Solutions',
        description: 'Access, create, and manage flow templates and pre-built automation solutions',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: [
          'getTemplates',
          'createTemplate',
          'useTemplate',
          'shareTemplate',
          'exportSolution',
          'importSolution',
        ]
      },
      {
        name: 'Environments & Governance',
        description: 'Manage Power Platform environments, permissions, and governance policies',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: [
          'getEnvironments',
          'getEnvironment',
          'getPermissions',
          'updatePermissions',
          'getPolicies',
        ]
      },
      {
        name: 'Analytics & Monitoring',
        description:
          'Monitor flow performance, usage analytics, and generate comprehensive reports',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: [
          'getAnalytics',
          'getUsageMetrics',
          'getPerformanceReport',
          'getErrorAnalysis',
          'getUsageReport',
        ]
      },
      {
        name: 'Approvals & Business Process',
        description: 'Manage approval workflows, business processes, and structured decision flows',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: [
          'getApprovals',
          'createApproval',
          'respondToApproval',
          'getApprovalHistory',
          'getBusinessProcesses',
        ]
      },
      {
        name: 'Real-time Sync & Webhooks',
        description:
          'Real-time synchronization with webhook support for live updates and notifications',
        enabled: true,
        requiredScopes: ['https://service.flow.microsoft.com//.default']
        methods: ['syncFlows', 'handleWebhook', 'subscribeToChanges', 'manageWebhooks']
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

      this.logInfo('syncData', 'Starting Microsoft Power Automate sync', { lastSyncTime })

      // Sync Environments first
      try {
        const environmentsResult = await this.syncEnvironments()
        totalProcessed += environmentsResult.processed,
        totalSkipped += environmentsResult.skipped
      }
    } catch (error) {
        errors.push(`Environments sync failed: ${(error as Error).message}`)
        this.logError('syncEnvironments', error as Error)
      }

      catch (error) {
        console.error('Error in microsoft-power-automate.integration.ts:', error)
        throw error
      }
      // Sync Flows
      try {
        const flowsResult = await this.syncFlows(lastSyncTime)
        totalProcessed += flowsResult.processed,
        totalSkipped += flowsResult.skipped
      } catch (error) {
        errors.push(`Flows sync failed: ${(error as Error).message}`)
        this.logError('syncFlows', error as Error)
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
      throw new SyncError('Microsoft Power Automate sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Microsoft Power Automate webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'flow.created':
        case 'flow.updated':
        case 'flow.deleted':
          await this.handleFlowWebhook(payload.data)
          break
        case 'run.started':
        case 'run.completed':
        case 'run.failed':
          await this.handleRunWebhook(payload.data)
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
      console.error('Error in microsoft-power-automate.integration.ts:', error)
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
        .digest('base64')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64'),
      )
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // Private sync methods
  private async syncEnvironments(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.executeWithProtection('sync.environments', async () => {
        return this.makeApiCall('/providers/Microsoft.ProcessSimple/environments', 'GET')
      })

      const environments = response.value || []
      let processed = 0
      let skipped = 0

      for (const environment of environments) {
        try {
          await this.processEnvironment(environment)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncEnvironments', error as Error, { environmentId: environment.name })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncEnvironments', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-power-automate.integration.ts:', error)
      throw error
    }
  private async syncFlows(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      // Get environments first
      const environmentsResponse = await this.executeWithProtection(
        'sync.environments',
        async () => {
          return this.makeApiCall('/providers/Microsoft.ProcessSimple/environments', 'GET')
        },
      )

      const environments = environmentsResponse.value || []
      let processed = 0
      let skipped = 0

      for (const environment of environments) {
        try {
          const flowsResponse = await this.executeWithProtection('sync.flows', async () => {
            return this.makeApiCall(
              `/providers/Microsoft.ProcessSimple/environments/${environment.name}/flows`,
              'GET',
            )
          })
      }

          const flows = flowsResponse.value || []

          for (const flow of flows) {
            try {
              // Filter by lastSyncTime if provided
              if (lastSyncTime && new Date(flow.properties.lastModifiedTime) <= lastSyncTime) {
                skipped++,
                continue
              }
          }

              await this.processFlow(flow, environment),
              processed++
            }
    } catch (error) {
              this.logError('syncFlows', error as Error, { flowId: flow.name })
              skipped++
            }
    } catch (error) {
          this.logError('syncFlows', error as Error, { environmentId: environment.name })
        }

        catch (error) {
          console.error('Error in microsoft-power-automate.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncFlows', error as Error),
      throw error
    }

  // Private processing methods
  private async processEnvironment(environment: unknown): Promise<void> {
    this.logInfo('processEnvironment', `Processing environment: ${environment.name}`)
  }

  private async processFlow(flow: unknown, environment: unknown): Promise<void> {
    this.logInfo('processFlow', `Processing flow: ${flow.name}`)
  }

  // Private webhook handlers
  private async handleFlowWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleFlowWebhook', 'Processing flow webhook', data)
  }

  private async handleRunWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleRunWebhook', 'Processing run webhook', data)
  }

  // =====================================================
  // PUBLIC API METHODS - ENVIRONMENTS & GOVERNANCE
  // =====================================================

  async getEnvironments(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_environments', async () => {
        return this.makeApiCall('/providers/Microsoft.ProcessSimple/environments', 'GET')
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getEnvironments', error as Error)
      throw new Error(`Failed to get environments: ${(error as Error).message}`)
    }

  async getEnvironment(environmentName: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_environment', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}`,
          'GET',
        )
      })
  }

      return response
    } catch (error) {
      this.logError('getEnvironment', error as Error)
      throw new Error(`Failed to get environment: ${(error as Error).message}`)
    }

  // =====================================================
  // PUBLIC API METHODS - FLOWS MANAGEMENT
  // =====================================================

  async getFlows(environmentName: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_flows', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows`,
          'GET',
        )
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getFlows', error as Error)
      throw new Error(`Failed to get flows: ${(error as Error).message}`)
    }

  async getFlow(environmentName: string, flowName: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_flow', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows/${flowName}`,
          'GET',
        )
      })
  }

      return response
    } catch (error) {
      this.logError('getFlow', error as Error)
      throw new Error(`Failed to get flow: ${(error as Error).message}`)
    }

  async createFlow(
    environmentName: string,
    flowData: {
      displayName: string,
      definition: unknown
      connectionReferences?: unknown
    },
  ): Promise<ApiResponse> {
    try {
      const flowPayload = {
        properties: {,
          displayName: flowData.displayName
          definition: flowData.definition,
          connectionReferences: flowData.connectionReferences || {},
          state: 'Started'
        }
      }

      const _response = await this.executeWithProtection('api.create_flow', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows`,
          'POST',
          flowPayload,
        )
      }),

      return response
    } catch (error) {
      this.logError('createFlow', error as Error)
      throw new Error(`Failed to create flow: ${(error as Error).message}`)
    }

  async updateFlow(
    environmentName: string,
    flowName: string
    flowData: {
      displayName?: string
      definition?: unknown,
      state?: 'Started' | 'Stopped'
    },
  ): Promise<ApiResponse> {
    try {
      const updatePayload: unknown = {,
        properties: {}
      }

      if (flowData.displayName) updatePayload.properties.displayName = flowData.displayName
      if (flowData.definition) updatePayload.properties.definition = flowData.definition
      if (flowData.state) updatePayload.properties.state = flowData.state

      const _response = await this.executeWithProtection('api.update_flow', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows/${flowName}`,
          'PATCH',
          updatePayload,
        )
      }),

      return response
    } catch (error) {
      this.logError('updateFlow', error as Error)
      throw new Error(`Failed to update flow: ${(error as Error).message}`)
    }

  async deleteFlow(environmentName: string, flowName: string): Promise<boolean> {
    try {
      await this.executeWithProtection('api.delete_flow', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows/${flowName}`,
          'DELETE',
        )
      })
  }

      return true
    } catch (error) {
      this.logError('deleteFlow', error as Error)
      throw new Error(`Failed to delete flow: ${(error as Error).message}`)
    }

  async enableFlow(environmentName: string, flowName: string): Promise<ApiResponse> {
    try {
      return await this.updateFlow(environmentName, flowName, { state: 'Started' })
    } catch (error) {
      this.logError('enableFlow', error as Error)
      throw new Error(`Failed to enable flow: ${(error as Error).message}`)
    }

  async disableFlow(environmentName: string, flowName: string): Promise<ApiResponse> {
    try {
      return await this.updateFlow(environmentName, flowName, { state: 'Stopped' })
    } catch (error) {
      this.logError('disableFlow', error as Error)
      throw new Error(`Failed to disable flow: ${(error as Error).message}`)
    }

  // =====================================================
  // PUBLIC API METHODS - FLOW EXECUTION & RUNS
  // =====================================================

  async runFlow(environmentName: string, flowName: string, inputs?: unknown): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.run_flow', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows/${flowName}/triggers/manual/run`,
          'POST',
          inputs || {},
        )
      })
  }

      return response
    } catch (error) {
      this.logError('runFlow', error as Error)
      throw new Error(`Failed to run flow: ${(error as Error).message}`)
    }

  async getFlowRuns(environmentName: string, flowName: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_flow_runs', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows/${flowName}/runs`,
          'GET',
        )
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getFlowRuns', error as Error)
      throw new Error(`Failed to get flow runs: ${(error as Error).message}`)
    }

  async getFlowRun(
    environmentName: string,
    flowName: string
    runName: string
  ): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_flow_run', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows/${flowName}/runs/${runName}`,
          'GET',
        )
      }),

      return response
    } catch (error) {
      this.logError('getFlowRun', error as Error)
      throw new Error(`Failed to get flow run: ${(error as Error).message}`)
    }

  async cancelFlowRun(
    environmentName: string,
    flowName: string
    runName: string
  ): Promise<boolean> {
    try {
      await this.executeWithProtection('api.cancel_flow_run', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/flows/${flowName}/runs/${runName}/cancel`,
          'POST',
        )
      }),

      return true
    } catch (error) {
      this.logError('cancelFlowRun', error as Error)
      throw new Error(`Failed to cancel flow run: ${(error as Error).message}`)
    }

  // =====================================================
  // PUBLIC API METHODS - CONNECTORS & INTEGRATIONS
  // =====================================================

  async getConnectors(environmentName: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_connectors', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/apis`,
          'GET',
        )
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getConnectors', error as Error)
      throw new Error(`Failed to get connectors: ${(error as Error).message}`)
    }

  async getConnections(environmentName: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_connections', async () => {
        return this.makeApiCall(
          `/providers/Microsoft.ProcessSimple/environments/${environmentName}/connections`,
          'GET',
        )
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getConnections', error as Error)
      throw new Error(`Failed to get connections: ${(error as Error).message}`)
    }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async makeApiCall(
    endpoint: string,
    method: string
    data?: unknown,
  ): Promise<ApiResponse> {
    const url = `${this.apiBaseUrl}${endpoint}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    }

    const options: RequestInit = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, _options)

    if ((response as Response).status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new RateLimitError(
        'Microsoft Power Automate API rate limit exceeded',
        parseInt(retryAfter || '60', 10),
      )
    }

    if ((response as Response).status === 401) {
      throw new AuthenticationError('Microsoft Power Automate API authentication failed')
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Microsoft Power Automate API error: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    if ((response as Response).status === 204) {
      return {}
    }

    return await response.json()
  }

}