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

interface ExcelWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface ExcelTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  scope: string
}

interface ExcelWorkbook {
  id: string,
  name: string
  createdDateTime: string,
  lastModifiedDateTime: string
  webUrl: string
}

interface ExcelWorksheet {
  id: string,
  name: string
  position: number,
  visibility: string
}

interface ExcelRange {
  address: string,
  values: unknown[][]
  formulas: unknown[][],
  numberFormat: unknown[][]
}

export class MicrosoftExcelOnlineIntegration extends BaseIntegration {
  readonly provider = 'microsoft-excel-online'
  readonly name = 'Microsoft Excel Online'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://graph.microsoft.com/v1.0'

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
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/me/drive', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: ['https://graph.microsoft.com/Files.ReadWrite.All'],
        data: response
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
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }

      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshTokenValue
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/Files.ReadWrite.All'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: ExcelTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.FILES,
      IntegrationCapability.SPREADSHEETS,
      IntegrationCapability.DATA_ANALYSIS,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/me/drive', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          driveId: response.id
          driveType: response.driveType,
          quotaUsed: response.quota?.used
          quotaRemaining: response.quota?.remaining
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

      // Sync Excel workbooks
      try {
        const workbookResult = await this.syncWorkbooks()
        totalProcessed += workbookResult.processed
        totalErrors += workbookResult.errors
        if (workbookResult.errorMessages) {
          errors.push(...workbookResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Workbook sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Microsoft Excel Online sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const excelPayload = payload as ExcelWebhookPayload

      switch (excelPayload.type) {
        case 'excel.workbook.created':
        case 'excel.workbook.updated':
          await this.handleWorkbookWebhook(excelPayload)
          break
        case 'excel.worksheet.created':
        case 'excel.worksheet.updated':
          await this.handleWorksheetWebhook(excelPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${excelPayload.type}`)
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
      if (this.refreshTokenValue && this.config) {
        await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({,
            token: this.refreshTokenValue
            client_id: this.config.clientId
          })
        })
      }

      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncWorkbooks(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.workbooks', async () => {
        return this.makeApiCall("/me/drive/root/search(q='.xlsx')", 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const workbooks = response.value || []

      for (const workbook of workbooks) {
        try {
          await this.processWorkbook(workbook)
          processed++
        } catch (error) {
          errors.push(`Failed to process workbook ${workbook.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Workbook sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processWorkbook(workbook: any): Promise<void> {
    this.logger.debug(`Processing Excel workbook: ${workbook.name}`)
    // Process workbook data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleWorkbookWebhook(payload: ExcelWebhookPayload): Promise<void> {
    this.logger.debug(`Handling workbook webhook: ${payload.id}`)
    // Handle workbook webhook processing
  }

  private async handleWorksheetWebhook(payload: ExcelWebhookPayload): Promise<void> {
    this.logger.debug(`Handling worksheet webhook: ${payload.id}`)
    // Handle worksheet webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
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
        `Excel Online API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getWorkbooks(): Promise<ExcelWorkbook[]> {
    try {
      const response = await this.executeWithProtection('api.get_workbooks', async () => {
        return this.makeApiCall("/me/drive/root/search(q='.xlsx')", 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getWorkbooks', error as Error)
      throw new Error(`Failed to get workbooks: ${(error as Error).message}`)
    }
  }

  async getWorkbook(workbookId: string): Promise<ExcelWorkbook> {
    try {
      const response = await this.executeWithProtection('api.get_workbook', async () => {
        return this.makeApiCall(`/me/drive/items/${workbookId}/workbook`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getWorkbook', error as Error)
      throw new Error(`Failed to get workbook: ${(error as Error).message}`)
    }
  }

  async getWorksheets(workbookId: string): Promise<ExcelWorksheet[]> {
    try {
      const response = await this.executeWithProtection('api.get_worksheets', async () => {
        return this.makeApiCall(`/me/drive/items/${workbookId}/workbook/worksheets`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getWorksheets', error as Error)
      throw new Error(`Failed to get worksheets: ${(error as Error).message}`)
    }
  }

  async getWorksheet(workbookId: string, worksheetId: string): Promise<ExcelWorksheet> {
    try {
      const response = await this.executeWithProtection('api.get_worksheet', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}`,
          'GET',
        )
      })

      return response
    } catch (error) {
      this.logError('getWorksheet', error as Error)
      throw new Error(`Failed to get worksheet: ${(error as Error).message}`)
    }
  }

  async getRange(workbookId: string, worksheetId: string, range: string): Promise<ExcelRange> {
    try {
      const response = await this.executeWithProtection('api.get_range', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
          'GET',
        )
      })

      return response
    } catch (error) {
      this.logError('getRange', error as Error)
      throw new Error(`Failed to get range: ${(error as Error).message}`)
    }
  }

  async updateRange(
    workbookId: string,
    worksheetId: string
    range: string,
    values: unknown[][]
  ): Promise<ExcelRange> {
    try {
      const response = await this.executeWithProtection('api.update_range', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
          'PATCH',
          { values },
        )
      })

      return response
    } catch (error) {
      this.logError('updateRange', error as Error)
      throw new Error(`Failed to update range: ${(error as Error).message}`)
    }
  }

  async createWorksheet(workbookId: string, name: string): Promise<ExcelWorksheet> {
    try {
      const response = await this.executeWithProtection('api.create_worksheet', async () => {
        return this.makeApiCall(`/me/drive/items/${workbookId}/workbook/worksheets`, 'POST', {
          name
        })
      })

      return response
    } catch (error) {
      this.logError('createWorksheet', error as Error)
      throw new Error(`Failed to create worksheet: ${(error as Error).message}`)
    }
  }

  async deleteWorksheet(workbookId: string, worksheetId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_worksheet', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}`,
          'DELETE',
        )
      })
    } catch (error) {
      this.logError('deleteWorksheet', error as Error)
      throw new Error(`Failed to delete worksheet: ${(error as Error).message}`)
    }
  }

  async addChart(
    workbookId: string,
    worksheetId: string
    chartData: {,
      type: string
      sourceData: string
      seriesBy?: string
    },
  ): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.add_chart', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/charts`,
          'POST',
          chartData,
        )
      })

      return response
    } catch (error) {
      this.logError('addChart', error as Error)
      throw new Error(`Failed to add chart: ${(error as Error).message}`)
    }
  }

  async addTable(
    workbookId: string,
    worksheetId: string
    tableData: {,
      address: string
      hasHeaders: boolean
    },
  ): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.add_table', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables`,
          'POST',
          tableData,
        )
      })

      return response
    } catch (error) {
      this.logError('addTable', error as Error)
      throw new Error(`Failed to add table: ${(error as Error).message}`)
    }
  }

  async getCharts(workbookId: string, worksheetId: string): Promise<any[]> {
    try {
      const response = await this.executeWithProtection('api.get_charts', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/charts`,
          'GET',
        )
      })

      return response.value || []
    } catch (error) {
      this.logError('getCharts', error as Error)
      throw new Error(`Failed to get charts: ${(error as Error).message}`)
    }
  }

  async getTables(workbookId: string, worksheetId: string): Promise<any[]> {
    try {
      const response = await this.executeWithProtection('api.get_tables', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables`,
          'GET',
        )
      })

      return response.value || []
    } catch (error) {
      this.logError('getTables', error as Error)
      throw new Error(`Failed to get tables: ${(error as Error).message}`)
    }
  }

  async calculateWorkbook(workbookId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.calculate_workbook', async () => {
        return this.makeApiCall(
          `/me/drive/items/${workbookId}/workbook/application/calculate`,
          'POST',
          {
            calculationType: 'FullRebuild'
          },
        )
      })
    } catch (error) {
      this.logError('calculateWorkbook', error as Error)
      throw new Error(`Failed to calculate workbook: ${(error as Error).message}`)
    }
  }
}
