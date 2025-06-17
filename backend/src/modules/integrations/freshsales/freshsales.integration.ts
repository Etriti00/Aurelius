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
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class FreshsalesIntegration extends BaseIntegration {
  readonly provider = 'freshsales'
  readonly name = 'Freshsales'
  readonly version = '1.0.0'

  private baseUrl: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig & { domain?: string },
  ) {
    super(userId, accessToken, refreshToken)
    this.baseUrl = `https://${config?.domain || '[domain]'}.freshsales.io/api`
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: ['freshsales:read', 'freshsales:write'],
        metadata: { userInfo: data.user }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Freshsales uses API tokens that don't expire, so just return current auth status
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Freshsales doesn't have a revoke endpoint for API tokens
      // The token would need to be regenerated in the admin panel,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })
  }

      if ((response as Response).ok) {
        const data = await response.json()
        return {
          isConnected: true,
          lastChecked: new Date()
          metadata: {,
            userName: data.user?.display_name
            userEmail: data.user?.email
          }
        }
      }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Invalid API token'
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
            limit: 1000,
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
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Leads',
        description: 'Manage sales leads and prospects'
        enabled: true,
        requiredScopes: ['freshsales:read', 'freshsales:write']
      },
      {
        name: 'Contacts',
        description: 'Manage customer contacts'
        enabled: true,
        requiredScopes: ['freshsales:read', 'freshsales:write']
      },
      {
        name: 'Accounts',
        description: 'Manage customer accounts and companies'
        enabled: true,
        requiredScopes: ['freshsales:read', 'freshsales:write']
      },
      {
        name: 'Deals',
        description: 'Manage sales opportunities and deals'
        enabled: true,
        requiredScopes: ['freshsales:read', 'freshsales:write']
      },
      {
        name: 'Tasks',
        description: 'Manage tasks and activities'
        enabled: true,
        requiredScopes: ['freshsales:read', 'freshsales:write']
      },
      {
        name: 'Appointments',
        description: 'Manage calendar appointments'
        enabled: true,
        requiredScopes: ['freshsales:read', 'freshsales:write']
      },
      {
        name: 'Notes',
        description: 'Add and manage notes on records'
        enabled: true,
        requiredScopes: ['freshsales:read', 'freshsales:write']
      },
      {
        name: 'Products',
        description: 'Manage product catalog'
        enabled: true,
        requiredScopes: ['freshsales:read', 'freshsales:write']
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

      this.logInfo('syncData', 'Starting Freshsales sync', { lastSyncTime })

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
        console.error('Error in freshsales.integration.ts:', error)
        throw error
      }
      // Sync Contacts
      try {
        const contactsResult = await this.syncContacts(lastSyncTime)
        totalProcessed += contactsResult.processed,
        totalSkipped += contactsResult.skipped
      } catch (error) {
        errors.push(`Contacts sync failed: ${(error as Error).message}`)
        this.logError('syncContacts', error as Error)
      }

      // Sync Accounts
      try {
        const accountsResult = await this.syncAccounts(lastSyncTime)
        totalProcessed += accountsResult.processed,
        totalSkipped += accountsResult.skipped
      } catch (error) {
        errors.push(`Accounts sync failed: ${(error as Error).message}`)
        this.logError('syncAccounts', error as Error)
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
      throw new SyncError('Freshsales sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Freshsales webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'lead_created':
        case 'lead_updated':
        case 'lead_deleted':
          await this.handleLeadWebhook(payload.data)
          break
        case 'contact_created':
        case 'contact_updated':
        case 'contact_deleted':
          await this.handleContactWebhook(payload.data)
          break
        case 'deal_created':
        case 'deal_updated':
        case 'deal_deleted':
          await this.handleDealWebhook(payload.data)
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
      console.error('Error in freshsales.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Freshsales webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncLeads(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/leads?per_page=100`

      if (lastSyncTime) {
        url += `&updated_since=${lastSyncTime.toISOString()}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.statusText}`)
      }

      const data = await response.json()
      const leads = data.leads || []

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
      console.error('Error in freshsales.integration.ts:', error)
      throw error
    }
  private async syncContacts(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/contacts?per_page=100`

      if (lastSyncTime) {
        url += `&updated_since=${lastSyncTime.toISOString()}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.statusText}`)
      }

      const data = await response.json()
      const contacts = data.contacts || []

      let processed = 0
      let skipped = 0

      for (const contact of contacts) {
        try {
          await this.processContact(contact)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncContacts', error as Error, { contactId: contact.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncContacts', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in freshsales.integration.ts:', error)
      throw error
    }
  private async syncAccounts(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/sales_accounts?per_page=100`

      if (lastSyncTime) {
        url += `&updated_since=${lastSyncTime.toISOString()}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`)
      }

      const data = await response.json()
      const accounts = data.sales_accounts || []

      let processed = 0
      let skipped = 0

      for (const account of accounts) {
        try {
          await this.processAccount(account)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncAccounts', error as Error, { accountId: account.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncAccounts', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in freshsales.integration.ts:', error)
      throw error
    }
  private async syncDeals(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/deals?per_page=100`

      if (lastSyncTime) {
        url += `&updated_since=${lastSyncTime.toISOString()}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch deals: ${response.statusText}`)
      }

      const data = await response.json()
      const deals = data.deals || []

      let processed = 0
      let skipped = 0

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

      return { processed, skipped }
    } catch (error) {
      this.logError('syncDeals', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in freshsales.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processLead(lead: unknown): Promise<void> {
    this.logInfo('processLead', `Processing lead: ${lead.id}`)
  }

  private async processContact(contact: unknown): Promise<void> {
    this.logInfo('processContact', `Processing contact: ${contact.id}`)
  }

  private async processAccount(account: unknown): Promise<void> {
    this.logInfo('processAccount', `Processing account: ${account.id}`)
  }

  private async processDeal(deal: unknown): Promise<void> {
    this.logInfo('processDeal', `Processing deal: ${deal.id}`)
  }

  // Private webhook handlers
  private async handleLeadWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleLeadWebhook', 'Processing lead webhook', data)
  }

  private async handleContactWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleContactWebhook', 'Processing contact webhook', data)
  }

  private async handleDealWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleDealWebhook', 'Processing deal webhook', data)
  }

  // Public API methods
  async createLead(leadData: {
    first_name?: string
    last_name: string
    email?: string
    phone?: string
    company?: string
    designation?: string
    lead_source_id?: number
    owner_id?: number,
    custom_field?: unknown
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/leads`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lead: leadData })
      })

      if (!response.ok) {
        throw new Error(`Failed to create lead: ${response.statusText}`)
      }

      const data = await response.json()
      return data.lead.id
    } catch (error) {
      this.logError('createLead', error as Error)
      throw new Error(`Failed to create Freshsales lead: ${(error as Error).message}`)
    }

  async updateLead(leadId: number, leadData: unknown): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lead: leadData })
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to update lead: ${response.statusText}`)
      }
    } catch (error) {
      this.logError('updateLead', error as Error)
      throw new Error(`Failed to update Freshsales lead: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in freshsales.integration.ts:', error)
      throw error
    }
  async getLead(leadId: number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}`, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get lead: ${response.statusText}`)
      }

      const data = await response.json()
      return data.lead
    } catch (error) {
      this.logError('getLead', error as Error)
      throw new Error(`Failed to get Freshsales lead: ${(error as Error).message}`)
    }

  async deleteLead(leadId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Token token=${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to delete lead: ${response.statusText}`)
      }
    } catch (error) {
      this.logError('deleteLead', error as Error)
      throw new Error(`Failed to delete Freshsales lead: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in freshsales.integration.ts:', error)
      throw error
    }
  async convertLead(
    leadId: number,
    conversionData: {
      contact?: {
        first_name?: string
        last_name: string
        email?: string,
        phone?: string
      }
      account?: {
        name: string
        website?: string,
        phone?: string
      }
      deal?: {
        name: string
        amount?: number
        expected_close?: string,
        deal_stage_id?: number
      },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/leads/${leadId}/convert`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(conversionData)
      })

      if (!response.ok) {
        throw new Error(`Failed to convert lead: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('convertLead', error as Error)
      throw new Error(`Failed to convert Freshsales lead: ${(error as Error).message}`)
    }

  async createContact(contactData: {
    first_name?: string
    last_name: string
    email?: string
    phone?: string
    designation?: string
    sales_account_id?: number
    owner_id?: number,
    custom_field?: unknown
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contact: contactData })
      })

      if (!response.ok) {
        throw new Error(`Failed to create contact: ${response.statusText}`)
      }

      const data = await response.json()
      return data.contact.id
    } catch (error) {
      this.logError('createContact', error as Error)
      throw new Error(`Failed to create Freshsales contact: ${(error as Error).message}`)
    }

  async createAccount(accountData: {,
    name: string
    website?: string
    phone?: string
    number_of_employees?: number
    annual_revenue?: number
    industry_type_id?: number
    business_type_id?: number
    owner_id?: number,
    custom_field?: unknown
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/sales_accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sales_account: accountData })
      })

      if (!response.ok) {
        throw new Error(`Failed to create account: ${response.statusText}`)
      }

      const data = await response.json()
      return data.sales_account.id
    } catch (error) {
      this.logError('createAccount', error as Error)
      throw new Error(`Failed to create Freshsales account: ${(error as Error).message}`)
    }

  async createDeal(dealData: {,
    name: string
    amount?: number
    expected_close?: string
    deal_stage_id?: number
    sales_account_id?: number
    contacts_added_list?: number[]
    owner_id?: number,
    custom_field?: unknown
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/deals`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deal: dealData })
      })

      if (!response.ok) {
        throw new Error(`Failed to create deal: ${response.statusText}`)
      }

      const data = await response.json()
      return data.deal.id
    } catch (error) {
      this.logError('createDeal', error as Error)
      throw new Error(`Failed to create Freshsales deal: ${(error as Error).message}`)
    }

  async createTask(taskData: {,
    title: string
    description?: string
    due_date?: string
    owner_id?: number
    targetable_type?: 'Contact' | 'SalesAccount' | 'Deal' | 'Lead'
    targetable_id?: number,
    task_type_id?: number
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ task: taskData })
      })

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`)
      }

      const data = await response.json()
      return data.task.id
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create Freshsales task: ${(error as Error).message}`)
    }

  async createAppointment(appointmentData: {,
    title: string
    description?: string
    from_date: string,
    end_date: string
    owner_id?: number
    targetable_type?: 'Contact' | 'SalesAccount' | 'Deal' | 'Lead'
    targetable_id?: number
    appointment_attendees_attributes?: Array<{
      attendee_type: 'User' | 'Contact',
      attendee_id: number
    }>
  }): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/appointments`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appointment: appointmentData })
      })

      if (!response.ok) {
        throw new Error(`Failed to create appointment: ${response.statusText}`)
      }

      const data = await response.json()
      return data.appointment.id
    } catch (error) {
      this.logError('createAppointment', error as Error)
      throw new Error(`Failed to create Freshsales appointment: ${(error as Error).message}`)
    }

  async addNote(
    entityType: 'leads' | 'contacts' | 'sales_accounts' | 'deals',
    entityId: number
    noteData: {,
      description: string
    },
  ): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/${entityType}/${entityId}/notes`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: noteData })
      })

      if (!response.ok) {
        throw new Error(`Failed to add note: ${response.statusText}`)
      }

      const data = await response.json()
      return data.note.id
    } catch (error) {
      this.logError('addNote', error as Error)
      throw new Error(`Failed to add Freshsales note: ${(error as Error).message}`)
    }

  async searchRecords(
    entityType: 'leads' | 'contacts' | 'sales_accounts' | 'deals',
    query: string
  ): Promise<unknown[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&include=${entityType}`,
        {
          headers: {,
            Authorization: `Token token=${this.accessToken}`
          }
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to search records: ${response.statusText}`)
      }

      const data = await response.json()
      return data[entityType] || []
    } catch (error) {
      this.logError('searchRecords', error as Error)
      throw new Error(`Failed to search Freshsales records: ${(error as Error).message}`)
    }

  async getLeadSources(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/selector/lead_sources`, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get lead sources: ${response.statusText}`)
      }

      const data = await response.json()
      return data.lead_sources || []
    } catch (error) {
      this.logError('getLeadSources', error as Error)
      throw new Error(`Failed to get Freshsales lead sources: ${(error as Error).message}`)
    }

  async getDealStages(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/selector/deal_stages`, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get deal stages: ${response.statusText}`)
      }

      const data = await response.json()
      return data.deal_stages || []
    } catch (error) {
      this.logError('getDealStages', error as Error)
      throw new Error(`Failed to get Freshsales deal stages: ${(error as Error).message}`)
    }

  async getUsers(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/selector/owners`, {
        headers: {,
          Authorization: `Token token=${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get users: ${response.statusText}`)
      }

      const data = await response.json()
      return data.users || []
    } catch (error) {
      this.logError('getUsers', error as Error)
      throw new Error(`Failed to get Freshsales users: ${(error as Error).message}`)
    }

}