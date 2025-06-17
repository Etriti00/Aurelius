import { User } from '@prisma/client'
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

// Using WebhookPayload from base interface

interface BigCommerceStore {
  id: string,
  uuid: string
  name: string,
  domain: string
  secure_url: string,
  status: string
  created_time: string,
  updated_time: string
  language: string,
  currency: string
  currency_symbol: string,
  decimal_separator: string
  thousands_separator: string,
  decimal_places: number
  currency_symbol_location: string,
  weight_units: string
  dimension_units: string,
  dimension_decimal_places: number
  dimension_decimal_token: string,
  dimension_thousands_token: string
  plan_name: string,
  plan_level: string
  industry: string
  logo?: {
    url: string
  },
    is_price_entered_with_tax: boolean,
  active_comparison_modules: unknown[]
  features: {,
    stencil_enabled: boolean
    sitewidehttps_enabled: boolean,
    facebook_catalog_id: string
    checkout_type: string
  }

interface BigCommerceProduct {
  id: number,
  name: string
  type: 'physical' | 'digital',
  sku: string
  description: string,
  weight: number
  width: number,
  depth: number
  height: number,
  price: number
  cost_price: number,
  retail_price: number
  sale_price: number,
  map_price: number
  tax_class_id: number,
  product_tax_code: string
  calculated_price: number,
  categories: number[]
  brand_id: number
  option_set_id?: number
  option_set_display: string,
  inventory_level: number
  inventory_warning_level: number,
  inventory_tracking: string
  reviews_rating_sum: number,
  reviews_count: number
  total_sold: number,
  fixed_cost_shipping_price: number
  is_free_shipping: boolean,
  is_visible: boolean
  is_featured: boolean,
  related_products: number[]
  warranty: string,
  bin_picking_number: string
  layout_file: string,
  upc: string
  mpn: string,
  gtin: string
  search_keywords: string,
  availability: string
  availability_description: string,
  gift_wrapping_options_type: string
  gift_wrapping_options_list: number[],
  sort_order: number
  condition: string,
  is_condition_shown: boolean
  order_quantity_minimum: number,
  order_quantity_maximum: number
  page_title: string,
  meta_keywords: string[]
  meta_description: string,
  date_created: string
  date_modified: string,
  view_count: number
  preorder_release_date?: string
  preorder_message: string,
  is_preorder_only: boolean
  is_price_hidden: boolean,
  price_hidden_label: string
  custom_url?: {
    url: string,
    is_customized: boolean
  }
  base_variant_id?: number
  open_graph_type: string,
  open_graph_title: string
  open_graph_description: string,
  open_graph_use_meta_description: boolean
  open_graph_use_product_name: boolean,
  open_graph_use_image: boolean
}

interface BigCommerceOrder {
  id: number,
  customer_id: number
  date_created: string,
  date_modified: string
  date_shipped?: string
  status_id: number,
  status: string
  subtotal_ex_tax: string,
  subtotal_inc_tax: string
  subtotal_tax: string,
  base_shipping_cost: string
  shipping_cost_ex_tax: string,
  shipping_cost_inc_tax: string
  shipping_cost_tax: string,
  shipping_cost_tax_class_id: number
  base_handling_cost: string,
  handling_cost_ex_tax: string
  handling_cost_inc_tax: string,
  handling_cost_tax: string
  handling_cost_tax_class_id: number,
  base_wrapping_cost: string
  wrapping_cost_ex_tax: string,
  wrapping_cost_inc_tax: string
  wrapping_cost_tax: string,
  wrapping_cost_tax_class_id: number
  total_ex_tax: string,
  total_inc_tax: string
  total_tax: string,
  items_total: number
  items_shipped: number,
  payment_method: string
  payment_provider_id?: string
  payment_status: string,
  refunded_amount: string
  order_is_digital: boolean,
  store_credit_amount: string
  gift_certificate_amount: string,
  ip_address: string
  geoip_country: string,
  geoip_country_iso2: string
  currency_id: number,
  currency_code: string
  currency_exchange_rate: string,
  default_currency_id: number
  default_currency_code: string
  staff_notes?: string
  customer_message?: string
  discount_amount: string,
  coupon_discount: string
  shipping_address_count: number,
  is_deleted: boolean
  ebay_order_id?: string
  cart_id?: string
  billing_address: BigCommerceAddress,
  is_email_opt_in: boolean
  credit_card_type?: string
  order_source: string,
  channel_id: number
  external_source?: string
  products: {,
    url: string
    resource: string
  },
    shipping_addresses: {,
    url: string
    resource: string
  },
    coupons: {,
    url: string
    resource: string
  }
  external_id?: string
  external_merchant_id?: string
  tax_provider_id?: string,
  customer_locale?: string
}

interface BigCommerceCustomer {
  id: number,
  uuid: string
  email: string,
  first_name: string
  last_name: string,
  company: string
  phone: string,
  date_created: string
  date_modified: string,
  store_credit_amounts: Array<{
    amount: number,
    currency_code: string
  }>
  registration_ip_address: string,
  customer_group_id: number
  notes: string,
  tax_exempt_category: string
  accepts_product_review_abandoned_cart_emails: boolean,
  addresses: {
    url: string,
    resource: string
  },
    attributes: Array<{,
    attribute_id: number
    attribute_value: string,
    date_created: string
    date_modified: string
  }>
  authentication: {,
    force_password_reset: boolean
    new_password?: string
  },
    form_fields: Array<{,
    name: string
    value: string
  }>
  channel_ids: number[],
  origin_channel_id: number
}

interface BigCommerceAddress {
  first_name: string,
  last_name: string
  company: string,
  street_1: string
  street_2: string,
  city: string
  state: string,
  zip: string
  country: string,
  country_iso2: string
  phone: string,
  email: string
  form_fields?: Array<{
    name: string,
    value: string
  }>
}

interface BigCommerceCategory {
  id: number,
  parent_id: number
  name: string,
  description: string
  views: number,
  sort_order: number
  page_title: string,
  meta_keywords: string[]
  meta_description: string,
  layout_file: string
  is_visible: boolean,
  search_keywords: string
  default_product_sort: string
  image_url?: string
  custom_url?: {
    url: string,
    is_customized: boolean
  }

interface BigCommerceBrand {
  id: number,
  name: string
  page_title: string,
  meta_keywords: string[]
  meta_description: string
  image_url?: string
  search_keywords: string
  custom_url?: {
    url: string,
    is_customized: boolean
  }

export class BigCommerceIntegration extends BaseIntegration {
  private readonly logger = console
  readonly provider = 'bigcommerce'
  readonly name = 'BigCommerce'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'products', description: 'Manage products', enabled: true, requiredScopes: [] },
    { name: 'orders', description: 'Manage orders', enabled: true, requiredScopes: [] },
    { name: 'customers', description: 'Manage customers', enabled: true, requiredScopes: [] },
    { name: 'categories', description: 'Manage categories', enabled: true, requiredScopes: [] },
    { name: 'brands', description: 'Manage brands', enabled: true, requiredScopes: [] },
    { name: 'inventory', description: 'Manage inventory', enabled: true, requiredScopes: [] },
    { name: 'analytics', description: 'View analytics', enabled: true, requiredScopes: [] },
    { name: 'webhooks', description: 'Handle webhooks', enabled: true, requiredScopes: [] },
  ]

