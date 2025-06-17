import axios, { AxiosInstance } from 'axios'
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

export class ObsidianIntegration extends BaseIntegration {
  readonly provider = 'obsidian'
  readonly name = 'Obsidian'
  readonly version = '1.0.0'

  private obsidianClient: AxiosInstance

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    // Note: Obsidian integration via local REST API plugin
    // Supports comprehensive vault access and note management
    // Compatible with Obsidian REST API plugin for local automation
    this.obsidianClient = axios.create({
      baseURL: 'http://localhost:27123', // Local Obsidian REST API plugin
      headers: {,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by trying to connect to local Obsidian API
      // This would work with a local REST API plugin for Obsidian
      await this.obsidianClient.get('/ping')
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: undefined
        scope: ['read', 'write']
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error:
          'Authentication failed: Obsidian local API not available. ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    // Local Obsidian API doesn't need token refresh
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      // Local API access can be revoked by disabling the plugin,
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.obsidianClient.get('/ping')
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.code === 'ECONNREFUSED') {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Obsidian local API not running'
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
        name: 'Vault Access',
        description: 'Access Obsidian vault contents'
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
        description: 'Access and manage note tags'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Links',
        description: 'Access note links and backlinks'
        enabled: true,
        requiredScopes: ['read']
      },
      {
        name: 'Attachments',
        description: 'Manage note attachments and media'
        enabled: true,
        requiredScopes: ['read', 'write']
      },
      {
        name: 'Graph',
        description: 'Access knowledge graph data'
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

      this.logInfo('syncData', 'Starting Obsidian sync', { lastSyncTime })

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
        console.error('Error in obsidian.integration.ts:', error)
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
      throw new SyncError('Obsidian sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Obsidian webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'note:created':
        case 'note:updated':
        case 'note:deleted':
          await this.handleNoteWebhook(payload.data)
          break
        case 'vault:changed':
          await this.handleVaultWebhook(payload.data)
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
      console.error('Error in obsidian.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Local API webhook validation would be implemented here,
    return true
  }

  // Private sync methods
  private async syncNotes(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.obsidianClient.get('/vault')
      const files = response.data.files || []

      let processed = 0
      let skipped = 0

      for (const file of files) {
        try {
          if (!file.name.endsWith('.md')) {
            skipped++,
            continue
          }
      }

          // Filter by lastSyncTime if provided
          if (lastSyncTime && new Date(file.stat.mtime) <= lastSyncTime) {
            skipped++,
            continue
          }

          await this.processNote(file)
          processed++
        }
    } catch (error) {
          this.logError('syncNotes', error as Error, { fileName: file.name })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncNotes', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in obsidian.integration.ts:', error)
      throw error
    }
  private async syncTags(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.obsidianClient.get('/vault/tags')
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
          this.logError('syncTags', error as Error, { tagName: tag.name })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncTags', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in obsidian.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processNote(note: unknown): Promise<void> {
    this.logInfo('processNote', `Processing note: ${note.name}`)
  }

  private async processTag(tag: unknown): Promise<void> {
    this.logInfo('processTag', `Processing tag: ${tag.name}`)
  }

  // Private webhook handlers
  private async handleNoteWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleNoteWebhook', 'Processing note webhook', data)
  }

  private async handleVaultWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleVaultWebhook', 'Processing vault webhook', data)
  }

  // Public API methods
  async createNote(noteData: { path: string; content: string }): Promise<string> {
    try {
      const _response = await this.obsidianClient.post('/vault', noteData)
      return (response as Response).data.path
    } catch (error) {
      this.logError('createNote', error as Error)
      throw new Error(`Failed to create Obsidian note: ${(error as Error).message}`)
    }

  async updateNote(path: string, content: string): Promise<void> {
    try {
      await this.obsidianClient.put(`/vault/${encodeURIComponent(path)}`, {
        content
      })
    } catch (error) {
      this.logError('updateNote', error as Error)
      throw new Error(`Failed to update Obsidian note: ${(error as Error).message}`)
    }

  async deleteNote(path: string): Promise<void> {
    try {
      await this.obsidianClient.delete(`/vault/${encodeURIComponent(path)}`)
    } catch (error) {
      this.logError('deleteNote', error as Error)
      throw new Error(`Failed to delete Obsidian note: ${(error as Error).message}`)
    }

  async getNote(path: string): Promise<ApiResponse> {
    try {
      const _response = await this.obsidianClient.get(`/vault/${encodeURIComponent(path)}`)
      return (response as Response).data
    } catch (error) {
      this.logError('getNote', error as Error)
      throw new Error(`Failed to get Obsidian note: ${(error as Error).message}`)
    }

  async searchNotes(
    query: string
    options?: {
      path?: string,
      contextLength?: number
    },
  ): Promise<unknown[]> {
    try {
      const params = new URLSearchParams({ query })
      if (_options?.path) params.append('path', _options.path)
      if (_options?.contextLength) params.append('contextLength', _options.contextLength.toString())

      const _response = await this.obsidianClient.get(`/search?${params.toString()}`)
      return (response as Response).data.results || []
    } catch (error) {
      this.logError('searchNotes', error as Error)
      throw new Error(`Failed to search Obsidian notes: ${(error as Error).message}`)
    }

  async getVaultInfo(): Promise<ApiResponse> {
    try {
      const _response = await this.obsidianClient.get('/vault')
      return (response as Response).data
    } catch (error) {
      this.logError('getVaultInfo', error as Error)
      throw new Error(`Failed to get Obsidian vault info: ${(error as Error).message}`)
    }

  async getTags(): Promise<unknown[]> {
    try {
      const _response = await this.obsidianClient.get('/vault/tags')
      return (response as Response).data.tags || []
    } catch (error) {
      this.logError('getTags', error as Error)
      throw new Error(`Failed to get Obsidian tags: ${(error as Error).message}`)
    }

  async getBacklinks(path: string): Promise<unknown[]> {
    try {
      const _response = await this.obsidianClient.get(
        `/vault/${encodeURIComponent(path)}/backlinks`,
      )
      return (response as Response).data.backlinks || []
    } catch (error) {
      this.logError('getBacklinks', error as Error)
      throw new Error(`Failed to get Obsidian backlinks: ${(error as Error).message}`)
    }

  async getGraph(): Promise<ApiResponse> {
    try {
      const _response = await this.obsidianClient.get('/vault/graph')
      return (response as Response).data
    } catch (error) {
      this.logError('getGraph', error as Error)
      throw new Error(`Failed to get Obsidian graph: ${(error as Error).message}`)
    }

  async getRecentFiles(limit?: number): Promise<unknown[]> {
    try {
      const params = limit ? `?limit=${limit}` : ''
      const _response = await this.obsidianClient.get(`/vault/recent${params}`)
      return (response as Response).data.files || []
    } catch (error) {
      this.logError('getRecentFiles', error as Error)
      throw new Error(`Failed to get Obsidian recent files: ${(error as Error).message}`)
    }

  async createFolder(path: string): Promise<void> {
    try {
      await this.obsidianClient.post('/vault/folder', { path })
    } catch (error) {
      this.logError('createFolder', error as Error)
      throw new Error(`Failed to create Obsidian folder: ${(error as Error).message}`)
    }

  async uploadAttachment(data: {,
    path: string
    content: Buffer | string
    contentType?: string
  }): Promise<string> {
    try {
      const _response = await this.obsidianClient.post('/vault/attachment', data, { headers: {
          'Content-Type': data.contentType || 'application/octet-stream' }
      })
      return (response as Response).data.path
    } catch (error) {
      this.logError('uploadAttachment', error as Error)
      throw new Error(`Failed to upload Obsidian attachment: ${(error as Error).message}`)
    }

  async getTemplates(): Promise<unknown[]> {
    try {
      const _response = await this.obsidianClient.get('/vault/templates')
      return (response as Response).data.templates || []
    } catch (error) {
      this.logError('getTemplates', error as Error)
      throw new Error(`Failed to get Obsidian templates: ${(error as Error).message}`)
    }

  async applyTemplate(
    templatePath: string,
    targetPath: string
    variables?: Record<string, string>,
  ): Promise<void> {
    try {
      await this.obsidianClient.post('/vault/template/apply', {
        templatePath,
        targetPath,
        variables
      })
    } catch (error) {
      this.logError('applyTemplate', error as Error)
      throw new Error(`Failed to apply Obsidian template: ${(error as Error).message}`)
    }

}