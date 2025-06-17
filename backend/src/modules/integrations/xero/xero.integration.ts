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

interface XeroWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface XeroTokenResponse {
  access_token: string,
  refresh_token: string
  expires_in: number,
  token_type: string
  scope: string
}

interface XeroConnection {
  id: string,
  tenantId: string
  tenantType:
    | 'ORGANISATION'
    | 'TRUST'
    | 'CHARITY'
    | 'COMPANY'
    | 'PARTNERSHIP'
    | 'SOLE_TRADER'
    | 'LOOKTHROUGH_COMPANY'
  tenantName: string,
  createdDateUtc: string
  updatedDateUtc: string
}

interface XeroOrganisation {
  organisationID: string,
  name: string
  legalName: string,
  paysTax: boolean
  version: string,
  organisationType: string
  baseCurrency: string,
  countryCode: string
  isDemoCompany: boolean,
  organisationStatus: string
  registrationNumber: string,
  taxNumber: string
  financialYearEndDay: number,
  financialYearEndMonth: number
  salesTaxBasis: string,
  salesTaxPeriod: string
  defaultSalesTax: string,
  defaultPurchasesTax: string
  createdDateUTC: string,
  timezone: string
  organisationEntityType: string,
  shortCode: string
  lineOfBusiness: string,
  addresses: XeroAddress[]
  phones: XeroPhone[],
  externalLinks: XeroLink[]
  paymentTerms: XeroPaymentTerms
}

interface XeroAddress {
  addressType: 'POBOX' | 'STREET' | 'DELIVERY',
  addressLine1: string
  addressLine2: string,
  addressLine3: string
  addressLine4: string,
  city: string
  region: string,
  postalCode: string
  country: string,
  attentionTo: string
}

interface XeroPhone {
  phoneType: 'DEFAULT' | 'DDI' | 'MOBILE' | 'FAX',
  phoneNumber: string
  phoneAreaCode: string,
  phoneCountryCode: string
}

interface XeroLink {
  linkType: 'Website' | 'LinkedIn' | 'Twitter' | 'Facebook',
  url: string
}

interface XeroPaymentTerms {
  bills: {,
    day: number
    type: 'DAYSAFTERBILLDATE' | 'DAYSAFTERBILLMONTH' | 'OFCURRENTMONTH' | 'OFFOLLOWINGMONTH'
  }
  sales: {,
    day: number
    type: 'DAYSAFTERBILLDATE' | 'DAYSAFTERBILLMONTH' | 'OFCURRENTMONTH' | 'OFFOLLOWINGMONTH'
  }
}

interface XeroInvoice {
  invoiceID: string,
  invoiceNumber: string
  reference: string,
  type:
    | 'ACCPAY'
    | 'ACCPAYDEBIT'
    | 'APOVERPAYMENT'
    | 'ARPREPAYMENT'
    | 'AROVERPAYMENT'
    | 'ARDEBIT'
    | 'ACCPAYPREPAYMENT'
    | 'ACCREC'
    | 'ACCRECDEBIT'
  contact: XeroContact,
  date: string
  dueDate: string,
  lineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax'
  lineItems: XeroLineItem[],
  subTotal: number
  totalTax: number,
  total: number
  totalDiscount: number,
  currencyCode: string
  currencyRate: number,
  status: 'DRAFT' | 'SUBMITTED' | 'DELETED' | 'AUTHORISED' | 'PAID' | 'VOIDED'
  sentToContact: boolean,
  expectedPaymentDate: string
  plannedPaymentDate: string,
  hasAttachments: boolean
  hasErrors: boolean,
  repeatingInvoiceID: string
  payments: XeroPayment[],
  creditNotes: XeroCreditNote[]
  prepayments: XeroPrepayment[],
  overpayments: XeroOverpayment[]
  amountDue: number,
  amountPaid: number
  fullyPaidOnDate: string,
  amountCredited: number
  updatedDateUTC: string,
  brandingThemeID: string
  url: string
}

