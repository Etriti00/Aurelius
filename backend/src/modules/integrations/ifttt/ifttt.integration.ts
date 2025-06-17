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
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface


interface IFTTTUser {
  id: string,
  email: string
  name?: string
  timezone?: string
  country?: string
  language?: string
  created_at: string,
  features: string[]
  plan: 'free' | 'pro' | 'pro+'
}

interface IFTTTService {
  id: string,
  name: string
  short_name: string,
  description: string
  status: 'published' | 'draft' | 'live',
  logo_url: string
  branding_color: string,
  url: string
  channel_url: string,
  has_triggers: boolean
  has_actions: boolean,
  embed_actions: boolean
  embed_triggers: boolean
}

interface IFTTTApplet {
  id: string,
  name: string
  description: string,
  published: boolean
  status: 'enabled' | 'disabled' | 'never_run',
  url: string
  user: {,
    id: string
    name: string
  },
    services: Array<{,
    id: string
    name: string,
    short_name: string
    logo_url: string
  }>
  created_at: string,
  updated_at: string
  embedded: {,
    trigger: {
      type: string,
      service: {
        id: string,
        name: string
        short_name: string
      },
    actions: Array<{,
      type: string
      service: {,
        id: string
        name: string,
        short_name: string
      }>
  }

interface IFTTTTrigger {
  type: string,
  service: string
  service_id: string,
  service_name: string
  description: string,
  trigger_fields: Array<{
    name: string,
    type: string
    required: boolean
    value?: unknown
  }>
}

interface IFTTTAction {
  type: string,
  service: string
  service_id: string,
  service_name: string
  description: string,
  action_fields: Array<{
    name: string,
    type: string
    required: boolean
    value?: unknown
  }>
}

interface IFTTTConnection {
  id: string,
  service_id: string
  service_name: string,
  status: 'connected' | 'disconnected' | 'error'
  created_at: string,
  updated_at: string
  user_id: string
}

interface IFTTTWebhookEvent {
  webhook_id: string,
  trigger_identity: string
  user_id: string,
  occurred_at: string
  meta: {,
    id: string
    timestamp: number
  }
  data: Record<string, unknown>
}

export class IFTTTIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'ifttt'
  readonly name = 'IFTTT'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'applets', description: 'Applets features', enabled: true, requiredScopes: [] },
    { name: 'services', description: 'Services features', enabled: true, requiredScopes: [] },
    { name: 'triggers', description: 'Triggers features', enabled: true, requiredScopes: [] },
    { name: 'actions', description: 'Actions features', enabled: true, requiredScopes: [] },
    { name: 'connections', description: 'Connections features', enabled: true, requiredScopes: [] },
    { name: 'webhooks', description: 'Webhooks features', enabled: true, requiredScopes: [] },
    { name: 'automation', description: 'Automation features', enabled: true, requiredScopes: [] },
  ]

  private servicesCache: Map<string, IFTTTService> = new Map()
  private appletsCache: Map<string, IFTTTApplet> = new Map()
  private connectionsCache: Map<string, IFTTTConnection> = new Map()

