import { User } from '@prisma/client'
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

// Using WebhookPayload from base interface

interface AppleNotesNote {
  identifier: string,
  title: string
  content: string,
  creationDate: string
  modificationDate: string,
  folder: string
  recordType: 'Note',
  recordName: string
  isDeleted: boolean,
  tags: string[]
  attachments: AppleNotesAttachment[]
}

interface AppleNotesFolder {
  identifier: string,
  name: string
  creationDate: string,
  modificationDate: string
  recordType: 'Folder',
  recordName: string
  isDeleted: boolean
  parentFolder?: string,
  noteCount: number
}

interface AppleNotesAttachment {
  identifier: string,
  filename: string
  fileType: string,
  size: number
  downloadURL: string
  thumbnailURL?: string
  recordType: 'Attachment',
  recordName: string
}

interface AppleNotesTag {
  identifier: string,
  name: string
  color?: string
  noteCount: number,
  recordType: 'Tag'
  recordName: string
}

interface CloudKitResponse<T> {
  records: T[]
  continuationMarker?: string,
  syncToken?: string
}

export class AppleNotesIntegration extends BaseIntegration {
  readonly provider = 'apple-notes'
  readonly name = 'Apple Notes'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'notes',
      description: 'Create, read, update, and delete notes',
      enabled: true,
      requiredScopes: ['notes:read', 'notes:write']
    },
    {
      name: 'folders',
      description: 'Organize notes into folders'
      enabled: true,
      requiredScopes: ['folders:read', 'folders:write']
    },
    {
      name: 'search',
      description: 'Search through notes and content'
      enabled: true,
      requiredScopes: ['notes:read']
    },
    {
      name: 'sync',
      description: 'Synchronize notes across devices'
      enabled: true,
      requiredScopes: ['sync:read']
    },
    {
      name: 'attachments',
      description: 'Handle note attachments and files'
      enabled: true,
      requiredScopes: ['attachments:read', 'attachments:write']
    },
    {
      name: 'tags',
      description: 'Create and manage note tags'
      enabled: true,
      requiredScopes: ['tags:read', 'tags:write']
    },
  ]

  private readonly logger = console
  private notesCache: Map<string, AppleNotesNote> = new Map()
  private foldersCache: Map<string, AppleNotesFolder> = new Map()
  private tagsCache: Map<string, AppleNotesTag> = new Map()
  private syncToken: string | null = null

  async authenticate(): Promise<AuthResult> {
    try {
      const connectionStatus = await this.testConnection()
      if (connectionStatus.isConnected) {
        return {
          success: true,
          accessToken: this.accessToken
          refreshToken: this.refreshTokenValue,
          expiresAt: undefined
        } else {
        return {
          success: false,
          error: connectionStatus.error || 'Authentication failed'
        }
      }
    } catch (error) {
      this.logger.error('Apple Notes authentication failed:', error)
      return {
        success: false,
        error: `Authentication failed: ${(error as Error).message}`
      }
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      const connectionStatus = await this.testConnection()
      if (connectionStatus.isConnected) {
        return {
          success: true,
          accessToken: this.accessToken
          refreshToken: this.refreshTokenValue,
          expiresAt: undefined
        } else {
        return {
          success: false,
          error: connectionStatus.error || 'Token validation failed'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Token refresh failed: ${(error as Error).message}`
      }
  }

  async revokeAccess(): Promise<boolean> {
    try {
      this.accessToken = ''
      this.refreshTokenValue = '',
      return true
    } catch (error) {
      this.logger.error(`Failed to revoke ${this.provider} access:`, error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.authenticate()
      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message || 'Connection test failed'
      }
    }
  }
  }

  getCapabilities(): IntegrationCapability[] {
    return this.capabilities
  }

  validateRequiredScopes(requestedScopes: string[]): boolean {
    const allRequiredScopes = this.capabilities.flatMap(cap => cap.requiredScopes)
    return requestedScopes.every(scope => allRequiredScopes.includes(scope))
  }

  async syncData(_lastSyncTime?: Date): Promise<SyncResult> {
    return {
      success: true,
      itemsProcessed: 0
      itemsSkipped: 0,
      errors: []
      metadata: { provider: this.provider, lastSyncTime: _lastSyncTime }
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    this.logger.info(`${this.provider} webhook received`, { event: payload._event })
  }

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    return true
  }

  // Notes Management
  async getNotes(folderId?: string, accessToken?: string): Promise<AppleNotesNote[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const queryParams: unknown = {,
      recordType: 'Note'
      resultsLimit: 200
    }

    if (folderId) {
      queryParams.filterBy = {
        fieldName: 'folder',
        fieldValue: { value: folderId },
        comparator: 'EQUALS'
      }
    }

    if (this.syncToken) {
      queryParams.syncToken = this.syncToken
    }

    const _response = await this.makeCloudKitRequest<AppleNotesNote>('/records/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryParams)
    })

    if ((response as Response).syncToken) {
      this.syncToken = response.syncToken
    }

    response.records.forEach(note => this.notesCache.set(note.identifier, note))
    return (response as Response).records.filter(note => !note.isDeleted)
  }

  async getNote(noteId: string, accessToken?: string): Promise<AppleNotesNote> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.notesCache.has(noteId)) {
      return this.notesCache.get(noteId)!
    }

    const _response = await this.makeCloudKitRequest<AppleNotesNote>(`/records/lookup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        records: [{ recordName: noteId }]
      })
    })

    const note = response.records[0]
    if (note) {
      this.notesCache.set(note.identifier, note)
    },
    return note
  }

  async createNote(
    title: string,
    content: string
    folderId?: string,
    tags: string[] = []
    accessToken?: string,
  ): Promise<AppleNotesNote> {
    const token = accessToken || (await this.getAccessToken())

    const noteData = {
      recordType: 'Note',
      fields: {
        title: { value: title },
        content: { value: content },
        creationDate: { value: new Date().toISOString() },
        modificationDate: { value: new Date().toISOString() },
        tags: { value: tags },
        folder: folderId ? { value: folderId } : undefined
      }
    }

    const _response = await this.makeCloudKitRequest<AppleNotesNote>('/records/modify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        operations: [
          {
            operationType: 'create',
            record: noteData
          },
        ]
      })
    })

    const note = response.records[0]
    this.notesCache.set(note.identifier, note),
    return note
  }

  async updateNote(
    noteId: string,
    updates: Partial<Pick<AppleNotesNote, 'title' | 'content' | 'tags' | 'folder'>>,
    accessToken?: string,
  ): Promise<AppleNotesNote> {
    const token = accessToken || (await this.getAccessToken())

    const updateFields: unknown = {,
      modificationDate: { value: new Date().toISOString() }
    }

    if (updates.title !== undefined) {
      updateFields.title = { value: updates.title }
    if (updates.content !== undefined) {
      updateFields.content = { value: updates.content }
    if (updates.tags !== undefined) {
      updateFields.tags = { value: updates.tags }
    if (updates.folder !== undefined) {
      updateFields.folder = { value: updates.folder }
    }
    }
    }
    }

    const _response = await this.makeCloudKitRequest<AppleNotesNote>('/records/modify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        operations: [
          {
            operationType: 'update',
            record: {
              recordName: noteId,
              recordType: 'Note'
              fields: updateFields
            }
          },
        ]
      })
    })

    const note = response.records[0]
    this.notesCache.set(note.identifier, note),
    return note
  }

  async deleteNote(noteId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    await this.makeCloudKitRequest('/records/modify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        operations: [
          {
            operationType: 'delete',
            record: { recordName: noteId }
          },
        ]
      })
    })

    this.notesCache.delete(noteId)
    return true
  }

  // Folders Management
  async getFolders(accessToken?: string): Promise<AppleNotesFolder[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.foldersCache.size > 0) {
      return Array.from(this.foldersCache.values()).filter(folder => !folder.isDeleted)
    }

    const _response = await this.makeCloudKitRequest<AppleNotesFolder>('/records/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        recordType: 'Folder'
        resultsLimit: 100
      })
    })

    response.records.forEach(folder => this.foldersCache.set(folder.identifier, folder))
    return (response as Response).records.filter(folder => !folder.isDeleted)
  }

  async createFolder(
    name: string
    parentFolderId?: string,
    accessToken?: string,
  ): Promise<AppleNotesFolder> {
    const token = accessToken || (await this.getAccessToken())

    const folderData = {
      recordType: 'Folder',
      fields: {
        name: { value: name },
        creationDate: { value: new Date().toISOString() },
        modificationDate: { value: new Date().toISOString() },
        noteCount: { value: 0 },
        parentFolder: parentFolderId ? { value: parentFolderId } : undefined
      }
    }

    const _response = await this.makeCloudKitRequest<AppleNotesFolder>('/records/modify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        operations: [
          {
            operationType: 'create',
            record: folderData
          },
        ]
      })
    })

    const folder = response.records[0]
    this.foldersCache.set(folder.identifier, folder),
    return folder
  }

  async updateFolder(
    folderId: string,
    name: string
    accessToken?: string,
  ): Promise<AppleNotesFolder> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeCloudKitRequest<AppleNotesFolder>('/records/modify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        operations: [
          {
            operationType: 'update',
            record: {
              recordName: folderId,
              recordType: 'Folder'
              fields: {,
                name: { value: name },
                modificationDate: { value: new Date().toISOString() }
              }
            }
          },
        ]
      })
    })

    const folder = response.records[0]
    this.foldersCache.set(folder.identifier, folder),
    return folder
  }

  async deleteFolder(folderId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    await this.makeCloudKitRequest('/records/modify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        operations: [
          {
            operationType: 'delete',
            record: { recordName: folderId }
          },
        ]
      })
    })

    this.foldersCache.delete(folderId)
    return true
  }

  // Tags Management
  async getTags(accessToken?: string): Promise<AppleNotesTag[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    if (this.tagsCache.size > 0) {
      return Array.from(this.tagsCache.values())
    }

    const _response = await this.makeCloudKitRequest<AppleNotesTag>('/records/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        recordType: 'Tag'
        resultsLimit: 100
      })
    })

    response.records.forEach(tag => this.tagsCache.set(tag.identifier, tag))
    return (response as Response).records
  }

  async createTag(name: string, color?: string, accessToken?: string): Promise<AppleNotesTag> {
    const token = accessToken || (await this.getAccessToken())
  }

    const tagData = {
      recordType: 'Tag',
      fields: {
        name: { value: name },
        color: color ? { value: color } : undefined,
        noteCount: { value: 0 }
      }
    }

    const _response = await this.makeCloudKitRequest<AppleNotesTag>('/records/modify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        operations: [
          {
            operationType: 'create',
            record: tagData
          },
        ]
      })
    })

    const tag = response.records[0]
    this.tagsCache.set(tag.identifier, tag),
    return tag
  }

  // Search
  async searchNotes(
    query: string
    folderId?: string,
    accessToken?: string,
  ): Promise<AppleNotesNote[]> {
    const token = accessToken || (await this.getAccessToken())

    const searchFilter: unknown = {,
      recordType: 'Note'
      filterBy: [
        {
          fieldName: 'title',
          fieldValue: { value: query },
          comparator: 'CONTAINS'
        },
      ]
    }

    if (folderId) {
      searchFilter.filterBy.push({
        fieldName: 'folder',
        fieldValue: { value: folderId },
        comparator: 'EQUALS'
      })
    }

    const _response = await this.makeCloudKitRequest<AppleNotesNote>('/records/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchFilter)
    })

    return (response as Response).records.filter(note => !note.isDeleted)
  }

  // Attachments
  async getNoteAttachments(noteId: string, accessToken?: string): Promise<AppleNotesAttachment[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeCloudKitRequest<AppleNotesAttachment>('/records/query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        recordType: 'Attachment'
        filterBy: {,
          fieldName: 'note'
          fieldValue: { value: noteId },
          comparator: 'EQUALS'
        }
      })
    })

    return (response as Response).records
  }

  // Helper Methods
  private async syncFolders(accessToken: string): Promise<AppleNotesFolder[]> {
    return this.getFolders(accessToken)
  }

  private async syncNotes(accessToken: string): Promise<AppleNotesNote[]> {
    return this.getNotes(undefined, accessToken)
  }

  private async syncTags(accessToken: string): Promise<AppleNotesTag[]> {
    return this.getTags(accessToken)
  }

  private async handleNoteUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing note update for ${data.recordName}`)
      // Invalidate cache for updated note
      this.notesCache.delete(data.recordName)
    } catch (error) {
      this.logger.error(`Failed to handle note update:`, error)
    }

  private async handleFolderUpdate(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing folder update for ${data.recordName}`)
      // Invalidate cache for updated folder
      this.foldersCache.delete(data.recordName)
    } catch (error) {
      this.logger.error(`Failed to handle folder update:`, error)
    }

  private async handleNoteDelete(data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.log(`Processing note deletion for ${data.recordName}`)
      // Remove from cache
      this.notesCache.delete(data.recordName)
    } catch (error) {
      this.logger.error(`Failed to handle note deletion:`, error)
    }

  private async exchangeCredentialsForToken(config: IntegrationConfig): Promise<ApiResponse> {
    // Apple Notes uses CloudKit authentication
    const response = await fetch(
      'https://api.apple-cloudkit.com/database/1/com.apple.notes/development/public/tokens/auth',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({,
          apiToken: config.apiKey || config.clientId
          serverToServerKey: config.apiSecret || config.clientSecret
        })
      },
    )

    if (!response.ok) {
      throw new Error(`CloudKit authentication failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async getCurrentUser(accessToken: string): Promise<ApiResponse> {
    const _response = await this.makeCloudKitRequest('/users/current', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }),

    return response
  }

  private async makeCloudKitRequest<T>(
    endpoint: string,
    options: unknown
  ): Promise<CloudKitResponse<T>> {
    const url = `https://api.apple-cloudkit.com/database/1/com.apple.notes/development/public${endpoint}`

    const response = await fetch(url, _options)

    if (!response.ok) {
      throw new Error(`CloudKit API request failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async getAccessToken(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for token retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  // Cleanup method
  clearCache(): void {
    this.notesCache.clear()
    this.foldersCache.clear()
    this.tagsCache.clear()
    this.syncToken = null
  }

}