interface XeroContact {
  contactID: string,
  contactNumber: string
  accountNumber: string,
  contactStatus: 'ACTIVE' | 'ARCHIVED' | 'GDPRREQUEST'
  name: string,
  firstName: string
  lastName: string,
  emailAddress: string
  skypeUserName: string,
  contactPersons: XeroContactPerson[]
  bankAccountDetails: string,
  taxNumber: string
  accountsReceivableTaxType: string,
  accountsPayableTaxType: string
  addresses: XeroAddress[],
  phones: XeroPhone[]
  isSupplier: boolean,
  isCustomer: boolean
  defaultCurrency: string,
  website: string
  brandingTheme: XeroBrandingTheme,
  batchPayments: XeroBatchPayments
  discount: number,
  balances: XeroBalances
  hasAttachments: boolean,
  hasValidationErrors: boolean
  updatedDateUTC: string
}

interface XeroContactPerson {
  firstName: string,
  lastName: string
  emailAddress: string,
  includeInEmails: boolean
}

interface XeroBrandingTheme {
  brandingThemeID: string,
  name: string
  logoUrl: string
}

interface XeroBatchPayments {
  bankAccountNumber: string,
  bankAccountName: string
  details: string
}

interface XeroBalances {
  accountsReceivable: {,
    outstanding: number
    overdue: number
  }
  accountsPayable: {,
    outstanding: number
    overdue: number
  }
}

interface XeroLineItem {
  lineItemID: string,
  description: string
  unitAmount: number,
  taxType: string
  taxAmount: number,
  lineAmount: number
  accountCode: string,
  item: XeroItem
  quantity: number,
  discountRate: number
  discountAmount: number,
  repeatingInvoiceID: string
}

interface XeroItem {
  itemID: string,
  code: string
  name: string,
  isSold: boolean
  isPurchased: boolean,
  description: string
  purchaseDescription: string,
  purchaseDetails: XeroItemPurchaseDetails
  salesDetails: XeroItemSalesDetails,
  isTrackedAsInventory: boolean
  inventoryAssetAccountCode: string,
  totalCostPool: number
  quantityOnHand: number,
  updatedDateUTC: string
}

interface XeroItemPurchaseDetails {
  unitPrice: number,
  accountCode: string
  taxType: string
}

interface XeroItemSalesDetails {
  unitPrice: number,
  accountCode: string
  taxType: string
}

interface XeroPayment {
  paymentID: string,
  date: string
  amount: number,
  reference: string
  currencyRate: number,
  batchPaymentID: string
  account: XeroAccount,
  invoice: {
    invoiceID: string,
    invoiceNumber: string
  }
  creditNote: {,
    creditNoteID: string
    creditNoteNumber: string
  }
  prepayment: {,
    prepaymentID: string
  }
  overpayment: {,
    overpaymentID: string
  }
  hasAccount: boolean,
  hasValidationErrors: boolean
  updatedDateUTC: string
}

interface XeroAccount {
  accountID: string,
  code: string
  name: string,
  type:
    | 'BANK'
    | 'CURRENT'
    | 'CURRLIAB'
    | 'DEPRECIATN'
    | 'DIRECTCOSTS'
    | 'EQUITY'
    | 'EXPENSE'
    | 'FIXED'
    | 'INVENTORY'
    | 'LIABILITY'
    | 'NONCURRENT'
    | 'OTHERINCOME'
    | 'OVERHEADS'
    | 'PREPAYMENT'
    | 'REVENUE'
    | 'SALES'
    | 'TERMLIAB'
    | 'PAYGLIABILITY'
    | 'SUPERANNUATIONEXPENSE'
    | 'SUPERANNUATIONLIABILITY'
    | 'WAGESEXPENSE'
    | 'WAGESPAYABLELIABILITY'
  taxType: string,
  description: string
  class: 'ASSET' | 'EQUITY' | 'EXPENSE' | 'LIABILITY' | 'REVENUE',
  systemAccount: string
  enablePaymentsToAccount: boolean,
  showInExpenseClaims: boolean
  bankAccountNumber: string,
  bankAccountType: 'BANK' | 'CREDITCARD' | 'PAYPAL'
  currencyCode: string,
  reportingCode: string
  reportingCodeName: string,
  hasAttachments: boolean
  updatedDateUTC: string,
  addToWatchlist: boolean
}

