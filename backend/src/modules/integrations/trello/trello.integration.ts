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

interface TrelloWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface TrelloBoard {
  id: string,
  name: string
  desc: string,
  closed: boolean
  url: string,
  shortUrl: string
  prefs: {,
    permissionLevel: string
    hideVotes: boolean,
    voting: string
    comments: string,
    invitations: string
    selfJoin: boolean,
    cardCovers: boolean
    cardAging: string,
    calendarFeedEnabled: boolean
    background: string,
    backgroundColor: string
    backgroundImage: string,
    backgroundImageScaled: unknown[]
    backgroundTile: boolean,
    backgroundBrightness: string
    backgroundBottomColor: string,
    backgroundTopColor: string
    canBePublic: boolean,
    canBeEnterprise: boolean
    canBeOrg: boolean,
    canBePrivate: boolean
    canInvite: boolean
  }
  labelNames: {,
    green: string
    yellow: string,
    orange: string
    red: string,
    purple: string
    blue: string,
    sky: string
    lime: string,
    pink: string
    black: string
  }
}

interface TrelloList {
  id: string,
  name: string
  closed: boolean,
  pos: number
  softLimit: number | null,
  idBoard: string
  subscribed: boolean
}

interface TrelloCard {
  id: string,
  checkItemStates: unknown[]
  closed: boolean,
  dateLastActivity: string
  desc: string,
  descData: {
    emoji: any
  }
  dueReminder: any,
  idBoard: string
  idList: string,
  idMembersVoted: string[]
  idShort: number,
  idAttachmentCover: string | null
  idLabels: string[],
  manualCoverAttachment: boolean
  name: string,
  pos: number
  shortLink: string,
  shortUrl: string
  start: string | null,
  subscribed: boolean
  url: string,
  cover: {
    idAttachment: string | null,
    color: string | null
    idUploadedBackground: string | null,
    size: string
    brightness: string,
    idPlugin: string | null
  }
  isTemplate: boolean,
  cardRole: string | null
  due: string | null,
  dueComplete: boolean
  idMembers: string[],
  labels: unknown[]
  badges: {,
    attachmentsByType: {
      trello: {,
        board: number
        card: number
      }
    }
    location: boolean,
    votes: number
    viewingMemberVoted: boolean,
    subscribed: boolean
    fogbugz: string,
    checkItems: number
    checkItemsChecked: number,
    checkItemsEarliestDue: string | null
    comments: number,
    attachments: number
    description: boolean,
    due: string | null
    dueComplete: boolean,
    start: string | null
  }
}

