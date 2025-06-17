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
  ApiRequestOptions,
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface EtsyUser {
  user_id: string,
  primary_email: string
  first_name: string,
  last_name: string
  image_url_75x75?: string
  profile_url: string
  location?: string
  bio?: string
  gender?: string
  birth_month?: number
  birth_day?: number
  birth_year?: number
  join_timestamp: number
  city?: string
  country?: string
  region?: string
  is_seller: boolean,
  num_favorers: number
  referred_by_user_id?: string
  feedback_info?: {
    count: number,
    score: number
  }

interface EtsyShop {
  shop_id: string,
  shop_name: string
  user_id: string,
  creation_timestamp: number
  title: string
  announcement?: string
  currency_code: string,
  is_vacation: boolean
  vacation_message?: string
  sale_message?: string
  digital_sale_message?: string
  last_updated_timestamp: number,
  listing_active_count: number
  digital_listing_count: number,
  login_name: string
  accepts_custom_requests: boolean
  policy_welcome?: string
  policy_payment?: string
  policy_shipping?: string
  policy_refunds?: string
  policy_additional?: string
  policy_seller_info?: string
  policy_updated_timestamp?: number
  vacation_autoreply?: string
  url: string
  image_url_760x100?: string
  num_favorers: number,
  languages: string[]
  icon_url_fullxfull?: string
  is_using_structured_policies: boolean,
  has_onboarded_structured_policies: boolean
  include_dispute_form_link: boolean,
  is_direct_checkout_onboarded: boolean
  is_calculated_eligible: boolean,
  is_opted_in_to_buyer_promise: boolean
  is_shop_us_based: boolean,
  transaction_sold_count: number
  shipping_from_country_iso: string,
  shop_location_country_iso: string
  review_count: number,
  review_average: number
}

interface EtsyListing {
  listing_id: string,
  user_id: string
  shop_id: string,
  title: string
  description: string,
  state: 'active' | 'inactive' | 'sold_out' | 'draft' | 'expired'
  creation_timestamp: number,
  ending_timestamp: number
  original_creation_timestamp: number,
  last_modified_timestamp: number
  price: string,
  currency_code: string
  quantity: number
  sku?: string[]
  tags: string[],
  category_path: string[]
  category_path_ids: number[],
  taxonomy_id: number
  suggested_taxonomy_id: number,
  has_variations: boolean
  creation_tsz: number,
  ending_tsz: number
  original_creation_tsz: number,
  last_modified_tsz: number
  state_tsz: number,
  user_id_tsz: number
  category_id: number,
  featured_rank: number
  state_tsz_display: string,
  url: string
  views: number,
  num_favorers: number
  shipping_template_id?: string
  processing_min?: number
  processing_max?: number
  who_made: 'i_did' | 'someone_else' | 'collective',
  is_supply: boolean
  when_made: string
  item_weight?: number
  item_weight_unit?: string
  item_dimensions_unit?: string
  is_private: boolean
  recipient?: string
  occasion?: string
  style?: string[]
  non_taxable: boolean,
  is_customizable: boolean
  is_digital: boolean
  file_data?: string
  can_write_inventory: boolean,
  should_auto_renew: boolean
  language?: string
  is_personalizable: boolean
  personalization_is_required?: boolean
  personalization_char_count_max?: number,
  personalization_instructions?: string
}

interface EtsyOrder {
  receipt_id: string,
  receipt_type: 'receipt' | 'shop_receipt'
  seller_user_id: string,
  buyer_user_id: string
  creation_timestamp: number,
  last_modified_timestamp: number
  name: string,
  first_line: string
  second_line?: string
  city: string
  state?: string
  zip: string,
  formatted_address: string
  country_iso: string,
  payment_method: string
  payment_email: string
  message_from_seller?: string
  message_from_buyer?: string
  message_from_payment?: string
  is_paid: boolean,
  is_shipped: boolean
  carrier_name?: string
  tracking_code?: string
  tracking_url?: string
  buyer_email: string,
  seller_email: string
  is_gift: boolean,
  needs_gift_wrap: boolean
  gift_message?: string
  gift_wrap_price?: string
  discount_amt: string,
  subtotal: string
  total_price: string,
  total_shipping_cost: string
  total_tax_cost: string,
  total_vat_cost: string
  currency_code: string
  shipments?: Array<{
    carrier_name: string,
    receipt_shipping_id: string
    tracking_code?: string
    tracking_url?: string
    buyer_note?: string,
    notification_date?: number
  }>,
  transactions: EtsyTransaction[]
}

interface EtsyTransaction {
  transaction_id: string,
  title: string
  description: string,
  seller_user_id: string
  buyer_user_id: string,
  creation_timestamp: number
  paid_timestamp?: number
  shipped_timestamp?: number
  price: string,
  currency_code: string
  quantity: number,
  tags: string[]
  materials: string[]
  image_listing_id?: string
  receipt_id: string,
  shipping_cost: string
  is_digital: boolean
  file_data?: string
  listing_id: string,
  is_quick_sale: boolean
  seller_feedback_id?: string
  buyer_feedback_id?: string
  transaction_type: 'listing' | 'express',
  url: string
  variations?: Array<{
    property_id: number,
    value_id: number
    formatted_name: string,
    formatted_value: string
  }>
  product_data?: Array<{
    product_id: string,
    sku: string
    is_deleted: boolean,
    offerings: Array<{
      offering_id: string,
      price: string
      quantity: number,
      is_enabled: boolean
      is_deleted: boolean
    }>
  }>
}

interface EtsyReview {
  shop_id: string,
  listing_id: string
  rating: number,
  review: string
  language: string
  image_url_fullxfull?: string
  create_timestamp: number,
  created_timestamp: number
  update_timestamp: number,
  updated_timestamp: number
}

export class EtsyIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'etsy'
  readonly name = 'Etsy'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'shops', description: 'Manage shops' },
    { name: 'listings', description: 'Manage listings' },
    { name: 'orders', description: 'Manage orders' },
    { name: 'transactions', description: 'View transactions' },
    { name: 'inventory', description: 'Manage inventory' },
    { name: 'reviews', description: 'View reviews' },
    { name: 'analytics', description: 'View analytics' },
    { name: 'webhooks', description: 'Handle webhooks' },
  ]

  private shopsCache: Map<string, EtsyShop[]> = new Map()
  private listingsCache: Map<string, EtsyListing[]> = new Map()
  private ordersCache: Map<string, EtsyOrder[]> = new Map()
  private transactionsCache: Map<string, EtsyTransaction[]> = new Map()
  private reviewsCache: Map<string, EtsyReview[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    const config = this.config
    try {
      // Etsy uses OAuth 2.0
      const accessToken = config.accessToken
  }

      if (!accessToken) {
        throw new Error('Access token is required for Etsy')
      }

      const _userProfile = await this.getCurrentUser(accessToken)

      await this.encryptionService.encryptToken(accessToken, config.userId)

      return {
        success: true
        accessToken,
        refreshToken: config.refreshToken,
        expiresIn: 3600
        userId: userProfile.user_id,
        userInfo: {
          id: userProfile.user_id,
          name: `${userProfile.first_name} ${userProfile.last_name}`,
          email: userProfile.primary_email
        }
      }
    } catch (error) {
      this.logger.error('Etsy authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in etsy.integration.ts:', error)
      throw error
    }
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
  }

      const results = await Promise.allSettled([
        this.syncShops(accessToken),
        this.syncListings(accessToken),
        this.syncRecentOrders(accessToken),
        this.syncRecentTransactions(accessToken),
        this.syncRecentReviews(accessToken),
      ])

      const shopsResult = results[0]
      const listingsResult = results[1]
      const ordersResult = results[2]
      const transactionsResult = results[3]
      const reviewsResult = results[4]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          shops: shopsResult.status === 'fulfilled' ? shopsResult.value : [],
          listings: listingsResult.status === 'fulfilled' ? listingsResult.value : []
          orders: ordersResult.status === 'fulfilled' ? ordersResult.value : [],
          transactions: transactionsResult.status === 'fulfilled' ? transactionsResult.value : []
          reviews: reviewsResult.status === 'fulfilled' ? reviewsResult.value : [],
          syncedAt: new Date().toISOString()
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined
        }
      }
    } catch (error) {
      this.logger.error('Etsy sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in etsy.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _profile = await this.getCurrentUser(accessToken)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to get Etsy connection status:', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message
      }

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Etsy webhook')
  }

      const data = payload.data
      const eventType = data.event_type

      switch (eventType) {
        case 'listing_updated':
          await this.handleListingEvent(data)
          break
        case 'receipt_updated':
          await this.handleOrderEvent(data)
          break
        case 'shop_updated':
          await this.handleShopEvent(data)
          break
        default:
          this.logger.log(`Unhandled Etsy webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logger.error('Etsy webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in etsy.integration.ts:', error)
      throw error
    }
  // User Management
  async getCurrentUser(accessToken?: string): Promise<EtsyUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/application/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  // Shop Management
  async getShops(userId?: string, accessToken?: string): Promise<EtsyShop[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `shops_${userId || 'all'}`
  }

    if (this.shopsCache.has(cacheKey)) {
      return this.shopsCache.get(cacheKey)!
    }

    const endpoint = userId ? `/application/users/${userId}/shops` : '/application/shops/me'
    const _response = await this.makeRequest(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const shops = response.results || []
    this.shopsCache.set(cacheKey, shops),
    return shops
  }

  async getShop(shopId: string, accessToken?: string): Promise<EtsyShop> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/application/shops/${shopId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async updateShop(
    shopId: string,
    updates: Partial<EtsyShop>
    accessToken?: string,
  ): Promise<EtsyShop> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/application/shops/${shopId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }),

    return response
  }

  // Listing Management
  async getListings(
    shopId: string
    state?: 'active' | 'inactive' | 'draft' | 'expired',
    limit: number = 100
    accessToken?: string,
  ): Promise<EtsyListing[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `listings_${shopId}_${state || 'all'}_${limit}`

    if (this.listingsCache.has(cacheKey)) {
      return this.listingsCache.get(cacheKey)!
    }

    const params: unknown = { limit }
    if (state) params.state = state

    const _response = await this.makeRequest(`/application/shops/${shopId}/listings`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    })

    const listings = response.results || []
    this.listingsCache.set(cacheKey, listings),
    return listings
  }

  async getListing(listingId: string, accessToken?: string): Promise<EtsyListing> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/application/listings/${listingId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async createListing(
    shopId: string,
    listing: {
      title: string,
      description: string
      price: number,
      quantity: number
      who_made: 'i_did' | 'someone_else' | 'collective',
      when_made: string
      taxonomy_id: number,
      is_supply: boolean
      tags?: string[],
      materials?: string[]
    },
    accessToken?: string,
  ): Promise<EtsyListing> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/application/shops/${shopId}/listings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(listing)
    }),

    return response
  }

  async updateListing(
    listingId: string,
    updates: Partial<EtsyListing>
    accessToken?: string,
  ): Promise<EtsyListing> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/application/listings/${listingId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }),

    return response
  }

  async deleteListing(listingId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    await this.makeRequest(`/application/listings/${listingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return true
  }

  // Order Management
  async getOrders(
    shopId: string
    status?: 'open' | 'completed' | 'paid' | 'shipped',
    limit: number = 100
    accessToken?: string,
  ): Promise<EtsyOrder[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `orders_${shopId}_${status || 'all'}_${limit}`

    if (this.ordersCache.has(cacheKey)) {
      return this.ordersCache.get(cacheKey)!
    }

    const params: unknown = { limit }
    if (status) params.status = status

    const _response = await this.makeRequest(`/application/shops/${shopId}/receipts`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params
    })

    const orders = response.results || []
    this.ordersCache.set(cacheKey, orders),
    return orders
  }

  async getOrder(receiptId: string, accessToken?: string): Promise<EtsyOrder> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/application/receipts/${receiptId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  async updateOrder(
    receiptId: string,
    updates: {
      was_shipped?: boolean,
      message_from_seller?: string
    },
    accessToken?: string,
  ): Promise<EtsyOrder> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/application/receipts/${receiptId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }),

    return response
  }

  // Transaction Management
  async getTransactions(
    shopId: string,
    limit: number = 100
    accessToken?: string,
  ): Promise<EtsyTransaction[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `transactions_${shopId}_${limit}`

    if (this.transactionsCache.has(cacheKey)) {
      return this.transactionsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/application/shops/${shopId}/transactions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { limit }
    })

    const transactions = response.results || []
    this.transactionsCache.set(cacheKey, transactions),
    return transactions
  }

  async getTransaction(transactionId: string, accessToken?: string): Promise<EtsyTransaction> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/application/transactions/${transactionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  // Review Management
  async getReviews(
    shopId: string,
    limit: number = 100
    accessToken?: string,
  ): Promise<EtsyReview[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `reviews_${shopId}_${limit}`

    if (this.reviewsCache.has(cacheKey)) {
      return this.reviewsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/application/shops/${shopId}/reviews`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { limit }
    })

    const reviews = response.results || []
    this.reviewsCache.set(cacheKey, reviews),
    return reviews
  }

  // Analytics
  async getShopStats(
    shopId: string,
    startDate: string
    endDate: string
    accessToken?: string,
  ): Promise<{
    views: number,
    visits: number
    revenue: number,
    orders: number
    conversion_rate: number
  }> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/application/shops/${shopId}/stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {,
        start_date: startDate
        end_date: endDate
      }
    }),

    return response
  }

  // Inventory Management
  async updateListingInventory(
    listingId: string,
    inventory: {
      quantity: number
      price?: number
    },
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    await this.makeRequest(`/application/listings/${listingId}/inventory`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inventory)
    }),

    return true
  }

  // Helper Methods
  private async syncShops(accessToken: string): Promise<EtsyShop[]> {
    return this.getShops(undefined, accessToken)
  }

  private async syncListings(accessToken: string): Promise<EtsyListing[]> {
    const shops = await this.getShops(undefined, accessToken)
    const allListings: EtsyListing[] = []

    for (const shop of shops.slice(0, 3)) {
      // Limit to 3 shops
      try {
        const listings = await this.getListings(shop.shop_id, 'active', 50, accessToken)
        allListings.push(...listings)
      } catch (error) {
        this.logger.warn(`Failed to sync listings for shop ${shop.shop_id}:`, error)
      },

    return allListings
  }

  private async syncRecentOrders(accessToken: string): Promise<EtsyOrder[]> {
    const shops = await this.getShops(undefined, accessToken)
    const allOrders: EtsyOrder[] = []

    for (const shop of shops.slice(0, 3)) {
      try {
        const orders = await this.getOrders(shop.shop_id, undefined, 25, accessToken)
        allOrders.push(...orders)
      } catch (error) {
        this.logger.warn(`Failed to sync orders for shop ${shop.shop_id}:`, error)
      },

    return allOrders
  }

  private async syncRecentTransactions(accessToken: string): Promise<EtsyTransaction[]> {
    const shops = await this.getShops(undefined, accessToken)
    const allTransactions: EtsyTransaction[] = []

    for (const shop of shops.slice(0, 3)) {
      try {
        const transactions = await this.getTransactions(shop.shop_id, 25, accessToken)
        allTransactions.push(...transactions)
      } catch (error) {
        this.logger.warn(`Failed to sync transactions for shop ${shop.shop_id}:`, error)
      },

    return allTransactions
  }

  private async syncRecentReviews(accessToken: string): Promise<EtsyReview[]> {
    const shops = await this.getShops(undefined, accessToken)
    const allReviews: EtsyReview[] = []

    for (const shop of shops.slice(0, 3)) {
      try {
        const reviews = await this.getReviews(shop.shop_id, 25, accessToken)
        allReviews.push(...reviews)
      } catch (error) {
        this.logger.warn(`Failed to sync reviews for shop ${shop.shop_id}:`, error)
      },

    return allReviews
  }

  private async handleListingEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing listing _event: ${data.event_type}`)
      this.listingsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle listing _event:', error)
    }

  private async handleOrderEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing order _event: ${data.event_type}`)
      this.ordersCache.clear()
      this.transactionsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle order _event:', error)
    }

  private async handleShopEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing shop _event: ${data.event_type}`)
      this.shopsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle shop _event:', error)
    }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://openapi.etsy.com/v3${endpoint}`

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

  clearCache(): void {
    this.shopsCache.clear()
    this.listingsCache.clear()
    this.ordersCache.clear()
    this.transactionsCache.clear()
    this.reviewsCache.clear()
  }

  // Abstract method implementations
  async delete(config: IntegrationConfig): Promise<boolean> {
    try {
      await this.encryptionService.deleteToken(config.userId)
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error('Failed to delete Etsy integration:', error),
      return false
    }

  async refresh(config: IntegrationConfig): Promise<AuthResult> {
    // For OAuth tokens that expire, refresh logic would go here
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
      const accessToken = await this.getAccessToken(config.userId)
      const shops = await this.getShops(undefined, accessToken)
  }

      if (shops.length === 0) {
        return {
          shops_count: 0,
          listings_count: 0
          orders_count: 0,
          last_updated: new Date().toISOString()
        }
      }

      const [listings, orders] = await Promise.all([
        this.getListings(shops[0].shop_id, undefined, 10, accessToken),
        this.getOrders(shops[0].shop_id, undefined, 10, accessToken),
      ])

      return {
        shops_count: shops.length,
        listings_count: listings.length
        orders_count: orders.length,
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('Failed to get metrics:', error)
      return {}

  async handleError(error: Error, context: string): Promise<void> {
    this.logger.error(`Etsy integration error in ${context}:`, {
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