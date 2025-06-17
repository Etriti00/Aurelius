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

interface ShopifyWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface ShopifyShop {
  id: number,
  name: string
  email: string,
  domain: string
  province: string,
  country: string
  address1: string,
  zip: string
  city: string,
  source: string
  phone: string,
  latitude: number
  longitude: number,
  primary_locale: string
  address2: string,
  created_at: string
  updated_at: string,
  country_code: string
  country_name: string,
  currency: string
  customer_email: string,
  timezone: string
  iana_timezone: string,
  shop_owner: string
  money_format: string,
  money_with_currency_format: string
  weight_unit: string,
  province_code: string
  taxes_included: boolean,
  auto_configure_tax_inclusivity: boolean
  tax_shipping: boolean,
  county_taxes: boolean
  plan_display_name: string,
  plan_name: string
  has_discounts: boolean,
  has_gift_cards: boolean
  myshopify_domain: string,
  google_apps_domain: string | null
  google_apps_login_enabled: boolean,
  money_in_emails_format: string
  money_with_currency_in_emails_format: string,
  eligible_for_payments: boolean
  requires_extra_payments_agreement: boolean,
  password_enabled: boolean
  has_storefront: boolean,
  eligible_for_card_reader_giveaway: boolean
  finances: boolean,
  primary_location_id: number
  checkout_api_supported: boolean,
  multi_location_enabled: boolean
  setup_required: boolean,
  pre_launch_enabled: boolean
  enabled_presentment_currencies: string[]
}

interface ShopifyProduct {
  id: number,
  title: string
  body_html: string,
  vendor: string
  product_type: string,
  created_at: string
  handle: string,
  updated_at: string
  published_at: string,
  template_suffix: string | null
  status: 'active' | 'archived' | 'draft',
  published_scope: string
  tags: string,
  admin_graphql_api_id: string
  variants: ShopifyVariant[],
  options: ShopifyOption[]
  images: ShopifyImage[],
  image: ShopifyImage | null
}

interface ShopifyVariant {
  id: number,
  product_id: number
  title: string,
  price: string
  sku: string,
  position: number
  inventory_policy: 'deny' | 'continue',
  compare_at_price: string | null
  fulfillment_service: string,
  inventory_management: string | null
  option1: string | null,
  option2: string | null
  option3: string | null,
  created_at: string
  updated_at: string,
  taxable: boolean
  barcode: string,
  grams: number
  image_id: number | null,
  weight: number
  weight_unit: string,
  inventory_item_id: number
  inventory_quantity: number,
  old_inventory_quantity: number
  requires_shipping: boolean,
  admin_graphql_api_id: string
}

interface ShopifyOption {
  id: number,
  product_id: number
  name: string,
  position: number
  values: string[]
}

interface ShopifyImage {
  id: number,
  product_id: number
  position: number,
  created_at: string
  updated_at: string,
  alt: string | null
  width: number,
  height: number
  src: string,
  variant_ids: number[]
  admin_graphql_api_id: string
}

