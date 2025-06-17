import axios, { AxiosInstance } from 'axios'
import rateLimit from 'axios-rate-limit'
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
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class SmartsheetIntegration extends BaseIntegration {
  readonly provider = 'smartsheet'
  readonly name = 'Smartsheet'
  readonly version = '1.0.0'

  private smartsheetClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Create rate-limited axios client
    this.smartsheetClient = rateLimit(
      axios.create({
        baseURL: 'https://api.smartsheet.com/2.0',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }),
      {
        maxRequests: 300,
        perMilliseconds: 60000, // 300 requests per minute
      },
    )
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current user
      await this.smartsheetClient.get('/users/me')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // API tokens don't expire
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Smartsheet API tokens don't expire, so just return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Smartsheet doesn't have a programmatic way to revoke tokens
      // They must be revoked manually in Smartsheet settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.smartsheetClient.get('/users/me')
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.response?.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.response?.status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 300,
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
        name: 'Sheets',
        description: 'Access and manage Smartsheet sheets'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Rows',
        description: 'Create, read, update, and manage sheet rows',
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Columns',
        description: 'Manage sheet columns and their properties'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Workspaces',
        description: 'Access workspace information'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Comments',
        description: 'Add and read row comments'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Attachments',
        description: 'Handle row attachments and files'
        enabled: true,
        requiredScopes: ['read', 'write']
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

      this.logInfo('syncData', 'Starting Smartsheet sync', { lastSyncTime })

      // Sync Workspaces
      try {
        const workspacesResult = await this.syncWorkspaces()
        totalProcessed += workspacesResult.processed,
        totalSkipped += workspacesResult.skipped
      }
    } catch (error) {
        errors.push(`Workspaces sync failed: ${(error as Error).message}`)
        this.logError('syncWorkspaces', error as Error)
      }

      catch (error) {
        console.error('Error in smartsheet.integration.ts:', error)
        throw error
      }
      // Sync Sheets
      try {
        const sheetsResult = await this.syncSheets()
        totalProcessed += sheetsResult.processed,
        totalSkipped += sheetsResult.skipped
      } catch (error) {
        errors.push(`Sheets sync failed: ${(error as Error).message}`)
        this.logError('syncSheets', error as Error)
      }

      // Sync Rows
      try {
        const rowsResult = await this.syncRows(lastSyncTime)
        totalProcessed += rowsResult.processed,
        totalSkipped += rowsResult.skipped
      } catch (error) {
        errors.push(`Rows sync failed: ${(error as Error).message}`)
        this.logError('syncRows', error as Error)
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
      throw new SyncError('Smartsheet sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Smartsheet webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'sheet.created':
        case 'sheet.updated':
          await this.handleSheetWebhook(payload.data)
          break
        case 'row.created':
        case 'row.updated':
          await this.handleRowWebhook(payload.data)
          break
        case 'row.deleted':
          await this.handleRowDeletedWebhook(payload.data)
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
      console.error('Error in smartsheet.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Smartsheet webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncWorkspaces(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.smartsheetClient.get('/workspaces')
      const workspaces = response.data.data

      let processed = 0
      let skipped = 0

      for (const workspace of workspaces) {
        try {
          await this.processWorkspace(workspace)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncWorkspaces', error as Error, { workspaceId: workspace.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncWorkspaces', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in smartsheet.integration.ts:', error)
      throw error
    }
  private async syncSheets(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.smartsheetClient.get('/sheets')
      const sheets = response.data.data

      let processed = 0
      let skipped = 0

      for (const sheet of sheets) {
        try {
          await this.processSheet(sheet)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncSheets', error as Error, { sheetId: sheet.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncSheets', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in smartsheet.integration.ts:', error)
      throw error
    }
  private async syncRows(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const sheetsResponse = await this.smartsheetClient.get('/sheets')
      const sheets = sheetsResponse.data.data

      let processed = 0
      let skipped = 0

      for (const sheet of sheets) {
        try {
          const params: Record<string, string | number | boolean> = {}
          if (lastSyncTime) {
            params.rowsModifiedSince = lastSyncTime.toISOString()
          }
      }

          const rowsResponse = await this.smartsheetClient.get(`/sheets/${sheet.id}`, { params })
          const rows = rowsResponse.data.rows || []

          for (const row of rows) {
            try {
              // Filter by lastSyncTime if provided
              if (lastSyncTime && new Date(row.modifiedAt) <= lastSyncTime) {
                skipped++,
                continue
              }
          }

              await this.processRow(row, sheet),
              processed++
            }
    } catch (error) {
              this.logError('syncRows', error as Error, { rowId: row.id })
              skipped++
            }
    } catch (error) {
          this.logError('syncRows', error as Error, { sheetId: sheet.id })
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncRows', error as Error),
      throw error
    }

  // Private processing methods
  private async processWorkspace(workspace: unknown): Promise<void> {
    this.logInfo('processWorkspace', `Processing workspace: ${workspace.id}`)
  }

  private async processSheet(sheet: unknown): Promise<void> {
    this.logInfo('processSheet', `Processing sheet: ${sheet.id}`)
  }

  private async processRow(row: unknown, sheet: unknown): Promise<void> {
    this.logInfo('processRow', `Processing row: ${row.id}`)
  }

  // Private webhook handlers
  private async handleSheetWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleSheetWebhook', 'Processing sheet webhook', data)
  }

  private async handleRowWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleRowWebhook', 'Processing row webhook', data)
  }

  private async handleRowDeletedWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleRowDeletedWebhook', 'Processing row deleted webhook', data)
  }

  // Public API methods
  async createRow(
    sheetId: string,
    rowData: {
      cells: Array<{,
        columnId: number
        value: unknown
      }>
      toTop?: boolean
      toBottom?: boolean
      parentId?: number,
      siblingId?: number
    },
  ): Promise<string> {
    try {
      const data = [rowData]

      const _response = await this.smartsheetClient.post(`/sheets/${sheetId}/rows`, data)
      return (response as Response).data.result[0].id.toString()
    }
    } catch (error) {
      this.logError('createRow', error as Error)
      throw new Error(`Failed to create Smartsheet row: ${(error as Error).message}`)
    }

  async updateRow(
    sheetId: string,
    rowId: string
    updateData: {,
      cells: Array<{
        columnId: number,
        value: unknown
      }>
    },
  ): Promise<void> {
    try {
      const data = [
        {
          id: parseInt(rowId),
          cells: updateData.cells
        },
      ]

      await this.smartsheetClient.put(`/sheets/${sheetId}/rows`, data)
    }
    } catch (error) {
      this.logError('updateRow', error as Error)
      throw new Error(`Failed to update Smartsheet row: ${(error as Error).message}`)
    }

  async deleteRow(sheetId: string, rowId: string): Promise<void> {
    try {
      await this.smartsheetClient.delete(`/sheets/${sheetId}/rows?ids=${rowId}`)
    }
    } catch (error) {
      this.logError('deleteRow', error as Error)
      throw new Error(`Failed to delete Smartsheet row: ${(error as Error).message}`)
    }

  async addComment(sheetId: string, rowId: string, text: string): Promise<string> {
    try {
      const _response = await this.smartsheetClient.post(
        `/sheets/${sheetId}/rows/${rowId}/discussions`,
        {
          comment: { text }
        },
      )
      return (response as Response).data.result.id.toString()
    }
    } catch (error) {
      this.logError('addComment', error as Error)
      throw new Error(`Failed to add comment to Smartsheet row: ${(error as Error).message}`)
    }

  async getSheet(sheetId: string, includeRows: boolean = true): Promise<ApiResponse> {
    try {
      const params: Record<string, string | number | boolean> = {}
      if (includeRows) {
        params.include = 'rows'
      }
  }

      const _response = await this.smartsheetClient.get(`/sheets/${sheetId}`, { params })
      return (response as Response).data
    }
    } catch (error) {
      this.logError('getSheet', error as Error)
      throw new Error(`Failed to get Smartsheet sheet: ${(error as Error).message}`)
    }

  async createSheet(sheetData: {,
    name: string
    columns: Array<{,
      title: string
      type: string
      primary?: boolean,
      width?: number
    }>
  }): Promise<string> {
    try {
      const _response = await this.smartsheetClient.post('/sheets', sheetData)
      return (response as Response).data.result.id.toString()
    }
    } catch (error) {
      this.logError('createSheet', error as Error)
      throw new Error(`Failed to create Smartsheet sheet: ${(error as Error).message}`)
    }

  async createColumn(
    sheetId: string,
    columnData: {
      title: string,
      type: string
      index?: number
      width?: number,
      options?: string[]
    },
  ): Promise<string> {
    try {
      const data = [columnData]

      const _response = await this.smartsheetClient.post(`/sheets/${sheetId}/columns`, data)
      return (response as Response).data.result[0].id.toString()
    }
    } catch (error) {
      this.logError('createColumn', error as Error)
      throw new Error(`Failed to create Smartsheet column: ${(error as Error).message}`)
    }

  async getSheets(workspaceId?: string): Promise<unknown[]> {
    try {
      let url = '/sheets'
      if (workspaceId) {
        url = `/workspaces/${workspaceId}/sheets`
      }
  }

      const _response = await this.smartsheetClient.get(url)
      return (response as Response).data.data
    }
    } catch (error) {
      this.logError('getSheets', error as Error)
      throw new Error(`Failed to get Smartsheet sheets: ${(error as Error).message}`)
    }

  async getWorkspaces(): Promise<unknown[]> {
    try {
      const _response = await this.smartsheetClient.get('/workspaces')
      return (response as Response).data.data
    }
    } catch (error) {
      this.logError('getWorkspaces', error as Error)
      throw new Error(`Failed to get Smartsheet workspaces: ${(error as Error).message}`)
    }

  async searchSheets(query: string): Promise<unknown[]> {
    try {
      const _response = await this.smartsheetClient.get(
        `/search?query=${encodeURIComponent(query)}`,
      )
      return (response as Response).data.results.filter(
        (result: unknown) => result.objectType === 'sheet'
      )
    }
    } catch (error) {
      this.logError('searchSheets', error as Error)
      throw new Error(`Failed to search Smartsheet sheets: ${(error as Error).message}`)
    }

  async getRow(sheetId: string, rowId: string): Promise<ApiResponse> {
    try {
      const _response = await this.smartsheetClient.get(`/sheets/${sheetId}/rows/${rowId}`)
      return (response as Response).data
    }
    } catch (error) {
      this.logError('getRow', error as Error)
      throw new Error(`Failed to get Smartsheet row: ${(error as Error).message}`)
    }

  async addAttachment(
    sheetId: string,
    rowId: string
    attachmentData: {,
      name: string
      file: Buffer
      mimeType?: string
    },
  ): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('file', new Blob([attachmentData.file]), attachmentData.name)
      if (attachmentData.mimeType) {
        formData.append('mimeType', attachmentData.mimeType)
      }

      const _response = await this.smartsheetClient.post(
        `/sheets/${sheetId}/rows/${rowId}/attachments`,
        formData,
        { headers: {
            'Content-Type': 'multipart/form-data' }
        },
      )
      return (response as Response).data.result.id.toString()
    }
    } catch (error) {
      this.logError('addAttachment', error as Error)
      throw new Error(`Failed to add attachment to Smartsheet row: ${(error as Error).message}`)
    }

  async shareSheet(
    sheetId: string,
    shareData: {
      users: Array<{,
        email: string
        accessLevel: string
      }>
      subject?: string,
      message?: string
    },
  ): Promise<void> {
    try {
      await this.smartsheetClient.post(`/sheets/${sheetId}/shares`, shareData)
    }
    } catch (error) {
      this.logError('shareSheet', error as Error)
      throw new Error(`Failed to share Smartsheet sheet: ${(error as Error).message}`)
    }

}
catch (error) {
  console.error('Error in smartsheet.integration.ts:', error)
  throw error
}