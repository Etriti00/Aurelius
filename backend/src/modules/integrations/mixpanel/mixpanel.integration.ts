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

interface MixpanelWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface MixpanelProject {
  id: number,
  name: string
  token: string,
  api_secret: string
  timezone: string,
  is_demo: boolean
  cluster: string,
  created: string
}

interface MixpanelEvent {
  event: string,
  properties: {
    time: number,
    distinct_id: string
    token?: string
    [key: string]: unknown
  }
}

interface MixpanelUser {
  distinct_id: string,
  properties: {
    $created: string
    $email?: string
    $first_name?: string
    $last_name?: string
    $name?: string
    $phone?: string
    $avatar?: string
    $city?: string
    $region?: string
    $country_code?: string
    $timezone?: string
    [key: string]: unknown
  }
  last_seen: string,
  events: number
  sessions: number
}

interface MixpanelCohort {
  id: number,
  name: string
  description?: string
  count: number,
  is_visible: boolean
  definition: {,
    events: unknown[]
    properties: unknown[]
  }
  created: string,
  project_id: number
}

interface MixpanelFunnel {
  funnel_id: number,
  name: string
  steps: {,
    event: string
    label?: string
    properties?: unknown[]
  }[]
  date_created: string,
  project_id: number
}

interface MixpanelReport {
  report_id: string,
  name: string
  type: 'insights' | 'funnels' | 'retention' | 'flows',
  data: Record<string, unknown>
  date_created: string,
  date_modified: string
  project_id: number
}

interface MixpanelInsight {
  series: {,
    event: string
    label?: string
  }[]
  unit: 'day' | 'week' | 'month' | 'quarter',
  interval: number
  from_date: string,
  to_date: string
  data: {,
    series: unknown[]
    values: Record<string, number[]>
  }
}

interface MixpanelRetention {
  retention_type: 'birth' | 'compounded',
  unit: 'day' | 'week' | 'month'
  interval: number,
  interval_count: number
  from_date: string,
  to_date: string
  data: {,
    values: Record<string, number[]>
    dates: string[]
  }
}

interface MixpanelAnnotation {
  id: number,
  project_id: number
  date: string,
  description: string
  created: string
}

interface MixpanelExport {
  export_id: string,
  status: 'pending' | 'running' | 'complete' | 'failed'
  download_url?: string
  created_at: string
  completed_at?: string
  params: {,
    from_date: string
    to_date: string
    event?: string[]
    where?: string
    bucket?: string
  }
}

