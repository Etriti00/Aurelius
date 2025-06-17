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

export class CopperIntegration extends BaseIntegration {
  readonly provider = 'copper'
  readonly name = 'Copper'
  readonly version = '1.0.0'

  private baseUrl = 'https://api.copper.com/developer_api/v1'
  private userEmail: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig & { userEmail?: string },
  ) {
    super(userId, accessToken, refreshToken)
    this.userEmail = config?.userEmail || ''
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: ['copper:read', 'copper:write'],
        metadata: { accountInfo: data }
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
    // Copper uses API tokens that don't expire, so just return current auth status
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Copper doesn't have a revoke endpoint for API tokens
      // The token would need to be regenerated in the admin panel
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error)
      return false
    }
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/account`, {
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail
        }
      })
  }

      if ((response as Response).ok) {
        const data = await response.json()
        return {
          isConnected: true,
          lastChecked: new Date()
          metadata: {,
            accountName: data.name
            accountId: data.id
          }
        }
      }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Invalid API token or email'
        }
    }
  }
      }

      if ((response as Response).status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 600,
            remaining: 0
            resetTime: new Date(Date.now() + 60000)
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: response.statusText
      }
    }
  }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }
    }
  }

  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Leads',
        description: 'Manage sales leads and prospects'
        enabled: true,
        requiredScopes: ['copper:read', 'copper:write']
      },
      {
        name: 'People',
        description: 'Manage customer contacts and people'
        enabled: true,
        requiredScopes: ['copper:read', 'copper:write']
      },
      {
        name: 'Companies',
        description: 'Manage customer companies and organizations'
        enabled: true,
        requiredScopes: ['copper:read', 'copper:write']
      },
      {
        name: 'Opportunities',
        description: 'Manage sales opportunities and deals'
        enabled: true,
        requiredScopes: ['copper:read', 'copper:write']
      },
      {
        name: 'Projects',
        description: 'Manage customer projects'
        enabled: true,
        requiredScopes: ['copper:read', 'copper:write']
      },
      {
        name: 'Tasks',
        description: 'Manage tasks and activities'
        enabled: true,
        requiredScopes: ['copper:read', 'copper:write']
      },
      {
        name: 'Activities',
        description: 'Track emails, calls, and other activities',
        enabled: true,
        requiredScopes: ['copper:read', 'copper:write']
      },
      {
        name: 'Pipelines',
        description: 'Manage sales pipelines and stages'
        enabled: true,
        requiredScopes: ['copper:read', 'copper:write']
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

      this.logInfo('syncData', 'Starting Copper sync', { lastSyncTime })

      // Sync Leads
      try {
        const leadsResult = await this.syncLeads(lastSyncTime)
        totalProcessed += leadsResult.processed,
        totalSkipped += leadsResult.skipped
      }
    } catch (error) {
        errors.push(`Leads sync failed: ${(error as Error).message}`)
        this.logError('syncLeads', error as Error)
      }

      catch (error) {
        console.error('Error in copper.integration.ts:', error)
        throw error
      }
      // Sync People
      try {
        const peopleResult = await this.syncPeople(lastSyncTime)
        totalProcessed += peopleResult.processed,
        totalSkipped += peopleResult.skipped
      } catch (error) {
        errors.push(`People sync failed: ${(error as Error).message}`)
        this.logError('syncPeople', error as Error)
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

      // Sync Opportunities
      try {
        const opportunitiesResult = await this.syncOpportunities(lastSyncTime)
        totalProcessed += opportunitiesResult.processed,
        totalSkipped += opportunitiesResult.skipped
      } catch (error) {
        errors.push(`Opportunities sync failed: ${(error as Error).message}`)
        this.logError('syncOpportunities', error as Error)
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
      throw new SyncError('Copper sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Copper webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'new':
        case 'update':
        case 'delete':
          await this.handleRecordWebhook(payload.data)
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
      console.error('Error in copper.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Copper webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncLeads(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const url = `${this.baseUrl}/leads/search`
      const searchData: unknown = { page_size: 200 }

      if (lastSyncTime) {
        searchData.minimum_modified_date = Math.floor(lastSyncTime.getTime() / 1000)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`)
      }

      const leads = await response.json()

      let processed = 0
      let skipped = 0

      for (const lead of leads) {
        try {
          await this.processLead(lead)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncLeads', error as Error, { leadId: lead.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncLeads', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in copper.integration.ts:', error)
      throw error
    }
  private async syncPeople(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const url = `${this.baseUrl}/people/search`
      const searchData: unknown = { page_size: 200 }

      if (lastSyncTime) {
        searchData.minimum_modified_date = Math.floor(lastSyncTime.getTime() / 1000)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch people: ${response.statusText}`)
      }

      const people = await response.json()

      let processed = 0
      let skipped = 0

      for (const person of people) {
        try {
          await this.processPerson(person)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncPeople', error as Error, { personId: person.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncPeople', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in copper.integration.ts:', error)
      throw error
    }
  private async syncCompanies(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const url = `${this.baseUrl}/companies/search`
      const searchData: unknown = { page_size: 200 }

      if (lastSyncTime) {
        searchData.minimum_modified_date = Math.floor(lastSyncTime.getTime() / 1000)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.statusText}`)
      }

      const companies = await response.json()

      let processed = 0
      let skipped = 0

      for (const company of companies) {
        try {
          await this.processCompany(company)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncCompanies', error as Error, { companyId: company.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncCompanies', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in copper.integration.ts:', error)
      throw error
    }
  private async syncOpportunities(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const url = `${this.baseUrl}/opportunities/search`
      const searchData: unknown = { page_size: 200 }

      if (lastSyncTime) {
        searchData.minimum_modified_date = Math.floor(lastSyncTime.getTime() / 1000)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch opportunities: ${response.statusText}`)
      }

      const opportunities = await response.json()

      let processed = 0
      let skipped = 0

      for (const opportunity of opportunities) {
        try {
          await this.processOpportunity(opportunity)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncOpportunities', error as Error, { opportunityId: opportunity.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncOpportunities', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in copper.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processLead(lead: unknown): Promise<void> {
    this.logInfo('processLead', `Processing lead: ${lead.id}`)
  }

  private async processPerson(person: unknown): Promise<void> {
    this.logInfo('processPerson', `Processing person: ${person.id}`)
  }

  private async processCompany(company: unknown): Promise<void> {
    this.logInfo('processCompany', `Processing company: ${company.id}`)
  }

  private async processOpportunity(opportunity: unknown): Promise<void> {
    this.logInfo('processOpportunity', `Processing opportunity: ${opportunity.id}`)
  }

  // Private webhook handlers
  private async handleRecordWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleRecordWebhook', 'Processing record webhook', data)
  }

  // Public API methods
  async createLead(leadData: {,
    name: string
    email?: { email: string; category: string }
    phone_numbers?: Array<{ number: string; category: string }>
    company_name?: string
    title?: string
    address?: unknown
    details?: string
    custom_fields?: unknown[],
    assignee_id?: number
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leadData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create lead: ${response.statusText}`)
      }

      const data = await response.json()
      return data.id
    } catch (error) {
      this.logError('createLead', error as Error)
      throw new Error(`Failed to create Copper lead: ${(error as Error).message}`)
    }

  async updateLead(leadId: number, leadData: unknown): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leadData)
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to update lead: ${response.statusText}`)
      }
    } catch (error) {
      this.logError('updateLead', error as Error)
      throw new Error(`Failed to update Copper lead: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in copper.integration.ts:', error)
      throw error
    }
  async getLead(leadId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}`, {
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get lead: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getLead', error as Error)
      throw new Error(`Failed to get Copper lead: ${(error as Error).message}`)
    }

  async deleteLead(leadId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to delete lead: ${response.statusText}`)
      }
    } catch (error) {
      this.logError('deleteLead', error as Error)
      throw new Error(`Failed to delete Copper lead: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in copper.integration.ts:', error)
      throw error
    }
  async convertLead(
    leadId: number,
    conversionData: {
      person?: {
        name: string
        emails?: Array<{ email: string; category: string }>
        phone_numbers?: Array<{ number: string; category: string }>
      }
      company?: {
        name: string
        assignee_id?: number
      }
      opportunity?: {
        name: string,
        pipeline_id: number
        pipeline_stage_id: number
        monetary_value?: number,
        close_date?: string
      },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}/convert`, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ details: conversionData })
      })

      if (!response.ok) {
        throw new Error(`Failed to convert lead: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('convertLead', error as Error)
      throw new Error(`Failed to convert Copper lead: ${(error as Error).message}`)
    }

  async createPerson(personData: {,
    name: string
    emails?: Array<{ email: string; category: string }>
    phone_numbers?: Array<{ number: string; category: string }>
    title?: string
    company_id?: number
    contact_type_id?: number
    details?: string
    custom_fields?: unknown[],
    assignee_id?: number
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/people`, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(personData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create person: ${response.statusText}`)
      }

      const data = await response.json()
      return data.id
    } catch (error) {
      this.logError('createPerson', error as Error)
      throw new Error(`Failed to create Copper person: ${(error as Error).message}`)
    }

  async createCompany(companyData: {,
    name: string
    email_domain?: string
    phone_numbers?: Array<{ number: string; category: string }>
    address?: unknown
    details?: string
    custom_fields?: unknown[],
    assignee_id?: number
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/companies`, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(companyData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create company: ${response.statusText}`)
      }

      const data = await response.json()
      return data.id
    } catch (error) {
      this.logError('createCompany', error as Error)
      throw new Error(`Failed to create Copper company: ${(error as Error).message}`)
    }

  async createOpportunity(opportunityData: {,
    name: string
    pipeline_id: number,
    pipeline_stage_id: number
    monetary_value?: number
    currency?: string
    win_probability?: number
    expected_close_date?: string
    company_id?: number
    primary_contact_id?: number
    details?: string
    custom_fields?: unknown[],
    assignee_id?: number
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/opportunities`, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(opportunityData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create opportunity: ${response.statusText}`)
      }

      const data = await response.json()
      return data.id
    } catch (error) {
      this.logError('createOpportunity', error as Error)
      throw new Error(`Failed to create Copper opportunity: ${(error as Error).message}`)
    }

  async createTask(taskData: {,
    name: string
    related_resource: {,
      type: 'person' | 'company' | 'opportunity' | 'project' | 'lead'
      id: number
    }
    due_date?: string
    reminder_date?: string
    completed_date?: string
    priority?: 'None' | 'High'
    status?: 'Open' | 'Completed'
    details?: string,
    assignee_id?: number
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`)
      }

      const data = await response.json()
      return data.id
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create Copper task: ${(error as Error).message}`)
    }

  async createActivity(activityData: {,
    parent: {
      type: 'person' | 'company' | 'opportunity' | 'project' | 'lead',
      id: number
    },
    type: {,
      category: 'user' | 'system'
      id: number
    },
    details: string
    activity_date?: number
    old_value?: unknown
    new_value?: unknown,
    user_id?: number
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/activities`, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activityData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create activity: ${response.statusText}`)
      }

      const data = await response.json()
      return data.id
    } catch (error) {
      this.logError('createActivity', error as Error)
      throw new Error(`Failed to create Copper activity: ${(error as Error).message}`)
    }

  async searchRecords(
    entityType: 'leads' | 'people' | 'companies' | 'opportunities',
    searchData: {
      name?: string
      emails?: string[]
      phone_numbers?: string[]
      custom_fields?: unknown[]
      assignee_ids?: number[]
      page_size?: number
      sort_by?: string,
      sort_direction?: 'asc' | 'desc'
    },
  ): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${entityType}/search`, {
        method: 'POST',
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...searchData,
          page_size: searchData.page_size || 100
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to search ${entityType}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('searchRecords', error as Error)
      throw new Error(`Failed to search Copper ${entityType}: ${(error as Error).message}`)
    }

  async getPipelines(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/pipelines`, {
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get pipelines: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getPipelines', error as Error)
      throw new Error(`Failed to get Copper pipelines: ${(error as Error).message}`)
    }

  async getPipelineStages(pipelineId: number): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/pipeline_stages`, {
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get pipeline stages: ${response.statusText}`)
      }

      const allStages = await response.json()
      return allStages.filter((stage: unknown) => (stage as any).pipeline_id === pipelineId)
    } catch (error) {
      this.logError('getPipelineStages', error as Error)
      throw new Error(`Failed to get Copper pipeline stages: ${(error as Error).message}`)
    }

  async getUsers(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users`, {
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get users: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getUsers', error as Error)
      throw new Error(`Failed to get Copper users: ${(error as Error).message}`)
    }

  async getCustomFieldDefinitions(
    entityType: 'leads' | 'people' | 'companies' | 'opportunities'
  ): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/custom_field_definitions`, {
        headers: {
          'X-PW-AccessToken': this.accessToken,
          'X-PW-Application': 'developer_api',
          'X-PW-UserEmail': this.userEmail
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get custom field definitions: ${response.statusText}`)
      }

      const allFields = await response.json()
      return allFields.filter(
        (field: unknown) =>
          (field as any).available_on.includes(entityType) ||
          ((field as any).available_on.includes('person') && entityType === 'people') ||
          ((field as any).available_on.includes('company') && entityType === 'companies'),
      )
    } catch (error) {
      this.logError('getCustomFieldDefinitions', error as Error)
      throw new Error(`Failed to get Copper custom field definitions: ${(error as Error).message}`)
    }

}