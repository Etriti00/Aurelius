import axios, { AxiosInstance } from 'axios'
import rateLimit from 'axios-rate-limit'
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
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface


export class PipedriveIntegration extends BaseIntegration {
  readonly provider = 'pipedrive'
  readonly name = 'Pipedrive'
  readonly version = '1.0.0'

  private pipedriveClient: AxiosInstance
  private companyDomain: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Parse access token to get company domain and token
    const credentials = this.parseAccessToken(accessToken)
    this.companyDomain = credentials.companyDomain

    // Create rate-limited axios client
    this.pipedriveClient = rateLimit(
      axios.create({
        baseURL: `https://${this.companyDomain}.pipedrive.com/api/v1`,
        headers: {,
          Authorization: `Bearer ${credentials.token}`,
          'Content-Type': 'application/json'}),
      {
        maxRequests: 100,
        perMilliseconds: 10000, // 100 requests per 10 seconds
      },
    )
  }

  private parseAccessToken(token: string): { companyDomain: string; token: string } {
    try {
      // Token format: "companyDomain:token" (base64 encoded)
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [companyDomain, tokenValue] = decoded.split(':')
      return { companyDomain, token: tokenValue } catch {
      // Fallback: assume token is already in correct format
      return JSON.parse(token)
    }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.pipedriveClient.get('/users/me')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Pipedrive tokens don't expire
        scope: ['deals:read', 'deals:write', 'contacts:read', 'contacts:write']}
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message}