  private productsCache: Map<string, BigCommerceProduct[]> = new Map()
  private ordersCache: Map<string, BigCommerceOrder[]> = new Map()
  private customersCache: Map<string, BigCommerceCustomer[]> = new Map()
  private categoriesCache: Map<string, BigCommerceCategory[]> = new Map()
  private brandsCache: Map<string, BigCommerceBrand[]> = new Map()

  async authenticate(config?: IntegrationConfig): Promise<AuthResult> {
    if (!config) {
      throw new AuthenticationError('Configuration is required')
    }
    try {
      // BigCommerce uses API token + store hash authentication
      const apiToken = config.apiKey || config.accessToken
      const storeHash = config.apiSecret || config.refreshToken
  }

      if (!apiToken || !storeHash) {
        throw new Error('API token and store hash are required for BigCommerce')
      }

      const _storeInfo = await this.getStoreInfo(apiToken, storeHash)

      await this.encryptionService.encryptToken(apiToken, config.userId)
      await this.encryptionService.encryptToken(storeHash, `${config.userId}_store`)

      return {
        success: true,
        accessToken: apiToken
        refreshToken: storeHash,
        expiresAt: undefined, // API tokens don't expire
      }
    } catch (error) {
      this.logger.error('BigCommerce authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in bigcommerce.integration.ts:', error)
      throw error
    }
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const apiToken = await this.getAccessToken(config.userId)
      const storeHash = await this.getStoreHash(config.userId)
  }

