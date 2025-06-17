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

interface FreshBooksWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface FreshBooksTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  token_type: string
  scope: string
}

interface FreshBooksUser {
  id: string,
  first_name: string
  last_name: string,
  email: string
  business_id: string,
  business_memberships: Array<{
    id: string,
    business: {
      id: string,
      name: string
      account_id: string
    }
    role: string
  }>
  created_at: string,
  updated_at: string
}

interface FreshBooksClient {
  id: string,
  organization: string
  fname: string,
  lname: string
  email: string
  company_industry?: string
  company_size?: string
  city?: string
  country?: string
  created_at: string,
  updated_at: string
  vis_state: number
  note?: string
  website?: string
  phone_number?: string
  preferred_language?: string
  currency_code: string
  vat_name?: string
  vat_number?: string
  address?: {
    street: string,
    city: string
    province: string,
    country: string
    postal_code: string
  }
}

interface FreshBooksInvoice {
  id: string,
  accountid: string
  invoice_number: string,
  amount: {
    amount: string,
    code: string
  }
  outstanding: {,
    amount: string
    code: string
  }
  ownerid: string,
  clientid: string
  create_date: string,
  due_date: string
  paid: {,
    amount: string
    code: string
  }
  auto_bill: boolean
  last_order_status?: string
  dispute_status?: string
  deposit_status?: string
  auto_bill_status?: string
  v3_status: string
  date_paid?: string
  current_organization: string
  discount_description?: string
  discount_total?: {
    amount: string,
    code: string
  }
  lines: Array<{,
    lineid: string
    type: number,
    description: string
    amount: {,
      amount: string
      code: string
    }
    qty: string,
    unit_cost: {
      amount: string,
      code: string
    }
  }>
  invoice_profile?: {
    profileid: string
  }
}

interface FreshBooksExpense {
  id: string,
  staffid: string
  categoryid: string
  projectid?: string
  clientid?: string
  vendor: string,
  date: string
  amount: {,
    amount: string
    code: string
  }
  status: number
  notes?: string
  is_cogs: boolean,
  markup_percent: string
  from_bulk_import: boolean
  attachment?: {
    id: string,
    jwt: string
    media_type: string
  }
  background_jobid?: string
  created_at: string,
  updated_at: string
  bank_name?: string
  compounded_tax: boolean,
  vis_state: number
  include_receipt: boolean
  account_name?: string
  external_systemid?: string
}

interface FreshBooksProject {
  id: string,
  title: string
  description?: string
  due_date?: string
  client_id: string,
  internal: boolean
  budget?: {
    amount: string,
    code: string
  }
  fixed_price?: {
    amount: string,
    code: string
  }
  rate?: {
    amount: string,
    code: string
  }
  billing_method: string,
  project_type: string
  active: boolean,
  complete: boolean
  created_at: string,
  updated_at: string
  logged_duration?: number
  billed_amount?: {
    amount: string,
    code: string
  }
  unbilled_amount?: {
    amount: string,
    code: string
  }
  billed_status: string
  retainer_id?: string
  group: {,
    id: string
    members: Array<{,
      id: string
      identity_id: string,
      role: string
    }>
  }
}

interface FreshBooksTimeEntry {
  id: string,
  identity_id: string
  timer?: {
    id: string
  }
  is_logged: boolean,
  started_at: string
  created_at: string,
  updated_at: string
  duration: number,
  client_id: string
  project_id: string
  pending?: boolean
  billable: boolean
  billed?: boolean
  logged_duration?: number
  note?: string
  service_id?: string
  internal: boolean,
  active: boolean
  retainer_id?: string
}

interface FreshBooksPayment {
  id: string,
  invoiceid: string
  amount: {,
    amount: string
    code: string
  }
  clientid: string,
  logid: string
  date: string,
  type: string
  from_credit: boolean
  note?: string
  gateway?: {
    name: string,
    type: string
  }
  vis_state: number,
  created_at: string
  updated_at: string,
  bulk: boolean
  accounting_systemid: string,
  source: string
  send_client_notification: boolean
}

