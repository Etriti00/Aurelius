import { WooCommerceIntegration } from '../../woocommerce/woocommerce.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('WooCommerceIntegration', () => {
  let integration: WooCommerceIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      WooCommerceIntegration,
      'woocommerce',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'GET https://example-store.com/wp-json/wc/v3/system_status':
        IntegrationTestHelper.createMockApiResponse({
          environment: {,
            home_url: 'https://example-store.com',
            site_url: 'https://example-store.com',
            version: '6.5.0',
            log_directory: '/wp-content/uploads/wc-logs/',
            log_directory_writable: true},
          database: {,
            wc_version: '7.5.0',
            database_version: '7.5.0',
            database_prefix: 'wp_',
            maxmind_geoip_database: 'GeoLite2-Country.mmdb'},
          active_plugins: [],
          theme: {,
            name: 'Twenty Twenty-Three',
            version: '1.0',
            author_uri: 'https://wordpress.org/'},
          settings: {,
            api_enabled: true,
            force_ssl: false,
            currency: 'USD',
            currency_symbol: '$',
            currency_position: 'left',
            thousand_separator: ',',
            decimal_separator: '.',
            number_of_decimals: 2,
            geolocation_enabled: false,
            taxonomies: {},
            product_visibility_terms: {},
            woocommerce_version: '7.5.0',
            title: 'Test WooCommerce Store',
            admin_email: 'admin@example-store.com'}),
      'GET https://example-store.com/wp-json/wc/v3/products':
        IntegrationTestHelper.createMockApiResponse([
          {
            id: 123,
            name: 'Premium T-Shirt',
            slug: 'premium-t-shirt',
            permalink: 'https://example-store.com/product/premium-t-shirt',
            date_created: '2024-01-01T10:00:00',
            date_modified: '2024-01-15T14:30:00',
            type: 'simple',
            status: 'publish',
            featured: false,
            catalog_visibility: 'visible',
            description: 'High quality cotton t-shirt',
            short_description: 'Premium cotton t-shirt',
            sku: 'TS-001',
            price: '29.99',
            regular_price: '29.99',
            sale_price: '',
            on_sale: false,
            purchasable: true,
            total_sales: 150,
            virtual: false,
            downloadable: false,
            downloads: [],
            download_limit: -1,
            download_expiry: -1,
            external_url: '',
            button_text: '',
            tax_status: 'taxable',
            tax_class: '',
            manage_stock: true,
            stock_quantity: 50,
            stock_status: 'instock',
            backorders: 'no',
            backorders_allowed: false,
            backordered: false,
            weight: '0.5',
            dimensions: {,
              length: '25',
              width: '20',
              height: '2'},
            shipping_required: true,
            shipping_taxable: true,
            shipping_class: '',
            shipping_class_id: 0,
            reviews_allowed: true,
            average_rating: '4.5',
            rating_count: 25,
            related_ids: [124, 125],
            upsell_ids: [],
            cross_sell_ids: [],
            parent_id: 0,
            purchase_note: '',
            categories: [
              {
                id: 15,
                name: 'Clothing',
                slug: 'clothing'},
            ],
            tags: [
              {
                id: 25,
                name: 'Cotton',
                slug: 'cotton'},
            ],
            images: [
              {
                id: 456,
                date_created: '2024-01-01T10:00:00',
                src: 'https://example-store.com/wp-content/uploads/tshirt.jpg',
                name: 'tshirt.jpg',
                alt: 'Premium T-Shirt'},
            ],
            attributes: [],
            default_attributes: [],
            variations: [],
            grouped_products: [],
            menu_order: 0,
            meta_data: []},
        ]),
      'GET https://example-store.com/wp-json/wc/v3/products/123':
        IntegrationTestHelper.createMockApiResponse({
          id: 123,
          name: 'Premium T-Shirt',
          sku: 'TS-001',
          price: '29.99',
          stock_quantity: 50}),
      'POST https://example-store.com/wp-json/wc/v3/products':
        IntegrationTestHelper.createMockApiResponse({
          id: 789,
          name: 'New Product',
          sku: 'NP-001',
          price: '19.99',
          status: 'publish'}),
      'PUT https://example-store.com/wp-json/wc/v3/products/123':
        IntegrationTestHelper.createMockApiResponse({
          id: 123,
          name: 'Updated Premium T-Shirt',
          price: '34.99'}),
      'DELETE https://example-store.com/wp-json/wc/v3/products/123':
        IntegrationTestHelper.createMockApiResponse({
          id: 123,
          name: 'Premium T-Shirt'}),
      'GET https://example-store.com/wp-json/wc/v3/orders':
        IntegrationTestHelper.createMockApiResponse([
          {
            id: 456,
            parent_id: 0,
            number: '456',
            order_key: 'wc_order_test123',
            created_via: 'checkout',
            version: '7.5.0',
            status: 'processing',
            currency: 'USD',
            date_created: '2024-01-15T10:00:00',
            date_modified: '2024-01-15T10:05:00',
            discount_total: '0.00',
            discount_tax: '0.00',
            shipping_total: '5.00',
            shipping_tax: '0.50',
            cart_tax: '2.40',
            total: '37.90',
            total_tax: '2.90',
            prices_include_tax: false,
            customer_id: 789,
            customer_ip_address: '192.168.1.1',
            customer_user_agent: 'Mozilla/5.0',
            customer_note: '',
            billing: {,
              first_name: 'John',
              last_name: 'Doe',
              company: '',
              address_1: '123 Main St',
              address_2: '',
              city: 'New York',
              state: 'NY',
              postcode: '10001',
              country: 'US',
              email: 'john@example.com',
              phone: '+1-555-123-4567'},
            shipping: {,
              first_name: 'John',
              last_name: 'Doe',
              company: '',
              address_1: '123 Main St',
              address_2: '',
              city: 'New York',
              state: 'NY',
              postcode: '10001',
              country: 'US'},
            payment_method: 'stripe',
            payment_method_title: 'Credit Card',
            transaction_id: 'pi_test123',
            date_paid: '2024-01-15T10:05:00',
            cart_hash: 'hash123',
            meta_data: [],
            line_items: [
              {
                id: 1,
                name: 'Premium T-Shirt',
                product_id: 123,
                variation_id: 0,
                quantity: 1,
                tax_class: '',
                subtotal: '29.99',
                subtotal_tax: '2.40',
                total: '29.99',
                total_tax: '2.40',
                taxes: [],
                meta_data: [],
                sku: 'TS-001',
                price: 29.99},
            ],
            tax_lines: [],
            shipping_lines: [
              {
                id: 1,
                method_title: 'Standard Shipping',
                method_id: 'flat_rate',
                total: '5.00',
                total_tax: '0.50',
                taxes: [],
                meta_data: []},
            ],
            fee_lines: [],
            coupon_lines: [],
            refunds: []},
        ]),
      'GET https://example-store.com/wp-json/wc/v3/orders/456':
        IntegrationTestHelper.createMockApiResponse({
          id: 456,
          status: 'processing',
          total: '37.90',
          customer_id: 789}),
      'PUT https://example-store.com/wp-json/wc/v3/orders/456':
        IntegrationTestHelper.createMockApiResponse({
          id: 456,
          status: 'completed',
          total: '37.90'}),
      'GET https://example-store.com/wp-json/wc/v3/customers':
        IntegrationTestHelper.createMockApiResponse([
          {
            id: 789,
            date_created: '2024-01-01T10:00:00',
            date_modified: '2024-01-15T10:00:00',
            email: 'john@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'customer',
            username: 'johndoe',
            billing: {,
              first_name: 'John',
              last_name: 'Doe',
              company: '',
              address_1: '123 Main St',
              address_2: '',
              city: 'New York',
              state: 'NY',
              postcode: '10001',
              country: 'US',
              email: 'john@example.com',
              phone: '+1-555-123-4567'},
            shipping: {,
              first_name: 'John',
              last_name: 'Doe',
              company: '',
              address_1: '123 Main St',
              address_2: '',
              city: 'New York',
              state: 'NY',
              postcode: '10001',
              country: 'US'},
            is_paying_customer: true,
            avatar_url: 'https://gravatar.com/avatar/john',
            meta_data: []},
        ]),
      'GET https://example-store.com/wp-json/wc/v3/customers/789':
        IntegrationTestHelper.createMockApiResponse({
          id: 789,
          email: 'john@example.com',
          first_name: 'John',
          last_name: 'Doe'}),
      'POST https://example-store.com/wp-json/wc/v3/customers':
        IntegrationTestHelper.createMockApiResponse({
          id: 999,
          email: 'jane@example.com',
          first_name: 'Jane',
          last_name: 'Smith'}),
      'GET https://example-store.com/wp-json/wc/v3/products/categories':
        IntegrationTestHelper.createMockApiResponse([
          {
            id: 15,
            name: 'Clothing',
            slug: 'clothing',
            parent: 0,
            description: 'Clothing and apparel',
            display: 'default',
            image: {,
              id: 100,
              date_created: '2024-01-01T10:00:00',
              src: 'https://example-store.com/wp-content/uploads/clothing.jpg',
              name: 'clothing.jpg',
              alt: 'Clothing Category'},
            menu_order: 0,
            count: 25},
        ]),
      'POST https://example-store.com/wp-json/wc/v3/products/categories':
        IntegrationTestHelper.createMockApiResponse({
          id: 25,
          name: 'Electronics',
          slug: 'electronics',
          parent: 0}),
      'GET https://example-store.com/wp-json/wc/v3/coupons':
        IntegrationTestHelper.createMockApiResponse([
          {
            id: 100,
            code: 'SAVE10',
            amount: '10.00',
            date_created: '2024-01-01T10:00:00',
            date_modified: '2024-01-01T10:00:00',
            discount_type: 'percent',
            description: '10% off any order',
            date_expires: '2024-12-31T23:59:59',
            usage_count: 25,
            individual_use: false,
            product_ids: [],
            excluded_product_ids: [],
            usage_limit: 100,
            usage_limit_per_user: 1,
            free_shipping: false,
            product_categories: [],
            excluded_product_categories: [],
            exclude_sale_items: false,
            minimum_amount: '50.00',
            maximum_amount: '',
            email_restrictions: [],
            used_by: ['john@example.com'],
            meta_data: []},
        ]),
      'POST https://example-store.com/wp-json/wc/v3/coupons':
        IntegrationTestHelper.createMockApiResponse({
          id: 200,
          code: 'SAVE20',
          amount: '20.00',
          discount_type: 'percent'}),
      'GET https://example-store.com/wp-json/wc/v3/reports/sales':
        IntegrationTestHelper.createMockApiResponse({
          totals: {,
            orders: 45,
            items_sold: 150,
            tax: '125.50',
            shipping: '225.00',
            discount: '50.00',
            customers: 35},
          total_sales: '2250.00',
          average_sales: '50.00',
          total_orders: 45,
          total_items: 150,
          total_tax: '125.50',
          total_shipping: '225.00',
          total_discount: '50.00',
          totals_grouped_by: 'day'}),
      'GET https://example-store.com/wp-json/wc/v3/reports/top_sellers':
        IntegrationTestHelper.createMockApiResponse([
          {
            title: 'Premium T-Shirt',
            product_id: 123,
            quantity: 50},
          {
            title: 'Basic T-Shirt',
            product_id: 124,
            quantity: 35},
        ])})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with API keys', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        consumerKey: 'ck_test123',
        consumerSecret: 'cs_test456',
        storeUrl: 'https://example-store.com'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'ck_test123',
        refreshToken: 'cs_test456',
        expiresIn: 999999999,
        userId: 'https://example-store.com',
        userInfo: {,
          id: 'https://example-store.com',
          name: 'Test WooCommerce Store',
          email: 'admin@example-store.com'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'ck_test123',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(
          IntegrationTestHelper.createMockErrorResponse(401, 'Invalid API credentials'),
        ),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        consumerKey: 'invalid',
        consumerSecret: 'invalid',
        storeUrl: 'https://invalid-store.com'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })

    it('should require all authentication parameters', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        consumerKey: 'ck_test123',
        // Missing consumerSecret and storeUrl
      })
    }

      await expect(integration.authenticate(config)).rejects.toThrow(
        'Consumer Key, Consumer Secret, and Store URL are required',
      )
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'https://example-store.com',
        name: 'Test WooCommerce Store',
        email: 'admin@example-store.com'})
      expect(status.lastSync).toBeDefined()
    })

    it('should return disconnected status when authentication fails', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockRejectedValue(new Error('Credentials not found'))
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(false)
      expect(status.error).toBeDefined()
    })
  })

  describe('Sync Operations', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        products: expect.arrayContaining([
          expect.objectContaining({
            id: 123,
            name: 'Premium T-Shirt',
            sku: 'TS-001',
            price: '29.99'}),
        ]),
        orders: expect.arrayContaining([
          expect.objectContaining({
            id: 456,
            status: 'processing',
            total: '37.90'}),
        ]),
        customers: expect.arrayContaining([
          expect.objectContaining({
            id: 789,
            email: 'john@example.com',
            first_name: 'John'}),
        ]),
        syncedAt: expect.any(String)})
    })
  })

  describe('Products Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should get products successfully', async () => {
      const products = await integration.getProducts(1, 25)
    }

      expect(products).toHaveLength(1)
      expect(products[0]).toMatchObject({
        id: 123,
        name: 'Premium T-Shirt',
        sku: 'TS-001',
        price: '29.99',
        stock_quantity: 50})
    })

    it('should get specific product successfully', async () => {
      const product = await integration.getProduct(123)
    }

      expect(product).toMatchObject({
        id: 123,
        name: 'Premium T-Shirt',
        sku: 'TS-001',
        price: '29.99'})
    })

    it('should create product successfully', async () => {
      const product = await integration.createProduct({
        name: 'New Product',
        type: 'simple',
        regular_price: '19.99',
        sku: 'NP-001'})
    }

      expect(product).toMatchObject({
        id: 789,
        name: 'New Product',
        sku: 'NP-001',
        price: '19.99'})
    })

    it('should update product successfully', async () => {
      const product = await integration.updateProduct(123, {
        name: 'Updated Premium T-Shirt',
        price: '34.99'})
    }

      expect(product).toMatchObject({
        id: 123,
        name: 'Updated Premium T-Shirt',
        price: '34.99'})
    })

    it('should delete product successfully', async () => {
      const result = await integration.deleteProduct(123)
    }

      expect(result).toBe(true)
    })
  })

  describe('Orders Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should get orders successfully', async () => {
      const orders = await integration.getOrders(1, 25)
    }

      expect(orders).toHaveLength(1)
      expect(orders[0]).toMatchObject({
        id: 456,
        status: 'processing',
        total: '37.90',
        customer_id: 789})
    })

    it('should get orders with status filter', async () => {
      const orders = await integration.getOrders(1, 25, 'processing')
    }

      expect(orders).toHaveLength(1)
      expect(orders[0].status).toBe('processing')
    })

    it('should get specific order successfully', async () => {
      const order = await integration.getOrder(456)
    }

      expect(order).toMatchObject({
        id: 456,
        status: 'processing',
        total: '37.90'})
    })

    it('should update order status successfully', async () => {
      const order = await integration.updateOrderStatus(456, 'completed')
    }

      expect(order).toMatchObject({
        id: 456,
        status: 'completed'})
    })
  })

  describe('Customers Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should get customers successfully', async () => {
      const customers = await integration.getCustomers(1, 25)
    }

      expect(customers).toHaveLength(1)
      expect(customers[0]).toMatchObject({
        id: 789,
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe'})
    })

    it('should get specific customer successfully', async () => {
      const customer = await integration.getCustomer(789)
    }

      expect(customer).toMatchObject({
        id: 789,
        email: 'john@example.com',
        first_name: 'John'})
    })

    it('should create customer successfully', async () => {
      const customer = await integration.createCustomer({
        email: 'jane@example.com',
        first_name: 'Jane',
        last_name: 'Smith'})
    }

      expect(customer).toMatchObject({
        id: 999,
        email: 'jane@example.com',
        first_name: 'Jane'})
    })
  })

  describe('Categories Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should get categories successfully', async () => {
      const categories = await integration.getCategories()
    }

      expect(categories).toHaveLength(1)
      expect(categories[0]).toMatchObject({
        id: 15,
        name: 'Clothing',
        slug: 'clothing',
        count: 25})
    })

    it('should create category successfully', async () => {
      const category = await integration.createCategory({
        name: 'Electronics',
        slug: 'electronics'})
    }

      expect(category).toMatchObject({
        id: 25,
        name: 'Electronics',
        slug: 'electronics'})
    })
  })

  describe('Coupons Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should get coupons successfully', async () => {
      const coupons = await integration.getCoupons()
    }

      expect(coupons).toHaveLength(1)
      expect(coupons[0]).toMatchObject({
        id: 100,
        code: 'SAVE10',
        amount: '10.00',
        discount_type: 'percent'})
    })

    it('should create coupon successfully', async () => {
      const coupon = await integration.createCoupon({
        code: 'SAVE20',
        amount: '20.00',
        discount_type: 'percent'})
    }

      expect(coupon).toMatchObject({
        id: 200,
        code: 'SAVE20',
        amount: '20.00'})
    })
  })

  describe('Reports', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should get sales report successfully', async () => {
      const report = await integration.getSalesReport('week')
    }

      expect(report).toMatchObject({
        totals: expect.objectContaining({,
          orders: 45,
          items_sold: 150}),
        total_sales: '2250.00',
        total_orders: 45})
    })

    it('should get top sellers report successfully', async () => {
      const topSellers = await integration.getTopSellersReport('week')
    }

      expect(topSellers).toHaveLength(2)
      expect(topSellers[0]).toMatchObject({
        title: 'Premium T-Shirt',
        product_id: 123,
        quantity: 50})
    })
  })

  describe('System Information', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should get system status successfully', async () => {
      const status = await integration.getSystemStatus()
    }

      expect(status).toMatchObject({
        settings: expect.objectContaining({,
          title: 'Test WooCommerce Store',
          admin_email: 'admin@example-store.com'})})
    })
  })

  describe('Webhook Handling', () => {
    it('should process order webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json',
          'x-wc-webhook-topic': 'order.created'},
        body: JSON.stringify({,
          id: 456,
          status: 'processing',
          total: '37.90'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process product webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json',
          'x-wc-webhook-topic': 'product.updated'},
        body: JSON.stringify({,
          id: 123,
          name: 'Updated Product',
          price: '34.99'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process customer webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json',
          'x-wc-webhook-topic': 'customer.created'},
        body: JSON.stringify({,
          id: 789,
          email: 'john@example.com',
          first_name: 'John'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockImplementation(key => {
        if (key.includes('_secret')) return 'cs_test456'
  }
    }
  }
        if (key.includes('_url')) return 'https://example-store.com'
        return 'ck_test123'
      })
    })

    it('should cache data effectively', async () => {
      await integration.getProducts(1, 25)
      await integration.getOrders(1, 25)
    }

      expect(integration['productsCache'].size).toBeGreaterThan(0)
      expect(integration['ordersCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getProducts(1, 25)
      await integration.getOrders(1, 25)
    }

      integration.clearCache()

      expect(integration['productsCache'].size).toBe(0)
      expect(integration['ordersCache'].size).toBe(0)
      expect(integration['customersCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'products',
        'orders',
        'customers',
        'categories',
        'coupons',
        'reports',
        'inventory',
        'webhooks',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('woocommerce')
      expect(integration.name).toBe('WooCommerce')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
