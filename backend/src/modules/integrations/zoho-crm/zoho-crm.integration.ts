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

export class ZohoCRMIntegration extends BaseIntegration {
  readonly provider = 'zoho-crm'
  readonly name = 'Zoho CRM'
  readonly version = '1.0.0'

  private baseUrl: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig & {
      apiDomain?: string,
      dataCenter?: 'com' | 'eu' | 'in' | 'com.au' | 'jp'
    },
  ) {
    super(userId, accessToken, refreshToken)
    const dc = config?.dataCenter || 'com'
    this.baseUrl = `https://www.zohoapis.${dc}/crm/v3`
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/users?type=CurrentUser`, {
        headers: {,
          Authorization: `Zoho-oauthtoken ${this.accessToken}`,
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
        scope: [
          'ZohoCRM.modules.ALL',
          'ZohoCRM.users.READ',
          'ZohoCRM.org.READ',
          'ZohoCRM.settings.READ',
        ],
        metadata: { userInfo: data.users?.[0] }
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

      const dc = this.config?.dataCenter || 'com'
      const response = await fetch(`https://accounts.zoho.${dc}/oauth/v2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          refresh_token: this.refreshTokenValue
          client_id: this.config?.clientId || '',
          client_secret: this.config?.clientSecret || ''
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        accessToken: data.access_token
        refreshToken: data.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + data.expires_in * 1000)
        scope: data.scope?.split(',') || [
          'ZohoCRM.modules.ALL',
          'ZohoCRM.users.READ',
          'ZohoCRM.org.READ',
          'ZohoCRM.settings.READ',
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
      const dc = this.config?.dataCenter || 'com'
      const response = await fetch(`https://accounts.zoho.${dc}/oauth/v2/token/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ token: this.accessToken })
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/users?type=CurrentUser`, {
        headers: {,
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
        }
      })
  }

      if ((response as Response).ok) {
        const data = await response.json()
        return {
          isConnected: true,
          lastChecked: new Date()
          metadata: {,
            userName: data.users?.[0]?.full_name
            userEmail: data.users?.[0]?.email
          }
        }
      }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
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
            limit: 200,
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
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Leads',
        description: 'Manage sales leads and prospects'
        enabled: true,
        requiredScopes: ['ZohoCRM.modules.leads.ALL']
      },
      {
        name: 'Contacts',
        description: 'Manage customer contacts'
        enabled: true,
        requiredScopes: ['ZohoCRM.modules.contacts.ALL']
      },
      {
        name: 'Accounts',
        description: 'Manage customer accounts and organizations'
        enabled: true,
        requiredScopes: ['ZohoCRM.modules.accounts.ALL']
      },
      {
        name: 'Deals',
        description: 'Manage sales opportunities and deals'
        enabled: true,
        requiredScopes: ['ZohoCRM.modules.deals.ALL']
      },
      {
        name: 'Tasks',
        description: 'Manage tasks and activities'
        enabled: true,
        requiredScopes: ['ZohoCRM.modules.tasks.ALL']
      },
      {
        name: 'Events',
        description: 'Manage calendar events and meetings'
        enabled: true,
        requiredScopes: ['ZohoCRM.modules.events.ALL']
      },
      {
        name: 'Notes',
        description: 'Add and manage notes on records'
        enabled: true,
        requiredScopes: ['ZohoCRM.modules.notes.ALL']
      },
      {
        name: 'Products',
        description: 'Manage product catalog'
        enabled: true,
        requiredScopes: ['ZohoCRM.modules.products.ALL']
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

      this.logInfo('syncData', 'Starting Zoho CRM sync', { lastSyncTime })

      // Sync Leads
      try {
        const leadsResult = await this.syncModule('Leads', lastSyncTime)
        totalProcessed += leadsResult.processed,
        totalSkipped += leadsResult.skipped
      }
    } catch (error) {
        errors.push(`Leads sync failed: ${(error as Error).message}`)
        this.logError('syncLeads', error as Error)
      }

      catch (error) {
        console.error('Error in zoho-crm.integration.ts:', error)
        throw error
      }
      // Sync Contacts
      try {
        const contactsResult = await this.syncModule('Contacts', lastSyncTime)
        totalProcessed += contactsResult.processed,
        totalSkipped += contactsResult.skipped
      } catch (error) {
        errors.push(`Contacts sync failed: ${(error as Error).message}`)
        this.logError('syncContacts', error as Error)
      }

      // Sync Accounts
      try {
        const accountsResult = await this.syncModule('Accounts', lastSyncTime)
        totalProcessed += accountsResult.processed,
        totalSkipped += accountsResult.skipped
      } catch (error) {
        errors.push(`Accounts sync failed: ${(error as Error).message}`)
        this.logError('syncAccounts', error as Error)
      }

      // Sync Deals
      try {
        const dealsResult = await this.syncModule('Deals', lastSyncTime)
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
      throw new SyncError('Zoho CRM sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Zoho CRM webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'record.created':
        case 'record.updated':
        case 'record.deleted':
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
      console.error('Error in zoho-crm.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Zoho CRM webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncModule(
    moduleName: string
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/${moduleName}?per_page=200`

      if (lastSyncTime) {
        url += `&criteria=(Modified_Time:greater_than:${lastSyncTime.toISOString()})`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ${moduleName}: ${response.statusText}`)
      }

      const data = await response.json()
      const records = data.data || []

      let processed = 0
      let skipped = 0

      for (const record of records) {
        try {
          await this.processRecord(moduleName, record),
          processed++
        }
      }
    } catch (error) {
          this.logError(`sync${moduleName}`, error as Error, { recordId: record.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError(`sync${moduleName}`, error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in zoho-crm.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processRecord(moduleName: string, record: unknown): Promise<void> {
    this.logInfo('processRecord', `Processing ${moduleName},
    record: ${record.id}`)
  }

  // Private webhook handlers
  private async handleRecordWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleRecordWebhook', 'Processing record webhook', data)
  }

  // Public API methods
  async createRecord(moduleName: string, recordData: unknown): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${moduleName}`, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: [recordData] })
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to create ${moduleName}
      }
    record: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data?.[0]?.details?.id
    } catch (error) {
      this.logError('createRecord', error as Error)
      throw new Error(`Failed to create Zoho CRM ${moduleName},
    record: ${(error as Error).message}`)
    }

  async updateRecord(moduleName: string, recordId: string, recordData: unknown): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${moduleName}/${recordId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: [recordData] })
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to update ${moduleName}
      }
    record: ${response.statusText}`)
      }
    } catch (error) {
      this.logError('updateRecord', error as Error)
      throw new Error(`Failed to update Zoho CRM ${moduleName},
    record: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in zoho-crm.integration.ts:', error)
      throw error
    }
  async getRecord(moduleName: string, recordId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${moduleName}/${recordId}`, {
        headers: {,
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get ${moduleName}
      }
    record: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data?.[0]
    } catch (error) {
      this.logError('getRecord', error as Error)
      throw new Error(`Failed to get Zoho CRM ${moduleName},
    record: ${(error as Error).message}`)
    }

  async deleteRecord(moduleName: string, recordId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${moduleName}/${recordId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to delete ${moduleName}
      }
    record: ${response.statusText}`)
      }
    } catch (error) {
      this.logError('deleteRecord', error as Error)
      throw new Error(`Failed to delete Zoho CRM ${moduleName},
    record: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in zoho-crm.integration.ts:', error)
      throw error
    }
  async searchRecords(moduleName: string, criteria: string): Promise<unknown[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
        {
          headers: {,
            Authorization: `Zoho-oauthtoken ${this.accessToken}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to search ${moduleName}
      }
    records: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      this.logError('searchRecords', error as Error)
      throw new Error(
        `Failed to search Zoho CRM ${moduleName},
    records: ${(error as Error).message}`,
      )
    }

  async getRecords(
    moduleName: string
    options?: {
      page?: number
      perPage?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc',
      fields?: string[]
    },
  ): Promise<unknown[]> {
    try {
      let url = `${this.baseUrl}/${moduleName}?`

      if (_options?.page) url += `page=${options.page}&`
      if (_options?.perPage) url += `per_page=${options.perPage}&`
      if (_options?.sortBy) url += `sort_by=${options.sortBy}&`
      if (_options?.sortOrder) url += `sort_order=${options.sortOrder}&`
      if (_options?.fields) url += `fields=${options.fields.join(',')}&`

      const response = await fetch(url, {
        headers: {,
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get ${moduleName}
      }
    records: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      this.logError('getRecords', error as Error)
      throw new Error(`Failed to get Zoho CRM ${moduleName},
    records: ${(error as Error).message}`)
    }

  async convertLead(
    leadId: string,
    conversionData: {
      overwrite?: boolean
      notifyLeadOwner?: boolean
      notifyNewEntityOwner?: boolean
      accounts?: string
      contacts?: string
      deals?: {
        deal_name: string,
        closing_date: string
        stage: string
        amount?: number
      },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/Leads/${leadId}/actions/convert`, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: [conversionData] })
      })

      if (!response.ok) {
        throw new Error(`Failed to convert lead: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('convertLead', error as Error)
      throw new Error(`Failed to convert Zoho CRM lead: ${(error as Error).message}`)
    }

  async addNote(
    moduleName: string,
    recordId: string
    noteData: {,
      note_title: string
      note_content: string
    },
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${moduleName}/${recordId}/Notes`, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: [noteData] })
      })

      if (!response.ok) {
        throw new Error(`Failed to add note: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data?.[0]?.details?.id
    } catch (error) {
      this.logError('addNote', error as Error)
      throw new Error(`Failed to add Zoho CRM note: ${(error as Error).message}`)
    }

  async uploadAttachment(
    moduleName: string,
    recordId: string
    fileData: {,
      file: Buffer
      filename: string
    },
  ): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('file', new Blob([fileData.file]), fileData.filename)

      const response = await fetch(`${this.baseUrl}/${moduleName}/${recordId}/Attachments`, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to upload attachment: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data?.[0]?.details?.id
    } catch (error) {
      this.logError('uploadAttachment', error as Error)
      throw new Error(`Failed to upload Zoho CRM attachment: ${(error as Error).message}`)
    }

  async createTask(taskData: {,
    subject: string
    due_date?: string
    status?: string
    priority?: string
    what_id?: string
    who_id?: string,
    description?: string
  }): Promise<string> {
    try {
      return await this.createRecord('Tasks', taskData)
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create Zoho CRM task: ${(error as Error).message}`)
    }

  async createEvent(eventData: {,
    event_title: string
    start_datetime: string,
    end_datetime: string
    what_id?: string
    who_id?: string
    description?: string,
    location?: string
  }): Promise<string> {
    try {
      return await this.createRecord('Events', eventData)
    } catch (error) {
      this.logError('createEvent', error as Error)
      throw new Error(`Failed to create Zoho CRM _event: ${(error as Error).message}`)
    }

  async getModules(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/settings/modules`, {
        headers: {,
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get modules: ${response.statusText}`)
      }

      const data = await response.json()
      return data.modules || []
    } catch (error) {
      this.logError('getModules', error as Error)
      throw new Error(`Failed to get Zoho CRM modules: ${(error as Error).message}`)
    }

  async getFields(moduleName: string): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/settings/fields?module=${moduleName}`, {
        headers: {,
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get fields: ${response.statusText}`)
      }

      const data = await response.json()
      return data.fields || []
    } catch (error) {
      this.logError('getFields', error as Error)
      throw new Error(`Failed to get Zoho CRM fields: ${(error as Error).message}`)
    }

  async getUsers(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/users?type=AllUsers`, {
        headers: {,
          Authorization: `Zoho-oauthtoken ${this.accessToken}`
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
      throw new Error(`Failed to get Zoho CRM users: ${(error as Error).message}`)
    }

  async bulkCreate(moduleName: string, records: unknown[]): Promise<unknown[]> {
    try {
      // Zoho CRM allows up to 100 records per API call
      const results = []
      const chunkSize = 100
  }

      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize)
      }

        const response = await fetch(`${this.baseUrl}/${moduleName}`, {
          method: 'POST',
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: chunk })
        })

        if (!response.ok) {
          throw new Error(`Failed to bulk create ${moduleName}
        }
    records: ${response.statusText}`)
        }

        const data = await response.json()
        results.push(...(data.data || []))
      },

      return results
    } catch (error) {
      this.logError('bulkCreate', error as Error)
      throw new Error(
        `Failed to bulk create Zoho CRM ${moduleName},
    records: ${(error as Error).message}`,
      )
    }

  async bulkUpdate(moduleName: string, records: unknown[]): Promise<unknown[]> {
    try {
      // Zoho CRM allows up to 100 records per API call
      const results = []
      const chunkSize = 100
  }

      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize)
      }

        const response = await fetch(`${this.baseUrl}/${moduleName}`, {
          method: 'PUT',
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: chunk })
        })

        if (!response.ok) {
          throw new Error(`Failed to bulk update ${moduleName}
        }
    records: ${response.statusText}`)
        }

        const data = await response.json()
        results.push(...(data.data || []))
      },

      return results
    } catch (error) {
      this.logError('bulkUpdate', error as Error)
      throw new Error(
        `Failed to bulk update Zoho CRM ${moduleName},
    records: ${(error as Error).message}`,
      )
    }

}