  async refreshToken(): Promise<AuthResult> {
    // Pipedrive API tokens don't expire, so just return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Pipedrive doesn't have a programmatic way to revoke tokens
      // They must be revoked manually in Pipedrive settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.pipedriveClient.get('/users/me')
  }

      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.response?.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'}
    }
  }
      }

      if (err.response?.status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 100,
            remaining: 0
            resetTime: new Date(Date.now() + 10000)}
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: err.message}

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Deals',
        description: 'Create, read, update, and manage Pipedrive deals',
        enabled: true,
        requiredScopes: ['deals:read', 'deals:write']},
      {
        name: 'Persons',
        description: 'Access and manage person contacts'
        enabled: true,
        requiredScopes: ['contacts:read', 'contacts:write']},
      {
        name: 'Organizations',
        description: 'Manage company and organization records'
        enabled: true,
        requiredScopes: ['contacts:read', 'contacts:write']},
      {
        name: 'Activities',
        description: 'Schedule and manage activities and tasks'
        enabled: true,
        requiredScopes: ['deals:read', 'deals:write']},
      {
        name: 'Pipelines',
        description: 'Access sales pipeline information'
        enabled: true,
        requiredScopes: ['deals:read']},
      {
        name: 'Notes',
        description: 'Add and read notes on deals and contacts'
        enabled: true,
        requiredScopes: ['deals:read', 'deals:write']},
      {
        name: 'Products',
        description: 'Manage product catalog'
        enabled: true,
        requiredScopes: ['deals:read', 'deals:write']},
      {
        name: 'Files',
        description: 'Handle file attachments'
        enabled: true,
        requiredScopes: ['deals:read', 'deals:write']},
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

      this.logInfo('syncData', 'Starting Pipedrive sync', { lastSyncTime })

      // Sync Persons
      try {
        const personsResult = await this.syncPersons(lastSyncTime)
        totalProcessed += personsResult.processed,
        totalSkipped += personsResult.skipped
      }
    } catch (error) {
        errors.push(`Persons sync failed: ${(error as Error).message}`)
        this.logError('syncPersons', error as Error)
      }

      catch (error) {
        console.error('Error in pipedrive.integration.ts:', error)
        throw error
      }
      // Sync Organizations
      try {
        const organizationsResult = await this.syncOrganizations(lastSyncTime)
        totalProcessed += organizationsResult.processed,
        totalSkipped += organizationsResult.skipped
      } catch (error) {
        errors.push(`Organizations sync failed: ${(error as Error).message}`)
        this.logError('syncOrganizations', error as Error)
      }

      // Sync Deals
      try {
        const dealsResult = await this.syncDeals(lastSyncTime)
        totalProcessed += dealsResult.processed,
        totalSkipped += dealsResult.skipped
      } catch (error) {
        errors.push(`Deals sync failed: ${(error as Error).message}`)
        this.logError('syncDeals', error as Error)
      }

      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider}
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Pipedrive sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Pipedrive webhook', {
        event: payload.event,
        timestamp: payload.timestamp})
  }

      switch (payload._event) {
        case 'added.deal':
        case 'updated.deal':
          await this.handleDealWebhook(payload.data)
          break
        case 'deleted.deal':
          await this.handleDealDeletedWebhook(payload.data)
          break
        case 'added.person':
        case 'updated.person':
          await this.handlePersonWebhook(payload.data)
          break
        case 'added.organization':
        case 'updated.organization':
          await this.handleOrganizationWebhook(payload.data)
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
      console.error('Error in pipedrive.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Pipedrive webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncPersons(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let start = 0
      const limit = 100
      let hasMore = true
      let processed = 0
      let skipped = 0

      while (hasMore) {
        const params: unknown = { start, limit }
        if (lastSyncTime) {
          params.since = lastSyncTime.toISOString()
        }
      }

        const _response = await this.pipedriveClient.get('/persons', { params })
        const persons = response.data.data || []

        if (persons.length === 0) {
          hasMore = false,
          break
        }

        for (const person of persons) {
          try {
            await this.processPerson(person)
            processed++
          }
        }
    } catch (error) {
            this.logError('syncPersons', error as Error, { personId: person.id })
            skipped++
          }

        start += limit,
        hasMore = response.data.additional_data?.pagination?.more_items_in_collection || false
      }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncPersons', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in pipedrive.integration.ts:', error)
      throw error
    }
  private async syncOrganizations(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let start = 0
      const limit = 100
      let hasMore = true
      let processed = 0
      let skipped = 0

      while (hasMore) {
        const params: unknown = { start, limit }
        if (lastSyncTime) {
          params.since = lastSyncTime.toISOString()
        }
      }

        const _response = await this.pipedriveClient.get('/organizations', { params })
        const organizations = response.data.data || []

        if (organizations.length === 0) {
          hasMore = false,
          break
        }

        for (const organization of organizations) {
          try {
            await this.processOrganization(organization)
            processed++
          }
        }
    } catch (error) {
            this.logError('syncOrganizations', error as Error, { organizationId: organization.id })
            skipped++
          }

        start += limit,
        hasMore = response.data.additional_data?.pagination?.more_items_in_collection || false
      }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncOrganizations', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in pipedrive.integration.ts:', error)
      throw error
    }
  private async syncDeals(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let start = 0
      const limit = 100
      let hasMore = true
      let processed = 0
      let skipped = 0

      while (hasMore) {
        const params: unknown = { start, limit }
        if (lastSyncTime) {
          params.since = lastSyncTime.toISOString()
        }
      }

        const _response = await this.pipedriveClient.get('/deals', { params })
        const deals = response.data.data || []

        if (deals.length === 0) {
          hasMore = false,
          break
        }

        for (const deal of deals) {
          try {
            await this.processDeal(deal)
            processed++
          }
        }
    } catch (error) {
            this.logError('syncDeals', error as Error, { dealId: deal.id })
            skipped++
          }

        start += limit,
        hasMore = response.data.additional_data?.pagination?.more_items_in_collection || false
      }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncDeals', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in pipedrive.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processPerson(person: unknown): Promise<void> {
    this.logInfo('processPerson', `Processing person: ${person.id}`)
  }

  private async processOrganization(organization: unknown): Promise<void> {
    this.logInfo('processOrganization', `Processing organization: ${organization.id}`)
  }

  private async processDeal(deal: unknown): Promise<void> {
    this.logInfo('processDeal', `Processing deal: ${deal.id}`)
  }

  // Private webhook handlers
  private async handleDealWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleDealWebhook', 'Processing deal webhook', data)
  }

  private async handleDealDeletedWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleDealDeletedWebhook', 'Processing deal deleted webhook', data)
  }

  private async handlePersonWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePersonWebhook', 'Processing person webhook', data)
  }

  private async handleOrganizationWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleOrganizationWebhook', 'Processing organization webhook', data)
  }

  // Public API methods
  async createPerson(personData: {,
    name: string
    email?: string[]
    phone?: string[]
    organizationId?: number
    ownerId?: number,
    visibleTo?: string
  }): Promise<string> {
    try {
      const _response = await this.pipedriveClient.post('/persons', personData)
      return (response as Response).data.data.id.toString()
    } catch (error) {
      this.logError('createPerson', error as Error)
      throw new Error(`Failed to create Pipedrive person: ${(error as Error).message}`)
    }

  async createOrganization(organizationData: {,
    name: string
    ownerId?: number
    visibleTo?: string
    address?: string,
    label?: number
  }): Promise<string> {
    try {
      const _response = await this.pipedriveClient.post('/organizations', organizationData)
      return (response as Response).data.data.id.toString()
    } catch (error) {
      this.logError('createOrganization', error as Error)
      throw new Error(`Failed to create Pipedrive organization: ${(error as Error).message}`)
    }

  async createDeal(dealData: {,
    title: string
    value?: number
    currency?: string
    userId?: number
    personId?: number
    orgId?: number
    stageId?: number
    status?: string
    probability?: number
    lostReason?: string
    addTime?: Date,
    visibleTo?: string
  }): Promise<string> {
    try {
      const data: Record<string, unknown> = { ...dealData }
      if (dealData.addTime) {
        data.add_time = dealData.addTime.toISOString()
        delete data.addTime
      }

      const _response = await this.pipedriveClient.post('/deals', data)
      return (response as Response).data.data.id.toString()
    } catch (error) {
      this.logError('createDeal', error as Error)
      throw new Error(`Failed to create Pipedrive deal: ${(error as Error).message}`)
    }

  async updatePerson(personId: string, updateData: unknown): Promise<void> {
    try {
      await this.pipedriveClient.put(`/persons/${personId}`, updateData)
    } catch (error) {
      this.logError('updatePerson', error as Error)
      throw new Error(`Failed to update Pipedrive person: ${(error as Error).message}`)
    }

  async updateDeal(dealId: string, updateData: unknown): Promise<void> {
    try {
      await this.pipedriveClient.put(`/deals/${dealId}`, updateData)
    } catch (error) {
      this.logError('updateDeal', error as Error)
      throw new Error(`Failed to update Pipedrive deal: ${(error as Error).message}`)
    }

  async getPerson(personId: string): Promise<ApiResponse> {
    try {
      const _response = await this.pipedriveClient.get(`/persons/${personId}`)
      return (response as Response).data.data
    } catch (error) {
      this.logError('getPerson', error as Error)
      throw new Error(`Failed to get Pipedrive person: ${(error as Error).message}`)
    }

  async getDeal(dealId: string): Promise<ApiResponse> {
    try {
      const _response = await this.pipedriveClient.get(`/deals/${dealId}`)
      return (response as Response).data.data
    } catch (error) {
      this.logError('getDeal', error as Error)
      throw new Error(`Failed to get Pipedrive deal: ${(error as Error).message}`)
    }

  async searchPersons(query: {
    term?: string
    email?: string
    phone?: string,
    organizationId?: number
  }): Promise<unknown[]> {
    try {
      const params: Record<string, string | number | boolean> = {}
      if (query.term) params.term = query.term
      if (query.email) params.email = query.email
      if (query.phone) params.phone = query.phone
      if (query.organizationId) params.org_id = query.organizationId

      const _response = await this.pipedriveClient.get('/persons/search', { params })
      return (response as Response).data.data?.items || []
    } catch (error) {
      this.logError('searchPersons', error as Error)
      throw new Error(`Failed to search Pipedrive persons: ${(error as Error).message}`)
    }

  async searchDeals(query: {
    term?: string
    personId?: number
    organizationId?: number,
    status?: string
  }): Promise<unknown[]> {
    try {
      const params: Record<string, string | number | boolean> = {}
      if (query.term) params.term = query.term
      if (query.personId) params.person_id = query.personId
      if (query.organizationId) params.org_id = query.organizationId
      if (query.status) params.status = query.status

      const _response = await this.pipedriveClient.get('/deals/search', { params })
      return (response as Response).data.data?.items || []
    } catch (error) {
      this.logError('searchDeals', error as Error)
      throw new Error(`Failed to search Pipedrive deals: ${(error as Error).message}`)
    }

  async createActivity(activityData: {,
    subject: string
    type: string
    done?: boolean
    dueDate?: Date
    dueTime?: string
    duration?: string
    userId?: number
    dealId?: number
    personId?: number
    orgId?: number,
    note?: string
  }): Promise<string> {
    try {
      const data: Record<string, unknown> = { ...activityData }
      if (activityData.dueDate) {
        data.due_date = activityData.dueDate.toISOString().split('T')[0]
        delete data.dueDate
      }
      if (activityData.dueTime) {
        data.due_time = activityData.dueTime,
        delete data.dueTime
      }

      const _response = await this.pipedriveClient.post('/activities', data)
      return (response as Response).data.data.id.toString()
    } catch (error) {
      this.logError('createActivity', error as Error)
      throw new Error(`Failed to create Pipedrive activity: ${(error as Error).message}`)
    }

  async addNote(noteData: {,
    content: string
    dealId?: number
    personId?: number
    orgId?: number,
    leadId?: string
  }): Promise<string> {
    try {
      const _response = await this.pipedriveClient.post('/notes', noteData)
      return (response as Response).data.data.id.toString()
    } catch (error) {
      this.logError('addNote', error as Error)
      throw new Error(`Failed to add Pipedrive note: ${(error as Error).message}`)
    }

  async getPipelines(): Promise<unknown[]> {
    try {
      const _response = await this.pipedriveClient.get('/pipelines')
      return (response as Response).data.data || []
    } catch (error) {
      this.logError('getPipelines', error as Error)
      throw new Error(`Failed to get Pipedrive pipelines: ${(error as Error).message}`)
    }

  async getStages(pipelineId?: number): Promise<unknown[]> {
    try {
      const params = pipelineId ? { pipeline_id: pipelineId } : {}
      const _response = await this.pipedriveClient.get('/stages', { params })
      return (response as Response).data.data || []
    } catch (error) {
      this.logError('getStages', error as Error)
      throw new Error(`Failed to get Pipedrive stages: ${(error as Error).message}`)
    }

  async getActivities(
    params: {
      userId?: number
      filterId?: number
      type?: string
      start?: number
      limit?: number
      startDate?: Date
      endDate?: Date,
      done?: boolean
    } = {},
  ): Promise<unknown[]> {
    try {
      const queryParams: unknown = { ...params }
      if (params.startDate) {
        queryParams.start_date = params.startDate.toISOString().split('T')[0]
        delete queryParams.startDate
      }
      if (params.endDate) {
        queryParams.end_date = params.endDate.toISOString().split('T')[0]
        delete queryParams.endDate
      }

      const _response = await this.pipedriveClient.get('/activities', { params: queryParams })
      return (response as Response).data.data || []
    } catch (error) {
      this.logError('getActivities', error as Error)
      throw new Error(`Failed to get Pipedrive activities: ${(error as Error).message}`)
    }

  async getProducts(): Promise<unknown[]> {
    try {
      const _response = await this.pipedriveClient.get('/products')
      return (response as Response).data.data || []
    } catch (error) {
      this.logError('getProducts', error as Error)
      throw new Error(`Failed to get Pipedrive products: ${(error as Error).message}`)
    }

}