export class MixpanelIntegration extends BaseIntegration {
  readonly provider = 'mixpanel'
  readonly name = 'Mixpanel'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://mixpanel.com/api/2.0'
  private readonly ingestBaseUrl = 'https://api.mixpanel.com'

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
        return this.makeApiCall('/projects', 'GET')
      })

      const project = Array.isArray(response) ? response[0] : response

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // API keys don't expire (1 year default)
        scope: ['read', 'write'],
        data: project
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
      // Mixpanel uses API keys that don't expire, so we just validate the connection
      return this.authenticate()
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
      IntegrationCapability.ANALYTICS,
      IntegrationCapability.EVENTS,
      IntegrationCapability.USERS,
      IntegrationCapability.REPORTS,
      IntegrationCapability.WEBHOOKS,
      IntegrationCapability.DATA_EXPORT,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/projects', 'GET')
      })

      const project = Array.isArray(response) ? response[0] : response

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          projectId: project.id
          projectName: project.name,
          timezone: project.timezone
          cluster: project.cluster
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

      // Sync projects
      try {
        const projectResult = await this.syncProjects()
        totalProcessed += projectResult.processed
        totalErrors += projectResult.errors
        if (projectResult.errorMessages) {
          errors.push(...projectResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Project sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync cohorts
      try {
        const cohortResult = await this.syncCohorts()
        totalProcessed += cohortResult.processed
        totalErrors += cohortResult.errors
        if (cohortResult.errorMessages) {
          errors.push(...cohortResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Cohort sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync funnels
      try {
        const funnelResult = await this.syncFunnels()
        totalProcessed += funnelResult.processed
        totalErrors += funnelResult.errors
        if (funnelResult.errorMessages) {
          errors.push(...funnelResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Funnel sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Mixpanel sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const mixpanelPayload = payload as MixpanelWebhookPayload

      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload.body || '', payload.headers || {})) {
        throw new Error('Invalid webhook signature')
      }

      switch (mixpanelPayload.type) {
        case 'event.tracked':
          await this.handleEventWebhook(mixpanelPayload)
          break
        case 'user.updated':
        case 'user.created':
          await this.handleUserWebhook(mixpanelPayload)
          break
        case 'cohort.updated':
        case 'cohort.created':
          await this.handleCohortWebhook(mixpanelPayload)
          break
        case 'export.completed':
          await this.handleExportWebhook(mixpanelPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${mixpanelPayload.type}`)
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
      // Mixpanel doesn't have a specific disconnect endpoint
      // The API key will remain valid until manually revoked
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncProjects(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.projects', async () => {
        return this.makeApiCall('/projects', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const projects = Array.isArray(response) ? response : [response]

      for (const project of projects) {
        try {
          await this.processProject(project)
          processed++
        } catch (error) {
          errors.push(`Failed to process project ${project.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Project sync failed: ${(error as Error).message}`)
    }
  }

  private async syncCohorts(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.cohorts', async () => {
        return this.makeApiCall('/cohorts/list', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const cohorts = response || []

      for (const cohort of cohorts) {
        try {
          await this.processCohort(cohort)
          processed++
        } catch (error) {
          errors.push(`Failed to process cohort ${cohort.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Cohort sync failed: ${(error as Error).message}`)
    }
  }

  private async syncFunnels(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.funnels', async () => {
        return this.makeApiCall('/funnels/list', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const funnels = response || []

      for (const funnel of funnels) {
        try {
          await this.processFunnel(funnel)
          processed++
        } catch (error) {
          errors.push(`Failed to process funnel ${funnel.funnel_id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Funnel sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processProject(project: any): Promise<void> {
    this.logger.debug(`Processing Mixpanel project: ${project.name}`)
    // Process project data for Aurelius AI system
  }

  private async processCohort(cohort: any): Promise<void> {
    this.logger.debug(`Processing Mixpanel cohort: ${cohort.name}`)
    // Process cohort data for Aurelius AI system
  }

  private async processFunnel(funnel: any): Promise<void> {
    this.logger.debug(`Processing Mixpanel funnel: ${funnel.name}`)
    // Process funnel data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleEventWebhook(payload: MixpanelWebhookPayload): Promise<void> {
    this.logger.debug(`Handling event webhook: ${payload.id}`)
    // Handle event webhook processing
  }

  private async handleUserWebhook(payload: MixpanelWebhookPayload): Promise<void> {
    this.logger.debug(`Handling user webhook: ${payload.id}`)
    // Handle user webhook processing
  }

  private async handleCohortWebhook(payload: MixpanelWebhookPayload): Promise<void> {
    this.logger.debug(`Handling cohort webhook: ${payload.id}`)
    // Handle cohort webhook processing
  }

  private async handleExportWebhook(payload: MixpanelWebhookPayload): Promise<void> {
    this.logger.debug(`Handling export webhook: ${payload.id}`)
    // Handle export webhook processing
  }

  // Helper method for webhook signature verification
  private verifyWebhookSignature(body: string, headers: Record<string, string>): boolean {
    try {
      const signature = headers['x-mixpanel-signature'] || headers['X-Mixpanel-Signature']
      if (!signature || !this.config?.webhookSecret) {
        return false
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('hex')

      return signature === expectedSignature
    } catch (error) {
      this.logError('verifyWebhookSignature' error as Error)
      return false
    }
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

    const auth = Buffer.from(`${this.accessToken}:`).toString('base64')

    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
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
        `Mixpanel API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    } else {
      return response.text()
    }
  }

  // Helper method for ingest API calls
  private async makeIngestCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'POST'
    body?: unknown,
  ): Promise<any> {
    const url = `${this.ingestBaseUrl}${endpoint}`

    const headers: Record<string, string> = {
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
        `Mixpanel Ingest API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    return response.json()
  }

  // Public API methods
  async getProjects(): Promise<MixpanelProject[]> {
    try {
      const response = await this.executeWithProtection('api.get_projects', async () => {
        return this.makeApiCall('/projects', 'GET')
      })

      return Array.isArray(response) ? response : [response]
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get projects: ${(error as Error).message}`)
    }
  }

  async trackEvent(eventData: {,
    event: string
    distinct_id: string
    properties?: Record<string, unknown>
    time?: number
  }): Promise<void> {
    try {
      const data = {
        event: eventData.event,
        properties: {
          ...eventData.properties,
          distinct_id: eventData.distinct_id,
          time: eventData.time || Math.floor(Date.now() / 1000)
          token: this.accessToken
        }
      }

      await this.executeWithProtection('api.track_event', async () => {
        return this.makeIngestCall('/track', 'POST', data)
      })
    } catch (error) {
      this.logError('trackEvent', error as Error)
      throw new Error(`Failed to track event: ${(error as Error).message}`)
    }
  }

  async trackEvents(events: MixpanelEvent[]): Promise<void> {
    try {
      const eventsData = events.map(event => ({
        ...event,
        properties: {
          ...event.properties,
          token: this.accessToken
        }
      }))

      await this.executeWithProtection('api.track_events', async () => {
        return this.makeIngestCall('/track', 'POST', eventsData)
      })
    } catch (error) {
      this.logError('trackEvents', error as Error)
      throw new Error(`Failed to track events: ${(error as Error).message}`)
    }
  }

  async setUserProfile(profileData: {,
    distinct_id: string
    properties: Record<string, unknown>
    operation?: '$set' | '$set_once' | '$add' | '$append' | '$union' | '$unset'
  }): Promise<void> {
    try {
      const operation = profileData.operation || '$set'
      const data = {
        $token: this.accessToken
        $distinct_id: profileData.distinct_id
        [operation]: profileData.properties
      }

      await this.executeWithProtection('api.set_user_profile', async () => {
        return this.makeIngestCall('/engage', 'POST', data)
      })
    } catch (error) {
      this.logError('setUserProfile', error as Error)
      throw new Error(`Failed to set user profile: ${(error as Error).message}`)
    }
  }

  async getEvents(params: {,
    from_date: string
    to_date: string
    event?: string[]
    where?: string
  }): Promise<MixpanelEvent[]> {
    try {
      const response = await this.executeWithProtection('api.get_events', async () => {
        return this.makeApiCall('/export', 'GET', undefined, params)
      })

      // Parse JSONL response if needed
      if (typeof response === 'string') {
        return response
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line))
      }

      return response
    } catch (error) {
      this.logError('getEvents', error as Error)
      throw new Error(`Failed to get events: ${(error as Error).message}`)
    }
  }

  async getInsights(params: {,
    events: string[]
    unit: 'day' | 'week' | 'month' | 'quarter',
    interval: number
    from_date: string,
    to_date: string
  }): Promise<MixpanelInsight> {
    try {
      const response = await this.executeWithProtection('api.get_insights', async () => {
        return this.makeApiCall('/insights', 'GET', undefined, {
          ...params,
          events: JSON.stringify(params.events)
        })
      })

      return response
    } catch (error) {
      this.logError('getInsights', error as Error)
      throw new Error(`Failed to get insights: ${(error as Error).message}`)
    }
  }

  async getFunnels(): Promise<MixpanelFunnel[]> {
    try {
      const response = await this.executeWithProtection('api.get_funnels', async () => {
        return this.makeApiCall('/funnels/list', 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getFunnels', error as Error)
      throw new Error(`Failed to get funnels: ${(error as Error).message}`)
    }
  }

  async getFunnelData(params: {,
    funnel_id: number
    from_date: string,
    to_date: string
    unit?: 'day' | 'week' | 'month'
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.get_funnel_data', async () => {
        return this.makeApiCall('/funnels', 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getFunnelData', error as Error)
      throw new Error(`Failed to get funnel data: ${(error as Error).message}`)
    }
  }

  async getCohorts(): Promise<MixpanelCohort[]> {
    try {
      const response = await this.executeWithProtection('api.get_cohorts', async () => {
        return this.makeApiCall('/cohorts/list', 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getCohorts', error as Error)
      throw new Error(`Failed to get cohorts: ${(error as Error).message}`)
    }
  }

  async createCohort(cohortData: {,
    cohort_name: string
    definition: any
    description?: string
  }): Promise<MixpanelCohort> {
    try {
      const response = await this.executeWithProtection('api.create_cohort', async () => {
        return this.makeApiCall('/cohorts/create', 'POST', cohortData)
      })

      return response
    } catch (error) {
      this.logError('createCohort', error as Error)
      throw new Error(`Failed to create cohort: ${(error as Error).message}`)
    }
  }

  async getRetention(params: {,
    retention_type: 'birth' | 'compounded'
    unit: 'day' | 'week' | 'month',
    interval: number
    interval_count: number,
    from_date: string
    to_date: string
    born_event?: string
    return_event?: string
  }): Promise<MixpanelRetention> {
    try {
      const response = await this.executeWithProtection('api.get_retention', async () => {
        return this.makeApiCall('/retention', 'GET', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('getRetention', error as Error)
      throw new Error(`Failed to get retention: ${(error as Error).message}`)
    }
  }

  async getAnnotations(params: {,
    from_date: string
    to_date: string
  }): Promise<MixpanelAnnotation[]> {
    try {
      const response = await this.executeWithProtection('api.get_annotations', async () => {
        return this.makeApiCall('/annotations', 'GET', undefined, params)
      })

      return response.annotations || []
    } catch (error) {
      this.logError('getAnnotations', error as Error)
      throw new Error(`Failed to get annotations: ${(error as Error).message}`)
    }
  }

  async createAnnotation(annotationData: {,
    date: string
    description: string
  }): Promise<MixpanelAnnotation> {
    try {
      const response = await this.executeWithProtection('api.create_annotation', async () => {
        return this.makeApiCall('/annotations/create', 'POST', annotationData)
      })

      return response
    } catch (error) {
      this.logError('createAnnotation', error as Error)
      throw new Error(`Failed to create annotation: ${(error as Error).message}`)
    }
  }

  async createExport(params: {,
    from_date: string
    to_date: string
    event?: string[]
    where?: string
  }): Promise<MixpanelExport> {
    try {
      const response = await this.executeWithProtection('api.create_export', async () => {
        return this.makeApiCall('/export', 'POST', undefined, params)
      })

      return response
    } catch (error) {
      this.logError('createExport', error as Error)
      throw new Error(`Failed to create export: ${(error as Error).message}`)
    }
  }

  async getEventNames(params?: { type?: 'general' | 'unique'; limit?: number }): Promise<string[]> {
    try {
      const response = await this.executeWithProtection('api.get_event_names', async () => {
        return this.makeApiCall('/events/names', 'GET', undefined, params)
      })

      return response || []
    } catch (error) {
      this.logError('getEventNames', error as Error)
      throw new Error(`Failed to get event names: ${(error as Error).message}`)
    }
  }

  async getEventProperties(params: {,
    event: string
    limit?: number
  }): Promise<Record<string, unknown>> {
    try {
      const response = await this.executeWithProtection('api.get_event_properties', async () => {
        return this.makeApiCall('/events/properties', 'GET', undefined, params)
      })

      return response || {}
    } catch (error) {
      this.logError('getEventProperties', error as Error)
      throw new Error(`Failed to get event properties: ${(error as Error).message}`)
    }
  }

  async getUserProfiles(params?: { session_id?: string; page?: number }): Promise<MixpanelUser[]> {
    try {
      const response = await this.executeWithProtection('api.get_user_profiles', async () => {
        return this.makeApiCall('/engage', 'GET', undefined, params)
      })

      return response.results || []
    } catch (error) {
      this.logError('getUserProfiles', error as Error)
      throw new Error(`Failed to get user profiles: ${(error as Error).message}`)
    }
  }

  async getUserProfile(distinctId: string): Promise<MixpanelUser> {
    try {
      const response = await this.executeWithProtection('api.get_user_profile', async () => {
        return this.makeApiCall('/engage', 'GET', undefined, { distinct_id: distinctId })
      })

      return response.results?.[0] || response
    } catch (error) {
      this.logError('getUserProfile', error as Error)
      throw new Error(`Failed to get user profile: ${(error as Error).message}`)
    }
  }
}
