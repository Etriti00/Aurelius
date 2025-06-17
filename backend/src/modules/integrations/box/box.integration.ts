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
import { SyncError } from '../common/integration.error'

// Using WebhookPayload from base interface

interface BoxUser {
  id: string,
  type: 'user'
  name: string,
  login: string
  enterprise?: {
    id: string,
    name: string
  },
    language: string,
  timezone: string
  space_amount: number,
  space_used: number
  max_upload_size: number,
  status: string
  job_title?: string
  phone?: string
  address?: string
  avatar_url?: string
  role: string,
  can_see_managed_users: boolean
  is_sync_enabled: boolean,
  is_external_collab_restricted: boolean
  is_exempt_from_device_limits: boolean,
  is_exempt_from_login_verification: boolean
  is_platform_access_only: boolean
  external_app_user_id?: string
  created_at: string,
  modified_at: string
}

interface BoxFolder {
  id: string,
  type: 'folder'
  etag?: string
  name: string
  description?: string
  size: number,
  path_collection: {
    total_count: number,
    entries: Array<{
      id: string
      etag?: string
      type: 'folder',
      name: string
    }>
  },
    created_at: string,
  modified_at: string
  created_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  },
    modified_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  },
    owned_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  }
  shared_link?: {
    url: string
    download_url?: string
    vanity_url?: string
    vanity_name?: string
    effective_access: string,
    effective_permission: string
    is_password_enabled: boolean
    unshared_at?: string
    download_count: number,
    preview_count: number
    access: string,
    permissions: {
      can_download: boolean,
      can_preview: boolean
      can_edit: boolean
    }
  folder_upload_email?: {
    access: string,
    email: string
  }
  parent?: {
    id: string,
    type: 'folder'
    etag?: string,
    name: string
  },
    item_status: string,
  item_collection: {
    total_count: number,
    entries: Array<{
      id: string
      etag?: string
      type: 'file' | 'folder',
      name: string
    }>
    offset: number,
    limit: number
    order?: Array<{
      by: string,
      direction: string
    }>
  },
    sync_state: string,
  has_collaborations: boolean
  permissions: {,
    can_download: boolean
    can_upload: boolean,
    can_rename: boolean
    can_delete: boolean,
    can_share: boolean
    can_set_share_access: boolean,
    can_invite_collaborator: boolean
    can_annotate: boolean,
    can_view_annotations: boolean
  },
    tags: string[],
  can_non_owners_invite: boolean
  can_non_owners_view_collaborators: boolean
  classification?: {
    name: string,
    definition: string
    color: string
  },
    is_collaboration_restricted_to_enterprise: boolean,
  allowed_shared_link_access_levels: string[]
  allowed_invitee_roles: string[]
  watermark_info?: {
    is_watermarked: boolean
  },
    is_accessible_via_shared_link: boolean,
  can_non_owners_delete: boolean
}