interface XeroCreditNote {
  creditNoteID: string,
  creditNoteNumber: string
  reference: string,
  type: 'ACCPAYCREDIT' | 'ACCRECCREDIT'
  contact: XeroContact,
  date: string
  lineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax',
  lineItems: XeroLineItem[]
  subTotal: number,
  totalTax: number
  total: number,
  currencyCode: string
  currencyRate: number,
  status: 'DRAFT' | 'SUBMITTED' | 'DELETED' | 'AUTHORISED' | 'PAID' | 'VOIDED'
  sentToContact: boolean,
  hasAttachments: boolean
  updatedDateUTC: string,
  brandingThemeID: string
  allocations: XeroAllocation[],
  remainingCredit: number
}

interface XeroPrepayment {
  prepaymentID: string,
  type: 'RECEIVE-PREPAYMENT' | 'SPEND-PREPAYMENT'
  contact: XeroContact,
  date: string
  status: 'AUTHORISED' | 'PAID' | 'VOIDED',
  lineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax'
  lineItems: XeroLineItem[],
  subTotal: number
  totalTax: number,
  total: number
  reference: string,
  currencyCode: string
  currencyRate: number,
  remainingCredit: number
  allocations: XeroAllocation[],
  hasAttachments: boolean
  updatedDateUTC: string
}

interface XeroOverpayment {
  overpaymentID: string,
  type: 'RECEIVE-OVERPAYMENT' | 'SPEND-OVERPAYMENT'
  contact: XeroContact,
  date: string
  status: 'AUTHORISED' | 'PAID' | 'VOIDED',
  lineAmountTypes: 'Exclusive' | 'Inclusive' | 'NoTax'
  lineItems: XeroLineItem[],
  subTotal: number
  totalTax: number,
  total: number
  reference: string,
  currencyCode: string
  currencyRate: number,
  remainingCredit: number
  allocations: XeroAllocation[],
  hasAttachments: boolean
  updatedDateUTC: string
}

interface XeroAllocation {
  allocationID: string,
  invoice: {
    invoiceID: string,
    invoiceNumber: string
  }
  amount: number,
  date: string
}

export class XeroIntegration extends BaseIntegration {
  readonly provider = 'xero'
  readonly name = 'Xero'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.xero.com'
  private tenantId?: string

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
      // Get tenant connections first
      const connections = await this.executeWithProtection('auth.connections', async () => {
        return this.makeApiCall('/connections', 'GET')
      })

      if (connections && connections.length > 0) {
        this.tenantId = connections[0].tenantId
      }

      // Test API access with organisation info
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/api.xro/2.0/Organisation', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes typical OAuth expiry
        scope: ['accounting.transactions', 'accounting.contacts.read', 'accounting.settings'],
        data: {,
          organisation: response?.Organisations?.[0]
          tenantId: this.tenantId
        }
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