      const results = await Promise.allSettled([
        this.syncProducts(apiToken, storeHash),
        this.syncRecentOrders(apiToken, storeHash),
        this.syncCustomers(apiToken, storeHash),
        this.syncCategories(apiToken, storeHash),
        this.syncBrands(apiToken, storeHash),
      ])

      const productsResult = results[0]
      const ordersResult = results[1]
      const customersResult = results[2]
      const categoriesResult = results[3]
      const brandsResult = results[4]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        itemsProcessed: results.filter(r => r.status === 'fulfilled').length
        itemsSkipped: 0,
        errors: errors.map(e => e.message)
        metadata: {,
          products: productsResult.status === 'fulfilled' ? productsResult.value : []
          orders: ordersResult.status === 'fulfilled' ? ordersResult.value : [],
          customers: customersResult.status === 'fulfilled' ? customersResult.value : []
          categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
          brands: brandsResult.status === 'fulfilled' ? brandsResult.value : []
          syncedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      this.logger.error('BigCommerce sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in bigcommerce.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const apiToken = await this.getAccessToken(config.userId)
      const storeHash = await this.getStoreHash(config.userId)
      const _storeInfo = await this.getStoreInfo(apiToken, storeHash)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to get BigCommerce connection status:', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message
      }

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing BigCommerce webhook')
  }

      const data = payload.data
      const scope = data.scope

