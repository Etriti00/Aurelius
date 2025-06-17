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

interface DynamicsWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface DynamicsTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  scope: string
}

export class MicrosoftDynamics365Integration extends BaseIntegration {
  readonly provider = 'microsoft-dynamics-365'
  readonly name = 'Microsoft Dynamics 365'
  readonly version = '1.0.0'

  private readonly apiBaseUrl: string
  private readonly organizationUrl: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
    this.organizationUrl = config?.apiUrl || 'https://organization.crm.dynamics.com'
    this.apiBaseUrl = `${this.organizationUrl}/api/data/v9.2`
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/WhoAmI', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: [`${this.organizationUrl}/user_impersonation`],
        data: response
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
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
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
          scope: `${this.organizationUrl}/user_impersonation`
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: DynamicsTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
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
      IntegrationCapability.CONTACTS,
      IntegrationCapability.ACCOUNTS,
      IntegrationCapability.LEADS,
      IntegrationCapability.OPPORTUNITIES,
      IntegrationCapability.CASES,
      IntegrationCapability.ACTIVITIES,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/WhoAmI', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: response.UserId
          businessUnitId: response.BusinessUnitId,
          organizationId: response.OrganizationId
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

      // Sync contacts
      try {
        const contactResult = await this.syncContacts()
        totalProcessed += contactResult.processed
        totalErrors += contactResult.errors
        if (contactResult.errorMessages) {
          errors.push(...contactResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Contact sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync accounts
      try {
        const accountResult = await this.syncAccounts()
        totalProcessed += accountResult.processed
        totalErrors += accountResult.errors
        if (accountResult.errorMessages) {
          errors.push(...accountResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Account sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync leads
      try {
        const leadResult = await this.syncLeads()
        totalProcessed += leadResult.processed
        totalErrors += leadResult.errors
        if (leadResult.errorMessages) {
          errors.push(...leadResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Lead sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync opportunities
      try {
        const opportunityResult = await this.syncOpportunities()
        totalProcessed += opportunityResult.processed
        totalErrors += opportunityResult.errors
        if (opportunityResult.errorMessages) {
          errors.push(...opportunityResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Opportunity sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Microsoft Dynamics 365 sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const dynamicsPayload = payload as DynamicsWebhookPayload

      switch (dynamicsPayload.type) {
        case 'dynamics365.contact.created':
        case 'dynamics365.contact.updated':
          await this.handleContactWebhook(dynamicsPayload)
          break
        case 'dynamics365.account.created':
        case 'dynamics365.account.updated':
          await this.handleAccountWebhook(dynamicsPayload)
          break
        case 'dynamics365.lead.created':
        case 'dynamics365.lead.updated':
          await this.handleLeadWebhook(dynamicsPayload)
          break
        case 'dynamics365.opportunity.created':
        case 'dynamics365.opportunity.updated':
          await this.handleOpportunityWebhook(dynamicsPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${dynamicsPayload.type}`)
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
      if (this.refreshTokenValue && this.config) {
        await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({,
            token: this.refreshTokenValue
            client_id: this.config.clientId
          })
        })
      }

      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncContacts(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.contacts', async () => {
        return this.makeApiCall('/contacts?$top=50', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const contacts = response.value || []

      for (const contact of contacts) {
        try {
          await this.processContact(contact)
          processed++
        } catch (error) {
          errors.push(`Failed to process contact ${contact.contactid}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Contact sync failed: ${(error as Error).message}`)
    }
  }

  private async syncAccounts(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.accounts', async () => {
        return this.makeApiCall('/accounts?$top=50', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const accounts = response.value || []

      for (const account of accounts) {
        try {
          await this.processAccount(account)
          processed++
        } catch (error) {
          errors.push(`Failed to process account ${account.accountid}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Account sync failed: ${(error as Error).message}`)
    }
  }

  private async syncLeads(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.leads', async () => {
        return this.makeApiCall('/leads?$top=50', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const leads = response.value || []

      for (const lead of leads) {
        try {
          await this.processLead(lead)
          processed++
        } catch (error) {
          errors.push(`Failed to process lead ${lead.leadid}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Lead sync failed: ${(error as Error).message}`)
    }
  }

  private async syncOpportunities(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.opportunities', async () => {
        return this.makeApiCall('/opportunities?$top=50', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const opportunities = response.value || []

      for (const opportunity of opportunities) {
        try {
          await this.processOpportunity(opportunity)
          processed++
        } catch (error) {
          errors.push(
            `Failed to process opportunity ${opportunity.opportunityid}: ${(error as Error).message}`,
          )
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Opportunity sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processContact(contact: any): Promise<void> {
    this.logger.debug(`Processing contact: ${contact.fullname}`)
    // Process contact data for Aurelius AI system
  }

  private async processAccount(account: any): Promise<void> {
    this.logger.debug(`Processing account: ${account.name}`)
    // Process account data for Aurelius AI system
  }

  private async processLead(lead: any): Promise<void> {
    this.logger.debug(`Processing lead: ${lead.fullname}`)
    // Process lead data for Aurelius AI system
  }

  private async processOpportunity(opportunity: any): Promise<void> {
    this.logger.debug(`Processing opportunity: ${opportunity.name}`)
    // Process opportunity data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleContactWebhook(payload: DynamicsWebhookPayload): Promise<void> {
    this.logger.debug(`Handling contact webhook: ${payload.id}`)
    // Handle contact webhook processing
  }

  private async handleAccountWebhook(payload: DynamicsWebhookPayload): Promise<void> {
    this.logger.debug(`Handling account webhook: ${payload.id}`)
    // Handle account webhook processing
  }

  private async handleLeadWebhook(payload: DynamicsWebhookPayload): Promise<void> {
    this.logger.debug(`Handling lead webhook: ${payload.id}`)
    // Handle lead webhook processing
  }

  private async handleOpportunityWebhook(payload: DynamicsWebhookPayload): Promise<void> {
    this.logger.debug(`Handling opportunity webhook: ${payload.id}`)
    // Handle opportunity webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
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
        `Dynamics 365 API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getContacts(filter?: string): Promise<any[]> {
    try {
      const queryParams = filter ? `?$filter=${encodeURIComponent(filter)}` : ''

      const response = await this.executeWithProtection('api.get_contacts', async () => {
        return this.makeApiCall(`/contacts${queryParams}`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getContacts', error as Error)
      throw new Error(`Failed to get contacts: ${(error as Error).message}`)
    }
  }

  async createContact(contactData: {
    firstname?: string
    lastname: string
    emailaddress1?: string
    telephone1?: string
    jobtitle?: string
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.create_contact', async () => {
        return this.makeApiCall('/contacts', 'POST', contactData)
      })

      return response
    } catch (error) {
      this.logError('createContact', error as Error)
      throw new Error(`Failed to create contact: ${(error as Error).message}`)
    }
  }

  async getAccounts(filter?: string): Promise<any[]> {
    try {
      const queryParams = filter ? `?$filter=${encodeURIComponent(filter)}` : ''

      const response = await this.executeWithProtection('api.get_accounts', async () => {
        return this.makeApiCall(`/accounts${queryParams}`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getAccounts', error as Error)
      throw new Error(`Failed to get accounts: ${(error as Error).message}`)
    }
  }

  async createAccount(accountData: {,
    name: string
    emailaddress1?: string
    telephone1?: string
    websiteurl?: string
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.create_account', async () => {
        return this.makeApiCall('/accounts', 'POST', accountData)
      })

      return response
    } catch (error) {
      this.logError('createAccount', error as Error)
      throw new Error(`Failed to create account: ${(error as Error).message}`)
    }
  }

  async getLeads(filter?: string): Promise<any[]> {
    try {
      const queryParams = filter ? `?$filter=${encodeURIComponent(filter)}` : ''

      const response = await this.executeWithProtection('api.get_leads', async () => {
        return this.makeApiCall(`/leads${queryParams}`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getLeads', error as Error)
      throw new Error(`Failed to get leads: ${(error as Error).message}`)
    }
  }

  async createLead(leadData: {,
    subject: string
    firstname?: string
    lastname: string
    emailaddress1?: string
    companyname?: string
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.create_lead', async () => {
        return this.makeApiCall('/leads', 'POST', leadData)
      })

      return response
    } catch (error) {
      this.logError('createLead', error as Error)
      throw new Error(`Failed to create lead: ${(error as Error).message}`)
    }
  }

  async getOpportunities(filter?: string): Promise<any[]> {
    try {
      const queryParams = filter ? `?$filter=${encodeURIComponent(filter)}` : ''

      const response = await this.executeWithProtection('api.get_opportunities', async () => {
        return this.makeApiCall(`/opportunities${queryParams}`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getOpportunities', error as Error)
      throw new Error(`Failed to get opportunities: ${(error as Error).message}`)
    }
  }

  async createOpportunity(opportunityData: {,
    name: string
    estimatedvalue?: number
    estimatedclosedate?: string
    description?: string
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.create_opportunity', async () => {
        return this.makeApiCall('/opportunities', 'POST', opportunityData)
      })

      return response
    } catch (error) {
      this.logError('createOpportunity', error as Error)
      throw new Error(`Failed to create opportunity: ${(error as Error).message}`)
    }
  }
}
