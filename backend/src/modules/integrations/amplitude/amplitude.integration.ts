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
  ApiRequestOptions,
  WebhookEvent,
  GenericWebhookPayload} from '../../../common/types/integration-types'
import { AuthenticationError } from '../common/integration.error'

// Using WebhookPayload from base interface


interface AmplitudeUser {
  user_id?: string
  device_id?: string
  user_properties?: Record<string, unknown>
  groups?: Record<string, unknown>
  created_date?: string
  last_seen?: string
  platform?: string
  version?: string
  language?: string
  country?: string
  region?: string
  city?: string
  dma?: string
  library?: string
  first_used?: string
  last_used?: string
  usage?: {
    total_sessions: number,
    total_events: number
  }

interface AmplitudeEvent {
  event_type: string
  user_id?: string
  device_id?: string
  time?: number
  event_properties?: Record<string, unknown>
  user_properties?: Record<string, unknown>
  groups?: Record<string, unknown>
  group_properties?: Record<string, unknown>
  app_version?: string
  platform?: string
  os_name?: string
  os_version?: string
  device_brand?: string
  device_manufacturer?: string
  device_model?: string
  carrier?: string
  country?: string
  region?: string
  city?: string
  dma?: string
  language?: string
  price?: number
  quantity?: number
  revenue?: number
  productId?: string
  revenueType?: string
  location_lat?: number
  location_lng?: number
  ip?: string
  idfa?: string
  idfv?: string
  adid?: string
  android_id?: string
  session_id?: number,
  insert_id?: string
}

interface AmplitudeCohort {
  id: string,
  name: string
  description?: string
  type: string,
  size: number
  created_date: string,
  modified_date: string
  definition: {,
    filters: Array<{
      type: string,
      prop: string
      op: string,
      values: unknown[]
    }>
  },
    finished: boolean,
  published: boolean
}

interface AmplitudeChart {
  id: string,
  name: string
  type: string,
  created_date: string
  modified_date: string,
  query: {
    events: Array<{,
      event_type: string
      filters?: Array<{
        type: string,
        prop: string
        op: string,
        values: unknown[]
      }>
    }>
    segments?: Array<{
      prop_filter: Array<{,
        type: string
        prop: string,
        op: string
        values: unknown[]
      }>
    }>
    group_by?: Array<{
      type: string,
      value: string
    }>
    start: string,
    end: string
    interval: string
  }
  data?: {
    series: Array<{,
      series: Array<{
        value: number,
        time: string
      }>
    }>,
    xValues: string[]
  }

interface AmplitudeProject {
  id: number,
  name: string
  description?: string
  organization_id: number,
  created_date: string
  modified_date: string,
  timezone: string
  country: string,
  status: string
  plan: string,
  is_demo: boolean
  is_internal: boolean
}

export class AmplitudeIntegration extends BaseIntegration {
  private readonly logger = console
  readonly provider = 'amplitude'
  readonly name = 'Amplitude'
  readonly version = '1.0.0'
  private config: unknown

  readonly capabilities: IntegrationCapability[] = [
    { name: 'analytics', description: 'Analytics and metrics', enabled: true, requiredScopes: [] },
    { name: 'events', description: 'Event tracking', enabled: true, requiredScopes: [] },
    { name: 'users', description: 'User management', enabled: true, requiredScopes: [] },
    { name: 'cohorts', description: 'User cohorts', enabled: true, requiredScopes: [] },
    { name: 'charts', description: 'Charts and visualization', enabled: true, requiredScopes: [] },
    { name: 'exports', description: 'Data export', enabled: true, requiredScopes: [] },
    { name: 'projects', description: 'Project management', enabled: true, requiredScopes: [] },
  ]

  private eventsCache: Map<string, AmplitudeEvent[]> = new Map()
  private usersCache: Map<string, AmplitudeUser[]> = new Map()
  private cohortsCache: Map<string, AmplitudeCohort[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    const config = this.config
    try {
      // Amplitude uses API Key authentication
      const apiKey = config.apiKey || config.clientSecret
  }

      if (!apiKey) {
        throw new Error('API Key is required for Amplitude authentication')
      }

      const _userProfile = await this.getUserProfile(apiKey)

      await this.encryptionService.encryptToken(apiKey, config.userId)

      return {
        success: true,
        accessToken: apiKey
        refreshToken: ''
        // API keys don't expire, so no expiresAt
      }
    } catch (error) {
      this.logger.error('Amplitude authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in amplitude.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const apiKey = await this.getApiKey(config.userId)
      const _profile = await this.getUserProfile(apiKey)
  }

      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      this.logger.error('Failed to get Amplitude connection status:', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message}

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Amplitude webhook')
  }