  async authenticate(config?: IntegrationConfig): Promise<AuthResult> {
    try {
      const tokenResponse = await this.exchangeCredentialsForToken(config)
      const _userInfo = await this.getCurrentUser(tokenResponse.access_token)
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
        data: { accessToken: tokenResponse.access_token
          refreshToken: tokenResponse.refresh_token,
          expiresIn: tokenResponse.expires_in || 3600
          userId, : userInfo.id,
          userInfo: {,
            id: userInfo.id
            name: userInfo.name || userInfo.email,
            email: userInfo.email}
    } catch (error) {
      this.logger.error('IFTTT authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncApplets(accessToken),
        this.syncServices(accessToken),
        this.syncConnections(accessToken),
      ])
  }

      const appletsResult = results[0]
      const servicesResult = results[1]
      const connectionsResult = results[2]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          applets: appletsResult.status === 'fulfilled' ? appletsResult.value : [],
          services: servicesResult.status === 'fulfilled' ? servicesResult.value : []
          connections: connectionsResult.status === 'fulfilled' ? connectionsResult.value : [],
          syncedAt: new Date().toISOString()
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined}
    } catch (error) {
      this.logger.error('IFTTT sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _user = await this.getCurrentUser(accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      this.logger.error('Failed to get IFTTT connection status:', error)
      return {
        isConnected: false,
        error: error.message}

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing IFTTT webhook')
  }

      const data = payload.data

      if (data.trigger_identity) {
        await this.handleTriggerWebhook(data)
      }

      if (data.applet_id) {
        await this.handleAppletWebhook(data)
      }
    } catch (error) {
      this.logger.error('IFTTT webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in ifttt.integration.ts:', error)
      throw error
    }
  // User Management
  async getCurrentUser(accessToken?: string): Promise<IFTTTUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v1/user/info', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Applets Management
  async getApplets(accessToken?: string): Promise<IFTTTApplet[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v1/user/applets', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        embed: 'trigger,actions,services'})

    const applets = response.data || []
    applets.forEach(applet => this.appletsCache.set(applet.id, applet)),
    return applets
  }

  async getApplet(appletId: string, accessToken?: string): Promise<IFTTTApplet> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.appletsCache.has(appletId)) {
      return this.appletsCache.get(appletId)!
    }

    const _response = await this.makeRequest(`/v1/user/applets/${appletId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        embed: 'trigger,actions,services'})

    this.appletsCache.set(appletId, response.data)
    return (response as Response).data
  }

  async enableApplet(appletId: string, accessToken?: string): Promise<IFTTTApplet> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v1/user/applets/${appletId}/enable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'})

    this.appletsCache.delete(appletId)
    return (response as Response).data
  }

  async disableApplet(appletId: string, accessToken?: string): Promise<IFTTTApplet> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v1/user/applets/${appletId}/disable`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'})

    this.appletsCache.delete(appletId)
    return (response as Response).data
  }

  async createApplet(
    triggerService: string,
    triggerType: string
    triggerFields: Record<string, unknown>,
    actionService: string,
    actionType: string
    actionFields: Record<string, unknown>,
    accessToken?: string,
  ): Promise<IFTTTApplet> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/v1/user/applets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        trigger: {
          service: triggerService,
          type: triggerType
          fields: triggerFields},
        actions: [
          {
            service: actionService,
            type: actionType
            fields: actionFields},
        ]})})

    const applet = response.data
    this.appletsCache.set(applet.id, applet),
    return applet
  }

  // Services Management
  async getServices(accessToken?: string): Promise<IFTTTService[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.servicesCache.size > 0) {
      return Array.from(this.servicesCache.values())
    }

    const _response = await this.makeRequest('/v1/services', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const services = response.data || []
    services.forEach(service => this.servicesCache.set(service.id, service)),
    return services
  }

  async getService(serviceId: string, accessToken?: string): Promise<IFTTTService> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.servicesCache.has(serviceId)) {
      return this.servicesCache.get(serviceId)!
    }

    const _response = await this.makeRequest(`/v1/services/${serviceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    this.servicesCache.set(serviceId, response.data)
    return (response as Response).data
  }

  // Triggers Management
  async getServiceTriggers(serviceId: string, accessToken?: string): Promise<IFTTTTrigger[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v1/services/${serviceId}/triggers`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data || []
  }

  async getTrigger(
    serviceId: string,
    triggerType: string
    accessToken?: string,
  ): Promise<IFTTTTrigger> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v1/services/${serviceId}/triggers/${triggerType}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Actions Management
  async getServiceActions(serviceId: string, accessToken?: string): Promise<IFTTTAction[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v1/services/${serviceId}/actions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data || []
  }

  async getAction(
    serviceId: string,
    actionType: string
    accessToken?: string,
  ): Promise<IFTTTAction> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v1/services/${serviceId}/actions/${actionType}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data
  }

  // Connections Management
  async getConnections(accessToken?: string): Promise<IFTTTConnection[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v1/user/connections', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const connections = response.data || []
    connections.forEach(conn => this.connectionsCache.set(conn.id, conn)),
    return connections
  }

  async getConnection(connectionId: string, accessToken?: string): Promise<IFTTTConnection> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.connectionsCache.has(connectionId)) {
      return this.connectionsCache.get(connectionId)!
    }

    const _response = await this.makeRequest(`/v1/user/connections/${connectionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    this.connectionsCache.set(connectionId, response.data)
    return (response as Response).data
  }

  async connectService(serviceId: string, accessToken?: string): Promise<IFTTTConnection> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/v1/user/connections`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({,
        service_id: serviceId})})

    const connection = response.data
    this.connectionsCache.set(connection.id, connection),
    return connection
  }

  async disconnectService(connectionId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/v1/user/connections/${connectionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    this.connectionsCache.delete(connectionId)
    return true
  }

  // Webhooks Management
  async triggerWebhookEvent(
    webhookKey: string,
    eventData: Record<string, unknown>,
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/v1/webhooks/${webhookKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(eventData)})

    return (response as Response).data?.result === 'OK'
  }

  // Search and Discovery
  async searchApplets(query: string, accessToken?: string): Promise<IFTTTApplet[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v1/applets/search', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        q: query
        limit: 50})

    return (response as Response).data || []
  }

  async searchServices(query: string, accessToken?: string): Promise<IFTTTService[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/v1/services/search', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        q: query
        limit: 50})

    return (response as Response).data || []
  }

  // Helper Methods
  private async syncApplets(accessToken: string): Promise<IFTTTApplet[]> {
    return this.getApplets(accessToken)
  }

  private async syncServices(accessToken: string): Promise<IFTTTService[]> {
    return this.getServices(accessToken)
  }

  private async syncConnections(accessToken: string): Promise<IFTTTConnection[]> {
    return this.getConnections(accessToken)
  }

  private async handleTriggerWebhook(data: IFTTTWebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing trigger webhook for ${data.trigger_identity}`)
      // Handle trigger events
    } catch (error) {
      this.logger.error(`Failed to handle trigger webhook:`, error)
    }

  private async handleAppletWebhook(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing applet webhook for ${data.applet_id}`)
      this.appletsCache.delete(data.applet_id)
    } catch (error) {
      this.logger.error(`Failed to handle applet webhook:`, error)
    }

  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://connect.ifttt.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({,
        grant_type: 'authorization_code'
        client_id: config.clientId!,
        client_secret: config.clientSecret!
        code: config.code || '',
        redirect_uri: config.redirectUri || ''})})

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://connect.ifttt.com${endpoint}`

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

  private async getAccessToken(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for token retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  // Cleanup method
  clearCache(): void {
    this.servicesCache.clear()
    this.appletsCache.clear()
    this.connectionsCache.clear()
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