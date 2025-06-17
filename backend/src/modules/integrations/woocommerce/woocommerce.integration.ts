import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig
} from '../base/integration.interface'
import { ApiResponse, GenericWebhookPayload } from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface WooCommerceProduct {
  id: number,
  name: string
  slug: string,
  permalink: string
  date_created: string,
  date_modified: string
  type: string,
  status: string
  featured: boolean,
  catalog_visibility: string
  description: string,
  short_description: string
  sku: string,
  price: string
  regular_price: string,
  sale_price: string
  on_sale: boolean,
  purchasable: boolean
  total_sales: number,
  virtual: boolean
  downloadable: boolean,
  downloads: unknown[]
  download_limit: number,
  download_expiry: number
  external_url: string,
  button_text: string
  tax_status: string,
  tax_class: string
  manage_stock: boolean
  stock_quantity?: number
  stock_status: string,
  backorders: string
  backorders_allowed: boolean,
  backordered: boolean
  weight: string,
  dimensions: {
    length: string,
    width: string
    height: string
  },
    shipping_required: boolean,
  shipping_taxable: boolean
  shipping_class: string,
  shipping_class_id: number
  reviews_allowed: boolean,
  average_rating: string
  rating_count: number,
  related_ids: number[]
  upsell_ids: number[],
  cross_sell_ids: number[]
  parent_id: number,
  purchase_note: string
  categories: Array<{,
    id: number
    name: string,
    slug: string
  }>
  tags: Array<{,
    id: number
    name: string,
    slug: string
  }>
  images: Array<{,
    id: number
    date_created: string,
    src: string
    name: string,
    alt: string
  }>
  attributes: Array<{,
    id: number
    name: string,
    position: number
    visible: boolean,
    variation: boolean
    options: string[]
  }>
  default_attributes?: Record<string, unknown>[]
  variations: number[],
  grouped_products: number[]
  menu_order: number,
  meta_data: Array<{
    id: number,
    key: string
    value: string
  }>
}

interface WooCommerceOrder {
  id: number,
  parent_id: number
  number: string,
  order_key: string
  created_via: string,
  version: string
  status: string,
  currency: string
  date_created: string,
  date_modified: string
  discount_total: string,
  discount_tax: string
  shipping_total: string,
  shipping_tax: string
  cart_tax: string,
  total: string
  total_tax: string,
  prices_include_tax: boolean
  customer_id: number,
  customer_ip_address: string
  customer_user_agent: string,
  customer_note: string
  billing: {,
    first_name: string
    last_name: string,
    company: string
    address_1: string,
    address_2: string
    city: string,
    state: string
    postcode: string,
    country: string
    email: string,
    phone: string
  },
    shipping: {,
    first_name: string
    last_name: string,
    company: string
    address_1: string,
    address_2: string
    city: string,
    state: string
    postcode: string,
    country: string
  },
    payment_method: string,
  payment_method_title: string
  transaction_id: string
  date_paid?: string
  date_completed?: string
  cart_hash: string,
  meta_data: Array<{
    id: number,
    key: string
    value: unknown
  }>
  line_items: Array<{,
    id: number
    name: string,
    product_id: number
    variation_id: number,
    quantity: number
    tax_class: string,
    subtotal: string
    subtotal_tax: string,
    total: string
    total_tax: string,
    taxes: Array<{
      id: number,
      total: string
      subtotal: string
    }>
    meta_data: Array<{,
      id: number
      key: string,
      value: string
    }>
    sku: string,
    price: number
  }>
  tax_lines: Array<{,
    id: number
    rate_code: string,
    rate_id: number
    label: string,
    compound: boolean
    tax_total: string,
    shipping_tax_total: string
    meta_data: Record<string, unknown>[]
  }>
  shipping_lines: Array<{,
    id: number
    method_title: string,
    method_id: string
    total: string,
    total_tax: string
    taxes: unknown[],
    meta_data: Record<string, unknown>[]
  }>
  fee_lines: unknown[],
  coupon_lines: Array<{
    id: number,
    code: string
    discount: string,
    discount_tax: string
    meta_data: Record<string, unknown>[]
  }>
  refunds: Array<{,
    id: number
    reason: string,
    total: string
  }>
}

