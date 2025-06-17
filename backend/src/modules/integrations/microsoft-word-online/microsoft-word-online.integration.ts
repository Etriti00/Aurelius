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

interface WordWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface WordTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  scope: string
}

interface WordDocument {
  id: string,
  name: string
  createdDateTime: string,
  lastModifiedDateTime: string
  webUrl: string,
  createdBy: {
    user: {,
      displayName: string
      id: string
    }
  }
  lastModifiedBy: {,
    user: {
      displayName: string,
      id: string
    }
  }
}

export class MicrosoftWordOnlineIntegration extends BaseIntegration {
  readonly provider = 'microsoft-word-online'
  readonly name = 'Microsoft Word Online'
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

      const tokenData: WordTokenResponse = await response.json()

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
      IntegrationCapability.DOCUMENTS,
      IntegrationCapability.COLLABORATION,
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

      // Sync Word documents
      try {
        const documentResult = await this.syncDocuments()
        totalProcessed += documentResult.processed
        totalErrors += documentResult.errors
        if (documentResult.errorMessages) {
          errors.push(...documentResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Document sync failed: ${(error as Error).message}`)
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
      throw new SyncError(`Microsoft Word Online sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const wordPayload = payload as WordWebhookPayload

      switch (wordPayload.type) {
        case 'word.document.created':
        case 'word.document.updated':
          await this.handleDocumentWebhook(wordPayload)
          break
        case 'word.document.shared':
          await this.handleDocumentSharedWebhook(wordPayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${wordPayload.type}`)
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
  private async syncDocuments(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.documents', async () => {
        return this.makeApiCall("/me/drive/root/search(q='.docx')", 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const documents = response.value || []

      for (const document of documents) {
        try {
          await this.processDocument(document)
          processed++
        } catch (error) {
          errors.push(`Failed to process document ${document.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Document sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processDocument(document: any): Promise<void> {
    this.logger.debug(`Processing Word document: ${document.name}`)
    // Process document data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleDocumentWebhook(payload: WordWebhookPayload): Promise<void> {
    this.logger.debug(`Handling document webhook: ${payload.id}`)
    // Handle document webhook processing
  }

  private async handleDocumentSharedWebhook(payload: WordWebhookPayload): Promise<void> {
    this.logger.debug(`Handling document shared webhook: ${payload.id}`)
    // Handle document sharing webhook processing
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
        `Word Online API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getDocuments(): Promise<WordDocument[]> {
    try {
      const response = await this.executeWithProtection('api.get_documents', async () => {
        return this.makeApiCall("/me/drive/root/search(q='.docx')", 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getDocuments', error as Error)
      throw new Error(`Failed to get documents: ${(error as Error).message}`)
    }
  }

  async getDocument(documentId: string): Promise<WordDocument> {
    try {
      const response = await this.executeWithProtection('api.get_document', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getDocument', error as Error)
      throw new Error(`Failed to get document: ${(error as Error).message}`)
    }
  }

  async createDocument(documentData: {,
    name: string
    parentFolderId?: string
  }): Promise<WordDocument> {
    try {
      const endpoint = documentData.parentFolderId
        ? `/me/drive/items/${documentData.parentFolderId}/children`
        : '/me/drive/root/children'

      const response = await this.executeWithProtection('api.create_document', async () => {
        return this.makeApiCall(endpoint, 'POST', {
          name: documentData.name,
          file: {},
          '@microsoft.graph.sourceUrl': 'https://contoso.sharepoint.com/sites/blankdocument.docx'
        })
      })

      return response
    } catch (error) {
      this.logError('createDocument', error as Error)
      throw new Error(`Failed to create document: ${(error as Error).message}`)
    }
  }

  async updateDocument(
    documentId: string,
    documentData: {
      name?: string
    },
  ): Promise<WordDocument> {
    try {
      const response = await this.executeWithProtection('api.update_document', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}`, 'PATCH', documentData)
      })

      return response
    } catch (error) {
      this.logError('updateDocument', error as Error)
      throw new Error(`Failed to update document: ${(error as Error).message}`)
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_document', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteDocument', error as Error)
      throw new Error(`Failed to delete document: ${(error as Error).message}`)
    }
  }

  async getDocumentContent(documentId: string): Promise<string> {
    try {
      const response = await this.executeWithProtection('api.get_document_content', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}/content`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getDocumentContent', error as Error)
      throw new Error(`Failed to get document content: ${(error as Error).message}`)
    }
  }

  async updateDocumentContent(documentId: string, content: string): Promise<void> {
    try {
      await this.executeWithProtection('api.update_document_content', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}/content`, 'PUT', content)
      })
    } catch (error) {
      this.logError('updateDocumentContent', error as Error)
      throw new Error(`Failed to update document content: ${(error as Error).message}`)
    }
  }

  async shareDocument(
    documentId: string,
    shareData: {
      recipients: string[]
      message?: string
      requireSignIn?: boolean
      sendInvitation?: boolean
      roles: ('read' | 'write' | 'owner')[]
    },
  ): Promise<any> {
    try {
      const response = await this.executeWithProtection('api.share_document', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}/invite`, 'POST', shareData)
      })

      return response
    } catch (error) {
      this.logError('shareDocument', error as Error)
      throw new Error(`Failed to share document: ${(error as Error).message}`)
    }
  }

  async getDocumentPermissions(documentId: string): Promise<any[]> {
    try {
      const response = await this.executeWithProtection(
        'api.get_document_permissions',
        async () => {
          return this.makeApiCall(`/me/drive/items/${documentId}/permissions`, 'GET')
        },
      )

      return response.value || []
    } catch (error) {
      this.logError('getDocumentPermissions', error as Error)
      throw new Error(`Failed to get document permissions: ${(error as Error).message}`)
    }
  }

  async copyDocument(
    documentId: string,
    copyData: {
      name: string
      parentReference?: {
        driveId?: string
        id?: string
      }
    },
  ): Promise<WordDocument> {
    try {
      const response = await this.executeWithProtection('api.copy_document', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}/copy`, 'POST', copyData)
      })

      return response
    } catch (error) {
      this.logError('copyDocument', error as Error)
      throw new Error(`Failed to copy document: ${(error as Error).message}`)
    }
  }

  async getDocumentVersions(documentId: string): Promise<any[]> {
    try {
      const response = await this.executeWithProtection('api.get_document_versions', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}/versions`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getDocumentVersions', error as Error)
      throw new Error(`Failed to get document versions: ${(error as Error).message}`)
    }
  }

  async restoreDocumentVersion(documentId: string, versionId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.restore_document_version', async () => {
        return this.makeApiCall(
          `/me/drive/items/${documentId}/versions/${versionId}/restoreVersion`,
          'POST',
        )
      })
    } catch (error) {
      this.logError('restoreDocumentVersion', error as Error)
      throw new Error(`Failed to restore document version: ${(error as Error).message}`)
    }
  }

  async searchDocuments(query: string): Promise<WordDocument[]> {
    try {
      const response = await this.executeWithProtection('api.search_documents', async () => {
        return this.makeApiCall(
          `/me/drive/root/search(q='${encodeURIComponent(query)} .docx')`,
          'GET',
        )
      })

      return response.value || []
    } catch (error) {
      this.logError('searchDocuments', error as Error)
      throw new Error(`Failed to search documents: ${(error as Error).message}`)
    }
  }

  async getDocumentThumbnail(
    documentId: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<string> {
    try {
      const response = await this.executeWithProtection('api.get_document_thumbnail', async () => {
        return this.makeApiCall(`/me/drive/items/${documentId}/thumbnails/0/${size}`, 'GET')
      })

      return response.url || ''
    } catch (error) {
      this.logError('getDocumentThumbnail', error as Error)
      throw new Error(`Failed to get document thumbnail: ${(error as Error).message}`)
    }
  }
}