      const response = await fetch('https://identity.xero.com/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({,
          grant_type: 'refresh_token'
          refresh_token: this.refreshTokenValue
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: XeroTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      this.refreshTokenValue = tokenData.refresh_token

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope.split(' ')
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
      IntegrationCapability.INVOICES,
      IntegrationCapability.CONTACTS,
      IntegrationCapability.PAYMENTS,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/api.xro/2.0/Organisation', 'GET')
      })

      const organisation = response?.Organisations?.[0]

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          organisationId: organisation?.organisationID
          organisationName: organisation?.name,
          tenantId: this.tenantId
          baseCurrency: organisation?.baseCurrency,
          countryCode: organisation?.countryCode
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

      // Sync payments
      try {
        const paymentResult = await this.syncPayments()
        totalProcessed += paymentResult.processed
        totalErrors += paymentResult.errors
        if (paymentResult.errorMessages) {
          errors.push(...paymentResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Payment sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Xero sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const xeroPayload = payload as XeroWebhookPayload

      switch (xeroPayload.type) {
        case 'xero.invoice.created':
        case 'xero.invoice.updated':
        case 'xero.invoice.deleted':
          await this.handleInvoiceWebhook(xeroPayload)
          break
        case 'xero.contact.created':
        case 'xero.contact.updated':
        case 'xero.contact.deleted':
          await this.handleContactWebhook(xeroPayload)
          break
        case 'xero.payment.created':
        case 'xero.payment.updated':
        case 'xero.payment.deleted':
          await this.handlePaymentWebhook(xeroPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${xeroPayload.type}`)
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
      // Xero doesn't require explicit token revocation, but we can mark as disconnected
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
        return this.makeApiCall('/api.xro/2.0/Contacts', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const contacts = response?.Contacts || []

      for (const contact of contacts) {
        try {
          await this.processContact(contact)
          processed++
        } catch (error) {
          errors.push(`Failed to process contact ${contact.contactID}: ${(error as Error).message}`)
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

  private async syncInvoices(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.invoices', async () => {
        return this.makeApiCall('/api.xro/2.0/Invoices', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const invoices = response?.Invoices || []

      for (const invoice of invoices) {
        try {
          await this.processInvoice(invoice)
          processed++
        } catch (error) {
          errors.push(`Failed to process invoice ${invoice.invoiceID}: ${(error as Error).message}`)
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

  private async syncPayments(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.payments', async () => {
        return this.makeApiCall('/api.xro/2.0/Payments', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const payments = response?.Payments || []

      for (const payment of payments) {
        try {
          await this.processPayment(payment)
          processed++
        } catch (error) {
          errors.push(`Failed to process payment ${payment.paymentID}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Payment sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processContact(contact: any): Promise<void> {
    this.logger.debug(`Processing Xero contact: ${contact.name}`)
    // Process contact data for Aurelius AI system
  }

  private async processInvoice(invoice: any): Promise<void> {
    this.logger.debug(`Processing Xero invoice: ${invoice.invoiceNumber}`)
    // Process invoice data for Aurelius AI system
  }

  private async processPayment(payment: any): Promise<void> {
    this.logger.debug(`Processing Xero payment: ${payment.paymentID}`)
    // Process payment data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleInvoiceWebhook(payload: XeroWebhookPayload): Promise<void> {
    this.logger.debug(`Handling invoice webhook: ${payload.id}`)
    // Handle invoice webhook processing
  }

  private async handleContactWebhook(payload: XeroWebhookPayload): Promise<void> {
    this.logger.debug(`Handling contact webhook: ${payload.id}`)
    // Handle contact webhook processing
  }

  private async handlePaymentWebhook(payload: XeroWebhookPayload): Promise<void> {
    this.logger.debug(`Handling payment webhook: ${payload.id}`)
    // Handle payment webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
    body?: unknown,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
      'Xero-tenant-id': this.tenantId || ''
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Xero API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getConnections(): Promise<XeroConnection[]> {
    try {
      const response = await this.executeWithProtection('api.get_connections', async () => {
        return this.makeApiCall('/connections', 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getConnections', error as Error)
      throw new Error(`Failed to get connections: ${(error as Error).message}`)
    }
  }

  async getOrganisation(): Promise<XeroOrganisation> {
    try {
      const response = await this.executeWithProtection('api.get_organisation', async () => {
        return this.makeApiCall('/api.xro/2.0/Organisation', 'GET')
      })

      return response?.Organisations?.[0]
    } catch (error) {
      this.logError('getOrganisation', error as Error)
      throw new Error(`Failed to get organisation: ${(error as Error).message}`)
    }
  }

  async getContacts(options?: {
    where?: string
    order?: string
    ids?: string[]
    page?: number
    includeArchived?: boolean
  }): Promise<XeroContact[]> {
    try {
      const params = new URLSearchParams()
      if (options?.where) params.append('where', options.where)
      if (options?.order) params.append('order', options.order)
      if (options?.ids) params.append('IDs', options.ids.join(','))
      if (options?.page) params.append('page', options.page.toString())
      if (options?.includeArchived)
        params.append('includeArchived', options.includeArchived.toString())

      const queryString = params.toString()
      const endpoint = queryString
        ? `/api.xro/2.0/Contacts?${queryString}`
        : '/api.xro/2.0/Contacts'

      const response = await this.executeWithProtection('api.get_contacts', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.Contacts || []
    } catch (error) {
      this.logError('getContacts', error as Error)
      throw new Error(`Failed to get contacts: ${(error as Error).message}`)
    }
  }

  async getContact(contactId: string): Promise<XeroContact> {
    try {
      const response = await this.executeWithProtection('api.get_contact', async () => {
        return this.makeApiCall(`/api.xro/2.0/Contacts/${contactId}`, 'GET')
      })

      return response?.Contacts?.[0]
    } catch (error) {
      this.logError('getContact', error as Error)
      throw new Error(`Failed to get contact: ${(error as Error).message}`)
    }
  }

  async createContact(contactData: {,
    name: string
    firstName?: string
    lastName?: string
    emailAddress?: string
    contactNumber?: string
    accountNumber?: string
    isCustomer?: boolean
    isSupplier?: boolean
    defaultCurrency?: string
    website?: string
    taxNumber?: string
    addresses?: Array<{
      addressType: 'POBOX' | 'STREET' | 'DELIVERY'
      addressLine1?: string
      addressLine2?: string
      city?: string
      region?: string
      postalCode?: string
      country?: string
    }>
    phones?: Array<{
      phoneType: 'DEFAULT' | 'DDI' | 'MOBILE' | 'FAX',
      phoneNumber: string
    }>
  }): Promise<XeroContact> {
    try {
      const response = await this.executeWithProtection('api.create_contact', async () => {
        return this.makeApiCall('/api.xro/2.0/Contacts', 'POST', { Contacts: [contactData] })
      })

      return response?.Contacts?.[0]
    } catch (error) {
      this.logError('createContact', error as Error)
      throw new Error(`Failed to create contact: ${(error as Error).message}`)
    }
  }

  async updateContact(
    contactId: string,
    contactData: {
      name?: string
      firstName?: string
      lastName?: string
      emailAddress?: string
      contactNumber?: string
      accountNumber?: string
      isCustomer?: boolean
      isSupplier?: boolean
      defaultCurrency?: string
      website?: string
      taxNumber?: string
      contactStatus?: 'ACTIVE' | 'ARCHIVED'
    },
  ): Promise<XeroContact> {
    try {
      const response = await this.executeWithProtection('api.update_contact', async () => {
        return this.makeApiCall(`/api.xro/2.0/Contacts/${contactId}`, 'POST', {
          Contacts: [contactData]
        })
      })

      return response?.Contacts?.[0]
    } catch (error) {
      this.logError('updateContact', error as Error)
      throw new Error(`Failed to update contact: ${(error as Error).message}`)
    }
  }

  async getInvoices(options?: {
    where?: string
    order?: string
    ids?: string[]
    page?: number
    contactIds?: string[]
    statuses?: string[]
    invoiceNumbers?: string[]
    createdByMyApp?: boolean
  }): Promise<XeroInvoice[]> {
    try {
      const params = new URLSearchParams()
      if (options?.where) params.append('where', options.where)
      if (options?.order) params.append('order', options.order)
      if (options?.ids) params.append('IDs', options.ids.join(','))
      if (options?.page) params.append('page', options.page.toString())
      if (options?.contactIds) params.append('ContactIDs', options.contactIds.join(','))
      if (options?.statuses) params.append('Statuses', options.statuses.join(','))
      if (options?.invoiceNumbers) params.append('InvoiceNumbers', options.invoiceNumbers.join(','))
      if (options?.createdByMyApp)
        params.append('createdByMyApp', options.createdByMyApp.toString())

      const queryString = params.toString()
      const endpoint = queryString
        ? `/api.xro/2.0/Invoices?${queryString}`
        : '/api.xro/2.0/Invoices'

      const response = await this.executeWithProtection('api.get_invoices', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.Invoices || []
    } catch (error) {
      this.logError('getInvoices', error as Error)
      throw new Error(`Failed to get invoices: ${(error as Error).message}`)
    }
  }

  async getInvoice(invoiceId: string): Promise<XeroInvoice> {
    try {
      const response = await this.executeWithProtection('api.get_invoice', async () => {
        return this.makeApiCall(`/api.xro/2.0/Invoices/${invoiceId}`, 'GET')
      })

      return response?.Invoices?.[0]
    } catch (error) {
      this.logError('getInvoice', error as Error)
      throw new Error(`Failed to get invoice: ${(error as Error).message}`)
    }
  }

  async createInvoice(invoiceData: {,
    type: 'ACCPAY' | 'ACCREC'
    contact: {
      contactID?: string
      name?: string
    }
    date?: string
    dueDate?: string
    lineAmountTypes?: 'Exclusive' | 'Inclusive' | 'NoTax'
    lineItems: Array<{
      description?: string
      quantity?: number
      unitAmount?: number
      accountCode?: string
      taxType?: string
      itemCode?: string
      lineAmount?: number
    }>
    reference?: string
    brandingThemeID?: string
    url?: string
    currencyCode?: string
    status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED'
  }): Promise<XeroInvoice> {
    try {
      const response = await this.executeWithProtection('api.create_invoice', async () => {
        return this.makeApiCall('/api.xro/2.0/Invoices', 'POST', { Invoices: [invoiceData] })
      })

      return response?.Invoices?.[0]
    } catch (error) {
      this.logError('createInvoice', error as Error)
      throw new Error(`Failed to create invoice: ${(error as Error).message}`)
    }
  }

  async updateInvoice(
    invoiceId: string,
    invoiceData: {
      reference?: string
      date?: string
      dueDate?: string
      status?: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED'
      lineAmountTypes?: 'Exclusive' | 'Inclusive' | 'NoTax'
      lineItems?: Array<{
        description?: string
        quantity?: number
        unitAmount?: number
        accountCode?: string
        taxType?: string
        itemCode?: string
        lineAmount?: number
      }>
      currencyCode?: string
    },
  ): Promise<XeroInvoice> {
    try {
      const response = await this.executeWithProtection('api.update_invoice', async () => {
        return this.makeApiCall(`/api.xro/2.0/Invoices/${invoiceId}`, 'POST', {
          Invoices: [invoiceData]
        })
      })

      return response?.Invoices?.[0]
    } catch (error) {
      this.logError('updateInvoice', error as Error)
      throw new Error(`Failed to update invoice: ${(error as Error).message}`)
    }
  }

  async getPayments(options?: {
    where?: string
    order?: string
    page?: number
  }): Promise<XeroPayment[]> {
    try {
      const params = new URLSearchParams()
      if (options?.where) params.append('where', options.where)
      if (options?.order) params.append('order', options.order)
      if (options?.page) params.append('page', options.page.toString())

      const queryString = params.toString()
      const endpoint = queryString
        ? `/api.xro/2.0/Payments?${queryString}`
        : '/api.xro/2.0/Payments'

      const response = await this.executeWithProtection('api.get_payments', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.Payments || []
    } catch (error) {
      this.logError('getPayments', error as Error)
      throw new Error(`Failed to get payments: ${(error as Error).message}`)
    }
  }

  async createPayment(paymentData: {
    invoice?: {
      invoiceID: string
    }
    creditNote?: {
      creditNoteID: string
    }
    account: {
      accountID?: string
      code?: string
    }
    date: string,
    amount: number
    reference?: string
    currencyRate?: number
  }): Promise<XeroPayment> {
    try {
      const response = await this.executeWithProtection('api.create_payment', async () => {
        return this.makeApiCall('/api.xro/2.0/Payments', 'POST', { Payments: [paymentData] })
      })

      return response?.Payments?.[0]
    } catch (error) {
      this.logError('createPayment', error as Error)
      throw new Error(`Failed to create payment: ${(error as Error).message}`)
    }
  }

  async getAccounts(options?: { where?: string; order?: string }): Promise<XeroAccount[]> {
    try {
      const params = new URLSearchParams()
      if (options?.where) params.append('where', options.where)
      if (options?.order) params.append('order', options.order)

      const queryString = params.toString()
      const endpoint = queryString
        ? `/api.xro/2.0/Accounts?${queryString}`
        : '/api.xro/2.0/Accounts'

      const response = await this.executeWithProtection('api.get_accounts', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.Accounts || []
    } catch (error) {
      this.logError('getAccounts', error as Error)
      throw new Error(`Failed to get accounts: ${(error as Error).message}`)
    }
  }

  async getItems(options?: {
    where?: string
    order?: string
    unitdp?: number
  }): Promise<XeroItem[]> {
    try {
      const params = new URLSearchParams()
      if (options?.where) params.append('where', options.where)
      if (options?.order) params.append('order', options.order)
      if (options?.unitdp) params.append('unitdp', options.unitdp.toString())

      const queryString = params.toString()
      const endpoint = queryString ? `/api.xro/2.0/Items?${queryString}` : '/api.xro/2.0/Items'

      const response = await this.executeWithProtection('api.get_items', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.Items || []
    } catch (error) {
      this.logError('getItems', error as Error)
      throw new Error(`Failed to get items: ${(error as Error).message}`)
    }
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<boolean> {
    try {
      if (!this.config?.webhookSecret) {
        throw new Error('Webhook secret not configured')
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(rawBody)
        .digest('base64')

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    } catch (error) {
      this.logError('verifyWebhook' error as Error)
      return false
    }
  }
}
