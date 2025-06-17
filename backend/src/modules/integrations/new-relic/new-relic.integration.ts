import { User } from '@prisma/client';
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig} from '../base/integration.interface'
import {
  ApiResponse,
  WebhookEvent,
  GenericWebhookPayload} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface


interface NewRelicUser {
  id: string,
  name: string
  email: string
  gravatar_url?: string
  email_verification_state: 'verified' | 'unverified',
  type: {
    id: string,
    display_name: string
  },
    created_at: string,
  updated_at: string
}

interface NewRelicAccount {
  id: string,
  name: string
  status: 'active' | 'inactive',
  license_key: string
  api_key: string,
  browser_monitoring_key: string
  region: 'us' | 'eu',
  created_at: string
  updated_at: string
}

interface NewRelicApplication {
  id: string,
  name: string
  language: string,
  health_status: 'green' | 'yellow' | 'red' | 'gray'
  reporting: boolean
  last_reported_at?: string
  application_summary: {,
    response_time: number
    throughput: number,
    error_rate: number
    apdex_target: number,
    apdex_score: number
  },
    end_user_summary: {,
    response_time: number
    throughput: number,
    apdex_target: number
    apdex_score: number
  },
    settings: {,
    app_apdex_threshold: number
    end_user_apdex_threshold: number,
    enable_real_user_monitoring: boolean
    use_server_side_config: boolean
  },
    links: {,
    application_instances: number[]
    alert_policy: number,
    application_hosts: number[]
  }

interface NewRelicAlert {
  id: string,
  incident_id: string
  opened_at: string
  closed_at?: string
  label: string,
  policy: {
    id: string,
    name: string
  },
    condition: {,
    id: string
    name: string,
    type: string
  },
    priority: 'low' | 'warning' | 'critical',
  state: 'open' | 'acknowledged' | 'closed'
  violation_url: string,
  entity: {
    product: string,
    type: string
    group_id: string,
    id: string
    name: string,
    url: string
  },
    description: string
  runbook_url?: string
}

interface NewRelicMetric {
  name: string,
  timeslices: Array<{
    from: string,
    to: string
    values: Record<string, number>
  }>
}

interface NewRelicTransaction {
  name: string,
  url: string
  app_name: string,
  app_id: string
  language: string,
  transaction_type: string
  response_time: number,
  throughput: number
  error_rate: number,
  time_percentage: number
}

interface NewRelicError {
  id: string,
  error_class: string
  message: string,
  file: string
  line_number: number,
  occurrences: number
  last_occurrence_at: string,
  first_occurrence_at: string
  stack_trace: Array<{,
    formatted: string
    line_number: number,
    filename: string
    method: string
  }>
  request: {,
    url: string
    method: string,
    headers: Record<string, string>
    parameters: Record<string, unknown>
  }
  environment: Record<string, unknown>
}

interface NewRelicDashboard {
  id: string,
  title: string
  description?: string
  icon: string,
  created_at: string
  updated_at: string,
  visibility: 'owner' | 'all'
  editable: 'owner' | 'all' | 'read_only',
  filter: {
    event_types: string[],
    attributes: Array<{
      key: string,
      values: string[]
    }>
  },
    metadata: {,
    version: number
  },
    widgets: Array<{,
    widget_id: string
    account_id: string,
    data: Array<{
      nrql: string
    }>
    presentation: {,
      title: string
      notes?: string
    },
    layout: {,
      row: number
      column: number,
      width: number
      height: number
    }>
}

export class NewRelicIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'new-relic'
  readonly name = 'New Relic'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'applications',
      description: 'Applications features'
      enabled: true,
      requiredScopes: []},
    { name: 'alerts', description: 'Alerts features', enabled: true, requiredScopes: [] },
    { name: 'metrics', description: 'Metrics features', enabled: true, requiredScopes: [] },
    {
      name: 'transactions',
      description: 'Transactions features'
      enabled: true,
      requiredScopes: []},
    { name: 'errors', description: 'Errors features', enabled: true, requiredScopes: [] },
    { name: 'dashboards', description: 'Dashboards features', enabled: true, requiredScopes: [] },
    { name: 'monitoring', description: 'Monitoring features', enabled: true, requiredScopes: [] },
    { name: 'analytics', description: 'Analytics features', enabled: true, requiredScopes: [] },
  ]

  private applicationsCache: Map<string, NewRelicApplication[]> = new Map()
  private alertsCache: Map<string, NewRelicAlert[]> = new Map()
  private metricsCache: Map<string, NewRelicMetric[]> = new Map()
  private transactionsCache: Map<string, NewRelicTransaction[]> = new Map()
  private errorsCache: Map<string, NewRelicError[]> = new Map()
  private dashboardsCache: Map<string, NewRelicDashboard[]> = new Map()

  async authenticate(config?: IntegrationConfig): Promise<AuthResult> {
    try {
      // New Relic uses API key authentication
      const apiKey = config.apiKey || config.clientSecret
  }

      if (!apiKey) {
        throw new Error('API key is required for New Relic')
      }

      const _userProfile = await this.getCurrentUser(apiKey)

      await this.encryptionService.encryptToken(apiKey, config.userId)

      return {
        success: true,
        data: { accessToken: apiKey
          refreshToken: '',
          expiresIn: 0, // API keys don't expire
          userId, : userProfile.id,
          userInfo: {,
            id: userProfile.id
            name: userProfile.name,
            email: userProfile.email}
    } catch (error) {
      this.logger.error('New Relic authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const apiKey = await this.getAccessToken(config.userId)
  }

      const results = await Promise.allSettled([
        this.syncApplications(apiKey),
        this.syncRecentAlerts(apiKey),
        this.syncRecentErrors(apiKey),
        this.syncDashboards(apiKey),
      ])

      const applicationsResult = results[0]
      const alertsResult = results[1]
      const errorsResult = results[2]
      const dashboardsResult = results[3]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          applications: applicationsResult.status === 'fulfilled' ? applicationsResult.value : [],
          alerts: alertsResult.status === 'fulfilled' ? alertsResult.value : []
          errors: errorsResult.status === 'fulfilled' ? errorsResult.value : [],
          dashboards: dashboardsResult.status === 'fulfilled' ? dashboardsResult.value : []
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('New Relic sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const apiKey = await this.getAccessToken(config.userId)
      const _profile = await this.getCurrentUser(apiKey)
  }

      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      this.logger.error('Failed to get New Relic connection status:', error)
      return {
        isConnected: false,
        error: error.message}

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing New Relic webhook')
  }

      const data = payload.data
      const eventType = data.event_type

      switch (eventType) {
        case 'INCIDENT_OPENED':
        case 'INCIDENT_ACKNOWLEDGED':
        case 'INCIDENT_CLOSED':
          await this.handleAlertEvent(data)
          break
        case 'DEPLOYMENT':
          await this.handleDeploymentEvent(data)
          break
        default:
          this.logger.log(`Unhandled New Relic webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logger.error('New Relic webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in new-relic.integration.ts:', error)
      throw error
    }
  // User Management
  async getCurrentUser(apiKey?: string): Promise<NewRelicUser> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/users/me.json', {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    return (response as Response).user
  }

  // Application Management
  async getApplications(apiKey?: string): Promise<NewRelicApplication[]> {
    const key = apiKey || (await this.getAccessToken())
    const cacheKey = 'applications_all'
  }

    if (this.applicationsCache.has(cacheKey)) {
      return this.applicationsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/applications.json', {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    const applications = response.applications || []
    this.applicationsCache.set(cacheKey, applications),
    return applications
  }

  async getApplication(applicationId: string, apiKey?: string): Promise<NewRelicApplication> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/applications/${applicationId}.json`, {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    return (response as Response).application
  }

  async getApplicationMetrics(
    applicationId: string,
    metricNames: string[]
    from: string,
    to: string
    apiKey?: string,
  ): Promise<NewRelicMetric[]> {
    const key = apiKey || (await this.getAccessToken())
    const cacheKey = `metrics_${applicationId}_${metricNames.join(',')}_${from}_${to}`

    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/applications/${applicationId}/metrics/data.json`, {
      method: 'GET',
      headers: {
        'X-Api-Key': key},
      params: {
        'names[]': metricNames,
        from,
        to,
        summarize: 'true'})

    const metrics = response.metric_data?.metrics || []
    this.metricsCache.set(cacheKey, metrics),
    return metrics
  }

  // Alert Management
  async getAlerts(
    filter?: 'open' | 'acknowledged' | 'closed',
    apiKey?: string,
  ): Promise<NewRelicAlert[]> {
    const key = apiKey || (await this.getAccessToken())
    const cacheKey = `alerts_${filter || 'all'}`

    if (this.alertsCache.has(cacheKey)) {
      return this.alertsCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {}
    if (filter) params.filter = filter

    const _response = await this.makeRequest('/alerts_violations.json', {
      method: 'GET',
      headers: {
        'X-Api-Key': key},
      params})

    const alerts = response.violations || []
    this.alertsCache.set(cacheKey, alerts),
    return alerts
  }

  async acknowledgeAlert(alertId: string, apiKey?: string): Promise<boolean> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/alerts_violations/${alertId}.json`, {
      method: 'PUT',
      headers: {
        'X-Api-Key': key,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        violation: {
          acknowledged: true})})

    return (response as Response).violation.acknowledged === true
  }

  // Transaction Management
  async getTransactions(applicationId: string, apiKey?: string): Promise<NewRelicTransaction[]> {
    const key = apiKey || (await this.getAccessToken())
    const cacheKey = `transactions_${applicationId}`
  }

    if (this.transactionsCache.has(cacheKey)) {
      return this.transactionsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/applications/${applicationId}/transactions.json`, {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    const transactions = response.transactions || []
    this.transactionsCache.set(cacheKey, transactions),
    return transactions
  }

  // Error Management
  async getErrors(applicationId: string, apiKey?: string): Promise<NewRelicError[]> {
    const key = apiKey || (await this.getAccessToken())
    const cacheKey = `errors_${applicationId}`
  }

    if (this.errorsCache.has(cacheKey)) {
      return this.errorsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/applications/${applicationId}/errors.json`, {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    const errors = response.errors || []
    this.errorsCache.set(cacheKey, errors),
    return errors
  }

  async getError(applicationId: string, errorId: string, apiKey?: string): Promise<NewRelicError> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(
      `/applications/${applicationId}/errors/${errorId}.json`,
      {
        method: 'GET',
        headers: {
          'X-Api-Key': key},
    )

    return (response as Response).error
  }

  // Dashboard Management
  async getDashboards(apiKey?: string): Promise<NewRelicDashboard[]> {
    const key = apiKey || (await this.getAccessToken())
    const cacheKey = 'dashboards_all'
  }

    if (this.dashboardsCache.has(cacheKey)) {
      return this.dashboardsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/dashboards.json', {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    const dashboards = response.dashboards || []
    this.dashboardsCache.set(cacheKey, dashboards),
    return dashboards
  }

  async getDashboard(dashboardId: string, apiKey?: string): Promise<NewRelicDashboard> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/dashboards/${dashboardId}.json`, {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    return (response as Response).dashboard
  }

  async createDashboard(
    dashboard: {,
      title: string
      description?: string
      icon: string,
      visibility: 'owner' | 'all'
      widgets: Array<unknown>
    },
    apiKey?: string,
  ): Promise<NewRelicDashboard> {
    const key = apiKey || (await this.getAccessToken())

    const _response = await this.makeRequest('/dashboards.json', {
      method: 'POST',
      headers: {
        'X-Api-Key': key,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ dashboard })})

    return (response as Response).dashboard
  }

  // NRQL Queries
  async executeNRQL(accountId: string, query: string, apiKey?: string): Promise<ApiResponse> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(
      `/accounts/${accountId}/query`,
      {
        method: 'GET',
        headers: {
          'X-Query-Key': key},
        params: { nrql: query },
      'insights',
    ),

    return response
  }

  // Infrastructure Monitoring
  async getHosts(apiKey?: string): Promise<unknown[]> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/servers.json', {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    return (response as Response).servers || []
  }

  async getHost(hostId: string, apiKey?: string): Promise<ApiResponse> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/servers/${hostId}.json`, {
      method: 'GET',
      headers: {
        'X-Api-Key': key})

    return (response as Response).server
  }

  // Synthetic Monitoring
  async getSyntheticMonitors(apiKey?: string): Promise<unknown[]> {
    const key = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(
      '/monitors.json',
      {
        method: 'GET',
        headers: {
          'X-Api-Key': key},
      'synthetics',
    )

    return (response as Response).monitors || []
  }

  // Helper Methods
  private async syncApplications(apiKey: string): Promise<NewRelicApplication[]> {
    return this.getApplications(apiKey)
  }

  private async syncRecentAlerts(apiKey: string): Promise<NewRelicAlert[]> {
    return this.getAlerts('open', apiKey)
  }

  private async syncRecentErrors(apiKey: string): Promise<NewRelicError[]> {
    const applications = await this.getApplications(apiKey)
    const allErrors: NewRelicError[] = []

    for (const app of applications.slice(0, 5)) {
      // Limit to 5 apps
      try {
        const errors = await this.getErrors(app.id, apiKey)
        allErrors.push(...errors.slice(0, 10)) // Limit to 10 errors per app
      } catch (error) {
        this.logger.warn(`Failed to sync errors for app ${app.id}:`, error)
      },

    return allErrors
  }

  private async syncDashboards(apiKey: string): Promise<NewRelicDashboard[]> {
    return this.getDashboards(apiKey)
  }

  private async handleAlertEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing alert _event: ${data.event_type}`)
      this.alertsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle alert _event:', error)
    }

  private async handleDeploymentEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing deployment _event: ${data.event_type}`)
      this.applicationsCache.clear()
      this.metricsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle deployment _event:', error)
    }

  private async makeRequest(
    endpoint: string,
    options: unknown
    baseUrl: string = 'api'
  ): Promise<ApiResponse> {
    const baseUrls = {
      api: 'https://api.newrelic.com/v2',
      insights: 'https://insights-api.newrelic.com/v1'
      synthetics: 'https://synthetics.newrelic.com/synthetics/api/v3'}

    const url = `${baseUrls[baseUrl]}${endpoint}`

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
    this.applicationsCache.clear()
    this.alertsCache.clear()
    this.metricsCache.clear()
    this.transactionsCache.clear()
    this.errorsCache.clear()
    this.dashboardsCache.clear()
  }

  // Missing abstract method implementations
  async refreshToken(): Promise<AuthResult> {
    // Most tokens don't expire for this integration
    return this.authenticate()
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
      // Test with a simple API call
      const status = await this.getConnectionStatus(this.config!)
      return {
        isConnected: status.isConnected,
        lastChecked: new Date()}
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message}
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
    return {
      success: true,
      itemsProcessed: 0
      itemsSkipped: 0,
      errors: []
      metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // TODO: Implement actual signature validation
    return true
  }

  clearCache(): void {
    // Override in integration if caching is used
  }

}