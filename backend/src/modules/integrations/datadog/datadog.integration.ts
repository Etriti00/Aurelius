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

// Using WebhookPayload from base interface

interface DataDogUser {
  id: string,
  name: string
  email: string,
  handle: string
  icon: string
  title?: string
  verified: boolean,
  disabled: boolean
  status: string,
  created_at: string
  modified_at: string
}

interface DataDogMetric {
  metric: string,
  points: Array<[number, number]>
  type: string
  host?: string
  tags?: string[]
  interval?: number
  metadata?: {
    description?: string
    short_name?: string
    statsd_interval?: number
    type?: string,
    unit?: string
  }

interface DataDogEvent {
  id: string,
  title: string
  text: string
  tags?: string[]
  alert_type?: 'error' | 'warning' | 'info' | 'success'
  priority?: 'normal' | 'low'
  source_type_name?: string
  date_happened: number
  device_name?: string
  host?: string
  aggregation_key?: string
  related_event_id?: string,
  url?: string
}

interface DataDogDashboard {
  id: string,
  title: string
  description: string,
  layout_type: 'ordered' | 'free'
  is_read_only: boolean
  notify_list?: string[]
  template_variables?: Array<{
    name: string
    default?: string,
    prefix?: string
  }>
  widgets: Array<{,
    id: string
    definition: {,
      type: string
      title?: string
      title_size?: string
      title_align?: string
      requests?: Array<unknown>
      time?: unknown,
      yaxis?: unknown
    }
    layout?: {
      x: number,
      y: number
      width: number,
      height: number
    }>
  created_at: string,
  modified_at: string
  author_handle: string,
  url: string
}

interface DataDogMonitor {
  id: string,
  name: string
  type: string,
  query: string
  message: string,
  tags: string[]
  options: {
    thresholds?: {
      critical?: number
      warning?: number
      ok?: number
      critical_recovery?: number,
      warning_recovery?: number
    },
    notify_audit: boolean,
    require_full_window: boolean
    new_host_delay: number,
    include_tags: boolean
    escalation_message?: string
    locked: boolean
    timeout_h?: number
    renotify_interval?: number,
    evaluation_delay?: number
  },
    overall_state: 'Alert' | 'Warn' | 'No Data' | 'OK',
  created: string
  modified: string,
  creator: {
    email: string,
    handle: string
    name: string
  }

interface DataDogHost {
  name: string
  aliases?: string[]
  apps?: string[]
  aws?: {
    availability_zone?: string
    instance_id?: string,
    instance_type?: string
  },
    host_name: string,
  id: string
  is_muted: boolean,
  last_reported_time: number
  mute_timeout?: number
  sources?: string[]
  tags_by_source?: Record<string, string[]>
  up: boolean
  meta?: {
    agent_checks?: Array<{
      name: string,
      status: string
    }>
    agent_version?: string
    cpu_cores?: number
    fbsd_v?: string[]
    gohai?: string
    install_method?: {
      tool: string,
      tool_version: string
      installer_version: string
    }
    machine?: string
    nixV?: string[]
    platform?: string
    processor?: string
    python_v?: string
    socket_fqdn?: string
    socket_hostname?: string,
    win_v?: string[]
  }

interface DataDogLog {
  id: string,
  message: string
  timestamp: string,
  status: string
  service?: string
  host?: string
  source?: string
  tags?: string[]
  attributes?: Record<string, unknown>
  content?: {
    service?: string
    host?: string
    source?: string
    timestamp?: string
    message?: string
    attributes?: Record<string, unknown>
  }

export class DataDogIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'datadog'
  readonly name = 'DataDog'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'metrics', description: 'Monitor metrics' },
    { name: 'events', description: 'Track events' },
    { name: 'dashboards', description: 'Create dashboards' },
    { name: 'monitors', description: 'Set up monitors' },
    { name: 'hosts', description: 'Monitor hosts' },
    { name: 'logs', description: 'Collect logs' },
    { name: 'alerts', description: 'Manage alerts' },
    { name: 'infrastructure', description: 'Infrastructure monitoring' },
  ]

