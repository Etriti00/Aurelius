import { Client } from '@microsoft/microsoft-graph-client'
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client'
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

class CustomAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken
  }

export class MicrosoftOneDriveIntegration extends BaseIntegration {
  readonly provider = 'microsoft-onedrive'
  readonly name = 'Microsoft OneDrive'
  readonly version = '1.0.0'

  private graphClient: Client

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)

    const authProvider = new CustomAuthProvider(accessToken)
    this.graphClient = Client.initWithMiddleware({ authProvider })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.graphClient.api('/me/drive').get()
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: [
          'https://graph.microsoft.com/Files.ReadWrite.All',
          'https://graph.microsoft.com/Sites.ReadWrite.All',
        ]
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }
  }

      const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          refresh_token: this.refreshTokenValue
          grant_type: 'refresh_token',
          scope: this.config.scopes.join(' ')
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()

      const authProvider = new CustomAuthProvider(tokenData.access_token)
      this.graphClient = Client.initWithMiddleware({ authProvider })
      this.accessToken = tokenData.access_token

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      throw new AuthenticationError('Token refresh failed: ' + (error as Error).message)
    }

    catch (error) {
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      return true
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      await this.executeWithProtection('connection.test', async () => {
        return this.graphClient.api('/me/drive').get()
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      const err = error as unknown
      if (err.statusCode === 401) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (err.statusCode === 429) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 10000,
            remaining: 0
            resetTime: new Date(Date.now() + 600000), // 10 minutes
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
        description: 'Upload, download, and manage files and folders',
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'File Sharing',
        description: 'Share files and manage permissions'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'Version Control',
        description: 'Access file versions and history'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'Search',
        description: 'Search across OneDrive content'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'Thumbnails',
        description: 'Generate and access file thumbnails'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'Recycle Bin',
        description: 'Access and restore deleted files'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
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

      this.logInfo('syncData', 'Starting Microsoft OneDrive sync', { lastSyncTime })

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
        console.error('Error in microsoft-onedrive.integration.ts:', error)
        throw error
      }
      try {
        const sharedResult = await this.syncSharedFiles(lastSyncTime)
        totalProcessed += sharedResult.processed,
        totalSkipped += sharedResult.skipped
      } catch (error) {
        errors.push(`Shared files sync failed: ${(error as Error).message}`)
        this.logError('syncSharedFiles', error as Error)
      }

      try {
        const recentResult = await this.syncRecentFiles()
        totalProcessed += recentResult.processed,
        totalSkipped += recentResult.skipped
      } catch (error) {
        errors.push(`Recent files sync failed: ${(error as Error).message}`)
        this.logError('syncRecentFiles', error as Error)
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
      throw new SyncError('Microsoft OneDrive sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Microsoft OneDrive webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'onedrive.file.created':
        case 'onedrive.file.updated':
        case 'onedrive.file.deleted':
        case 'onedrive.file.moved':
          await this.handleFileWebhook(payload.data)
          break
        case 'onedrive.folder.created':
        case 'onedrive.folder.updated':
        case 'onedrive.folder.deleted':
          await this.handleFolderWebhook(payload.data)
          break
        case 'onedrive.permissions.updated':
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
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    return true
  }

  // Private sync methods
  private async syncFiles(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      let filter = ''
      if (lastSyncTime) {
        filter = `$filter=lastModifiedDateTime ge ${lastSyncTime.toISOString()}`
      }

      const files = await this.executeWithProtection('sync.files', async () => {
        return this.graphClient
          .api('/me/drive/root/children')
          .filter(filter)
          .expand('thumbnails')
          .top(1000)
          .get()
      })

      let processed = 0
      let skipped = 0

      for (const file of files.value || []) {
        try {
          if (lastSyncTime && file.lastModifiedDateTime) {
            const modifiedTime = new Date(file.lastModifiedDateTime)
            if (modifiedTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processFile(file)
          processed++

          // Recursively sync folders
          if (file.folder && file.folder.childCount > 0) {
            const folderResult = await this.syncFolder(file.id, lastSyncTime)
            processed += folderResult.processed,
            skipped += folderResult.skipped
          }
    } catch (error) {
          this.logError('syncFiles', error as Error, { fileId: file.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncFiles', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
  private async syncFolder(
    folderId: string
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      let filter = ''
      if (lastSyncTime) {
        filter = `$filter=lastModifiedDateTime ge ${lastSyncTime.toISOString()}`
      }

      const folderItems = await this.executeWithProtection(`sync.folder.${folderId}`, async () => {
        return this.graphClient
          .api(`/me/drive/items/${folderId}/children`)
          .filter(filter)
          .expand('thumbnails')
          .top(1000)
          .get()
      })

      let processed = 0
      let skipped = 0

      for (const item of folderItems.value || []) {
        try {
          if (lastSyncTime && item.lastModifiedDateTime) {
            const modifiedTime = new Date(item.lastModifiedDateTime)
            if (modifiedTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processFile(item)
          processed++

          // Recursively sync subfolders
          if (item.folder && item.folder.childCount > 0) {
            const subfolderResult = await this.syncFolder(item.id, lastSyncTime)
            processed += subfolderResult.processed,
            skipped += subfolderResult.skipped
          }
    } catch (error) {
          this.logError('syncFolder', error as Error, { folderId, itemId: item.id }),
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncFolder', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
  private async syncSharedFiles(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const sharedFiles = await this.executeWithProtection('sync.shared_files', async () => {
        return this.graphClient.api('/me/drive/sharedWithMe').top(1000).get()
      })

      let processed = 0
      let skipped = 0

      for (const file of sharedFiles.value || []) {
        try {
          if (lastSyncTime && file.lastModifiedDateTime) {
            const modifiedTime = new Date(file.lastModifiedDateTime)
            if (modifiedTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processSharedFile(file)
          processed++
        }
    } catch (error) {
          this.logError('syncSharedFiles', error as Error, { fileId: file.id })
          skipped++
        }

        catch (error) {
          console.error('Error in microsoft-onedrive.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncSharedFiles', error as Error),
      throw error
    }

  private async syncRecentFiles(): Promise<{ processed: number; skipped: number }> {
    try {
      const recentFiles = await this.executeWithProtection('sync.recent_files', async () => {
        return this.graphClient.api('/me/drive/recent').top(100).get()
      })

      let processed = 0
      let skipped = 0

      for (const file of recentFiles.value || []) {
        try {
          await this.processRecentFile(file)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncRecentFiles', error as Error, { fileId: file.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncRecentFiles', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processFile(file: unknown): Promise<void> {
    this.logInfo('processFile', `Processing file: ${file.name}`, {
      fileId: file.id,
      size: file.size
      mimeType: file.file?.mimeType,
      lastModified: file.lastModifiedDateTime
      isFolder: !!file.folder
    })
  }

  private async processSharedFile(file: unknown): Promise<void> {
    this.logInfo('processSharedFile', `Processing shared file: ${file.name}`, {
      fileId: file.id,
      sharedBy: file.lastModifiedBy?.user?.displayName
      remoteItem: !!file.remoteItem
    })
  }

  private async processRecentFile(file: unknown): Promise<void> {
    this.logInfo('processRecentFile', `Processing recent file: ${file.name}`, {
      fileId: file.id,
      lastModified: file.lastModifiedDateTime
    })
  }

  // Private webhook handlers
  private async handleFileWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleFileWebhook', 'Processing file webhook', data)
  }

  private async handleFolderWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleFolderWebhook', 'Processing folder webhook', data)
  }

  private async handlePermissionsWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePermissionsWebhook', 'Processing permissions webhook', data)
  }

  // Public API methods
  async uploadFile(
    fileName: string,
    content: Buffer | Readable
    parentPath = '/me/drive/root:',
  ): Promise<{ id: string; url: string }> {
    try {
      const _response = await this.executeWithProtection('api.upload_file', async () => {
        return this.graphClient.api(`${parentPath}/${fileName}:/content`).put(content)
      })

      return {
        id: response.id,
        url: response.webUrl
      }
    } catch (error) {
      this.logError('uploadFile', error as Error)
      throw new Error(`Failed to upload file: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
  async uploadLargeFile(
    fileName: string,
    content: Buffer
    parentPath = '/me/drive/root:',
  ): Promise<{ id: string; url: string }> {
    try {
      // Create upload session for large files (>4MB)
      const uploadSession = await this.executeWithProtection(
        'api.create_upload_session',
        async () => {
          return this.graphClient.api(`${parentPath}/${fileName}:/createUploadSession`).post({ item: {
              '@microsoft.graph.conflictBehavior': 'replace' }
          })
        },
      )

      const uploadUrl = uploadSession.uploadUrl
      const chunkSize = 320 * 1024 // 320KB chunks

      let uploadedBytes = 0
      const totalSize = content.length

      while (uploadedBytes < totalSize) {
        const chunkEnd = Math.min(uploadedBytes + chunkSize, totalSize)
        const chunk = content.slice(uploadedBytes, chunkEnd)
      }

        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Range': `bytes ${uploadedBytes}-${chunkEnd - 1}/${totalSize}`,
            'Content-Length': chunk.length.toString()
          },
          body: chunk
        })

        if ((response as Response).status === 202) {
          uploadedBytes = chunkEnd
        } else if ((response as Response).status === 201 || response.status === 200) {
          const result = await response.json()
          return {
            id: result.id,
            url: result.webUrl
          } else {
          throw new Error(`Upload failed with status: ${response.status}`)
        }
        }

      throw new Error('Upload completed but no response received')
    }
    } catch (error) {
      this.logError('uploadLargeFile', error as Error)
      throw new Error(`Failed to upload large file: ${(error as Error).message}`)
    }

  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const _response = await this.executeWithProtection('api.download_file', async () => {
        return this.graphClient.api(`/me/drive/items/${fileId}/content`).get()
      })
  }

      return Buffer.from(response)
    } catch (error) {
      this.logError('downloadFile', error as Error)
      throw new Error(`Failed to download file: ${(error as Error).message}`)
    }

  async getFile(fileId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_file', async () => {
        return this.graphClient
          .api(`/me/drive/items/${fileId}`)
          .expand('thumbnails,permissions')
          .get()
      })
  }

      return response
    } catch (error) {
      this.logError('getFile', error as Error)
      throw new Error(`Failed to get file: ${(error as Error).message}`)
    }

  async listFiles(parentPath = '/me/drive/root/children', top = 200): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_files', async () => {
        return this.graphClient
          .api(parentPath)
          .expand('thumbnails')
          .orderby('lastModifiedDateTime desc')
          .top(top)
          .get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('listFiles', error as Error)
      throw new Error(`Failed to list files: ${(error as Error).message}`)
    }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_file', async () => {
        return this.graphClient.api(`/me/drive/items/${fileId}`).delete()
      })
    } catch (error) {
      this.logError('deleteFile', error as Error)
      throw new Error(`Failed to delete file: ${(error as Error).message}`)
    }

  async moveFile(fileId: string, newParentId: string, newName?: string): Promise<void> {
    try {
      const updateData: unknown = { parentReference: {,
          id: newParentId }
      }
  }

      if (newName) {
        updateData.name = newName
      }

      await this.executeWithProtection('api.move_file', async () => {
        return this.graphClient.api(`/me/drive/items/${fileId}`).patch(updateData)
      })
    } catch (error) {
      this.logError('moveFile', error as Error)
      throw new Error(`Failed to move file: ${(error as Error).message}`)
    }

  async copyFile(fileId: string, newParentId: string, newName?: string): Promise<string> {
    try {
      const copyData = { parentReference: {,
          id: newParentId },
        name: newName
      }
  }

      const _response = await this.executeWithProtection('api.copy_file', async () => {
        return this.graphClient.api(`/me/drive/items/${fileId}/copy`).post(copyData)
      })

      // Copy operation returns a location header with the status URL
      return (response as Response).location || 'copy-initiated'
    } catch (error) {
      this.logError('copyFile', error as Error)
      throw new Error(`Failed to copy file: ${(error as Error).message}`)
    }

  async createFolder(name: string, parentPath = '/me/drive/root/children'): Promise<string> {
    try {
      const folderData = {
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      }
  }

      const _response = await this.executeWithProtection('api.create_folder', async () => {
        return this.graphClient.api(parentPath).post(folderData)
      })

      return (response as Response).id
    } catch (error) {
      this.logError('createFolder', error as Error)
      throw new Error(`Failed to create folder: ${(error as Error).message}`)
    }

  async shareFile(
    fileId: string,
    recipients: string[]
    role: 'read' | 'write' | 'owner' = 'read'
    message?: string,
  ): Promise<void> {
    try {
      for (const recipient of recipients) {
        const permission = {
          requireSignIn: true,
          sendInvitation: true
          roles: [role],
          recipients: [{ email: recipient }],
          message
        }
      }

        await this.executeWithProtection('api.share_file', async () => {
          return this.graphClient.api(`/me/drive/items/${fileId}/invite`).post(permission)
        })
      }
    } catch (error) {
      this.logError('shareFile', error as Error)
      throw new Error(`Failed to share file: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
  async createShareLink(
    fileId: string,
    type: 'view' | 'edit' | 'embed' = 'view'
    scope: 'anonymous' | 'organization' = 'organization'
  ): Promise<{ url: string; id: string }> {
    try {
      const linkData = {
        type,
        scope
      }

      const _response = await this.executeWithProtection('api.create_share_link', async () => {
        return this.graphClient.api(`/me/drive/items/${fileId}/createLink`).post(linkData)
      })

      return {
        url: response.link.webUrl,
        id: response.id
      }
    } catch (error) {
      this.logError('createShareLink', error as Error)
      throw new Error(`Failed to create share link: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
  async getFilePermissions(fileId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_file_permissions', async () => {
        return this.graphClient.api(`/me/drive/items/${fileId}/permissions`).get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getFilePermissions', error as Error)
      throw new Error(`Failed to get file permissions: ${(error as Error).message}`)
    }

  async searchFiles(query: string, top = 50): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.search_files', async () => {
        return this.graphClient.api('/me/drive/search').query({ q: query }).top(top).get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('searchFiles', error as Error)
      throw new Error(`Failed to search files: ${(error as Error).message}`)
    }

  async getFileVersions(fileId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_file_versions', async () => {
        return this.graphClient.api(`/me/drive/items/${fileId}/versions`).get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getFileVersions', error as Error)
      throw new Error(`Failed to get file versions: ${(error as Error).message}`)
    }

  async restoreFileVersion(fileId: string, versionId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.restore_file_version', async () => {
        return this.graphClient
          .api(`/me/drive/items/${fileId}/versions/${versionId}/restoreVersion`)
          .post({})
      })
    } catch (error) {
      this.logError('restoreFileVersion', error as Error)
      throw new Error(`Failed to restore file version: ${(error as Error).message}`)
    }

  async getFileThumbnail(
    fileId: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): Promise<Buffer> {
    try {
      const _response = await this.executeWithProtection('api.get_file_thumbnail', async () => {
        return this.graphClient.api(`/me/drive/items/${fileId}/thumbnails/0/${size}/content`).get()
      })

      return Buffer.from(response)
    } catch (error) {
      this.logError('getFileThumbnail', error as Error)
      throw new Error(`Failed to get file thumbnail: ${(error as Error).message}`)
    }

  async getRecentFiles(top = 20): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_recent_files', async () => {
        return this.graphClient.api('/me/drive/recent').top(top).get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getRecentFiles', error as Error)
      throw new Error(`Failed to get recent files: ${(error as Error).message}`)
    }

  async getSharedFiles(top = 50): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_shared_files', async () => {
        return this.graphClient.api('/me/drive/sharedWithMe').top(top).get()
      })
  }

      return (response as Response).value || []
    } catch (error) {
      this.logError('getSharedFiles', error as Error)
      throw new Error(`Failed to get shared files: ${(error as Error).message}`)
    }

  async getDriveInfo(): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_drive_info', async () => {
        return this.graphClient.api('/me/drive').get()
      })
  }

      return response
    } catch (error) {
      this.logError('getDriveInfo', error as Error)
      throw new Error(`Failed to get drive info: ${(error as Error).message}`)
    }

  async getStorageQuota(): Promise<{
    total: number,
    used: number
    remaining: number,
    deleted: number
  }> {
    try {
      const driveInfo = await this.getDriveInfo()
      const quota = driveInfo.quota
  }

      return {
        total: quota.total || 0,
        used: quota.used || 0
        remaining: quota.remaining || 0,
        deleted: quota.deleted || 0
      }
    } catch (error) {
      this.logError('getStorageQuota', error as Error)
      throw new Error(`Failed to get storage quota: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-onedrive.integration.ts:', error)
      throw error
    }
}