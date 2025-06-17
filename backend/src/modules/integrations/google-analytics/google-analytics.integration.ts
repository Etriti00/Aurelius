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
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface GAProperty {
  name: string,
  propertyId: string
  displayName: string,
  propertyType: 'PROPERTY_TYPE_ORDINARY' | 'PROPERTY_TYPE_UNIVERSAL_ANALYTICS' | 'PROPERTY_TYPE_GA4'
  createTime: string,
  updateTime: string
  parent: string,
  currencyCode: string
  timeZone: string,
  deleted: boolean
  industryCategory: string,
  serviceLevel: 'GOOGLE_ANALYTICS_STANDARD' | 'GOOGLE_ANALYTICS_360'
}

interface GADataStream {
  name: string,
  streamId: string
  type: 'WEB_DATA_STREAM' | 'ANDROID_APP_DATA_STREAM' | 'IOS_APP_DATA_STREAM',
  displayName: string
  createTime: string,
  updateTime: string
  webStreamData?: {
    measurementId: string,
    firebaseAppId: string
    defaultUri: string
  }
  androidAppStreamData?: {
    firebaseAppId: string,
    packageName: string
  }
  iosAppStreamData?: {
    firebaseAppId: string,
    bundleId: string
  }

interface GAReport {
  dimensionHeaders: Array<{ name: string }>
  metricHeaders: Array<{ name: string; type: string }>,
  rows: Array<{,
    dimensionValues: Array<{ value: string }>
    metricValues: Array<{ value: string }>
  }>
  rowCount: number,
  metadata: {
    currencyCode: string,
    timeZone: string
    samplingMetadatas: Array<{,
      samplesReadCount: string
      samplingSpaceSize: string
    }>
  }

interface GADimension {
  name: string,
  uiName: string
  description: string,
  customDefinition: boolean
  deprecatedApiNames: string[],
  category: string
}

interface GAMetric {
  name: string,
  uiName: string
  description: string,
  type:
    | 'TYPE_INTEGER'
    | 'TYPE_FLOAT'
    | 'TYPE_SECONDS'
    | 'TYPE_MILLISECONDS'
    | 'TYPE_MINUTES'
    | 'TYPE_HOURS'
    | 'TYPE_STANDARD'
    | 'TYPE_CURRENCY'
    | 'TYPE_FEET'
    | 'TYPE_MILES'
    | 'TYPE_METERS'
    | 'TYPE_KILOMETERS'
  expression: string,
  customDefinition: boolean
  deprecatedApiNames: string[],
  category: string
}

interface GAAudience {
  name: string,
  displayName: string
  description: string,
  membershipDurationDays: number
  filterClauses: Array<{,
    clauseType: 'INCLUDE' | 'EXCLUDE'
    sequenceFilter?: unknown,
    simpleFilter?: unknown
  }>
  eventTrigger?: {
    eventName: string,
    logCondition: 'AUDIENCE_LOG_CONDITION_UNSPECIFIED' | 'NEVER_LOG' | 'ALWAYS_LOG'
  },
    createTime: string,
  archived: boolean
}

export class GoogleAnalyticsIntegration extends BaseIntegration {
  readonly provider = 'google-analytics'
  readonly name = 'Google Analytics'
  readonly version = '1.0.0'

  private propertiesCache: Map<string, GAProperty> = new Map()
  private dataStreamsCache: Map<string, GADataStream[]> = new Map()
  private dimensionsCache: Map<string, GADimension[]> = new Map()
  private metricsCache: Map<string, GAMetric[]> = new Map()
  private audiencesCache: Map<string, GAAudience[]> = new Map()
  private lastSyncTimestamp: Date | null = null

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
      this.logInfo('authenticate', 'Authenticating Google Analytics integration')
  }

