import { User } from '@prisma/client'

export interface AuthResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string[]
  error?: string
}

export interface IntegrationCapability {
  name: string
  description: string
  enabled: boolean
  requiredScopes: string[]
}

export interface SyncResult {
  success: boolean
  itemsProcessed: number
  itemsSkipped: number
  errors: string[]
  metadata?: Record<string, unknown>
}

export interface WebhookPayload {
  provider: string
  event: string
  data: unknown
  timestamp: Date
  signature?: string
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  resetTime: Date
}

export interface ConnectionStatus {
  isConnected: boolean
  lastChecked: Date
  error?: string
  rateLimitInfo?: RateLimitInfo
}

export abstract class BaseIntegration {
  abstract readonly provider: string
  abstract readonly name: string
  abstract readonly version: string

  // Optional service dependencies (injected by factory)
  protected circuitBreaker?: any
  protected metricsService?: any
  protected encryptionService?: any
  protected integrationId?: string

  constructor(
    protected readonly userId: string,
    protected accessToken: string,
    protected refreshTokenValue?: string,
  ) {}

  // Core authentication methods
  abstract authenticate(): Promise<AuthResult>
  abstract refreshToken(): Promise<AuthResult>
  abstract revokeAccess(): Promise<boolean>
  abstract testConnection(): Promise<ConnectionStatus>

  // Capability methods
  abstract getCapabilities(): IntegrationCapability[]
  abstract validateRequiredScopes(requestedScopes: string[]): boolean

  // Data synchronization
  abstract syncData(lastSyncTime?: Date): Promise<SyncResult>
  abstract getLastSyncTime(): Promise<Date | null>

  // Webhook handling
  abstract handleWebhook(payload: WebhookPayload): Promise<void>
  abstract validateWebhookSignature(payload: unknown, signature: string): boolean

  // Service injection methods (called by factory)
  setCircuitBreaker(circuitBreaker: unknown): void {
    this.circuitBreaker = circuitBreaker
  }

  setMetricsService(metricsService: unknown): void {
    this.metricsService = metricsService
  }

  setEncryptionService(encryptionService: unknown): void {
    this.encryptionService = encryptionService
  }

  setIntegrationId(integrationId: string): void {
    this.integrationId = integrationId
  }

  // Protected helper methods with circuit breaker and metrics
  protected async executeWithProtection<T>(
    operation: string,
    fn: () => Promise<T>,
    config?: { retries?: number; timeout?: number },
  ): Promise<T> {
    const startTime = Date.now()

    try {
      let result: T

      if (this.circuitBreaker) {
        // Execute with circuit breaker protection
        result = await this.circuitBreaker.execute(
          this.provider,
          operation,
          fn,
          config?.retries
            ? {
                maxRetries: config.retries,
                retryDelay: 1000,
                backoffMultiplier: 2,
              }
            : undefined,
        )
      } else {
        // Execute without protection
        result = await fn()
      }

      // Track successful operation
      if (this.metricsService && this.integrationId) {
        await this.metricsService.trackApiCall(
          this.userId,
          this.integrationId,
          this.provider,
          operation,
          Date.now() - startTime,
          true,
        )
      }

      return result
    } catch (error) {
      // Track failed operation
      if (this.metricsService && this.integrationId) {
        await this.metricsService.trackApiCall(
          this.userId,
          this.integrationId,
          this.provider,
          operation,
          Date.now() - startTime,
          false,
          error.message,
        )
      }

      throw error
    }
  }

  // Enhanced error handling and logging
  protected logError(method: string, error: Error, context?: Record<string, unknown>): void {
    console.error(`[${this.provider}] ${method} failed:`, {
      error: error.message,
      userId: this.userId,
      integrationId: this.integrationId,
      context,
    })
  }

  protected logInfo(method: string, message: string, context?: Record<string, unknown>): void {
    console.log(`[${this.provider}] ${method}:`, message, {
      userId: this.userId,
      integrationId: this.integrationId,
      ...context,
    })
  }

  protected logWarning(method: string, message: string, context?: Record<string, unknown>): void {
    console.warn(`[${this.provider}] ${method}:`, message, {
      userId: this.userId,
      integrationId: this.integrationId,
      ...context,
    })
  }

  // Rate limiting helpers
  protected async checkRateLimit(): Promise<RateLimitInfo | null> {
    // Override in specific integrations
    return null
  }

  protected async handleRateLimit(retryAfter: number): Promise<void> {
    if (this.metricsService && this.integrationId) {
      await this.metricsService.trackRateLimit(
        this.userId,
        this.integrationId,
        this.provider,
        'rate_limit',
        retryAfter,
      )
    }

    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
  }

  // Utility methods for common operations
  protected async makeApiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.executeWithProtection(`api.${endpoint}`, async () => {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        if ((response as Response).status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
          await this.handleRateLimit(retryAfter)
          throw new Error(`Rate limited, retry after ${retryAfter} seconds`)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return (response as Response).json() as T
    })
  }

  protected async makePaginatedCall<T>(
    endpoint: string,
    options: RequestInit = {},
    pageHandler?: (items: T[]) => Promise<void>,
  ): Promise<T[]> {
    const allItems: T[] = []
    let nextUrl = endpoint
    let pageCount = 0
    const maxPages = 100 // Safety limit

    while (nextUrl && pageCount < maxPages) {
      const response = await this.makeApiCall<any>(nextUrl, options)

      const items = this.extractItemsFromResponse(response)
      allItems.push(...items)

      if (pageHandler) {
        await pageHandler(items)
      }

      nextUrl = this.extractNextUrl(response)
      pageCount++
    }

    return allItems
  }

  // Override these in specific integrations for pagination handling
  protected extractItemsFromResponse(response: {
    data?: unknown
    items?: unknown[]
    results?: unknown[]
    [key: string]: unknown
  }): unknown[] {
    return response.items || (response.data as unknown[]) || response.results || []
  }

  protected extractNextUrl(response: Record<string, unknown>): string | null {
    return (response.nextPageToken as string) || (response.next_cursor as string) || ((response.paging as any)?.next as string) || null
  }

  // Common validation methods
  protected validateAccessToken(): void {
    if (!this.accessToken) {
      throw new Error('Access token is required')
    }
  }

  protected validateUserId(): void {
    if (!this.userId) {
      throw new Error('User ID is required')
    }
  }

  protected validateConfig(config: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Configuration field '${field}' is required`)
      }
    }
  }
}

export interface IntegrationConfig {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  scopes?: string[]

  // OAuth flow properties
  code?: string
  codeVerifier?: string
  state?: string

  // Authentication properties
  userId?: string
  accessToken?: string
  refreshToken?: string
  apiKey?: string
  apiSecret?: string
  username?: string
  password?: string

  // API configuration
  apiBaseUrl?: string
  webhookSecret?: string
  webhookUrl?: string
  domain?: string
  organization?: string
  organizationUrl?: string
  rateLimit?: {
    requests: number
    window: number // seconds
  }

  // Provider-specific config properties
  companyId?: string // QuickBooks
  subdomain?: string // Zendesk
  workspaceId?: string // Slack, Monday.com
  instanceUrl?: string // Salesforce
  tenantId?: string // Microsoft
  teamId?: string // Linear, ClickUp
}

export interface IntegrationMetadata {
  version: string
  supportedFeatures: string[]
  webhookEvents: string[]
  requiredPermissions: string[]
  maxSyncInterval: number // minutes
}