  private metricsCache: Map<string, DataDogMetric[]> = new Map()
  private eventsCache: Map<string, DataDogEvent[]> = new Map()
  private dashboardsCache: Map<string, DataDogDashboard[]> = new Map()
  private monitorsCache: Map<string, DataDogMonitor[]> = new Map()
  private hostsCache: Map<string, DataDogHost[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    const config = this.config
    try {
      // DataDog uses API Key + Application Key authentication
      const apiKey = config.apiKey || config.clientSecret
      const appKey = config.appKey || config.clientId
  }

      if (!apiKey || !appKey) {
        throw new Error('API Key and Application Key are required')
      }

      const _userProfile = await this.getCurrentUser(apiKey, appKey)

      await this.encryptionService.encryptToken(apiKey, config.userId)
      await this.encryptionService.encryptToken(appKey, `${config.userId}_app`)

      return {
        success: true,
        accessToken: apiKey
        refreshToken: appKey,
        expiresIn: 0, // API keys don't expire
        userId: userProfile.id,
        userInfo: {
          id: userProfile.id,
          name: userProfile.name
          email: userProfile.email
        }
      }
    } catch (error) {
      this.logger.error('DataDog authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in datadog.integration.ts:', error)
      throw error
    }
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const apiKey = await this.getAccessToken(config.userId)
      const appKey = await this.getAppKey(config.userId)
  }

      const results = await Promise.allSettled([
        this.syncHosts(apiKey, appKey),
        this.syncMonitors(apiKey, appKey),
        this.syncDashboards(apiKey, appKey),
        this.syncRecentEvents(apiKey, appKey),
      ])

