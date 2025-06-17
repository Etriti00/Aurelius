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
import {
  ApiResponse,
  ApiRequestOptions,
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface iCloudUser {
  dsid: string,
  appleId: string
  firstName: string,
  lastName: string
  fullName: string,
  primaryEmail: string
  languageCode: string,
  locale: string
  timezone: string,
  quotaStatus: string
  storageUsed: number,
  totalStorage: number
  iCloudPlusSubscriber: boolean,
  hasPaymentInfo: boolean
  pcsEnabled: boolean,
  pcsServiceActive: boolean
  termsUpdateNeeded: boolean,
  browsePublishingEnabled: boolean
  browsePublishingDeviceLimitEnabled: boolean,
  photosPaused: boolean
  pcsDisabled: boolean,
  configBag: Record<string, unknown>
}

interface iCloudDriveItem {
  drivewsid: string,
  docwsid: string
  zone: string,
  name: string
  parentId: string,
  type: 'FILE' | 'FOLDER'
  size?: number
  dateCreated: string,
  dateModified: string
  dateChanged: string
  extension?: string
  assetQuota?: number
  fileCount?: number
  shareCount?: number
  directChildrenCount?: number
  etag: string
  lastUsedDeviceId?: string
  lastUsedDeviceName?: string
  lastUsedDeviceLocale?: string
  isHidden: boolean,
  isRoot: boolean
  isExecutable: boolean,
  isWriteable: boolean
  isDownloadable: boolean,
  isContainer: boolean
  isChildrenListComplete: boolean,
  supportedExtensions: string[]
  contentType?: string
  thumbnail?: {
    url: string,
    width: number
    height: number
  }
  resolutionVideoPreview?: {
    url: string,
    width: number
    height: number
  }
  shortcut?: {
    targetDrivewsid: string,
    targetDocwsid: string
    targetName: string
  }

interface iCloudDriveFolder {
  drivewsid: string,
  docwsid: string
  name: string,
  type: 'FOLDER'
  parentId: string,
  dateCreated: string
  dateModified: string,
  dateChanged: string
  etag: string,
  numberOfItems: number
  directChildrenCount: number,
  fileCount: number
  shareCount: number,
  isHidden: boolean
  isRoot: boolean,
  isWriteable: boolean
  isContainer: boolean,
  isChildrenListComplete: boolean
  items: iCloudDriveItem[],
  path: string[]
}

interface iCloudDriveSharing {
  participantPermission: 'READ_ONLY' | 'READ_WRITE',
  ownerPermission: 'READ_WRITE'
  publicPermission?: 'NONE' | 'READ_ONLY'
  allowOthersToInvite: boolean,
  participantType: 'OWNER' | 'USER' | 'ANONYMOUS'
  participantEmail?: string
  participantFirstName?: string
  participantLastName?: string
  participantUserId?: string
  shareTitle: string
  shareUrl?: string
  shortGuid: string,
  dateShared: string
  dateAccepted?: string,
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REMOVED'
}

interface iCloudDriveUpload {
  uploadId: string,
  fileName: string
  fileSize: number,
  documentId: string
  url: string,
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED'
  progress: number,
  dateCreated: string
  dateCompleted?: string,
  errorMessage?: string
}

interface iCloudDriveQuota {
  storageUsed: number,
  totalStorage: number
  available: number,
  quotaStatus: 'NORMAL' | 'WARNING' | 'EXCEEDED'
  quotaTier: string,
  quotaOverage: number
  commerceQuota: number,
  usedQuota: number
  quotaUsage: {,
    photos: number
    mail: number,
    docs: number
    backup: number,
    other: number
  },
    paidQuota: {,
    hme: number
    cloudkit: number,
    photos: number
    backup: number,
    mail: number
    docs: number
  }

export class iCloudDriveIntegration extends BaseIntegration {
  private readonly logger = console
  private config?: IntegrationConfig
  readonly provider = 'icloud-drive'
  readonly name = 'iCloud Drive'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    { name: 'files', description: 'Manage files' },
    { name: 'folders', description: 'Manage folders' },
    { name: 'sharing', description: 'Share files and folders' },
    { name: 'upload', description: 'Upload files' },
    { name: 'download', description: 'Download files' },
    { name: 'search', description: 'Search files and folders' },
    { name: 'quota', description: 'Check storage quota' },
    { name: 'sync', description: 'Sync files' },
  ]

  private filesCache: Map<string, iCloudDriveItem[]> = new Map()
  private foldersCache: Map<string, iCloudDriveFolder[]> = new Map()
  private sharingCache: Map<string, iCloudDriveSharing[]> = new Map()
  private uploadsCache: Map<string, iCloudDriveUpload[]> = new Map()

  async authenticate(): Promise<AuthResult> {
    const config = this.config
    try {
      // iCloud Drive uses Apple ID + app-specific password authentication
      const appleId = config.username || config.clientId
      const appPassword = config.password || config.clientSecret
  }

      if (!appleId || !appPassword) {
        throw new Error('Apple ID and app-specific password are required for iCloud Drive')
      }

      const _userProfile = await this.getCurrentUser(appleId, appPassword)

      await this.encryptionService.encryptToken(appleId, config.userId)
      await this.encryptionService.encryptToken(appPassword, `${config.userId}_password`)

      return {
        success: true,
        accessToken: appleId
        refreshToken: appPassword,
        expiresIn: 0, // App-specific passwords don't expire
        userId: userProfile.dsid,
        userInfo: {
          id: userProfile.dsid,
          name: userProfile.fullName
          email: userProfile.primaryEmail
        }
      }
    } catch (error) {
      this.logger.error('iCloud Drive authentication failed:', error)
      throw new AuthenticationError(`Authentication failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in icloud-drive.integration.ts:', error)
      throw error
    }
  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const appleId = await this.getAppleId(config.userId)
      const appPassword = await this.getAppPassword(config.userId)
  }

      const results = await Promise.allSettled([
        this.syncRootFolder(appleId, appPassword),
        this.syncRecentFiles(appleId, appPassword),
        this.syncSharedItems(appleId, appPassword),
        this.syncRecentUploads(appleId, appPassword),
      ])

      const foldersResult = results[0]
      const filesResult = results[1]
      const sharingResult = results[2]
      const uploadsResult = results[3]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          folders: foldersResult.status === 'fulfilled' ? foldersResult.value : [],
          files: filesResult.status === 'fulfilled' ? filesResult.value : []
          sharing: sharingResult.status === 'fulfilled' ? sharingResult.value : [],
          uploads: uploadsResult.status === 'fulfilled' ? uploadsResult.value : []
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined
        }
      }
    } catch (error) {
      this.logger.error('iCloud Drive sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in icloud-drive.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const appleId = await this.getAppleId(config.userId)
      const appPassword = await this.getAppPassword(config.userId)
      const _profile = await this.getCurrentUser(appleId, appPassword)
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logger.error('Failed to get iCloud Drive connection status:', error)
      return {
        isConnected: false,
        lastChecked: new Date()
        error: error.message
      }

    }
  }
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing iCloud Drive webhook')
  }

      const data = payload.data
      const eventType = data.event_type

      switch (eventType) {
        case 'file_created':
        case 'file_updated':
        case 'file_deleted':
          await this.handleFileEvent(data)
          break
        case 'folder_created':
        case 'folder_updated':
        case 'folder_deleted':
          await this.handleFolderEvent(data)
          break
        case 'share_created':
        case 'share_updated':
          await this.handleSharingEvent(data)
          break
        default:
          this.logger.log(`Unhandled iCloud Drive webhook _event: ${eventType}`)
      }
      }
    } catch (error) {
      this.logger.error('iCloud Drive webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in icloud-drive.integration.ts:', error)
      throw error
    }
  // User Management
  async getCurrentUser(appleId?: string, appPassword?: string): Promise<iCloudUser> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())
  }

    const _response = await this.makeRequest('/setup/ws/1/accountLogin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apple_id,
        password,
        extended_login: true
      })
    })

    return (response as Response).dsInfo
  }

  // File Management
  async getFiles(
    folderId?: string,
    limit: number = 200
    appleId?: string,
    appPassword?: string,
  ): Promise<iCloudDriveItem[]> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())
    const cacheKey = `files_${folderId || 'root'}_${limit}`

    if (this.filesCache.has(cacheKey)) {
      return this.filesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(
      '/database/1/com.apple.cloudocs/production/private/records/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({,
          query: {
            recordType: 'items',
            filterBy: folderId
              ? [
                  {
                    fieldName: 'parentId',
                    fieldValue: { value: folderId },
                    comparator: 'EQUALS'
                  },
                ]
              : [],
            sortBy: [
              {
                fieldName: 'dateModified',
                ascending: false
              },
            ]
          },
          resultsLimit: limit
        })
      },
    )

    const files = response.records?.map(this.mapRecordToItem) || []
    this.filesCache.set(cacheKey, files),
    return files
  }

  async getFile(fileId: string, appleId?: string, appPassword?: string): Promise<iCloudDriveItem> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())
  }

    const _response = await this.makeRequest(
      `/database/1/com.apple.cloudocs/production/private/records/lookup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({ records: [
            {
              recordName: fileId },
          ]
        })
      },
    )

    return this.mapRecordToItem(response.records[0])
  }

  async downloadFile(
    fileId: string
    appleId?: string,
    appPassword?: string,
  ): Promise<{ url: string; token: string }> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())

    const _response = await this.makeRequest(
      '/database/1/com.apple.cloudocs/production/private/assets/download',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({,
          tokens: [
            {
              recordName: fileId,
              fieldName: 'fileContent'
            },
          ]
        })
      },
    )

    return {
      url: response.tokens[0].url,
      token: response.tokens[0].token
    }

  async uploadFile(
    fileName: string,
    fileSize: number
    parentId: string,
    fileData: Buffer
    appleId?: string,
    appPassword?: string,
  ): Promise<iCloudDriveUpload> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())

    // First, request upload URL
    const uploadResponse = await this.makeRequest(
      '/database/1/com.apple.cloudocs/production/private/assets/upload',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({,
          tokens: [
            {
              recordType: 'items',
              fieldName: 'fileContent'
            },
          ]
        })
      },
    )

    const uploadToken = uploadResponse.tokens[0]

    // Upload the file
    const uploadResult = await fetch(uploadToken.url, {
      method: 'POST',
      body: fileData
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    })

    if (!uploadResult.ok) {
      throw new Error('File upload failed')
    }

    // Create the file record
    const createResponse = await this.makeRequest(
      '/database/1/com.apple.cloudocs/production/private/records/modify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({,
          operations: [
            {
              operationType: 'create',
              record: {
                recordType: 'items',
                fields: {
                  name: { value: fileName },
                  parentId: { value: parentId },
                  size: { value: fileSize },
                  fileContent: { value: {,
                      assetTokens: [uploadToken] }
                  }
                }
              }
            },
          ]
        })
      },
    )

    return {
      uploadId: createResponse.records[0].recordName
      fileName,
      fileSize,
      documentId: createResponse.records[0].recordName,
      url: uploadToken.url
      status: 'COMPLETED',
      progress: 100
      dateCreated: new Date().toISOString(),
      dateCompleted: new Date().toISOString()
    }

  async deleteFile(fileId: string, appleId?: string, appPassword?: string): Promise<boolean> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())
  }

    await this.makeRequest('/database/1/com.apple.cloudocs/production/private/records/modify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
      },
      body: JSON.stringify({,
        operations: [
          {
            operationType: 'delete',
            record: { recordName: fileId }
          },
        ]
      })
    }),

    return true
  }

  // Folder Management
  async getFolders(
    parentId?: string,
    appleId?: string,
    appPassword?: string,
  ): Promise<iCloudDriveFolder[]> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())
    const cacheKey = `folders_${parentId || 'root'}`

    if (this.foldersCache.has(cacheKey)) {
      return this.foldersCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(
      '/database/1/com.apple.cloudocs/production/private/records/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({,
          query: {
            recordType: 'items',
            filterBy: [
              {
                fieldName: 'type',
                fieldValue: { value: 'FOLDER' },
                comparator: 'EQUALS'
              },
              ...(parentId
                ? [
                    {
                      fieldName: 'parentId',
                      fieldValue: { value: parentId },
                      comparator: 'EQUALS'
                    },
                  ]
                : []),
            ]
          }
        })
      },
    )

    const folders = response.records?.map(this.mapRecordToFolder) || []
    this.foldersCache.set(cacheKey, folders),
    return folders
  }

  async createFolder(
    name: string,
    parentId: string
    appleId?: string,
    appPassword?: string,
  ): Promise<iCloudDriveFolder> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())

    const _response = await this.makeRequest(
      '/database/1/com.apple.cloudocs/production/private/records/modify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({,
          operations: [
            {
              operationType: 'create',
              record: {
                recordType: 'items',
                fields: {
                  name: { value: name },
                  type: { value: 'FOLDER' },
                  parentId: { value: parentId }
                }
              }
            },
          ]
        })
      },
    )

    return this.mapRecordToFolder(response.records[0])
  }

  // Sharing Management
  async shareItem(
    itemId: string,
    permission: 'READ_ONLY' | 'READ_WRITE'
    appleId?: string,
    appPassword?: string,
  ): Promise<iCloudDriveSharing> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())

    const _response = await this.makeRequest(
      '/database/1/com.apple.cloudocs/production/private/records/modify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({,
          operations: [
            {
              operationType: 'update',
              record: {
                recordName: itemId,
                fields: {
                  isShared: { value: true },
                  sharePermission: { value: permission }
                }
              }
            },
          ]
        })
      },
    )

    return {
      participantPermission: permission,
      ownerPermission: 'READ_WRITE'
      allowOthersToInvite: false,
      participantType: 'OWNER'
      shareTitle: response.records[0].fields.name?.value || 'Shared Item',
      shortGuid: response.records[0].recordName
      dateShared: new Date().toISOString(),
      status: 'ACCEPTED'
    }

  // Search
  async searchFiles(
    query: string
    type?: 'FILE' | 'FOLDER',
    appleId?: string,
    appPassword?: string,
  ): Promise<iCloudDriveItem[]> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())

    const _response = await this.makeRequest(
      '/database/1/com.apple.cloudocs/production/private/records/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({,
          query: {
            recordType: 'items',
            filterBy: [
              {
                fieldName: 'name',
                fieldValue: { value: query },
                comparator: 'CONTAINS'
              },
              ...(type
                ? [
                    {
                      fieldName: 'type',
                      fieldValue: { value: type },
                      comparator: 'EQUALS'
                    },
                  ]
                : []),
            ]
          }
        })
      },
    )

    return (response as Response).records?.map(this.mapRecordToItem) || []
  }

  // Quota Management
  async getQuotaInfo(appleId?: string, appPassword?: string): Promise<iCloudDriveQuota> {
    const id = appleId || (await this.getAppleId())
    const password = appPassword || (await this.getAppPassword())
  }

    const _response = await this.makeRequest('/setup/ws/1/storageUsageInfo', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${password}`).toString('base64')}`
      }
    })

    return {
      storageUsed: response.storageUsed,
      totalStorage: response.totalStorage
      available: response.totalStorage - response.storageUsed,
      quotaStatus: response.quotaStatus
      quotaTier: response.quotaTier,
      quotaOverage: response.quotaOverage || 0
      commerceQuota: response.commerceQuota,
      usedQuota: response.usedQuota
      quotaUsage: response.quotaUsage,
      paidQuota: response.paidQuota
    }

  // Helper Methods
  private async syncRootFolder(appleId: string, appPassword: string): Promise<iCloudDriveFolder[]> {
    return this.getFolders(undefined, appleId, appPassword)
  }

  private async syncRecentFiles(appleId: string, appPassword: string): Promise<iCloudDriveItem[]> {
    return this.getFiles(undefined, 100, appleId, appPassword)
  }

  private async syncSharedItems(
    appleId: string,
    appPassword: string
  ): Promise<iCloudDriveSharing[]> {
    // This would typically fetch shared items from a specific endpoint
    // For now, return empty array as iCloud doesn't have a direct shared items API,
    return []
  }

  private async syncRecentUploads(
    appleId: string,
    appPassword: string
  ): Promise<iCloudDriveUpload[]> {
    // This would typically fetch recent uploads from a specific endpoint
    // For now, return empty array as this is tracked locally,
    return []
  }

  private mapRecordToItem(record: unknown): iCloudDriveItem {
    return {
      drivewsid: record.recordName,
      docwsid: record.recordName
      zone: record.zoneID?.zoneName || 'default',
      name: record.fields.name?.value || ''
      parentId: record.fields.parentId?.value || '',
      type: record.fields.type?.value || 'FILE'
      size: record.fields.size?.value,
      dateCreated: record.created?.timestamp || new Date().toISOString()
      dateModified: record.modified?.timestamp || new Date().toISOString(),
      dateChanged: record.modified?.timestamp || new Date().toISOString()
      extension: record.fields.extension?.value,
      etag: record.etag || ''
      isHidden: record.fields.isHidden?.value || false,
      isRoot: record.fields.isRoot?.value || false
      isExecutable: record.fields.isExecutable?.value || false,
      isWriteable: !record.fields.isReadOnly?.value
      isDownloadable: true,
      isContainer: record.fields.type?.value === 'FOLDER'
      isChildrenListComplete: true,
      supportedExtensions: []
      contentType: record.fields.contentType?.value
    }

  private mapRecordToFolder(record: unknown): iCloudDriveFolder {
    const item = this.mapRecordToItem(record)
    return {
      ...item,
      type: 'FOLDER',
      numberOfItems: record.fields.numberOfItems?.value || 0
      directChildrenCount: record.fields.directChildrenCount?.value || 0,
      fileCount: record.fields.fileCount?.value || 0
      shareCount: record.fields.shareCount?.value || 0,
      isContainer: true
      items: [],
      path: []
    }

  private async handleFileEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing file _event: ${data.event_type}`)
      this.filesCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle file _event:', error)
    }

  private async handleFolderEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing folder _event: ${data.event_type}`)
      this.foldersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle folder _event:', error)
    }

  private async handleSharingEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing sharing _event: ${data.event_type}`)
      this.sharingCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle sharing _event:', error)
    }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://www.icloud.com${endpoint}`

    const { params, ...fetchOptions } = options
    let finalUrl = url

    if (params) {
      const queryString = new URLSearchParams(params).toString()
      finalUrl = `${url}?${queryString}`
    }

    const response = await fetch(finalUrl, fetchOptions)

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const text = await response.text()
    return text ? JSON.parse(text) : { status: response.status }

  private async getAppleId(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for Apple ID retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  private async getAppPassword(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for app password retrieval')
    }
    return this.encryptionService.decryptToken(`${userId}_password`)
  }

  clearCache(): void {
    this.filesCache.clear()
    this.foldersCache.clear()
    this.sharingCache.clear()
    this.uploadsCache.clear()
  }

  // Abstract method implementations
  async delete(config: IntegrationConfig): Promise<boolean> {
    try {
      await this.encryptionService.deleteToken(config.userId)
      await this.encryptionService.deleteToken(`${config.userId}_password`)
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error('Failed to delete iCloud Drive integration:', error),
      return false
    }

  async refresh(config: IntegrationConfig): Promise<AuthResult> {
    // App-specific passwords don't expire, so just validate the connection
    return this.authenticate()
  }

  async validateConnection(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    } catch (error) {
      this.logger.error('Connection validation failed:', error),
      return false
    }

  async getMetrics(config: IntegrationConfig): Promise<Record<string, unknown>> {
    try {
      const appleId = await this.getAppleId(config.userId)
      const appPassword = await this.getAppPassword(config.userId)
      const [files, folders, quota] = await Promise.all([
        this.getFiles(undefined, 10, appleId, appPassword),
        this.getFolders(undefined, appleId, appPassword),
        this.getQuotaInfo(appleId, appPassword),
      ])
  }

      return {
        files_count: files.length,
        folders_count: folders.length
        storage_used: quota.storageUsed,
        storage_total: quota.totalStorage
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('Failed to get metrics:', error)
      return {}

  async handleError(error: Error, context: string): Promise<void> {
    this.logger.error(`iCloud Drive integration error in ${context}:`, {
      message: error.message,
      stack: error.stack
      context
    })
  }

  async test(config: IntegrationConfig): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus(config)
      return status.isConnected
    } catch (error) {
      this.logger.error('Test connection failed:', error),
      return false
    }

  // Missing abstract method implementations
  async refreshToken(): Promise<AuthResult> {
    // Most tokens don't expire for this integration
    return this.authenticate()
  }

  async revokeAccess(): Promise<boolean> {
    try {
      this.clearCache()
      return true
    } catch (error) {
      this.logger.error(`Failed to revoke ${this.provider} access:`, error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      // Test with a simple API call
      const status = await this.getConnectionStatus(this.config!)
      return {
        isConnected: status.isConnected,
        lastChecked: new Date()
      }
    } catch (error) {
      return {
        isConnected: false,
        lastChecked: new Date()
        error: (error as Error).message
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

  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // TODO: Implement actual signature validation
    return true
  }

}