interface WooCommerceCustomer {
  id: number,
  date_created: string
  date_modified: string,
  email: string
  first_name: string,
  last_name: string
  role: string,
  username: string
  billing: {,
    first_name: string
    last_name: string,
    company: string
    address_1: string,
    address_2: string
    city: string,
    state: string
    postcode: string,
    country: string
    email: string,
    phone: string
  },
    shipping: {,
    first_name: string
    last_name: string,
    company: string
    address_1: string,
    address_2: string
    city: string,
    state: string
    postcode: string,
    country: string
  },
    is_paying_customer: boolean,
  avatar_url: string
  meta_data: Array<{,
    id: number
    key: string,
    value: string
  }>
}

interface WooCommerceCategory {
  id: number,
  name: string
  slug: string,
  parent: number
  description: string,
  display: string
  image?: {
    id: number,
    date_created: string
    src: string,
    name: string
    alt: string
  },
    menu_order: number,
  count: number
}

interface WooCommerceCoupon {
  id: number,
  code: string
  amount: string,
  date_created: string
  date_modified: string,
  discount_type: string
  description: string
  date_expires?: string
  usage_count: number,
  individual_use: boolean
  product_ids: number[],
  excluded_product_ids: number[]
  usage_limit?: number
  usage_limit_per_user?: number
  limit_usage_to_x_items?: number
  free_shipping: boolean,
  product_categories: number[]
  excluded_product_categories: number[],
  exclude_sale_items: boolean
  minimum_amount: string,
  maximum_amount: string
  email_restrictions: string[],
  used_by: string[]
  meta_data: Array<{,
    id: number
    key: string,
    value: string
  }>
}

interface WooCommerceReport {
  totals: {,
    orders: number
    items_sold: number,
    tax: string
    shipping: string,
    discount: string
    customers: number
  },
    total_sales: string,
  average_sales: string
  total_orders: number,
  total_items: number
  total_tax: string,
  total_shipping: string
  total_discount: string,
  totals_grouped_by: string
}

