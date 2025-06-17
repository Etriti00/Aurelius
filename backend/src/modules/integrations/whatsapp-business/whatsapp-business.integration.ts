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

export class WhatsAppBusinessIntegration extends BaseIntegration {
  readonly provider = 'whatsapp-business'
  readonly name = 'WhatsApp Business'
  readonly version = '1.0.0'

  private baseUrl = 'https://graph.facebook.com/v18.0'
  private phoneNumberId: string

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig & { phoneNumberId?: string; appId?: string },
  ) {
    super(userId accessToken, refreshToken),
    this.phoneNumberId = config?.phoneNumberId || ''
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
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
        scope: ['whatsapp_business_messaging', 'whatsapp_business_management'],
        metadata: { accountInfo: data }
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

      const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          grant_type: 'fb_exchange_token'
          client_id: this.config?.clientId || '',
          client_secret: this.config?.clientSecret || ''
          fb_exchange_token: this.accessToken
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        accessToken: data.access_token
        refreshToken: this.refreshTokenValue,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined
        scope: ['whatsapp_business_messaging', 'whatsapp_business_management']
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/me/permissions`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      return (response as Response).ok
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}`, {
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
            phoneNumber: data.display_phone_number
            verifiedName: data.verified_name
          }
        }
      }

      if ((response as Response).status === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
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
            limit: 1000,
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
        name: 'Messages',
        description: 'Send and receive WhatsApp messages'
        enabled: true,
        requiredScopes: ['whatsapp_business_messaging']
      },
      {
        name: 'Media',
        description: 'Send and receive images, documents, and audio',
        enabled: true,
        requiredScopes: ['whatsapp_business_messaging']
      },
      {
        name: 'Templates',
        description: 'Manage and send message templates'
        enabled: true,
        requiredScopes: ['whatsapp_business_management']
      },
      {
        name: 'Interactive Messages',
        description: 'Send buttons, lists, and interactive elements',
        enabled: true,
        requiredScopes: ['whatsapp_business_messaging']
      },
      {
        name: 'Business Profile',
        description: 'Manage WhatsApp Business profile information'
        enabled: true,
        requiredScopes: ['whatsapp_business_management']
      },
      {
        name: 'Phone Numbers',
        description: 'Manage phone number settings and verification'
        enabled: true,
        requiredScopes: ['whatsapp_business_management']
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

      this.logInfo('syncData', 'Starting WhatsApp Business sync', { lastSyncTime })

      // Sync Business Profile
      try {
        const profileResult = await this.syncBusinessProfile()
        totalProcessed += profileResult.processed,
        totalSkipped += profileResult.skipped
      }
    } catch (error) {
        errors.push(`Business profile sync failed: ${(error as Error).message}`)
        this.logError('syncBusinessProfile', error as Error)
      }

      catch (error) {
        console.error('Error in whatsapp-business.integration.ts:', error)
        throw error
      }
      // Sync Message Templates
      try {
        const templatesResult = await this.syncMessageTemplates()
        totalProcessed += templatesResult.processed,
        totalSkipped += templatesResult.skipped
      } catch (error) {
        errors.push(`Message templates sync failed: ${(error as Error).message}`)
        this.logError('syncMessageTemplates', error as Error)
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
      throw new SyncError('WhatsApp Business sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing WhatsApp Business webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Process WhatsApp webhook payload
      if (payload.data && typeof payload.data === 'object') {
        const entry = payload.data.entry?.[0]
        if (entry?.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              await this.processMessageChange(change.value)
            } else if (change.field === 'message_template_status_update') {
              await this.processTemplateStatusChange(change.value)
            }
      }
        }
          }
    } catch (error) {
      this.logError('handleWebhook', error as Error, { payload })
      throw error
    }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // WhatsApp webhook signature validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncBusinessProfile(): Promise<{ processed: number; skipped: number }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          headers: {,
            Authorization: `Bearer ${this.accessToken}`
          }
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch business profile: ${response.statusText}`)
      }

      const data = await response.json()

      await this.processBusinessProfile(data.data?.[0])

      return { processed: 1, skipped: 0 }
    } catch (error) {
      this.logError('syncBusinessProfile', error as Error)
      return { processed: 0, skipped: 1 }

  private async syncMessageTemplates(): Promise<{ processed: number; skipped: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config?.appId}/message_templates`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch message templates: ${response.statusText}`)
      }

      const data = await response.json()
      const templates = data.data || []

      let processed = 0
      let skipped = 0

      for (const template of templates) {
        try {
          await this.processMessageTemplate(template)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncMessageTemplates', error as Error, { templateId: template.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncMessageTemplates', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in whatsapp-business.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processBusinessProfile(profile: unknown): Promise<void> {
    this.logInfo('processBusinessProfile', 'Processing business profile')
  }

  private async processMessageTemplate(template: unknown): Promise<void> {
    this.logInfo('processMessageTemplate', `Processing template: ${template.id}`)
  }

  private async processMessageChange(value: unknown): Promise<void> {
    this.logInfo('processMessageChange', 'Processing message change', value)
  }

  private async processTemplateStatusChange(value: unknown): Promise<void> {
    this.logInfo('processTemplateStatusChange', 'Processing template status change', value)
  }

  // Public API methods
  async sendMessage(
    to: string,
    messageData: {
      type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template' | 'interactive'
      text?: string
      media?: {
        id?: string
        link?: string
        caption?: string,
        filename?: string
      }
      template?: {
        name: string,
        language: { code: string }
        components?: unknown[]
      }
      interactive?: {
        type: 'button' | 'list'
        header?: unknown
        body: { text: string }
        footer?: { text: string },
    action: unknown
      },
  ): Promise<ApiResponse> {
    try {
      const payload: unknown = {,
        messaging_product: 'whatsapp'
        to,
        type: messageData.type
      }

      switch (messageData.type) {
        case 'text':
          payload.text = { body: messageData.text }
          break
        case 'image':
        case 'document':
        case 'audio':
        case 'video':
          payload[messageData.type] = messageData.media
          break
        case 'template':
          payload.template = messageData.template
          break
        case 'interactive':
          payload.interactive = messageData.interactive,
          break
      }
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('sendMessage', error as Error)
      throw new Error(`Failed to send WhatsApp message: ${(error as Error).message}`)
    }

  async sendTextMessage(to: string, text: string, previewUrl?: boolean): Promise<ApiResponse> {
    try {
      return await this.sendMessage(to, {
        type: 'text'
        text
      })
    } catch (error) {
      this.logError('sendTextMessage', error as Error)
      throw new Error(`Failed to send WhatsApp text message: ${(error as Error).message}`)
    }

  async sendImageMessage(
    to: string,
    imageData: {
      id?: string
      link?: string,
      caption?: string
    },
  ): Promise<ApiResponse> {
    try {
      return await this.sendMessage(to, {
        type: 'image',
        media: imageData
      })
    } catch (error) {
      this.logError('sendImageMessage', error as Error)
      throw new Error(`Failed to send WhatsApp image: ${(error as Error).message}`)
    }

  async sendDocumentMessage(
    to: string,
    documentData: {
      id?: string
      link?: string
      caption?: string,
      filename?: string
    },
  ): Promise<ApiResponse> {
    try {
      return await this.sendMessage(to, {
        type: 'document',
        media: documentData
      })
    } catch (error) {
      this.logError('sendDocumentMessage', error as Error)
      throw new Error(`Failed to send WhatsApp document: ${(error as Error).message}`)
    }

  async sendTemplateMessage(
    to: string,
    templateData: {
      name: string,
      language: string
      components?: Array<{
        type: 'header' | 'body' | 'button'
        parameters?: Array<{
          type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
          text?: string
          currency?: unknown
          date_time?: unknown
          image?: unknown
          document?: unknown,
          video?: unknown
        }>
      }>
    },
  ): Promise<ApiResponse> {
    try {
      return await this.sendMessage(to, {
        type: 'template',
        template: {
          name: templateData.name,
          language: { code: templateData.language },
          components: templateData.components
        }
      })
    } catch (error) {
      this.logError('sendTemplateMessage', error as Error)
      throw new Error(`Failed to send WhatsApp template: ${(error as Error).message}`)
    }

  async sendButtonMessage(
    to: string,
    messageData: {
      bodyText: string
      headerText?: string
      footerText?: string
      buttons: Array<{,
        type: 'reply'
        reply: {,
          id: string
          title: string
        }>
    },
  ): Promise<ApiResponse> {
    try {
      const interactive: unknown = {,
        type: 'button'
        body: { text: messageData.bodyText },
        action: { buttons: messageData.buttons }
      }

      if (messageData.headerText) {
        interactive.header = { type: 'text', text: messageData.headerText }
      }

      if (messageData.footerText) {
        interactive.footer = { text: messageData.footerText }
      }

      return await this.sendMessage(to, {
        type: 'interactive'
        interactive
      })
    }
    } catch (error) {
      this.logError('sendButtonMessage', error as Error)
      throw new Error(`Failed to send WhatsApp button message: ${(error as Error).message}`)
    }

  async sendListMessage(
    to: string,
    messageData: {
      bodyText: string
      headerText?: string
      footerText?: string
      buttonText: string,
      sections: Array<{
        title?: string
        rows: Array<{,
          id: string
          title: string
          description?: string
        }>
      }>
    },
  ): Promise<ApiResponse> {
    try {
      const interactive: unknown = {,
        type: 'list'
        body: { text: messageData.bodyText },
        action: {,
          button: messageData.buttonText
          sections: messageData.sections
        }
      }

      if (messageData.headerText) {
        interactive.header = { type: 'text', text: messageData.headerText }
      }

      if (messageData.footerText) {
        interactive.footer = { text: messageData.footerText }
      }

      return await this.sendMessage(to, {
        type: 'interactive'
        interactive
      })
    }
    } catch (error) {
      this.logError('sendListMessage', error as Error)
      throw new Error(`Failed to send WhatsApp list message: ${(error as Error).message}`)
    }

  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({,
          messaging_product: 'whatsapp'
          status: 'read',
          message_id: messageId
        })
      })
  }

      return (response as Response).ok
    }
    } catch (error) {
      this.logError('markMessageAsRead', error as Error)
      throw new Error(`Failed to mark WhatsApp message as read: ${(error as Error).message}`)
    }

  async getBusinessProfile(): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          headers: {,
            Authorization: `Bearer ${this.accessToken}`
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get business profile: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data?.[0]
    }
    } catch (error) {
      this.logError('getBusinessProfile', error as Error)
      throw new Error(`Failed to get WhatsApp business profile: ${(error as Error).message}`)
    }

  async updateBusinessProfile(profileData: {
    about?: string
    address?: string
    description?: string
    email?: string
    profilePictureUrl?: string
    websites?: string[],
    vertical?: string
  }): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({,
            messaging_product: 'whatsapp'
            ...profileData
          })
        },
      )

      return (response as Response).ok
    }
    } catch (error) {
      this.logError('updateBusinessProfile', error as Error)
      throw new Error(`Failed to update WhatsApp business profile: ${(error as Error).message}`)
    }

  async getMessageTemplates(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config?.appId}/message_templates`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get message templates: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    }
    } catch (error) {
      this.logError('getMessageTemplates', error as Error)
      throw new Error(`Failed to get WhatsApp message templates: ${(error as Error).message}`)
    }

  async createMessageTemplate(templateData: {,
    name: string
    language: string,
    category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY'
    components: Array<{,
      type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
      format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO'
      text?: string
      buttons?: Array<{
        type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY',
        text: string
        phone_number?: string,
        url?: string
      }>
    }>
  }): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config?.appId}/message_templates`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      })

      if (!response.ok) {
        throw new Error(`Failed to create message template: ${response.statusText}`)
      }

      const data = await response.json()
      return data.id
    }
    } catch (error) {
      this.logError('createMessageTemplate', error as Error)
      throw new Error(`Failed to create WhatsApp message template: ${(error as Error).message}`)
    }

  async deleteMessageTemplate(templateId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${templateId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      return (response as Response).ok
    }
    } catch (error) {
      this.logError('deleteMessageTemplate', error as Error)
      throw new Error(`Failed to delete WhatsApp message template: ${(error as Error).message}`)
    }

  async uploadMedia(mediaData: { file: Buffer; type: string; filename?: string }): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('messaging_product', 'whatsapp')
      formData.append('file', new Blob([mediaData.file]), mediaData.filename)
      formData.append('type', mediaData.type)
  }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to upload media: ${response.statusText}`)
      }

      const data = await response.json()
      return data.id
    }
    } catch (error) {
      this.logError('uploadMedia', error as Error)
      throw new Error(`Failed to upload WhatsApp media: ${(error as Error).message}`)
    }

  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}`, {
        headers: {,
          Authorization: `Bearer ${this.accessToken}`
        }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get media URL: ${response.statusText}`)
      }

      const data = await response.json()
      return data.url
    }
    } catch (error) {
      this.logError('getMediaUrl', error as Error)
      throw new Error(`Failed to get WhatsApp media URL: ${(error as Error).message}`)
    }

}
catch (error) {
  console.error('Error in whatsapp-business.integration.ts:', error)
  throw error
}