      // Verify access token by fetching account summaries
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.makeGoogleRequest('GET', '/accountSummaries')
      })

      if (!response.accountSummaries) {
        throw new AuthenticationError('Failed to authenticate with Google Analytics API')
      }

      this.logInfo('authenticate', 'Google Analytics integration authenticated successfully', { accountCount: response.accountSummaries.length })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: [
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/analytics.edit',
        ]
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue) {
        return this.authenticate()
      }
  }

      const _response = await this.executeWithProtection('auth.refresh', async () => {
        return this.makeOAuthRequest('POST', 'https://oauth2.googleapis.com/token', {
          client_id: this.config?.clientId,
          client_secret: this.config?.clientSecret
          refresh_token: this.refreshTokenValue,
          grant_type: 'refresh_token'
        })
      })

      return {
        success: true,
        accessToken: response.access_token || this.accessToken
        refreshToken: response.refresh_token || this.refreshTokenValue,
        expiresAt: response.expires_in
          ? new Date(Date.now() + response.expires_in * 1000)
          : undefined,
        scope: [
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/analytics.edit',
        ]
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      await this.executeWithProtection('auth.revoke', async () => {
        return this.makeOAuthRequest(
          'POST',
          `https://oauth2.googleapis.com/revoke?token=${this.accessToken}`,
        )
      }),
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _response = await this.executeWithProtection('connection.test', async () => {
        return this.makeGoogleRequest('GET', '/accountSummaries')
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
        metadata: { accountsCount: response.accountSummaries?.length || 0 }
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed - token expired or invalid'
        }
    }
  }
      }

      if (err.status === 403) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Access forbidden - insufficient permissions'
        }
    }
  }
      }

      if (err.status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 25000,
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
        error: 'Connection test failed: ' + (error as Error).message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Property Management',
        description: 'Access and manage Google Analytics properties'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/analytics.readonly']
        methods: ['getProperties', 'getProperty', 'createProperty', 'updateProperty']
      },
      {
        name: 'Data Streams',
        description: 'Manage web and app data streams'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/analytics.readonly']
        methods: ['getDataStreams', 'createDataStream', 'updateDataStream', 'deleteDataStream']
      },
      {
        name: 'Reporting API',
        description: 'Run reports and access analytics data'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/analytics.readonly']
        methods: ['runReport', 'runRealtimeReport', 'batchRunReports', 'runPivotReport']
      },
      {
        name: 'Dimensions & Metrics',
        description: 'Access available dimensions and metrics'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/analytics.readonly']
        methods: ['getDimensions', 'getMetrics', 'getDimensionMetadata', 'getMetricMetadata']
      },
      {
        name: 'Audience Management',
        description: 'Create and manage custom audiences'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/analytics.edit']
        methods: ['getAudiences', 'createAudience', 'updateAudience', 'archiveAudience']
      },
      {
        name: 'Conversion Events',
        description: 'Manage conversion events and goals'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/analytics.edit']
        methods: [
          'getConversionEvents',
          'createConversionEvent',
          'updateConversionEvent',
          'deleteConversionEvent',
        ]
      },
      {
        name: 'Enhanced Ecommerce',
        description: 'Access ecommerce and transaction data'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/analytics.readonly']
        methods: [
          'getEcommerceReport',
          'getTransactionData',
          'getProductPerformance',
          'getRevenueData',
        ]
      },
      {
        name: 'Real-time Analytics',
        description: 'Access real-time user and event data'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/analytics.readonly']
        methods: [
          'getRealtimeUsers',
          'getRealtimeEvents',
          'getRealtimeConversions',
          'getActiveUsers',
        ]
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
      this.logInfo('syncData', 'Starting Google Analytics sync', { lastSyncTime })
  }

      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []

      try {
        // Sync properties first
        const propertiesResult = await this.syncProperties()
        totalProcessed += propertiesResult.processed
        totalSkipped += propertiesResult.skipped

        // Sync data streams for each property
        for (const propertyId of this.propertiesCache.keys()) {
          const streamsResult = await this.syncDataStreams(propertyId)
          totalProcessed += streamsResult.processed
          totalSkipped += streamsResult.skipped
        }

          // Sync metadata for each property
          const metadataResult = await this.syncMetadata(propertyId)
          totalProcessed += metadataResult.processed,
          totalSkipped += metadataResult.skipped
        }

        // Update cache timestamp
        this.lastSyncTimestamp = new Date()

        this.logInfo('syncData', 'Google Analytics sync completed successfully', {
          totalProcessed,
          totalSkipped,
          errors: errors.length
        })
      }
    } catch (error) {
        errors.push(`Sync failed: ${(error as Error).message}`)
        this.logError('syncData', error as Error)
      }

      catch (error) {
        console.error('Error in google-analytics.integration.ts:', error)
        throw error
      }
      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider
          lastSyncTime,
          propertiesInCache: this.propertiesCache.size,
          dataStreamsInCache: Array.from(this.dataStreamsCache.values()).reduce(
            (sum, streams) => sum + streams.length,
            0,
          )
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Google Analytics sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return this.lastSyncTimestamp
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Google Analytics webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Handle Google Analytics real-time events
      switch (payload._event) {
        case 'property.created':
        case 'property.updated':
          await this.handlePropertyUpdate(payload.data)
          break
        case 'property.deleted':
          await this.handlePropertyDelete(payload.data)
          break
        case 'datastream.created':
        case 'datastream.updated':
          await this.handleDataStreamUpdate(payload.data)
          break
        case 'datastream.deleted':
          await this.handleDataStreamDelete(payload.data)
          break
        case 'audience.created':
        case 'audience.updated':
          await this.handleAudienceUpdate(payload.data)
          break
        case 'audience.archived':
          await this.handleAudienceArchive(payload.data)
          break
        default:
          this.logInfo('handleWebhook', 'Unhandled webhook event', { event: payload._event })
      }
      }

      // Track webhook metrics
      if (this.metricsService) {
        this.metricsService.track(
          this.userId,
          this.integrationId || `google-analytics-${this.userId}`,
          this.provider,
          payload.event,
          200,
        )
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in google-analytics.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      // Google Analytics webhook validation using webhook secret,
      return true // Simplified for now
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // === Private Helper Methods ===

  private async makeGoogleRequest(
    method: string,
    endpoint: string
    data?: unknown,
  ): Promise<ApiResponse> {
    const baseUrl = 'https://analyticsadmin.googleapis.com/v1beta'
    const url = `${baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    }

    const requestOptions: RequestInit = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      throw new Error(`Google Analytics API error: ${response.status} ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeDataRequest(
    method: string,
    endpoint: string
    data?: unknown,
  ): Promise<ApiResponse> {
    const baseUrl = 'https://analyticsdata.googleapis.com/v1beta'
    const url = `${baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    }

    const requestOptions: RequestInit = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      throw new Error(`Google Analytics Data API error: ${response.status} ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeOAuthRequest(
    method: string,
    url: string
    data?: unknown,
  ): Promise<ApiResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    const requestOptions: RequestInit = {
      method,
      headers
    }

    if (data) {
      requestOptions.body = new URLSearchParams(data).toString()
    }

    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      throw new Error(`OAuth error: ${response.status} ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async syncProperties(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.makeGoogleRequest('GET', '/properties')

      let processed = 0
      for (const property of response.properties || []) {
        try {
          this.propertiesCache.set(property.name, property),
          processed++
        }
      }
    } catch (error) {
          this.logError('syncProperties', error as Error, { propertyName: property.name })
        }

      return { processed, skipped: 0 }
    } catch (error) {
      this.logError('syncProperties', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-analytics.integration.ts:', error)
      throw error
    }
  private async syncDataStreams(
    propertyId: string
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.makeGoogleRequest('GET', `/properties/${propertyId}/dataStreams`)

      const streams = response.dataStreams || []
      this.dataStreamsCache.set(propertyId, streams)

      return { processed: streams.length, skipped: 0 }
    } catch (error) {
      this.logError('syncDataStreams', error as Error, { propertyId })
      throw error
    }

    catch (error) {
      console.error('Error in google-analytics.integration.ts:', error)
      throw error
    }
  private async syncMetadata(propertyId: string): Promise<{ processed: number; skipped: number }> {
    try {
      let processed = 0

      // Sync dimensions
      const dimensionsResponse = await this.makeGoogleRequest(
        'GET',
        `/properties/${propertyId}/customDimensions`,
      )
      if (dimensionsResponse.customDimensions) {
        this.dimensionsCache.set(propertyId, dimensionsResponse.customDimensions),
        processed += dimensionsResponse.customDimensions.length
      }

      // Sync metrics
      const metricsResponse = await this.makeGoogleRequest(
        'GET',
        `/properties/${propertyId}/customMetrics`,
      )
      if (metricsResponse.customMetrics) {
        this.metricsCache.set(propertyId, metricsResponse.customMetrics),
        processed += metricsResponse.customMetrics.length
      }

      // Sync audiences
      const audiencesResponse = await this.makeGoogleRequest(
        'GET',
        `/properties/${propertyId}/audiences`,
      )
      if (audiencesResponse.audiences) {
        this.audiencesCache.set(propertyId, audiencesResponse.audiences),
        processed += audiencesResponse.audiences.length
      }

      return { processed, skipped: 0 }
    } catch (error) {
      this.logError('syncMetadata', error as Error, { propertyId })
      throw error
    }

    catch (error) {
      console.error('Error in google-analytics.integration.ts:', error)
      throw error
    }
  private async handlePropertyUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      await this.syncProperties()
      this.logInfo('handlePropertyUpdate', 'Property cache updated', { propertyId: data.name })
    } catch (error) {
      this.logError('handlePropertyUpdate', error as Error)
    }

  private async handlePropertyDelete(data: Record<string, unknown>): Promise<void> {
    try {
      this.propertiesCache.delete(data.name)
      this.dataStreamsCache.delete(data.name)
      this.dimensionsCache.delete(data.name)
      this.metricsCache.delete(data.name)
      this.audiencesCache.delete(data.name)
      this.logInfo('handlePropertyDelete', 'Property removed from caches', { propertyId: data.name })
    } catch (error) {
      this.logError('handlePropertyDelete', error as Error)
    }

  private async handleDataStreamUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      const propertyId = data.parent
      await this.syncDataStreams(propertyId)
      this.logInfo('handleDataStreamUpdate', 'Data stream cache updated', {
        propertyId,
        streamId: data.name
      })
    } catch (error) {
      this.logError('handleDataStreamUpdate', error as Error)
    }

  private async handleDataStreamDelete(data: Record<string, unknown>): Promise<void> {
    try {
      const propertyId = data.parent
      const streams = this.dataStreamsCache.get(propertyId) || []
      const filteredStreams = streams.filter(stream => stream.name !== data.name)
      this.dataStreamsCache.set(propertyId, filteredStreams)
      this.logInfo('handleDataStreamDelete', 'Data stream removed from cache', {
        propertyId,
        streamId: data.name
      })
    } catch (error) {
      this.logError('handleDataStreamDelete', error as Error)
    }

  private async handleAudienceUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      const propertyId = data.parent
      await this.syncMetadata(propertyId)
      this.logInfo('handleAudienceUpdate', 'Audience cache updated', {
        propertyId,
        audienceId: data.name
      })
    } catch (error) {
      this.logError('handleAudienceUpdate', error as Error)
    }

  private async handleAudienceArchive(data: Record<string, unknown>): Promise<void> {
    try {
      const propertyId = data.parent
      const audiences = this.audiencesCache.get(propertyId) || []
      const updatedAudiences = audiences.map(audience =>
        audience.name === data.name ? { ...audience, archived: true } : audience,
      )
      this.audiencesCache.set(propertyId, updatedAudiences)
      this.logInfo('handleAudienceArchive', 'Audience archived in cache', {
        propertyId,
        audienceId: data.name
      })
    } catch (error) {
      this.logError('handleAudienceArchive', error as Error)
    }

  // === Public API Methods ===

  async getProperties(): Promise<GAProperty[]> {
    try {
      await this.executeWithProtection('properties.list', async () => {
        await this.syncProperties()
      })
  }

      return Array.from(this.propertiesCache.values())
    } catch (error) {
      this.logError('getProperties', error as Error)
      throw new Error(`Failed to get properties: ${(error as Error).message}`)
    }

  async getProperty(propertyId: string): Promise<GAProperty | null> {
    try {
      const _response = await this.executeWithProtection('properties.get', async () => {
        return this.makeGoogleRequest('GET', `/properties/${propertyId}`)
      })
  }

      this.propertiesCache.set(propertyId, response),
      return response
    } catch (error) {
      this.logError('getProperty', error as Error)
      throw new Error(`Failed to get property: ${(error as Error).message}`)
    }

  async getDataStreams(propertyId: string): Promise<GADataStream[]> {
    try {
      await this.executeWithProtection('datastreams.list', async () => {
        await this.syncDataStreams(propertyId)
      })
  }

      return this.dataStreamsCache.get(propertyId) || []
    } catch (error) {
      this.logError('getDataStreams', error as Error)
      throw new Error(`Failed to get data streams: ${(error as Error).message}`)
    }

  async runReport(
    propertyId: string,
    reportRequest: {
      dimensions?: Array<{ name: string }>,
      metrics: Array<{ name: string }>,
      dateRanges: Array<{ startDate: string; endDate: string }>
      dimensionFilter?: unknown
      metricFilter?: unknown
      orderBys?: Array<{ dimension?: { name: string }; metric?: { name: string }; desc?: boolean }>
      limit?: number,
      offset?: number
    },
  ): Promise<GAReport> {
    try {
      const _response = await this.executeWithProtection('reports.run', async () => {
        return this.makeDataRequest('POST', `/properties/${propertyId}:runReport`, reportRequest)
      }),

      return response
    } catch (error) {
      this.logError('runReport', error as Error)
      throw new Error(`Failed to run report: ${(error as Error).message}`)
    }

  async runRealtimeReport(
    propertyId: string,
    reportRequest: {
      dimensions?: Array<{ name: string }>,
      metrics: Array<{ name: string }>
      dimensionFilter?: unknown
      metricFilter?: unknown
      limit?: number
      orderBys?: Array<{ dimension?: { name: string }; metric?: { name: string }; desc?: boolean }>
    },
  ): Promise<GAReport> {
    try {
      const _response = await this.executeWithProtection('realtime.run', async () => {
        return this.makeDataRequest(
          'POST',
          `/properties/${propertyId}:runRealtimeReport`,
          reportRequest,
        )
      }),

      return response
    } catch (error) {
      this.logError('runRealtimeReport', error as Error)
      throw new Error(`Failed to run realtime report: ${(error as Error).message}`)
    }

  async getDimensions(propertyId: string): Promise<GADimension[]> {
    try {
      await this.executeWithProtection('dimensions.list', async () => {
        await this.syncMetadata(propertyId)
      })
  }

      return this.dimensionsCache.get(propertyId) || []
    } catch (error) {
      this.logError('getDimensions', error as Error)
      throw new Error(`Failed to get dimensions: ${(error as Error).message}`)
    }

  async getMetrics(propertyId: string): Promise<GAMetric[]> {
    try {
      await this.executeWithProtection('metrics.list', async () => {
        await this.syncMetadata(propertyId)
      })
  }

      return this.metricsCache.get(propertyId) || []
    } catch (error) {
      this.logError('getMetrics', error as Error)
      throw new Error(`Failed to get metrics: ${(error as Error).message}`)
    }

  async getAudiences(propertyId: string): Promise<GAAudience[]> {
    try {
      await this.executeWithProtection('audiences.list', async () => {
        await this.syncMetadata(propertyId)
      })
  }

      return this.audiencesCache.get(propertyId) || []
    } catch (error) {
      this.logError('getAudiences', error as Error)
      throw new Error(`Failed to get audiences: ${(error as Error).message}`)
    }

  async createAudience(
    propertyId: string,
    audienceData: {
      displayName: string
      description?: string
      membershipDurationDays?: number
      filterClauses: Array<{,
        clauseType: 'INCLUDE' | 'EXCLUDE'
        simpleFilter?: unknown,
        sequenceFilter?: unknown
      }>
      eventTrigger?: {
        eventName: string
        logCondition?: 'AUDIENCE_LOG_CONDITION_UNSPECIFIED' | 'NEVER_LOG' | 'ALWAYS_LOG'
      },
  ): Promise<string> {
    try {
      const _response = await this.executeWithProtection('audiences.create', async () => {
        return this.makeGoogleRequest('POST', `/properties/${propertyId}/audiences`, audienceData)
      })

      this.logInfo('createAudience', 'Audience created successfully', {
        propertyId,
        audienceId: response.name
      })

      return (response as Response).name
    } catch (error) {
      this.logError('createAudience', error as Error)
      throw new Error(`Failed to create audience: ${(error as Error).message}`)
    }

  async batchRunReports(
    propertyId: string,
    requests: Array<{
      dimensions?: Array<{ name: string }>,
      metrics: Array<{ name: string }>,
      dateRanges: Array<{ startDate: string; endDate: string }>
      dimensionFilter?: unknown
      metricFilter?: unknown
      orderBys?: Array<{ dimension?: { name: string }; metric?: { name: string }; desc?: boolean }>
      limit?: number,
      offset?: number
    }>,
  ): Promise<{ reports: GAReport[] }> {
    try {
      const _response = await this.executeWithProtection('reports.batchRun', async () => {
        return this.makeDataRequest('POST', `/properties/${propertyId}:batchRunReports`, {
          requests
        })
      }),

      return response
    } catch (error) {
      this.logError('batchRunReports', error as Error)
      throw new Error(`Failed to run batch reports: ${(error as Error).message}`)
    }

  async getConversionEvents(propertyId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('conversions.list', async () => {
        return this.makeGoogleRequest('GET', `/properties/${propertyId}/conversionEvents`)
      })
  }

      return (response as Response).conversionEvents || []
    } catch (error) {
      this.logError('getConversionEvents', error as Error)
      throw new Error(`Failed to get conversion events: ${(error as Error).message}`)
    }

  async createConversionEvent(
    propertyId: string,
    eventData: {
      eventName: string
      custom?: boolean
      deletable?: boolean,
      countingMethod?: 'ONCE_PER_EVENT' | 'ONCE_PER_SESSION'
    },
  ): Promise<string> {
    try {
      const _response = await this.executeWithProtection('conversions.create', async () => {
        return this.makeGoogleRequest(
          'POST',
          `/properties/${propertyId}/conversionEvents`,
          eventData,
        )
      })

      this.logInfo('createConversionEvent', 'Conversion event created successfully', {
        propertyId,
        eventName: eventData.eventName
      })

      return (response as Response).name
    } catch (error) {
      this.logError('createConversionEvent', error as Error)
      throw new Error(`Failed to create conversion _event: ${(error as Error).message}`)
    }

}