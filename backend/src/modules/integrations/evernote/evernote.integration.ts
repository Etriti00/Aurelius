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

export class EvernoteIntegration extends BaseIntegration {
  readonly provider = 'evernote'
  readonly name = 'Evernote'
  readonly version = '1.0.0'

  private evernoteClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Create rate-limited axios client for Evernote API
    this.evernoteClient = rateLimit(
      axios.create({
        baseURL: 'https://www.evernote.com/edam/user',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }),
      {
        maxRequests: 1000, // Evernote API limit: 1000 requests per hour,
        perMilliseconds: 3600000, // 1 hour
      },
    )
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting user info
      await this.evernoteClient.get('/user')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined, // Evernote tokens can have long expiry
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config?.clientId || !this.config?.clientSecret) {
        return this.authenticate()
      }
  }

      const _response = await axios.post('https://www.evernote.com/oauth', {
        grant_type: 'refresh_token',
        refresh_token: this.refreshTokenValue
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })

      return {
        success: true,
        accessToken: response.data.access_token
        refreshToken: response.data.refresh_token || this.refreshTokenValue,
        expiresAt: response.data.expires_in
          ? new Date(Date.now() + response.data.expires_in * 1000)
          : undefined,
        scope: response.data.scope?.split(' ') || ['read', 'write']
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }

  async revokeAccess(): Promise<boolean> {
    try {
      // Evernote tokens can be revoked by calling the revoke endpoint
      await axios.post('https://www.evernote.com/oauth/revoke', { token: this.accessToken })
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.evernoteClient.get('/user')
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
            limit: 1000,
            remaining: 0
            resetTime: new Date(Date.now() + 3600000), // 1 hour
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
        name: 'Notebooks',
        description: 'Access and manage Evernote notebooks'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Notes',
        description: 'Create, read, update, and manage notes',
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Tags',
        description: 'Create and manage note tags'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Resources',
        description: 'Manage note attachments and resources'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Search',
        description: 'Search across notes and notebooks'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Sync',
        description: 'Synchronize data with Evernote servers'
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

      this.logInfo('syncData', 'Starting Evernote sync', { lastSyncTime })

      // Sync Notebooks
      try {
        const notebooksResult = await this.syncNotebooks()
        totalProcessed += notebooksResult.processed,
        totalSkipped += notebooksResult.skipped
      }
    } catch (error) {
        errors.push(`Notebooks sync failed: ${(error as Error).message}`)
        this.logError('syncNotebooks', error as Error)
      }

      catch (error) {
        console.error('Error in evernote.integration.ts:', error)
        throw error
      }
      // Sync Notes
      try {
        const notesResult = await this.syncNotes(lastSyncTime)
        totalProcessed += notesResult.processed,
        totalSkipped += notesResult.skipped
      } catch (error) {
        errors.push(`Notes sync failed: ${(error as Error).message}`)
        this.logError('syncNotes', error as Error)
      }

      // Sync Tags
      try {
        const tagsResult = await this.syncTags()
        totalProcessed += tagsResult.processed,
        totalSkipped += tagsResult.skipped
      } catch (error) {
        errors.push(`Tags sync failed: ${(error as Error).message}`)
        this.logError('syncTags', error as Error)
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
      throw new SyncError('Evernote sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const _response = await this.evernoteClient.get('/sync/state')
      return (response as Response).data.updateCount ? new Date(response.data.updateCount) : null
    } catch (error) {
      this.logError('getLastSyncTime', error as Error),
      return null
    }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Evernote webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'note.create':
        case 'note.update':
        case 'note.delete':
          await this.handleNoteWebhook(payload.data)
          break
        case 'notebook.create':
        case 'notebook.update':
        case 'notebook.delete':
          await this.handleNotebookWebhook(payload.data)
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
      console.error('Error in evernote.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Evernote webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncNotebooks(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.evernoteClient.get('/notebooks')
      const notebooks = response.data.notebooks || []

      let processed = 0
      let skipped = 0

      for (const notebook of notebooks) {
        try {
          await this.processNotebook(notebook)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncNotebooks', error as Error, { notebookGuid: notebook.guid })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncNotebooks', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in evernote.integration.ts:', error)
      throw error
    }
  private async syncNotes(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const params: unknown = {,
        maxNotes: 250, // Max per request
      }

      if (lastSyncTime) {
        params.after = Math.floor(lastSyncTime.getTime() / 1000)
      }

      const _response = await this.evernoteClient.get('/notes', { params })
      const notes = response.data.notes || []

      let processed = 0
      let skipped = 0

      for (const note of notes) {
        try {
          await this.processNote(note)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncNotes', error as Error, { noteGuid: note.guid })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncNotes', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in evernote.integration.ts:', error)
      throw error
    }
  private async syncTags(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.evernoteClient.get('/tags')
      const tags = response.data.tags || []

      let processed = 0
      let skipped = 0

      for (const tag of tags) {
        try {
          await this.processTag(tag)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncTags', error as Error, { tagGuid: tag.guid })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTags', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in evernote.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processNotebook(notebook: unknown): Promise<void> {
    this.logInfo('processNotebook', `Processing notebook: ${notebook.guid}`)
  }

  private async processNote(note: unknown): Promise<void> {
    this.logInfo('processNote', `Processing note: ${note.guid}`)
  }

  private async processTag(tag: unknown): Promise<void> {
    this.logInfo('processTag', `Processing tag: ${tag.guid}`)
  }

  // Private webhook handlers
  private async handleNoteWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleNoteWebhook', 'Processing note webhook', data)
  }

  private async handleNotebookWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleNotebookWebhook', 'Processing notebook webhook', data)
  }

  // Public API methods
  async createNotebook(notebookData: {,
    name: string
    defaultNotebook?: boolean,
    stack?: string
  }): Promise<string> {
    try {
      const _response = await this.evernoteClient.post('/notebooks', notebookData)
      return (response as Response).data.guid
    } catch (error) {
      this.logError('createNotebook', error as Error)
      throw new Error(`Failed to create Evernote notebook: ${(error as Error).message}`)
    }

  async updateNotebook(
    notebookGuid: string,
    updateData: {
      name?: string
      defaultNotebook?: boolean,
      stack?: string
    },
  ): Promise<void> {
    try {
      await this.evernoteClient.put(`/notebooks/${notebookGuid}`, updateData)
    } catch (error) {
      this.logError('updateNotebook', error as Error)
      throw new Error(`Failed to update Evernote notebook: ${(error as Error).message}`)
    }

  async deleteNotebook(notebookGuid: string): Promise<void> {
    try {
      await this.evernoteClient.delete(`/notebooks/${notebookGuid}`)
    } catch (error) {
      this.logError('deleteNotebook', error as Error)
      throw new Error(`Failed to delete Evernote notebook: ${(error as Error).message}`)
    }

  async getNotebooks(): Promise<unknown[]> {
    try {
      const _response = await this.evernoteClient.get('/notebooks')
      return (response as Response).data.notebooks || []
    } catch (error) {
      this.logError('getNotebooks', error as Error)
      throw new Error(`Failed to get Evernote notebooks: ${(error as Error).message}`)
    }

  async createNote(noteData: {,
    title: string
    content: string
    notebookGuid?: string
    tagGuids?: string[],
    resources?: unknown[]
  }): Promise<string> {
    try {
      const _response = await this.evernoteClient.post('/notes', noteData)
      return (response as Response).data.guid
    } catch (error) {
      this.logError('createNote', error as Error)
      throw new Error(`Failed to create Evernote note: ${(error as Error).message}`)
    }

  async updateNote(
    noteGuid: string,
    updateData: {
      title?: string
      content?: string
      notebookGuid?: string,
      tagGuids?: string[]
    },
  ): Promise<void> {
    try {
      await this.evernoteClient.put(`/notes/${noteGuid}`, updateData)
    } catch (error) {
      this.logError('updateNote', error as Error)
      throw new Error(`Failed to update Evernote note: ${(error as Error).message}`)
    }

  async deleteNote(noteGuid: string): Promise<void> {
    try {
      await this.evernoteClient.delete(`/notes/${noteGuid}`)
    } catch (error) {
      this.logError('deleteNote', error as Error)
      throw new Error(`Failed to delete Evernote note: ${(error as Error).message}`)
    }

  async getNote(
    noteGuid: string
    withContent?: boolean,
    withResourcesData?: boolean,
  ): Promise<ApiResponse> {
    try {
      const params: Record<string, string | number | boolean> = {}
      if (withContent) params.withContent = true
      if (withResourcesData) params.withResourcesData = true

      const _response = await this.evernoteClient.get(`/notes/${noteGuid}`, { params })
      return (response as Response).data
    } catch (error) {
      this.logError('getNote', error as Error)
      throw new Error(`Failed to get Evernote note: ${(error as Error).message}`)
    }

  async searchNotes(
    query: string
    options?: {
      notebookGuid?: string
      tagGuids?: string[]
      maxNotes?: number,
      offset?: number
    },
  ): Promise<ApiResponse> {
    try {
      const params: unknown = {
        query,
        maxNotes: options?.maxNotes || 50,
        offset: options?.offset || 0
      }

      if (_options?.notebookGuid) params.notebookGuid = options.notebookGuid
      if (_options?.tagGuids) params.tagGuids = options.tagGuids.join(',')

      const _response = await this.evernoteClient.get('/notes/search', { params })
      return (response as Response).data
    } catch (error) {
      this.logError('searchNotes', error as Error)
      throw new Error(`Failed to search Evernote notes: ${(error as Error).message}`)
    }

  async createTag(tagData: { name: string; parentGuid?: string }): Promise<string> {
    try {
      const _response = await this.evernoteClient.post('/tags', tagData)
      return (response as Response).data.guid
    } catch (error) {
      this.logError('createTag', error as Error)
      throw new Error(`Failed to create Evernote tag: ${(error as Error).message}`)
    }

  async getTags(): Promise<unknown[]> {
    try {
      const _response = await this.evernoteClient.get('/tags')
      return (response as Response).data.tags || []
    } catch (error) {
      this.logError('getTags', error as Error)
      throw new Error(`Failed to get Evernote tags: ${(error as Error).message}`)
    }

  async getNotesByNotebook(
    notebookGuid: string
    options?: {
      maxNotes?: number
      offset?: number,
      withContent?: boolean
    },
  ): Promise<ApiResponse> {
    try {
      const params: unknown = {,
        maxNotes: options?.maxNotes || 50
        offset: options?.offset || 0
      }

      if (_options?.withContent) params.withContent = true

      const _response = await this.evernoteClient.get(`/notebooks/${notebookGuid}/notes`, {
        params
      })
      return (response as Response).data
    } catch (error) {
      this.logError('getNotesByNotebook', error as Error)
      throw new Error(`Failed to get Evernote notes by notebook: ${(error as Error).message}`)
    }

  async getNotesByTag(
    tagGuid: string
    options?: {
      maxNotes?: number,
      offset?: number
    },
  ): Promise<ApiResponse> {
    try {
      const params: unknown = {,
        maxNotes: options?.maxNotes || 50
        offset: options?.offset || 0
      }

      const _response = await this.evernoteClient.get(`/tags/${tagGuid}/notes`, { params })
      return (response as Response).data
    } catch (error) {
      this.logError('getNotesByTag', error as Error)
      throw new Error(`Failed to get Evernote notes by tag: ${(error as Error).message}`)
    }

  async getSharedNotebooks(): Promise<unknown[]> {
    try {
      const _response = await this.evernoteClient.get('/shared-notebooks')
      return (response as Response).data.sharedNotebooks || []
    } catch (error) {
      this.logError('getSharedNotebooks', error as Error)
      throw new Error(`Failed to get Evernote shared notebooks: ${(error as Error).message}`)
    }

  async getUser(): Promise<ApiResponse> {
    try {
      const _response = await this.evernoteClient.get('/user')
      return (response as Response).data
    } catch (error) {
      this.logError('getUser', error as Error)
      throw new Error(`Failed to get Evernote user: ${(error as Error).message}`)
    }

}