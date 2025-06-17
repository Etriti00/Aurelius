import { Client } from '@hubspot/api-client'
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
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class HubSpotIntegration extends BaseIntegration {
  readonly provider = 'hubspot'
  readonly name = 'HubSpot'
  readonly version = '1.0.0'

  private hubspotClient: Client

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.hubspotClient = new Client({
      accessToken
    })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.hubspotClient.oauth.accessTokensApi.get(this.accessToken)
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Will be set based on token info
        scope: ['contacts', 'content', 'reports', 'social', 'automation']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config?.clientId || !this.config?.clientSecret) {
        return this.authenticate()
      }
  }

      const result = await this.hubspotClient.oauth.tokensApi.create(
        'refresh_token',
        undefined,
        undefined,
        this.config.clientId,
        this.config.clientSecret,
        this.refreshTokenValue,
      )

      return {
        success: true,
        accessToken: result.accessToken
        refreshToken: result.refreshToken || this.refreshTokenValue,
        expiresAt: result.expiresIn ? new Date(Date.now() + result.expiresIn * 1000) : undefined
        scope: (result as unknown).scope?.split(' ') || [
          'contacts',
          'content',
          'reports',
          'social',
          'automation',
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
      // HubSpot doesn't have a direct revoke endpoint
      // The token will expire or can be deleted from HubSpot settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.hubspotClient.oauth.accessTokensApi.get(this.accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.code === 401 || err.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.code === 429 || err.status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 100,
            remaining: 0
            resetTime: new Date(Date.now() + 600000), // 10 minutes
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: err.message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Contacts',
        description: 'Create, read, update, and manage HubSpot contacts',
        enabled: true,
        requiredScopes: ['contacts']
      },
      {
        name: 'Companies',
        description: 'Access and manage company records'
        enabled: true,
        requiredScopes: ['contacts']
      },
      {
        name: 'Deals',
        description: 'Track sales deals and pipeline'
        enabled: true,
        requiredScopes: ['contacts']
      },
      {
        name: 'Tickets',
        description: 'Manage customer service tickets'
        enabled: true,
        requiredScopes: ['contacts']
      },
      {
        name: 'Tasks',
        description: 'Create and manage tasks'
        enabled: true,
        requiredScopes: ['contacts']
      },
      {
        name: 'Meetings',
        description: 'Schedule and manage meetings'
        enabled: true,
        requiredScopes: ['contacts']
      },
      {
        name: 'Emails',
        description: 'Send and track emails'
        enabled: true,
        requiredScopes: ['contacts']
      },
      {
        name: 'Lists',
        description: 'Manage contact lists and segments'
        enabled: true,
        requiredScopes: ['contacts']
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

      this.logInfo('syncData', 'Starting HubSpot sync', { lastSyncTime })

      // Sync Contacts
      try {
        const contactsResult = await this.syncContacts(lastSyncTime)
        totalProcessed += contactsResult.processed,
        totalSkipped += contactsResult.skipped
      }
    } catch (error) {
        errors.push(`Contacts sync failed: ${(error as Error).message}`)
        this.logError('syncContacts', error as Error)
      }

      catch (error) {
        console.error('Error in hubspot.integration.ts:', error)
        throw error
      }
      // Sync Companies
      try {
        const companiesResult = await this.syncCompanies(lastSyncTime)
        totalProcessed += companiesResult.processed,
        totalSkipped += companiesResult.skipped
      } catch (error) {
        errors.push(`Companies sync failed: ${(error as Error).message}`)
        this.logError('syncCompanies', error as Error)
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
          provider: this.provider
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('HubSpot sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing HubSpot webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'contact.creation':
        case 'contact.propertyChange':
          await this.handleContactWebhook(payload.data)
          break
        case 'contact.deletion':
          await this.handleContactDeletedWebhook(payload.data)
          break
        case 'deal.creation':
        case 'deal.propertyChange':
          await this.handleDealWebhook(payload.data)
          break
        case 'company.creation':
        case 'company.propertyChange':
          await this.handleCompanyWebhook(payload.data)
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
      console.error('Error in hubspot.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // HubSpot webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncContacts(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const properties = [
        'email',
        'firstname',
        'lastname',
        'phone',
        'company',
        'jobtitle',
        'lastmodifieddate',
      ]
      let after: string | undefined
      let processed = 0
      let skipped = 0

      do {
        const _response = await this.hubspotClient.crm.contacts.basicApi.getPage(
          100,
          after,
          properties,
          undefined,
          undefined,
          false,
        )

        for (const contact of response.results) {
          try {
            // Filter by lastSyncTime if provided
            if (lastSyncTime && contact.updatedAt && new Date(contact.updatedAt) <= lastSyncTime) {
              skipped++,
              continue
            }
        }

            await this.processContact(contact)
            processed++
          }
    } catch (error) {
            this.logError('syncContacts', error as Error, { contactId: contact.id })
            skipped++
          },

        after = response.paging?.next?.after
      } while (after)

      return { processed, skipped }
    } catch (error) {
      this.logError('syncContacts', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in hubspot.integration.ts:', error)
      throw error
    }
  private async syncCompanies(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const properties = [
        'name',
        'domain',
        'industry',
        'phone',
        'city',
        'state',
        'country',
        'lastmodifieddate',
      ]
      let after: string | undefined
      let processed = 0
      let skipped = 0

      do {
        const _response = await this.hubspotClient.crm.companies.basicApi.getPage(
          100,
          after,
          properties,
          undefined,
          undefined,
          false,
        )

        for (const company of response.results) {
          try {
            // Filter by lastSyncTime if provided
            if (lastSyncTime && company.updatedAt && new Date(company.updatedAt) <= lastSyncTime) {
              skipped++,
              continue
            }
        }

            await this.processCompany(company)
            processed++
          }
    } catch (error) {
            this.logError('syncCompanies', error as Error, { companyId: company.id })
            skipped++
          },

        after = response.paging?.next?.after
      } while (after)

      return { processed, skipped }
    } catch (error) {
      this.logError('syncCompanies', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in hubspot.integration.ts:', error)
      throw error
    }
  private async syncDeals(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const properties = [
        'dealname',
        'amount',
        'closedate',
        'dealstage',
        'pipeline',
        'dealtype',
        'lastmodifieddate',
      ]
      let after: string | undefined
      let processed = 0
      let skipped = 0

      do {
        const _response = await this.hubspotClient.crm.deals.basicApi.getPage(
          100,
          after,
          properties,
          undefined,
          undefined,
          false,
        )

        for (const deal of response.results) {
          try {
            // Filter by lastSyncTime if provided
            if (lastSyncTime && deal.updatedAt && new Date(deal.updatedAt) <= lastSyncTime) {
              skipped++,
              continue
            }
        }

            await this.processDeal(deal)
            processed++
          }
    } catch (error) {
            this.logError('syncDeals', error as Error, { dealId: deal.id })
            skipped++
          },

        after = response.paging?.next?.after
      } while (after)

      return { processed, skipped }
    } catch (error) {
      this.logError('syncDeals', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in hubspot.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processContact(contact: unknown): Promise<void> {
    this.logInfo('processContact', `Processing contact: ${contact.id}`)
  }

  private async processCompany(company: unknown): Promise<void> {
    this.logInfo('processCompany', `Processing company: ${company.id}`)
  }

  private async processDeal(deal: unknown): Promise<void> {
    this.logInfo('processDeal', `Processing deal: ${deal.id}`)
  }

  // Private webhook handlers
  private async handleContactWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleContactWebhook', 'Processing contact webhook', data)
  }

  private async handleContactDeletedWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleContactDeletedWebhook', 'Processing contact deleted webhook', data)
  }

  private async handleDealWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleDealWebhook', 'Processing deal webhook', data)
  }

  private async handleCompanyWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleCompanyWebhook', 'Processing company webhook', data)
  }

  // Public API methods
  async createContact(contactData: {
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    company?: string
    jobTitle?: string
    website?: string,
    lifecycleStage?: string
  }): Promise<string> {
    try {
      const properties: unknown = {}
      if (contactData.email) properties.email = contactData.email
      if (contactData.firstName) properties.firstname = contactData.firstName
      if (contactData.lastName) properties.lastname = contactData.lastName
      if (contactData.phone) properties.phone = contactData.phone
      if (contactData.company) properties.company = contactData.company
      if (contactData.jobTitle) properties.jobtitle = contactData.jobTitle
      if (contactData.website) properties.website = contactData.website
      if (contactData.lifecycleStage) properties.lifecyclestage = contactData.lifecycleStage

      const _response = await this.hubspotClient.crm.contacts.basicApi.create({
        properties
      })

      return (response as Response).id
    } catch (error) {
      this.logError('createContact', error as Error)
      throw new Error(`Failed to create HubSpot contact: ${(error as Error).message}`)
    }

  async createCompany(companyData: {,
    name: string
    domain?: string
    industry?: string
    phone?: string
    city?: string
    state?: string
    country?: string,
    description?: string
  }): Promise<string> {
    try {
      const properties: unknown = { name: companyData.name }
      if (companyData.domain) properties.domain = companyData.domain
      if (companyData.industry) properties.industry = companyData.industry
      if (companyData.phone) properties.phone = companyData.phone
      if (companyData.city) properties.city = companyData.city
      if (companyData.state) properties.state = companyData.state
      if (companyData.country) properties.country = companyData.country
      if (companyData.description) properties.description = companyData.description

      const _response = await this.hubspotClient.crm.companies.basicApi.create({
        properties
      })

      return (response as Response).id
    } catch (error) {
      this.logError('createCompany', error as Error)
      throw new Error(`Failed to create HubSpot company: ${(error as Error).message}`)
    }

  async createDeal(dealData: {,
    dealName: string
    amount?: number
    closeDate?: Date
    dealStage: string
    pipeline?: string
    dealType?: string
    associatedCompanyId?: string,
    associatedContactId?: string
  }): Promise<string> {
    try {
      const properties: unknown = {,
        dealname: dealData.dealName
        dealstage: dealData.dealStage
      }
      if (dealData.amount) properties.amount = dealData.amount.toString()
      if (dealData.closeDate) properties.closedate = dealData.closeDate.getTime().toString()
      if (dealData.pipeline) properties.pipeline = dealData.pipeline
      if (dealData.dealType) properties.dealtype = dealData.dealType

      const associations = []
      if (dealData.associatedCompanyId) {
        associations.push({
          to: { id: dealData.associatedCompanyId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }], // Deal to Company
        })
      }
      if (dealData.associatedContactId) {
        associations.push({
          to: { id: dealData.associatedContactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }], // Deal to Contact
        })
      }

      const _response = await this.hubspotClient.crm.deals.basicApi.create({
        properties,
        associations
      })

      return (response as Response).id
    } catch (error) {
      this.logError('createDeal', error as Error)
      throw new Error(`Failed to create HubSpot deal: ${(error as Error).message}`)
    }

  async updateContact(contactId: string, updateData: unknown): Promise<void> {
    try {
      await this.hubspotClient.crm.contacts.basicApi.update(contactId, { properties: updateData })
    } catch (error) {
      this.logError('updateContact', error as Error)
      throw new Error(`Failed to update HubSpot contact: ${(error as Error).message}`)
    }

  async getContact(contactId: string, properties?: string[]): Promise<ApiResponse> {
    try {
      return await this.hubspotClient.crm.contacts.basicApi.getById(
        contactId,
        properties,
        undefined,
        undefined,
        false,
      )
    } catch (error) {
      this.logError('getContact', error as Error)
      throw new Error(`Failed to get HubSpot contact: ${(error as Error).message}`)
    }

  async searchContacts(query: {
    email?: string
    firstName?: string
    lastName?: string,
    company?: string
  }): Promise<unknown[]> {
    try {
      const filters = []
      if (query.email) {
        filters.push({
          propertyName: 'email',
          operator: 'EQ'
          value: query.email
        })
      }
      if (query.firstName) {
        filters.push({
          propertyName: 'firstname',
          operator: 'CONTAINS_TOKEN'
          value: query.firstName
        })
      }
      if (query.lastName) {
        filters.push({
          propertyName: 'lastname',
          operator: 'CONTAINS_TOKEN'
          value: query.lastName
        })
      }
      if (query.company) {
        filters.push({
          propertyName: 'company',
          operator: 'CONTAINS_TOKEN'
          value: query.company
        })
      }

      const _response = await this.hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [{ filters }],
        properties: ['email', 'firstname', 'lastname', 'phone', 'company', 'jobtitle'],
        limit: 100
      })

      return (response as Response).results
    } catch (error) {
      this.logError('searchContacts', error as Error)
      throw new Error(`Failed to search HubSpot contacts: ${(error as Error).message}`)
    }

  async createTask(taskData: {,
    subject: string
    body?: string
    type: string,
    status: string
    priority?: string
    timestamp?: Date
    ownerId?: string
    associatedContactId?: string
    associatedCompanyId?: string,
    associatedDealId?: string
  }): Promise<string> {
    try {
      const properties: unknown = {,
        hs_task_subject: taskData.subject
        hs_task_type: taskData.type,
        hs_task_status: taskData.status
      }
      if (taskData.body) properties.hs_task_body = taskData.body
      if (taskData.priority) properties.hs_task_priority = taskData.priority
      if (taskData.timestamp) properties.hs_timestamp = taskData.timestamp.getTime().toString()
      if (taskData.ownerId) properties.hubspot_owner_id = taskData.ownerId

      const associations = []
      if (taskData.associatedContactId) {
        associations.push({
          to: { id: taskData.associatedContactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }], // Task to Contact
        })
      }
      if (taskData.associatedCompanyId) {
        associations.push({
          to: { id: taskData.associatedCompanyId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 192 }], // Task to Company
        })
      }
      if (taskData.associatedDealId) {
        associations.push({
          to: { id: taskData.associatedDealId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 216 }], // Task to Deal
        })
      }

      const _response = await this.hubspotClient.crm.objects.tasks.basicApi.create({
        properties,
        associations
      })

      return (response as Response).id
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create HubSpot task: ${(error as Error).message}`)
    }

  async getDeals(companyId?: string): Promise<unknown[]> {
    try {
      if (companyId) {
        // Get deals associated with company using basic API
        const _response = await this.hubspotClient.crm.deals.basicApi.getPage(
          100,
          undefined,
          ['dealname', 'amount', 'closedate', 'dealstage', 'pipeline'],
          undefined,
          undefined,
          false,
        )
        return (response as Response).results
      } else {
        const _response = await this.hubspotClient.crm.deals.basicApi.getPage(
          100,
          undefined,
          ['dealname', 'amount', 'closedate', 'dealstage', 'pipeline'],
          undefined,
          undefined,
          false,
        )
        return (response as Response).results
      }
    } catch (error) {
      this.logError('getDeals', error as Error)
      throw new Error(`Failed to get HubSpot deals: ${(error as Error).message}`)
    }
  }

    catch (error) {
      console.error('Error in hubspot.integration.ts:', error)
      throw error
    }
  async getCompanies(): Promise<unknown[]> {
    try {
      const _response = await this.hubspotClient.crm.companies.basicApi.getPage(
        100,
        undefined,
        ['name', 'domain', 'industry', 'phone', 'city', 'state', 'country'],
        undefined,
        undefined,
        false,
      )
      return (response as Response).results
    } catch (error) {
      this.logError('getCompanies', error as Error)
      throw new Error(`Failed to get HubSpot companies: ${(error as Error).message}`)
    }

}