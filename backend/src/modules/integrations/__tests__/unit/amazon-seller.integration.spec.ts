import { AmazonSellerIntegration } from '../../amazon-seller/amazon-seller.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('AmazonSellerIntegration', () => {
  let integration: AmazonSellerIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      AmazonSellerIntegration,
      'amazon-seller',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://api.amazon.com/auth/o2/token': IntegrationTestHelper.createMockApiResponse({,
        access_token: 'amzn_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'amzn_refresh_token'}),
      'GET https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations':
        IntegrationTestHelper.createMockApiResponse({
          payload: [
            {
              marketplace: {,
                id: 'ATVPDKIKX0DER',
                name: 'Amazon.com',
                countryCode: 'US',
                defaultLanguageCode: 'en_US',
                defaultCurrencyCode: 'USD',
                domainName: 'www.amazon.com'},
              participation: {,
                isParticipating: true,
                hasSuspendedListings: false,
                sellerId: 'A1SELLER123',
                sellerName: 'Test Seller Store'},
          ]}),
      'GET https://sellingpartnerapi-na.amazon.com/orders/v0/orders':
        IntegrationTestHelper.createMockApiResponse({
          payload: {,
            Orders: [
              {
                amazonOrderId: 'AMZ-ORDER-123',
                sellerOrderId: 'SELLER-123',
                purchaseDate: '2024-01-15T10:00:00Z',
                lastUpdateDate: '2024-01-15T14:30:00Z',
                orderStatus: 'Shipped',
                fulfillmentChannel: 'MFN',
                salesChannel: 'Amazon.com',
                shippingAddress: {,
                  name: 'John Doe',
                  addressLine1: '123 Main St',
                  city: 'New York',
                  stateOrRegion: 'NY',
                  postalCode: '10001',
                  countryCode: 'US'},
                orderTotal: {,
                  currencyCode: 'USD',
                  amount: '49.99'},
                numberOfItemsShipped: 1,
                numberOfItemsUnshipped: 0,
                paymentMethod: 'COD',
                marketplaceId: 'ATVPDKIKX0DER',
                orderType: 'StandardOrder',
                isBusinessOrder: false,
                isPrime: true,
                isPremiumOrder: false,
                isGlobalExpressEnabled: false,
                isReplacementOrder: false,
                isEstimatedShipDateSet: false,
                isSoldByAB: false,
                isIBA: false,
                isISPU: false,
                isAccessPointOrder: false,
                sellerDisplayName: 'Test Seller Store'},
            ]}),
      'GET https://sellingpartnerapi-na.amazon.com/orders/v0/orders/AMZ-ORDER-123':
        IntegrationTestHelper.createMockApiResponse({
          payload: {,
            amazonOrderId: 'AMZ-ORDER-123',
            orderStatus: 'Shipped',
            orderTotal: {,
              currencyCode: 'USD',
              amount: '49.99'},
            marketplaceId: 'ATVPDKIKX0DER'}),
      'GET https://sellingpartnerapi-na.amazon.com/orders/v0/orders/AMZ-ORDER-123/orderItems':
        IntegrationTestHelper.createMockApiResponse({
          payload: {,
            OrderItems: [
              {
                asin: 'B07EXAMPLE',
                sellerSKU: 'TEST-SKU-001',
                orderItemId: 'ORDER-ITEM-123',
                title: 'Test Product - Premium Quality',
                quantityOrdered: 1,
                quantityShipped: 1,
                itemPrice: {,
                  currencyCode: 'USD',
                  amount: '39.99'},
                shippingPrice: {,
                  currencyCode: 'USD',
                  amount: '9.99'},
                itemTax: {,
                  currencyCode: 'USD',
                  amount: '3.20'},
                isGift: false,
                conditionId: 'New',
                serialNumberRequired: false,
                isTransparency: false,
                deemedResellerCategory: 'IOSS_UOSS'},
            ]}),
      'GET https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items':
        IntegrationTestHelper.createMockApiResponse({
          items: [
            {
              asin: 'B07EXAMPLE',
              title: 'Test Product - Premium Quality',
              brand: 'TestBrand',
              category: 'Electronics',
              price: {,
                amount: 39.99,
                currencyCode: 'USD'},
              images: [
                {
                  url: 'https://images-na.ssl-images-amazon.com/images/test.jpg',
                  variant: 'MAIN',
                  height: 500,
                  width: 500},
              ],
              status: 'ACTIVE',
              fulfillmentChannel: 'AMAZON',
              condition: 'New',
              lastUpdated: '2024-01-15T10:00:00Z',
              buyBoxEligible: true,
              attributes: {,
                brand: 'TestBrand',
                manufacturer: 'TestBrand Inc'},
          ]}),
      'GET https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items/B07EXAMPLE':
        IntegrationTestHelper.createMockApiResponse({
          asin: 'B07EXAMPLE',
          title: 'Test Product - Premium Quality',
          brand: 'TestBrand',
          price: {,
            amount: 39.99,
            currencyCode: 'USD'},
          status: 'ACTIVE'}),
      'GET https://sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries':
        IntegrationTestHelper.createMockApiResponse({
          payload: {,
            inventorySummaries: [
              {
                sellerSKU: 'TEST-SKU-001',
                fnsku: 'X00123ABCD',
                asin: 'B07EXAMPLE',
                condition: 'NEW',
                totalQuantity: 100,
                inStockQuantity: 85,
                availableQuantity: 80,
                fulfillableQuantity: 75,
                inboundWorkingQuantity: 0,
                inboundShippedQuantity: 0,
                inboundReceivingQuantity: 0,
                reservedQuantity: {,
                  totalReservedQuantity: 5,
                  pendingCustomerOrderQuantity: 3,
                  pendingTransshipmentQuantity: 0,
                  fcProcessingQuantity: 2},
                researchingQuantity: {,
                  totalResearchingQuantity: 0,
                  researchingQuantityBreakdown: []},
                unfulfillableQuantity: {,
                  totalUnfulfillableQuantity: 15,
                  customerDamagedQuantity: 5,
                  warehouseDamagedQuantity: 3,
                  distributorDamagedQuantity: 2,
                  carrierDamagedQuantity: 1,
                  defectiveQuantity: 2,
                  expiredQuantity: 2},
                lastUpdatedTime: '2024-01-15T10:00:00Z',
                productName: 'Test Product - Premium Quality',
                totalSupplyQuantity: 100},
            ]}),
      'PATCH https://sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/seller-sku/TEST-SKU-001':
        IntegrationTestHelper.createMockApiResponse({
          status: 'SUCCESS',
          submissionId: 'SUB123456789',
          issues: []}),
      'GET https://sellingpartnerapi-na.amazon.com/finances/v0/financialEvents':
        IntegrationTestHelper.createMockApiResponse({
          payload: {,
            FinancialEvents: {
              ShipmentEventList: [
                {
                  amazonOrderId: 'AMZ-ORDER-123',
                  sellerOrderId: 'SELLER-123',
                  marketplaceName: 'Amazon.com',
                  orderChargeList: [
                    {
                      chargeType: 'Principal',
                      chargeAmount: {,
                        currencyCode: 'USD',
                        amount: '39.99'},
                  ],
                  shipmentFeeList: [
                    {
                      feeType: 'FBAPerUnitFulfillmentFee',
                      feeAmount: {,
                        currencyCode: 'USD',
                        amount: '2.50'},
                  ],
                  postedDate: '2024-01-15T14:30:00Z',
                  shipmentItemList: [
                    {
                      sellerSKU: 'TEST-SKU-001',
                      orderItemId: 'ORDER-ITEM-123',
                      quantityShipped: 1,
                      itemChargeList: [
                        {
                          chargeType: 'Principal',
                          chargeAmount: {,
                            currencyCode: 'USD',
                            amount: '39.99'},
                      ],
                      itemFeeList: [
                        {
                          feeType: 'Commission',
                          feeAmount: {,
                            currencyCode: 'USD',
                            amount: '6.00'},
                      ]},
                  ]},
              ]}),
      'POST https://sellingpartnerapi-na.amazon.com/reports/2021-06-30/reports':
        IntegrationTestHelper.createMockApiResponse({
          reportId: 'REPORT123456789'}),
      'GET https://sellingpartnerapi-na.amazon.com/reports/2021-06-30/reports/REPORT123456789':
        IntegrationTestHelper.createMockApiResponse({
          reportId: 'REPORT123456789',
          reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
          dataStartTime: '2024-01-01T00Z',
          dataEndTime: '2024-01-15T23:59:59Z',
          marketplaceIds: ['ATVPDKIKX0DER'],
          processingStatus: 'DONE',
          processingStartTime: '2024-01-15T10:00:00Z',
          processingEndTime: '2024-01-15T10:05:00Z',
          reportDocumentId: 'DOC123456789'}),
      'GET https://sellingpartnerapi-na.amazon.com/reports/2021-06-30/documents/DOC123456789':
        IntegrationTestHelper.createMockApiResponse({
          reportDocumentId: 'DOC123456789',
          url: 'https://d123456789.cloudfront.net/report.csv?expires=1234567890',
          encryptionDetails: {,
            standard: 'AES',
            initializationVector: 'iv123',
            key: 'key123'},
          compressionAlgorithm: 'GZIP'})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with LWA OAuth', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'amzn_client_id',
        clientSecret: 'amzn_client_secret',
        code: 'auth_code_123',
        redirectUri: 'https://app.example.com/callback'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'amzn_access_token',
        refreshToken: 'amzn_refresh_token',
        expiresIn: 3600,
        userId: 'A1SELLER123',
        userInfo: {,
          id: 'A1SELLER123',
          name: 'Test Seller Store',
          email: 'A1SELLER123'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'amzn_access_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(
          IntegrationTestHelper.createMockErrorResponse(400, 'Invalid authorization code'),
        ),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'invalid',
        clientSecret: 'invalid'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'A1SELLER123',
        name: 'Test Seller Store',
        email: 'A1SELLER123'})
      expect(status.lastSync).toBeDefined()
    })

    it('should return disconnected status when authentication fails', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockRejectedValue(new Error('Token not found'))
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(false)
      expect(status.error).toBeDefined()
    })
  })

  describe('Sync Operations', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        orders: expect.arrayContaining([
          expect.objectContaining({
            amazonOrderId: 'AMZ-ORDER-123',
            orderStatus: 'Shipped',
            orderTotal: {,
              currencyCode: 'USD',
              amount: '49.99'}),
        ]),
        products: expect.arrayContaining([
          expect.objectContaining({
            asin: 'B07EXAMPLE',
            title: 'Test Product - Premium Quality',
            brand: 'TestBrand'}),
        ]),
        inventory: expect.arrayContaining([
          expect.objectContaining({
            sellerSKU: 'TEST-SKU-001',
            asin: 'B07EXAMPLE',
            totalQuantity: 100}),
        ]),
        syncedAt: expect.any(String)})
      }
    })
  })

  describe('Seller Profile', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
    })
  }

    it('should get seller profile successfully', async () => {
      const _profile = await integration.getSellerProfile()
    }

      expect(profile).toMatchObject({
        sellerId: 'A1SELLER123',
        marketplaceId: 'ATVPDKIKX0DER',
        sellerName: 'Test Seller Store',
        businessType: 'marketplace',
        primaryMarketplace: 'ATVPDKIKX0DER'})
    })
  })

  describe('Orders Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
    })
  }

    it('should get orders successfully', async () => {
      const orders = await integration.getOrders(
        '2024-01-01T00Z',
        '2024-01-15T23:59:59Z',
        ['Shipped'],
        ['ATVPDKIKX0DER'],
      )
    }

      expect(orders).toHaveLength(1)
      expect(orders[0]).toMatchObject({
        amazonOrderId: 'AMZ-ORDER-123',
        orderStatus: 'Shipped',
        isPrime: true,
        marketplaceId: 'ATVPDKIKX0DER'})
    })

    it('should get specific order successfully', async () => {
      const order = await integration.getOrder('AMZ-ORDER-123')
    }

      expect(order).toMatchObject({
        amazonOrderId: 'AMZ-ORDER-123',
        orderStatus: 'Shipped',
        marketplaceId: 'ATVPDKIKX0DER'})
    })

    it('should get order items successfully', async () => {
      const orderItems = await integration.getOrderItems('AMZ-ORDER-123')
    }

      expect(orderItems).toHaveLength(1)
      expect(orderItems[0]).toMatchObject({
        asin: 'B07EXAMPLE',
        sellerSKU: 'TEST-SKU-001',
        title: 'Test Product - Premium Quality',
        quantityOrdered: 1,
        quantityShipped: 1})
    })
  })

  describe('Products Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
    })
  }

    it('should get products successfully', async () => {
      const products = await integration.getProducts('ATVPDKIKX0DER', ['B07EXAMPLE'], 'ASIN')
    }

      expect(products).toHaveLength(1)
      expect(products[0]).toMatchObject({
        asin: 'B07EXAMPLE',
        title: 'Test Product - Premium Quality',
        brand: 'TestBrand',
        status: 'ACTIVE'})
    })

    it('should get specific product successfully', async () => {
      const product = await integration.getProduct('B07EXAMPLE', 'ATVPDKIKX0DER')
    }

      expect(product).toMatchObject({
        asin: 'B07EXAMPLE',
        title: 'Test Product - Premium Quality',
        brand: 'TestBrand'})
    })
  })

  describe('Inventory Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
    })
  }

    it('should get inventory levels successfully', async () => {
      const inventory = await integration.getInventoryLevel(
        'Marketplace',
        'ATVPDKIKX0DER',
        undefined,
        ['TEST-SKU-001'],
      )
    }

      expect(inventory).toHaveLength(1)
      expect(inventory[0]).toMatchObject({
        sellerSKU: 'TEST-SKU-001',
        asin: 'B07EXAMPLE',
        totalQuantity: 100,
        inStockQuantity: 85,
        availableQuantity: 80})
    })

    it('should update inventory quantity successfully', async () => {
      const result = await integration.updateInventoryQuantity('TEST-SKU-001', 150, 'ATVPDKIKX0DER')
    }

      expect(result).toBe(true)
    })
  })

  describe('Financial Events', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
    })
  }

    it('should get financial events successfully', async () => {
      const events = await integration.getFinancialEvents(
        100,
        '2024-01-01T00Z',
        '2024-01-15T23:59:59Z',
      )
    }

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        amazonOrderId: 'AMZ-ORDER-123',
        marketplaceName: 'Amazon.com',
        postedDate: '2024-01-15T14:30:00Z'})
    })
  })

  describe('Reports', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
    })
  }

    it('should create report successfully', async () => {
      const reportId = await integration.createReport(
        'GET_MERCHANT_LISTINGS_ALL_DATA',
        ['ATVPDKIKX0DER'],
        '2024-01-01T00Z',
        '2024-01-15T23:59:59Z',
      )
    }

      expect(reportId).toBe('REPORT123456789')
    })

    it('should get report successfully', async () => {
      const report = await integration.getReport('REPORT123456789')
    }

      expect(report).toMatchObject({
        reportId: 'REPORT123456789',
        reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
        processingStatus: 'DONE'})
    })

    it('should get report document successfully', async () => {
      const documentUrl = await integration.getReportDocument('DOC123456789')
    }

      expect(documentUrl).toBe('https://d123456789.cloudfront.net/report.csv?expires=1234567890')
    })
  })

  describe('Webhook Handling', () => {
    it('should process order status change webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          EventType: 'ORDER_STATUS_CHANGE',
          AmazonOrderId: 'AMZ-ORDER-123',
          OrderStatus: 'Shipped'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process inventory change webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          EventType: 'INVENTORY_AVAILABILITY_CHANGE',
          SellerSKU: 'TEST-SKU-001',
          AvailableQuantity: 75}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process listing change webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          EventType: 'LISTING_CHANGE',
          ASIN: 'B07EXAMPLE',
          ChangeType: 'PRICE_UPDATE'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('amzn_access_token')
    })
  }

    it('should cache data effectively', async () => {
      await integration.getOrders()
      await integration.getProducts('ATVPDKIKX0DER')
    }

      expect(integration['ordersCache'].size).toBeGreaterThan(0)
      expect(integration['productsCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getOrders()
      await integration.getProducts('ATVPDKIKX0DER')
    }

      integration.clearCache()

      expect(integration['ordersCache'].size).toBe(0)
      expect(integration['productsCache'].size).toBe(0)
      expect(integration['inventoryCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'orders',
        'products',
        'inventory',
        'reports',
        'finances',
        'shipping',
        'notifications',
        'marketplace',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('amazon-seller')
      expect(integration.name).toBe('Amazon Seller Central')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
