import { ShopifyIntegration } from '../../shopify/shopify.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'

describe('ShopifyIntegration', () => {
  let integration: ShopifyIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(ShopifyIntegration, 'shopify')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks for Shopify API
    fetchMock = IntegrationTestHelper.mockFetch({
      'GET https://example-shop.myshopify.com/admin/api/2023-10/shop.json':
        IntegrationTestHelper.createMockApiResponse({
          shop: {,
            id: 12345678,
            name: 'Test Shop',
            email: 'test@example.com',
            domain: 'test-shop.com',
            province: 'California',
            country: 'United States',
            address1: '123 Test St',
            zip: '90210',
            city: 'Los Angeles',
            source: 'web',
            phone: '+1-555-0123',
            latitude: 34.0522,
            longitude: -118.2437,
            primary_locale: 'en',
            address2: null,
            created_at: '2024-01-01T00-05:00',
            updated_at: '2024-01-01T00-05:00',
            country_code: 'US',
            country_name: 'United States',
            currency: 'USD',
            customer_email: 'customers@test-shop.com',
            timezone: '(GMT-05:00) Eastern Time (US & Canada)',
            iana_timezone: 'America/New_York',
            shop_owner: 'Test Owner',
            money_format: '${{amount}',
            money_with_currency_format: '${{amount} USD',
            weight_unit: 'lb',
            province_code: 'CA',
            taxes_included: false,
            auto_configure_tax_inclusivity: null,
            tax_shipping: null,
            county_taxes: true,
            plan_display_name: 'Basic Shopify',
            plan_name: 'basic',
            has_discounts: true,
            has_gift_cards: true,
            myshopify_domain: 'example-shop.myshopify.com',
            google_apps_domain: null,
            google_apps_login_enabled: null,
            money_in_emails_format: '${{amount}',
            money_with_currency_in_emails_format: '${{amount} USD',
            eligible_for_payments: true,
            requires_extra_payments_agreement: false,
            password_enabled: false,
            has_storefront: true,
            eligible_for_card_reader_giveaway: false,
            finances: true,
            primary_location_id: 987654321,
            checkout_api_supported: true,
            multi_location_enabled: false,
            setup_required: false,
            pre_launch_enabled: false,
            enabled_presentment_currencies: ['USD'],
          },
        }),
      'GET https://example-shop.myshopify.com/admin/api/2023-10/products.json':
        IntegrationTestHelper.createMockApiResponse({
          products: [
            {
              id: 123456789,
              title: 'Test Product',
              body_html: '<p>Test product description</p>',
              vendor: 'Test Vendor',
              product_type: 'Test Type',
              created_at: '2024-01-01T00-05:00',
              handle: 'test-product',
              updated_at: '2024-01-01T00-05:00',
              published_at: '2024-01-01T00-05:00',
              template_suffix: null,
              status: 'active',
              published_scope: 'web',
              tags: 'test, sample',
              admin_graphql_api_id: 'gid://shopify/Product/123456789',
              variants: [
                {
                  id: 987654321,
                  product_id: 123456789,
                  title: 'Default Title',
                  price: '29.99',
                  sku: 'TEST-SKU-001',
                  position: 1,
                  inventory_policy: 'deny',
                  compare_at_price: null,
                  fulfillment_service: 'manual',
                  inventory_management: 'shopify',
                  option1: 'Default Title',
                  option2: null,
                  option3: null,
                  created_at: '2024-01-01T00-05:00',
                  updated_at: '2024-01-01T00-05:00',
                  taxable: true,
                  barcode: '123456789012',
                  grams: 500,
                  image_id: null,
                  weight: 1.1,
                  weight_unit: 'lb',
                  inventory_item_id: 555666777,
                  inventory_quantity: 100,
                  old_inventory_quantity: 100,
                  requires_shipping: true,
                  admin_graphql_api_id: 'gid://shopify/ProductVariant/987654321',
                },
              ],
              options: [
                {
                  id: 111222333,
                  product_id: 123456789,
                  name: 'Title',
                  position: 1,
                  values: ['Default Title'],
                },
              ],
              images: [
                {
                  id: 444555666,
                  product_id: 123456789,
                  position: 1,
                  created_at: '2024-01-01T00-05:00',
                  updated_at: '2024-01-01T00-05:00',
                  alt: null,
                  width: 800,
                  height: 600,
                  src: 'https://cdn.shopify.com/test-image.jpg',
                  variant_ids: [],
                  admin_graphql_api_id: 'gid://shopify/ProductImage/444555666',
                },
              ],
              image: {,
                id: 444555666,
                product_id: 123456789,
                position: 1,
                created_at: '2024-01-01T00-05:00',
                updated_at: '2024-01-01T00-05:00',
                alt: null,
                width: 800,
                height: 600,
                src: 'https://cdn.shopify.com/test-image.jpg',
                variant_ids: [],
                admin_graphql_api_id: 'gid://shopify/ProductImage/444555666',
              },
            },
          ],
        }),
      'GET https://example-shop.myshopify.com/admin/api/2023-10/orders.json':
        IntegrationTestHelper.createMockApiResponse({
          orders: [
            {
              id: 789012345,
              admin_graphql_api_id: 'gid://shopify/Order/789012345',
              app_id: 580111,
              browser_ip: '192.168.1.1',
              buyer_accepts_marketing: false,
              cancel_reason: null,
              cancelled_at: null,
              cart_token: 'test_cart_token',
              checkout_id: 456789012,
              checkout_token: 'test_checkout_token',
              closed_at: null,
              confirmed: true,
              contact_email: 'customer@example.com',
              created_at: '2024-01-01T12:00:00-05:00',
              currency: 'USD',
              current_subtotal_price: '29.99',
              current_subtotal_price_set: {,
                shop_money: {
                  amount: '29.99',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '29.99',
                  currency_code: 'USD',
                },
              },
              current_total_discounts: '0.00',
              current_total_discounts_set: {,
                shop_money: {
                  amount: '0.00',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '0.00',
                  currency_code: 'USD',
                },
              },
              current_total_duties_set: null,
              current_total_price: '32.99',
              current_total_price_set: {,
                shop_money: {
                  amount: '32.99',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '32.99',
                  currency_code: 'USD',
                },
              },
              current_total_tax: '3.00',
              current_total_tax_set: {,
                shop_money: {
                  amount: '3.00',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '3.00',
                  currency_code: 'USD',
                },
              },
              customer_locale: 'en',
              device_id: null,
              discount_codes: [],
              email: 'customer@example.com',
              estimated_taxes: false,
              financial_status: 'paid',
              fulfillment_status: null,
              gateway: 'shopify_payments',
              landing_site: '/',
              landing_site_ref: null,
              location_id: null,
              name: '#1001',
              note: null,
              note_attributes: [],
              number: 1,
              order_number: 1001,
              order_status_url:
                'https://example-shop.myshopify.com/12345678/orders/test_token/authenticate?key=test_key',
              original_total_duties_set: null,
              payment_gateway_names: ['shopify_payments'],
              phone: null,
              presentment_currency: 'USD',
              processed_at: '2024-01-01T12:00:00-05:00',
              processing_method: 'direct',
              reference: 'test_reference',
              referring_site: '',
              source_identifier: 'test_source',
              source_name: 'web',
              source_url: null,
              subtotal_price: '29.99',
              subtotal_price_set: {,
                shop_money: {
                  amount: '29.99',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '29.99',
                  currency_code: 'USD',
                },
              },
              tags: '',
              tax_lines: [
                {
                  price: '3.00',
                  rate: 0.1,
                  title: 'CA Sales Tax',
                  price_set: {,
                    shop_money: {
                      amount: '3.00',
                      currency_code: 'USD',
                    },
                    presentment_money: {,
                      amount: '3.00',
                      currency_code: 'USD',
                    },
                  },
                  channel_liable: false,
                },
              ],
              taxes_included: false,
              test: false,
              token: 'test_order_token',
              total_discounts: '0.00',
              total_discounts_set: {,
                shop_money: {
                  amount: '0.00',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '0.00',
                  currency_code: 'USD',
                },
              },
              total_line_items_price: '29.99',
              total_line_items_price_set: {,
                shop_money: {
                  amount: '29.99',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '29.99',
                  currency_code: 'USD',
                },
              },
              total_outstanding: '0.00',
              total_price: '32.99',
              total_price_set: {,
                shop_money: {
                  amount: '32.99',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '32.99',
                  currency_code: 'USD',
                },
              },
              total_price_usd: '32.99',
              total_shipping_price_set: {,
                shop_money: {
                  amount: '0.00',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '0.00',
                  currency_code: 'USD',
                },
              },
              total_tax: '3.00',
              total_tax_set: {,
                shop_money: {
                  amount: '3.00',
                  currency_code: 'USD',
                },
                presentment_money: {,
                  amount: '3.00',
                  currency_code: 'USD',
                },
              },
              total_tip_received: '0.00',
              total_weight: 500,
              updated_at: '2024-01-01T12:00:00-05:00',
              user_id: null,
              billing_address: {,
                first_name: 'John',
                last_name: 'Doe',
                company: null,
                address1: '123 Customer St',
                address2: null,
                city: 'Los Angeles',
                province: 'California',
                country: 'United States',
                zip: '90210',
                phone: '+1-555-0456',
                name: 'John Doe',
                province_code: 'CA',
                country_code: 'US',
                country_name: 'United States',
              },
              customer: {,
                id: 654321987,
                email: 'customer@example.com',
                accepts_marketing: false,
                created_at: '2024-01-01T10:00:00-05:00',
                updated_at: '2024-01-01T10:00:00-05:00',
                first_name: 'John',
                last_name: 'Doe',
                orders_count: 1,
                state: 'enabled',
                total_spent: '32.99',
                last_order_id: 789012345,
                note: null,
                verified_email: true,
                multipass_identifier: null,
                tax_exempt: false,
                tags: '',
                last_order_name: '#1001',
                currency: 'USD',
                phone: '+1-555-0456',
                addresses: [],
                accepts_marketing_updated_at: '2024-01-01T10:00:00-05:00',
                marketing_opt_in_level: null,
                tax_exemptions: [],
                admin_graphql_api_id: 'gid://shopify/Customer/654321987',
                default_address: {,
                  first_name: 'John',
                  last_name: 'Doe',
                  company: null,
                  address1: '123 Customer St',
                  address2: null,
                  city: 'Los Angeles',
                  province: 'California',
                  country: 'United States',
                  zip: '90210',
                  phone: '+1-555-0456',
                  name: 'John Doe',
                  province_code: 'CA',
                  country_code: 'US',
                  country_name: 'United States',
                },
              },
              discount_applications: [],
              fulfillments: [],
              line_items: [
                {
                  id: 111333555,
                  admin_graphql_api_id: 'gid://shopify/LineItem/111333555',
                  fulfillable_quantity: 1,
                  fulfillment_service: 'manual',
                  fulfillment_status: null,
                  gift_card: false,
                  grams: 500,
                  name: 'Test Product',
                  price: '29.99',
                  price_set: {,
                    shop_money: {
                      amount: '29.99',
                      currency_code: 'USD',
                    },
                    presentment_money: {,
                      amount: '29.99',
                      currency_code: 'USD',
                    },
                  },
                  product_exists: true,
                  product_id: 123456789,
                  properties: [],
                  quantity: 1,
                  requires_shipping: true,
                  sku: 'TEST-SKU-001',
                  taxable: true,
                  title: 'Test Product',
                  total_discount: '0.00',
                  total_discount_set: {,
                    shop_money: {
                      amount: '0.00',
                      currency_code: 'USD',
                    },
                    presentment_money: {,
                      amount: '0.00',
                      currency_code: 'USD',
                    },
                  },
                  variant_id: 987654321,
                  variant_inventory_management: 'shopify',
                  variant_title: 'Default Title',
                  vendor: 'Test Vendor',
                  tax_lines: [
                    {
                      price: '3.00',
                      rate: 0.1,
                      title: 'CA Sales Tax',
                      price_set: {,
                        shop_money: {
                          amount: '3.00',
                          currency_code: 'USD',
                        },
                        presentment_money: {,
                          amount: '3.00',
                          currency_code: 'USD',
                        },
                      },
                      channel_liable: false,
                    },
                  ],
                  duties: [],
                  discount_allocations: [],
                },
              ],
              payment_terms: null,
              refunds: [],
              shipping_address: {,
                first_name: 'John',
                last_name: 'Doe',
                company: null,
                address1: '123 Customer St',
                address2: null,
                city: 'Los Angeles',
                province: 'California',
                country: 'United States',
                zip: '90210',
                phone: '+1-555-0456',
                name: 'John Doe',
                province_code: 'CA',
                country_code: 'US',
                country_name: 'United States',
              },
              shipping_lines: [],
            },
          ],
        }),
      'GET https://example-shop.myshopify.com/admin/api/2023-10/customers.json':
        IntegrationTestHelper.createMockApiResponse({
          customers: [
            {
              id: 654321987,
              email: 'customer@example.com',
              accepts_marketing: false,
              created_at: '2024-01-01T10:00:00-05:00',
              updated_at: '2024-01-01T10:00:00-05:00',
              first_name: 'John',
              last_name: 'Doe',
              orders_count: 1,
              state: 'enabled',
              total_spent: '32.99',
              last_order_id: 789012345,
              note: null,
              verified_email: true,
              multipass_identifier: null,
              tax_exempt: false,
              tags: '',
              last_order_name: '#1001',
              currency: 'USD',
              phone: '+1-555-0456',
              addresses: [],
              accepts_marketing_updated_at: '2024-01-01T10:00:00-05:00',
              marketing_opt_in_level: null,
              tax_exemptions: [],
              admin_graphql_api_id: 'gid://shopify/Customer/654321987',
              default_address: {,
                first_name: 'John',
                last_name: 'Doe',
                company: null,
                address1: '123 Customer St',
                address2: null,
                city: 'Los Angeles',
                province: 'California',
                country: 'United States',
                zip: '90210',
                phone: '+1-555-0456',
                name: 'John Doe',
                province_code: 'CA',
                country_code: 'US',
                country_name: 'United States',
              },
            },
          ],
        }),
      default: IntegrationTestHelper.createMockApiResponse({ data: 'default_response' }),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  describe('Authentication', () => {
    it('should authenticate successfully with valid token', async () => {
      const result = await integration.authenticate()
  }
    }

      IntegrationTestHelper.assert(result, {
        success: true,
        accessToken: mocks.oauth.accessToken,
      })

      expect(result.scope).toBeDefined()
      expect(Array.isArray(result.scope)).toBe(true)
    })

    it('should handle authentication failure', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/shop.json':
          IntegrationTestHelper.createMockApiResponse(
            { errors: 'Invalid API key or access token (unrecognized login or wrong password)' },
            401,
          ),
      })
    }

      const result = await integration.authenticate()

      IntegrationTestHelper.assert(result, {
        success: false,
        error: 'Authentication failed',
      })
    })

    it('should refresh token successfully', async () => {
      const result = await integration.refreshToken()
    }

      IntegrationTestHelper.assert(result, { success: true })
    })

    it('should revoke access successfully', async () => {
      const result = await integration.revokeAccess()
      expect(result).toBe(true)
    })
  })

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const result = await integration.testConnection()
  }
    }

      IntegrationTestHelper.assert(result, { isConnected: true })

      expect(result.lastChecked).toBeInstanceOf(Date)
      expect(result.metadata?.shopId).toBe(12345678)
      expect(result.metadata?.shopName).toBe('Test Shop')
    })

    it('should handle connection test failure with auth error', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/shop.json':
          IntegrationTestHelper.createMockApiResponse(
            { errors: 'Unauthorized' },
            401,
          ),
      })
    }

      const result = await integration.testConnection()

      IntegrationTestHelper.assert(result, {
        isConnected: false,
        error: 'Authentication failed - invalid access token',
      })
    })

    it('should handle connection test failure with permission error', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/shop.json':
          IntegrationTestHelper.createMockApiResponse(
            { errors: 'Forbidden' },
            403,
          ),
      })
    }

      const result = await integration.testConnection()

      expect(result.isConnected).toBe(false)
      expect(result.error).toContain('Access forbidden')
    })

    it('should handle rate limit errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/shop.json':
          IntegrationTestHelper.createMockApiResponse(
            { errors:
                'Exceeded 2 calls per second for api client. Reduce request rates to resume uninterrupted service.' },
            429,
          ),
      })
    }

      const result = await integration.testConnection()

      expect(result.isConnected).toBe(false)
      expect(result.error).toContain('Rate limit exceeded')
      expect(result.rateLimitInfo).toBeDefined()
    })
  })

  describe('Capabilities', () => {
    it('should return Shopify capabilities', () => {
      const capabilities = integration.getCapabilities()
  }
    }

      expect(Array.isArray(capabilities)).toBe(true)
      expect(capabilities.length).toBeGreaterThan(0)

      const capabilityNames = capabilities.map(c => c.name)
      expect(capabilityNames).toContain('Shop Management')
      expect(capabilityNames).toContain('Product Management')
      expect(capabilityNames).toContain('Order Management')
      expect(capabilityNames).toContain('Customer Management')
      expect(capabilityNames).toContain('Inventory Management')
      expect(capabilityNames).toContain('Analytics & Reports')
      expect(capabilityNames).toContain('Webhooks & Events')
      expect(capabilityNames).toContain('Payment Processing')

      capabilities.forEach(capability => {
        expect(capability).toHaveProperty('name')
        expect(capability).toHaveProperty('description')
        expect(capability).toHaveProperty('enabled')
        expect(capability).toHaveProperty('requiredScopes')
        expect(capability).toHaveProperty('methods')
      })
    })

    it('should validate required scopes correctly', () => {
      const validScopes = ['read_products', 'write_products', 'read_orders', 'write_orders']
      const invalidScopes = ['invalid.scope']
    }

      expect(integration.validateRequiredScopes(validScopes)).toBe(true)
      expect(integration.validateRequiredScopes(invalidScopes)).toBe(false)
    })
  })

  describe('Data Synchronization', () => {
    it('should sync data successfully', async () => {
      const result = await integration.syncData()
  }
    }

      IntegrationTestHelper.assert(result, { success: true })

      expect(result.itemsProcessed).toBeGreaterThanOrEqual(0)
      expect(result.itemsSkipped).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(result.errors)).toBe(true)
      expect(result.metadata?.productsInCache).toBeDefined()
      expect(result.metadata?.ordersInCache).toBeDefined()
      expect(result.metadata?.customersInCache).toBeDefined()
      expect(result.metadata?.shopInfo).toBeDefined()
    })

    it('should sync data with last sync time', async () => {
      const lastSyncTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const result = await integration.syncData(lastSyncTime)
    }

      IntegrationTestHelper.assert(result, { success: true })

      expect(result.metadata?.lastSyncTime).toEqual(lastSyncTime)
    })

    it('should handle sync errors gracefully', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({ default: IntegrationTestHelper.createMockApiResponse(
          {
            errors: 'Internal server error' },
          500,
        ),
      })
    }

      const result = await integration.syncData()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should get last sync time', async () => {
      const lastSyncTime = await integration.getLastSyncTime()
      expect(lastSyncTime instanceof Date || lastSyncTime === null).toBe(true)
    })
  })

  describe('Shop Management', () => {
    it('should get shop information successfully', async () => {
      const shop = await integration.getShop()
  }
    }

      expect(shop).toBeDefined()
      expect(shop?.id).toBe(12345678)
      expect(shop?.name).toBe('Test Shop')
      expect(shop?.domain).toBe('test-shop.com')
      expect(shop?.currency).toBe('USD')
      expect(shop?.plan_name).toBe('basic')
    })
  })

  describe('Product Management', () => {
    it('should get products successfully', async () => {
      const products = await integration.getProducts()
  }
    }

      expect(Array.isArray(products)).toBe(true)
      expect(products.length).toBeGreaterThan(0)

      const product = products[0]
      expect(product).toHaveProperty('id')
      expect(product).toHaveProperty('title')
      expect(product).toHaveProperty('variants')
      expect(product).toHaveProperty('images')
      expect(product.id).toBe(123456789)
      expect(product.title).toBe('Test Product')
    })

    it('should get products with filters', async () => {
      const filters = {
        title: 'Test Product',
        status: 'active' as const,
        limit: 10,
      }
    }

      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/products.json':
          IntegrationTestHelper.createMockApiResponse({
            products: [
              {
                id: 123456789,
                title: 'Test Product',
                status: 'active',
                vendor: 'Test Vendor',
                product_type: 'Test Type',
              },
            ],
          }),
      })

      const products = await integration.getProducts(filters)

      expect(Array.isArray(products)).toBe(true)
    })

    it('should create product successfully', async () => {
      const productData = {
        title: 'New Test Product',
        body_html: '<p>New product description</p>',
        vendor: 'Test Vendor',
        product_type: 'Test Type',
        status: 'active' as const,
        variants: [
          {
            price: '39.99',
            sku: 'NEW-SKU-001',
            inventory_quantity: 50,
          },
        ],
      }
    }

      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://example-shop.myshopify.com/admin/api/2023-10/products.json':
          IntegrationTestHelper.createMockApiResponse({
            product: {,
              id: 999888777,
              title: 'New Test Product',
              ...productData,
            },
          }),
      })

      const productId = await integration.createProduct(productData)
      expect(typeof productId).toBe('number')
      expect(productId).toBe(999888777)
    })

    it('should handle product variants correctly', async () => {
      const products = await integration.getProducts()
    }

      const product = products[0]
      expect(product.variants).toBeDefined()
      expect(Array.isArray(product.variants)).toBe(true)
      expect(product.variants.length).toBeGreaterThan(0)

      const variant = product.variants[0]
      expect(variant).toHaveProperty('id')
      expect(variant).toHaveProperty('price')
      expect(variant).toHaveProperty('sku')
      expect(variant).toHaveProperty('inventory_quantity')
    })

    it('should handle product images correctly', async () => {
      const products = await integration.getProducts()
    }

      const product = products[0]
      expect(product.images).toBeDefined()
      expect(Array.isArray(product.images)).toBe(true)
      expect(product.images.length).toBeGreaterThan(0)

      const image = product.images[0]
      expect(image).toHaveProperty('id')
      expect(image).toHaveProperty('src')
      expect(image).toHaveProperty('width')
      expect(image).toHaveProperty('height')
    })
  })

  describe('Order Management', () => {
    it('should get orders successfully', async () => {
      const orders = await integration.getOrders()
  }
    }

      expect(Array.isArray(orders)).toBe(true)
      expect(orders.length).toBeGreaterThan(0)

      const order = orders[0]
      expect(order).toHaveProperty('id')
      expect(order).toHaveProperty('name')
      expect(order).toHaveProperty('total_price')
      expect(order).toHaveProperty('financial_status')
      expect(order).toHaveProperty('line_items')
      expect(order.id).toBe(789012345)
    })

    it('should get orders with filters', async () => {
      const filters = {
        status: 'open' as const,
        financial_status: 'paid' as const,
        limit: 50,
      }
    }

      const orders = await integration.getOrders(filters)

      expect(Array.isArray(orders)).toBe(true)
    })

    it('should get orders with date filters', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const filters = {
        created_at_min: startDate,
        created_at_max: endDate,
      }
    }

      const orders = await integration.getOrders(filters)

      expect(Array.isArray(orders)).toBe(true)
    })

    it('should handle order line items correctly', async () => {
      const orders = await integration.getOrders()
    }

      const order = orders[0]
      expect(order.line_items).toBeDefined()
      expect(Array.isArray(order.line_items)).toBe(true)
      expect(order.line_items.length).toBeGreaterThan(0)

      const lineItem = order.line_items[0]
      expect(lineItem).toHaveProperty('id')
      expect(lineItem).toHaveProperty('name')
      expect(lineItem).toHaveProperty('price')
      expect(lineItem).toHaveProperty('quantity')
      expect(lineItem).toHaveProperty('product_id')
    })

    it('should fulfill order successfully', async () => {
      const fulfillmentData = {
        tracking_number: 'TRK123456789',
        tracking_company: 'UPS',
        notify_customer: true,
        line_items: [
          {
            id: 111333555,
            quantity: 1,
          },
        ],
      }
    }

      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://example-shop.myshopify.com/admin/api/2023-10/orders/789012345/fulfillments.json':
          IntegrationTestHelper.createMockApiResponse({
            fulfillment: {,
              id: 555777999,
              order_id: 789012345,
              status: 'success',
              tracking_number: 'TRK123456789',
              tracking_company: 'UPS',
            },
          }),
      })

      const fulfillment = await integration.fulfillOrder(789012345, fulfillmentData)
      expect(fulfillment).toBeDefined()
      expect(fulfillment.id).toBe(555777999)
      expect(fulfillment.tracking_number).toBe('TRK123456789')
    })
  })

  describe('Customer Management', () => {
    it('should get customers successfully', async () => {
      const customers = await integration.getCustomers()
  }
    }

      expect(Array.isArray(customers)).toBe(true)
      expect(customers.length).toBeGreaterThan(0)

      const customer = customers[0]
      expect(customer).toHaveProperty('id')
      expect(customer).toHaveProperty('email')
      expect(customer).toHaveProperty('first_name')
      expect(customer).toHaveProperty('last_name')
      expect(customer).toHaveProperty('orders_count')
      expect(customer.id).toBe(654321987)
    })

    it('should get customers with filters', async () => {
      const filters = {
        limit: 100,
        since_id: 500000000,
      }
    }

      const customers = await integration.getCustomers(filters)

      expect(Array.isArray(customers)).toBe(true)
    })

    it('should handle customer addresses correctly', async () => {
      const customers = await integration.getCustomers()
    }

      const customer = customers[0]
      expect(customer.default_address).toBeDefined()
      expect(customer.default_address).toHaveProperty('first_name')
      expect(customer.default_address).toHaveProperty('last_name')
      expect(customer.default_address).toHaveProperty('address1')
      expect(customer.default_address).toHaveProperty('city')
      expect(customer.default_address).toHaveProperty('country')
    })
  })

  describe('Inventory Management', () => {
    it('should update inventory successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/variants/987654321.json':
          IntegrationTestHelper.createMockApiResponse({
            variant: {,
              id: 987654321,
              inventory_item_id: 555666777,
              inventory_quantity: 100,
            },
          }),
        'POST https://example-shop.myshopify.com/admin/api/2023-10/inventory_levels/set.json':
          IntegrationTestHelper.createMockApiResponse({
            inventory_level: {,
              inventory_item_id: 555666777,
              location_id: 987654321,
              available: 75,
            },
          }),
      })
  }
    }

      await expect(integration.updateInventory(987654321, 75)).resolves.not.toThrow()
    })

    it('should get primary location ID', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/locations.json':
          IntegrationTestHelper.createMockApiResponse({
            locations: [
              {
                id: 987654321,
                name: 'Primary Location',
                primary: true,
              },
            ],
          }),
      })
    }

      // This is tested indirectly through updateInventory
      await expect(integration.updateInventory(987654321, 50)).resolves.not.toThrow()
    })
  })

  describe('Webhook Handling', () => {
    it('should handle orders/create webhook', async () => {
      const payload = IntegrationTestHelper.createMock('shopify', 'orders/create', {
        id: 999888777,
        name: '#1002',
        total_price: '45.99',
      })
  }
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()

      expect(mocks.metricsService.trackWebhookEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'shopify',
        'orders/create',
        expect.any(Number),
      )
    })

    it('should handle orders/paid webhook', async () => {
      const payload = IntegrationTestHelper.createMock('shopify', 'orders/paid', {
        id: 789012345,
        financial_status: 'paid',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle orders/fulfilled webhook', async () => {
      const payload = IntegrationTestHelper.createMock('shopify', 'orders/fulfilled', {
        id: 789012345,
        fulfillment_status: 'fulfilled',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle orders/cancelled webhook', async () => {
      const payload = IntegrationTestHelper.createMock('shopify', 'orders/cancelled', {
        id: 789012345,
        cancelled_at: '2024-01-02T12:00:00-05:00',
        cancel_reason: 'customer',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle products/create webhook', async () => {
      const payload = IntegrationTestHelper.createMock('shopify', 'products/create', {
        id: 999888777,
        title: 'New Product via Webhook',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle products/update webhook', async () => {
      const payload = IntegrationTestHelper.createMock('shopify', 'products/update', {
        id: 123456789,
        title: 'Updated Product Title',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle customers/create webhook', async () => {
      const payload = IntegrationTestHelper.createMock('shopify', 'customers/create', {
        id: 999777555,
        email: 'newcustomer@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle app/uninstalled webhook', async () => {
      const payload = IntegrationTestHelper.createMock('shopify', 'app/uninstalled', {
        id: 12345678,
        name: 'Test Shop',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should validate webhook signature', () => {
      const payload = { test: 'data' }
      const signature = 'valid_signature'
    }

      const result = integration.validateWebhookSignature(payload, signature)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Error Handling', () => {
    it('should handle API limit errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/products.json':
          IntegrationTestHelper.createMockApiResponse(
            { errors:
                'Exceeded 2 calls per second for api client. Reduce request rates to resume uninterrupted service.' },
            429,
          ),
      })
  }
    }

      await expect(integration.getProducts()).rejects.toThrow()

      expect(mocks.metricsService.trackRateLimit).toHaveBeenCalled()
    })

    it('should handle insufficient permissions errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/orders.json':
          IntegrationTestHelper.createMockApiResponse(
            { errors: 'Not authorized to access this resource' },
            403,
          ),
      })
    }

      await expect(integration.getOrders()).rejects.toThrow('Not authorized')
    })

    it('should handle invalid resource errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/products.json':
          IntegrationTestHelper.createMockApiResponse(
            { errors: 'Not Found' },
            404,
          ),
      })
    }

      await expect(integration.getProducts()).rejects.toThrow('Not Found')
    })

    it('should handle network errors', async () => {
      fetchMock.mockRestore()
      fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    }

      const result = await integration.testConnection()

      IntegrationTestHelper.assert(result, { isConnected: false })
    })
  })

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker for API calls', async () => {
      await integration.authenticate()
  }
    }

      expect(mocks.circuitBreaker.execute).toHaveBeenCalledWith(
        'shopify',
        'auth.test',
        expect.any(Function),
        undefined,
      )
    })

    it('should track metrics for successful operations', async () => {
      await integration.authenticate()
    }

      expect(mocks.metricsService.trackApiCall).toHaveBeenCalledWith(
        'test_user_123',
        expect.stringContaining('test_integration_shopify'),
        'shopify',
        'auth.test',
        expect.any(Number),
        true,
      )
    })

    it('should track metrics for failed operations', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'GET https://example-shop.myshopify.com/admin/api/2023-10/shop.json':
          IntegrationTestHelper.createMockApiResponse(
            { errors: 'Unauthorized' },
            401,
          ),
      })
    }

      await integration.authenticate()

      expect(mocks.metricsService.trackApiCall).toHaveBeenCalledWith(
        'test_user_123',
        expect.stringContaining('test_integration_shopify'),
        'shopify',
        'auth.test',
        expect.any(Number),
        false,
        expect.any(String),
      )
    })
  })

  describe('Integration-Specific Features', () => {
    it('should handle Shopify-specific data structures correctly', async () => {
      const orders = await integration.getOrders()
  }
    }

      const order = orders[0]
      expect(order.current_total_price_set).toBeDefined()
      expect(order.current_total_price_set.shop_money).toBeDefined()
      expect(order.current_total_price_set.presentment_money).toBeDefined()
      expect(order.tax_lines).toBeDefined()
      expect(Array.isArray(order.tax_lines)).toBe(true)
    })

    it('should handle product variants with _options correctly', async () => {
      const products = await integration.getProducts()
    }

      const product = products[0]
      expect(product._options).toBeDefined()
      expect(Array.isArray(product._options)).toBe(true)

      if (product._options.length > 0) {
        const option = product.options[0]
        expect(option).toHaveProperty('name')
        expect(option).toHaveProperty('values')
        expect(Array.isArray(option.values)).toBe(true)
      })

    it('should handle Shopify money format correctly', async () => {
      const shop = await integration.getShop()
    }

      expect(shop?.money_format).toBeDefined()
      expect(shop?.money_with_currency_format).toBeDefined()
      expect(shop?.currency).toBe('USD')
    })

    it('should handle fulfillment status correctly', async () => {
      const orders = await integration.getOrders()
    }

      const order = orders[0]
      expect(
        ['fulfilled', 'null', 'partial', 'restocked', null].includes(order.fulfillment_status),
      ).toBe(true)
      expect(
        [
          'pending',
          'authorized',
          'partially_paid',
          'paid',
          'partially_refunded',
          'refunded',
          'voided',
        ].includes(order.financial_status),
      ).toBe(true)
    })

    it('should handle inventory management correctly', async () => {
      const products = await integration.getProducts()
    }

      const product = products[0]
      const variant = product.variants[0]
      expect(variant.inventory_management).toBeDefined()
      expect(['shopify', 'other', null].includes(variant.inventory_management)).toBe(true)
      expect(['deny', 'continue'].includes(variant.inventory_policy)).toBe(true)
    })
  })
})
