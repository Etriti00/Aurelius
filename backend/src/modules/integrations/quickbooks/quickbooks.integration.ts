import axios, { AxiosInstance } from 'axios'
import rateLimit from 'axios-rate-limit'
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

export class QuickBooksIntegration extends BaseIntegration {
  readonly provider = 'quickbooks'
  readonly name = 'QuickBooks'
  readonly version = '1.0.0'

  private quickbooksClient: AxiosInstance
  private companyId: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Parse access token to get company ID and token
    const credentials = this.parseAccessToken(accessToken)
    this.companyId = credentials.companyId

    // Create rate-limited axios client for QuickBooks API
    this.quickbooksClient = rateLimit(
      axios.create({
        baseURL: `https://sandbox-quickbooks.api.intuit.com/v3/company/${this.companyId}`,
        headers: {,
          Authorization: `Bearer ${credentials.token}`,
          Accept: 'application/json'
          'Content-Type': 'application/json'
        }
      }),
      {
        maxRequests: 500, // QuickBooks rate limit: 500 requests per app per minute,
        perMilliseconds: 60000, // 1 minute
      },
    )
  }

  private parseAccessToken(token: string): { companyId: string; token: string } {
    try {
      // Token format: "companyId:token" (base64 encoded) or assume format
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      if (decoded.includes(':')) {
        const [companyId, tokenValue] = decoded.split(':')
        return { companyId, token: tokenValue } else {
        // Fallback: extract from config or assume default
        return { companyId: this.config?.companyId || '1', token: decoded } catch {
      // Fallback: assume token is already in correct format
      return { companyId: this.config?.companyId || '1', token }
      }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting company info
      await this.quickbooksClient.get('/companyinfo/1')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Will be set based on token response
        scope: ['com.intuit.quickbooks.accounting']
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

      const _response = await axios.post(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        {
          grant_type: 'refresh_token',
          refresh_token: this.refreshTokenValue
        },
        {
          headers: {,
            Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        },
      )

      return {
        success: true,
        accessToken: response.data.access_token
        refreshToken: response.data.refresh_token || this.refreshTokenValue,
        expiresAt: response.data.expires_in
          ? new Date(Date.now() + response.data.expires_in * 1000)
          : undefined,
        scope: response.data.scope?.split(' ') || ['com.intuit.quickbooks.accounting']
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      await axios.post(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke',
        { token: this.accessToken },
        {
          headers: {,
            Authorization: `Basic ${Buffer.from(`${this.config?.clientId}:${this.config?.clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        },
      ),
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.quickbooksClient.get('/companyinfo/1')
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.response?.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.response?.status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 500,
            remaining: 0
            resetTime: new Date(Date.now() + 60000), // 1 minute
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
        name: 'Customers',
        description: 'Manage customer information and profiles'
        enabled: true,
        requiredScopes: ['com.intuit.quickbooks.accounting']
      },
      {
        name: 'Vendors',
        description: 'Manage vendor information and relationships'
        enabled: true,
        requiredScopes: ['com.intuit.quickbooks.accounting']
      },
      {
        name: 'Items',
        description: 'Manage products and services'
        enabled: true,
        requiredScopes: ['com.intuit.quickbooks.accounting']
      },
      {
        name: 'Invoices',
        description: 'Create and manage invoices'
        enabled: true,
        requiredScopes: ['com.intuit.quickbooks.accounting']
      },
      {
        name: 'Bills',
        description: 'Manage bills and expenses'
        enabled: true,
        requiredScopes: ['com.intuit.quickbooks.accounting']
      },
      {
        name: 'Payments',
        description: 'Track payments and receipts'
        enabled: true,
        requiredScopes: ['com.intuit.quickbooks.accounting']
      },
      {
        name: 'Accounts',
        description: 'Manage chart of accounts'
        enabled: true,
        requiredScopes: ['com.intuit.quickbooks.accounting']
      },
      {
        name: 'Reports',
        description: 'Generate financial reports'
        enabled: true,
        requiredScopes: ['com.intuit.quickbooks.accounting']
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

      this.logInfo('syncData', 'Starting QuickBooks sync', { lastSyncTime })

      // Sync Customers
      try {
        const customersResult = await this.syncCustomers(lastSyncTime)
        totalProcessed += customersResult.processed,
        totalSkipped += customersResult.skipped
      }
    } catch (error) {
        errors.push(`Customers sync failed: ${(error as Error).message}`)
        this.logError('syncCustomers', error as Error)
      }

      catch (error) {
        console.error('Error in quickbooks.integration.ts:', error)
        throw error
      }
      // Sync Invoices
      try {
        const invoicesResult = await this.syncInvoices(lastSyncTime)
        totalProcessed += invoicesResult.processed,
        totalSkipped += invoicesResult.skipped
      } catch (error) {
        errors.push(`Invoices sync failed: ${(error as Error).message}`)
        this.logError('syncInvoices', error as Error)
      }

      // Sync Items
      try {
        const itemsResult = await this.syncItems(lastSyncTime)
        totalProcessed += itemsResult.processed,
        totalSkipped += itemsResult.skipped
      } catch (error) {
        errors.push(`Items sync failed: ${(error as Error).message}`)
        this.logError('syncItems', error as Error)
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
      throw new SyncError('QuickBooks sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing QuickBooks webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'Customer':
        case 'Vendor':
        case 'Item':
        case 'Invoice':
        case 'Bill':
        case 'Payment':
          await this.handleEntityWebhook(payload.data)
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
      console.error('Error in quickbooks.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // QuickBooks webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncCustomers(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let query = 'SELECT * FROM Customer'
      if (lastSyncTime) {
        query += ` WHERE MetaData.LastUpdatedTime > '${lastSyncTime.toISOString()}'`
      }

      const _response = await this.quickbooksClient.get(`/query?query=${encodeURIComponent(query)}`)
      const customers = response.data.QueryResponse?.Customer || []

      let processed = 0
      let skipped = 0

      for (const customer of customers) {
        try {
          await this.processCustomer(customer)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncCustomers', error as Error, { customerId: customer.Id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncCustomers', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in quickbooks.integration.ts:', error)
      throw error
    }
  private async syncInvoices(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let query = 'SELECT * FROM Invoice'
      if (lastSyncTime) {
        query += ` WHERE MetaData.LastUpdatedTime > '${lastSyncTime.toISOString()}'`
      }

      const _response = await this.quickbooksClient.get(`/query?query=${encodeURIComponent(query)}`)
      const invoices = response.data.QueryResponse?.Invoice || []

      let processed = 0
      let skipped = 0

      for (const invoice of invoices) {
        try {
          await this.processInvoice(invoice)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncInvoices', error as Error, { invoiceId: invoice.Id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncInvoices', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in quickbooks.integration.ts:', error)
      throw error
    }
  private async syncItems(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let query = 'SELECT * FROM Item'
      if (lastSyncTime) {
        query += ` WHERE MetaData.LastUpdatedTime > '${lastSyncTime.toISOString()}'`
      }

      const _response = await this.quickbooksClient.get(`/query?query=${encodeURIComponent(query)}`)
      const items = response.data.QueryResponse?.Item || []

      let processed = 0
      let skipped = 0

      for (const item of items) {
        try {
          await this.processItem(item)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncItems', error as Error, { itemId: item.Id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncItems', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in quickbooks.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processCustomer(customer: unknown): Promise<void> {
    this.logInfo('processCustomer', `Processing customer: ${customer.Id}`)
  }

  private async processInvoice(invoice: unknown): Promise<void> {
    this.logInfo('processInvoice', `Processing invoice: ${invoice.Id}`)
  }

  private async processItem(item: unknown): Promise<void> {
    this.logInfo('processItem', `Processing item: ${item.Id}`)
  }

  // Private webhook handlers
  private async handleEntityWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleEntityWebhook', 'Processing entity webhook', data)
  }

  // Public API methods
  async createCustomer(customerData: unknown): Promise<string> {
    try {
      const _response = await this.quickbooksClient.post('/customer', customerData)
      return (response as Response).data.QueryResponse.Customer[0].Id
    } catch (error) {
      this.logError('createCustomer', error as Error)
      throw new Error(`Failed to create QuickBooks customer: ${(error as Error).message}`)
    }

  async updateCustomer(customerId: string, customerData: unknown): Promise<void> {
    try {
      await this.quickbooksClient.post('/customer', { ...customerData, Id: customerId })
    } catch (error) {
      this.logError('updateCustomer', error as Error)
      throw new Error(`Failed to update QuickBooks customer: ${(error as Error).message}`)
    }

  async getCustomer(customerId: string): Promise<ApiResponse> {
    try {
      const _response = await this.quickbooksClient.get(`/customer/${customerId}`)
      return (response as Response).data.QueryResponse.Customer[0]
    } catch (error) {
      this.logError('getCustomer', error as Error)
      throw new Error(`Failed to get QuickBooks customer: ${(error as Error).message}`)
    }

  async createInvoice(invoiceData: unknown): Promise<string> {
    try {
      const _response = await this.quickbooksClient.post('/invoice', invoiceData)
      return (response as Response).data.QueryResponse.Invoice[0].Id
    } catch (error) {
      this.logError('createInvoice', error as Error)
      throw new Error(`Failed to create QuickBooks invoice: ${(error as Error).message}`)
    }

  async updateInvoice(invoiceId: string, invoiceData: unknown): Promise<void> {
    try {
      await this.quickbooksClient.post('/invoice', { ...invoiceData, Id: invoiceId })
    } catch (error) {
      this.logError('updateInvoice', error as Error)
      throw new Error(`Failed to update QuickBooks invoice: ${(error as Error).message}`)
    }

  async getInvoice(invoiceId: string): Promise<ApiResponse> {
    try {
      const _response = await this.quickbooksClient.get(`/invoice/${invoiceId}`)
      return (response as Response).data.QueryResponse.Invoice[0]
    } catch (error) {
      this.logError('getInvoice', error as Error)
      throw new Error(`Failed to get QuickBooks invoice: ${(error as Error).message}`)
    }

  async createItem(itemData: unknown): Promise<string> {
    try {
      const _response = await this.quickbooksClient.post('/item', itemData)
      return (response as Response).data.QueryResponse.Item[0].Id
    } catch (error) {
      this.logError('createItem', error as Error)
      throw new Error(`Failed to create QuickBooks item: ${(error as Error).message}`)
    }

  async createBill(billData: unknown): Promise<string> {
    try {
      const _response = await this.quickbooksClient.post('/bill', billData)
      return (response as Response).data.QueryResponse.Bill[0].Id
    } catch (error) {
      this.logError('createBill', error as Error)
      throw new Error(`Failed to create QuickBooks bill: ${(error as Error).message}`)
    }

  async createPayment(paymentData: unknown): Promise<string> {
    try {
      const _response = await this.quickbooksClient.post('/payment', paymentData)
      return (response as Response).data.QueryResponse.Payment[0].Id
    } catch (error) {
      this.logError('createPayment', error as Error)
      throw new Error(`Failed to create QuickBooks payment: ${(error as Error).message}`)
    }

  async getCompanyInfo(): Promise<ApiResponse> {
    try {
      const _response = await this.quickbooksClient.get('/companyinfo/1')
      return (response as Response).data.QueryResponse.CompanyInfo[0]
    } catch (error) {
      this.logError('getCompanyInfo', error as Error)
      throw new Error(`Failed to get QuickBooks company info: ${(error as Error).message}`)
    }

  async getAccounts(): Promise<unknown[]> {
    try {
      const _response = await this.quickbooksClient.get('/query?query=SELECT * FROM Account')
      return (response as Response).data.QueryResponse?.Account || []
    } catch (error) {
      this.logError('getAccounts', error as Error)
      throw new Error(`Failed to get QuickBooks accounts: ${(error as Error).message}`)
    }

  async getVendors(): Promise<unknown[]> {
    try {
      const _response = await this.quickbooksClient.get('/query?query=SELECT * FROM Vendor')
      return (response as Response).data.QueryResponse?.Vendor || []
    } catch (error) {
      this.logError('getVendors', error as Error)
      throw new Error(`Failed to get QuickBooks vendors: ${(error as Error).message}`)
    }

  async runReport(reportType: string, _options?: unknown): Promise<ApiResponse> {
    try {
      const params = new URLSearchParams(_options || {})
      const _response = await this.quickbooksClient.get(
        `/reports/${reportType}?${params.toString()}`,
      )
      return (response as Response).data
    } catch (error) {
      this.logError('runReport', error as Error)
      throw new Error(`Failed to run QuickBooks report: ${(error as Error).message}`)
    }

  async searchEntities(entityType: string, searchTerm: string): Promise<unknown[]> {
    try {
      const query = `SELECT * FROM ${entityType} WHERE Name LIKE '%${searchTerm}%'`
      const _response = await this.quickbooksClient.get(`/query?query=${encodeURIComponent(query)}`)
      return (response as Response).data.QueryResponse?.[entityType] || []
    } catch (error) {
      this.logError('searchEntities', error as Error)
      throw new Error(`Failed to search QuickBooks entities: ${(error as Error).message}`)
    }

}