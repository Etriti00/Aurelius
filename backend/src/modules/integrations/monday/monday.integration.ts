import axios, { AxiosInstance } from 'axios'
import rateLimit from 'axios-rate-limit'
import * as crypto from 'crypto'
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

export class MondayIntegration extends BaseIntegration {
  readonly provider = 'monday'
  readonly name = 'Monday.com'
  readonly version = '1.0.0'

  private mondayClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Create rate-limited axios client for Monday.com GraphQL API
    this.mondayClient = rateLimit(
      axios.create({
        baseURL: 'https://api.monday.com/v2',
        headers: {
          Authorization: accessToken
          'Content-Type': 'application/json',
          'API-Version': '2024-01'
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
      const query = `
        query {
          me {
            id
            name
            email
            title
            photo_thumb_small
            is_admin
            enabled
            account { id name plan { max_users tier }
      `
  }

      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.mondayClient.post('/', { query })
      })

      const userData = response.data.data

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // API tokens don't expire
        scope: [
          'read',
          'write',
          'boards:read',
          'boards:write',
          'items:read',
          'items:write',
          'updates:read',
          'updates:write',
          'webhooks:read',
          'webhooks:write',
        ],
        metadata: {,
          userInfo: {
            id: userData.me.id,
            name: userData.me.name
            email: userData.me.email,
            title: userData.me.title
            photoThumb: userData.me.photo_thumb_small,
            isAdmin: userData.me.is_admin
            enabled: userData.me.enabled
          },
          accountInfo: {,
            id: userData.me.account.id
            name: userData.me.account.name,
            plan: userData.me.account.plan
          }
        }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Monday.com API tokens don't expire, so just return current authentication
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Monday.com doesn't have a programmatic way to revoke tokens
      // They must be revoked manually in Monday.com settings,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const userResponse = await this.executeWithProtection('connection.user', async () => {
        const query = `
          query {
            me {
              id
              name
              email
              account { name plan { tier max_users }
        `
        return this.mondayClient.post('/', { query })
      })
  }

      const userData = userResponse.data.data.me

      return {
        isConnected: true,
        lastChecked: new Date()
        metadata: {,
          userInfo: {
            id: userData.id,
            name: userData.name
            email: userData.email
          },
          accountInfo: {,
            name: userData.account.name
            plan: userData.account.plan
          },
          rateLimitInfo: {,
            limit: 300
            remaining: 280, // Estimated
            resetTime: new Date(Date.now() + 60000)
          }
        }
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
        name: 'Board Management',
        description: 'Create, read, update, and delete boards with basic settings',
        enabled: true,
        requiredScopes: ['read', 'write', 'boards:read', 'boards:write'],
        methods: ['getBoards', 'getBoard', 'createBoard', 'updateBoard']
      },
      {
        name: 'Item Management',
        description: 'Create, read, update items with column values and basic operations',
        enabled: true,
        requiredScopes: ['read', 'write', 'items:read', 'items:write'],
        methods: ['getItems', 'getItem', 'createItem', 'updateItem']
      },
      {
        name: 'Updates & Communication',
        description: 'Create and read updates on items for communication'
        enabled: true,
        requiredScopes: ['read', 'write', 'updates:read', 'updates:write'],
        methods: ['getUpdates', 'addUpdate']
      },
      {
        name: 'Search & Basic Analytics',
        description: 'Search items and boards with basic filtering'
        enabled: true,
        requiredScopes: ['read']
        methods: ['searchItems', 'searchBoards']
      },
      {
        name: 'Webhooks & Real-time Sync',
        description: 'Real-time synchronization with webhook support'
        enabled: true,
        requiredScopes: ['read', 'write', 'webhooks:read', 'webhooks:write'],
        methods: ['syncData', 'handleWebhook', 'createWebhook']
      },
    ]
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const capabilities = this.getCapabilities()
    const allRequiredScopes = capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    try {
      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []
  }

      this.logInfo('syncData', 'Starting Monday.com sync', { lastSyncTime })

      // Sync Boards
      try {
        const boardsResult = await this.syncBoards()
        totalProcessed += boardsResult.processed,
        totalSkipped += boardsResult.skipped
      }
    } catch (error) {
        errors.push(`Boards sync failed: ${(error as Error).message}`)
        this.logError('syncBoards', error as Error)
      }

      catch (error) {
        console.error('Error in monday.integration.ts:', error)
        throw error
      }
      // Sync Items
      try {
        const itemsResult = await this.syncItems(lastSyncTime)
        totalProcessed += itemsResult.processed,
        totalSkipped += itemsResult.skipped
      } catch (error) {
        errors.push(`Items sync failed: ${(error as Error).message}`)
        this.logError('syncItems', error as Error)
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
      throw new SyncError('Monday.com sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Monday.com webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'create_pulse':
        case 'change_column_value':
          await this.handleItemWebhook(payload.data)
          break
        case 'create_update':
          await this.handleUpdateWebhook(payload.data)
          break
        case 'create_board':
          await this.handleBoardWebhook(payload.data)
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
      console.error('Error in monday.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      if (!this.config?.webhookSecret) {
        this.logError('validateWebhookSignature', new Error('No webhook secret configured'))
        return false
      }
  }

      const payloadBody = JSON.stringify(payload)
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payloadBody)
        .digest('hex')

      // Monday.com uses 'sha256=' prefix
      const providedSignature = signature.startsWith('sha256=') ? signature.slice(7) : signature

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex'),
      )
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // Private GraphQL query helper with circuit breaker protection
  private async executeQuery(query: string, variables?: unknown): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('graphql.query', async () => {
        return this.mondayClient.post('/', {
          query,
          variables: variables || {}
        })
      })

      if ((response as Response).data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`)
      }

      return (response as Response).data.data
    } catch (error) {
      this.logError('executeQuery', error as Error, { query, variables }),
      throw error
    }

  // Private sync methods
  private async syncBoards(): Promise<{ processed: number; skipped: number }> {
    try {
      const query = `
        query {
          boards (limit: 100) {
            id
            name
            description
            state
            board_kind
            created_at,
            updated_at
          }
      `

      const data = await this.executeQuery(query)
      const boards = data.boards

      let processed = 0
      let skipped = 0

      for (const board of boards) {
        try {
          await this.processBoard(board)
          processed++
        }
        catch (error) {
          console.error('Error in monday.integration.ts:', error)
          throw error
        }
      }
    } catch (error) {
          this.logError('syncBoards', error as Error, { boardId: board.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncBoards', error as Error),
      throw error
    }

  private async syncItems(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const boardQuery = `
        query {
          boards (limit: 100) {
            id
          }
      `

      const boardData = await this.executeQuery(boardQuery)
      const boards = boardData.boards

      let processed = 0
      let skipped = 0

      for (const board of boards) {
        try {
          const itemsQuery = `
            query ($boardId: [Int!]) {
              boards (ids: $boardId) {
                items (limit: 100) {
                  id
                  name
                  state
                  created_at
                  updated_at
                  column_values {
                    id
                    text,
                    value
                  }
            }
              }
                }
          `
      }

          const itemsData = await this.executeQuery(itemsQuery, { boardId: [parseInt(board.id)] })
          const items = itemsData.boards[0]?.items || []

          for (const item of items) {
            try {
              // Filter by lastSyncTime if provided
              if (lastSyncTime && new Date(item.updated_at) <= lastSyncTime) {
                skipped++,
                continue
              }
          }

              await this.processItem(item, board),
              processed++
            } catch (error) {
              this.logError('syncItems', error as Error, { itemId: item.id })
              skipped++
            }
    } catch (error) {
          this.logError('syncItems', error as Error, { boardId: board.id })
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncItems', error as Error),
      throw error
    }

  // Private processing methods
  private async processBoard(board: unknown): Promise<void> {
    this.logInfo('processBoard', `Processing board: ${board.id}`)
  }

  private async processItem(item: unknown, board: unknown): Promise<void> {
    this.logInfo('processItem', `Processing item: ${item.id}`)
  }

  // Private webhook handlers
  private async handleItemWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleItemWebhook', 'Processing item webhook', data)
  }

  private async handleUpdateWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleUpdateWebhook', 'Processing update webhook', data)
  }

  private async handleBoardWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleBoardWebhook', 'Processing board webhook', data)
  }

  // Public API methods - Core Board Management
  async createBoard(boardData: {,
    name: string
    boardKind: string
    description?: string,
    workspaceId?: string
  }): Promise<string> {
    try {
      const mutation = `
        mutation ($boardName: String!, $boardKind: BoardKind!, $description: String, $workspaceId: Int) {
          create_board (
            board_name: $boardName,
            board_kind: $boardKind
            description: $description,
            workspace_id: $workspaceId
          ) {
            id
          }
        }
      `

      const variables = {
        boardName: boardData.name,
        boardKind: boardData.boardKind
        description: boardData.description,
        workspaceId: boardData.workspaceId ? parseInt(boardData.workspaceId) : undefined
      }

      const data = await this.executeQuery(mutation, variables),
      return data.create_board.id
    }
    } catch (error) {
      this.logError('createBoard', error as Error)
      throw new Error(`Failed to create Monday.com board: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in monday.integration.ts:', error)
      throw error
    }
  async getBoard(boardId: string): Promise<ApiResponse> {
    try {
      const query = `
        query ($boardId: [Int!]) {
          boards (ids: $boardId) {
            id
            name
            description
            state
            board_kind
            created_at
            updated_at
            workspace {
              id,
              name
            }
            columns {
              id
              title,
              type
            }
            groups {
              id
              title,
              color
            }
            owners {
              id
              name,
              email
            }
        }
          }
      `
  }

      const data = await this.executeQuery(query, { boardId: [parseInt(boardId)] })
      return data.boards[0]
    }
    } catch (error) {
      this.logError('getBoard', error as Error)
      throw new Error(`Failed to get Monday.com board: ${(error as Error).message}`)
    }

  async getBoards(workspaceId?: string): Promise<unknown[]> {
    try {
      const query = `
        query ($workspaceIds: [Int]) {
          boards (workspace_ids: $workspaceIds) {
            id
            name
            description
            state
            board_kind
            created_at,
            updated_at
          }
        }
      `
  }

      const variables = workspaceId ? { workspaceIds: [parseInt(workspaceId)] } : {}
      const data = await this.executeQuery(query, variables),
      return data.boards
    }
    } catch (error) {
      this.logError('getBoards', error as Error)
      throw new Error(`Failed to get Monday.com boards: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in monday.integration.ts:', error)
      throw error
    }
  async updateBoard(
    boardId: string,
    updateData: {
      name?: string,
      description?: string
    },
  ): Promise<void> {
    try {
      const mutation = `
        mutation ($boardId: Int!, $boardAttribute: BoardAttributes!) {
          update_board (board_id: $boardId, board_attribute: $boardAttribute) {
            id
          }
        }
      `

      const boardAttribute: unknown = {}
      if (updateData.name) boardAttribute.name = updateData.name
      if (updateData.description) boardAttribute.description = updateData.description

      await this.executeQuery(mutation, {
        boardId: parseInt(boardId)
        boardAttribute
      })
    }
    } catch (error) {
      this.logError('updateBoard', error as Error)
      throw new Error(`Failed to update Monday.com board: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in monday.integration.ts:', error)
      throw error
    }
  // Core Item Management
  async createItem(
    boardId: string,
    itemData: {
      name: string
      columnValues?: { [columnId: string]: unknown }
      groupId?: string
    },
  ): Promise<string> {
    try {
      const mutation = `
        mutation ($boardId: Int!, $itemName: String!, $columnValues: JSON, $groupId: String) {
          create_item (
            board_id: $boardId,
            item_name: $itemName
            column_values: $columnValues,
            group_id: $groupId
          ) {
            id
          }
        }
      `

      const variables = {
        boardId: parseInt(boardId),
        itemName: itemData.name
        columnValues: itemData.columnValues ? JSON.stringify(itemData.columnValues) : undefined,
        groupId: itemData.groupId
      }

      const data = await this.executeQuery(mutation, variables),
      return data.create_item.id
    }
    } catch (error) {
      this.logError('createItem', error as Error)
      throw new Error(`Failed to create Monday.com item: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in monday.integration.ts:', error)
      throw error
    }
  async getItem(itemId: string): Promise<ApiResponse> {
    try {
      const query = `
        query ($itemId: [Int!]) {
          items (ids: $itemId) {
            id
            name
            state
            created_at
            updated_at
            column_values {
              id
              text,
              value
            }
            updates {
              id
              body,
              created_at
            }
        }
          }
      `
  }

      const data = await this.executeQuery(query, { itemId: [parseInt(itemId)] })
      return data.items[0]
    }
    } catch (error) {
      this.logError('getItem', error as Error)
      throw new Error(`Failed to get Monday.com item: ${(error as Error).message}`)
    }

  async getItems(
    boardId: string
    options?: {
      limit?: number,
      page?: number
    },
  ): Promise<unknown[]> {
    try {
      const query = `
        query ($boardId: [Int!], $limit: Int, $page: Int) {
          boards (ids: $boardId) {
            items (
              limit: $limit,
              page: $page
            ) {
              id
              name
              state
              created_at
              updated_at
              board {
                id,
                name
              }
              group {
                id,
                title
              }
              column_values {
                id
                title
                text
                value,
                type
              }
        }
          }
      `

      const variables = {
        boardId: [parseInt(boardId)],
        limit: options?.limit || 100
        page: options?.page || 1
      }

      const data = await this.executeQuery(query, variables),
      return data.boards[0]?.items || []
    }
    } catch (error) {
      this.logError('getItems', error as Error)
      throw new Error(`Failed to get Monday.com items: ${(error as Error).message}`)
    }

  async updateItem(
    itemId: string,
    updateData: {
      name?: string
      columnValues?: { [columnId: string]: unknown },
  ): Promise<void> {
    try {
      if (updateData.name) {
        const nameMutation = `
          mutation ($itemId: Int!, $value: String!) {
            change_simple_column_value (
              item_id: $itemId,
              column_id: "name"
              value: $value
            ) {
              id
            }
          }
        `
      }

        await this.executeQuery(nameMutation, {
          itemId: parseInt(itemId),
          value: updateData.name
        })
      }

      if (updateData.columnValues) {
        const columnMutation = `
          mutation ($itemId: Int!, $columnValues: JSON!) {
            change_multiple_column_values (
              item_id: $itemId,
              column_values: $columnValues
            ) {
              id
            }
          }
        `
      }

        await this.executeQuery(columnMutation, {
          itemId: parseInt(itemId),
          columnValues: JSON.stringify(updateData.columnValues)
        })
      }
    } catch (error) {
      this.logError('updateItem', error as Error)
      throw new Error(`Failed to update Monday.com item: ${(error as Error).message}`)
    }

  // Core Updates Management
  async addUpdate(itemId: string, body: string): Promise<string> {
    try {
      const mutation = `
        mutation ($itemId: Int!, $body: String!) {
          create_update (
            item_id: $itemId,
            body: $body
          ) {
            id
          }
        }
      `
  }

      const data = await this.executeQuery(mutation, {
        itemId: parseInt(itemId)
        body
      }),

      return data.create_update.id
    }
    } catch (error) {
      this.logError('addUpdate', error as Error)
      throw new Error(`Failed to add update to Monday.com item: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in monday.integration.ts:', error)
      throw error
    }
  async getUpdates(itemId?: string, limit?: number): Promise<unknown[]> {
    try {
      let query: string
      let variables: unknown = {}
  }

      if (itemId) {
        query = `
          query ($itemId: [Int!], $limit: Int) {
            items (ids: $itemId) {
              updates (limit: $limit) {
                id
                body
                created_at
                updated_at
                creator {
                  id
                  name,
                  email
                }
          }
            }
              }
        `
        variables = { itemId: [parseInt(itemId)], limit: limit || 25 } else {
        query = `
          query ($limit: Int) {
            updates (limit: $limit) {
              id
              body
              created_at
              updated_at
              creator {
                id
                name,
                email
              },
              item_id
            }
          }
        `
        variables = { limit: limit || 25 }
      }

      const data = await this.executeQuery(query, variables),
      return itemId ? data.items[0]?.updates || [] : data.updates
    }
    } catch (error) {
      this.logError('getUpdates', error as Error)
      throw new Error(`Failed to get Monday.com updates: ${(error as Error).message}`)
    }

  // Core Search Methods
  async searchItems(boardId: string, query?: string): Promise<unknown[]> {
    try {
      const searchQuery = `
        query ($boardId: [Int!]) {
          boards (ids: $boardId) {
            items (limit: 100) {
              id
              name
              state
              created_at
              updated_at
              column_values {
                id
                text,
                value
              }
        }
          }
            }
      `
  }

      const data = await this.executeQuery(searchQuery, { boardId: [parseInt(boardId)] })
      let items = data.boards[0]?.items || []

      // Simple text filtering if query provided
      if (query) {
        items = items.filter((item: unknown) =>
          item.name.toLowerCase().includes(query.toLowerCase()),
        )
      },

      return items
    }
    } catch (error) {
      this.logError('searchItems', error as Error)
      throw new Error(`Failed to search Monday.com items: ${(error as Error).message}`)
    }

  async searchBoards(query: string): Promise<unknown[]> {
    try {
      const searchQuery = `
        query {
          boards {
            id
            name
            description
            state
            created_at,
            updated_at
          }
      `
  }

      const data = await this.executeQuery(searchQuery)
      const boards = data.boards

      // Simple text filtering
      return boards.filter(
        (board: unknown) =>
          board.name.toLowerCase().includes(query.toLowerCase()) ||
          (board.description && board.description.toLowerCase().includes(query.toLowerCase())),
      )
    }
    } catch (error) {
      this.logError('searchBoards', error as Error)
      throw new Error(`Failed to search Monday.com boards: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in monday.integration.ts:', error)
      throw error
    }
  // Core Webhook Management
  async createWebhook(boardId: string, url: string, _event: string): Promise<string> {
    try {
      const mutation = `
        mutation ($boardId: Int!, $url: String!, $_event: WebhookEventType!) {
          create_webhook (board_id: $boardId, url: $url, event: $_event) {
            id
          }
        }
      `
  }

      const data = await this.executeQuery(mutation, {
        boardId: parseInt(boardId)
        url,
        event
      }),
      return data.create_webhook.id
    }
    } catch (error) {
      this.logError('createWebhook', error as Error)
      throw new Error(`Failed to create Monday.com webhook: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in monday.integration.ts:', error)
      throw error
    }
  // Real-time Sync Methods
  async syncChanges(lastSyncTime: Date): Promise<SyncResult> {
    try {
      this.logInfo('syncChanges', 'Starting incremental Monday.com sync', { lastSyncTime })
      let totalProcessed = 0
      let totalSkipped = 0
      const errors: string[] = []
  }

      // Sync boards
      try {
        const boardsResult = await this.syncBoards()
        totalProcessed += boardsResult.processed,
        totalSkipped += boardsResult.skipped
      }
    } catch (error) {
        errors.push(`Boards sync failed: ${(error as Error).message}`)
      }
      catch (error) {
        console.error('Error in monday.integration.ts:', error)
        throw error
      }
      // Sync items updated since last sync
      try {
        const itemsResult = await this.syncItems(lastSyncTime)
        totalProcessed += itemsResult.processed,
        totalSkipped += itemsResult.skipped
      } catch (error) {
        errors.push(`Items sync failed: ${(error as Error).message}`)
      }
      return {
        success: errors.length === 0,
        itemsProcessed: totalProcessed
        itemsSkipped: totalSkipped
        errors,
        metadata: {,
          syncedAt: new Date()
          provider: this.provider
          lastSyncTime
        }
      }
    } catch (error) {
      this.logError('syncChanges', error as Error)
      throw new Error(`Failed to sync Monday.com changes: ${(error as Error).message}`)
    }

}