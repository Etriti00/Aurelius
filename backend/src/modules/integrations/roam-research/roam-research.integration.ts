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

export class RoamResearchIntegration extends BaseIntegration {
  readonly provider = 'roam-research'
  readonly name = 'Roam Research'
  readonly version = '1.0.0'

  private baseUrl = 'https://api.roamresearch.com'
  private graphName: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig & { graphName?: string },
  ) {
    super(userId accessToken, refreshToken),
    this.graphName = config?.graphName || ''
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/graphs/${this.graphName}/user`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: ['roam:read', 'roam:write'],
        metadata: {,
          userInfo: data
          graphName: this.graphName
        }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Roam Research uses API tokens that don't expire, so just return current auth status
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Roam Research doesn't have a revoke endpoint for API tokens
      // The token would need to be regenerated in the user's settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/graphs/${this.graphName}`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if ((response as Response).ok) {
        const data = await response.json()
        return {
          isConnected: true,
          lastChecked: new Date()
          metadata: {,
            graphName: data.name
            graphId: data.id
          }
        }
      }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Invalid API token'
        }
    }
  }
      }

      if ((response as Response).status === 403) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Access denied to graph'
        }
    }
  }
      }

      if ((response as Response).status === 429) {
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
        error: response.statusText
      }
    }
  }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Pages',
        description: 'Create and manage pages in Roam graph'
        enabled: true,
        requiredScopes: ['roam:read', 'roam:write']
      },
      {
        name: 'Blocks',
        description: 'Create and manage blocks and nested content'
        enabled: true,
        requiredScopes: ['roam:read', 'roam:write']
      },
      {
        name: 'References',
        description: 'Manage page references and backlinks'
        enabled: true,
        requiredScopes: ['roam:read', 'roam:write']
      },
      {
        name: 'Tags',
        description: 'Create and manage tags and mentions'
        enabled: true,
        requiredScopes: ['roam:read', 'roam:write']
      },
      {
        name: 'Graph',
        description: 'Access graph structure and metadata'
        enabled: true,
        requiredScopes: ['roam:read']
      },
      {
        name: 'Search',
        description: 'Search across all pages and blocks'
        enabled: true,
        requiredScopes: ['roam:read']
      },
      {
        name: 'Daily Notes',
        description: 'Manage daily note pages'
        enabled: true,
        requiredScopes: ['roam:read', 'roam:write']
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

      this.logInfo('syncData', 'Starting Roam Research sync', { lastSyncTime })

      // Sync Pages
      try {
        const pagesResult = await this.syncPages(lastSyncTime)
        totalProcessed += pagesResult.processed,
        totalSkipped += pagesResult.skipped
      }
    } catch (error) {
        errors.push(`Pages sync failed: ${(error as Error).message}`)
        this.logError('syncPages', error as Error)
      }

      catch (error) {
        console.error('Error in roam-research.integration.ts:', error)
        throw error
      }
      // Sync Daily Notes
      try {
        const dailyNotesResult = await this.syncDailyNotes(lastSyncTime)
        totalProcessed += dailyNotesResult.processed,
        totalSkipped += dailyNotesResult.skipped
      } catch (error) {
        errors.push(`Daily notes sync failed: ${(error as Error).message}`)
        this.logError('syncDailyNotes', error as Error)
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
      throw new SyncError('Roam Research sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Roam Research webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'page_created':
        case 'page_updated':
        case 'page_deleted':
          await this.handlePageWebhook(payload.data)
          break
        case 'block_created':
        case 'block_updated':
        case 'block_deleted':
          await this.handleBlockWebhook(payload.data)
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
      console.error('Error in roam-research.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Roam Research webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncPages(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/graphs/${this.graphName}/pages`

      if (lastSyncTime) {
        url += `?updatedAfter=${lastSyncTime.toISOString()}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`)
      }

      const data = await response.json()
      const pages = data.pages || []

      let processed = 0
      let skipped = 0

      for (const page of pages) {
        try {
          await this.processPage(page)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncPages', error as Error, { pageTitle: page.title })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncPages', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in roam-research.integration.ts:', error)
      throw error
    }
  private async syncDailyNotes(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let url = `${this.baseUrl}/graphs/${this.graphName}/daily-notes`

      if (lastSyncTime) {
        url += `?from=${lastSyncTime.toISOString()}`
      }

      const response = await fetch(url, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch daily notes: ${response.statusText}`)
      }

      const data = await response.json()
      const dailyNotes = data.dailyNotes || []

      let processed = 0
      let skipped = 0

      for (const note of dailyNotes) {
        try {
          await this.processDailyNote(note)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncDailyNotes', error as Error, { date: note.date })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncDailyNotes', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in roam-research.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processPage(page: unknown): Promise<void> {
    this.logInfo('processPage', `Processing page: ${page.title}`)
  }

  private async processDailyNote(note: unknown): Promise<void> {
    this.logInfo('processDailyNote', `Processing daily note: ${note.date}`)
  }

  // Private webhook handlers
  private async handlePageWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePageWebhook', 'Processing page webhook', data)
  }

  private async handleBlockWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleBlockWebhook', 'Processing block webhook', data)
  }

  // Public API methods
  async getPages(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/graphs/${this.graphName}/pages`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get pages: ${response.statusText}`)
      }

      const data = await response.json()
      return data.pages || []
    } catch (error) {
      this.logError('getPages', error as Error)
      throw new Error(`Failed to get Roam Research pages: ${(error as Error).message}`)
    }

  async getPage(pageTitle: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/graphs/${this.graphName}/pages/${encodeURIComponent(pageTitle)}`,
        {
          headers: {,
            Authorization: `Bearer ${this.accessToken}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get page: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getPage', error as Error)
      throw new Error(`Failed to get Roam Research page: ${(error as Error).message}`)
    }

  async createPage(pageData: {,
    title: string
    blocks?: Array<{
      string: string
      children?: unknown[]
    }>
  }): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/graphs/${this.graphName}/pages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pageData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create page: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createPage', error as Error)
      throw new Error(`Failed to create Roam Research page: ${(error as Error).message}`)
    }

  async updatePage(pageTitle: string, pageData: unknown): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/graphs/${this.graphName}/pages/${encodeURIComponent(pageTitle)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pageData)
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to update page: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('updatePage', error as Error)
      throw new Error(`Failed to update Roam Research page: ${(error as Error).message}`)
    }

  async deletePage(pageTitle: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/graphs/${this.graphName}/pages/${encodeURIComponent(pageTitle)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        },
      )
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('deletePage', error as Error)
      throw new Error(`Failed to delete Roam Research page: ${(error as Error).message}`)
    }

  async createBlock(
    pageTitle: string,
    blockData: {
      string: string
      parentUid?: string,
      order?: number
    },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/graphs/${this.graphName}/pages/${encodeURIComponent(pageTitle)}/blocks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(blockData)
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to create block: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createBlock', error as Error)
      throw new Error(`Failed to create Roam Research block: ${(error as Error).message}`)
    }

  async updateBlock(
    blockUid: string,
    blockData: {
      string?: string,
      open?: boolean
    },
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/graphs/${this.graphName}/blocks/${blockUid}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blockData)
      })

      if (!response.ok) {
        throw new Error(`Failed to update block: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('updateBlock', error as Error)
      throw new Error(`Failed to update Roam Research block: ${(error as Error).message}`)
    }

  async deleteBlock(blockUid: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/graphs/${this.graphName}/blocks/${blockUid}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('deleteBlock', error as Error)
      throw new Error(`Failed to delete Roam Research block: ${(error as Error).message}`)
    }

  async search(query: string): Promise<unknown[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/graphs/${this.graphName}/search?q=${encodeURIComponent(query)}`,
        {
          headers: {,
            Authorization: `Bearer ${this.accessToken}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to search: ${response.statusText}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      this.logError('search', error as Error)
      throw new Error(`Failed to search Roam Research: ${(error as Error).message}`)
    }

  async getDailyNote(date: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/graphs/${this.graphName}/daily-notes/${date}`,
        {
          headers: {,
            Authorization: `Bearer ${this.accessToken}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get daily note: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getDailyNote', error as Error)
      throw new Error(`Failed to get Roam Research daily note: ${(error as Error).message}`)
    }

  async createDailyNote(date: string, blocks?: unknown[]): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/graphs/${this.graphName}/daily-notes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date,
          blocks: blocks || []
        })
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to create daily note: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createDailyNote', error as Error)
      throw new Error(`Failed to create Roam Research daily note: ${(error as Error).message}`)
    }

  async getBacklinks(pageTitle: string): Promise<unknown[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/graphs/${this.graphName}/pages/${encodeURIComponent(pageTitle)}/backlinks`,
        {
          headers: {,
            Authorization: `Bearer ${this.accessToken}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get backlinks: ${response.statusText}`)
      }

      const data = await response.json()
      return data.backlinks || []
    } catch (error) {
      this.logError('getBacklinks', error as Error)
      throw new Error(`Failed to get Roam Research backlinks: ${(error as Error).message}`)
    }

}