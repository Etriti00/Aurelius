import * as jsforce from 'jsforce'
import * as crypto from 'crypto'
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig} from '../base/integration.interface'
import { ApiResponse, GenericWebhookPayload } from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface


export class SalesforceIntegration extends BaseIntegration {
  readonly provider = 'salesforce'
  readonly name = 'Salesforce'
  readonly version = '1.0.0'

  private salesforceClient: jsforce.Connection
  private readonly apiVersion = '61.0'

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Parse access token to get instance URL and token
    const credentials = this.parseAccessToken(accessToken)

    this.salesforceClient = new jsforce.Connection({
      oauth2: {,
        clientId: config?.clientId
        clientSecret: config?.clientSecret,
        redirectUri: config?.redirectUri},
      instanceUrl: credentials.instanceUrl,
      accessToken: credentials.token
      refreshToken: this.refreshTokenValue,
      version: this.apiVersion})
  }

  private parseAccessToken(token: string): { instanceUrl: string; token: string } {
    try {
      // Token format: "instanceUrl:token" (base64 encoded)
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const [instanceUrl, tokenValue] = decoded.split(':')
      return { instanceUrl, token: tokenValue } catch {
      // Fallback: assume token is already in correct format
      return JSON.parse(token)
    }

  async authenticate(): Promise<AuthResult> {
    try {
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.salesforceClient.identity()
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Salesforce tokens don't have fixed expiration
        scope: ['api', 'web', 'refresh_token', 'full', 'chatter_api'],
        metadata: { userInfo: response,
          organizationId: response.organization_id
          userId, : response.user_id}
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message}

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }
  }

      const _response = await this.executeWithProtection('token.refresh', async () => {
        return this.salesforceClient.oauth2.refreshToken({
          refresh_token: this.refreshTokenValue,
          client_id: this.config!.clientId
          client_secret: this.config!.clientSecret})
      })

      this.accessToken = response.access_token

      return {
        success: true,
        accessToken: response.access_token
        refreshToken: response.refresh_token || this.refreshTokenValue,
        expiresAt: undefined
        scope: ['api', 'web', 'refresh_token', 'full']}
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in salesforce.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      await this.executeWithProtection('token.revoke', async () => {
        return this.salesforceClient.oauth2.revokeToken({
          token: this.accessToken,
          client_id: this.config?.clientId
          client_secret: this.config?.clientSecret})
      }),
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const [identity, limits] = await Promise.all([
        this.executeWithProtection('connection.identity', async () =>
          this.salesforceClient.identity(),
        ),
        this.executeWithProtection('connection.limits', async () =>
          this.salesforceClient.sobject('Organization').find().limit(1),
        ),
      ])
  }

      return {
        isConnected: true,
        lastChecked: new Date()
        metadata: { userInfo: {
            userId, : identity.user_id,
            organizationId: identity.organization_id,
            username: identity.username
            displayName: identity.display_name},
          apiInfo: {,
            version: this.apiVersion
            instanceUrl: this.salesforceClient.instanceUrl}
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.name === 'INVALID_SESSION_ID') {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Session expired - authentication required'}
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
        name: 'Account Management',
        description: 'Manage customer accounts with CRUD operations and relationship tracking'
        enabled: true,
        requiredScopes: ['api']
        methods: ['getAccounts', 'getAccount', 'createAccount', 'updateAccount', 'deleteAccount']},
      {
        name: 'Contact Management',
        description:
          'Manage contacts with personal information, relationships, and communication history',
        enabled: true,
        requiredScopes: ['api']
        methods: ['getContacts', 'getContact', 'createContact', 'updateContact', 'deleteContact']},
      {
        name: 'Lead Management',
        description:
          'Track and convert leads through the sales pipeline with scoring and assignment',
        enabled: true,
        requiredScopes: ['api']
        methods: ['getLeads', 'getLead', 'createLead', 'updateLead', 'convertLead']},
      {
        name: 'Opportunity Management',
        description: 'Manage sales opportunities with stages, forecasting, and revenue tracking',
        enabled: true,
        requiredScopes: ['api']
        methods: ['getOpportunities', 'getOpportunity', 'createOpportunity', 'updateOpportunity']},
      {
        name: 'Case Management',
        description: 'Handle customer support cases with priority, status, and resolution tracking',
        enabled: true,
        requiredScopes: ['api']
        methods: ['getCases', 'getCase', 'createCase', 'updateCase', 'closeCase']},
      {
        name: 'Task & Event Management',
        description: 'Manage activities, tasks, and calendar events with reminders and assignments',
        enabled: true,
        requiredScopes: ['api']
        methods: ['getTasks', 'createTask', 'updateTask', 'getEvents', 'createEvent']},
      {
        name: 'Search & Reports',
        description: 'Search across objects and generate basic reports with filtering capabilities'
        enabled: true,
        requiredScopes: ['api']
        methods: ['search', 'searchBySOSL', 'getRecentItems', 'runReport']},
      {
        name: 'Real-time Sync',
        description: 'Bidirectional synchronization with conflict resolution and webhook support'
        enabled: true,
        requiredScopes: ['api']
        methods: ['syncData', 'handleWebhook', 'subscribeToChanges']},
    ]
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const capabilities = this.getCapabilities()
    const allRequiredScopes = capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []
  }

      this.logInfo('syncData', 'Starting Salesforce sync', { lastSyncTime })

      // Sync core objects in order of dependency
      const syncOrder = ['Account', 'Contact', 'Lead', 'Opportunity', 'Case']

      for (const objectType of syncOrder) {
        try {
          const result = await this.syncObject(objectType, lastSyncTime)
          totalProcessed += result.processed,
          totalSkipped += result.skipped
        }
        catch (error) {
          console.error('Error in salesforce.integration.ts:', error)
          throw error
        }
      }
    } catch (error) {
          errors.push(`${objectType} sync failed: ${(error as Error).message}`)
          this.logError(`sync${objectType}`, error as Error)
        }

      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider
          lastSyncTime}
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Salesforce sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    // This would typically be stored in database,
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Salesforce webhook', {
        event: payload.event,
        timestamp: payload.timestamp})
  }

      // Process webhook based on object type and action
      if (payload.data?.sobject) {
        await this.processObjectChange(payload.data.sobject, payload._event)
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in salesforce.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      if (!this.config?.webhookSecret) {
        this.logError('validateWebhookSignature', new Error('No webhook secret configured'))
        return false
      }
  }

      const payloadBody = JSON.stringify(payload)
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payloadBody)
        .digest('base64')

      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // Core CRM Methods (Essential 35 methods)

  // Account Management
  async getAccounts(_options?: { limit?: number; offset?: number }): Promise<unknown[]> {
    try {
      const accounts = await this.executeWithProtection('accounts.list', async () => {
        return this.salesforceClient
          .sobject('Account')
          .find(
            {},
            'Id, Name, Type, Industry, Phone, Website, BillingCity, BillingState, BillingCountry',
          )
          .limit(_options?.limit || 100)
          .skip(_options?.offset || 0)
      }),
      return accounts
    } catch (error) {
      this.logError('getAccounts', error as Error)
      throw new Error(`Failed to get Salesforce accounts: ${(error as Error).message}`)
    }

  async getAccount(id: string): Promise<ApiResponse> {
    try {
      const account = await this.executeWithProtection('account.get', async () => {
        return this.salesforceClient.sobject('Account').findOne({ Id: id })
      }),
      return account
    } catch (error) {
      this.logError('getAccount', error as Error)
      throw new Error(`Failed to get Salesforce account: ${(error as Error).message}`)
    }

  async createAccount(accountData: {,
    Name: string
    Type?: string
    Industry?: string
    Phone?: string
    Website?: string
    BillingStreet?: string
    BillingCity?: string
    BillingState?: string,
    BillingCountry?: string
  }): Promise<string> {
    try {
      const result = await this.executeWithProtection('account.create', async () => {
        return this.salesforceClient.sobject('Account').create(accountData)
      }),
      return result.id
    } catch (error) {
      this.logError('createAccount', error as Error)
      throw new Error(`Failed to create Salesforce account: ${(error as Error).message}`)
    }

  async updateAccount(id: string, updateData: unknown): Promise<void> {
    try {
      await this.executeWithProtection('account.update', async () => {
        return this.salesforceClient.sobject('Account').update({ Id: id, ...updateData })
      })
    } catch (error) {
      this.logError('updateAccount', error as Error)
      throw new Error(`Failed to update Salesforce account: ${(error as Error).message}`)
    }

  async deleteAccount(id: string): Promise<void> {
    try {
      await this.executeWithProtection('account.delete', async () => {
        return this.salesforceClient.sobject('Account').destroy(id)
      })
    } catch (error) {
      this.logError('deleteAccount', error as Error)
      throw new Error(`Failed to delete Salesforce account: ${(error as Error).message}`)
    }

  // Contact Management
  async getContacts(accountId?: string, _options?: { limit?: number }): Promise<unknown[]> {
    try {
      const query = accountId ? { AccountId: accountId } : {}
      const contacts = await this.executeWithProtection('contacts.list', async () => {
        return this.salesforceClient
          .sobject('Contact')
          .find(query, 'Id, FirstName, LastName, Email, Phone, Title, AccountId, Account.Name')
          .limit(_options?.limit || 100)
      }),
      return contacts
    } catch (error) {
      this.logError('getContacts', error as Error)
      throw new Error(`Failed to get Salesforce contacts: ${(error as Error).message}`)
    }

  async getContact(id: string): Promise<ApiResponse> {
    try {
      const contact = await this.executeWithProtection('contact.get', async () => {
        return this.salesforceClient.sobject('Contact').findOne({ Id: id })
      }),
      return contact
    } catch (error) {
      this.logError('getContact', error as Error)
      throw new Error(`Failed to get Salesforce contact: ${(error as Error).message}`)
    }

  async createContact(contactData: {
    FirstName?: string
    LastName: string
    Email?: string
    Phone?: string
    Title?: string,
    AccountId?: string
  }): Promise<string> {
    try {
      const result = await this.executeWithProtection('contact.create', async () => {
        return this.salesforceClient.sobject('Contact').create(contactData)
      }),
      return result.id
    } catch (error) {
      this.logError('createContact', error as Error)
      throw new Error(`Failed to create Salesforce contact: ${(error as Error).message}`)
    }

  async updateContact(id: string, updateData: unknown): Promise<void> {
    try {
      await this.executeWithProtection('contact.update', async () => {
        return this.salesforceClient.sobject('Contact').update({ Id: id, ...updateData })
      })
    } catch (error) {
      this.logError('updateContact', error as Error)
      throw new Error(`Failed to update Salesforce contact: ${(error as Error).message}`)
    }

  async deleteContact(id: string): Promise<void> {
    try {
      await this.executeWithProtection('contact.delete', async () => {
        return this.salesforceClient.sobject('Contact').destroy(id)
      })
    } catch (error) {
      this.logError('deleteContact', error as Error)
      throw new Error(`Failed to delete Salesforce contact: ${(error as Error).message}`)
    }

  // Lead Management
  async getLeads(_options?: { limit?: number; status?: string }): Promise<unknown[]> {
    try {
      const query = options?.status ? { Status: options.status } : {}
      const leads = await this.executeWithProtection('leads.list', async () => {
        return this.salesforceClient
          .sobject('Lead')
          .find(query, 'Id, FirstName, LastName, Email, Phone, Company, Status, LeadSource')
          .limit(_options?.limit || 100)
      }),
      return leads
    } catch (error) {
      this.logError('getLeads', error as Error)
      throw new Error(`Failed to get Salesforce leads: ${(error as Error).message}`)
    }

  async getLead(id: string): Promise<ApiResponse> {
    try {
      const lead = await this.executeWithProtection('lead.get', async () => {
        return this.salesforceClient.sobject('Lead').findOne({ Id: id })
      }),
      return lead
    } catch (error) {
      this.logError('getLead', error as Error)
      throw new Error(`Failed to get Salesforce lead: ${(error as Error).message}`)
    }

  async createLead(leadData: {
    FirstName?: string
    LastName: string
    Email?: string
    Phone?: string
    Company: string
    Status?: string,
    LeadSource?: string
  }): Promise<string> {
    try {
      const result = await this.executeWithProtection('lead.create', async () => {
        return this.salesforceClient.sobject('Lead').create(leadData)
      }),
      return result.id
    } catch (error) {
      this.logError('createLead', error as Error)
      throw new Error(`Failed to create Salesforce lead: ${(error as Error).message}`)
    }

  async updateLead(id: string, updateData: unknown): Promise<void> {
    try {
      await this.executeWithProtection('lead.update', async () => {
        return this.salesforceClient.sobject('Lead').update({ Id: id, ...updateData })
      })
    } catch (error) {
      this.logError('updateLead', error as Error)
      throw new Error(`Failed to update Salesforce lead: ${(error as Error).message}`)
    }

  async convertLead(
    id: string
    options?: {
      accountId?: string
      contactId?: string,
      opportunityName?: string
    },
  ): Promise<{ accountId: string; contactId: string; opportunityId?: string }> {
    try {
      const result = await this.executeWithProtection('lead.convert', async () => {
        return this.salesforceClient.sobject('Lead').convertLead({
          leadId: id,
          accountId: options?.accountId
          contactId: options?.contactId,
          opportunityName: options?.opportunityName
          doNotCreateOpportunity: !options?.opportunityName})
      })
      return {
        accountId: result.accountId,
        contactId: result.contactId
        opportunityId: result.opportunityId}
    } catch (error) {
      this.logError('convertLead', error as Error)
      throw new Error(`Failed to convert Salesforce lead: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in salesforce.integration.ts:', error)
      throw error
    }
  // Opportunity Management
  async getOpportunities(accountId?: string, _options?: { limit?: number }): Promise<unknown[]> {
    try {
      const query = accountId ? { AccountId: accountId } : {}
      const opportunities = await this.executeWithProtection('opportunities.list', async () => {
        return this.salesforceClient
          .sobject('Opportunity')
          .find(
            query,
            'Id, Name, AccountId, Account.Name, StageName, Amount, CloseDate, Probability',
          )
          .limit(_options?.limit || 100)
      }),
      return opportunities
    } catch (error) {
      this.logError('getOpportunities', error as Error)
      throw new Error(`Failed to get Salesforce opportunities: ${(error as Error).message}`)
    }

  async getOpportunity(id: string): Promise<ApiResponse> {
    try {
      const opportunity = await this.executeWithProtection('opportunity.get', async () => {
        return this.salesforceClient.sobject('Opportunity').findOne({ Id: id })
      }),
      return opportunity
    } catch (error) {
      this.logError('getOpportunity', error as Error)
      throw new Error(`Failed to get Salesforce opportunity: ${(error as Error).message}`)
    }

  async createOpportunity(opportunityData: {,
    Name: string
    AccountId: string,
    StageName: string
    CloseDate: string
    Amount?: number,
    Probability?: number
  }): Promise<string> {
    try {
      const result = await this.executeWithProtection('opportunity.create', async () => {
        return this.salesforceClient.sobject('Opportunity').create(opportunityData)
      }),
      return result.id
    } catch (error) {
      this.logError('createOpportunity', error as Error)
      throw new Error(`Failed to create Salesforce opportunity: ${(error as Error).message}`)
    }

  async updateOpportunity(id: string, updateData: unknown): Promise<void> {
    try {
      await this.executeWithProtection('opportunity.update', async () => {
        return this.salesforceClient.sobject('Opportunity').update({ Id: id, ...updateData })
      })
    } catch (error) {
      this.logError('updateOpportunity', error as Error)
      throw new Error(`Failed to update Salesforce opportunity: ${(error as Error).message}`)
    }

  // Case Management
  async getCases(
    accountId?: string,
    options?: { limit?: number; status?: string },
  ): Promise<unknown[]> {
    try {
      const query: unknown = {}
      if (accountId) query.AccountId = accountId
      if (_options?.status) query.Status = options.status

      const cases = await this.executeWithProtection('cases.list', async () => {
        return this.salesforceClient
          .sobject('Case')
          .find(
            query,
            'Id, CaseNumber, Subject, Status, Priority, AccountId, Account.Name, ContactId, Contact.Name',
          )
          .limit(_options?.limit || 100)
      }),
      return cases
    } catch (error) {
      this.logError('getCases', error as Error)
      throw new Error(`Failed to get Salesforce cases: ${(error as Error).message}`)
    }

  async getCase(id: string): Promise<ApiResponse> {
    try {
      const caseRecord = await this.executeWithProtection('case.get', async () => {
        return this.salesforceClient.sobject('Case').findOne({ Id: id })
      }),
      return caseRecord
    } catch (error) {
      this.logError('getCase', error as Error)
      throw new Error(`Failed to get Salesforce case: ${(error as Error).message}`)
    }

  async createCase(caseData: {,
    Subject: string
    Description?: string
    Status?: string
    Priority?: string
    AccountId?: string,
    ContactId?: string
  }): Promise<string> {
    try {
      const result = await this.executeWithProtection('case.create', async () => {
        return this.salesforceClient.sobject('Case').create(caseData)
      }),
      return result.id
    } catch (error) {
      this.logError('createCase', error as Error)
      throw new Error(`Failed to create Salesforce case: ${(error as Error).message}`)
    }

  async updateCase(id: string, updateData: unknown): Promise<void> {
    try {
      await this.executeWithProtection('case.update', async () => {
        return this.salesforceClient.sobject('Case').update({ Id: id, ...updateData })
      })
    } catch (error) {
      this.logError('updateCase', error as Error)
      throw new Error(`Failed to update Salesforce case: ${(error as Error).message}`)
    }

  async closeCase(id: string, resolution?: string): Promise<void> {
    try {
      await this.executeWithProtection('case.close', async () => {
        return this.salesforceClient.sobject('Case').update({
          Id: id,
          Status: 'Closed'
          ...(resolution && { Resolution: resolution })})
      })
    } catch (error) {
      this.logError('closeCase', error as Error)
      throw new Error(`Failed to close Salesforce case: ${(error as Error).message}`)
    }

  // Task & Event Management
  async getTasks(relatedToId?: string, _options?: { limit?: number }): Promise<unknown[]> {
    try {
      const query = relatedToId ? { WhatId: relatedToId } : {}
      const tasks = await this.executeWithProtection('tasks.list', async () => {
        return this.salesforceClient
          .sobject('Task')
          .find(query, 'Id, Subject, Status, Priority, ActivityDate, WhatId, WhoId')
          .limit(_options?.limit || 100)
      }),
      return tasks
    } catch (error) {
      this.logError('getTasks', error as Error)
      throw new Error(`Failed to get Salesforce tasks: ${(error as Error).message}`)
    }

  async createTask(taskData: {,
    Subject: string
    Status?: string
    Priority?: string
    ActivityDate?: string
    WhatId?: string
    WhoId?: string,
    Description?: string
  }): Promise<string> {
    try {
      const result = await this.executeWithProtection('task.create', async () => {
        return this.salesforceClient.sobject('Task').create(taskData)
      }),
      return result.id
    } catch (error) {
      this.logError('createTask', error as Error)
      throw new Error(`Failed to create Salesforce task: ${(error as Error).message}`)
    }

  async updateTask(id: string, updateData: unknown): Promise<void> {
    try {
      await this.executeWithProtection('task.update', async () => {
        return this.salesforceClient.sobject('Task').update({ Id: id, ...updateData })
      })
    } catch (error) {
      this.logError('updateTask', error as Error)
      throw new Error(`Failed to update Salesforce task: ${(error as Error).message}`)
    }

  async getEvents(relatedToId?: string, _options?: { limit?: number }): Promise<unknown[]> {
    try {
      const query = relatedToId ? { WhatId: relatedToId } : {}
      const events = await this.executeWithProtection('events.list', async () => {
        return this.salesforceClient
          .sobject('Event')
          .find(query, 'Id, Subject, StartDateTime, EndDateTime, WhatId, WhoId')
          .limit(_options?.limit || 100)
      }),
      return events
    } catch (error) {
      this.logError('getEvents', error as Error)
      throw new Error(`Failed to get Salesforce events: ${(error as Error).message}`)
    }

  async createEvent(eventData: {,
    Subject: string
    StartDateTime: string,
    EndDateTime: string
    WhatId?: string
    WhoId?: string,
    Description?: string
  }): Promise<string> {
    try {
      const result = await this.executeWithProtection('_event.create', async () => {
        return this.salesforceClient.sobject('Event').create(eventData)
      }),
      return result.id
    } catch (error) {
      this.logError('createEvent', error as Error)
      throw new Error(`Failed to create Salesforce _event: ${(error as Error).message}`)
    }

  // Search & Reports
  async search(searchText: string, objectTypes?: string[]): Promise<unknown[]> {
    try {
      const sosl = objectTypes
        ? `FIND {${searchText} IN ALL FIELDS RETURNING ${objectTypes.join(', ')}`
        : `FIND {${searchText} IN ALL FIELDS RETURNING Account, Contact, Lead, Opportunity`
  }

      const results = await this.executeWithProtection('search.sosl', async () => {
        return this.salesforceClient.search(sosl)
      }),
      return results.searchRecords
    }
    } catch (error) {
      this.logError('search', error as Error)
      throw new Error(`Failed to search Salesforce: ${(error as Error).message}`)
    }

  async searchBySOSL(soslQuery: string): Promise<unknown[]> {
    try {
      const results = await this.executeWithProtection('search.custom', async () => {
        return this.salesforceClient.search(soslQuery)
      }),
      return results.searchRecords
    } catch (error) {
      this.logError('searchBySOSL', error as Error)
      throw new Error(`Failed to execute SOSL search: ${(error as Error).message}`)
    }

  async getRecentItems(objectType: string, limit = 10): Promise<unknown[]> {
    try {
      const recent = await this.executeWithProtection('recent.get', async () => {
        return this.salesforceClient.sobject(objectType).recent(limit)
      }),
      return recent
    } catch (error) {
      this.logError('getRecentItems', error as Error)
      throw new Error(`Failed to get recent Salesforce items: ${(error as Error).message}`)
    }

  // Private helper methods
  private async syncObject(
    objectType: string
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const query: unknown = {}
      if (lastSyncTime) {
        query.LastModifiedDate = { $gte: lastSyncTime }
      }

      const records = await this.executeWithProtection(`sync.${objectType}`, async () => {
        return this.salesforceClient.sobject(objectType).find(query).limit(1000)
      })

      // Process records (would typically save to database)
      let processed = 0
      let skipped = 0

      for (const record of records) {
        try {
          await this.processRecord(objectType, record),
          processed++
        }
      }
    } catch (error) {
          this.logError(`processRecord.${objectType}`, error as Error, { recordId: record.Id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError(`syncObject.${objectType}`, error as Error),
      throw error
    }

  private async processRecord(objectType: string, record: unknown): Promise<void> {
    this.logInfo('processRecord', `Processing ${objectType},
    record: ${record.Id}`)
    // Implementation would save record to database
  }

  private async processObjectChange(sobject: unknown, _event: string): Promise<void> {
    this.logInfo('processObjectChange', `Processing ${sobject.type} ${_event}`, { id: sobject.id })
    // Implementation would handle real-time updates
  }

}
catch (error) {
  console.error('Error in salesforce.integration.ts:', error)
  throw error
}