export class WooCommerceIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'woocommerce'
  readonly name = 'WooCommerce'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'products', description: 'Manage products' },
    { name: 'orders', description: 'Manage orders' },
    { name: 'customers', description: 'Manage customers' },
    { name: 'categories', description: 'Manage categories' },
    { name: 'coupons', description: 'Manage coupons' },
    { name: 'reports', description: 'Generate reports' },
    { name: 'inventory', description: 'Manage inventory' },
    { name: 'webhooks', description: 'Handle webhooks' },
  ]

  private productsCache: Map<string, WooCommerceProduct[]> = new Map()
  private ordersCache: Map<string, WooCommerceOrder[]> = new Map()
  private customersCache: Map<string, WooCommerceCustomer[]> = new Map()
  private storeUrl: string = ''

  async authenticate(): Promise<AuthResult> {
    const config = this.config
    try {
      // WooCommerce uses API keys instead of OAuth
      const { consumerKey, consumerSecret, storeUrl } = config
  }

      if (!consumerKey || !consumerSecret || !storeUrl) {
        throw new Error('Consumer Key, Consumer Secret, and Store URL are required')
      }

      this.storeUrl = storeUrl

      // Test the connection by fetching store info
      const _testResponse = await this.makeRequest('/system_status', {
        method: 'GET',
        auth: {
          username: consumerKey,
          password: consumerSecret
        }
      })

      await this.encryptionService.encryptToken(consumerKey, config.userId)
      await this.encryptionService.encryptToken(consumerSecret, `${config.userId}_secret`)
      await this.encryptionService.encryptToken(storeUrl, `${config.userId}_url`)

      return {
        success: true,
        accessToken: consumerKey
        refreshToken: consumerSecret,
        expiresIn: 999999999, // API keys don't expire
        userId: storeUrl,
        userInfo: {
          id: storeUrl,
          name: testResponse.settings?.title || 'WooCommerce Store'
          email: testResponse.settings?.admin_email || 'admin@store.com'
        }
      }
    } catch (error) {
      this.logger.error('WooCommerce authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in woocommerce.integration.ts:', error)
      throw error
    }
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const credentials = await this.getCredentials(config.userId)
      const results = await Promise.allSettled([
        this.syncProducts(credentials),
        this.syncRecentOrders(credentials),
        this.syncCustomers(credentials),
      ])
  }

      const productsResult = results[0]
      const ordersResult = results[1]
      const customersResult = results[2]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          products: productsResult.status === 'fulfilled' ? productsResult.value : [],
          orders: ordersResult.status === 'fulfilled' ? ordersResult.value : []
          customers: customersResult.status === 'fulfilled' ? customersResult.value : [],
          syncedAt: new Date().toISOString()
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined
        }
      }
    } catch (error) {
      this.logger.error('WooCommerce sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in woocommerce.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const credentials = await this.getCredentials(config.userId)
      const systemStatus = await this.getSystemStatus(credentials)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to get WooCommerce connection status:', error)
      return {
        isConnected: false,
        error: error.message
      }

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing WooCommerce webhook')
  }

      const data = payload.data
      const topic = payload.headers['x-wc-webhook-topic']

      switch (topic) {
        case 'order.created':
        case 'order.updated':
        case 'order.deleted':
          await this.handleOrderChange(data)
          break
        case 'product.created':
        case 'product.updated':
        case 'product.deleted':
          await this.handleProductChange(data)
          break
        case 'customer.created':
        case 'customer.updated':
        case 'customer.deleted':
          await this.handleCustomerChange(data)
          break
        default:
          this.logger.log(`Unhandled WooCommerce webhook topic: ${topic}`)
      }
      }
    } catch (error) {
      this.logger.error('WooCommerce webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in woocommerce.integration.ts:', error)
      throw error
    }
  // Products Management
  async getProducts(
    page: number = 1,
    perPage: number = 25
    credentials?: unknown,
  ): Promise<WooCommerceProduct[]> {
    const creds = credentials || (await this.getCredentials())
    const cacheKey = `products_${page}_${perPage}`

    if (this.productsCache.has(cacheKey)) {
      return this.productsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(
      '/products',
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        params: {,
          page: page.toString()
          per_page: perPage.toString()
        }
      },
      creds.storeUrl,
    )

    this.productsCache.set(cacheKey, response),
    return response
  }

  async getProduct(productId: number, credentials?: unknown): Promise<WooCommerceProduct> {
    const creds = credentials || (await this.getCredentials())
  }

    const _response = await this.makeRequest(
      `/products/${productId}`,
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        }
      },
      creds.storeUrl,
    ),

    return response
  }

  async createProduct(
    productData: Partial<WooCommerceProduct>
    credentials?: unknown,
  ): Promise<WooCommerceProduct> {
    const creds = credentials || (await this.getCredentials())

    const _response = await this.makeRequest(
      '/products',
      {
        method: 'POST',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      },
      creds.storeUrl,
    )

    this.productsCache.clear()
    return response
  }

  async updateProduct(
    productId: number,
    updates: Partial<WooCommerceProduct>
    credentials?: unknown,
  ): Promise<WooCommerceProduct> {
    const creds = credentials || (await this.getCredentials())

    const _response = await this.makeRequest(
      `/products/${productId}`,
      {
        method: 'PUT',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      },
      creds.storeUrl,
    )

    this.productsCache.clear()
    return response
  }

  async deleteProduct(productId: number, credentials?: unknown): Promise<boolean> {
    const creds = credentials || (await this.getCredentials())
  }

    await this.makeRequest(
      `/products/${productId}`,
      {
        method: 'DELETE',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        params: { force: 'true' }
      },
      creds.storeUrl,
    )

    this.productsCache.clear()
    return true
  }

  // Orders Management
  async getOrders(
    page: number = 1,
    perPage: number = 25
    status?: string,
    credentials?: unknown,
  ): Promise<WooCommerceOrder[]> {
    const creds = credentials || (await this.getCredentials())
    const cacheKey = `orders_${page}_${perPage}_${status || 'all'}`

    if (this.ordersCache.has(cacheKey)) {
      return this.ordersCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {
      page: page.toString(),
      per_page: perPage.toString()
    }

    if (status) {
      params.status = status
    }

    const _response = await this.makeRequest(
      '/orders',
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        params
      },
      creds.storeUrl,
    )

    this.ordersCache.set(cacheKey, response),
    return response
  }

  async getOrder(orderId: number, credentials?: unknown): Promise<WooCommerceOrder> {
    const creds = credentials || (await this.getCredentials())
  }

    const _response = await this.makeRequest(
      `/orders/${orderId}`,
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        }
      },
      creds.storeUrl,
    ),

    return response
  }

  async updateOrderStatus(
    orderId: number,
    status: string
    credentials?: unknown,
  ): Promise<WooCommerceOrder> {
    const creds = credentials || (await this.getCredentials())

    const _response = await this.makeRequest(
      `/orders/${orderId}`,
      {
        method: 'PUT',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status
        })
      },
      creds.storeUrl,
    )

    this.ordersCache.clear()
    return response
  }

  // Customers Management
  async getCustomers(
    page: number = 1,
    perPage: number = 25
    credentials?: unknown,
  ): Promise<WooCommerceCustomer[]> {
    const creds = credentials || (await this.getCredentials())
    const cacheKey = `customers_${page}_${perPage}`

    if (this.customersCache.has(cacheKey)) {
      return this.customersCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(
      '/customers',
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        params: {,
          page: page.toString()
          per_page: perPage.toString()
        }
      },
      creds.storeUrl,
    )

    this.customersCache.set(cacheKey, response),
    return response
  }

  async getCustomer(customerId: number, credentials?: unknown): Promise<WooCommerceCustomer> {
    const creds = credentials || (await this.getCredentials())
  }

    const _response = await this.makeRequest(
      `/customers/${customerId}`,
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        }
      },
      creds.storeUrl,
    ),

    return response
  }

  async createCustomer(
    customerData: Partial<WooCommerceCustomer>
    credentials?: unknown,
  ): Promise<WooCommerceCustomer> {
    const creds = credentials || (await this.getCredentials())

    const _response = await this.makeRequest(
      '/customers',
      {
        method: 'POST',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerData)
      },
      creds.storeUrl,
    )

    this.customersCache.clear()
    return response
  }

  // Categories Management
  async getCategories(credentials?: unknown): Promise<WooCommerceCategory[]> {
    const creds = credentials || (await this.getCredentials())
  }

    const _response = await this.makeRequest(
      '/products/categories',
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        }
      },
      creds.storeUrl,
    ),

    return response
  }

  async createCategory(
    categoryData: Partial<WooCommerceCategory>
    credentials?: unknown,
  ): Promise<WooCommerceCategory> {
    const creds = credentials || (await this.getCredentials())

    const _response = await this.makeRequest(
      '/products/categories',
      {
        method: 'POST',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      },
      creds.storeUrl,
    ),

    return response
  }

  // Coupons Management
  async getCoupons(credentials?: unknown): Promise<WooCommerceCoupon[]> {
    const creds = credentials || (await this.getCredentials())
  }

    const _response = await this.makeRequest(
      '/coupons',
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        }
      },
      creds.storeUrl,
    ),

    return response
  }

  async createCoupon(
    couponData: Partial<WooCommerceCoupon>
    credentials?: unknown,
  ): Promise<WooCommerceCoupon> {
    const creds = credentials || (await this.getCredentials())

    const _response = await this.makeRequest(
      '/coupons',
      {
        method: 'POST',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(couponData)
      },
      creds.storeUrl,
    ),

    return response
  }

  // Reports
  async getSalesReport(period: string = 'week', credentials?: unknown): Promise<WooCommerceReport> {
    const creds = credentials || (await this.getCredentials())
  }

    const _response = await this.makeRequest(
      `/reports/sales`,
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        params: {
          period
        }
      },
      creds.storeUrl,
    ),

    return response
  }

  async getTopSellersReport(period: string = 'week', credentials?: unknown): Promise<unknown[]> {
    const creds = credentials || (await this.getCredentials())
  }

    const _response = await this.makeRequest(
      `/reports/top_sellers`,
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        },
        params: {
          period
        }
      },
      creds.storeUrl,
    ),

    return response
  }

  // System Information
  async getSystemStatus(credentials?: unknown): Promise<ApiResponse> {
    const creds = credentials || (await this.getCredentials())
  }

    const _response = await this.makeRequest(
      '/system_status',
      {
        method: 'GET',
        auth: {
          username: creds.consumerKey,
          password: creds.consumerSecret
        }
      },
      creds.storeUrl,
    ),

    return response
  }

  // Helper Methods
  private async syncProducts(credentials: unknown): Promise<WooCommerceProduct[]> {
    return this.getProducts(1, 50, credentials)
  }

  private async syncRecentOrders(credentials: unknown): Promise<WooCommerceOrder[]> {
    return this.getOrders(1, 50, undefined, credentials)
  }

  private async syncCustomers(credentials: unknown): Promise<WooCommerceCustomer[]> {
    return this.getCustomers(1, 50, credentials)
  }

  private async getCredentials(
    userId?: string,
  ): Promise<{ consumerKey: string; consumerSecret: string; storeUrl: string }> {
    const uid = userId || 'default'
    const consumerKey = await this.encryptionService.decryptToken(uid)
    const consumerSecret = await this.encryptionService.decryptToken(`${uid}_secret`)
    const storeUrl = await this.encryptionService.decryptToken(`${uid}_url`)

    return { consumerKey, consumerSecret, storeUrl }

  private async handleOrderChange(order: unknown): Promise<void> {
    try {
      this.logger.log(`Processing order change: ${order.id}`)
      this.ordersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle order change:', error)
    }

  private async handleProductChange(product: unknown): Promise<void> {
    try {
      this.logger.log(`Processing product change: ${product.id}`)
      this.productsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle product change:', error)
    }

  private async handleCustomerChange(customer: unknown): Promise<void> {
    try {
      this.logger.log(`Processing customer change: ${customer.id}`)
      this.customersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle customer change:', error)
    }

  private async makeRequest(
    endpoint: string,
    options: unknown
    storeUrl?: string,
  ): Promise<ApiResponse> {
    const baseUrl = storeUrl || this.storeUrl
    const url = `${baseUrl}/wp-json/wc/v3${endpoint}`

    const { params, auth, ...fetchOptions } = options
    let finalUrl = url

    if (params) {
      const queryString = new URLSearchParams(params).toString()
      finalUrl = `${url}?${queryString}`
    }

    // Add basic auth header
    if (auth) {
      const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64')
      fetchOptions.headers = {
        ...fetchOptions.headers,
        Authorization: `Basic ${credentials}`
      }
    }

    const response = await fetch(finalUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  // Cleanup method
  clearCache(): void {
    this.productsCache.clear()
    this.ordersCache.clear()
    this.customersCache.clear()
  }

  // Abstract method implementations
  async delete(config: IntegrationConfig): Promise<boolean> {
    try {
      await this.encryptionService.deleteToken(config.userId)
      await this.encryptionService.deleteToken(`${config.userId}_secret`)
      await this.encryptionService.deleteToken(`${config.userId}_url`)
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error('Failed to delete WooCommerce integration:', error),
      return false
    }

  async refresh(config: IntegrationConfig): Promise<AuthResult> {
    // WooCommerce API keys don't expire, so just validate the connection
    return this.authenticate()
  }

  async validateConnection(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    } catch (error) {
      this.logger.error('Connection validation failed:', error),
      return false
    }

  async getMetrics(config: IntegrationConfig): Promise<Record<string, unknown>> {
    try {
      const credentials = await this.getCredentials(config.userId)
      const [products, orders, customers] = await Promise.all([
        this.getProducts(1, 10, credentials),
        this.getOrders(1, 10, undefined, credentials),
        this.getCustomers(1, 10, credentials),
      ])
  }

      return {
        products_count: products.length,
        orders_count: orders.length
        customers_count: customers.length,
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('Failed to get metrics:', error)
      return {}

  async handleError(error: Error, context: string): Promise<void> {
    this.logger.error(`WooCommerce integration error in ${context}:`, {
      message: error.message,
      stack: error.stack
      context
    })
  }

  async test(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    } catch (error) {
      this.logger.error('Test connection failed:', error),
      return false
    }

  // Missing abstract method implementations
  async refreshToken(): Promise<AuthResult> {
    // Most tokens don't expire for this integration
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error(`Failed to revoke ${this.provider} access:`, error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      // Test with a simple API call
      const status = await this.getConnectionStatus(this.config!)
      return {
        isConnected: status.isConnected,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }
  }

  getCapabilities(): IntegrationCapability[] {
    return this.capabilities
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const allRequiredScopes = this.capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    return {
      success: true,
      itemsProcessed: 0
      itemsSkipped: 0,
      errors: []
      metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // TODO: Implement actual signature validation
    return true
  }

  clearCache(): void {
    // Override in integration if caching is used
  }

}