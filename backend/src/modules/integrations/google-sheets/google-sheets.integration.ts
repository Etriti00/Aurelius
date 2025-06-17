import { google } from 'googleapis'
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
  GenericWebhookPayload,
  ThirdPartyClient
} from '../../../common/types/integration-types'
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class GoogleSheetsIntegration extends BaseIntegration {
  readonly provider = 'google-sheets'
  readonly name = 'Google Sheets'
  readonly version = '1.0.0'

  private oauth2Client: ThirdPartyClient
  private sheets: unknown
  private drive: unknown

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.oauth2Client = new google.auth.OAuth2(
      config?.clientId,
      config?.clientSecret,
      config?.redirectUri,
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client })
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by listing files
      await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        pageSize: 1
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.readonly',
        ]
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue) {
        return this.authenticate()
      }
  }

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      return {
        success: true,
        accessToken: credentials.access_token
        refreshToken: credentials.refresh_token || this.refreshTokenValue,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
        scope: credentials.scope?.split(' ') || [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.readonly',
        ]
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      await this.oauth2Client.revokeCredentials()
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        pageSize: 1
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.code === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.code === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 100,
            remaining: 0
            resetTime: new Date(Date.now() + 60000)
          }
        }
    }
  }
      }

      return {
        isConnected: false,
        lastChecked: new Date()
        error: err.message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Spreadsheets',
        description: 'Create and manage Google Sheets'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets']
      },
      {
        name: 'Worksheets',
        description: 'Manage sheets within spreadsheets'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets']
      },
      {
        name: 'Data',
        description: 'Read and write cell data'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets']
      },
      {
        name: 'Formatting',
        description: 'Apply formatting to cells and ranges'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets']
      },
      {
        name: 'Charts',
        description: 'Create and manage charts'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets']
      },
      {
        name: 'Formulas',
        description: 'Work with formulas and functions'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/spreadsheets']
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
      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []
  }

      this.logInfo('syncData', 'Starting Google Sheets sync', { lastSyncTime })

      // Sync Spreadsheets
      try {
        const spreadsheetsResult = await this.syncSpreadsheets(lastSyncTime)
        totalProcessed += spreadsheetsResult.processed,
        totalSkipped += spreadsheetsResult.skipped
      }
    } catch (error) {
        errors.push(`Spreadsheets sync failed: ${(error as Error).message}`)
        this.logError('syncSpreadsheets', error as Error)
      }

      catch (error) {
        console.error('Error in google-sheets.integration.ts:', error)
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
        }
      }
    } catch (error) {
      this.logError('syncData', error as Error)
      throw new SyncError('Google Sheets sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Google Sheets webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'spreadsheet.updated':
          await this.handleSpreadsheetWebhook(payload.data)
          break
        case 'sheet.added':
        case 'sheet.deleted':
          await this.handleSheetWebhook(payload.data)
          break
        default:
          this.logInfo('handleWebhook', `Unhandled webhook event: ${payload._event}`)
      }
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in google-sheets.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Google Sheets webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncSpreadsheets(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let query = "mimeType='application/vnd.google-apps.spreadsheet'"
      if (lastSyncTime) {
        query += ` and modifiedTime > '${lastSyncTime.toISOString()}'`
      }

      const _response = await this.drive.files.list({
        q: query,
        pageSize: 100
        fields: 'files(id,name,modifiedTime,createdTime)',
        orderBy: 'modifiedTime desc'
      })

      const files = response.data.files || []

      let processed = 0
      let skipped = 0

      for (const file of files) {
        try {
          await this.processSpreadsheet(file)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncSpreadsheets', error as Error, { fileId: file.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncSpreadsheets', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-sheets.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processSpreadsheet(spreadsheet: unknown): Promise<void> {
    this.logInfo('processSpreadsheet', `Processing spreadsheet: ${spreadsheet.id}`)
  }

  // Private webhook handlers
  private async handleSpreadsheetWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleSpreadsheetWebhook', 'Processing spreadsheet webhook', data)
  }

  private async handleSheetWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleSheetWebhook', 'Processing sheet webhook', data)
  }

  // Public API methods
  async createSpreadsheet(title: string, sheetNames?: string[]): Promise<string> {
    try {
      const resource: unknown = { properties: {
          title }
      }
  }

      if (sheetNames && sheetNames.length > 0) {
        resource.sheets = sheetNames.map(name => ({ properties: {,
            title: name }
        }))
      }

      const _response = await this.sheets.spreadsheets.create({
        resource
      })

      return (response as Response).data.spreadsheetId
    } catch (error) {
      this.logError('createSpreadsheet', error as Error)
      throw new Error(`Failed to create Google Spreadsheet: ${(error as Error).message}`)
    }

  async getSpreadsheet(spreadsheetId: string): Promise<ApiResponse> {
    try {
      const _response = await this.sheets.spreadsheets.get({
        spreadsheetId
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getSpreadsheet', error as Error)
      throw new Error(`Failed to get Google Spreadsheet: ${(error as Error).message}`)
    }

  async getSheetData(spreadsheetId: string, range: string): Promise<unknown[][]> {
    try {
      const _response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      })
  }

      return (response as Response).data.values || []
    } catch (error) {
      this.logError('getSheetData', error as Error)
      throw new Error(`Failed to get sheet data: ${(error as Error).message}`)
    }

  async updateSheetData(spreadsheetId: string, range: string, values: unknown[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values
        }
      })
    } catch (error) {
      this.logError('updateSheetData', error as Error)
      throw new Error(`Failed to update sheet data: ${(error as Error).message}`)
    }

  async appendSheetData(spreadsheetId: string, range: string, values: unknown[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values
        }
      })
    } catch (error) {
      this.logError('appendSheetData', error as Error)
      throw new Error(`Failed to append sheet data: ${(error as Error).message}`)
    }

  async clearSheetData(spreadsheetId: string, range: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range
      })
    } catch (error) {
      this.logError('clearSheetData', error as Error)
      throw new Error(`Failed to clear sheet data: ${(error as Error).message}`)
    }

  async addSheet(spreadsheetId: string, sheetName: string): Promise<number> {
    try {
      const _response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [
            {
              addSheet: {,
                properties: {
                  title: sheetName }
              }
            },
          ]
        }
      })
  }

      return (response as Response).data.replies[0].addSheet.properties.sheetId
    } catch (error) {
      this.logError('addSheet', error as Error)
      throw new Error(`Failed to add sheet: ${(error as Error).message}`)
    }

  async deleteSheet(spreadsheetId: string, sheetId: number): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [
            {
              deleteSheet: {
                sheetId }
            },
          ]
        }
      })
    } catch (error) {
      this.logError('deleteSheet', error as Error)
      throw new Error(`Failed to delete sheet: ${(error as Error).message}`)
    }

  async renameSheet(spreadsheetId: string, sheetId: number, newName: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {,
          requests: [
            {
              updateSheetProperties: {,
                properties: {
                  sheetId,
                  title: newName
                },
                fields: 'title'
              }
            },
          ]
        }
      })
    } catch (error) {
      this.logError('renameSheet', error as Error)
      throw new Error(`Failed to rename sheet: ${(error as Error).message}`)
    }

  async formatCells(
    spreadsheetId: string,
    sheetId: number
    range: {,
      startRowIndex: number
      endRowIndex: number,
      startColumnIndex: number
      endColumnIndex: number
    },
    format: unknown
  ): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {,
          requests: [
            {
              repeatCell: {,
                range: {
                  sheetId,
                  startRowIndex: range.startRowIndex,
                  endRowIndex: range.endRowIndex
                  startColumnIndex: range.startColumnIndex,
                  endColumnIndex: range.endColumnIndex
                },
                cell: { userEnteredFormat: format },
                fields: 'userEnteredFormat'
              }
            },
          ]
        }
      })
    } catch (error) {
      this.logError('formatCells', error as Error)
      throw new Error(`Failed to format cells: ${(error as Error).message}`)
    }

  async createChart(spreadsheetId: string, chartSpec: unknown): Promise<number> {
    try {
      const _response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [
            {
              addChart: {,
                chart: chartSpec }
            },
          ]
        }
      })
  }

      return (response as Response).data.replies[0].addChart.chart.chartId
    } catch (error) {
      this.logError('createChart', error as Error)
      throw new Error(`Failed to create chart: ${(error as Error).message}`)
    }

  async findAndReplace(
    spreadsheetId: string,
    findText: string
    replaceText: string
    options?: {
      sheetId?: number
      allSheets?: boolean
      matchCase?: boolean,
      matchEntireCell?: boolean
    },
  ): Promise<number> {
    try {
      const request: unknown = {,
        find: findText
        replacement: replaceText,
        matchCase: options?.matchCase || false
        matchEntireCell: options?.matchEntireCell || false,
        searchByRegex: false
      }

      if (_options?.sheetId !== undefined) {
        request.sheetId = options.sheetId
      } else if (!_options?.allSheets) {
        request.allSheets = true
      }

      const _response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: [
            {
              findReplace: request },
          ]
        }
      })

      return (response as Response).data.replies[0].findReplace.occurrencesChanged || 0
    } catch (error) {
      this.logError('findAndReplace', error as Error)
      throw new Error(`Failed to find and replace: ${(error as Error).message}`)
    }

  async sortRange(
    spreadsheetId: string,
    range: unknown
    sortSpecs: Array<{,
      dimensionIndex: number
      sortOrder: 'ASCENDING' | 'DESCENDING'
    }>,
  ): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {,
          requests: [
            {
              sortRange: {
                range,
                sortSpecs
              }
            },
          ]
        }
      })
    } catch (error) {
      this.logError('sortRange', error as Error)
      throw new Error(`Failed to sort range: ${(error as Error).message}`)
    }

  async insertRows(
    spreadsheetId: string,
    sheetId: number
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {,
          requests: [
            {
              insertDimension: {,
                range: {
                  sheetId,
                  dimension: 'ROWS'
                  startIndex,
                  endIndex
                }
              }
            },
          ]
        }
      })
    } catch (error) {
      this.logError('insertRows', error as Error)
      throw new Error(`Failed to insert rows: ${(error as Error).message}`)
    }

  async insertColumns(
    spreadsheetId: string,
    sheetId: number
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {,
          requests: [
            {
              insertDimension: {,
                range: {
                  sheetId,
                  dimension: 'COLUMNS'
                  startIndex,
                  endIndex
                }
              }
            },
          ]
        }
      })
    } catch (error) {
      this.logError('insertColumns', error as Error)
      throw new Error(`Failed to insert columns: ${(error as Error).message}`)
    }

  async duplicateSheet(
    spreadsheetId: string,
    sourceSheetId: number
    newSheetName?: string,
  ): Promise<number> {
    try {
      const _response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {,
          requests: [
            {
              duplicateSheet: {
                sourceSheetId,
                insertSheetIndex: 0
                newSheetName
              }
            },
          ]
        }
      })

      return (response as Response).data.replies[0].duplicateSheet.properties.sheetId
    } catch (error) {
      this.logError('duplicateSheet', error as Error)
      throw new Error(`Failed to duplicate sheet: ${(error as Error).message}`)
    }

}