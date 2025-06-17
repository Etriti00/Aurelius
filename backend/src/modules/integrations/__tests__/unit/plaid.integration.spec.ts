import { PlaidIntegration } from '../../plaid/plaid.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'

describe('PlaidIntegration', () => {
  let integration: PlaidIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(PlaidIntegration, 'plaid')
    integration = setup.integration
    mocks = setup.mocks
}
  }

    // Setup default fetch mocks for Plaid API
    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://production.plaid.com/item/get': IntegrationTestHelper.createMockApiResponse({,
        item: {
          available_products: ['accounts', 'transactions', 'identity'],
          billed_products: ['accounts', 'transactions'],
          consent_expiration_time: null,
          error: null,
          institution_id: 'inst_test123',
          item_id: 'item_test123',
          update_type: 'background',
          webhook: 'https://webhook.example.com',
        },
      }),
      'POST https://production.plaid.com/accounts/get': IntegrationTestHelper.createMockApiResponse(
        {
          accounts: [
            {
              account_id: 'account_test_checking',
              balances: {,
                available: 1500.5,
                current: 1750.25,
                limit: null,
                iso_currency_code: 'USD',
                unofficial_currency_code: null,
              },
              mask: '0000',
              name: 'Plaid Checking',
              official_name: 'Plaid Gold Standard 0% Interest Checking',
              type: 'depository',
              subtype: 'checking',
            },
            {
              account_id: 'account_test_savings',
              balances: {,
                available: 5000.0,
                current: 5000.0,
                limit: null,
                iso_currency_code: 'USD',
                unofficial_currency_code: null,
              },
              mask: '1111',
              name: 'Plaid Saving',
              official_name: 'Plaid Silver Standard 0.1% Interest Saving',
              type: 'depository',
              subtype: 'savings',
            },
          ],
        },
      ),
      'POST https://production.plaid.com/transactions/get':
        IntegrationTestHelper.createMockApiResponse({
          transactions: [
            {
              account_id: 'account_test_checking',
              amount: 12.74,
              iso_currency_code: 'USD',
              unofficial_currency_code: null,
              category: ['Payment', 'Rent'],
              category_id: '16001000',
              check_number: null,
              date: '2025-06-14',
              datetime: null,
              authorized_date: '2025-06-14',
              authorized_datetime: null,
              location: {,
                address: '300 Post St',
                city: 'San Francisco',
                region: 'CA',
                postal_code: '94108',
                country: 'US',
                lat: 37.788155,
                lon: -122.4089,
                store_number: null,
              },
              name: 'Starbucks',
              merchant_name: 'Starbucks',
              payment_channel: 'in store',
              pending: false,
              pending_transaction_id: null,
              account_owner: null,
              transaction_id: 'transaction_test_1',
              transaction_code: null,
              transaction_type: 'place',
            },
          ],
          total_transactions: 1,
        }),
      'POST https://production.plaid.com/institutions/get_by_id':
        IntegrationTestHelper.createMockApiResponse({
          institution: {,
            institution_id: 'inst_test123',
            name: 'Test Bank',
            products: ['accounts', 'transactions', 'identity'],
            country_codes: ['US'],
            url: 'https://testbank.com',
            primary_color: '#003d6b',
            logo: 'iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAA1BMVEX///+nxBvIAAAASElEQVR4nO3BgQAAAADDoPlTX+AIVQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwDcaiAAFXD1ujAAAAAElFTkSuQmCC',
            routing_numbers: ['011401533', '011201762'],
            oauth: false,
            status: {,
              item_logins: {
                status: 'HEALTHY',
                last_status_change: '2025-06-15T10:00:00Z',
                breakdown: {,
                  success: 0.99,
                  error_plaid: 0.01,
                  error_institution: 0.0,
                  refresh_interval: 'NORMAL',
                },
              },
              transactions_updates: {,
                status: 'HEALTHY',
                last_status_change: '2025-06-15T10:00:00Z',
                breakdown: {,
                  success: 0.98,
                  error_plaid: 0.02,
                  error_institution: 0.0,
                  refresh_interval: 'NORMAL',
                },
              },
              auth: {,
                status: 'HEALTHY',
                last_status_change: '2025-06-15T10:00:00Z',
                breakdown: {,
                  success: 0.99,
                  error_plaid: 0.01,
                  error_institution: 0.0,
                },
              },
              identity: {,
                status: 'HEALTHY',
                last_status_change: '2025-06-15T10:00:00Z',
                breakdown: {,
                  success: 0.95,
                  error_plaid: 0.05,
                  error_institution: 0.0,
                },
              },
            },
          },
        }),
      default: IntegrationTestHelper.createMockApiResponse({ data: 'default_response' }),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    fetchMock?.mockRestore()
  })

  describe('Authentication', () => {
    it('should authenticate successfully with valid access token', async () => {
      const result = await integration.authenticate()
  }
    }

      IntegrationTestHelper.assert(result, {
        success: true,
        accessToken: mocks.oauth.accessToken,
      })

      expect(result.scope).toContain('accounts')
      expect(result.scope).toContain('transactions')
    })

    it('should handle authentication failure', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/item/get': IntegrationTestHelper.createMockApiResponse(
          {
            error_code: 'INVALID_ACCESS_TOKEN',
            error_message: 'the provided access token is not valid',
            error_type: 'INVALID_INPUT',
          },
          400,
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
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/item/remove':
          IntegrationTestHelper.createMockApiResponse({ removed: true }, 200),
      })
    }

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
    })

    it('should handle connection test failure with item error', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/item/get': IntegrationTestHelper.createMockApiResponse({,
          item: {
            available_products: ['accounts'],
            billed_products: ['accounts'],
            consent_expiration_time: null,
            error: {,
              error_code: 'ITEM_LOGIN_REQUIRED',
              error_message: 'the login details of this item have changed',
              error_type: 'ITEM_ERROR',
            },
            institution_id: 'inst_test123',
            item_id: 'item_test123',
            update_type: 'user_present_required',
            webhook: null,
          },
        }),
      })
    }

      const result = await integration.testConnection()

      IntegrationTestHelper.assert(result, {
        isConnected: false,
        error: 'Item error: ITEM_LOGIN_REQUIRED',
      })
    })

    it('should handle rate limit errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/item/get': IntegrationTestHelper.createMockApiResponse(
          {
            error_code: 'RATE_LIMIT_EXCEEDED',
            error_message: 'rate limit exceeded',
            error_type: 'RATE_LIMIT_EXCEEDED',
          },
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
    it('should return Plaid capabilities', () => {
      const capabilities = integration.getCapabilities()
  }
    }

      expect(Array.isArray(capabilities)).toBe(true)
      expect(capabilities.length).toBeGreaterThan(0)

      const capabilityNames = capabilities.map(c => c.name)
      expect(capabilityNames).toContain('Account Management')
      expect(capabilityNames).toContain('Transaction History')
      expect(capabilityNames).toContain('Real-time Balance Updates')
      expect(capabilityNames).toContain('Institution Information')
      expect(capabilityNames).toContain('Identity Verification')
      expect(capabilityNames).toContain('Income Verification')
      expect(capabilityNames).toContain('Asset Reports')
      expect(capabilityNames).toContain('Investment Data')

      capabilities.forEach(capability => {
        expect(capability).toHaveProperty('name')
        expect(capability).toHaveProperty('description')
        expect(capability).toHaveProperty('enabled')
        expect(capability).toHaveProperty('requiredScopes')
        expect(capability).toHaveProperty('methods')
      })
    })

    it('should validate required scopes correctly', () => {
      const validScopes = ['accounts', 'transactions', 'identity']
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
      expect(result.metadata?.accountsInCache).toBeDefined()
      expect(result.metadata?.transactionsInCache).toBeDefined()
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
      fetchMock = IntegrationTestHelper.mockFetch({
        default: IntegrationTestHelper.createMockApiResponse(
          {
            error_code: 'RATE_LIMIT_EXCEEDED',
            error_message: 'rate limit exceeded',
          },
          429,
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

  describe('Account Management', () => {
    it('should get accounts successfully', async () => {
      const accounts = await integration.getAccounts()
  }
    }

      expect(Array.isArray(accounts)).toBe(true)
      expect(accounts.length).toBeGreaterThan(0)

      const account = accounts[0]
      expect(account).toHaveProperty('account_id')
      expect(account).toHaveProperty('balances')
      expect(account).toHaveProperty('name')
      expect(account).toHaveProperty('type')
    })

    it('should filter accounts by type', async () => {
      const filters = { type: ['depository'] }
      const accounts = await integration.getAccounts(filters)
    }

      expect(Array.isArray(accounts)).toBe(true)
      accounts.forEach(account => {
        expect(account.type).toBe('depository')
      })
    })

    it('should filter accounts by subtype', async () => {
      const filters = { subtype: ['checking'] }
      const accounts = await integration.getAccounts(filters)
    }

      expect(Array.isArray(accounts)).toBe(true)
      accounts.forEach(account => {
        expect(account.subtype).toBe('checking')
      })
    })

    it('should exclude balance information when requested', async () => {
      const filters = { includeBalances: false }
      const accounts = await integration.getAccounts(filters)
    }

      expect(Array.isArray(accounts)).toBe(true)
      accounts.forEach(account => {
        expect(account.balances.available).toBeNull()
        expect(account.balances.current).toBeNull()
        expect(account.balances.limit).toBeNull()
      })
    })
  })

  describe('Transaction Management', () => {
    it('should get transactions successfully', async () => {
      const transactions = await integration.getTransactions()
  }
    }

      expect(Array.isArray(transactions)).toBe(true)

      if (transactions.length > 0) {
        const transaction = transactions[0]
        expect(transaction).toHaveProperty('transaction_id')
        expect(transaction).toHaveProperty('account_id')
        expect(transaction).toHaveProperty('amount')
        expect(transaction).toHaveProperty('date')
        expect(transaction).toHaveProperty('name')
      })

    it('should filter transactions by account ID', async () => {
      const filters = { accountId: 'account_test_checking' }
    }

      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/transactions/get':
          IntegrationTestHelper.createMockApiResponse({
            transactions: [
              {
                account_id: 'account_test_checking',
                amount: 12.74,
                transaction_id: 'transaction_test_1',
                date: '2025-06-14',
                name: 'Starbucks',
              },
            ],
          }),
      })

      const transactions = await integration.getTransactions(filters)

      expect(Array.isArray(transactions)).toBe(true)
      transactions.forEach(transaction => {
        expect(transaction.account_id).toBe('account_test_checking')
      })
    })

    it('should filter transactions by date range', async () => {
      const startDate = new Date('2025-06-01')
      const endDate = new Date('2025-06-15')
      const filters = { startDate, endDate }
    }

      const transactions = await integration.getTransactions(filters)

      expect(Array.isArray(transactions)).toBe(true)
    })

    it('should filter transactions by category', async () => {
      const filters = { categoryFilter: ['Payment'] }
    }

      const transactions = await integration.getTransactions(filters)

      expect(Array.isArray(transactions)).toBe(true)
    })

    it('should handle pagination with count and offset', async () => {
      const filters = { count: 50, offset: 0 }
    }

      const transactions = await integration.getTransactions(filters)

      expect(Array.isArray(transactions)).toBe(true)
    })
  })

  describe('Balance Management', () => {
    it('should get account balances successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/accounts/balance/get':
          IntegrationTestHelper.createMockApiResponse({
            accounts: [
              {
                account_id: 'account_test_checking',
                balances: {,
                  available: 1500.5,
                  current: 1750.25,
                  limit: null,
                  iso_currency_code: 'USD',
                },
              },
            ],
          }),
      })
  }
    }

      const balances = await integration.getAccountBalances()

      expect(typeof balances).toBe('object')
      expect(balances['account_test_checking']).toBeDefined()
      expect(balances['account_test_checking']).toHaveProperty('available')
      expect(balances['account_test_checking']).toHaveProperty('current')
    })

    it('should get balances for specific accounts', async () => {
      const accountIds = ['account_test_checking']
    }

      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/accounts/balance/get':
          IntegrationTestHelper.createMockApiResponse({
            accounts: [
              {
                account_id: 'account_test_checking',
                balances: {,
                  available: 1500.5,
                  current: 1750.25,
                  limit: null,
                  iso_currency_code: 'USD',
                },
              },
            ],
          }),
      })

      const balances = await integration.getAccountBalances(accountIds)

      expect(Object.keys(balances)).toEqual(accountIds)
    })
  })

  describe('Institution Management', () => {
    it('should get institution information successfully', async () => {
      const institution = await integration.getInstitution()
  }
    }

      expect(institution).toBeDefined()
      expect(institution).toHaveProperty('institution_id')
      expect(institution).toHaveProperty('name')
      expect(institution).toHaveProperty('products')
      expect(institution).toHaveProperty('status')
    })

    it('should search institutions successfully', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/institutions/search':
          IntegrationTestHelper.createMockApiResponse({
            institutions: [
              {
                institution_id: 'ins_109508',
                name: 'Chase',
                products: ['accounts', 'transactions', 'identity'],
                country_codes: ['US'],
              },
            ],
          }),
      })
    }

      const institutions = await integration.searchInstitutions('Chase')

      expect(Array.isArray(institutions)).toBe(true)
      if (institutions.length > 0) {
        expect(institutions[0]).toHaveProperty('institution_id')
        expect(institutions[0]).toHaveProperty('name')
      })

    it('should search institutions with specific products', async () => {
      const products = ['accounts', 'transactions']
    }

      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/institutions/search':
          IntegrationTestHelper.createMockApiResponse({
            institutions: [
              {
                institution_id: 'ins_109508',
                name: 'Chase',
                products: ['accounts', 'transactions', 'identity'],
                country_codes: ['US'],
              },
            ],
          }),
      })

      const institutions = await integration.searchInstitutions('Chase', products)

      expect(Array.isArray(institutions)).toBe(true)
    })
  })

  describe('Item Management', () => {
    it('should get item information successfully', async () => {
      const item = await integration.getItem()
  }
    }

      expect(item).toBeDefined()
      expect(item).toHaveProperty('item_id')
      expect(item).toHaveProperty('institution_id')
      expect(item).toHaveProperty('available_products')
      expect(item).toHaveProperty('billed_products')
    })

    it('should update webhook URL successfully', async () => {
      const webhookUrl = 'https://newwebhook.example.com/plaid'
    }

      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/item/webhook/update':
          IntegrationTestHelper.createMockApiResponse({
            item: {,
              available_products: ['accounts', 'transactions'],
              billed_products: ['accounts', 'transactions'],
              consent_expiration_time: null,
              error: null,
              institution_id: 'inst_test123',
              item_id: 'item_test123',
              update_type: 'background',
              webhook: webhookUrl,
            },
          }),
      })

      const item = await integration.updateWebhook(webhookUrl)

      expect(item).toBeDefined()
      expect(item.webhook).toBe(webhookUrl)
    })
  })

  describe('Webhook Handling', () => {
    it('should handle TRANSACTIONS webhook', async () => {
      const payload = IntegrationTestHelper.createMock('plaid', 'TRANSACTIONS', {
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'INITIAL_UPDATE',
        item_id: 'item_test123',
        new_transactions: 5,
        removed_transactions: [],
      })
  }
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()

      expect(mocks.metricsService.trackWebhookEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'plaid',
        'TRANSACTIONS',
        expect.any(Number),
      )
    })

    it('should handle ITEM_ERROR webhook', async () => {
      const payload = IntegrationTestHelper.createMock('plaid', 'ITEM_ERROR', {
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'item_test123',
        error: {,
          error_code: 'ITEM_LOGIN_REQUIRED',
          error_message: 'the login details of this item have changed',
        },
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle NEW_ACCOUNTS_AVAILABLE webhook', async () => {
      const payload = IntegrationTestHelper.createMock('plaid', 'NEW_ACCOUNTS_AVAILABLE', {
        webhook_type: 'ITEM',
        webhook_code: 'NEW_ACCOUNTS_AVAILABLE',
        item_id: 'item_test123',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle PENDING_EXPIRATION webhook', async () => {
      const payload = IntegrationTestHelper.createMock('plaid', 'PENDING_EXPIRATION', {
        webhook_type: 'ITEM',
        webhook_code: 'PENDING_EXPIRATION',
        item_id: 'item_test123',
        consent_expiration_time: '2025-12-31T23:59:59Z',
      })
    }

      await expect(integration.handleWebhook(payload)).resolves.not.toThrow()
    })

    it('should handle USER_PERMISSION_REVOKED webhook', async () => {
      const payload = IntegrationTestHelper.createMock('plaid', 'USER_PERMISSION_REVOKED', {
        webhook_type: 'ITEM',
        webhook_code: 'USER_PERMISSION_REVOKED',
        item_id: 'item_test123',
        error: {,
          error_code: 'USER_PERMISSION_REVOKED',
          error_message: 'the user revoked the permission for this item',
        },
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
    it('should handle invalid access token errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/accounts/get':
          IntegrationTestHelper.createMockApiResponse(
            {
              error_code: 'INVALID_ACCESS_TOKEN',
              error_message: 'the provided access token is not valid',
            },
            400,
          ),
      })
  }
    }

      await expect(integration.getAccounts()).rejects.toThrow('INVALID_ACCESS_TOKEN')
    })

    it('should handle item login required errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/transactions/get':
          IntegrationTestHelper.createMockApiResponse(
            {
              error_code: 'ITEM_LOGIN_REQUIRED',
              error_message: 'the login details of this item have changed',
            },
            400,
          ),
      })
    }

      await expect(integration.getTransactions()).rejects.toThrow('ITEM_LOGIN_REQUIRED')
    })

    it('should handle rate limiting correctly', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/accounts/get':
          IntegrationTestHelper.createMockApiResponse(
            {
              error_code: 'RATE_LIMIT_EXCEEDED',
              error_message: 'rate limit exceeded',
            },
            429,
          ),
      })
    }

      await expect(integration.getAccounts()).rejects.toThrow()

      expect(mocks.metricsService.trackRateLimit).toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      fetchMock.mockRestore()
      fetchMock = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    }

      const result = await integration.testConnection()

      IntegrationTestHelper.assert(result, { isConnected: false })
    })

    it('should handle institution down errors', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/accounts/get':
          IntegrationTestHelper.createMockApiResponse(
            {
              error_code: 'INSTITUTION_DOWN',
              error_message: 'the institution is currently down',
            },
            400,
          ),
      })
    }

      await expect(integration.getAccounts()).rejects.toThrow('INSTITUTION_DOWN')
    })
  })

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker for API calls', async () => {
      await integration.authenticate()
  }
    }

      expect(mocks.circuitBreaker.execute).toHaveBeenCalledWith(
        'plaid',
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
        expect.stringContaining('test_integration_plaid'),
        'plaid',
        'auth.test',
        expect.any(Number),
        true,
      )
    })

    it('should track metrics for failed operations', async () => {
      fetchMock.mockRestore()
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/item/get': IntegrationTestHelper.createMockApiResponse(
          {
            error_code: 'INVALID_ACCESS_TOKEN',
            error_message: 'invalid access token',
          },
          400,
        ),
      })
    }

      await integration.authenticate()

      expect(mocks.metricsService.trackApiCall).toHaveBeenCalledWith(
        'test_user_123',
        expect.stringContaining('test_integration_plaid'),
        'plaid',
        'auth.test',
        expect.any(Number),
        false,
        expect.any(String),
      )
    })
  })

  describe('Integration-Specific Features', () => {
    it('should handle Plaid-specific error codes properly', async () => {
      const errorCodes = [
        'INVALID_ACCESS_TOKEN',
        'ITEM_LOGIN_REQUIRED',
        'INSUFFICIENT_CREDENTIALS',
        'INVALID_MFA',
        'ACCOUNT_LOCKED',
        'ACCOUNT_NOT_SUPPORTED',
        'INSTITUTION_DOWN',
        'INSTITUTION_NOT_RESPONDING',
      ]
  }
    }

      for (const errorCode of errorCodes) {
        fetchMock.mockRestore()
        fetchMock = IntegrationTestHelper.mockFetch({
          default: IntegrationTestHelper.createMockApiResponse(
            {
              error_code: errorCode,
              error_message: `Test error: ${errorCode}`,
            },
            400,
          ),
        })
      }

        const result = await integration.testConnection()
        expect(result.isConnected).toBe(false)
      })

    it('should properly parse Plaid transaction categories', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/transactions/get':
          IntegrationTestHelper.createMockApiResponse({
            transactions: [
              {
                transaction_id: 'transaction_1',
                account_id: 'account_test_checking',
                amount: 25.0,
                category: ['Food and Drink', 'Restaurants'],
                category_id: '13005000',
                date: '2025-06-14',
                name: "McDonald's",
              },
            ],
          }),
      })
    }

      const transactions = await integration.getTransactions()

      expect(transactions[0].category).toContain('Food and Drink')
      expect(transactions[0].category).toContain('Restaurants')
      expect(transactions[0].category_id).toBe('13005000')
    })

    it('should handle investment account types correctly', async () => {
      fetchMock = IntegrationTestHelper.mockFetch({
        'POST https://production.plaid.com/accounts/get':
          IntegrationTestHelper.createMockApiResponse({
            accounts: [
              {
                account_id: 'account_investment_401k',
                balances: {,
                  available: null,
                  current: 50000.0,
                  limit: null,
                  iso_currency_code: 'USD',
                },
                mask: '1234',
                name: 'Plaid 401k',
                official_name: 'Plaid 401k Plan',
                type: 'investment',
                subtype: '401k',
              },
            ],
          }),
      })
    }

      const accounts = await integration.getAccounts({ type: ['investment'] })

      expect(accounts[0].type).toBe('investment')
      expect(accounts[0].subtype).toBe('401k')
    })
  })
})
