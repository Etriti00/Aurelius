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
import { ApiResponse, GenericWebhookPayload } from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface PlaidAccount {
  account_id: string,
  balances: {
    available: number | null,
    current: number | null
    limit: number | null,
    iso_currency_code: string | null
    unofficial_currency_code: string | null
  },
    mask: string | null,
  name: string
  official_name: string | null,
  type: 'investment' | 'credit' | 'depository' | 'loan' | 'brokerage' | 'other'
  subtype: string | null
  verification_status?: string
}

interface PlaidTransaction {
  account_id: string,
  amount: number
  iso_currency_code: string | null,
  unofficial_currency_code: string | null
  category: string[] | null,
  category_id: string | null
  check_number: string | null,
  date: string
  datetime: string | null,
  authorized_date: string | null
  authorized_datetime: string | null,
  location: {
    address: string | null,
    city: string | null
    region: string | null,
    postal_code: string | null
    country: string | null,
    lat: number | null
    lon: number | null,
    store_number: string | null
  } | null
  name: string,
  merchant_name: string | null
  payment_channel: 'online' | 'in store' | 'other',
  pending: boolean
  pending_transaction_id: string | null,
  account_owner: string | null
  transaction_id: string,
  transaction_code: string | null
  transaction_type: 'special' | 'place' | 'digital' | 'unresolved'
}

