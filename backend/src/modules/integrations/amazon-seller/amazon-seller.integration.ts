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
  GenericWebhookPayload } from '../../../common/types/integration-types'

interface AmazonSellerProfile {
  sellerId: string,
  marketplaceId: string
  sellerName: string,
  businessType: string
  businessAddress: {,
    name: string
    addressLine1: string
    addressLine2?: string
    city: string,
    stateOrRegion: string
    postalCode: string,
    countryCode: string
  },
    primaryMarketplace: string,
  registeredMarketplaces: string[]
  registrationDate: string
}

interface AmazonProduct {
  asin: string,
  sku: string
  fnsku?: string
  title: string
  description?: string
  brand?: string
  manufacturer?: string
  category: string
  subcategory?: string
  price: {,
    amount: number
    currencyCode: string
  }
  listPrice?: {
    amount: number,
    currencyCode: string
  }
  dimensions?: {
    length: number,
    width: number
    height: number,
    weight: number
    unit: string
  },
    images: Array<{,
    url: string
    variant: string,
    height: number
    width: number
  }>
  status: string,
  fulfillmentChannel: string
  condition: string
  conditionNote?: string
  lastUpdated: string
  salesRank?: number
  buyBoxEligible: boolean,
  attributes: Record<string, string>
}

interface AmazonOrder {
  amazonOrderId: string
  sellerOrderId?: string
  purchaseDate: string,
  lastUpdateDate: string
  orderStatus: string,
  fulfillmentChannel: string
  salesChannel: string
  orderChannel?: string
  shippingAddress?: {
    name: string,
    addressLine1: string
    addressLine2?: string
    addressLine3?: string
    city: string
    county?: string
    district?: string
    stateOrRegion: string
    municipality?: string
    postalCode: string,
    countryCode: string
    phone?: string
  },
    orderTotal: {,
    currencyCode: string
    amount: string
  },
    numberOfItemsShipped: number,
  numberOfItemsUnshipped: number
  paymentExecutionDetail?: Array<{
    payment: {,
      currencyCode: string
      amount: string
    },
    paymentMethod: string
  }>
  paymentMethod: string
  paymentMethodDetails?: string[]
  marketplaceId: string
  shipmentServiceLevelCategory?: string
  orderType: string
  earliestShipDate?: string
  latestShipDate?: string
  earliestDeliveryDate?: string
  latestDeliveryDate?: string
  isBusinessOrder: boolean,
  isPrime: boolean
  isPremiumOrder: boolean,
  isGlobalExpressEnabled: boolean
  replacedOrderId?: string
  isReplacementOrder: boolean
  promiseResponseDueDate?: string
  isEstimatedShipDateSet: boolean,
  isSoldByAB: boolean
  isIBA: boolean
  defaultShipFromLocationAddress?: {
    name: string,
    addressLine1: string
    city: string,
    stateOrRegion: string
    postalCode: string,
    countryCode: string
  }
  buyerRequestedCancel?: {
    isBuyerRequestedCancel: boolean
    buyerCancelReason?: string
  }
  fulfillmentInstruction?: {
    fulfillmentSupplySourceId?: string
  },
    isISPU: boolean,
  isAccessPointOrder: boolean
  marketplaceTaxInfo?: {
    taxClassifications: Array<{,
      name: string
      value: string
    }>
  },
    sellerDisplayName: string
  shippingService?: string
  shippingCategory?: string
  automatedShippingSettings?: {
    hasAutomatedShippingSettings: boolean
    automatedCarrier?: string,
    automatedShipMethod?: string
  }

interface AmazonOrderItem {
  asin: string,
  sellerSKU: string
  orderItemId: string,
  title: string
  quantityOrdered: number
  quantityShipped?: number
  productInfo?: {
    numberOfItems?: number
  }
  pointsGranted?: {
    pointsNumber: number,
    pointsMonetaryValue: {
      currencyCode: string,
      amount: string
    }
  itemPrice?: {
    currencyCode: string,
    amount: string
  }
  shippingPrice?: {
    currencyCode: string,
    amount: string
  }
  itemTax?: {
    currencyCode: string,
    amount: string
  }
  shippingTax?: {
    currencyCode: string,
    amount: string
  }
  shippingDiscount?: {
    currencyCode: string,
    amount: string
  }
  shippingDiscountTax?: {
    currencyCode: string,
    amount: string
  }
  promotionDiscount?: {
    currencyCode: string,
    amount: string
  }
  promotionDiscountTax?: {
    currencyCode: string,
    amount: string
  }
  promotionIds?: string[]
  codFee?: {
    currencyCode: string,
    amount: string
  }
  codFeeDiscount?: {
    currencyCode: string,
    amount: string
  },
    isGift: boolean
  conditionNote?: string
  conditionId?: string
  conditionSubtypeId?: string
  scheduledDeliveryStartDate?: string
  scheduledDeliveryEndDate?: string
  priceDesignation?: string
  taxCollection?: {
    model: string,
    responsibleParty: string
  },
    serialNumberRequired: boolean,
  isTransparency: boolean
  iossNumber?: string
  storeChainStoreId?: string
  deemedResellerCategory: string
  buyerInfo?: {
    buyerEmail?: string
    buyerName?: string
    buyerCounty?: string
    buyerTaxInfo?: {
      taxClassifications: Array<{,
        name: string
        value: string
      }>
    },
    purchaseOrderNumber?: string
  }
  buyerRequestedCancel?: {
    isBuyerRequestedCancel: boolean
    buyerCancelReason?: string
  }

interface AmazonInventory {
  sellerSKU: string,
  fnsku: string
  asin: string,
  condition: string
  totalQuantity: number,
  inStockQuantity: number
  availableQuantity: number,
  fulfillableQuantity: number
  inboundWorkingQuantity: number,
  inboundShippedQuantity: number
  inboundReceivingQuantity: number,
  reservedQuantity: {
    totalReservedQuantity: number,
    pendingCustomerOrderQuantity: number
    pendingTransshipmentQuantity: number,
    fcProcessingQuantity: number
  },
    researchingQuantity: {,
    totalResearchingQuantity: number
    researchingQuantityBreakdown: Array<{,
      name: string
      quantity: number
    }>
  },
    unfulfillableQuantity: {,
    totalUnfulfillableQuantity: number
    customerDamagedQuantity: number,
    warehouseDamagedQuantity: number
    distributorDamagedQuantity: number,
    carrierDamagedQuantity: number
    defectiveQuantity: number,
    expiredQuantity: number
  },
    lastUpdatedTime: string,
  productName: string
  totalSupplyQuantity: number
}

interface AmazonFinancialEvent {
  eventGroupId?: string
  eventGroupStart?: string
  eventGroupEnd?: string
  originalTotal?: {
    currencyCode: string,
    amount: string
  }
  convertedTotal?: {
    currencyCode: string,
    amount: string
  }
  shipmentEventList?: Array<{
    amazonOrderId: string
    sellerOrderId?: string
    marketplaceName: string
    orderChargeList?: Array<{
      chargeType: string,
      chargeAmount: {
        currencyCode: string,
        amount: string
      }>
    orderChargeAdjustmentList?: Array<{
      chargeType: string,
      chargeAmount: {
        currencyCode: string,
        amount: string
      }>
    shipmentFeeList?: Array<{
      feeType: string,
      feeAmount: {
        currencyCode: string,
        amount: string
      }>
    shipmentFeeAdjustmentList?: Array<{
      feeType: string,
      feeAmount: {
        currencyCode: string,
        amount: string
      }>
    orderFeeList?: Array<{
      feeType: string,
      feeAmount: {
        currencyCode: string,
        amount: string
      }>
    orderFeeAdjustmentList?: Array<{
      feeType: string,
      feeAmount: {
        currencyCode: string,
        amount: string
      }>
    directPaymentList?: Array<{
      directPaymentType: string,
      directPaymentAmount: {
        currencyCode: string,
        amount: string
      }>
    postedDate?: string
    shipmentItemList?: Array<{
      sellerSKU: string,
      orderItemId: string
      orderAdjustmentItemId?: string
      quantityShipped: number
      itemChargeList?: Array<{
        chargeType: string,
        chargeAmount: {
          currencyCode: string,
          amount: string
        }>
      itemChargeAdjustmentList?: Array<{
        chargeType: string,
        chargeAmount: {
          currencyCode: string,
          amount: string
        }>
      itemFeeList?: Array<{
        feeType: string,
        feeAmount: {
          currencyCode: string,
          amount: string
        }>
      itemFeeAdjustmentList?: Array<{
        feeType: string,
        feeAmount: {
          currencyCode: string,
          amount: string
        }>
      itemTaxWithheldList?: Array<{
        taxCollectionModel: string,
        taxesWithheld: Array<{
          chargeType: string,
          chargeAmount: {
            currencyCode: string,
            amount: string
          }>
      }>
      promotionList?: Array<{
        promotionType: string,
        promotionId: string
        promotionAmount: {,
          currencyCode: string
          amount: string
        }>
      promotionAdjustmentList?: Array<{
        promotionType: string,
        promotionId: string
        promotionAmount: {,
          currencyCode: string
          amount: string
        }>
      costOfPointsGranted?: {
        currencyCode: string,
        amount: string
      }
      costOfPointsReturned?: {
        currencyCode: string,
        amount: string
      }>
  }>
}

export class AmazonSellerIntegration extends BaseIntegration {
  readonly provider = 'amazon-seller'
  readonly name = 'Amazon Seller Central'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'orders',
      description: 'Manage Amazon orders and order items'
      enabled: true,
      requiredScopes: ['orders:read', 'orders:write']},
    {
      name: 'products',
      description: 'Access product catalog and inventory'
      enabled: true,
      requiredScopes: ['catalog:read', 'listings:read', 'listings:write']},
    {
      name: 'inventory',
      description: 'Monitor and manage inventory levels'
      enabled: true,
      requiredScopes: ['inventory:read', 'inventory:write']},
    {
      name: 'reports',
      description: 'Generate and access Amazon reports'
      enabled: true,
      requiredScopes: ['reports:read', 'reports:write']},
    {
      name: 'finances',
      description: 'Access financial and payment data'
      enabled: true,
      requiredScopes: ['finances:read']},
    {
      name: 'shipping',
      description: 'Manage shipments and fulfillment'
      enabled: true,
      requiredScopes: ['shipping:read', 'shipping:write']},
    {
      name: 'notifications',
      description: 'Receive real-time notifications'
      enabled: true,
      requiredScopes: ['notifications:read']},
    {
      name: 'marketplace',
      description: 'Access marketplace and seller data'
      enabled: true,
      requiredScopes: ['marketplace:read']},
  ]

  private readonly logger = console
  private ordersCache: Map<string, AmazonOrder[]> = new Map()
  private productsCache: Map<string, AmazonProduct[]> = new Map()
  private inventoryCache: Map<string, AmazonInventory[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    try {
      const connectionStatus = await this.testConnection()
      if (connectionStatus.isConnected) {
        return {
          success: true,
          accessToken: this.accessToken
          refreshToken: this.refreshTokenValue,
          expiresAt: undefined} else {
        return {
          success: false,
          error: connectionStatus.error || 'Authentication failed'}
      }
    } catch (error) {
      this.logger.error('Amazon Seller authentication failed:', error)
      return {
        success: false,
        error: `Authentication failed: ${(error as Error).message}`}
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      const connectionStatus = await this.testConnection()
      if (connectionStatus.isConnected) {
        return {
          success: true,
          accessToken: this.accessToken
          refreshToken: this.refreshTokenValue,
          expiresAt: undefined} else {
        return {
          success: false,
          error: connectionStatus.error || 'Token validation failed'}
      }
    } catch (error) {
      return {
        success: false,
        error: `Token refresh failed: ${(error as Error).message}`}
  }

  async revokeAccess(): Promise<boolean> {
    try {
      this.accessToken = ''
      this.refreshTokenValue = '',
      return true
    } catch (error) {
      this.logger.error(`Failed to revoke ${this.provider} access:`, error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.authenticate()
      return {
        isConnected: true,
        lastChecked: new Date()}
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message || 'Connection test failed'}
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

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    this.logger.info(`${this.provider} webhook received`, { event: payload._event })
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    return true
  }

  // Seller Profile
  async getSellerProfile(accessToken?: string): Promise<AmazonSellerProfile> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/sellers/v1/marketplaceParticipations', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    const marketplaceParticipation = response.payload?.[0]
    const marketplace = marketplaceParticipation?.marketplace
    const participation = marketplaceParticipation?.participation

    return {
      sellerId: participation?.sellerId || 'unknown',
      marketplaceId: marketplace?.id || 'unknown'
      sellerName: participation?.sellerName || 'Amazon Seller',
      businessType: 'marketplace'
      businessAddress: {,
        name: participation?.sellerName || 'Amazon Seller'
        addressLine1: 'Amazon Marketplace',
        city: marketplace?.name || 'Unknown'
        stateOrRegion: marketplace?.defaultLanguageCode || 'en',
        postalCode: '00000'
        countryCode: marketplace?.defaultCountryCode || 'US'},
      primaryMarketplace: marketplace?.id || 'unknown',
      registeredMarketplaces: [marketplace?.id || 'unknown']
      registrationDate: new Date().toISOString()}

  // Orders Management
  async getOrders(
    createdAfter?: string,
    createdBefore?: string,
    orderStatuses?: string[],
    marketplaceIds?: string[],
    accessToken?: string,
  ): Promise<AmazonOrder[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `orders_${createdAfter || 'all'}_${orderStatuses?.join(',') || 'all'}`

    if (this.ordersCache.has(cacheKey)) {
      return this.ordersCache.get(cacheKey)!
    }

    const params: Record<string, string | number | boolean> = {}
    if (createdAfter) params.CreatedAfter = createdAfter
    if (createdBefore) params.CreatedBefore = createdBefore
    if (orderStatuses?.length) params.OrderStatuses = orderStatuses.join(',')
    if (marketplaceIds?.length) params.MarketplaceIds = marketplaceIds.join(',')

    const _response = await this.makeRequest('/orders/v0/orders', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const orders = response.payload?.Orders || []
    this.ordersCache.set(cacheKey, orders),
    return orders
  }

  async getOrder(orderId: string, accessToken?: string): Promise<AmazonOrder> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/orders/v0/orders/${orderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).payload
  }

  async getOrderItems(orderId: string, accessToken?: string): Promise<AmazonOrderItem[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/orders/v0/orders/${orderId}/orderItems`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).payload?.OrderItems || []
  }

  // Products Management (Catalog Items API)
  async getProducts(
    marketplaceId: string
    identifiers?: string[],
    identifiersType?: 'ASIN' | 'SKU' | 'UPC' | 'EAN' | 'ISBN',
    accessToken?: string,
  ): Promise<AmazonProduct[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `products_${marketplaceId}_${identifiersType || 'all'}`

    if (this.productsCache.has(cacheKey)) {
      return this.productsCache.get(cacheKey)!
    }

    const params: unknown = {,
      marketplaceIds: marketplaceId}

    if (identifiers?.length && identifiersType) {
      params.identifiers = identifiers.join(',')
      params.identifiersType = identifiersType
    }

    const _response = await this.makeRequest('/catalog/2022-04-01/items', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const products = response.items || []
    this.productsCache.set(cacheKey, products),
    return products
  }

  async getProduct(
    asin: string,
    marketplaceId: string
    accessToken?: string,
  ): Promise<AmazonProduct> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/catalog/2022-04-01/items/${asin}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params: {,
        marketplaceIds: marketplaceId}),

    return response
  }

  // Inventory Management
  async getInventoryLevel(
    granularityType: 'Marketplace' | 'Fulfillment',
    granularityId: string
    startDateTime?: string,
    sellerSkus?: string[],
    accessToken?: string,
  ): Promise<AmazonInventory[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `inventory_${granularityId}_${sellerSkus?.join(',') || 'all'}`

    if (this.inventoryCache.has(cacheKey)) {
      return this.inventoryCache.get(cacheKey)!
    }

    const params: unknown = {
      granularityType,
      granularityId}

    if (startDateTime) params.startDateTime = startDateTime
    if (sellerSkus?.length) params.sellerSkus = sellerSkus.join(',')

    const _response = await this.makeRequest('/fba/inventory/v1/summaries', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    const inventory = response.payload?.inventorySummaries || []
    this.inventoryCache.set(cacheKey, inventory),
    return inventory
  }

  async updateInventoryQuantity(
    sku: string,
    quantity: number
    marketplaceId: string
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/listings/2021-08-01/items/seller-sku/' + sku, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      params: {,
        marketplaceIds: marketplaceId},
      body: JSON.stringify({,
        productType: 'PRODUCT'
        patches: [
          {
            op: 'replace',
            path: '/attributes/fulfillment_availability'
            value: [
              {
                fulfillment_channel_code: 'AMAZON_NA'
                quantity},
            ]},
        ]})})

    return (response as Response).status === 'SUCCESS'
  }

  // Financial Events
  async getFinancialEvents(
    maxResultsPerPage?: number,
    postedAfter?: string,
    postedBefore?: string,
    accessToken?: string,
  ): Promise<AmazonFinancialEvent[]> {
    const token = accessToken || (await this.getAccessToken())

    const params: Record<string, string | number | boolean> = {}
    if (maxResultsPerPage) params.MaxResultsPerPage = maxResultsPerPage.toString()
    if (postedAfter) params.PostedAfter = postedAfter
    if (postedBefore) params.PostedBefore = postedBefore

    const _response = await this.makeRequest('/finances/v0/financialEvents', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`},
      params})

    return (response as Response).payload?.FinancialEvents?.ShipmentEventList || []
  }

  // Reports
  async createReport(
    reportType: string,
    marketplaceIds: string[]
    dataStartTime?: string,
    dataEndTime?: string,
    accessToken?: string,
  ): Promise<string> {
    const token = accessToken || (await this.getAccessToken())

    const requestBody: unknown = {
      reportType,
      marketplaceIds}

    if (dataStartTime) requestBody.dataStartTime = dataStartTime
    if (dataEndTime) requestBody.dataEndTime = dataEndTime

    const _response = await this.makeRequest('/reports/2021-06-30/reports', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'},
      body: JSON.stringify(requestBody)})

    return (response as Response).reportId
  }

  async getReport(reportId: string, accessToken?: string): Promise<ApiResponse> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/reports/2021-06-30/reports/${reportId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return response
  }

  async getReportDocument(reportDocumentId: string, accessToken?: string): Promise<string> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/reports/2021-06-30/documents/${reportDocumentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`})

    return (response as Response).url
  }

  // Helper Methods
  private async syncRecentOrders(accessToken: string): Promise<AmazonOrder[]> {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return this.getOrders(
      oneWeekAgo.toISOString(),
      undefined,
      ['Pending', 'Unshipped', 'PartiallyShipped', 'Shipped'],
      undefined,
      accessToken,
    )
  }

  private async syncProducts(accessToken: string): Promise<AmazonProduct[]> {
    // Get products for US marketplace as default
    return this.getProducts('ATVPDKIKX0DER', undefined, undefined, accessToken)
  }

  private async syncInventory(accessToken: string): Promise<AmazonInventory[]> {
    return this.getInventoryLevel('Marketplace', 'ATVPDKIKX0DER', undefined, undefined, accessToken)
  }

  private async handleOrderStatusChange(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing order status change: ${data.AmazonOrderId}`)
      this.ordersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle order status change:', error)
    }

  private async handleInventoryChange(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing inventory change: ${data.SellerSKU}`)
      this.inventoryCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle inventory change:', error)
    }

  private async handleListingChange(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing listing change: ${data.ASIN}`)
      this.productsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle listing change:', error)
    }

  private async handlePriceChange(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing price change: ${data.ASIN}`)
      this.productsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle price change:', error)
    }

  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://api.amazon.com/auth/o2/token', {
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
    const url = `https://sellingpartnerapi-na.amazon.com${endpoint}`

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

    return (response as Response).json()
  }

  private async getAccessToken(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for token retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  // Cleanup method
  clearCache(): void {
    this.ordersCache.clear()
    this.productsCache.clear()
    this.inventoryCache.clear()
  }

}