export class TrelloIntegration extends BaseIntegration {
  readonly provider = 'trello'
  readonly name = 'Trello'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://api.trello.com/1'

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
        return this.makeApiCall('/members/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Trello tokens don't expire
        scope: ['read', 'write'],
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
      // Trello tokens don't expire, but we can validate them
      const response = await this.executeWithProtection('refresh.test', async () => {
        return this.makeApiCall('/members/me', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        scope: ['read', 'write'],
        data: response
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token validation failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.TASKS,
      IntegrationCapability.PROJECTS,
      IntegrationCapability.BOARDS,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/members/me', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          memberId: response.id
          username: response.username,
          fullName: response.fullName
          memberType: response.memberType
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

      // Sync boards
      try {
        const boardResult = await this.syncBoards()
        totalProcessed += boardResult.processed
        totalErrors += boardResult.errors
        if (boardResult.errorMessages) {
          errors.push(...boardResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Board sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync cards
      try {
        const cardResult = await this.syncCards()
        totalProcessed += cardResult.processed
        totalErrors += cardResult.errors
        if (cardResult.errorMessages) {
          errors.push(...cardResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Card sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Trello sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const trelloPayload = payload as TrelloWebhookPayload

      switch (trelloPayload.type) {
        case 'trello.board.created':
        case 'trello.board.updated':
          await this.handleBoardWebhook(trelloPayload)
          break
        case 'trello.card.created':
        case 'trello.card.updated':
        case 'trello.card.moved':
          await this.handleCardWebhook(trelloPayload)
          break
        case 'trello.list.created':
        case 'trello.list.updated':
          await this.handleListWebhook(trelloPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${trelloPayload.type}`)
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
      // Trello doesn't have a revoke endpoint, but we can mark as disconnected
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncBoards(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.boards', async () => {
        return this.makeApiCall('/members/me/boards', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const boards = response || []

      for (const board of boards) {
        try {
          await this.processBoard(board)
          processed++
        } catch (error) {
          errors.push(`Failed to process board ${board.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Board sync failed: ${(error as Error).message}`)
    }
  }

  private async syncCards(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.cards', async () => {
        return this.makeApiCall('/members/me/cards', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const cards = response || []

      for (const card of cards) {
        try {
          await this.processCard(card)
          processed++
        } catch (error) {
          errors.push(`Failed to process card ${card.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Card sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processBoard(board: any): Promise<void> {
    this.logger.debug(`Processing Trello board: ${board.name}`)
    // Process board data for Aurelius AI system
  }

  private async processCard(card: any): Promise<void> {
    this.logger.debug(`Processing Trello card: ${card.name}`)
    // Process card data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleBoardWebhook(payload: TrelloWebhookPayload): Promise<void> {
    this.logger.debug(`Handling board webhook: ${payload.id}`)
    // Handle board webhook processing
  }

  private async handleCardWebhook(payload: TrelloWebhookPayload): Promise<void> {
    this.logger.debug(`Handling card webhook: ${payload.id}`)
    // Handle card webhook processing
  }

  private async handleListWebhook(payload: TrelloWebhookPayload): Promise<void> {
    this.logger.debug(`Handling list webhook: ${payload.id}`)
    // Handle list webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
    body?: unknown,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`
    const params = new URLSearchParams({
      key: this.config?.clientId || '',
      token: this.accessToken
    })

    const finalUrl = `${url}?${params.toString()}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const response = await fetch(finalUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Trello API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    return response.json()
  }

  // Public API methods
  async getBoards(): Promise<TrelloBoard[]> {
    try {
      const response = await this.executeWithProtection('api.get_boards', async () => {
        return this.makeApiCall('/members/me/boards', 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getBoards', error as Error)
      throw new Error(`Failed to get boards: ${(error as Error).message}`)
    }
  }

  async getBoard(boardId: string): Promise<TrelloBoard> {
    try {
      const response = await this.executeWithProtection('api.get_board', async () => {
        return this.makeApiCall(`/boards/${boardId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getBoard', error as Error)
      throw new Error(`Failed to get board: ${(error as Error).message}`)
    }
  }

  async createBoard(boardData: {,
    name: string
    desc?: string
    defaultLabels?: boolean
    defaultLists?: boolean
    prefs_permissionLevel?: 'private' | 'org' | 'public'
    prefs_voting?: 'disabled' | 'members' | 'observers' | 'org' | 'public'
    prefs_comments?: 'disabled' | 'members' | 'observers' | 'org' | 'public'
    prefs_invitations?: 'members' | 'admins'
    prefs_selfJoin?: boolean
    prefs_cardCovers?: boolean
    prefs_background?: string
    prefs_cardAging?: 'regular' | 'pirate'
  }): Promise<TrelloBoard> {
    try {
      const response = await this.executeWithProtection('api.create_board', async () => {
        return this.makeApiCall('/boards', 'POST', boardData)
      })

      return response
    } catch (error) {
      this.logError('createBoard', error as Error)
      throw new Error(`Failed to create board: ${(error as Error).message}`)
    }
  }

  async updateBoard(
    boardId: string,
    boardData: {
      name?: string
      desc?: string
      closed?: boolean
      subscribed?: boolean
      prefs_permissionLevel?: 'private' | 'org' | 'public'
      prefs_selfJoin?: boolean
      prefs_cardCovers?: boolean
      prefs_hideVotes?: boolean
      prefs_invitations?: 'members' | 'admins'
      prefs_voting?: 'disabled' | 'members' | 'observers' | 'org' | 'public'
      prefs_comments?: 'disabled' | 'members' | 'observers' | 'org' | 'public'
      prefs_background?: string
      prefs_cardAging?: 'regular' | 'pirate'
      prefs_calendarFeedEnabled?: boolean
    },
  ): Promise<TrelloBoard> {
    try {
      const response = await this.executeWithProtection('api.update_board', async () => {
        return this.makeApiCall(`/boards/${boardId}`, 'PUT', boardData)
      })

      return response
    } catch (error) {
      this.logError('updateBoard', error as Error)
      throw new Error(`Failed to update board: ${(error as Error).message}`)
    }
  }

  async deleteBoard(boardId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_board', async () => {
        return this.makeApiCall(`/boards/${boardId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteBoard', error as Error)
      throw new Error(`Failed to delete board: ${(error as Error).message}`)
    }
  }

  async getLists(boardId: string): Promise<TrelloList[]> {
    try {
      const response = await this.executeWithProtection('api.get_lists', async () => {
        return this.makeApiCall(`/boards/${boardId}/lists`, 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getLists', error as Error)
      throw new Error(`Failed to get lists: ${(error as Error).message}`)
    }
  }

  async createList(listData: {,
    name: string
    idBoard: string
    pos?: 'top' | 'bottom' | number
  }): Promise<TrelloList> {
    try {
      const response = await this.executeWithProtection('api.create_list', async () => {
        return this.makeApiCall('/lists', 'POST', listData)
      })

      return response
    } catch (error) {
      this.logError('createList', error as Error)
      throw new Error(`Failed to create list: ${(error as Error).message}`)
    }
  }

  async updateList(
    listId: string,
    listData: {
      name?: string
      closed?: boolean
      pos?: 'top' | 'bottom' | number
      subscribed?: boolean
    },
  ): Promise<TrelloList> {
    try {
      const response = await this.executeWithProtection('api.update_list', async () => {
        return this.makeApiCall(`/lists/${listId}`, 'PUT', listData)
      })

      return response
    } catch (error) {
      this.logError('updateList', error as Error)
      throw new Error(`Failed to update list: ${(error as Error).message}`)
    }
  }

  async getCards(boardId?: string, listId?: string): Promise<TrelloCard[]> {
    try {
      let endpoint = '/members/me/cards'
      if (boardId) {
        endpoint = `/boards/${boardId}/cards`
      } else if (listId) {
        endpoint = `/lists/${listId}/cards`
      }

      const response = await this.executeWithProtection('api.get_cards', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getCards', error as Error)
      throw new Error(`Failed to get cards: ${(error as Error).message}`)
    }
  }

  async getCard(cardId: string): Promise<TrelloCard> {
    try {
      const response = await this.executeWithProtection('api.get_card', async () => {
        return this.makeApiCall(`/cards/${cardId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getCard', error as Error)
      throw new Error(`Failed to get card: ${(error as Error).message}`)
    }
  }

  async createCard(cardData: {,
    name: string
    desc?: string
    pos?: 'top' | 'bottom' | number
    due?: string
    dueComplete?: boolean
    idList: string
    idMembers?: string[]
    idLabels?: string[]
    urlSource?: string
    fileSource?: string
    idCardSource?: string
    keepFromSource?: string
    address?: string
    locationName?: string
    coordinates?: string
  }): Promise<TrelloCard> {
    try {
      const response = await this.executeWithProtection('api.create_card', async () => {
        return this.makeApiCall('/cards', 'POST', cardData)
      })

      return response
    } catch (error) {
      this.logError('createCard', error as Error)
      throw new Error(`Failed to create card: ${(error as Error).message}`)
    }
  }

  async updateCard(
    cardId: string,
    cardData: {
      name?: string
      desc?: string
      closed?: boolean
      idMembers?: string[]
      idAttachmentCover?: string
      idList?: string
      idLabels?: string[]
      idBoard?: string
      pos?: 'top' | 'bottom' | number
      due?: string
      dueComplete?: boolean
      subscribed?: boolean
      address?: string
      locationName?: string
      coordinates?: string
      cover?: {
        color?: string
        brightness?: 'dark' | 'light'
        url?: string
        idAttachment?: string
        size?: 'normal'
      }
    },
  ): Promise<TrelloCard> {
    try {
      const response = await this.executeWithProtection('api.update_card', async () => {
        return this.makeApiCall(`/cards/${cardId}`, 'PUT', cardData)
      })

      return response
    } catch (error) {
      this.logError('updateCard', error as Error)
      throw new Error(`Failed to update card: ${(error as Error).message}`)
    }
  }

  async deleteCard(cardId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_card', async () => {
        return this.makeApiCall(`/cards/${cardId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteCard', error as Error)
      throw new Error(`Failed to delete card: ${(error as Error).message}`)
    }
  }

  async addCommentToCard(cardId: string, text: string): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.add_comment', async () => {
        return this.makeApiCall(`/cards/${cardId}/actions/comments`, 'POST', { text })
      })

      return response
    } catch (error) {
      this.logError('addCommentToCard', error as Error)
      throw new Error(`Failed to add comment: ${(error as Error).message}`)
    }
  }

  async addAttachmentToCard(
    cardId: string,
    attachmentData: {
      name?: string
      file?: string
      mimeType?: string
      url?: string
    },
  ): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.add_attachment', async () => {
        return this.makeApiCall(`/cards/${cardId}/attachments`, 'POST', attachmentData)
      })

      return response
    } catch (error) {
      this.logError('addAttachmentToCard', error as Error)
      throw new Error(`Failed to add attachment: ${(error as Error).message}`)
    }
  }

  async createWebhook(webhookData: {
    description?: string
    callbackURL: string,
    idModel: string
    active?: boolean
  }): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.create_webhook', async () => {
        return this.makeApiCall('/webhooks', 'POST', webhookData)
      })

      return response
    } catch (error) {
      this.logError('createWebhook', error as Error)
      throw new Error(`Failed to create webhook: ${(error as Error).message}`)
    }
  }

  async getWebhooks(): Promise<any[]> {
    try {
      const response = await this.executeWithProtection('api.get_webhooks', async () => {
        return this.makeApiCall('/members/me/webhooks', 'GET')
      })

      return response || []
    } catch (error) {
      this.logError('getWebhooks', error as Error)
      throw new Error(`Failed to get webhooks: ${(error as Error).message}`)
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_webhook', async () => {
        return this.makeApiCall(`/webhooks/${webhookId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteWebhook', error as Error)
      throw new Error(`Failed to delete webhook: ${(error as Error).message}`)
    }
  }
}