      const hostsResult = results[0]
      const monitorsResult = results[1]
      const dashboardsResult = results[2]
      const eventsResult = results[3]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          hosts: hostsResult.status === 'fulfilled' ? hostsResult.value : [],
          monitors: monitorsResult.status === 'fulfilled' ? monitorsResult.value : []
          dashboards: dashboardsResult.status === 'fulfilled' ? dashboardsResult.value : [],
          events: eventsResult.status === 'fulfilled' ? eventsResult.value : []
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined
        }
      }
    } catch (error) {
      this.logger.error('DataDog sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in datadog.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const apiKey = await this.getAccessToken(config.userId)
      const appKey = await this.getAppKey(config.userId)
      const _profile = await this.getCurrentUser(apiKey, appKey)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to get DataDog connection status:', error)
      return {
        isConnected: false,
        error: error.message
      }

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing DataDog webhook')
  }

      const data = payload.data
      const eventType = data.eventType || data.msgtype

      switch (eventType) {
        case 'triggered':
        case 'recovered':
        case 'warning':
          await this.handleMonitorEvent(data)
          break
        case 'metric':
          await this.handleMetricEvent(data)
          break
        default:
          this.logger.log(`Unhandled DataDog webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logger.error('DataDog webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in datadog.integration.ts:', error)
      throw error
    }
  // User Management
  async getCurrentUser(apiKey?: string, appKey?: string): Promise<DataDogUser> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())
  }

    const _response = await this.makeRequest('/v1/user', {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      }
    })

    return (response as Response).user
  }

  async getUsers(apiKey?: string, appKey?: string): Promise<DataDogUser[]> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())
  }

    const _response = await this.makeRequest('/v1/user', {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      }
    })

    return (response as Response).users || []
  }

  // Metrics Management
  async submitMetrics(metrics: DataDogMetric[], apiKey?: string): Promise<boolean> {
    const api = apiKey || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v1/series', {
      method: 'POST',
      headers: {
        'DD-API-KEY': api,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ series: metrics })
    })

    return (response as Response).status === 'ok'
  }

  async queryMetrics(
    query: string,
    from: number
    to: number
    apiKey?: string,
    appKey?: string,
  ): Promise<ApiResponse> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())

    const _response = await this.makeRequest('/v1/query', {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      },
      params: {
        query,
        from: from.toString(),
        to: to.toString()
      }
    }),

    return response
  }

  async getActiveMetrics(
    from: number
    host?: string,
    apiKey?: string,
    appKey?: string,
  ): Promise<string[]> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())

    const params: unknown = { from: from.toString() }
    if (host) params.host = host

    const _response = await this.makeRequest('/v1/metrics', {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      },
      params
    })

    return (response as Response).metrics || []
  }

  // Events Management
  async getEvents(
    start: number,
    end: number
    priority?: 'normal' | 'low',
    sources?: string,
    tags?: string,
    apiKey?: string,
    appKey?: string,
  ): Promise<DataDogEvent[]> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())
    const cacheKey = `events_${start}_${end}_${priority || 'all'}`

    if (this.eventsCache.has(cacheKey)) {
      return this.eventsCache.get(cacheKey)!
    }

    const params: unknown = {,
      start: start.toString()
      end: end.toString()
    }
    if (priority) params.priority = priority
    if (sources) params.sources = sources
    if (tags) params.tags = tags

    const _response = await this.makeRequest('/v1/events', {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      },
      params
    })

    const events = response.events || []
    this.eventsCache.set(cacheKey, events),
    return events
  }

  async createEvent(
    event: {,
      title: string
      text: string
      tags?: string[]
      alert_type?: 'error' | 'warning' | 'info' | 'success'
      priority?: 'normal' | 'low'
      host?: string,
      aggregation_key?: string
    },
    apiKey?: string,
  ): Promise<DataDogEvent> {
    const api = apiKey || (await this.getAccessToken())

    const _response = await this.makeRequest('/v1/events', {
      method: 'POST',
      headers: {
        'DD-API-KEY': api,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(_event)
    })

    return (response as Response).event
  }

  // Dashboard Management
  async getDashboards(apiKey?: string, appKey?: string): Promise<DataDogDashboard[]> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())
    const cacheKey = 'dashboards_all'
  }

    if (this.dashboardsCache.has(cacheKey)) {
      return this.dashboardsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/v1/dashboard', {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      }
    })

    const dashboards = response.dashboards || []
    this.dashboardsCache.set(cacheKey, dashboards),
    return dashboards
  }

  async getDashboard(
    dashboardId: string
    apiKey?: string,
    appKey?: string,
  ): Promise<DataDogDashboard> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())

    const _response = await this.makeRequest(`/v1/dashboard/${dashboardId}`, {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      }
    }),

    return response
  }

  async createDashboard(
    dashboard: {,
      title: string
      description: string,
      layout_type: 'ordered' | 'free'
      widgets: Array<unknown>
      template_variables?: Array<unknown>
    },
    apiKey?: string,
    appKey?: string,
  ): Promise<DataDogDashboard> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())

    const _response = await this.makeRequest('/v1/dashboard', {
      method: 'POST',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dashboard)
    }),

    return response
  }

  // Monitor Management
  async getMonitors(
    group_states?: string[],
    name?: string,
    tags?: string[],
    apiKey?: string,
    appKey?: string,
  ): Promise<DataDogMonitor[]> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())
    const cacheKey = `monitors_${group_states?.join(',') || 'all'}_${name || 'all'}`

    if (this.monitorsCache.has(cacheKey)) {
      return this.monitorsCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {}
    if (group_states) params.group_states = group_states.join(',')
    if (name) params.name = name
    if (tags) params.tags = tags.join(',')

    const _response = await this.makeRequest('/v1/monitor', {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      },
      params
    })

    const monitors = response || []
    this.monitorsCache.set(cacheKey, monitors),
    return monitors
  }

  async getMonitor(monitorId: string, apiKey?: string, appKey?: string): Promise<DataDogMonitor> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())
  }

    const _response = await this.makeRequest(`/v1/monitor/${monitorId}`, {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      }
    }),

    return response
  }

  async createMonitor(
    monitor: {,
      name: string
      type: string,
      query: string
      message: string
      tags?: string[],
      options?: unknown
    },
    apiKey?: string,
    appKey?: string,
  ): Promise<DataDogMonitor> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())

    const _response = await this.makeRequest('/v1/monitor', {
      method: 'POST',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(monitor)
    }),

    return response
  }

  async muteMonitor(
    monitorId: string
    muteSettings?: {
      scope?: string,
      end?: number
    },
    apiKey?: string,
    appKey?: string,
  ): Promise<boolean> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())

    const _response = await this.makeRequest(`/v1/monitor/${monitorId}/mute`, {
      method: 'POST',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(muteSettings || {})
    })

    return (response as Response).id != null
  }

  // Host Management
  async getHosts(
    filter?: string,
    sortField?: string,
    sortDir?: 'asc' | 'desc',
    from?: number,
    apiKey?: string,
    appKey?: string,
  ): Promise<DataDogHost[]> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())
    const cacheKey = `hosts_${filter || 'all'}_${sortField || 'name'}`

    if (this.hostsCache.has(cacheKey)) {
      return this.hostsCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {}
    if (filter) params.filter = filter
    if (sortField) params.sort_field = sortField
    if (sortDir) params.sort_dir = sortDir
    if (from) params.from = from.toString()

    const _response = await this.makeRequest('/v1/hosts', {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      },
      params
    })

    const hosts = response.host_list || []
    this.hostsCache.set(cacheKey, hosts),
    return hosts
  }

  async getHost(hostName: string, apiKey?: string, appKey?: string): Promise<DataDogHost> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())
  }

    const _response = await this.makeRequest(`/v1/hosts/${hostName}`, {
      method: 'GET',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app
      }
    }),

    return response
  }

  async muteHost(
    hostName: string
    muteSettings?: {
      message?: string
      end?: number,
      override?: boolean
    },
    apiKey?: string,
    appKey?: string,
  ): Promise<boolean> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())

    const _response = await this.makeRequest(`/v1/host/${hostName}/mute`, {
      method: 'POST',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(muteSettings || {})
    })

    return (response as Response).action === 'Muted'
  }

  // Logs Management
  async searchLogs(
    query: string,
    timeframe: {
      from: string,
      to: string
    },
    index?: string,
    limit: number = 50
    apiKey?: string,
    appKey?: string,
  ): Promise<DataDogLog[]> {
    const api = apiKey || (await this.getAccessToken())
    const app = appKey || (await this.getAppKey())

    const body: unknown = {
      query,
      time: timeframe
      limit
    }
    if (index) body.index = index

    const _response = await this.makeRequest('/v1/logs-queries/list', {
      method: 'POST',
      headers: {
        'DD-API-KEY': api,
        'DD-APPLICATION-KEY': app,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    return (response as Response).logs || []
  }

  // Helper Methods
  private async syncHosts(apiKey: string, appKey: string): Promise<DataDogHost[]> {
    return this.getHosts(undefined, undefined, undefined, undefined, apiKey, appKey)
  }

  private async syncMonitors(apiKey: string, appKey: string): Promise<DataDogMonitor[]> {
    return this.getMonitors(undefined, undefined, undefined, apiKey, appKey)
  }

  private async syncDashboards(apiKey: string, appKey: string): Promise<DataDogDashboard[]> {
    return this.getDashboards(apiKey, appKey)
  }

  private async syncRecentEvents(apiKey: string, appKey: string): Promise<DataDogEvent[]> {
    const end = Math.floor(Date.now() / 1000)
    const start = end - 24 * 60 * 60 // Last 24 hours
    return this.getEvents(start, end, undefined, undefined, undefined, apiKey, appKey)
  }

  private async handleMonitorEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing monitor _event: ${data.eventType}`)
      this.monitorsCache.clear()
      this.eventsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle monitor _event:', error)
    }

  private async handleMetricEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing metric _event: ${data.eventType}`)
      this.metricsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle metric _event:', error)
    }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.datadoghq.com/api${endpoint}`

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

  private async getAppKey(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for app key retrieval')
    }
    return this.encryptionService.decryptToken(`${userId}_app`)
  }

  clearCache(): void {
    this.metricsCache.clear()
    this.eventsCache.clear()
    this.dashboardsCache.clear()
    this.monitorsCache.clear()
    this.hostsCache.clear()
  }

  // Abstract method implementations
  async delete(config: IntegrationConfig): Promise<boolean> {
    try {
      await this.encryptionService.deleteToken(config.userId)
      await this.encryptionService.deleteToken(`${config.userId}_app`)
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error('Failed to delete DataDog integration:', error),
      return false
    }

  async refresh(config: IntegrationConfig): Promise<AuthResult> {
    // API keys don't expire, so just validate the connection
    return this.authenticate()
  }

  async validateConnection(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    } catch (error) {
      this.logger.error('Connection validation failed:', error),
      return false
    }

  async getMetrics(config: IntegrationConfig): Promise<Record<string, unknown>> {
    try {
      const apiKey = await this.getAccessToken(config.userId)
      const appKey = await this.getAppKey(config.userId)
      const [dashboards, monitors, hosts] = await Promise.all([
        this.getDashboards(apiKey, appKey),
        this.getMonitors(apiKey, appKey),
        this.getHosts(apiKey, appKey),
      ])
  }

      return {
        dashboards_count: dashboards.length,
        monitors_count: monitors.length
        hosts_count: hosts.length,
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('Failed to get metrics:', error)
      return {}

  async handleError(error: Error, context: string): Promise<void> {
    this.logger.error(`DataDog integration error in ${context}:`, {
      message: error.message,
      stack: error.stack
      context
    })
  }

  async test(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    } catch (error) {
      this.logger.error('Test connection failed:', error),
      return false
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
    return {
      success: true,
      itemsProcessed: 0
      itemsSkipped: 0,
      errors: []
      metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // TODO: Implement actual signature validation
    return true
  }

}