interface ShopifyOrder {
  id: number,
  admin_graphql_api_id: string
  app_id: number,
  browser_ip: string
  buyer_accepts_marketing: boolean,
  cancel_reason: string | null
  cancelled_at: string | null,
  cart_token: string
  checkout_id: number,
  checkout_token: string
  closed_at: string | null,
  confirmed: boolean
  contact_email: string,
  created_at: string
  currency: string,
  current_subtotal_price: string
  current_subtotal_price_set: {,
    shop_money: {
      amount: string,
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  current_total_discounts: string,
  current_total_discounts_set: {
    shop_money: {,
      amount: string
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  current_total_duties_set: any,
  current_total_price: string
  current_total_price_set: {,
    shop_money: {
      amount: string,
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  current_total_tax: string,
  current_total_tax_set: {
    shop_money: {,
      amount: string
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  customer_locale: string,
  device_id: number | null
  discount_codes: unknown[],
  email: string
  estimated_taxes: boolean,
  financial_status:
    | 'pending'
    | 'authorized'
    | 'partially_paid'
    | 'paid'
    | 'partially_refunded'
    | 'refunded'
    | 'voided'
  fulfillment_status: 'fulfilled' | 'null' | 'partial' | 'restocked',
  gateway: string
  landing_site: string,
  landing_site_ref: string
  location_id: number | null,
  name: string
  note: string,
  note_attributes: unknown[]
  number: number,
  order_number: number
  order_status_url: string,
  original_total_duties_set: any
  payment_gateway_names: string[],
  phone: string
  presentment_currency: string,
  processed_at: string
  processing_method: string,
  reference: string
  referring_site: string,
  source_identifier: string
  source_name: string,
  source_url: string | null
  subtotal_price: string,
  subtotal_price_set: {
    shop_money: {,
      amount: string
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  tags: string,
  tax_lines: unknown[]
  taxes_included: boolean,
  test: boolean
  token: string,
  total_discounts: string
  total_discounts_set: {,
    shop_money: {
      amount: string,
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  total_line_items_price: string,
  total_line_items_price_set: {
    shop_money: {,
      amount: string
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  total_outstanding: string,
  total_price: string
  total_price_set: {,
    shop_money: {
      amount: string,
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  total_shipping_price_set: {,
    shop_money: {
      amount: string,
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  total_tax: string,
  total_tax_set: {
    shop_money: {,
      amount: string
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  total_tip_received: string,
  total_weight: number
  updated_at: string,
  user_id: number | null
  line_items: ShopifyLineItem[],
  fulfillments: unknown[]
  refunds: unknown[]
  customer?: ShopifyCustomer
  billing_address?: ShopifyAddress
  shipping_address?: ShopifyAddress
}

interface ShopifyLineItem {
  id: number,
  admin_graphql_api_id: string
  fulfillable_quantity: number,
  fulfillment_service: string
  fulfillment_status: string | null,
  gift_card: boolean
  grams: number,
  name: string
  price: string,
  price_set: {
    shop_money: {,
      amount: string
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  product_exists: boolean,
  product_id: number
  properties: unknown[],
  quantity: number
  requires_shipping: boolean,
  sku: string
  taxable: boolean,
  title: string
  total_discount: string,
  total_discount_set: {
    shop_money: {,
      amount: string
      currency_code: string
    }
    presentment_money: {,
      amount: string
      currency_code: string
    }
  }
  variant_id: number,
  variant_inventory_management: string
  variant_title: string,
  vendor: string
  tax_lines: unknown[],
  duties: unknown[]
  discount_allocations: unknown[]
}

interface ShopifyCustomer {
  id: number,
  email: string
  accepts_marketing: boolean,
  created_at: string
  updated_at: string,
  first_name: string
  last_name: string,
  orders_count: number
  state: string,
  total_spent: string
  last_order_id: number | null,
  note: string
  verified_email: boolean,
  multipass_identifier: string | null
  tax_exempt: boolean,
  phone: string
  tags: string,
  last_order_name: string
  currency: string,
  addresses: ShopifyAddress[]
  accepts_marketing_updated_at: string,
  marketing_opt_in_level: string | null
  tax_exemptions: unknown[],
  admin_graphql_api_id: string
  default_address: ShopifyAddress
}

interface ShopifyAddress {
  id: number,
  customer_id: number
  first_name: string,
  last_name: string
  company: string,
  address1: string
  address2: string,
  city: string
  province: string,
  country: string
  zip: string,
  phone: string
  name: string,
  province_code: string
  country_code: string,
  country_name: string
  default: boolean
}

interface ShopifyInventoryItem {
  id: number,
  sku: string
  created_at: string,
  updated_at: string
  requires_shipping: boolean,
  cost: string
  country_code_of_origin: string,
  province_code_of_origin: string
  harmonized_system_code: string,
  tracked: boolean
  country_harmonized_system_codes: unknown[]
}

interface ShopifyInventoryLevel {
  inventory_item_id: number,
  location_id: number
  available: number,
  updated_at: string
}

export class ShopifyIntegration extends BaseIntegration {
  readonly provider = 'shopify'
  readonly name = 'Shopify'
  readonly version = '1.0.0'

  private readonly apiBaseUrl: string
  private readonly shopDomain: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
    // Shopify shop domain is required - should be provided in config
    this.shopDomain =
      this.config?.apiUrl?.replace('https://', '').replace('.myshopify.com', '') || 'shop'
    this.apiBaseUrl = `https://${this.shopDomain}.myshopify.com/admin/api/2023-10`
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/shop.json', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Shopify access tokens don't expire
        scope: ['read_products', 'read_orders', 'read_customers', 'write_products', 'write_orders'],
        data: response?.shop
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
      // Shopify access tokens don't expire, but we can validate them
      const response = await this.executeWithProtection('refresh.test', async () => {
        return this.makeApiCall('/shop.json', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        scope: ['read_products', 'read_orders', 'read_customers', 'write_products', 'write_orders'],
        data: response?.shop
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Access token validation failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.ECOMMERCE,
      IntegrationCapability.INVENTORY,
      IntegrationCapability.ORDERS,
      IntegrationCapability.CUSTOMERS,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/shop.json', 'GET')
      })

      const shop = response?.shop

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          shopId: shop?.id
          shopName: shop?.name,
          shopDomain: shop?.domain
          shopEmail: shop?.email,
          currency: shop?.currency
          timezone: shop?.iana_timezone
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

      // Sync products
      try {
        const productResult = await this.syncProducts()
        totalProcessed += productResult.processed
        totalErrors += productResult.errors
        if (productResult.errorMessages) {
          errors.push(...productResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Product sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync orders
      try {
        const orderResult = await this.syncOrders()
        totalProcessed += orderResult.processed
        totalErrors += orderResult.errors
        if (orderResult.errorMessages) {
          errors.push(...orderResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Order sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync customers
      try {
        const customerResult = await this.syncCustomers()
        totalProcessed += customerResult.processed
        totalErrors += customerResult.errors
        if (customerResult.errorMessages) {
          errors.push(...customerResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Customer sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Shopify sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const shopifyPayload = payload as ShopifyWebhookPayload

      switch (shopifyPayload.type) {
        case 'shopify.product.created':
        case 'shopify.product.updated':
        case 'shopify.product.deleted':
          await this.handleProductWebhook(shopifyPayload)
          break
        case 'shopify.order.created':
        case 'shopify.order.updated':
        case 'shopify.order.paid':
        case 'shopify.order.cancelled':
        case 'shopify.order.fulfilled':
          await this.handleOrderWebhook(shopifyPayload)
          break
        case 'shopify.customer.created':
        case 'shopify.customer.updated':
        case 'shopify.customer.deleted':
          await this.handleCustomerWebhook(shopifyPayload)
          break
        case 'shopify.inventory.level.updated':
          await this.handleInventoryWebhook(shopifyPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${shopifyPayload.type}`)
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
      // Shopify doesn't have a token revocation endpoint, but we can mark as disconnected
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncProducts(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.products', async () => {
        return this.makeApiCall('/products.json?limit=250', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const products = response?.products || []

      for (const product of products) {
        try {
          await this.processProduct(product)
          processed++
        } catch (error) {
          errors.push(`Failed to process product ${product.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Product sync failed: ${(error as Error).message}`)
    }
  }

  private async syncOrders(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.orders', async () => {
        return this.makeApiCall('/orders.json?limit=250&status=any', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const orders = response?.orders || []

      for (const order of orders) {
        try {
          await this.processOrder(order)
          processed++
        } catch (error) {
          errors.push(`Failed to process order ${order.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Order sync failed: ${(error as Error).message}`)
    }
  }

  private async syncCustomers(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.customers', async () => {
        return this.makeApiCall('/customers.json?limit=250', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const customers = response?.customers || []

      for (const customer of customers) {
        try {
          await this.processCustomer(customer)
          processed++
        } catch (error) {
          errors.push(`Failed to process customer ${customer.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Customer sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processProduct(product: any): Promise<void> {
    this.logger.debug(`Processing Shopify product: ${product.title}`)
    // Process product data for Aurelius AI system
  }

  private async processOrder(order: any): Promise<void> {
    this.logger.debug(`Processing Shopify order: ${order.name}`)
    // Process order data for Aurelius AI system
  }

  private async processCustomer(customer: any): Promise<void> {
    this.logger.debug(`Processing Shopify customer: ${customer.email}`)
    // Process customer data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleProductWebhook(payload: ShopifyWebhookPayload): Promise<void> {
    this.logger.debug(`Handling product webhook: ${payload.id}`)
    // Handle product webhook processing
  }

  private async handleOrderWebhook(payload: ShopifyWebhookPayload): Promise<void> {
    this.logger.debug(`Handling order webhook: ${payload.id}`)
    // Handle order webhook processing
  }

  private async handleCustomerWebhook(payload: ShopifyWebhookPayload): Promise<void> {
    this.logger.debug(`Handling customer webhook: ${payload.id}`)
    // Handle customer webhook processing
  }

  private async handleInventoryWebhook(payload: ShopifyWebhookPayload): Promise<void> {
    this.logger.debug(`Handling inventory webhook: ${payload.id}`)
    // Handle inventory webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
    body?: unknown,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Shopify API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getShop(): Promise<ShopifyShop> {
    try {
      const response = await this.executeWithProtection('api.get_shop', async () => {
        return this.makeApiCall('/shop.json', 'GET')
      })

      return response?.shop
    } catch (error) {
      this.logError('getShop', error as Error)
      throw new Error(`Failed to get shop: ${(error as Error).message}`)
    }
  }

  async getProducts(options?: {
    ids?: string
    limit?: number
    since_id?: number
    title?: string
    vendor?: string
    handle?: string
    product_type?: string
    status?: 'active' | 'archived' | 'draft'
    created_at_min?: string
    created_at_max?: string
    updated_at_min?: string
    updated_at_max?: string
    published_at_min?: string
    published_at_max?: string
    published_status?: 'published' | 'unpublished' | 'any'
    fields?: string
  }): Promise<ShopifyProduct[]> {
    try {
      const params = new URLSearchParams()
      if (options?.ids) params.append('ids', options.ids)
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.since_id) params.append('since_id', options.since_id.toString())
      if (options?.title) params.append('title', options.title)
      if (options?.vendor) params.append('vendor', options.vendor)
      if (options?.handle) params.append('handle', options.handle)
      if (options?.product_type) params.append('product_type', options.product_type)
      if (options?.status) params.append('status', options.status)
      if (options?.created_at_min) params.append('created_at_min', options.created_at_min)
      if (options?.created_at_max) params.append('created_at_max', options.created_at_max)
      if (options?.updated_at_min) params.append('updated_at_min', options.updated_at_min)
      if (options?.updated_at_max) params.append('updated_at_max', options.updated_at_max)
      if (options?.published_at_min) params.append('published_at_min', options.published_at_min)
      if (options?.published_at_max) params.append('published_at_max', options.published_at_max)
      if (options?.published_status) params.append('published_status', options.published_status)
      if (options?.fields) params.append('fields', options.fields)

      const queryString = params.toString()
      const endpoint = queryString ? `/products.json?${queryString}` : '/products.json'

      const response = await this.executeWithProtection('api.get_products', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.products || []
    } catch (error) {
      this.logError('getProducts', error as Error)
      throw new Error(`Failed to get products: ${(error as Error).message}`)
    }
  }

  async getProduct(productId: number): Promise<ShopifyProduct> {
    try {
      const response = await this.executeWithProtection('api.get_product', async () => {
        return this.makeApiCall(`/products/${productId}.json`, 'GET')
      })

      return response?.product
    } catch (error) {
      this.logError('getProduct', error as Error)
      throw new Error(`Failed to get product: ${(error as Error).message}`)
    }
  }

  async createProduct(productData: {,
    title: string
    body_html?: string
    vendor?: string
    product_type?: string
    handle?: string
    template_suffix?: string
    published?: boolean
    published_scope?: string
    tags?: string
    variants?: Array<{
      price: string
      compare_at_price?: string
      sku?: string
      barcode?: string
      inventory_management?: string
      inventory_policy?: 'deny' | 'continue'
      inventory_quantity?: number
      weight?: number
      weight_unit?: string
      requires_shipping?: boolean
      taxable?: boolean
    }>
    images?: Array<{
      src: string
      alt?: string
      position?: number
    }>
    options?: Array<{
      name: string,
      values: string[]
    }>
    metafields?: Array<{
      namespace: string,
      key: string
      value: string,
      type: string
    }>
  }): Promise<ShopifyProduct> {
    try {
      const response = await this.executeWithProtection('api.create_product', async () => {
        return this.makeApiCall('/products.json', 'POST', { product: productData })
      })

      return response?.product
    } catch (error) {
      this.logError('createProduct', error as Error)
      throw new Error(`Failed to create product: ${(error as Error).message}`)
    }
  }

  async updateProduct(
    productId: number,
    productData: {
      title?: string
      body_html?: string
      vendor?: string
      product_type?: string
      handle?: string
      template_suffix?: string
      published?: boolean
      published_scope?: string
      tags?: string
      status?: 'active' | 'archived' | 'draft'
    },
  ): Promise<ShopifyProduct> {
    try {
      const response = await this.executeWithProtection('api.update_product', async () => {
        return this.makeApiCall(`/products/${productId}.json`, 'PUT', { product: productData })
      })

      return response?.product
    } catch (error) {
      this.logError('updateProduct', error as Error)
      throw new Error(`Failed to update product: ${(error as Error).message}`)
    }
  }

  async deleteProduct(productId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_product', async () => {
        return this.makeApiCall(`/products/${productId}.json`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteProduct', error as Error)
      throw new Error(`Failed to delete product: ${(error as Error).message}`)
    }
  }

  async getOrders(options?: {
    ids?: string
    limit?: number
    since_id?: number
    created_at_min?: string
    created_at_max?: string
    updated_at_min?: string
    updated_at_max?: string
    processed_at_min?: string
    processed_at_max?: string
    attribution_app_id?: string
    status?: 'open' | 'closed' | 'cancelled' | 'any'
    financial_status?:
      | 'pending'
      | 'authorized'
      | 'partially_paid'
      | 'paid'
      | 'partially_refunded'
      | 'refunded'
      | 'voided'
      | 'any'
    fulfillment_status?: 'shipped' | 'partial' | 'unshipped' | 'any' | 'unfulfilled'
    fields?: string
  }): Promise<ShopifyOrder[]> {
    try {
      const params = new URLSearchParams()
      if (options?.ids) params.append('ids', options.ids)
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.since_id) params.append('since_id', options.since_id.toString())
      if (options?.created_at_min) params.append('created_at_min', options.created_at_min)
      if (options?.created_at_max) params.append('created_at_max', options.created_at_max)
      if (options?.updated_at_min) params.append('updated_at_min', options.updated_at_min)
      if (options?.updated_at_max) params.append('updated_at_max', options.updated_at_max)
      if (options?.processed_at_min) params.append('processed_at_min', options.processed_at_min)
      if (options?.processed_at_max) params.append('processed_at_max', options.processed_at_max)
      if (options?.attribution_app_id)
        params.append('attribution_app_id', options.attribution_app_id)
      if (options?.status) params.append('status', options.status)
      if (options?.financial_status) params.append('financial_status', options.financial_status)
      if (options?.fulfillment_status)
        params.append('fulfillment_status', options.fulfillment_status)
      if (options?.fields) params.append('fields', options.fields)

      const queryString = params.toString()
      const endpoint = queryString ? `/orders.json?${queryString}` : '/orders.json'

      const response = await this.executeWithProtection('api.get_orders', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.orders || []
    } catch (error) {
      this.logError('getOrders', error as Error)
      throw new Error(`Failed to get orders: ${(error as Error).message}`)
    }
  }

  async getOrder(orderId: number): Promise<ShopifyOrder> {
    try {
      const response = await this.executeWithProtection('api.get_order', async () => {
        return this.makeApiCall(`/orders/${orderId}.json`, 'GET')
      })

      return response?.order
    } catch (error) {
      this.logError('getOrder', error as Error)
      throw new Error(`Failed to get order: ${(error as Error).message}`)
    }
  }

  async updateOrder(
    orderId: number,
    orderData: {
      note?: string
      email?: string
      phone?: string
      tags?: string
      shipping_address?: Partial<ShopifyAddress>
      billing_address?: Partial<ShopifyAddress>
    },
  ): Promise<ShopifyOrder> {
    try {
      const response = await this.executeWithProtection('api.update_order', async () => {
        return this.makeApiCall(`/orders/${orderId}.json`, 'PUT', { order: orderData })
      })

      return response?.order
    } catch (error) {
      this.logError('updateOrder', error as Error)
      throw new Error(`Failed to update order: ${(error as Error).message}`)
    }
  }

  async cancelOrder(
    orderId: number
    reason?: 'customer' | 'inventory' | 'fraud' | 'declined' | 'other',
  ): Promise<ShopifyOrder> {
    try {
      const response = await this.executeWithProtection('api.cancel_order', async () => {
        return this.makeApiCall(`/orders/${orderId}/cancel.json`, 'POST', {
          reason,
          refund: true,
          restock: true
        })
      })

      return response?.order
    } catch (error) {
      this.logError('cancelOrder', error as Error)
      throw new Error(`Failed to cancel order: ${(error as Error).message}`)
    }
  }

  async getCustomers(options?: {
    ids?: string
    limit?: number
    since_id?: number
    created_at_min?: string
    created_at_max?: string
    updated_at_min?: string
    updated_at_max?: string
    fields?: string
  }): Promise<ShopifyCustomer[]> {
    try {
      const params = new URLSearchParams()
      if (options?.ids) params.append('ids', options.ids)
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.since_id) params.append('since_id', options.since_id.toString())
      if (options?.created_at_min) params.append('created_at_min', options.created_at_min)
      if (options?.created_at_max) params.append('created_at_max', options.created_at_max)
      if (options?.updated_at_min) params.append('updated_at_min', options.updated_at_min)
      if (options?.updated_at_max) params.append('updated_at_max', options.updated_at_max)
      if (options?.fields) params.append('fields', options.fields)

      const queryString = params.toString()
      const endpoint = queryString ? `/customers.json?${queryString}` : '/customers.json'

      const response = await this.executeWithProtection('api.get_customers', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.customers || []
    } catch (error) {
      this.logError('getCustomers', error as Error)
      throw new Error(`Failed to get customers: ${(error as Error).message}`)
    }
  }

  async getCustomer(customerId: number): Promise<ShopifyCustomer> {
    try {
      const response = await this.executeWithProtection('api.get_customer', async () => {
        return this.makeApiCall(`/customers/${customerId}.json`, 'GET')
      })

      return response?.customer
    } catch (error) {
      this.logError('getCustomer', error as Error)
      throw new Error(`Failed to get customer: ${(error as Error).message}`)
    }
  }

  async createCustomer(customerData: {
    first_name?: string
    last_name?: string
    email: string
    phone?: string
    verified_email?: boolean
    addresses?: Array<{
      first_name?: string
      last_name?: string
      company?: string
      address1?: string
      address2?: string
      city?: string
      province?: string
      country?: string
      zip?: string
      phone?: string
      default?: boolean
    }>
    password?: string
    password_confirmation?: string
    send_email_welcome?: boolean
    tags?: string
    note?: string
    tax_exempt?: boolean
    accepts_marketing?: boolean
    accepts_marketing_updated_at?: string
    marketing_opt_in_level?: 'single_opt_in' | 'confirmed_opt_in' | 'unknown'
  }): Promise<ShopifyCustomer> {
    try {
      const response = await this.executeWithProtection('api.create_customer', async () => {
        return this.makeApiCall('/customers.json', 'POST', { customer: customerData })
      })

      return response?.customer
    } catch (error) {
      this.logError('createCustomer', error as Error)
      throw new Error(`Failed to create customer: ${(error as Error).message}`)
    }
  }

  async updateCustomer(
    customerId: number,
    customerData: {
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
      verified_email?: boolean
      password?: string
      password_confirmation?: string
      tags?: string
      note?: string
      tax_exempt?: boolean
      accepts_marketing?: boolean
      accepts_marketing_updated_at?: string
      marketing_opt_in_level?: 'single_opt_in' | 'confirmed_opt_in' | 'unknown'
    },
  ): Promise<ShopifyCustomer> {
    try {
      const response = await this.executeWithProtection('api.update_customer', async () => {
        return this.makeApiCall(`/customers/${customerId}.json`, 'PUT', { customer: customerData })
      })

      return response?.customer
    } catch (error) {
      this.logError('updateCustomer', error as Error)
      throw new Error(`Failed to update customer: ${(error as Error).message}`)
    }
  }

  async deleteCustomer(customerId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_customer', async () => {
        return this.makeApiCall(`/customers/${customerId}.json`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteCustomer', error as Error)
      throw new Error(`Failed to delete customer: ${(error as Error).message}`)
    }
  }

  async getInventoryLevels(options?: {
    inventory_item_ids?: string
    location_ids?: string
    limit?: number
    updated_at_min?: string
  }): Promise<ShopifyInventoryLevel[]> {
    try {
      const params = new URLSearchParams()
      if (options?.inventory_item_ids)
        params.append('inventory_item_ids', options.inventory_item_ids)
      if (options?.location_ids) params.append('location_ids', options.location_ids)
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.updated_at_min) params.append('updated_at_min', options.updated_at_min)

      const queryString = params.toString()
      const endpoint = queryString
        ? `/inventory_levels.json?${queryString}`
        : '/inventory_levels.json'

      const response = await this.executeWithProtection('api.get_inventory_levels', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response?.inventory_levels || []
    } catch (error) {
      this.logError('getInventoryLevels', error as Error)
      throw new Error(`Failed to get inventory levels: ${(error as Error).message}`)
    }
  }

  async updateInventoryLevel(
    inventoryItemId: number,
    locationId: number
    available: number
  ): Promise<ShopifyInventoryLevel> {
    try {
      const response = await this.executeWithProtection('api.update_inventory_level', async () => {
        return this.makeApiCall('/inventory_levels/set.json', 'POST', {
          location_id: locationId,
          inventory_item_id: inventoryItemId
          available
        })
      })

      return response?.inventory_level
    } catch (error) {
      this.logError('updateInventoryLevel', error as Error)
      throw new Error(`Failed to update inventory level: ${(error as Error).message}`)
    }
  }

  async createWebhook(webhookData: {,
    topic:
      | 'orders/create'
      | 'orders/delete'
      | 'orders/updated'
      | 'orders/paid'
      | 'orders/cancelled'
      | 'orders/fulfilled'
      | 'orders/partially_fulfilled'
      | 'order_transactions/create'
      | 'products/create'
      | 'products/update'
      | 'products/delete'
      | 'customers/create'
      | 'customers/update'
      | 'customers/delete'
      | 'app/uninstalled'
      | 'inventory_levels/update'
    address: string
    format?: 'json' | 'xml'
    fields?: string[]
    metafield_namespaces?: string[]
    private_metafield_namespaces?: string[]
    api_client_id?: number
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.create_webhook', async () => {
        return this.makeApiCall('/webhooks.json', 'POST', { webhook: webhookData })
      })

      return response?.webhook
    } catch (error) {
      this.logError('createWebhook', error as Error)
      throw new Error(`Failed to create webhook: ${(error as Error).message}`)
    }
  }

  async getWebhooks(): Promise<any[]> {
    try {
      const response = await this.executeWithProtection('api.get_webhooks', async () => {
        return this.makeApiCall('/webhooks.json', 'GET')
      })

      return response?.webhooks || []
    } catch (error) {
      this.logError('getWebhooks', error as Error)
      throw new Error(`Failed to get webhooks: ${(error as Error).message}`)
    }
  }

  async deleteWebhook(webhookId: number): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_webhook', async () => {
        return this.makeApiCall(`/webhooks/${webhookId}.json`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteWebhook', error as Error)
      throw new Error(`Failed to delete webhook: ${(error as Error).message}`)
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