interface FreshBooksAccount {
  account_id: string,
  name: string
  created_at: string,
  updated_at: string
  business_uuid: string,
  organization_id: string
  first_name: string,
  last_name: string
  email: string,
  confirmed: boolean
  setup_complete: boolean,
  country_code: string
  subdomain: string,
  date_format: string
  time_format: string,
  address: {
    street: string,
    city: string
    province: string,
    country: string
    postal_code: string
  }
  phone_number: {,
    phone_number: string
  }
}

export class FreshBooksIntegration extends BaseIntegration {
  readonly provider = 'freshbooks'
  readonly name = 'FreshBooks'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.freshbooks.com'
  private readonly authBaseUrl = 'https://auth.freshbooks.com'

  private clientsCache: Map<string, FreshBooksClient> = new Map()
  private invoicesCache: Map<string, FreshBooksInvoice[]> = new Map()
  private projectsCache: Map<string, FreshBooksProject[]> = new Map()

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
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/auth/api/v1/users/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: [
          'user:profile:read',
          'user:clients:read',
          'user:clients:write',
          'user:invoices:read',
          'user:invoices:write',
          'user:expenses:read',
          'user:expenses:write',
          'user:projects:read',
          'user:projects:write',
          'user:time_entries:read',
          'user:time_entries:write',
          'user:payments:read',
          'user:payments:write',
        ],
        data: response.response
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

