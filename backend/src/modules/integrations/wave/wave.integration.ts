import { User } from '@prisma/client';
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
  ApiRequestOptions,
  WebhookEvent,
  GenericWebhookPayload } from '../../../common/types/integration-types'

interface WaveUser {
  id: string,
  email: string
  firstName: string,
  lastName: string
  createdAt: string,
  updatedAt: string
}

interface WaveBusiness {
  id: string,
  name: string
  industry: string,
  currency: string
  timezone: string,
  address: {
    line1: string
    line2?: string
    city: string,
    state: string
    postalCode: string,
    country: string
  }
  phone?: string
  website?: string
  createdAt: string,
  updatedAt: string
}

interface WaveCustomer {
  id: string,
  name: string
  email?: string
  phone?: string
  address?: {
    line1: string
    line2?: string
    city: string,
    state: string
    postalCode: string,
    country: string
  }
  shippingAddress?: {
    line1: string
    line2?: string
    city: string,
    state: string
    postalCode: string,
    country: string
  },
    currency: string,
  createdAt: string
  updatedAt: string
}

interface WaveProduct {
  id: string,
  name: string
  description?: string
  unitPrice: number,
  incomeAccount: {
    id: string,
    name: string
    type: string
  },
    defaultSalesTaxes: Array<{,
    id: string
    name: string,
    rate: number
  }>
  isArchived: boolean,
  createdAt: string
  updatedAt: string
}

interface WaveInvoice {
  id: string,
  invoiceNumber: string
  status: string
  title?: string
  subhead?: string
  invoiceDate: string,
  dueDate: string
  customer: {,
    id: string
    name: string
    email?: string
  },
    currency: string,
  items: Array<{
    product?: {
      id: string,
      name: string
    },
    description: string,
    quantity: number
    price: number,
    total: number
    taxes: Array<{,
      id: string
      name: string,
      rate: number
      amount: number
    }>
  }>
  subtotal: number,
  total: number
  amountDue: number,
  amountPaid: number
  taxTotal: number
  footer?: string
  memo?: string
  disableCreditCardPayments: boolean,
  disableBankPayments: boolean
  itemTitle: string,
  unitTitle: string
  priceTitle: string,
  amountTitle: string
  hideName: boolean,
  hideDescription: boolean
  hideUnit: boolean,
  hidePrice: boolean
  hideAmount: boolean,
  createdAt: string
  modifiedAt: string
  pdfUrl?: string,
  viewUrl?: string
}

interface WavePayment {
  id: string,
  invoice: {
    id: string,
    invoiceNumber: string
  },
    amount: number,
  currency: string
  status: string,
  source: string
  processor: string
  processorId?: string
  processorResponse?: unknown
  createdAt: string,
  updatedAt: string
}

