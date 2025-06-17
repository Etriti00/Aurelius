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

// Using WebhookPayload from base interface

export class PayPalIntegration extends BaseIntegration {
  readonly provider = 'paypal'
  readonly name = 'PayPal'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api-m.paypal.com' // Production: https://api-m.paypal.com, Sandbox: https://api-m.sandbox.paypal.com

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
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/v1/identity/oauth2/userinfo', 'GET')
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 9 * 60 * 60 * 1000), // 9 hours for PayPal
        scope: ['openid', 'profile', 'email', 'https://uri.paypal.com/services/payments/payment']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.config) {
        throw new AuthenticationError('No config available for token refresh')
      }
  }

      // PayPal uses client credentials flow for most API access
      const credentials = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`,
      ).toString('base64')

      const response = await fetch(`${this.apiBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json'
          'Accept-Language': 'en_US',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()

      this.accessToken = tokenData.access_token

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in paypal.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('No config available for token revocation')
      }
  }

      const credentials = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`,
      ).toString('base64')

      await fetch(`${this.apiBaseUrl}/v1/oauth2/token/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `token=${this.accessToken}`
      }),

      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/v1/identity/oauth2/userinfo', 'GET')
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.status === 429) {
        const resetAfter = err.headers?.['retry-after'] || 60
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 1000,
            remaining: 0
            resetTime: new Date(Date.now() + resetAfter * 1000)
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
        name: 'Payment Processing',
        description: 'Create and manage payments and orders'
        enabled: true,
        requiredScopes: ['https://uri.paypal.com/services/payments/payment']
      },
      {
        name: 'Invoice Management',
        description: 'Create, send, and manage invoices',
        enabled: true,
        requiredScopes: ['https://uri.paypal.com/services/invoicing']
      },
      {
        name: 'Subscription Management',
        description: 'Create and manage recurring subscriptions'
        enabled: true,
        requiredScopes: ['https://uri.paypal.com/services/subscriptions']
      },
      {
        name: 'Dispute Management',
        description: 'Handle payment disputes and chargebacks'
        enabled: true,
        requiredScopes: ['https://uri.paypal.com/services/disputes/read-buyer']
      },
      {
        name: 'Transaction History',
        description: 'Access transaction and payment history'
        enabled: true,
        requiredScopes: ['https://uri.paypal.com/services/reporting/search/read']
      },
      {
        name: 'Webhook Management',
        description: 'Create and manage webhook subscriptions'
        enabled: true,
        requiredScopes: ['https://uri.paypal.com/services/webhooks']
      },
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

      this.logInfo('syncData', 'Starting PayPal sync', { lastSyncTime })

      try {
        const paymentsResult = await this.syncPayments(lastSyncTime)
        totalProcessed += paymentsResult.processed,
        totalSkipped += paymentsResult.skipped
      }
    } catch (error) {
        errors.push(`Payments sync failed: ${(error as Error).message}`)
        this.logError('syncPayments', error as Error)
      }

      try {
        const invoicesResult = await this.syncInvoices(lastSyncTime)
        totalProcessed += invoicesResult.processed,
        totalSkipped += invoicesResult.skipped
      }
    } catch (error) {
        errors.push(`Invoices sync failed: ${(error as Error).message}`)
        this.logError('syncInvoices', error as Error)
      }

      try {
        const subscriptionsResult = await this.syncSubscriptions(lastSyncTime)
        totalProcessed += subscriptionsResult.processed,
        totalSkipped += subscriptionsResult.skipped
      }
    } catch (error) {
        errors.push(`Subscriptions sync failed: ${(error as Error).message}`)
        this.logError('syncSubscriptions', error as Error)
      }

      try {
        const disputesResult = await this.syncDisputes(lastSyncTime)
        totalProcessed += disputesResult.processed,
        totalSkipped += disputesResult.skipped
      }
    } catch (error) {
        errors.push(`Disputes sync failed: ${(error as Error).message}`)
        this.logError('syncDisputes', error as Error)
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
      throw new SyncError('PayPal sync failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in paypal.integration.ts:', error)
      throw error
    }
  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing PayPal webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'paypal.payment.sale.completed':
        case 'paypal.payment.sale.pending':
        case 'paypal.payment.sale.denied':
        case 'paypal.payment.sale.refunded':
          await this.handlePaymentWebhook(payload.data)
          break
        case 'paypal.invoicing.invoice.paid':
        case 'paypal.invoicing.invoice.cancelled':
        case 'paypal.invoicing.invoice.refunded':
          await this.handleInvoiceWebhook(payload.data)
          break
        case 'paypal.billing.subscription.created':
        case 'paypal.billing.subscription.activated':
        case 'paypal.billing.subscription.cancelled':
        case 'paypal.billing.subscription.suspended':
          await this.handleSubscriptionWebhook(payload.data)
          break
        case 'paypal.customer.dispute.created':
        case 'paypal.customer.dispute.resolved':
          await this.handleDisputeWebhook(payload.data)
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
      console.error('Error in paypal.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      if (!this.config?.webhookSecret) {
        this.logError('validateWebhookSignature', new Error('No webhook secret configured'))
        return false
      }
  }

      // PayPal webhook signature validation
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      )
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // Private sync methods
  private async syncPayments(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const startDate =
        lastSyncTime?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
      const endDate = new Date().toISOString()

      const payments = await this.executeWithProtection('sync.payments', async () => {
        return this.makeApiCall(
          `/v1/payments/payment?count=100&start_date=${startDate}&end_date=${endDate}&sort_order=desc`,
          'GET',
        )
      })

      let processed = 0
      let skipped = 0

      for (const payment of payments.payments || []) {
        try {
          if (lastSyncTime && payment.create_time) {
            const createTime = new Date(payment.create_time)
            if (createTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processPayment(payment)
          processed++
        }
    } catch (error) {
          this.logError('syncPayments', error as Error, { paymentId: payment.id })
          skipped++
        }

        catch (error) {
          console.error('Error in paypal.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncPayments', error as Error),
      throw error
    }

  private async syncInvoices(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const invoices = await this.executeWithProtection('sync.invoices', async () => {
        return this.makeApiCall('/v2/invoicing/invoices?page_size=100&total_required=true', 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const invoice of invoices.items || []) {
        try {
          if (lastSyncTime && invoice.detail?.invoice_date) {
            const invoiceDate = new Date(invoice.detail.invoice_date)
            if (invoiceDate <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processInvoice(invoice)
          processed++
        }
    } catch (error) {
          this.logError('syncInvoices', error as Error, { invoiceId: invoice.id })
          skipped++
        }

        catch (error) {
          console.error('Error in paypal.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncInvoices', error as Error),
      throw error
    }

  private async syncSubscriptions(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const startTime =
        lastSyncTime?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const subscriptions = await this.executeWithProtection('sync.subscriptions', async () => {
        return this.makeApiCall(`/v1/billing/subscriptions?start_time=${startTime}&size=100`, 'GET')
      })

      let processed = 0
      let skipped = 0

      for (const subscription of subscriptions.subscriptions || []) {
        try {
          if (lastSyncTime && subscription.create_time) {
            const createTime = new Date(subscription.create_time)
            if (createTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processSubscription(subscription)
          processed++
        }
    } catch (error) {
          this.logError('syncSubscriptions', error as Error, { subscriptionId: subscription.id })
          skipped++
        }

        catch (error) {
          console.error('Error in paypal.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncSubscriptions', error as Error),
      throw error
    }

  private async syncDisputes(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const startTime =
        lastSyncTime?.toISOString().split('T')[0] ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const disputes = await this.executeWithProtection('sync.disputes', async () => {
        return this.makeApiCall(
          `/v1/customer/disputes?start_time=${startTime}&page_size=100`,
          'GET',
        )
      })

      let processed = 0
      let skipped = 0

      for (const dispute of disputes.items || []) {
        try {
          if (lastSyncTime && dispute.create_time) {
            const createTime = new Date(dispute.create_time)
            if (createTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processDispute(dispute)
          processed++
        }
    } catch (error) {
          this.logError('syncDisputes', error as Error, { disputeId: dispute.dispute_id })
          skipped++
        }

        catch (error) {
          console.error('Error in paypal.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncDisputes', error as Error),
      throw error
    }

  // Private processing methods
  private async processPayment(payment: unknown): Promise<void> {
    this.logInfo('processPayment', `Processing payment: ${payment.id}`, {
      paymentId: payment.id,
      state: payment.state
      intent: payment.intent,
      amount: payment.transactions?.[0]?.amount?.total
      currency: payment.transactions?.[0]?.amount?.currency,
      createTime: payment.create_time
    })
  }

  private async processInvoice(invoice: unknown): Promise<void> {
    this.logInfo('processInvoice', `Processing invoice: ${invoice.id}`, {
      invoiceId: invoice.id,
      status: invoice.status
      amount: invoice.amount?.value,
      currency: invoice.amount?.currency_code
      invoiceDate: invoice.detail?.invoice_date
    })
  }

  private async processSubscription(subscription: unknown): Promise<void> {
    this.logInfo('processSubscription', `Processing subscription: ${subscription.id}`, {
      subscriptionId: subscription.id,
      status: subscription.status
      planId: subscription.plan_id,
      createTime: subscription.create_time
    })
  }

  private async processDispute(dispute: unknown): Promise<void> {
    this.logInfo('processDispute', `Processing dispute: ${dispute.dispute_id}`, {
      disputeId: dispute.dispute_id,
      status: dispute.status
      reason: dispute.reason,
      amount: dispute.dispute_amount?.value
      currency: dispute.dispute_amount?.currency_code,
      createTime: dispute.create_time
    })
  }

  // Private webhook handlers
  private async handlePaymentWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePaymentWebhook', 'Processing payment webhook', data)
  }

  private async handleInvoiceWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleInvoiceWebhook', 'Processing invoice webhook', data)
  }

  private async handleSubscriptionWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleSubscriptionWebhook', 'Processing subscription webhook', data)
  }

  private async handleDisputeWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleDisputeWebhook', 'Processing dispute webhook', data)
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
    body?: unknown,
  ): Promise<ApiResponse> {
    const url = `${this.apiBaseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
      'PayPal-Request-Id': crypto.randomUUID(), // Idempotency
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `PayPal API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    return (response as Response).json()
  }

  // Public API methods
  async getUserInfo(): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_user_info', async () => {
        return this.makeApiCall('/v1/identity/oauth2/userinfo', 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getUserInfo', error as Error)
      throw new Error(`Failed to get user info: ${(error as Error).message}`)
    }

  async createPayment(paymentData: {,
    intent: 'sale' | 'authorize' | 'order'
    payer: {,
      payment_method: 'paypal' | 'credit_card'
      payer_info?: unknown
    },
    transactions: Array<{,
      amount: {
        total: string,
        currency: string
        details?: unknown
      }
      description?: string,
      item_list?: unknown
    }>
    redirect_urls: {,
      return_url: string
      cancel_url: string
    }): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.create_payment', async () => {
        return this.makeApiCall('/v1/payments/payment', 'POST', paymentData)
      }),

      return response
    } catch (error) {
      this.logError('createPayment', error as Error)
      throw new Error(`Failed to create payment: ${(error as Error).message}`)
    }

  async executePayment(paymentId: string, payerId: string): Promise<ApiResponse> {
    try {
      const executeData = { payer_id: payerId }
  }

      const _response = await this.executeWithProtection('api.execute_payment', async () => {
        return this.makeApiCall(`/v1/payments/payment/${paymentId}/execute`, 'POST', executeData)
      }),

      return response
    } catch (error) {
      this.logError('executePayment', error as Error)
      throw new Error(`Failed to execute payment: ${(error as Error).message}`)
    }

  async getPayment(paymentId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_payment', async () => {
        return this.makeApiCall(`/v1/payments/payment/${paymentId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getPayment', error as Error)
      throw new Error(`Failed to get payment: ${(error as Error).message}`)
    }

  async refundSale(
    saleId: string
    amount?: { total: string; currency: string },
  ): Promise<ApiResponse> {
    try {
      const refundData = amount ? { amount } : {}

      const _response = await this.executeWithProtection('api.refund_sale', async () => {
        return this.makeApiCall(`/v1/payments/sale/${saleId}/refund`, 'POST', refundData)
      }),

      return response
    } catch (error) {
      this.logError('refundSale', error as Error)
      throw new Error(`Failed to refund sale: ${(error as Error).message}`)
    }

  async createInvoice(invoiceData: {,
    merchant_info: {
      email: string,
      first_name: string
      last_name: string
      business_name?: string
      phone?: unknown,
      address?: unknown
    },
    billing_info: Array<{,
      email: string
      first_name?: string
      last_name?: string
      business_name?: string
      phone?: unknown,
      address?: unknown
    }>
    items: Array<{,
      name: string
      quantity: number,
      unit_price: {
        currency: string,
        value: string
      },
      description?: string
    }>
    invoice_date: string
    payment_term?: {
      term_type: 'NET_10' | 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'DUE_ON_RECEIPT'
    },
    note?: string
  }): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.create_invoice', async () => {
        return this.makeApiCall('/v2/invoicing/invoices', 'POST', invoiceData)
      }),

      return response
    } catch (error) {
      this.logError('createInvoice', error as Error)
      throw new Error(`Failed to create invoice: ${(error as Error).message}`)
    }

  async sendInvoice(invoiceId: string, subject?: string): Promise<void> {
    try {
      const sendData = {
        send_to_invoicer: true,
        send_to_recipient: true
        subject: subject || 'Invoice from PayPal'
      }
  }

      await this.executeWithProtection('api.send_invoice', async () => {
        return this.makeApiCall(`/v2/invoicing/invoices/${invoiceId}/send`, 'POST', sendData)
      })
    } catch (error) {
      this.logError('sendInvoice', error as Error)
      throw new Error(`Failed to send invoice: ${(error as Error).message}`)
    }

  async getInvoice(invoiceId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_invoice', async () => {
        return this.makeApiCall(`/v2/invoicing/invoices/${invoiceId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getInvoice', error as Error)
      throw new Error(`Failed to get invoice: ${(error as Error).message}`)
    }

  async listInvoices(page = 1, pageSize = 100, totalRequired = true): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.list_invoices', async () => {
        return this.makeApiCall(
          `/v2/invoicing/invoices?page=${page}&page_size=${pageSize}&total_required=${totalRequired}`,
          'GET',
        )
      })
  }

      return response
    } catch (error) {
      this.logError('listInvoices', error as Error)
      throw new Error(`Failed to list invoices: ${(error as Error).message}`)
    }

  async createSubscription(subscriptionData: {,
    plan_id: string
    start_time: string
    quantity?: string
    shipping_amount?: {
      currency_code: string,
      value: string
    },
    subscriber: {,
      name: {
        given_name: string,
        surname: string
      },
    email_address: string
      shipping_address?: unknown
    }
    application_context?: {
      brand_name?: string
      locale?: string
      shipping_preference?: 'GET_FROM_FILE' | 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS'
      user_action?: 'SUBSCRIBE_NOW' | 'CONTINUE'
      payment_method?: {
        payer_selected?: 'PAYPAL',
        payee_preferred?: 'IMMEDIATE_PAYMENT_REQUIRED'
      }
      return_url?: string,
      cancel_url?: string
    }): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.create_subscription', async () => {
        return this.makeApiCall('/v1/billing/subscriptions', 'POST', subscriptionData)
      }),

      return response
    } catch (error) {
      this.logError('createSubscription', error as Error)
      throw new Error(`Failed to create subscription: ${(error as Error).message}`)
    }

  async getSubscription(subscriptionId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_subscription', async () => {
        return this.makeApiCall(`/v1/billing/subscriptions/${subscriptionId}`, 'GET')
      })
  }

      return response
    } catch (error) {
      this.logError('getSubscription', error as Error)
      throw new Error(`Failed to get subscription: ${(error as Error).message}`)
    }

  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    try {
      const cancelData = {
        reason
      }
  }

      await this.executeWithProtection('api.cancel_subscription', async () => {
        return this.makeApiCall(
          `/v1/billing/subscriptions/${subscriptionId}/cancel`,
          'POST',
          cancelData,
        )
      })
    } catch (error) {
      this.logError('cancelSubscription', error as Error)
      throw new Error(`Failed to cancel subscription: ${(error as Error).message}`)
    }

  async listTransactions(
    startDate: string,
    endDate: string
    transactionStatus?: 'D' | 'P' | 'S' | 'V',
    pageSize = 100,
  ): Promise<ApiResponse> {
    try {
      let queryParams = `start_date=${startDate}&end_date=${endDate}&page_size=${pageSize}`
      if (transactionStatus) {
        queryParams += `&transaction_status=${transactionStatus}`
      }

      const _response = await this.executeWithProtection('api.list_transactions', async () => {
        return this.makeApiCall(`/v1/reporting/transactions?${queryParams}`, 'GET')
      }),

      return response
    } catch (error) {
      this.logError('listTransactions', error as Error)
      throw new Error(`Failed to list transactions: ${(error as Error).message}`)
    }

  async createWebhook(webhookData: {,
    url: string
    event_types: Array<{,
      name: string
    }>
  }): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.create_webhook', async () => {
        return this.makeApiCall('/v1/notifications/webhooks', 'POST', webhookData)
      }),

      return response
    } catch (error) {
      this.logError('createWebhook', error as Error)
      throw new Error(`Failed to create webhook: ${(error as Error).message}`)
    }

  async listWebhooks(anchorId?: string): Promise<ApiResponse> {
    try {
      let queryParams = ''
      if (anchorId) {
        queryParams = `?anchor_id=${anchorId}`
      }
  }

      const _response = await this.executeWithProtection('api.list_webhooks', async () => {
        return this.makeApiCall(`/v1/notifications/webhooks${queryParams}`, 'GET')
      }),

      return response
    } catch (error) {
      this.logError('listWebhooks', error as Error)
      throw new Error(`Failed to list webhooks: ${(error as Error).message}`)
    }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_webhook', async () => {
        return this.makeApiCall(`/v1/notifications/webhooks/${webhookId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteWebhook', error as Error)
      throw new Error(`Failed to delete webhook: ${(error as Error).message}`)
    }

}