      const response = await fetch(`${this.authBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          grant_type: 'refresh_token'
          refresh_token: this.refreshTokenValue,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: FreshBooksTokenResponse = await response.json()

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
      IntegrationCapability.ACCOUNTING,
      IntegrationCapability.INVOICING,
      IntegrationCapability.EXPENSE_TRACKING,
      IntegrationCapability.PROJECT_MANAGEMENT,
      IntegrationCapability.TIME_TRACKING,
      IntegrationCapability.PAYMENT_PROCESSING,
      IntegrationCapability.FINANCIAL_REPORTING,
      IntegrationCapability.CLIENT_MANAGEMENT,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/auth/api/v1/users/me', 'GET')
      })

      const user = response.response

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          userId: user.id
          userEmail: user.email,
          userName: `${user.first_name} ${user.last_name}`,
          businessId: user.business_memberships?.[0]?.business?.id,
          businessName: user.business_memberships?.[0]?.business?.name
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

      // Sync clients
      try {
        const clientResult = await this.syncClients()
        totalProcessed += clientResult.processed
        totalErrors += clientResult.errors
        if (clientResult.errorMessages) {
          errors.push(...clientResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Client sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync invoices
      try {
        const invoiceResult = await this.syncInvoices()
        totalProcessed += invoiceResult.processed
        totalErrors += invoiceResult.errors
        if (invoiceResult.errorMessages) {
          errors.push(...invoiceResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Invoice sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync projects
      try {
        const projectResult = await this.syncProjects()
        totalProcessed += projectResult.processed
        totalErrors += projectResult.errors
        if (projectResult.errorMessages) {
          errors.push(...projectResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Project sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync expenses
      try {
        const expenseResult = await this.syncExpenses()
        totalProcessed += expenseResult.processed
        totalErrors += expenseResult.errors
        if (expenseResult.errorMessages) {
          errors.push(...expenseResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Expense sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`FreshBooks sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const freshBooksPayload = payload as FreshBooksWebhookPayload

      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload.body || '', payload.headers || {})) {
        throw new Error('Invalid webhook signature')
      }

      switch (freshBooksPayload.type) {
        case 'invoice.create':
        case 'invoice.update':
        case 'invoice.delete':
          await this.handleInvoiceWebhook(freshBooksPayload)
          break
        case 'client.create':
        case 'client.update':
        case 'client.delete':
          await this.handleClientWebhook(freshBooksPayload)
          break
        case 'project.create':
        case 'project.update':
        case 'project.delete':
          await this.handleProjectWebhook(freshBooksPayload)
          break
        case 'expense.create':
        case 'expense.update':
        case 'expense.delete':
          await this.handleExpenseWebhook(freshBooksPayload)
          break
        case 'payment.create':
        case 'payment.update':
          await this.handlePaymentWebhook(freshBooksPayload)
          break
        case 'time_entry.create':
        case 'time_entry.update':
        case 'time_entry.delete':
          await this.handleTimeEntryWebhook(freshBooksPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${freshBooksPayload.type}`)
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
      // FreshBooks doesn't have a specific disconnect endpoint
      // Clear local caches
      this.clearCache()
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncClients(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.clients', async () => {
        const accountId = await this.getAccountId()
        return this.makeApiCall(`/accounting/account/${accountId}/users/clients`, 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const clients = response.response.result.clients || []

      for (const client of clients) {
        try {
          await this.processClient(client)
          processed++
        } catch (error) {
          errors.push(`Failed to process client ${client.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Client sync failed: ${(error as Error).message}`)
    }
  }

  private async syncInvoices(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.invoices', async () => {
        const accountId = await this.getAccountId()
        return this.makeApiCall(`/accounting/account/${accountId}/invoices/invoices`, 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const invoices = response.response.result.invoices || []

      for (const invoice of invoices) {
        try {
          await this.processInvoice(invoice)
          processed++
        } catch (error) {
          errors.push(`Failed to process invoice ${invoice.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Invoice sync failed: ${(error as Error).message}`)
    }
  }

  private async syncProjects(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.projects', async () => {
        const businessId = await this.getBusinessId()
        return this.makeApiCall(`/projects/business/${businessId}/projects`, 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const projects = response.projects || []

      for (const project of projects) {
        try {
          await this.processProject(project)
          processed++
        } catch (error) {
          errors.push(`Failed to process project ${project.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Project sync failed: ${(error as Error).message}`)
    }
  }

  private async syncExpenses(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.expenses', async () => {
        const accountId = await this.getAccountId()
        return this.makeApiCall(`/accounting/account/${accountId}/expenses/expenses`, 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const expenses = response.response.result.expenses || []

      for (const expense of expenses) {
        try {
          await this.processExpense(expense)
          processed++
        } catch (error) {
          errors.push(`Failed to process expense ${expense.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Expense sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processClient(client: any): Promise<void> {
    this.logger.debug(`Processing FreshBooks client: ${client.fname} ${client.lname}`)
    // Process client data for Aurelius AI system
  }

  private async processInvoice(invoice: any): Promise<void> {
    this.logger.debug(`Processing FreshBooks invoice: ${invoice.invoice_number}`)
    // Process invoice data for Aurelius AI system
  }

  private async processProject(project: any): Promise<void> {
    this.logger.debug(`Processing FreshBooks project: ${project.title}`)
    // Process project data for Aurelius AI system
  }

  private async processExpense(expense: any): Promise<void> {
    this.logger.debug(`Processing FreshBooks expense: ${expense.vendor}`)
    // Process expense data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleInvoiceWebhook(payload: FreshBooksWebhookPayload): Promise<void> {
    this.logger.debug(`Handling invoice webhook: ${payload.id}`)
    // Clear invoice cache to force refresh
    this.invoicesCache.clear()
    // Handle invoice webhook processing
  }

  private async handleClientWebhook(payload: FreshBooksWebhookPayload): Promise<void> {
    this.logger.debug(`Handling client webhook: ${payload.id}`)
    // Clear client cache to force refresh
    this.clientsCache.clear()
    // Handle client webhook processing
  }

  private async handleProjectWebhook(payload: FreshBooksWebhookPayload): Promise<void> {
    this.logger.debug(`Handling project webhook: ${payload.id}`)
    // Clear project cache to force refresh
    this.projectsCache.clear()
    // Handle project webhook processing
  }

  private async handleExpenseWebhook(payload: FreshBooksWebhookPayload): Promise<void> {
    this.logger.debug(`Handling expense webhook: ${payload.id}`)
    // Handle expense webhook processing
  }

  private async handlePaymentWebhook(payload: FreshBooksWebhookPayload): Promise<void> {
    this.logger.debug(`Handling payment webhook: ${payload.id}`)
    // Clear invoice cache as payments affect invoice status
    this.invoicesCache.clear()
    // Handle payment webhook processing
  }

  private async handleTimeEntryWebhook(payload: FreshBooksWebhookPayload): Promise<void> {
    this.logger.debug(`Handling time entry webhook: ${payload.id}`)
    // Handle time entry webhook processing
  }

  // Helper method for webhook signature verification
  private verifyWebhookSignature(body: string, headers: Record<string, string>): boolean {
    try {
      const signature =
        headers['x-freshbooks-webhook-signature'] || headers['X-FreshBooks-Webhook-Signature']
      if (!signature || !this.config?.webhookSecret) {
        return false
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('hex')

      return signature === expectedSignature
    } catch (error) {
      this.logError('verifyWebhookSignature' error as Error)
      return false
    }
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<any> {
    const url = new URL(`${this.apiBaseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString())
        }
      })
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `FreshBooks API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Helper methods for getting account and business IDs
  private async getAccountId(): Promise<string> {
    const userResponse = await this.executeWithProtection('auth.get_user', async () => {
      return this.makeApiCall('/auth/api/v1/users/me', 'GET')
    })

    const user = userResponse.response
    return user.business_memberships[0]?.business.account_id
  }

  private async getBusinessId(): Promise<string> {
    const userResponse = await this.executeWithProtection('auth.get_user', async () => {
      return this.makeApiCall('/auth/api/v1/users/me', 'GET')
    })

    const user = userResponse.response
    return user.business_memberships[0]?.business.id
  }

  // Public API methods
  async getClients(): Promise<FreshBooksClient[]> {
    try {
      const accountId = await this.getAccountId()
      const cacheKey = accountId

      if (this.clientsCache.has(cacheKey)) {
        return [this.clientsCache.get(cacheKey)!]
      }

      const response = await this.executeWithProtection('api.get_clients', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/users/clients`, 'GET')
      })

      const clients = response.response.result.clients || []
      clients.forEach((client: FreshBooksClient) => this.clientsCache.set(client.id, client))

      return clients
    } catch (error) {
      this.logError('getClients', error as Error)
      throw new Error(`Failed to get clients: ${(error as Error).message}`)
    }
  }

  async getClient(clientId: string): Promise<FreshBooksClient> {
    try {
      if (this.clientsCache.has(clientId)) {
        return this.clientsCache.get(clientId)!
      }

      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.get_client', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/users/clients/${clientId}`, 'GET')
      })

      const client = response.response.result.client
      this.clientsCache.set(clientId, client)
      return client
    } catch (error) {
      this.logError('getClient', error as Error)
      throw new Error(`Failed to get client: ${(error as Error).message}`)
    }
  }

  async createClient(clientData: Partial<FreshBooksClient>): Promise<FreshBooksClient> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.create_client', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/users/clients`, 'POST', {
          client: clientData
        })
      })

      const client = response.response.result.client
      this.clientsCache.set(client.id, client)
      return client
    } catch (error) {
      this.logError('createClient', error as Error)
      throw new Error(`Failed to create client: ${(error as Error).message}`)
    }
  }

  async updateClient(
    clientId: string,
    updates: Partial<FreshBooksClient>
  ): Promise<FreshBooksClient> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.update_client', async () => {
        return this.makeApiCall(
          `/accounting/account/${accountId}/users/clients/${clientId}`,
          'PUT',
          {
            client: updates
          },
        )
      })

      const client = response.response.result.client
      this.clientsCache.set(clientId, client)
      return client
    } catch (error) {
      this.logError('updateClient', error as Error)
      throw new Error(`Failed to update client: ${(error as Error).message}`)
    }
  }

  async deleteClient(clientId: string): Promise<void> {
    try {
      const accountId = await this.getAccountId()

      await this.executeWithProtection('api.delete_client', async () => {
        return this.makeApiCall(
          `/accounting/account/${accountId}/users/clients/${clientId}`,
          'DELETE',
        )
      })

      this.clientsCache.delete(clientId)
    } catch (error) {
      this.logError('deleteClient', error as Error)
      throw new Error(`Failed to delete client: ${(error as Error).message}`)
    }
  }

  async getInvoices(): Promise<FreshBooksInvoice[]> {
    try {
      const accountId = await this.getAccountId()
      const cacheKey = accountId

      if (this.invoicesCache.has(cacheKey)) {
        return this.invoicesCache.get(cacheKey)!
      }

      const response = await this.executeWithProtection('api.get_invoices', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/invoices/invoices`, 'GET')
      })

      const invoices = response.response.result.invoices || []
      this.invoicesCache.set(cacheKey, invoices)

      return invoices
    } catch (error) {
      this.logError('getInvoices', error as Error)
      throw new Error(`Failed to get invoices: ${(error as Error).message}`)
    }
  }

  async getInvoice(invoiceId: string): Promise<FreshBooksInvoice> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.get_invoice', async () => {
        return this.makeApiCall(
          `/accounting/account/${accountId}/invoices/invoices/${invoiceId}`,
          'GET',
        )
      })

      return response.response.result.invoice
    } catch (error) {
      this.logError('getInvoice', error as Error)
      throw new Error(`Failed to get invoice: ${(error as Error).message}`)
    }
  }

  async createInvoice(invoiceData: Partial<FreshBooksInvoice>): Promise<FreshBooksInvoice> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.create_invoice', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/invoices/invoices`, 'POST', {
          invoice: invoiceData
        })
      })

      const invoice = response.response.result.invoice
      this.invoicesCache.delete(accountId) // Clear cache
      return invoice
    } catch (error) {
      this.logError('createInvoice', error as Error)
      throw new Error(`Failed to create invoice: ${(error as Error).message}`)
    }
  }

  async updateInvoice(
    invoiceId: string,
    updates: Partial<FreshBooksInvoice>
  ): Promise<FreshBooksInvoice> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.update_invoice', async () => {
        return this.makeApiCall(
          `/accounting/account/${accountId}/invoices/invoices/${invoiceId}`,
          'PUT',
          {
            invoice: updates
          },
        )
      })

      const invoice = response.response.result.invoice
      this.invoicesCache.delete(accountId) // Clear cache
      return invoice
    } catch (error) {
      this.logError('updateInvoice', error as Error)
      throw new Error(`Failed to update invoice: ${(error as Error).message}`)
    }
  }

  async sendInvoice(invoiceId: string): Promise<boolean> {
    try {
      const accountId = await this.getAccountId()

      await this.executeWithProtection('api.send_invoice', async () => {
        return this.makeApiCall(
          `/accounting/account/${accountId}/invoices/invoices/${invoiceId}`,
          'PUT',
          {
            invoice: { action_email: true }
          },
        )
      })

      return true
    } catch (error) {
      this.logError('sendInvoice', error as Error)
      throw new Error(`Failed to send invoice: ${(error as Error).message}`)
    }
  }

  async getExpenses(): Promise<FreshBooksExpense[]> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.get_expenses', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/expenses/expenses`, 'GET')
      })

      return response.response.result.expenses || []
    } catch (error) {
      this.logError('getExpenses', error as Error)
      throw new Error(`Failed to get expenses: ${(error as Error).message}`)
    }
  }

  async createExpense(expenseData: Partial<FreshBooksExpense>): Promise<FreshBooksExpense> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.create_expense', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/expenses/expenses`, 'POST', {
          expense: expenseData
        })
      })

      return response.response.result.expense
    } catch (error) {
      this.logError('createExpense', error as Error)
      throw new Error(`Failed to create expense: ${(error as Error).message}`)
    }
  }

  async getProjects(): Promise<FreshBooksProject[]> {
    try {
      const businessId = await this.getBusinessId()
      const cacheKey = businessId

      if (this.projectsCache.has(cacheKey)) {
        return this.projectsCache.get(cacheKey)!
      }

      const response = await this.executeWithProtection('api.get_projects', async () => {
        return this.makeApiCall(`/projects/business/${businessId}/projects`, 'GET')
      })

      const projects = response.projects || []
      this.projectsCache.set(cacheKey, projects)

      return projects
    } catch (error) {
      this.logError('getProjects', error as Error)
      throw new Error(`Failed to get projects: ${(error as Error).message}`)
    }
  }

  async createProject(projectData: Partial<FreshBooksProject>): Promise<FreshBooksProject> {
    try {
      const businessId = await this.getBusinessId()

      const response = await this.executeWithProtection('api.create_project', async () => {
        return this.makeApiCall(`/projects/business/${businessId}/projects`, 'POST', projectData)
      })

      this.projectsCache.delete(businessId) // Clear cache
      return response.project
    } catch (error) {
      this.logError('createProject', error as Error)
      throw new Error(`Failed to create project: ${(error as Error).message}`)
    }
  }

  async getTimeEntries(projectId?: string): Promise<FreshBooksTimeEntry[]> {
    try {
      const businessId = await this.getBusinessId()
      let endpoint = `/timetracking/business/${businessId}/time_entries`

      if (projectId) {
        endpoint += `?project_id=${projectId}`
      }

      const response = await this.executeWithProtection('api.get_time_entries', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response.time_entries || []
    } catch (error) {
      this.logError('getTimeEntries', error as Error)
      throw new Error(`Failed to get time entries: ${(error as Error).message}`)
    }
  }

  async createTimeEntry(timeEntryData: Partial<FreshBooksTimeEntry>): Promise<FreshBooksTimeEntry> {
    try {
      const businessId = await this.getBusinessId()

      const response = await this.executeWithProtection('api.create_time_entry', async () => {
        return this.makeApiCall(
          `/timetracking/business/${businessId}/time_entries`,
          'POST',
          timeEntryData,
        )
      })

      return response.time_entry
    } catch (error) {
      this.logError('createTimeEntry', error as Error)
      throw new Error(`Failed to create time entry: ${(error as Error).message}`)
    }
  }

  async getPayments(): Promise<FreshBooksPayment[]> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.get_payments', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/payments/payments`, 'GET')
      })

      return response.response.result.payments || []
    } catch (error) {
      this.logError('getPayments', error as Error)
      throw new Error(`Failed to get payments: ${(error as Error).message}`)
    }
  }

  async createPayment(paymentData: Partial<FreshBooksPayment>): Promise<FreshBooksPayment> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.create_payment', async () => {
        return this.makeApiCall(`/accounting/account/${accountId}/payments/payments`, 'POST', {
          payment: paymentData
        })
      })

      return response.response.result.payment
    } catch (error) {
      this.logError('createPayment', error as Error)
      throw new Error(`Failed to create payment: ${(error as Error).message}`)
    }
  }

  async getAccountingReport(reportType: string, startDate: string, endDate: string): Promise<any> {
    try {
      const accountId = await this.getAccountId()

      const response = await this.executeWithProtection('api.get_accounting_report', async () => {
        return this.makeApiCall(
          `/accounting/account/${accountId}/reports/accounting/${reportType}`,
          'GET',
          undefined,
          {
            start_date: startDate,
            end_date: endDate
          },
        )
      })

      return response.response.result
    } catch (error) {
      this.logError('getAccountingReport', error as Error)
      throw new Error(`Failed to get accounting report: ${(error as Error).message}`)
    }
  }

  async getAccountInfo(): Promise<FreshBooksAccount> {
    try {
      const userResponse = await this.executeWithProtection('api.get_account_info', async () => {
        return this.makeApiCall('/auth/api/v1/users/me', 'GET')
      })

      const user = userResponse.response
      const businessMembership = user.business_memberships[0]

      return {
        account_id: businessMembership.business.account_id,
        name: businessMembership.business.name
        created_at: user.created_at,
        updated_at: user.updated_at
        business_uuid: businessMembership.business.id,
        organization_id: businessMembership.business.account_id
        first_name: user.first_name,
        last_name: user.last_name
        email: user.email,
        confirmed: true
        setup_complete: true,
        country_code: 'US'
        subdomain: '',
        date_format: 'mm/dd/yyyy'
        time_format: '12h',
        address: {
          street: '',
          city: ''
          province: '',
          country: ''
          postal_code: ''
        },
        phone_number: {,
          phone_number: ''
        }
      }
    } catch (error) {
      this.logError('getAccountInfo', error as Error)
      throw new Error(`Failed to get account info: ${(error as Error).message}`)
    }
  }

  // Cleanup method
  clearCache(): void {
    this.clientsCache.clear()
    this.invoicesCache.clear()
    this.projectsCache.clear()
  }
}
