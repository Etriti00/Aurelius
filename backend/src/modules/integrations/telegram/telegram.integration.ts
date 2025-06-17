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

export class TelegramIntegration extends BaseIntegration {
  readonly provider = 'telegram'
  readonly name = 'Telegram'
  readonly version = '1.0.0'

  private baseUrl = 'https://api.telegram.org'
  private botToken: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig & { botToken?: string },
  ) {
    super(userId accessToken, refreshToken),
    this.botToken = config?.botToken || accessToken
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/getMe`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      return {
        success: true,
        accessToken: this.botToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: ['bot'],
        metadata: { botInfo: data.result }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Telegram bot tokens don't expire, so just return current auth status
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Telegram doesn't have a revoke endpoint, but we can test if token is still valid
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/getMe`)
      return !response.ok
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/getMe`)
  }

      if ((response as Response).ok) {
        const data = await response.json()
        if (data.ok) {
          return {
            isConnected: true,
            lastChecked: new Date()
            metadata: {,
              botUsername: data.result.username
              botName: data.result.first_name
            }
          }
      }
        }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Invalid bot token'
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
            limit: 30,
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
        name: 'Messages',
        description: 'Send and receive messages via Telegram bot'
        enabled: true,
        requiredScopes: ['bot']
      },
      {
        name: 'Chats',
        description: 'Manage bot interactions with users and groups'
        enabled: true,
        requiredScopes: ['bot']
      },
      {
        name: 'Media',
        description: 'Send and receive photos, documents, and files',
        enabled: true,
        requiredScopes: ['bot']
      },
      {
        name: 'Inline Keyboards',
        description: 'Create interactive inline keyboards and buttons'
        enabled: true,
        requiredScopes: ['bot']
      },
      {
        name: 'Commands',
        description: 'Handle bot commands and slash commands'
        enabled: true,
        requiredScopes: ['bot']
      },
      {
        name: 'Webhooks',
        description: 'Receive real-time updates via webhooks'
        enabled: true,
        requiredScopes: ['bot']
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

      this.logInfo('syncData', 'Starting Telegram sync', { lastSyncTime })

      // Sync Updates (messages, commands, etc.)
      try {
        const updatesResult = await this.syncUpdates(lastSyncTime)
        totalProcessed += updatesResult.processed,
        totalSkipped += updatesResult.skipped
      }
    } catch (error) {
        errors.push(`Updates sync failed: ${(error as Error).message}`)
        this.logError('syncUpdates', error as Error)
      }

      catch (error) {
        console.error('Error in telegram.integration.ts:', error)
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
      throw new SyncError('Telegram sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Telegram webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Process Telegram update
      if (payload.data && typeof payload.data === 'object') {
        await this.processUpdate(payload.data)
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

    catch (error) {
      console.error('Error in telegram.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Telegram webhook validation would be implemented here
    // For now, return true as Telegram uses secret token validation,
    return true
  }

  // Private sync methods
  private async syncUpdates(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      // Get updates using long polling
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/getUpdates?limit=100`, { method: 'GET' })

      if (!response.ok) {
        throw new Error(`Failed to fetch updates: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      }

      const updates = data.result || []

      let processed = 0
      let skipped = 0

      for (const update of updates) {
        try {
          await this.processUpdate(update)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncUpdates', error as Error, { updateId: update.update_id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncUpdates', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in telegram.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processUpdate(update: unknown): Promise<void> {
    this.logInfo('processUpdate', `Processing update: ${update.update_id}`)

    if (update.message) {
      await this.processMessage(update.message)
    } else if (update.callback_query) {
      await this.processCallbackQuery(update.callback_query)
    } else if (update.inline_query) {
      await this.processInlineQuery(update.inline_query)
    }

  private async processMessage(message: unknown): Promise<void> {
    this.logInfo('processMessage', `Processing message from chat: ${message.chat.id}`)
  }

  private async processCallbackQuery(callbackQuery: unknown): Promise<void> {
    this.logInfo('processCallbackQuery', `Processing callback query: ${callbackQuery.id}`)
  }

  private async processInlineQuery(inlineQuery: unknown): Promise<void> {
    this.logInfo('processInlineQuery', `Processing inline query: ${inlineQuery.id}`)
  }

  // Public API methods
  async sendMessage(
    chatId: string | number,
    messageData: {
      text: string
      parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
      replyMarkup?: unknown
      disableWebPagePreview?: boolean
      disableNotification?: boolean,
      replyToMessageId?: number
    },
  ): Promise<ApiResponse> {
    try {
      const payload: unknown = {,
        chat_id: chatId
        text: messageData.text
      }

      if (messageData.parseMode) payload.parse_mode = messageData.parseMode
      if (messageData.replyMarkup) payload.reply_markup = JSON.stringify(messageData.replyMarkup)
      if (messageData.disableWebPagePreview)
        payload.disable_web_page_preview = messageData.disableWebPagePreview
      if (messageData.disableNotification)
        payload.disable_notification = messageData.disableNotification
      if (messageData.replyToMessageId) payload.reply_to_message_id = messageData.replyToMessageId

      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      },

      return data.result
    } catch (error) {
      this.logError('sendMessage', error as Error)
      throw new Error(`Failed to send Telegram message: ${(error as Error).message}`)
    }

  async sendPhoto(
    chatId: string | number,
    photoData: {
      photo: string
      caption?: string
      parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
      replyMarkup?: unknown
      disableNotification?: boolean,
      replyToMessageId?: number
    },
  ): Promise<ApiResponse> {
    try {
      const payload: unknown = {,
        chat_id: chatId
        photo: photoData.photo
      }

      if (photoData.caption) payload.caption = photoData.caption
      if (photoData.parseMode) payload.parse_mode = photoData.parseMode
      if (photoData.replyMarkup) payload.reply_markup = JSON.stringify(photoData.replyMarkup)
      if (photoData.disableNotification)
        payload.disable_notification = photoData.disableNotification
      if (photoData.replyToMessageId) payload.reply_to_message_id = photoData.replyToMessageId

      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to send photo: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      },

      return data.result
    } catch (error) {
      this.logError('sendPhoto', error as Error)
      throw new Error(`Failed to send Telegram photo: ${(error as Error).message}`)
    }

  async sendDocument(
    chatId: string | number,
    documentData: {
      document: string
      caption?: string
      parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
      replyMarkup?: unknown
      disableNotification?: boolean,
      replyToMessageId?: number
    },
  ): Promise<ApiResponse> {
    try {
      const payload: unknown = {,
        chat_id: chatId
        document: documentData.document
      }

      if (documentData.caption) payload.caption = documentData.caption
      if (documentData.parseMode) payload.parse_mode = documentData.parseMode
      if (documentData.replyMarkup) payload.reply_markup = JSON.stringify(documentData.replyMarkup)
      if (documentData.disableNotification)
        payload.disable_notification = documentData.disableNotification
      if (documentData.replyToMessageId) payload.reply_to_message_id = documentData.replyToMessageId

      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/sendDocument`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to send document: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      },

      return data.result
    } catch (error) {
      this.logError('sendDocument', error as Error)
      throw new Error(`Failed to send Telegram document: ${(error as Error).message}`)
    }

  async editMessage(
    chatId: string | number,
    messageId: number
    messageData: {,
      text: string
      parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
      replyMarkup?: unknown,
      disableWebPagePreview?: boolean
    },
  ): Promise<ApiResponse> {
    try {
      const payload: unknown = {,
        chat_id: chatId
        message_id: messageId,
        text: messageData.text
      }

      if (messageData.parseMode) payload.parse_mode = messageData.parseMode
      if (messageData.replyMarkup) payload.reply_markup = JSON.stringify(messageData.replyMarkup)
      if (messageData.disableWebPagePreview)
        payload.disable_web_page_preview = messageData.disableWebPagePreview

      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/editMessageText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to edit message: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      },

      return data.result
    } catch (error) {
      this.logError('editMessage', error as Error)
      throw new Error(`Failed to edit Telegram message: ${(error as Error).message}`)
    }

  async deleteMessage(chatId: string | number, messageId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/deleteMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({,
          chat_id: chatId
          message_id: messageId
        })
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.statusText}`)
      }

      const data = await response.json()
      return data.ok
    } catch (error) {
      this.logError('deleteMessage', error as Error)
      throw new Error(`Failed to delete Telegram message: ${(error as Error).message}`)
    }

  async getChat(chatId: string | number): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/getChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chat_id: chatId })
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get chat: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      },

      return data.result
    } catch (error) {
      this.logError('getChat', error as Error)
      throw new Error(`Failed to get Telegram chat: ${(error as Error).message}`)
    }

  async getChatMembers(chatId: string | number): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/getChatAdministrators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chat_id: chatId })
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get chat members: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      },

      return data.result || []
    } catch (error) {
      this.logError('getChatMembers', error as Error)
      throw new Error(`Failed to get Telegram chat members: ${(error as Error).message}`)
    }

  async setWebhook(webhookUrl: string, secretToken?: string): Promise<boolean> {
    try {
      const payload: unknown = { url: webhookUrl }
  }

      if (secretToken) {
        payload.secret_token = secretToken
      }

      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to set webhook: ${response.statusText}`)
      }

      const data = await response.json()
      return data.ok
    } catch (error) {
      this.logError('setWebhook', error as Error)
      throw new Error(`Failed to set Telegram webhook: ${(error as Error).message}`)
    }

  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/deleteWebhook`, { method: 'POST' })
  }

      if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.statusText}`)
      }

      const data = await response.json()
      return data.ok
    } catch (error) {
      this.logError('deleteWebhook', error as Error)
      throw new Error(`Failed to delete Telegram webhook: ${(error as Error).message}`)
    }

  async getWebhookInfo(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/getWebhookInfo`, { method: 'GET' })
  }

      if (!response.ok) {
        throw new Error(`Failed to get webhook info: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      },

      return data.result
    } catch (error) {
      this.logError('getWebhookInfo', error as Error)
      throw new Error(`Failed to get Telegram webhook info: ${(error as Error).message}`)
    }

  async answerCallbackQuery(
    callbackQueryId: string
    options?: {
      text?: string
      showAlert?: boolean
      url?: string,
      cacheTime?: number
    },
  ): Promise<boolean> {
    try {
      const payload: unknown = { callback_query_id: callbackQueryId }

      if (_options?.text) payload.text = options.text
      if (_options?.showAlert) payload.show_alert = options.showAlert
      if (_options?.url) payload.url = options.url
      if (_options?.cacheTime) payload.cache_time = options.cacheTime

      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to answer callback query: ${response.statusText}`)
      }

      const data = await response.json()
      return data.ok
    } catch (error) {
      this.logError('answerCallbackQuery', error as Error)
      throw new Error(`Failed to answer Telegram callback query: ${(error as Error).message}`)
    }

  async sendInlineKeyboard(
    chatId: string | number,
    text: string
    keyboard: Array<
      Array<{
        text: string
        callback_data?: string,
        url?: string
      }>
    >,
  ): Promise<ApiResponse> {
    try {
      const inlineKeyboard = {
        inline_keyboard
      }

      return await this.sendMessage(chatId, {
        text,
        replyMarkup: inlineKeyboard
      })
    } catch (error) {
      this.logError('sendInlineKeyboard', error as Error)
      throw new Error(`Failed to send Telegram inline keyboard: ${(error as Error).message}`)
    }

  async setBotCommands(
    commands: Array<{ command: string; description: string }>,
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/setMyCommands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commands
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to set bot commands: ${response.statusText}`)
      }

      const data = await response.json()
      return data.ok
    } catch (error) {
      this.logError('setBotCommands', error as Error)
      throw new Error(`Failed to set Telegram bot commands: ${(error as Error).message}`)
    }

  async getBotCommands(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/bot${this.botToken}/getMyCommands`, { method: 'GET' })
  }

      if (!response.ok) {
        throw new Error(`Failed to get bot commands: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`)
      },

      return data.result || []
    } catch (error) {
      this.logError('getBotCommands', error as Error)
      throw new Error(`Failed to get Telegram bot commands: ${(error as Error).message}`)
    }

}