interface PlaidInstitution {
  institution_id: string,
  name: string
  products: string[],
  country_codes: string[]
  url: string | null,
  primary_color: string | null
  logo: string | null,
  routing_numbers: string[]
  oauth: boolean,
  status: {
    item_logins: {,
      status: 'HEALTHY' | 'DEGRADED' | 'DOWN'
      last_status_change: string,
      breakdown: {
        success: number,
        error_plaid: number
        error_institution: number,
        refresh_interval: 'NORMAL' | 'DELAYED' | 'STOPPED'
      },
    transactions_updates: {,
      status: 'HEALTHY' | 'DEGRADED' | 'DOWN'
      last_status_change: string,
      breakdown: {
        success: number,
        error_plaid: number
        error_institution: number,
        refresh_interval: 'NORMAL' | 'DELAYED' | 'STOPPED'
      },
    auth: {,
      status: 'HEALTHY' | 'DEGRADED' | 'DOWN'
      last_status_change: string,
      breakdown: {
        success: number,
        error_plaid: number
        error_institution: number
      },
    identity: {,
      status: 'HEALTHY' | 'DEGRADED' | 'DOWN'
      last_status_change: string,
      breakdown: {
        success: number,
        error_plaid: number
        error_institution: number
      }

interface PlaidItem {
  available_products: string[],
  billed_products: string[]
  consent_expiration_time: string | null,
  error: unknown | null
  institution_id: string | null,
  item_id: string
  update_type: 'background' | 'user_present_required',
  webhook: string | null
}

export class PlaidIntegration extends BaseIntegration {
  readonly provider = 'plaid'
  readonly name = 'Plaid'
  readonly version = '1.0.0'

  private accountsCache: Map<string, PlaidAccount> = new Map()
  private transactionsCache: Map<string, PlaidTransaction> = new Map()
  private institutionsCache: Map<string, PlaidInstitution> = new Map()
  private itemCache: PlaidItem | null = null
  private lastSyncTimestamp: Date | null = null

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
  }

  async authenticate(): Promise<AuthResult> {
    try {
      this.logInfo('authenticate', 'Authenticating Plaid integration')
  }

      // Verify access token by fetching item information
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.makePlaidRequest('/item/get', { access_token: this.accessToken })
      })

      if (!response.item) {
        throw new AuthenticationError('Failed to authenticate with Plaid API')
      }

      this.itemCache = response.item
      this.logInfo('authenticate', 'Plaid integration authenticated successfully', {
        institution_id: response.item.institution_id,
        item_id: response.item.item_id
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Plaid access tokens don't expire
        scope: response.item.available_products
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      // Plaid access tokens don't expire, but we can verify they're still valid
      const _response = await this.executeWithProtection('auth.refresh', async () => {
        return this.makePlaidRequest('/item/get', { access_token: this.accessToken })
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: response.item.available_products
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      await this.executeWithProtection('auth.revoke', async () => {
        return this.makePlaidRequest('/item/remove', { access_token: this.accessToken })
      }),
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _response = await this.executeWithProtection('connection.test', async () => {
        return this.makePlaidRequest('/item/get', { access_token: this.accessToken })
      })
  }

      const item = response.item as PlaidItem
      const hasError = item.error !== null

      return {
        isConnected: !hasError,
        lastChecked: new Date()
        error: hasError ? `Item error: ${item.error?.error_code}` : undefined
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.error_code === 'INVALID_ACCESS_TOKEN') {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Invalid access token'
        }
    }
  }
      }

      if (err.error_code === 'ITEM_LOGIN_REQUIRED') {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'User authentication required at financial institution'
        }
    }
  }
      }

      if (err.error_code === 'RATE_LIMIT_EXCEEDED') {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 100,
            remaining: 0
            resetTime: new Date(Date.now() + 3600000)
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: 'Connection test failed: ' + (error as Error).message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Account Management',
        description: 'Access bank accounts, balances, and account details',
        enabled: true,
        requiredScopes: ['accounts']
        methods: ['getAccounts', 'getAccountBalances', 'getAccountDetails']
      },
      {
        name: 'Transaction History',
        description: 'Retrieve transaction history and categorization'
        enabled: true,
        requiredScopes: ['transactions']
        methods: ['getTransactions', 'getTransactionsByAccount', 'getTransactionCategories']
      },
      {
        name: 'Real-time Balance Updates',
        description: 'Get real-time account balance information'
        enabled: true,
        requiredScopes: ['accounts']
        methods: ['getAccountBalances', 'getBalanceUpdates']
      },
      {
        name: 'Institution Information',
        description: 'Access financial institution details and status'
        enabled: true,
        requiredScopes: ['institutions']
        methods: ['getInstitution', 'getInstitutionStatus', 'searchInstitutions']
      },
      {
        name: 'Identity Verification',
        description: 'Access account holder identity information'
        enabled: true,
        requiredScopes: ['identity']
        methods: ['getAccountHolderIdentity', 'verifyAccountOwnership']
      },
      {
        name: 'Income Verification',
        description: 'Verify income and employment information'
        enabled: true,
        requiredScopes: ['income']
        methods: ['getIncomeVerification', 'getPaystubData', 'getEmploymentData']
      },
      {
        name: 'Asset Reports',
        description: 'Generate detailed asset and liability reports'
        enabled: true,
        requiredScopes: ['assets']
        methods: ['createAssetReport', 'getAssetReport', 'refreshAssetReport']
      },
      {
        name: 'Investment Data',
        description: 'Access investment accounts and securities data'
        enabled: true,
        requiredScopes: ['investments']
        methods: ['getInvestmentAccounts', 'getInvestmentTransactions', 'getSecurities']
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
      this.logInfo('syncData', 'Starting Plaid data sync', { lastSyncTime })
  }

      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []

      try {
        // Sync accounts first
        const accountsResult = await this.syncAccounts()
        totalProcessed += accountsResult.processed
        totalSkipped += accountsResult.skipped

        // Sync transactions (last 30 days if no lastSyncTime)
        const syncPeriod = lastSyncTime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const transactionsResult = await this.syncTransactions(syncPeriod)
        totalProcessed += transactionsResult.processed
        totalSkipped += transactionsResult.skipped

        // Sync institution data
        const institutionResult = await this.syncInstitution()
        totalProcessed += institutionResult.processed
        totalSkipped += institutionResult.skipped

        // Update cache timestamp
        this.lastSyncTimestamp = new Date()

        this.logInfo('syncData', 'Plaid sync completed successfully', {
          totalProcessed,
          totalSkipped,
          errors: errors.length
        })
      }
    } catch (error) {
        errors.push(`Sync failed: ${(error as Error).message}`)
        this.logError('syncData', error as Error)
      }

