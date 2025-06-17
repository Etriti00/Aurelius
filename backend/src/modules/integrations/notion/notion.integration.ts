import { Client } from '@notionhq/client'
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
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

export class NotionIntegration extends BaseIntegration {
  readonly provider = 'notion'
  readonly name = 'Notion'
  readonly version = '1.0.0'

  private notionClient: Client

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.notionClient = new Client({ auth: accessToken })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting current bot user
      await this.notionClient.users.me({})
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Notion tokens don't expire by default
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Notion tokens don't expire by default, so just return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Notion doesn't have a programmatic way to revoke access tokens
      // They must be revoked manually in Notion integrations settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.notionClient.users.me({})
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 3,
            remaining: 0
            resetTime: new Date(Date.now() + 1000), // 1 second
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
        name: 'Databases',
        description: 'Access and manage Notion databases'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Pages',
        description: 'Create, read, update, and manage Notion pages',
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Blocks',
        description: 'Manage page content blocks'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Comments',
        description: 'Add and manage page comments'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Search',
        description: 'Search across Notion workspace'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Users',
        description: 'Access workspace user information'
        enabled: true,
        requiredScopes: ['read']
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

      this.logInfo('syncData', 'Starting Notion sync', { lastSyncTime })

      // Sync Databases
      try {
        const databasesResult = await this.syncDatabases()
        totalProcessed += databasesResult.processed,
        totalSkipped += databasesResult.skipped
      }
    } catch (error) {
        errors.push(`Databases sync failed: ${(error as Error).message}`)
        this.logError('syncDatabases', error as Error)
      }

      catch (error) {
        console.error('Error in notion.integration.ts:', error)
        throw error
      }
      // Sync Pages
      try {
        const pagesResult = await this.syncPages(lastSyncTime)
        totalProcessed += pagesResult.processed,
        totalSkipped += pagesResult.skipped
      } catch (error) {
        errors.push(`Pages sync failed: ${(error as Error).message}`)
        this.logError('syncPages', error as Error)
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
      throw new SyncError('Notion sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Notion webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Notion webhooks available for paid plans via webhook API
      // Implement webhook handling for database and page changes
      this.logInfo('handleWebhook', 'Notion webhooks not yet supported')
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Notion webhook validation would be implemented here when available,
    return true
  }

  // Private sync methods
  private async syncDatabases(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.notionClient.search({
        filter: {,
          value: 'database'
          property: 'object'
        },
        page_size: 100
      })

      let processed = 0
      let skipped = 0

      for (const database of response.results) {
        try {
          await this.processDatabase(database)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncDatabases', error as Error, { databaseId: database.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncDatabases', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in notion.integration.ts:', error)
      throw error
    }
  private async syncPages(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const params: unknown = {,
        filter: {
          value: 'page',
          property: 'object'
        },
        page_size: 100
      }

      const _response = await this.notionClient.search(params)

      let processed = 0
      let skipped = 0

      for (const page of response.results) {
        try {
          // Filter by lastSyncTime if provided
          if (lastSyncTime && new Date((page as unknown).last_edited_time) <= lastSyncTime) {
            skipped++,
            continue
          }
      }

          await this.processPage(page)
          processed++
        }
    } catch (error) {
          this.logError('syncPages', error as Error, { pageId: page.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncPages', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in notion.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processDatabase(database: unknown): Promise<void> {
    this.logInfo('processDatabase', `Processing database: ${database.id}`)
  }

  private async processPage(page: unknown): Promise<void> {
    this.logInfo('processPage', `Processing page: ${page.id}`)
  }

  // Public API methods
  async createPage(
    parentId: string,
    pageData: {
      title: string
      properties?: unknown,
      children?: unknown[]
    },
  ): Promise<string> {
    try {
      const _response = await this.notionClient.pages.create({ parent: {,
          database_id: parentId },
        properties: { title: {,
            title: [
              {
                text: {,
                  content: pageData.title }
              },
            ]
          },
          ...pageData.properties
        },
        children: pageData.children || []
      })

      return (response as Response).id
    } catch (error) {
      this.logError('createPage', error as Error)
      throw new Error(`Failed to create Notion page: ${(error as Error).message}`)
    }

  async updatePage(
    pageId: string,
    updateData: {
      properties?: unknown,
      archived?: boolean
    },
  ): Promise<void> {
    try {
      await this.notionClient.pages.update({
        page_id: pageId
        ...updateData
      })
    } catch (error) {
      this.logError('updatePage', error as Error)
      throw new Error(`Failed to update Notion page: ${(error as Error).message}`)
    }

  async getPage(pageId: string): Promise<ApiResponse> {
    try {
      return await this.notionClient.pages.retrieve({ page_id: pageId })
    } catch (error) {
      this.logError('getPage', error as Error)
      throw new Error(`Failed to get Notion page: ${(error as Error).message}`)
    }

  async getDatabase(databaseId: string): Promise<ApiResponse> {
    try {
      return await this.notionClient.databases.retrieve({ database_id: databaseId })
    } catch (error) {
      this.logError('getDatabase', error as Error)
      throw new Error(`Failed to get Notion database: ${(error as Error).message}`)
    }

  async queryDatabase(
    databaseId: string
    options?: {
      filter?: unknown
      sorts?: unknown[]
      startCursor?: string,
      pageSize?: number
    },
  ): Promise<ApiResponse> {
    try {
      const params: unknown = {,
        database_id: databaseId
        page_size: options?.pageSize || 100
      }

      if (_options?.filter) params.filter = options.filter
      if (_options?.sorts) params.sorts = options.sorts
      if (_options?.startCursor) params.start_cursor = options.startCursor

      return await this.notionClient.databases.query(params)
    } catch (error) {
      this.logError('queryDatabase', error as Error)
      throw new Error(`Failed to query Notion database: ${(error as Error).message}`)
    }

  async getPageBlocks(pageId: string, startCursor?: string): Promise<ApiResponse> {
    try {
      const params: unknown = {,
        block_id: pageId
        page_size: 100
      }
  }

      if (startCursor) params.start_cursor = startCursor

      return await this.notionClient.blocks.children.list(params)
    } catch (error) {
      this.logError('getPageBlocks', error as Error)
      throw new Error(`Failed to get Notion page blocks: ${(error as Error).message}`)
    }

  async appendBlocks(pageId: string, blocks: unknown[]): Promise<void> {
    try {
      await this.notionClient.blocks.children.append({
        block_id: pageId,
        children: blocks
      })
    } catch (error) {
      this.logError('appendBlocks', error as Error)
      throw new Error(`Failed to append blocks to Notion page: ${(error as Error).message}`)
    }

  async updateBlock(blockId: string, blockData: unknown): Promise<void> {
    try {
      await this.notionClient.blocks.update({
        block_id: blockId
        ...blockData
      })
    } catch (error) {
      this.logError('updateBlock', error as Error)
      throw new Error(`Failed to update Notion block: ${(error as Error).message}`)
    }

  async deleteBlock(blockId: string): Promise<void> {
    try {
      await this.notionClient.blocks.delete({ block_id: blockId })
    } catch (error) {
      this.logError('deleteBlock', error as Error)
      throw new Error(`Failed to delete Notion block: ${(error as Error).message}`)
    }

  async search(
    query: string
    options?: {
      filter?: unknown
      sort?: unknown
      startCursor?: string,
      pageSize?: number
    },
  ): Promise<ApiResponse> {
    try {
      const params: unknown = {
        query,
        page_size: options?.pageSize || 100
      }

      if (_options?.filter) params.filter = options.filter
      if (_options?.sort) params.sort = options.sort
      if (_options?.startCursor) params.start_cursor = options.startCursor

      return await this.notionClient.search(params)
    } catch (error) {
      this.logError('search', error as Error)
      throw new Error(`Failed to search Notion: ${(error as Error).message}`)
    }

  async createComment(pageId: string, content: string): Promise<string> {
    try {
      const _response = await this.notionClient.comments.create({ parent: {,
          page_id: pageId },
        rich_text: [
          { text: {
              content }
          },
        ]
      })
  }

      return (response as Response).id
    } catch (error) {
      this.logError('createComment', error as Error)
      throw new Error(`Failed to create Notion comment: ${(error as Error).message}`)
    }

  async getComments(pageId: string, startCursor?: string): Promise<ApiResponse> {
    try {
      const params: unknown = {,
        block_id: pageId
        page_size: 100
      }
  }

      if (startCursor) params.start_cursor = startCursor

      return await this.notionClient.comments.list(params)
    } catch (error) {
      this.logError('getComments', error as Error)
      throw new Error(`Failed to get Notion comments: ${(error as Error).message}`)
    }

  async getUsers(): Promise<ApiResponse> {
    try {
      return await this.notionClient.users.list({ page_size: 100 })
    } catch (error) {
      this.logError('getUsers', error as Error)
      throw new Error(`Failed to get Notion users: ${(error as Error).message}`)
    }

  async getUser(userId: string): Promise<ApiResponse> {
    try {
      return await this.notionClient.users.retrieve({ user_id: userId })
    } catch (error) {
      this.logError('getUser', error as Error)
      throw new Error(`Failed to get Notion user: ${(error as Error).message}`)
    }

}