      const data = payload.data
      const eventType = data.event_type

      switch (eventType) {
        case 'cohort.created':
        case 'cohort.updated':
        case 'cohort.deleted':
          await this.handleCohortEvent(data)
          break
        case 'project.created':
        case 'project.updated':
          await this.handleProjectEvent(data)
          break
        default:
          this.logger.log(`Unhandled Amplitude webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logger.error('Amplitude webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in amplitude.integration.ts:', error)
      throw error
    }
  // Project Management
  async getUserProfile(apiKey?: string): Promise<AmplitudeProject> {
    const key = apiKey || (await this.getApiKey())
  }

    const _response = await this.makeRequest('/projects', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`})

    return (response as Response).data?.[0] || { id: 1, name: 'Default Project' }

  async getProjects(apiKey?: string): Promise<AmplitudeProject[]> {
    const key = apiKey || (await this.getApiKey())
  }

    const _response = await this.makeRequest('/projects', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`})

    return (response as Response).data || []
  }

  // Event Tracking
  async trackEvent(events: AmplitudeEvent[], apiKey?: string): Promise<boolean> {
    const key = apiKey || (await this.getApiKey())
  }

    const _response = await this.makeRequest('/2/httpapi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        api_key,
        events: events.map(event => ({
          ...event,
          time: event.time || Date.now()}))})})

    return (response as Response).code === 200
  }

  async trackSingleEvent(_event: AmplitudeEvent, apiKey?: string): Promise<boolean> {
    return this.trackEvent([_event], apiKey)
  }

  async getEvents(
    start: string,
    end: string
    limit: number = 1000
    apiKey?: string,
  ): Promise<AmplitudeEvent[]> {
    const key = apiKey || (await this.getApiKey())
    const cacheKey = `events_${start}_${end}_${limit}`

    if (this.eventsCache.has(cacheKey)) {
      return this.eventsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/export', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`},
      params: {
        start,
        end,
        limit: limit.toString()})

    const events = response.data || []
    this.eventsCache.set(cacheKey, events),
    return events
  }

  // User Analytics
  async getUsers(
    start: string,
    end: string
    limit: number = 1000
    apiKey?: string,
  ): Promise<AmplitudeUser[]> {
    const key = apiKey || (await this.getApiKey())
    const cacheKey = `users_${start}_${end}_${limit}`

    if (this.usersCache.has(cacheKey)) {
      return this.usersCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/usersearch', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`},
      params: {
        start,
        end,
        limit: limit.toString()})

    const users = response.matches || []
    this.usersCache.set(cacheKey, users),
    return users
  }

  async getUserActivity(
    userId: string,
    start: string
    end: string
    apiKey?: string,
  ): Promise<AmplitudeEvent[]> {
    const key = apiKey || (await this.getApiKey())

    const _response = await this.makeRequest('/useractivity', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`},
      params: { user: userId
        start,
        end})

    return (response as Response).events || []
  }

  async setUserProperties(
    userId: string,
    properties: Record<string, unknown>,
    apiKey?: string,
  ): Promise<boolean> {
    const key = apiKey || (await this.getApiKey())

    const _response = await this.makeRequest('/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        api_key,
        identification: [
          {
            user_id: userId
            user_properties},
        ]})})

    return (response as Response).code === 200
  }

  // Cohorts Management
  async getCohorts(apiKey?: string): Promise<AmplitudeCohort[]> {
    const key = apiKey || (await this.getApiKey())
    const cacheKey = 'cohorts_all'
  }

    if (this.cohortsCache.has(cacheKey)) {
      return this.cohortsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/cohorts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`})