      catch (error) {
        console.error('Error in plaid.integration.ts:', error)
        throw error
      }
      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider
          lastSyncTime,
          accountsInCache: this.accountsCache.size,
          transactionsInCache: this.transactionsCache.size
          institutionsInCache: this.institutionsCache.size
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Plaid sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return this.lastSyncTimestamp
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Plaid webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Handle Plaid webhook events
      switch (payload._event) {
        case 'TRANSACTIONS':
          await this.handleTransactionUpdate(payload.data)
          break
        case 'ITEM_ERROR':
          await this.handleItemError(payload.data)
          break
        case 'NEW_ACCOUNTS_AVAILABLE':
          await this.handleNewAccountsAvailable(payload.data)
          break
        case 'ACCOUNTS_ERROR':
          await this.handleAccountsError(payload.data)
          break
        case 'PENDING_EXPIRATION':
          await this.handlePendingExpiration(payload.data)
          break
        case 'USER_PERMISSION_REVOKED':
          await this.handleUserPermissionRevoked(payload.data)
          break
        case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
          this.logInfo('handleWebhook', 'Webhook update acknowledged')
          break
        default:
          this.logInfo('handleWebhook', 'Unhandled webhook event', { event: payload._event })
      }
      }

      // Track webhook metrics
      if (this.metricsService) {
        this.metricsService.track(
          this.userId,
          this.integrationId || `plaid-${this.userId}`,
          this.provider,
          payload.event,
          200,
        )
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in plaid.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      // Plaid webhook signature validation
      // This would use the webhook secret from configuration,
      return true // Simplified for now
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // === Private Helper Methods ===

  private async makePlaidRequest(
    endpoint: string,
    data: Record<string, unknown>,
  ): Promise<ApiResponse> {
    const baseUrl = this.config?.apiBaseUrl || 'https://production.plaid.com'
    const url = `${baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'PLAID-CLIENT-ID': this.config?.clientId || process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': this.config?.clientSecret || process.env.PLAID_SECRET || ''
    }

    const requestOptions: RequestInit = {,
      method: 'POST'
      headers,
      body: JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Plaid API error: ${errorData.error_code} - ${errorData.error_message}`)
    }

    return (response as Response).json()
  }

  private async syncAccounts(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.makePlaidRequest('/accounts/get', { access_token: this.accessToken })

      let processed = 0
      for (const account of response.accounts || []) {
        try {
          this.accountsCache.set(account.account_id, account),
          processed++
        }
      }
    } catch (error) {
          this.logError('syncAccounts', error as Error, { accountId: account.account_id })
        }

      return { processed, skipped: 0 }
    } catch (error) {
      this.logError('syncAccounts', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in plaid.integration.ts:', error)
      throw error
    }
  private async syncTransactions(startDate: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const endDate = new Date()
      const _response = await this.makePlaidRequest('/transactions/get', {
        access_token: this.accessToken,
        start_date: startDate.toISOString().split('T')[0]
        end_date: endDate.toISOString().split('T')[0],
        count: 500
        offset: 0
      })

      let processed = 0
      for (const transaction of response.transactions || []) {
        try {
          this.transactionsCache.set(transaction.transaction_id, transaction),
          processed++
        }
      }
    } catch (error) {
          this.logError('syncTransactions', error as Error, { transactionId: transaction.transaction_id })
        }

      return { processed, skipped: 0 }
    } catch (error) {
      this.logError('syncTransactions', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in plaid.integration.ts:', error)
      throw error
    }
  private async syncInstitution(): Promise<{ processed: number; skipped: number }> {
    try {
      if (!this.itemCache?.institution_id) {
        return { processed: 0, skipped: 0 }
      }

      const _response = await this.makePlaidRequest('/institutions/get_by_id', {
        institution_id: this.itemCache.institution_id,
        country_codes: ['US']
        options: { include_optional_metadata: true }
      })

      if ((response as Response).institution) {
        this.institutionsCache.set(response.institution.institution_id, response.institution)
        return { processed: 1, skipped: 0 }
      }

      return { processed: 0, skipped: 0 }
    } catch (error) {
      this.logError('syncInstitution', error as Error),
      throw error
    }

  private async handleTransactionUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      // Refresh transactions for the affected accounts
      await this.syncTransactions(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      this.logInfo('handleTransactionUpdate', 'Transaction cache updated', { itemId: data.item_id })
    } catch (error) {
      this.logError('handleTransactionUpdate', error as Error)
    }

  private async handleItemError(data: Record<string, unknown>): Promise<void> {
    try {
      this.logError('handleItemError', new Error(`Item error: ${data.error?.error_code}`), {
        itemId: data.item_id,
        errorCode: data.error?.error_code
        errorMessage: data.error?.error_message
      })
    } catch (error) {
      this.logError('handleItemError', error as Error)
    }

  private async handleNewAccountsAvailable(data: Record<string, unknown>): Promise<void> {
    try {
      await this.syncAccounts()
      this.logInfo('handleNewAccountsAvailable', 'Account cache updated', { itemId: data.item_id })
    } catch (error) {
      this.logError('handleNewAccountsAvailable', error as Error)
    }

  private async handleAccountsError(data: Record<string, unknown>): Promise<void> {
    try {
      this.logError('handleAccountsError', new Error(`Accounts error: ${data.error?.error_code}`), {
        itemId: data.item_id,
        errorCode: data.error?.error_code
      })
    } catch (error) {
      this.logError('handleAccountsError', error as Error)
    }

  private async handlePendingExpiration(data: Record<string, unknown>): Promise<void> {
    try {
      this.logInfo('handlePendingExpiration', 'Item consent will expire soon', {
        itemId: data.item_id,
        consentExpirationTime: data.consent_expiration_time
      })
    } catch (error) {
      this.logError('handlePendingExpiration', error as Error)
    }

  private async handleUserPermissionRevoked(data: Record<string, unknown>): Promise<void> {
    try {
      this.logInfo('handleUserPermissionRevoked', 'User revoked permissions', {
        itemId: data.item_id,
        error: data.error
      })
    } catch (error) {
      this.logError('handleUserPermissionRevoked', error as Error)
    }

  // === Public API Methods ===

  async getAccounts(filters?: {
    type?: string[]
    subtype?: string[],
    includeBalances?: boolean
  }): Promise<PlaidAccount[]> {
    try {
      await this.executeWithProtection('accounts.list', async () => {
        await this.syncAccounts()
      })

      let accounts = Array.from(this.accountsCache.values())

      if (filters?.type) {
        accounts = accounts.filter(account => filters.type!.includes(account.type))
      }

      if (filters?.subtype) {
        accounts = accounts.filter(
          account => account.subtype && filters.subtype!.includes(account.subtype),
        )
      }

      if (filters?.includeBalances === false) {
        // Remove balance information for privacy
        accounts = accounts.map(account => ({
          ...account,
          balances: {,
            available: null
            current: null,
            limit: null
            iso_currency_code: account.balances.iso_currency_code,
            unofficial_currency_code: account.balances.unofficial_currency_code
          }
        }))
      },

      return accounts
    } catch (error) {
      this.logError('getAccounts', error as Error)
      throw new Error(`Failed to get accounts: ${(error as Error).message}`)
    }

  async getTransactions(filters?: {
    accountId?: string
    startDate?: Date
    endDate?: Date
    count?: number
    offset?: number,
    categoryFilter?: string[]
  }): Promise<PlaidTransaction[]> {
    try {
      const startDate = filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const endDate = filters?.endDate || new Date()

      const _response = await this.executeWithProtection('transactions.list', async () => {
        return this.makePlaidRequest('/transactions/get', {
          access_token: this.accessToken,
          start_date: startDate.toISOString().split('T')[0]
          end_date: endDate.toISOString().split('T')[0],
          account_ids: filters?.accountId ? [filters.accountId] : undefined
          count: filters?.count || 100,
          offset: filters?.offset || 0
        })
      })

      let transactions = response.transactions || []

      if (filters?.categoryFilter) {
        transactions = transactions.filter((transaction: PlaidTransaction) =>
          transaction.category?.some(cat =>
            filters.categoryFilter!.some(filter =>
              cat.toLowerCase().includes(filter.toLowerCase()),
            ),
          ),
        )
      }

      // Update cache
      transactions.forEach((transaction: PlaidTransaction) => {
        this.transactionsCache.set(transaction.transaction_id, transaction)
      }),

      return transactions
    } catch (error) {
      this.logError('getTransactions', error as Error)
      throw new Error(`Failed to get transactions: ${(error as Error).message}`)
    }

  async getAccountBalances(accountIds?: string[]): Promise<{
    [accountId: string]: PlaidAccount['balances']
  }> {
    try {
      const _response = await this.executeWithProtection('balances.get', async () => {
        return this.makePlaidRequest('/accounts/balance/get', {
          access_token: this.accessToken,
          options: { account_ids: accountIds }
        })
      })
  }

      const balances: { [accountId: string]: PlaidAccount['balances'] } = {}

      for (const account of response.accounts || []) {
        balances[account.account_id] = account.balances
      }

        // Update cache
        if (this.accountsCache.has(account.account_id)) {
          const cachedAccount = this.accountsCache.get(account.account_id)!
          cachedAccount.balances = account.balances
          this.accountsCache.set(account.account_id, cachedAccount)
        },

      return balances
    }
    } catch (error) {
      this.logError('getAccountBalances', error as Error)
      throw new Error(`Failed to get account balances: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in plaid.integration.ts:', error)
      throw error
    }
  async getInstitution(): Promise<PlaidInstitution | null> {
    try {
      if (!this.itemCache?.institution_id) {
        return null
      }
  }

      await this.executeWithProtection('institution.get', async () => {
        await this.syncInstitution()
      })

      return this.institutionsCache.get(this.itemCache.institution_id) || null
    } catch (error) {
      this.logError('getInstitution', error as Error)
      throw new Error(`Failed to get institution: ${(error as Error).message}`)
    }

  async searchInstitutions(query: string, products?: string[]): Promise<PlaidInstitution[]> {
    try {
      const _response = await this.executeWithProtection('institutions.search', async () => {
        return this.makePlaidRequest('/institutions/search', {
          query,
          products: products || ['transactions'],
          country_codes: ['US']
          options: { include_optional_metadata: true }
        })
      })
  }

      return (response as Response).institutions || []
    } catch (error) {
      this.logError('searchInstitutions', error as Error)
      throw new Error(`Failed to search institutions: ${(error as Error).message}`)
    }

  async getItem(): Promise<PlaidItem | null> {
    try {
      const _response = await this.executeWithProtection('item.get', async () => {
        return this.makePlaidRequest('/item/get', { access_token: this.accessToken })
      })
  }

      this.itemCache = response.item
      return (response as Response).item
    } catch (error) {
      this.logError('getItem', error as Error)
      throw new Error(`Failed to get item: ${(error as Error).message}`)
    }

  async updateWebhook(webhookUrl: string): Promise<PlaidItem> {
    try {
      const _response = await this.executeWithProtection('item.updateWebhook', async () => {
        return this.makePlaidRequest('/item/webhook/update', {
          access_token: this.accessToken,
          webhook: webhookUrl
        })
      })
  }

      this.itemCache = response.item
      return (response as Response).item
    } catch (error) {
      this.logError('updateWebhook', error as Error)
      throw new Error(`Failed to update webhook: ${(error as Error).message}`)
    }

}