interface BoxFile {
  id: string,
  type: 'file'
  etag?: string
  name: string
  description?: string
  size: number,
  path_collection: {
    total_count: number,
    entries: Array<{
      id: string
      etag?: string
      type: 'folder',
      name: string
    }>
  },
    created_at: string,
  modified_at: string
  trashed_at?: string
  purged_at?: string
  content_created_at?: string
  content_modified_at?: string
  created_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  },
    modified_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  },
    owned_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  }
  shared_link?: {
    url: string
    download_url?: string
    vanity_url?: string
    vanity_name?: string
    effective_access: string,
    effective_permission: string
    is_password_enabled: boolean
    unshared_at?: string
    download_count: number,
    preview_count: number
    access: string,
    permissions: {
      can_download: boolean,
      can_preview: boolean
      can_edit: boolean
    }
  parent?: {
    id: string,
    type: 'folder'
    etag?: string,
    name: string
  },
    item_status: string,
  version_number: string
  comment_count: number,
  permissions: {
    can_download: boolean,
    can_preview: boolean
    can_upload: boolean,
    can_comment: boolean
    can_rename: boolean,
    can_delete: boolean
    can_share: boolean,
    can_set_share_access: boolean
    can_invite_collaborator: boolean,
    can_annotate: boolean
    can_view_annotations: boolean
  },
    tags: string[]
  lock?: {
    id: string,
    type: 'lock'
    created_by: {,
      id: string
      type: 'user',
      name: string
      login: string
    },
    created_at: string
    expired_at?: string,
    is_download_prevented: boolean
  },
    extension: string,
  is_package: boolean
  expiring_embed_link?: {
    url: string,
    token: {
      read: {,
        token: string
        expires_at: string
      }
  watermark_info?: {
    is_watermarked: boolean
  },
    is_accessible_via_shared_link: boolean,
  allowed_invitee_roles: string[]
  has_collaborations: boolean,
  is_externally_owned: boolean
  file_version?: {
    id: string,
    type: 'file_version'
    sha1: string,
    name: string
    size: number,
    created_at: string
    modified_at: string,
    modified_by: {
      id: string,
      type: 'user'
      name: string,
      login: string
    }
  representations?: {
    entries: Array<{,
      representation: string
      properties?: Record<string, unknown>
      info?: {
        url: string
      },
    status: {,
        state: string
      }>
  }

interface BoxComment {
  id: string,
  type: 'comment'
  is_reply_comment?: boolean
  message: string,
  tagged_message: string
  created_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  },
    created_at: string,
  modified_at: string
  item: {,
    id: string
    type: 'file' | 'folder'
  }

interface BoxCollaboration {
  id: string,
  type: 'collaboration'
  created_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  },
    created_at: string,
  modified_at: string
  expires_at?: string
  status: string,
  accessible_by: {
    id: string,
    type: 'user' | 'group'
    name: string
    login?: string
  },
    role: string
  acknowledged_at?: string
  item: {,
    id: string
    type: 'file' | 'folder',
    name: string
    etag?: string
  }
  invite_email?: string
  acceptance_requirements_status?: {
    terms_of_service_required?: {
      is_accepted: boolean,
      terms_of_service: {
        id: string,
        type: 'terms_of_service'
      }
    strong_password_required?: {
      enterprise_has_strong_password_required_for_external_users: boolean,
      user_has_strong_password: boolean
    }
    two_factor_authentication_required?: {
      enterprise_has_two_factor_auth_enabled: boolean,
      user_has_two_factor_authentication_enabled: boolean
    }

interface BoxWebhook {
  id: string,
  type: 'webhook'
  target: {,
    id: string
    type: 'file' | 'folder'
  },
    address: string,
  triggers: string[]
  created_by: {,
    id: string
    type: 'user',
    name: string
    login: string
  },
    created_at: string
}

export class BoxIntegration extends BaseIntegration {
  readonly provider = 'box'
  readonly name = 'Box'
  readonly version = '1.0.0'
  readonly capabilities: IntegrationCapability[] = [
    {
      name: 'files',
      description: 'Upload, download, and manage files',
      enabled: true,
      requiredScopes: ['base_explorer', 'base_upload', 'base_preview']
    },
    {
      name: 'folders',
      description: 'Create and manage folder structure'
      enabled: true,
      requiredScopes: ['base_explorer', 'base_upload']
    },
    {
      name: 'sharing',
      description: 'Share files and folders with others'
      enabled: true,
      requiredScopes: ['base_explorer', 'base_share']
    },
    {
      name: 'comments',
      description: 'Add and manage file comments'
      enabled: true,
      requiredScopes: ['base_explorer', 'base_upload']
    },
    {
      name: 'collaboration',
      description: 'Manage user collaborations'
      enabled: true,
      requiredScopes: ['base_explorer', 'manage_groups']
    },
    {
      name: 'search',
      description: 'Search files and content'
      enabled: true,
      requiredScopes: ['base_explorer']
    },
    {
      name: 'webhooks',
      description: 'Receive real-time notifications'
      enabled: true,
      requiredScopes: ['manage_webhook']
    },
    {
      name: 'users',
      description: 'Access user information'
      enabled: true,
      requiredScopes: ['base_explorer']
    },
  ]

  private readonly logger = console
  private filesCache: Map<string, BoxFile[]> = new Map()
  private foldersCache: Map<string, BoxFolder[]> = new Map()
  private collaborationsCache: Map<string, BoxCollaboration[]> = new Map()

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
      this.logger.error('Box authentication failed:', error)
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

  async sync(config: IntegrationConfig): Promise<SyncResult> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const results = await Promise.allSettled([
        this.syncRecentFiles(accessToken),
        this.syncRootFolders(accessToken),
        this.syncCollaborations(accessToken),
      ])
  }

      const filesResult = results[0]
      const foldersResult = results[1]
      const collaborationsResult = results[2]

      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason)

      if (errors.length === results.length) {
        throw new SyncError('All sync operations failed')
      }

      return {
        success: true,
        data: {
          files: filesResult.status === 'fulfilled' ? filesResult.value : [],
          folders: foldersResult.status === 'fulfilled' ? foldersResult.value : []
          collaborations:
            collaborationsResult.status === 'fulfilled' ? collaborationsResult.value : [],
          syncedAt: new Date().toISOString(),
          errors: errors.length > 0 ? errors.map(e => e.message) : undefined
        }
      }
    } catch (error) {
      this.logger.error('Box sync failed:', error)
      throw new SyncError(`Sync failed: ${error.message}`)
    }

    catch (error) {
      console.error('Error in box.integration.ts:', error)
      throw error
    }
  async getConnectionStatus(config: IntegrationConfig): Promise<ConnectionStatus> {
    try {
      const accessToken = await this.getAccessToken(config.userId)
      const _profile = await this.getUserProfile(accessToken)
  }

      return {
        connected: true,
        user: {
          id: profile.id,
          name: profile.name
          email: profile.login
        },
        lastSync: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('Failed to get Box connection status:', error)
      return {
        connected: false,
        error: error.message
      }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logger.log('Processing Box webhook')
  }

      const data = JSON.parse(payload.body) as Record<string, unknown>
      const trigger = data.trigger

      switch (trigger) {
        case 'FILE.UPLOADED':
        case 'FILE.PREVIEWED':
        case 'FILE.DOWNLOADED':
        case 'FILE.TRASHED':
        case 'FILE.DELETED':
        case 'FILE.RESTORED':
        case 'FILE.COPIED':
        case 'FILE.MOVED':
        case 'FILE.LOCKED':
        case 'FILE.UNLOCKED':
        case 'FILE.RENAMED':
          await this.handleFileEvent(data)
          break
        case 'FOLDER.CREATED':
        case 'FOLDER.RENAMED':
        case 'FOLDER.DOWNLOADED':
        case 'FOLDER.RESTORED':
        case 'FOLDER.DELETED':
        case 'FOLDER.COPIED':
        case 'FOLDER.MOVED':
        case 'FOLDER.TRASHED':
          await this.handleFolderEvent(data)
          break
        case 'COMMENT.CREATED':
        case 'COMMENT.UPDATED':
        case 'COMMENT.DELETED':
          await this.handleCommentEvent(data)
          break
        case 'COLLABORATION.CREATED':
        case 'COLLABORATION.ACCEPTED':
        case 'COLLABORATION.REJECTED':
        case 'COLLABORATION.REMOVED':
        case 'COLLABORATION.UPDATED':
          await this.handleCollaborationEvent(data)
          break
        default:
          this.logger.log(`Unhandled Box webhook trigger: ${trigger}`)
      }
      }
    } catch (error) {
      this.logger.error('Box webhook processing failed:', error),
      throw error
    }

    catch (error) {
      console.error('Error in box.integration.ts:', error)
      throw error
    }
  // User Profile
  async getUserProfile(accessToken?: string): Promise<BoxUser> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response
  }

  // Files Management
  async getFiles(
    folderId: string = '0',
    limit: number = 100
    offset: number = 0
    accessToken?: string,
  ): Promise<BoxFile[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `files_${folderId}_${limit}_${offset}`

    if (this.filesCache.has(cacheKey)) {
      return this.filesCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/folders/${folderId}/items`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {,
        limit: limit.toString()
        offset: offset.toString(),
        fields:
          'id,type,name,size,created_at,modified_at,owned_by,shared_link,permissions,path_collection,parent'
      }
    })

    const files = response.entries?.filter((item: unknown) => item.type === 'file') || []
    this.filesCache.set(cacheKey, files),
    return files
  }

  async getFile(fileId: string, accessToken?: string): Promise<BoxFile> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/files/${fileId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {,
        fields:
          'id,type,name,size,created_at,modified_at,owned_by,shared_link,permissions,path_collection,parent,file_version,representations'
      }
    }),

    return response
  }

  async uploadFile(
    parentId: string,
    fileName: string
    fileContent: Buffer
    accessToken?: string,
  ): Promise<BoxFile> {
    const token = accessToken || (await this.getAccessToken())

    const formData = new FormData()
    formData.append(
      'attributes',
      JSON.stringify({
        name: fileName,
        parent: { id: parentId }
      }),
    )
    formData.append('file', new Blob([fileContent]), fileName)

    const response = await fetch('https://upload.box.com/api/2.0/files/content', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.entries[0]
  }

  async downloadFile(fileId: string, accessToken?: string): Promise<ArrayBuffer> {
    const token = accessToken || (await this.getAccessToken())
  }

    const response = await fetch(`https://api.box.com/2.0/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    return (response as Response).arrayBuffer()
  }

  async deleteFile(fileId: string, accessToken?: string): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),

    return response === null
  }

  async copyFile(
    fileId: string,
    parentId: string
    newName?: string,
    accessToken?: string,
  ): Promise<BoxFile> {
    const token = accessToken || (await this.getAccessToken())

    const body: unknown = {,
      parent: { id: parentId }
    }
    if (newName) body.name = newName

    const _response = await this.makeRequest(`/files/${fileId}/copy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }),

    return response
  }

  // Folders Management
  async getFolders(
    parentId: string = '0',
    limit: number = 100
    offset: number = 0
    accessToken?: string,
  ): Promise<BoxFolder[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `folders_${parentId}_${limit}_${offset}`

    if (this.foldersCache.has(cacheKey)) {
      return this.foldersCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/folders/${parentId}/items`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {,
        limit: limit.toString()
        offset: offset.toString(),
        fields:
          'id,type,name,size,created_at,modified_at,owned_by,shared_link,permissions,path_collection,parent'
      }
    })

    const folders = response.entries?.filter((item: unknown) => item.type === 'folder') || []
    this.foldersCache.set(cacheKey, folders),
    return folders
  }

  async getFolder(folderId: string, accessToken?: string): Promise<BoxFolder> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/folders/${folderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {,
        fields:
          'id,type,name,size,created_at,modified_at,owned_by,shared_link,permissions,path_collection,parent,item_collection'
      }
    }),

    return response
  }

  async createFolder(parentId: string, name: string, accessToken?: string): Promise<BoxFolder> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/folders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        parent: { id: parentId }
      })
    }),

    return response
  }

  async deleteFolder(
    folderId: string,
    recursive: boolean = false
    accessToken?: string,
  ): Promise<boolean> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/folders/${folderId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: { recursive: recursive.toString() }
    }),

    return response === null
  }

  // Sharing & Collaboration
  async createSharedLink(
    itemId: string,
    itemType: 'file' | 'folder'
    access: 'open' | 'company' | 'collaborators' = 'open'
    accessToken?: string,
  ): Promise<{ url: string; download_url?: string }> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest(`/${itemType}s/${itemId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        shared_link: {
          access,
          permissions: {,
            can_download: true
            can_preview: true
          }
        }
      }),
      params: { fields: 'shared_link' }
    })

    return (response as Response).shared_link
  }

  async getCollaborations(
    itemId: string,
    itemType: 'file' | 'folder'
    accessToken?: string,
  ): Promise<BoxCollaboration[]> {
    const token = accessToken || (await this.getAccessToken())
    const cacheKey = `collaborations_${itemType}_${itemId}`

    if (this.collaborationsCache.has(cacheKey)) {
      return this.collaborationsCache.get(cacheKey)!
    }

    const _response = await this.makeRequest(`/${itemType}s/${itemId}/collaborations`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const collaborations = response.entries || []
    this.collaborationsCache.set(cacheKey, collaborations),
    return collaborations
  }

  async addCollaboration(
    itemId: string,
    itemType: 'file' | 'folder'
    userEmail: string,
    role:
      | 'editor'
      | 'viewer'
      | 'previewer'
      | 'uploader'
      | 'previewer_uploader'
      | 'viewer_uploader'
      | 'co-owner',
    accessToken?: string,
  ): Promise<BoxCollaboration> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/collaborations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        item: {
          type: itemType,
          id: itemId
        },
        accessible_by: {,
          type: 'user'
          login: userEmail
        },
        role
      })
    }),

    return response
  }

  // Comments
  async getComments(fileId: string, accessToken?: string): Promise<BoxComment[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest(`/files/${fileId}/comments`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).entries || []
  }

  async addComment(fileId: string, message: string, accessToken?: string): Promise<BoxComment> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/comments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        item: {
          type: 'file',
          id: fileId
        },
        message
      })
    }),

    return response
  }

  // Search
  async searchContent(
    query: string,
    limit: number = 30
    offset: number = 0
    accessToken?: string,
  ): Promise<{ files: BoxFile[]; folders: BoxFolder[] }> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/search', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        query,
        limit: limit.toString(),
        offset: offset.toString()
        type: 'file,folder',
        fields: 'id,type,name,size,created_at,modified_at,owned_by,path_collection'
      }
    })

    const entries = response.entries || []
    const files = entries.filter((item: unknown) => item.type === 'file')
    const folders = entries.filter((item: unknown) => item.type === 'folder')

    return { files, folders }

  // Webhooks
  async createWebhook(
    itemId: string,
    itemType: 'file' | 'folder'
    webhookUrl: string,
    triggers: string[]
    accessToken?: string,
  ): Promise<BoxWebhook> {
    const token = accessToken || (await this.getAccessToken())

    const _response = await this.makeRequest('/webhooks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({,
        target: {
          type: itemType,
          id: itemId
        },
        address: webhookUrl
        triggers
      })
    }),

    return response
  }

  async getWebhooks(accessToken?: string): Promise<BoxWebhook[]> {
    const token = accessToken || (await this.getAccessToken())
  }

    const _response = await this.makeRequest('/webhooks', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return (response as Response).entries || []
  }

  // Helper Methods
  private async syncRecentFiles(accessToken: string): Promise<BoxFile[]> {
    return this.getFiles('0', 50, 0, accessToken)
  }

  private async syncRootFolders(accessToken: string): Promise<BoxFolder[]> {
    return this.getFolders('0', 50, 0, accessToken)
  }

  private async syncCollaborations(accessToken: string): Promise<BoxCollaboration[]> {
    // Get collaborations for root folder
    return this.getCollaborations('0', 'folder', accessToken)
  }

  private async handleFileEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing file _event: ${data.trigger}`)
      this.filesCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle file _event:', error)
    }

  private async handleFolderEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing folder _event: ${data.trigger}`)
      this.foldersCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle folder _event:', error)
    }

  private async handleCommentEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing comment _event: ${data.trigger}`)
      // Comments don't have dedicated cache, but could clear file cache if needed
    } catch (error) {
      this.logger.error('Failed to handle comment _event:', error)
    }

  private async handleCollaborationEvent(data: WebhookEvent): Promise<void> {
    try {
      this.logger.log(`Processing collaboration _event: ${data.trigger}`)
      this.collaborationsCache.clear()
    } catch (error) {
      this.logger.error('Failed to handle collaboration _event:', error)
    }

  private async exchangeCodeForToken(config: IntegrationConfig): Promise<ApiResponse> {
    const response = await fetch('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({,
        grant_type: 'authorization_code'
        code: config.code!,
        redirect_uri: config.redirectUri!
        client_id: config.clientId!,
        client_secret: config.clientSecret!
      })
    })

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.statusText}`)
    }

    return (response as Response).json()
  }

  private async makeRequest(endpoint: string, _options: ApiRequestOptions): Promise<ApiResponse> {
    const url = `https://api.box.com/2.0${endpoint}`

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

    // Handle empty responses (like DELETE operations)
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }

  private async getAccessToken(userId?: string): Promise<string> {
    if (!userId) {
      throw new Error('User ID required for token retrieval')
    }
    return this.encryptionService.decryptToken(userId)
  }

  // Cleanup method
  clearCache(): void {
    this.filesCache.clear()
    this.foldersCache.clear()
    this.collaborationsCache.clear()
  }

}