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

export class BearIntegration extends BaseIntegration {
  readonly provider = 'bear'
  readonly name = 'Bear'
  readonly version = '1.0.0'

  private baseUrl = 'https://api.bear.app/v1'

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
      // Bear uses local app authentication via URL schemes
      // This is a mock authentication for API-like behavior
      const response = await fetch(
        `${this.baseUrl}/notes/search?token=${this.accessToken}&term=*`,
        { headers: {
            'Content-Type': 'application/json' }
        },
      )
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
        scope: ['bear:read', 'bear:write'],
        metadata: { notesCount: data.notes?.length || 0 }
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Bear uses local tokens that don't expire, so just return current auth status
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Bear doesn't have a revoke endpoint for local tokens
      // The token would need to be regenerated in the app,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notes/search?token=${this.accessToken}&term=*&limit=1`,
        { headers: {
            'Content-Type': 'application/json' }
        },
      )
  }

      if ((response as Response).ok) {
        const data = await response.json()
        return {
          isConnected: true,
          lastChecked: new Date()
          metadata: {,
            notesCount: data.notes?.length || 0
            appVersion: '2.0'
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

      if ((response as Response).status === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 60,
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
        name: 'Notes',
        description: 'Create and manage Bear notes'
        enabled: true,
        requiredScopes: ['bear:read', 'bear:write']
      },
      {
        name: 'Tags',
        description: 'Manage note tags and organization'
        enabled: true,
        requiredScopes: ['bear:read', 'bear:write']
      },
      {
        name: 'Search',
        description: 'Search across all notes and content'
        enabled: true,
        requiredScopes: ['bear:read']
      },
      {
        name: 'Attachments',
        description: 'Manage note attachments and media'
        enabled: true,
        requiredScopes: ['bear:read', 'bear:write']
      },
      {
        name: 'Export',
        description: 'Export notes in various formats'
        enabled: true,
        requiredScopes: ['bear:read']
      },
      {
        name: 'Backlinks',
        description: 'Manage note cross-references'
        enabled: true,
        requiredScopes: ['bear:read']
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

      this.logInfo('syncData', 'Starting Bear sync', { lastSyncTime })

      // Sync Notes
      try {
        const notesResult = await this.syncNotes(lastSyncTime)
        totalProcessed += notesResult.processed,
        totalSkipped += notesResult.skipped
      }
    } catch (error) {
        errors.push(`Notes sync failed: ${(error as Error).message}`)
        this.logError('syncNotes', error as Error)
      }

      catch (error) {
        console.error('Error in bear.integration.ts:', error)
        throw error
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
      throw new SyncError('Bear sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Bear webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'note_created':
        case 'note_updated':
        case 'note_deleted':
          await this.handleNoteWebhook(payload.data)
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
      console.error('Error in bear.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Bear webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncNotes(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const url = `${this.baseUrl}/notes/search?token=${this.accessToken}&term=*`

      if (lastSyncTime) {
        // Bear doesn't support date filtering directly, so we'll filter after retrieval
      }

      const response = await fetch(url, { headers: {
          'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.statusText}`)
      }

      const data = await response.json()
      const notes = data.notes || []

      let processed = 0
      let skipped = 0

      for (const note of notes) {
        try {
          // Filter by lastSyncTime if provided
          if (lastSyncTime && note.modificationDate) {
            const noteModified = new Date(note.modificationDate)
            if (noteModified <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processNote(note)
          processed++
        }
    } catch (error) {
          this.logError('syncNotes', error as Error, { noteId: note.identifier })
          skipped++
        }

        catch (error) {
          console.error('Error in bear.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncNotes', error as Error),
      throw error
    }

  private async syncTags(): Promise<{ processed: number; skipped: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/tags?token=${this.accessToken}`, { headers: {
          'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch tags: ${response.statusText}`)
      }

      const data = await response.json()
      const tags = data.tags || []

      let processed = 0
      let skipped = 0

      for (const tag of tags) {
        try {
          await this.processTag(tag)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncTags', error as Error, { tagName: tag.name })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTags', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in bear.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processNote(note: unknown): Promise<void> {
    this.logInfo('processNote', `Processing note: ${note.title}`)
  }

  private async processTag(tag: unknown): Promise<void> {
    this.logInfo('processTag', `Processing tag: ${tag.name}`)
  }

  // Private webhook handlers
  private async handleNoteWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleNoteWebhook', 'Processing note webhook', data)
  }

  // Public API methods
  async getNotes(_options?: { search?: string; tag?: string; limit?: number }): Promise<unknown[]> {
    try {
      let url = `${this.baseUrl}/notes/search?token=${this.accessToken}`
  }

      if (_options?.search) {
        url += `&term=${encodeURIComponent(_options.search)}`
      } else {
        url += '&term=*'
      }

      if (_options?.tag) {
        url += `&tag=${encodeURIComponent(_options.tag)}`
      }

      if (_options?.limit) {
        url += `&limit=${options.limit}`
      }

      const response = await fetch(url, { headers: {
          'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to get notes: ${response.statusText}`)
      }

      const data = await response.json()
      return data.notes || []
    } catch (error) {
      this.logError('getNotes', error as Error)
      throw new Error(`Failed to get Bear notes: ${(error as Error).message}`)
    }

  async getNote(noteId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notes/open?token=${this.accessToken}&id=${noteId}`,
        { headers: {
            'Content-Type': 'application/json' }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to get note: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('getNote', error as Error)
      throw new Error(`Failed to get Bear note: ${(error as Error).message}`)
    }

  async createNote(noteData: {
    title?: string
    text: string
    tags?: string[]
    pin?: boolean,
    edit?: boolean
  }): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/notes/create?token=${this.accessToken}`

      if (noteData.title) {
        url += `&title=${encodeURIComponent(noteData.title)}`
      }

      url += `&text=${encodeURIComponent(noteData.text)}`

      if (noteData.tags && noteData.tags.length > 0) {
        url += `&tags=${encodeURIComponent(noteData.tags.join(','))}`
      }

      if (noteData.pin) {
        url += '&pin=yes'
      }

      if (noteData.edit) {
        url += '&edit=yes'
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to create note: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('createNote', error as Error)
      throw new Error(`Failed to create Bear note: ${(error as Error).message}`)
    }

  async updateNote(
    noteId: string,
    noteData: {
      title?: string
      text?: string
      tags?: string[],
      pin?: boolean
    },
  ): Promise<ApiResponse> {
    try {
      let url = `${this.baseUrl}/notes/update?token=${this.accessToken}&id=${noteId}`

      if (noteData.title) {
        url += `&title=${encodeURIComponent(noteData.title)}`
      }

      if (noteData.text) {
        url += `&text=${encodeURIComponent(noteData.text)}`
      }

      if (noteData.tags && noteData.tags.length > 0) {
        url += `&tags=${encodeURIComponent(noteData.tags.join(','))}`
      }

      if (noteData.pin !== undefined) {
        url += `&pin=${noteData.pin ? 'yes' : 'no'}`
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('updateNote', error as Error)
      throw new Error(`Failed to update Bear note: ${(error as Error).message}`)
    }

  async deleteNote(noteId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notes/trash?token=${this.accessToken}&id=${noteId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.statusText}`)
      }

      const data = await response.json()
      return data.success === true
    } catch (error) {
      this.logError('deleteNote', error as Error)
      throw new Error(`Failed to delete Bear note: ${(error as Error).message}`)
    }

  async search(
    query: string
    options?: {
      tag?: string,
      limit?: number
    },
  ): Promise<unknown[]> {
    try {
      let url = `${this.baseUrl}/notes/search?token=${this.accessToken}&term=${encodeURIComponent(query)}`

      if (_options?.tag) {
        url += `&tag=${encodeURIComponent(_options.tag)}`
      }

      if (_options?.limit) {
        url += `&limit=${options.limit}`
      }

      const response = await fetch(url, { headers: {
          'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`Failed to search: ${response.statusText}`)
      }

      const data = await response.json()
      return data.notes || []
    } catch (error) {
      this.logError('search', error as Error)
      throw new Error(`Failed to search Bear: ${(error as Error).message}`)
    }

  async getTags(): Promise<unknown[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags?token=${this.accessToken}`, { headers: {
          'Content-Type': 'application/json' }
      })
  }

      if (!response.ok) {
        throw new Error(`Failed to get tags: ${response.statusText}`)
      }

      const data = await response.json()
      return data.tags || []
    } catch (error) {
      this.logError('getTags', error as Error)
      throw new Error(`Failed to get Bear tags: ${(error as Error).message}`)
    }

  async addFile(
    noteId: string,
    file: {
      filename: string,
      data: Buffer
      mode?: 'at_end' | 'under_cursor' | 'replace_text'
    },
  ): Promise<ApiResponse> {
    try {
      const formData = new FormData()
      formData.append('token', this.accessToken)
      formData.append('id', noteId)
      formData.append('file', new Blob([file.data]), file.filename)

      if (file.mode) {
        formData.append('mode', file.mode)
      }

      const response = await fetch(`${this.baseUrl}/notes/add-file`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to add file: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('addFile', error as Error)
      throw new Error(`Failed to add file to Bear note: ${(error as Error).message}`)
    }

  async exportNote(
    noteId: string,
    format: 'txt' | 'md' | 'html' | 'docx' | 'pdf' | 'jpg'
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notes/export?token=${this.accessToken}&id=${noteId}&format=${format}`,
        { headers: {
            'Content-Type': 'application/json' }
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to export note: ${response.statusText}`)
      }

      if (format === 'txt' || format === 'md' || format === 'html') {
        return await response.text()
      } else {
        // For binary formats, return the base64 encoded content
        const buffer = await response.arrayBuffer()
        return Buffer.from(buffer).toString('base64')
      }
    } catch (error) {
      this.logError('exportNote', error as Error)
      throw new Error(`Failed to export Bear note: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in bear.integration.ts:', error)
      throw error
    }
  async duplicateNote(noteId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notes/duplicate?token=${this.accessToken}&id=${noteId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to duplicate note: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      this.logError('duplicateNote', error as Error)
      throw new Error(`Failed to duplicate Bear note: ${(error as Error).message}`)
    }

  async pinNote(noteId: string, pin: boolean): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/notes/pin?token=${this.accessToken}&id=${noteId}&pin=${pin ? 'yes' : 'no'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        },
      )
  }

      if (!response.ok) {
        throw new Error(`Failed to pin note: ${response.statusText}`)
      }

      const data = await response.json()
      return data.success === true
    } catch (error) {
      this.logError('pinNote', error as Error)
      throw new Error(`Failed to pin Bear note: ${(error as Error).message}`)
    }

}