      switch (scope) {
        case 'store/product/created':
        case 'store/product/updated':
        case 'store/product/deleted':
          await this.handleProductEvent(data)
          break
        case 'store/order/created':
        case 'store/order/updated':
        case 'store/order/archived':
          await this.handleOrderEvent(data)
          break
        case 'store/customer/created':
        case 'store/customer/updated':
        case 'store/customer/deleted':
          await this.handleCustomerEvent(data)
          break
        default:
          this.logger.log(`Unhandled BigCommerce webhook _event: ${scope}`)
      }
      }
    } catch (error) {
      this.logger.error('BigCommerce webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in bigcommerce.integration.ts:', error)
      throw error
    }
  // Store Management
  async getStoreInfo(apiToken?: string, storeHash?: string): Promise<BigCommerceStore> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())
  }

    const _response = await this.makeRequest(
      '/store',
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      },
      hash,
    ),

    return response
  }

  // Product Management
  async getProducts(
    categoryId?: number,
    brandId?: number,
    limit: number = 250
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceProduct[]> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())
    const cacheKey = `products_${categoryId || 'all'}_${brandId || 'all'}_${limit}`

    if (this.productsCache.has(cacheKey)) {
      return this.productsCache.get(cacheKey)!
    }

    const params: unknown = { limit }
    if (categoryId) params.categories = categoryId
    if (brandId) params.brand_id = brandId

    const _response = await this.makeRequest(
      '/catalog/products',
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        },
        params
      },
      hash,
    )

    const products = response.data || []
    this.productsCache.set(cacheKey, products),
    return products
  }

  async getProduct(
    productId: number
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceProduct> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      `/catalog/products/${productId}`,
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      },
      hash,
    )

    return (response as Response).data
  }

  async createProduct(
    product: {,
      name: string
      type: 'physical' | 'digital',
      sku: string
      description: string,
      price: number
      categories: number[],
      weight: number
      is_visible: boolean
    },
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceProduct> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      '/catalog/products',
      {
        method: 'POST',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(product)
      },
      hash,
    )

    return (response as Response).data
  }

  async updateProduct(
    productId: number,
    updates: Partial<BigCommerceProduct>
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceProduct> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      `/catalog/products/${productId}`,
      {
        method: 'PUT',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      },
      hash,
    )

    return (response as Response).data
  }

  async deleteProduct(productId: number, apiToken?: string, storeHash?: string): Promise<boolean> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())
  }

    await this.makeRequest(
      `/catalog/products/${productId}`,
      {
        method: 'DELETE',
        headers: {
          'X-Auth-Token': token
        }
      },
      hash,
    ),

    return true
  }

  // Order Management
  async getOrders(
    status?: 'pending' | 'shipped' | 'completed',
    limit: number = 250
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceOrder[]> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())
    const cacheKey = `orders_${status || 'all'}_${limit}`

    if (this.ordersCache.has(cacheKey)) {
      return this.ordersCache.get(cacheKey)!
    }

    const params: unknown = { limit }
    if (status) params.status = status

    const _response = await this.makeRequest(
      '/orders',
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        },
        params
      },
      hash,
    )

    const orders = response.data || []
    this.ordersCache.set(cacheKey, orders),
    return orders
  }

  async getOrder(
    orderId: number
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceOrder> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      `/orders/${orderId}`,
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      },
      hash,
    )

    return (response as Response).data
  }

  async updateOrder(
    orderId: number,
    updates: Partial<BigCommerceOrder>
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceOrder> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      `/orders/${orderId}`,
      {
        method: 'PUT',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      },
      hash,
    )

    return (response as Response).data
  }

  // Customer Management
  async getCustomers(
    limit: number = 250
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceCustomer[]> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())
    const cacheKey = `customers_${limit}`

    if (this.customersCache.has(cacheKey)) {
      return this.customersCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(
      '/customers',
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        },
        params: { limit }
      },
      hash,
    )

    const customers = response.data || []
    this.customersCache.set(cacheKey, customers),
    return customers
  }

  async getCustomer(
    customerId: number
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceCustomer> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      `/customers/${customerId}`,
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      },
      hash,
    )

    return (response as Response).data
  }

  async createCustomer(
    customer: {,
      email: string
      first_name: string,
      last_name: string
      company?: string,
      phone?: string
    },
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceCustomer> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      '/customers',
      {
        method: 'POST',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customer)
      },
      hash,
    )

    return (response as Response).data
  }

  // Category Management
  async getCategories(apiToken?: string, storeHash?: string): Promise<BigCommerceCategory[]> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())
    const cacheKey = 'categories_all'
  }

    if (this.categoriesCache.has(cacheKey)) {
      return this.categoriesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(
      '/catalog/categories',
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      },
      hash,
    )

    const categories = response.data || []
    this.categoriesCache.set(cacheKey, categories),
    return categories
  }

  async createCategory(
    category: {,
      name: string
      description?: string
      parent_id?: number,
      is_visible: boolean
    },
    apiToken?: string,
    storeHash?: string,
  ): Promise<BigCommerceCategory> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      '/catalog/categories',
      {
        method: 'POST',
        headers: {
          'X-Auth-Token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(category)
      },
      hash,
    )

    return (response as Response).data
  }

  // Brand Management
  async getBrands(apiToken?: string, storeHash?: string): Promise<BigCommerceBrand[]> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())
    const cacheKey = 'brands_all'
  }

    if (this.brandsCache.has(cacheKey)) {
      return this.brandsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(
      '/catalog/brands',
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        }
      },
      hash,
    )

    const brands = response.data || []
    this.brandsCache.set(cacheKey, brands),
    return brands
  }

  // Analytics
  async getOrderStats(
    startDate: string,
    endDate: string
    apiToken?: string,
    storeHash?: string,
  ): Promise<{
    orders_count: number,
    total_revenue: number
    average_order_value: number
  }> {
    const token = apiToken || (await this.getAccessToken())
    const hash = storeHash || (await this.getStoreHash())

    const _response = await this.makeRequest(
      '/orders/count',
      {
        method: 'GET',
        headers: {
          'X-Auth-Token': token
        },
        params: {,
          min_date_created: startDate
          max_date_created: endDate
        }
      },
      hash,
    ),

    return response
  }

  // Helper Methods
  private async syncProducts(apiToken: string, storeHash: string): Promise<BigCommerceProduct[]> {
    return this.getProducts(undefined, undefined, 100, apiToken, storeHash)
  }

  private async syncRecentOrders(apiToken: string, storeHash: string): Promise<BigCommerceOrder[]> {
    return this.getOrders(undefined, 50, apiToken, storeHash)
  }

  private async syncCustomers(apiToken: string, storeHash: string): Promise<BigCommerceCustomer[]> {
    return this.getCustomers(50, apiToken, storeHash)
  }

  private async syncCategories(
    apiToken: string,
    storeHash: string
  ): Promise<BigCommerceCategory[]> {
    return this.getCategories(apiToken, storeHash)
  }

  private async syncBrands(apiToken: string, storeHash: string): Promise<BigCommerceBrand[]> {
    return this.getBrands(apiToken, storeHash)
  }

  private async handleProductEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing product _event: ${data.scope}`)
      this.productsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle product _event:', error)
    }

  private async handleOrderEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing order _event: ${data.scope}`)
      this.ordersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle order _event:', error)
    }

  private async handleCustomerEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing customer _event: ${data.scope}`)
      this.customersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle customer _event:', error)
    }

  private async makeRequest(
    endpoint: string,
    options: unknown
    storeHash?: string,
  ): Promise<ApiResponse> {
    const hash = storeHash || (await this.getStoreHash())
    const url = `https://api.bigcommerce.com/stores/${hash}/v3${endpoint}`

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

  private async getAccessToken(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for token retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  private async getStoreHash(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for store hash retrieval')
    }
    return this.encryptionService.decryptToken(`${userId}_store`)
  }

  clearCache(): void {
    this.productsCache.clear()
    this.ordersCache.clear()
    this.customersCache.clear()
    this.categoriesCache.clear()
    this.brandsCache.clear()
  }

  // Abstract method implementations
  async delete(config: IntegrationConfig): Promise<boolean> {
    try {
      await this.encryptionService.deleteToken(config.userId)
      await this.encryptionService.deleteToken(`${config.userId}_store`)
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error('Failed to delete BigCommerce integration:', error),
      return false
    }

  async refresh(config: IntegrationConfig): Promise<AuthResult> {
    // API tokens don't expire, so just validate the connection
    return this.authenticate(config)
  }

  async refreshToken(): Promise<AuthResult> {
    // API keys don't expire, so just validate
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
      const _storeInfo = await this.getStoreInfo()
      return {
        isConnected: true,
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
      const apiToken = await this.getAccessToken(config.userId)
      const storeHash = await this.getStoreHash(config.userId)
      const [products, orders, customers] = await Promise.all([
        this.getProducts(undefined, undefined, 10, apiToken, storeHash),
        this.getOrders(undefined, 10, apiToken, storeHash),
        this.getCustomers(10, apiToken, storeHash),
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
    this.logger.error(`BigCommerce integration error in ${context}:`, {
      message: error.message,
      stack: error.stack
      context
    })
  }

  async test(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    }
    }
catch (error) {
  console.error('Error in bigcommerce.integration.ts:', error)
  throw error
}