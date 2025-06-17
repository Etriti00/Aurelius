import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
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
import { Readable } from 'stream'

// Using WebhookPayload from base interface

export class GoogleDriveIntegration extends BaseIntegration {
  readonly provider = 'google-drive'
  readonly name = 'Google Drive'
  readonly version = '1.0.0'

  private oauth2Client: OAuth2Client
  private drive: unknown

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    this.oauth2Client = new google.auth.OAuth2(
      config?.clientId,
      config?.clientSecret,
      config?.redirectUri,
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting user info
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.drive.about.get({ fields: 'user, storageQuota' })
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: ['https://www.googleapis.com/auth/drive']
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
        throw new AuthenticationError('No refresh token available')
      }
  }

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      this.oauth2Client.setCredentials(credentials)
      this.accessToken = credentials.access_token!

      return {
        success: true,
        accessToken: credentials.access_token!
        refreshToken: credentials.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(credentials.expiry_date!)
        scope: credentials.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in google-drive.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      await this.oauth2Client.revokeCredentials()
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.executeWithProtection('connection.test', async () => {
        return this.drive.about.get({ fields: 'user' })
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.code === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.code === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 1000,
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
        name: 'File Management',
        description: 'Create, read, update, and delete files and folders',
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/drive']
      },
      {
        name: 'File Sharing',
        description: 'Share files and manage permissions'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/drive']
      },
      {
        name: 'File Metadata',
        description: 'Access file metadata, comments, and revisions',
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/drive']
      },
      {
        name: 'Search',
        description: 'Search files and folders'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/drive']
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

      this.logInfo('syncData', 'Starting Google Drive sync', { lastSyncTime })

      // Sync files and folders
      try {
        const filesResult = await this.syncFiles(lastSyncTime)
        totalProcessed += filesResult.processed,
        totalSkipped += filesResult.skipped
      }
    } catch (error) {
        errors.push(`Files sync failed: ${(error as Error).message}`)
        this.logError('syncFiles', error as Error)
      }

      catch (error) {
        console.error('Error in google-drive.integration.ts:', error)
        throw error
      }
      // Sync shared files
      try {
        const sharedResult = await this.syncSharedFiles(lastSyncTime)
        totalProcessed += sharedResult.processed,
        totalSkipped += sharedResult.skipped
      } catch (error) {
        errors.push(`Shared files sync failed: ${(error as Error).message}`)
        this.logError('syncSharedFiles', error as Error)
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
      throw new SyncError('Google Drive sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Google Drive webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'drive.file.created':
        case 'drive.file.updated':
        case 'drive.file.deleted':
          await this.handleFileWebhook(payload.data)
          break
        case 'drive.permissions.updated':
          await this.handlePermissionsWebhook(payload.data)
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
      console.error('Error in google-drive.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Google Drive uses push notifications with verification,
    return true
  }

  // Private sync methods
  private async syncFiles(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let query = 'trashed=false'
      if (lastSyncTime) {
        query += ` and modifiedTime > '${lastSyncTime.toISOString()}'`
      }

      const _response = await this.executeWithProtection('sync.files', async () => {
        return this.drive.files.list({
          q: query,
          pageSize: 1000
          fields:
            'nextPageToken, files(id, name, mimeType, parents, modifiedTime, size, webViewLink, webContentLink, thumbnailLink, owners, permissions, shared)',
          orderBy: 'modifiedTime desc'
        })
      })

      const files = response.data.files || []
      let processed = 0
      let skipped = 0

      for (const file of files) {
        try {
          await this.processFile(file)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncFiles', error as Error, { fileId: file.id })
          skipped++
        }

      // Handle pagination
      let nextPageToken = response.data.nextPageToken
      while (nextPageToken && processed < 10000) {
        // Safety limit
        try {
          const pageResponse = await this.executeWithProtection('sync.files.page', async () => {
            return this.drive.files.list({
              q: query,
              pageSize: 1000
              fields:
                'nextPageToken, files(id, name, mimeType, parents, modifiedTime, size, webViewLink, webContentLink, thumbnailLink, owners, permissions, shared)',
              pageToken: nextPageToken
            })
          })
      }

          const pageFiles = pageResponse.data.files || []

          for (const file of pageFiles) {
            try {
              await this.processFile(file)
              processed++
            }
          }
    } catch (error) {
              this.logError('syncFiles', error as Error, { fileId: file.id })
              skipped++
            },

          nextPageToken = pageResponse.data.nextPageToken
        }
    } catch (error) {
          this.logError('syncFiles', error as Error, { context: 'pagination' })
          break
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncFiles', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-drive.integration.ts:', error)
      throw error
    }
  private async syncSharedFiles(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let query = 'sharedWithMe and trashed=false'
      if (lastSyncTime) {
        query += ` and modifiedTime > '${lastSyncTime.toISOString()}'`
      }

      const _response = await this.executeWithProtection('sync.shared_files', async () => {
        return this.drive.files.list({
          q: query,
          pageSize: 1000
          fields:
            'nextPageToken, files(id, name, mimeType, parents, modifiedTime, size, webViewLink, webContentLink, thumbnailLink, owners, permissions, shared)'
        })
      })

      const files = response.data.files || []
      let processed = 0
      let skipped = 0

      for (const file of files) {
        try {
          await this.processSharedFile(file)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncSharedFiles', error as Error, { fileId: file.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncSharedFiles', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-drive.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processFile(file: unknown): Promise<void> {
    this.logInfo('processFile', `Processing file: ${file.name}`, {
      fileId: file.id,
      mimeType: file.mimeType
      size: file.size,
      modifiedTime: file.modifiedTime
    }),

    // Here you would save the file metadata to your database
  }

  private async processSharedFile(file: unknown): Promise<void> {
    this.logInfo('processSharedFile', `Processing shared file: ${file.name}`, {
      fileId: file.id,
      owners: file.owners?.map((o: unknown) => o.emailAddress)
    }),

    // Here you would save the shared file metadata to your database
  }

  // Private webhook handlers
  private async handleFileWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleFileWebhook', 'Processing file webhook', data)
  }

  private async handlePermissionsWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePermissionsWebhook', 'Processing permissions webhook', data)
  }

  // Public API methods
  async uploadFile(
    name: string,
    content: string | Buffer | Readable
    options: {
      mimeType?: string
      parents?: string[],
      description?: string
    } = {},
  ): Promise<string> {
    try {
      const fileMetadata: Record<string, unknown> = {
        name,
        parents: options.parents,
        description: options.description
      }

      const media = {
        mimeType: options.mimeType || 'application/octet-stream',
        body: content
      }

      const _response = await this.executeWithProtection('api.upload_file', async () => {
        return this.drive.files.create({
          requestBody: fileMetadata
          media,
          fields: 'id'
        })
      })

      return (response as Response).data.id!
    } catch (error) {
      this.logError('uploadFile', error as Error)
      throw new Error(`Failed to upload file: ${(error as Error).message}`)
    }

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const _response = await this.executeWithProtection('api.download_file', async () => {
        return this.drive.files.get(
          {
            fileId,
            alt: 'media'
          },
          { responseType: 'stream' },
        )
      })
  }

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        response.data.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.data.on('end', () => resolve(Buffer.concat(chunks)))
        response.data.on('error', reject)
      })
    } catch (error) {
      this.logError('downloadFile', error as Error)
      throw new Error(`Failed to download file: ${(error as Error).message}`)
    }

  async getFileMetadata(fileId: string, fields?: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_file_metadata', async () => {
        return this.drive.files.get({
          fileId,
          fields:
            fields ||
            'id, name, mimeType, size, modifiedTime, parents, webViewLink, webContentLink'
        })
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getFileMetadata', error as Error)
      throw new Error(`Failed to get file metadata: ${(error as Error).message}`)
    }

  async updateFile(
    fileId: string,
    updates: {
      name?: string
      description?: string
      parents?: string[]
      content?: string | Buffer | Readable,
      mimeType?: string
    },
  ): Promise<void> {
    try {
      const fileMetadata: Record<string, unknown> = {}
      if (updates.name) fileMetadata.name = updates.name
      if (updates.description) fileMetadata.description = updates.description
      if (updates.parents) fileMetadata.parents = updates.parents

      const requestOptions: unknown = {
        fileId,
        requestBody: fileMetadata
      }

      if (updates.content) {
        requestOptions.media = {
          mimeType: updates.mimeType || 'application/octet-stream',
          body: updates.content
        }
      }

      await this.executeWithProtection('api.update_file', async () => {
        return this.drive.files.update(requestOptions)
      })
    }
    } catch (error) {
      this.logError('updateFile', error as Error)
      throw new Error(`Failed to update file: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in google-drive.integration.ts:', error)
      throw error
    }
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_file', async () => {
        return this.drive.files.delete({ fileId })
      })
    } catch (error) {
      this.logError('deleteFile', error as Error)
      throw new Error(`Failed to delete file: ${(error as Error).message}`)
    }

  async copyFile(fileId: string, name: string, parents?: string[]): Promise<string> {
    try {
      const _response = await this.executeWithProtection('api.copy_file', async () => {
        return this.drive.files.copy({
          fileId,
          requestBody: {
            name,
            parents
          },
          fields: 'id'
        })
      })
  }

      return (response as Response).data.id!
    } catch (error) {
      this.logError('copyFile', error as Error)
      throw new Error(`Failed to copy file: ${(error as Error).message}`)
    }

  async createFolder(name: string, parents?: string[]): Promise<string> {
    try {
      const _response = await this.executeWithProtection('api.create_folder', async () => {
        return this.drive.files.create({
          requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder'
            parents
          },
          fields: 'id'
        })
      })
  }

      return (response as Response).data.id!
    } catch (error) {
      this.logError('createFolder', error as Error)
      throw new Error(`Failed to create folder: ${(error as Error).message}`)
    }

  async listFiles(
    options: {
      query?: string
      parents?: string[]
      mimeType?: string
      maxResults?: number,
      orderBy?: string
    } = {},
  ): Promise<unknown[]> {
    try {
      let query = 'trashed=false'

      if (_options.query) {
        query += ` and name contains '${options.query}'`
      }

      if (_options.parents?.length) {
        const parentQueries = options.parents.map(parent => `'${parent}' in parents`)
        query += ` and (${parentQueries.join(' or ')})`
      }

      if (_options.mimeType) {
        query += ` and mimeType='${options.mimeType}'`
      }

      const _response = await this.executeWithProtection('api.list_files', async () => {
        return this.drive.files.list({
          q: query,
          pageSize: options.maxResults || 100
          fields:
            'files(id, name, mimeType, size, modifiedTime, parents, webViewLink, thumbnailLink)',
          orderBy: options.orderBy || 'modifiedTime desc'
        })
      })

      return (response as Response).data.files || []
    } catch (error) {
      this.logError('listFiles', error as Error)
      throw new Error(`Failed to list files: ${(error as Error).message}`)
    }

  async shareFile(
    fileId: string,
    permissions: Array<{
      type: 'user' | 'group' | 'domain' | 'anyone',
      role: 'reader' | 'writer' | 'commenter' | 'owner'
      emailAddress?: string,
      domain?: string
    }>,
  ): Promise<void> {
    try {
      for (const permission of permissions) {
        await this.executeWithProtection('api.share_file', async () => {
          return this.drive.permissions.create({
            fileId,
            requestBody: permission
          })
        })
      }
    } catch (error) {
      this.logError('shareFile', error as Error)
      throw new Error(`Failed to share file: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in google-drive.integration.ts:', error)
      throw error
    }
  async getFilePermissions(fileId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_file_permissions', async () => {
        return this.drive.permissions.list({
          fileId,
          fields: 'permissions(id, type, role, emailAddress, displayName)'
        })
      })
  }

      return (response as Response).data.permissions || []
    } catch (error) {
      this.logError('getFilePermissions', error as Error)
      throw new Error(`Failed to get file permissions: ${(error as Error).message}`)
    }

  async searchFiles(query: string, maxResults = 50): Promise<unknown[]> {
    try {
      const searchQuery = `trashed=false and fullText contains '${query}'`
  }

      const _response = await this.executeWithProtection('api.search_files', async () => {
        return this.drive.files.list({
          q: searchQuery,
          pageSize: maxResults
          fields:
            'files(id, name, mimeType, size, modifiedTime, parents, webViewLink, thumbnailLink)',
          orderBy: 'relevance desc'
        })
      })

      return (response as Response).data.files || []
    } catch (error) {
      this.logError('searchFiles', error as Error)
      throw new Error(`Failed to search files: ${(error as Error).message}`)
    }

  async getStorageQuota(): Promise<{
    limit: number,
    usage: number
    usageInDrive: number,
    usageInDriveTrash: number
  }> {
    try {
      const _response = await this.executeWithProtection('api.get_storage_quota', async () => {
        return this.drive.about.get({ fields: 'storageQuota' })
      })
  }

      const quota = response.data.storageQuota
      return {
        limit: parseInt(quota.limit || '0'),
        usage: parseInt(quota.usage || '0')
        usageInDrive: parseInt(quota.usageInDrive || '0'),
        usageInDriveTrash: parseInt(quota.usageInDriveTrash || '0')
      }
    } catch (error) {
      this.logError('getStorageQuota', error as Error)
      throw new Error(`Failed to get storage quota: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in google-drive.integration.ts:', error)
      throw error
    }
}