    const cohorts = response.cohorts || []
    this.cohortsCache.set(cacheKey, cohorts),
    return cohorts
  }

  async createCohort(
    name: string,
    definition: unknown
    description?: string,
    apiKey?: string,
  ): Promise<AmplitudeCohort> {
    const key = apiKey || (await this.getApiKey())

    const _response = await this.makeRequest('/cohorts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({
        name,
        description,
        definition})})

    return (response as Response).cohort
  }

  async getCohortUsers(cohortId: string, apiKey?: string): Promise<string[]> {
    const key = apiKey || (await this.getApiKey())
  }

    const _response = await this.makeRequest(`/cohorts/${cohortId}/users`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`})

    return (response as Response).cohortUsers || []
  }

  // Charts & Analytics
  async getChart(chartId: string, apiKey?: string): Promise<AmplitudeChart> {
    const key = apiKey || (await this.getApiKey())
  }

    const _response = await this.makeRequest(`/chart/${chartId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`})

    return response
  }

  async createChart(chart: Partial<AmplitudeChart>, apiKey?: string): Promise<AmplitudeChart> {
    const key = apiKey || (await this.getApiKey())
  }

    const _response = await this.makeRequest('/chart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(chart)})

    return response
  }

  async getEventSegmentation(
    event: string,
    start: string
    end: string,
    interval: string = 'day'
    groupBy?: string,
    apiKey?: string,
  ): Promise<ApiResponse> {
    const key = apiKey || (await this.getApiKey())

    const _response = await this.makeRequest('/events/segmentation', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`},
      params: {,
        e: JSON.stringify({ event_type: _event }),
        start,
        end,
        i: interval
        ...(groupBy && { g: groupBy })})

    return (response as Response).data
  }

  async getFunnel(
    events: string[],
    start: string
    end: string,
    mode: 'ordered' | 'unordered' = 'ordered'
    apiKey?: string,
  ): Promise<ApiResponse> {
    const key = apiKey || (await this.getApiKey())

    const _response = await this.makeRequest('/funnels', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`},
      params: {,
        e: JSON.stringify(events.map(event => ({ event_type: _event }))),
        start,
        end,
        mode})

    return (response as Response).data
  }

  async getRetention(
    startEvent: string,
    returnEvent: string
    start: string,
    end: string
    apiKey?: string,
  ): Promise<ApiResponse> {
    const key = apiKey || (await this.getApiKey())

    const _response = await this.makeRequest('/retention', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`},
      params: {,
        se: JSON.stringify({ event_type: startEvent }),
        re: JSON.stringify({ event_type: returnEvent }),
        start,
        end})

    return (response as Response).data
  }

  // Data Export
  async exportData(
    start: string,
    end: string
    format: 'json' | 'csv' = 'json'
    apiKey?: string,
  ): Promise<string> {
    const key = apiKey || (await this.getApiKey())

    const _response = await this.makeRequest('/export', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`},
      params: {
        start,
        end,
        format})

    return (response as Response).zip_url || response.data
  }

  // Helper Methods
  private async syncRecentEvents(apiKey: string): Promise<AmplitudeEvent[]> {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return this.getEvents(
      oneWeekAgo.toISOString().split('T')[0].replace(/-/g, ''),
      new Date().toISOString().split('T')[0].replace(/-/g, ''),
      100,
      apiKey,
    )
  }

  private async syncUsers(apiKey: string): Promise<AmplitudeUser[]> {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return this.getUsers(
      oneWeekAgo.toISOString().split('T')[0].replace(/-/g, ''),
      new Date().toISOString().split('T')[0].replace(/-/g, ''),
      100,
      apiKey,
    )
  }

  private async syncCohorts(apiKey: string): Promise<AmplitudeCohort[]> {
    return this.getCohorts(apiKey)
  }

  private async handleCohortEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing cohort _event: ${data.event_type}`)
      this.cohortsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle cohort _event:', error)
    }

  private async handleProjectEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing project _event: ${data.event_type}`)
      // Clear relevant caches
      this.eventsCache.clear()
      this.usersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle project _event:', error)
    }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://amplitude.com/api${endpoint}`

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

    return (response as Response).json()
  }

  private async getApiKey(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for API key retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  // Cleanup method
  clearCache(): void {
    this.eventsCache.clear()
    this.usersCache.clear()
    this.cohortsCache.clear()
  }

  // Abstract method implementations
  async refreshToken(): Promise<AuthResult> {
    // API keys don't expire, so just validate the connection
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Clear local state
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error(`Failed to revoke ${this.provider} access:`, error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const apiKey = await this.getApiKey(this.userId)
      await this.getUserProfile(apiKey)
      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message || 'Connection test failed'}
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
      const apiKey = await this.getApiKey(this.userId)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]
  }

      const results = await Promise.allSettled([
        this.getEvents(yesterday, today, 100, apiKey),
        this.getCohorts(apiKey),
      ])

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason.message)

      return {
        success: true,
        itemsProcessed: results.filter(r => r.status === 'fulfilled').length
        itemsSkipped: 0
        errors,
        metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
    } catch (error) {
      return {
        success: false,
        itemsProcessed: 0
        itemsSkipped: 0,
        errors: [(error as Error).message]
        metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    return true
  }

}