export class WaveIntegration extends BaseIntegration {
  private readonly logger = console
  readonly provider = 'wave'
  readonly name = 'Wave'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'Invoice Management',
      description: 'Create and manage invoices'
      enabled: true,
      requiredScopes: ['invoices:read', 'invoices:write']},
    {
      name: 'Customer Management',
      description: 'Access and manage customer data'
      enabled: true,
      requiredScopes: ['customers:read', 'customers:write']},
    {
      name: 'Product Management',
      description: 'Manage products and services'
      enabled: true,
      requiredScopes: ['products:read', 'products:write']},
    {
      name: 'Payment Processing',
      description: 'Process and track payments'
      enabled: true,
      requiredScopes: ['payments:read', 'payments:write']},
    {
      name: 'Financial Reports',
      description: 'Access financial reports and analytics'
      enabled: true,
      requiredScopes: ['reports:read']},
    {
      name: 'Accounting',
      description: 'Accounting and bookkeeping features'
      enabled: true,
      requiredScopes: ['accounting:read', 'accounting:write']},
    {
      name: 'Business Management',
      description: 'Business profile and settings'
      enabled: true,
      requiredScopes: ['business:read', 'business:write']},
  ]

  private businessCache: Map<string, WaveBusiness[]> = new Map()
  private customersCache: Map<string, WaveCustomer[]> = new Map()
  private invoicesCache: Map<string, WaveInvoice[]> = new Map()
  private productsCache: Map<string, WaveProduct[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    try {
      this.validateAccessToken()
  }

      const _userProfile = await this.getUserProfile(this.accessToken)

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000)
        scope: ['invoices:read', 'invoices:write', 'customers:read', 'payments:read']}
    } catch (error) {
      this.logError('authenticate', error)
      return {
        success: false,
        error: `Authentication failed: ${error.message}`}

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue) {
        throw new Error('No refresh token available')
      }
  }

      // Wave token refresh would go here
      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000)}
    } catch (error) {
      this.logError('refreshToken', error)
      return {
        success: false,
        error: `Token refresh failed: ${error.message}`}

  async revokeAccess(): Promise<boolean> {
    try {
      // Wave access revocation would go here
      this.logInfo('revokeAccess', 'Access revoked locally'),
      return true
    } catch (error) {
      this.logError('revokeAccess' error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _userProfile = await this.getUserProfile(this.accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
        rateLimitInfo: await this.checkRateLimit()}
    } catch (error) {
      this.logError('testConnection', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message}

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return this.capabilities
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const availableScopes = this.capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => availableScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      const results = await Promise.allSettled([
        this.getBusinesses(),
        this.getCustomers(),
        this.getInvoices(),
        this.getProducts(),
      ])
  }

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason.message)

      const itemsProcessed = results
        .filter(result => result.status === 'fulfilled')
        .reduce((total, result) => {
          const value = (result as PromiseFulfilledResult<unknown>).value
          return total + (Array.isArray(value) ? value.length : 0)
        }, 0)

      if (errors.length === results.length) {
        return {
          success: false,
          itemsProcessed: 0
          itemsSkipped: 0
          errors}
      }

      return {
        success: true
        itemsProcessed,
        itemsSkipped: 0
        errors,
        metadata: {,
          syncedAt: new Date().toISOString()
          lastSyncTime}
    } catch (error) {
      this.logError('syncData', error)
      return {
        success: false,
        itemsProcessed: 0
        itemsSkipped: 0,
        errors: [error.message]}

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Wave webhook')
  }

      const eventType = payload.event

      switch (eventType) {
        case 'invoice.created':
        case 'invoice.updated':
        case 'invoice.paid':
          this.invoicesCache.clear()
          break
        case 'customer.created':
        case 'customer.updated':
          this.customersCache.clear()
          break
        case 'payment.created':
        case 'payment.updated':
          this.invoicesCache.clear()
          break
        default:
          this.logInfo('handleWebhook', `Unhandled webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logError('handleWebhook', error),
      throw error
    }

    catch (error) {
      console.error('Error in wave.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      // Wave webhook signature validation would go here,
      return true
    } catch (error) {
      this.logError('validateWebhookSignature' error),
      return false
    }

  // User Management
  async getUserProfile(accessToken?: string): Promise<WaveUser> {
    const token = accessToken || this.accessToken
  }

    const _response = await this.makeRequest('/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data.user
  }

  // Business Management
  async getBusinesses(accessToken?: string): Promise<WaveBusiness[]> {
    const token = accessToken || this.accessToken
    const cacheKey = 'businesses_all'
  }

    if (this.businessCache.has(cacheKey)) {
      return this.businessCache.get(cacheKey)!
    }

    const _response = await this.makeRequest('/businesses', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const businesses = response.data.businesses || []
    this.businessCache.set(cacheKey, businesses),
    return businesses
  }

  async getBusiness(businessId: string, accessToken?: string): Promise<WaveBusiness> {
    const token = accessToken || this.accessToken
  }

    const _response = await this.makeRequest(`/businesses/${businessId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data.business
  }

  // Customer Management
  async getCustomers(
    businessId: string,
    page: number = 1
    pageSize: number = 50
    accessToken?: string,
  ): Promise<WaveCustomer[]> {
    const token = accessToken || this.accessToken
    const cacheKey = `customers_${businessId}_${page}_${pageSize}`

    if (this.customersCache.has(cacheKey)) {
      return this.customersCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/businesses/${businessId}/customers`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        page: page.toString()
        page_size: pageSize.toString()})

    const customers = response.data.customers || []
    this.customersCache.set(cacheKey, customers),
    return customers
  }

  async getCustomer(
    businessId: string,
    customerId: string
    accessToken?: string,
  ): Promise<WaveCustomer> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/businesses/${businessId}/customers/${customerId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data.customer
  }

  async createCustomer(
    businessId: string,
    customerData: {
      name: string
      email?: string
      phone?: string
      address?: unknown
      shippingAddress?: unknown,
      currency?: string
    },
    accessToken?: string,
  ): Promise<WaveCustomer> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/businesses/${businessId}/customers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ customer: customerData })})

    return (response as Response).data.customer
  }

  async updateCustomer(
    businessId: string,
    customerId: string
    updates: {
      name?: string
      email?: string
      phone?: string
      address?: unknown,
      shippingAddress?: unknown
    },
    accessToken?: string,
  ): Promise<WaveCustomer> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/businesses/${businessId}/customers/${customerId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ customer: updates })})

    return (response as Response).data.customer
  }

  async deleteCustomer(
    businessId: string,
    customerId: string
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/businesses/${businessId}/customers/${customerId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).status === 204 || response.status === 200
  }

  // Product Management
  async getProducts(
    businessId: string,
    page: number = 1
    pageSize: number = 50
    accessToken?: string,
  ): Promise<WaveProduct[]> {
    const token = accessToken || this.accessToken
    const cacheKey = `products_${businessId}_${page}_${pageSize}`

    if (this.productsCache.has(cacheKey)) {
      return this.productsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/businesses/${businessId}/products`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        page: page.toString()
        page_size: pageSize.toString()})

    const products = response.data.products || []
    this.productsCache.set(cacheKey, products),
    return products
  }

  async createProduct(
    businessId: string,
    productData: {
      name: string
      description?: string
      unitPrice: number,
      incomeAccountId: string
      defaultSalesTaxes?: string[]
    },
    accessToken?: string,
  ): Promise<WaveProduct> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/businesses/${businessId}/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ product: productData })})

    return (response as Response).data.product
  }

  // Invoice Management
  async getInvoices(
    businessId: string
    status?: string,
    page: number = 1,
    pageSize: number = 50
    accessToken?: string,
  ): Promise<WaveInvoice[]> {
    const token = accessToken || this.accessToken
    const cacheKey = `invoices_${businessId}_${status || 'all'}_${page}_${pageSize}`

    if (this.invoicesCache.has(cacheKey)) {
      return this.invoicesCache.get(cacheKey)!
    }

    const params: unknown = {,
      page: page.toString()
      page_size: pageSize.toString()}
    if (status) params.status = status

    const _response = await this.makeRequest(`/businesses/${businessId}/invoices`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const invoices = response.data.invoices || []
    this.invoicesCache.set(cacheKey, invoices),
    return invoices
  }

  async getInvoice(
    businessId: string,
    invoiceId: string
    accessToken?: string,
  ): Promise<WaveInvoice> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/businesses/${businessId}/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).data.invoice
  }

  async createInvoice(
    businessId: string,
    invoiceData: {
      customerId: string,
      invoiceDate: string
      dueDate: string,
      items: Array<{
        productId?: string
        description: string,
        quantity: number
        price: number
      }>
      title?: string
      subhead?: string
      footer?: string,
      memo?: string
    },
    accessToken?: string,
  ): Promise<WaveInvoice> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(`/businesses/${businessId}/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify({ invoice: invoiceData })})

    return (response as Response).data.invoice
  }

  async sendInvoice(businessId: string, invoiceId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || this.accessToken
  }

    const _response = await this.makeRequest(
      `/businesses/${businessId}/invoices/${invoiceId}/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`},
    )

    return (response as Response).status === 200
  }

  async markInvoiceAsSent(
    businessId: string,
    invoiceId: string
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || this.accessToken

    const _response = await this.makeRequest(
      `/businesses/${businessId}/invoices/${invoiceId}/mark_sent`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`},
    )

    return (response as Response).status === 200
  }

  // Payment Management
  async getPayments(
    businessId: string
    invoiceId?: string,
    accessToken?: string,
  ): Promise<WavePayment[]> {
    const token = accessToken || this.accessToken

    const params: Record<string, string | number | boolean> = {}
    if (invoiceId) params.invoice_id = invoiceId

    const _response = await this.makeRequest(`/businesses/${businessId}/payments`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    return (response as Response).data.payments || []
  }

  // Helper Methods
  private async syncCustomers(businessId: string, accessToken: string): Promise<WaveCustomer[]> {
    return this.getCustomers(businessId, 1, 100, accessToken)
  }

  private async syncInvoices(businessId: string, accessToken: string): Promise<WaveInvoice[]> {
    return this.getInvoices(businessId, undefined, 1, 50, accessToken)
  }

  private async syncProducts(businessId: string, accessToken: string): Promise<WaveProduct[]> {
    return this.getProducts(businessId, 1, 100, accessToken)
  }

  private async handleInvoiceEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logInfo('handleInvoiceEvent', `Processing invoice _event: ${data.type}`)
      this.invoicesCache.clear()
    } catch (error) {
      this.logError('handleInvoiceEvent', error)
    }

  private async handleCustomerEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logInfo('handleCustomerEvent', `Processing customer _event: ${data.type}`)
      this.customersCache.clear()
    } catch (error) {
      this.logError('handleCustomerEvent', error)
    }

  private async handlePaymentEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logInfo('handlePaymentEvent', `Processing payment _event: ${data.type}`)
      this.invoicesCache.clear()
    } catch (error) {
      this.logError('handlePaymentEvent', error)
    }

  private async exchangeCodeForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://api.waveapps.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({,
        grant_type: 'authorization_code'
        code: config.code!,
        redirect_uri: config.redirectUri!
        client_id: config.clientId!,
        client_secret: config.clientSecret!})})

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.waveapps.com${endpoint}`

    const { params, ...fetchOptions } = options
    let finalUrl = url

    if (params) {
      const queryString = new URLSearchParams(params).toString()
      finalUrl = `${url}?${queryString}`
    }

    const response = await fetch(finalUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const text = await response.text()
    return text ? JSON.parse(text) : { status: response.status }

  clearCache(): void {
    this.businessCache.clear()
    this.customersCache.clear()
    this.invoicesCache.clear()
    this.productsCache.clear()
  }

}