import Stripe from 'stripe'
import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig
} from '../base/integration.interface'
import { WebhookEvent, GenericWebhookPayload } from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class StripeIntegration extends BaseIntegration {
  readonly provider = 'stripe'
  readonly name = 'Stripe'
  readonly version = '1.0.0'

  private stripeClient: Stripe

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.stripeClient = new Stripe(accessToken, {
      apiVersion: '2024-06-20',
      maxNetworkRetries: 3
    })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting account info
      await this.stripeClient.accounts.retrieve()
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Stripe API keys don't expire
        scope: ['read_write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Stripe API keys don't need refresh
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Stripe API keys can be deactivated via dashboard,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.stripeClient.accounts.retrieve()
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.type === 'StripeAuthenticationError') {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.type === 'StripeRateLimitError') {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 100,
            remaining: 0
            resetTime: new Date(Date.now() + 1000), // 1 second
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
        name: 'Payments',
        description: 'Access and manage payment transactions'
        enabled: true,
        requiredScopes: ['read_write']
      },
      {
        name: 'Customers',
        description: 'Manage customer information and profiles'
        enabled: true,
        requiredScopes: ['read_write']
      },
      {
        name: 'Subscriptions',
        description: 'Handle recurring billing and subscriptions'
        enabled: true,
        requiredScopes: ['read_write']
      },
      {
        name: 'Invoices',
        description: 'Create and manage invoices'
        enabled: true,
        requiredScopes: ['read_write']
      },
      {
        name: 'Products',
        description: 'Manage products and pricing'
        enabled: true,
        requiredScopes: ['read_write']
      },
      {
        name: 'Disputes',
        description: 'Handle payment disputes and chargebacks'
        enabled: true,
        requiredScopes: ['read_write']
      },
      {
        name: 'Analytics',
        description: 'Access financial reports and analytics'
        enabled: true,
        requiredScopes: ['read_write']
      },
      {
        name: 'Webhooks',
        description: 'Receive real-time event notifications'
        enabled: true,
        requiredScopes: ['read_write']
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

      this.logInfo('syncData', 'Starting Stripe sync', { lastSyncTime })

      // Sync Payments
      try {
        const paymentsResult = await this.syncPayments(lastSyncTime)
        totalProcessed += paymentsResult.processed,
        totalSkipped += paymentsResult.skipped
      }
    } catch (error) {
        errors.push(`Payments sync failed: ${(error as Error).message}`)
        this.logError('syncPayments', error as Error)
      }

      catch (error) {
        console.error('Error in stripe.integration.ts:', error)
        throw error
      }
      // Sync Customers
      try {
        const customersResult = await this.syncCustomers(lastSyncTime)
        totalProcessed += customersResult.processed,
        totalSkipped += customersResult.skipped
      } catch (error) {
        errors.push(`Customers sync failed: ${(error as Error).message}`)
        this.logError('syncCustomers', error as Error)
      }

      // Sync Subscriptions
      try {
        const subscriptionsResult = await this.syncSubscriptions(lastSyncTime)
        totalProcessed += subscriptionsResult.processed,
        totalSkipped += subscriptionsResult.skipped
      } catch (error) {
        errors.push(`Subscriptions sync failed: ${(error as Error).message}`)
        this.logError('syncSubscriptions', error as Error)
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
      throw new SyncError('Stripe sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Stripe webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
          await this.handlePaymentWebhook(payload.data)
          break
        case 'customer.created':
        case 'customer.updated':
        case 'customer.deleted':
          await this.handleCustomerWebhook(payload.data)
          break
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          await this.handleInvoiceWebhook(payload.data)
          break
        case 'subscription.created':
        case 'subscription.updated':
        case 'subscription.deleted':
          await this.handleSubscriptionWebhook(payload.data)
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
      console.error('Error in stripe.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      if (!this.config?.webhookSecret) {
        return false
      }
  }

      this.stripeClient.webhooks.constructEvent(
        JSON.stringify(payload),
        signature,
        this.config.webhookSecret,
      ),
      return true
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // Private sync methods
  private async syncPayments(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const params: Stripe.PaymentIntentListParams = { limit: 100 }

      if (lastSyncTime) {
        params.created = { gte: Math.floor(lastSyncTime.getTime() / 1000) }
      }

      const payments = await this.stripeClient.paymentIntents.list(params)

      let processed = 0
      let skipped = 0

      for (const payment of payments.data) {
        try {
          await this.processPayment(payment)
          processed++
        }
        catch (error) {
          console.error('Error in stripe.integration.ts:', error)
          throw error
        }
      }
    } catch (error) {
          this.logError('syncPayments', error as Error, { paymentId: payment.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncPayments', error as Error),
      throw error
    }

  private async syncCustomers(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const params: Stripe.CustomerListParams = { limit: 100 }

      if (lastSyncTime) {
        params.created = { gte: Math.floor(lastSyncTime.getTime() / 1000) }
      }

      const customers = await this.stripeClient.customers.list(params)

      let processed = 0
      let skipped = 0

      for (const customer of customers.data) {
        try {
          await this.processCustomer(customer)
          processed++
        }
        catch (error) {
          console.error('Error in stripe.integration.ts:', error)
          throw error
        }
      }
    } catch (error) {
          this.logError('syncCustomers', error as Error, { customerId: customer.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncCustomers', error as Error),
      throw error
    }

  private async syncSubscriptions(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const params: Stripe.SubscriptionListParams = { limit: 100 }

      if (lastSyncTime) {
        params.created = { gte: Math.floor(lastSyncTime.getTime() / 1000) }
      }

      const subscriptions = await this.stripeClient.subscriptions.list(params)

      let processed = 0
      let skipped = 0

      for (const subscription of subscriptions.data) {
        try {
          await this.processSubscription(subscription)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncSubscriptions', error as Error, { subscriptionId: subscription.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncSubscriptions', error as Error),
      throw error
    }

  // Private processing methods
  private async processPayment(payment: Stripe.PaymentIntent): Promise<void> {
    this.logInfo('processPayment', `Processing payment: ${payment.id}`)
  }

  private async processCustomer(customer: Stripe.Customer): Promise<void> {
    this.logInfo('processCustomer', `Processing customer: ${customer.id}`)
  }

  private async processSubscription(subscription: Stripe.Subscription): Promise<void> {
    this.logInfo('processSubscription', `Processing subscription: ${subscription.id}`)
  }

  // Private webhook handlers
  private async handlePaymentWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePaymentWebhook', 'Processing payment webhook', data)
  }

  private async handleCustomerWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleCustomerWebhook', 'Processing customer webhook', data)
  }

  private async handleInvoiceWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleInvoiceWebhook', 'Processing invoice webhook', data)
  }

  private async handleSubscriptionWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleSubscriptionWebhook', 'Processing subscription webhook', data)
  }

  // Public API methods
  async createCustomer(customerData: Stripe.CustomerCreateParams): Promise<string> {
    try {
      const customer = await this.stripeClient.customers.create(customerData)
      return customer.id
    }
    } catch (error) {
      this.logError('createCustomer', error as Error)
      throw new Error(`Failed to create Stripe customer: ${(error as Error).message}`)
    }

  async updateCustomer(customerId: string, updateData: Stripe.CustomerUpdateParams): Promise<void> {
    try {
      await this.stripeClient.customers.update(customerId, updateData)
    }
    } catch (error) {
      this.logError('updateCustomer', error as Error)
      throw new Error(`Failed to update Stripe customer: ${(error as Error).message}`)
    }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return (await this.stripeClient.customers.retrieve(customerId)) as Stripe.Customer
    }
    } catch (error) {
      this.logError('getCustomer', error as Error)
      throw new Error(`Failed to get Stripe customer: ${(error as Error).message}`)
    }

  async createPaymentIntent(paymentData: Stripe.PaymentIntentCreateParams): Promise<string> {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.create(paymentData)
      return paymentIntent.id
    }
    } catch (error) {
      this.logError('createPaymentIntent', error as Error)
      throw new Error(`Failed to create Stripe payment intent: ${(error as Error).message}`)
    }

  async confirmPaymentIntent(
    paymentIntentId: string
    confirmData?: Stripe.PaymentIntentConfirmParams,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripeClient.paymentIntents.confirm(paymentIntentId, confirmData)
    }
    } catch (error) {
      this.logError('confirmPaymentIntent', error as Error)
      throw new Error(`Failed to confirm Stripe payment intent: ${(error as Error).message}`)
    }

  async createSubscription(subscriptionData: Stripe.SubscriptionCreateParams): Promise<string> {
    try {
      const subscription = await this.stripeClient.subscriptions.create(subscriptionData)
      return subscription.id
    }
    } catch (error) {
      this.logError('createSubscription', error as Error)
      throw new Error(`Failed to create Stripe subscription: ${(error as Error).message}`)
    }

  async updateSubscription(
    subscriptionId: string,
    updateData: Stripe.SubscriptionUpdateParams
  ): Promise<void> {
    try {
      await this.stripeClient.subscriptions.update(subscriptionId, updateData)
    }
    } catch (error) {
      this.logError('updateSubscription', error as Error)
      throw new Error(`Failed to update Stripe subscription: ${(error as Error).message}`)
    }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.stripeClient.subscriptions.cancel(subscriptionId)
    }
    } catch (error) {
      this.logError('cancelSubscription', error as Error)
      throw new Error(`Failed to cancel Stripe subscription: ${(error as Error).message}`)
    }

  async createInvoice(invoiceData: Stripe.InvoiceCreateParams): Promise<string> {
    try {
      const invoice = await this.stripeClient.invoices.create(invoiceData)
      return invoice.id
    }
    } catch (error) {
      this.logError('createInvoice', error as Error)
      throw new Error(`Failed to create Stripe invoice: ${(error as Error).message}`)
    }

  async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripeClient.invoices.finalizeInvoice(invoiceId)
    }
    } catch (error) {
      this.logError('finalizeInvoice', error as Error)
      throw new Error(`Failed to finalize Stripe invoice: ${(error as Error).message}`)
    }

  async createProduct(productData: Stripe.ProductCreateParams): Promise<string> {
    try {
      const product = await this.stripeClient.products.create(productData)
      return product.id
    }
    } catch (error) {
      this.logError('createProduct', error as Error)
      throw new Error(`Failed to create Stripe product: ${(error as Error).message}`)
    }

  async createPrice(priceData: Stripe.PriceCreateParams): Promise<string> {
    try {
      const price = await this.stripeClient.prices.create(priceData)
      return price.id
    }
    } catch (error) {
      this.logError('createPrice', error as Error)
      throw new Error(`Failed to create Stripe price: ${(error as Error).message}`)
    }

  async getBalance(): Promise<Stripe.Balance> {
    try {
      return await this.stripeClient.balance.retrieve()
    }
    } catch (error) {
      this.logError('getBalance', error as Error)
      throw new Error(`Failed to get Stripe balance: ${(error as Error).message}`)
    }

  async getPayouts(options?: {
    limit?: number
    starting_after?: string,
    ending_before?: string
  }): Promise<Stripe.Payout[]> {
    try {
      const payouts = await this.stripeClient.payouts.list(_options)
      return payouts.data
    }
    } catch (error) {
      this.logError('getPayouts', error as Error)
      throw new Error(`Failed to get Stripe payouts: ${(error as Error).message}`)
    }

  async getDisputes(options?: {
    limit?: number
    starting_after?: string,
    ending_before?: string
  }): Promise<Stripe.Dispute[]> {
    try {
      const disputes = await this.stripeClient.disputes.list(_options)
      return disputes.data
    }
    } catch (error) {
      this.logError('getDisputes', error as Error)
      throw new Error(`Failed to get Stripe disputes: ${(error as Error).message}`)
    }

  async getTransfers(options?: {
    limit?: number
    starting_after?: string,
    ending_before?: string
  }): Promise<Stripe.Transfer[]> {
    try {
      const transfers = await this.stripeClient.transfers.list(_options)
      return transfers.data
    }
    } catch (error) {
      this.logError('getTransfers', error as Error)
      throw new Error(`Failed to get Stripe transfers: ${(error as Error).message}`)
    }

  async createWebhookEndpoint(webhookData: Stripe.WebhookEndpointCreateParams): Promise<string> {
    try {
      const webhook = await this.stripeClient.webhookEndpoints.create(webhookData)
      return webhook.id
    }
    } catch (error) {
      this.logError('createWebhookEndpoint', error as Error)
      throw new Error(`Failed to create Stripe webhook endpoint: ${(error as Error).message}`)
    }

}
catch (error) {
  console.error('Error in stripe.integration.ts:', error)
  throw error
}