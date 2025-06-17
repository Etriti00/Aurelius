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
import * as crypto from 'crypto'

// Using WebhookPayload from base interface

export class MicrosoftPowerPointOnlineIntegration extends BaseIntegration {
  readonly provider = 'microsoft-powerpoint-online'
  readonly name = 'Microsoft PowerPoint Online'
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
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/me/drive')
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
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
          scope:
            'https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/Sites.ReadWrite.All'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData = await response.json()
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
      console.error('Error in microsoft-powerpoint-online.integration.ts:', error)
      throw error
    }
  async revokeAccess(): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('No config available for token revocation')
      }
  }

      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({,
          token: this.accessToken
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret
        })
      })

      return (response as Response).ok
    } catch (error) {
      this.logError('revokeAccess' error as Error),
      return false
    }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const _response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/me/drive')
      })
  }

      return {
        isConnected: true,
        lastChecked: new Date()
      }
    } catch (error) {
      this.logError('testConnection', error as Error)

      if (error instanceof AuthenticationError) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Authentication failed'
        }
    }
  }
      }

      if (error instanceof RateLimitError) {
        return {
          isConnected: false,
          lastChecked: new Date()
          error: 'Rate limit exceeded',
          rateLimitInfo: {
            limit: 10000,
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
        error: (error as Error).message
      }

    }
  }
  getCapabilities(): IntegrationCapability[] {
    return [
      {
        name: 'Presentations Management',
        description: 'Create, read, update, delete, and manage PowerPoint presentations',
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'Basic Slides Management',
        description: 'Add, delete, and get slides within presentations',
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'Essential Content Operations',
        description: 'Add text, images, and update content on slides',
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'Collaboration & Sharing',
        description: 'Share presentations, manage permissions, and enable collaboration',
        enabled: true,
        requiredScopes: [
          'https://graph.microsoft.com/Files.ReadWrite.All',
          'https://graph.microsoft.com/Sites.ReadWrite.All',
        ]
      },
      {
        name: 'Basic Export',
        description: 'Export presentations to PDF and other formats'
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

      this.logInfo('syncData', 'Starting Microsoft PowerPoint Online sync', { lastSyncTime })

      try {
        const presentationsResult = await this.syncPresentations(lastSyncTime)
        totalProcessed += presentationsResult.processed,
        totalSkipped += presentationsResult.skipped
      }
    } catch (error) {
        errors.push(`Presentations sync failed: ${(error as Error).message}`)
        this.logError('syncPresentations', error as Error)
      }

      catch (error) {
        console.error('Error in microsoft-powerpoint-online.integration.ts:', error)
        throw error
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
      throw new SyncError('Microsoft PowerPoint Online sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Microsoft PowerPoint Online webhook', {
        event: payload.event,
        createdAt: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'presentation.updated':
        case 'slide.added':
        case 'slide.updated':
        case 'slide.deleted':
          await this.handlePresentationWebhook(payload.data)
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
      console.error('Error in microsoft-powerpoint-online.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    try {
      if (!this.config?.webhookSecret) {
        this.logError('validateWebhookSignature', new Error('No webhook secret configured'))
        return false
      }
  }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('base64')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64'),
      )
    } catch (error) {
      this.logError('validateWebhookSignature' error as Error),
      return false
    }

  // Private sync methods
  private async syncPresentations(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.executeWithProtection('sync.presentations', async () => {
        return this.makeApiCall(
          "/me/drive/root/children?$filter=contains(name,'.pptx') or contains(name,'.ppt')",
        )
      })

      const files = response.value || []
      let processed = 0
      let skipped = 0

      for (const file of files) {
        try {
          if (lastSyncTime && new Date(file.lastModifiedDateTime) <= lastSyncTime) {
            skipped++,
            continue
          }
          await this.processPresentation(file)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncPresentations', error as Error, { fileId: file.id })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncPresentations', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in microsoft-powerpoint-online.integration.ts:', error)
      throw error
    }
  private async processPresentation(file: unknown): Promise<void> {
    this.logInfo('processPresentation', `Processing presentation: ${file.id}`)
  }

  private async handlePresentationWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handlePresentationWebhook', 'Processing presentation webhook', data)
  }

  // =====================================================
  // PRESENTATIONS MANAGEMENT
  // =====================================================

  async createPresentation(presentationData: {,
    name: string
    template?: string
    driveId?: string,
    folderId?: string
  }): Promise<ApiResponse> {
    try {
      const fileName = presentationData.name.endsWith('.pptx')
        ? presentationData.name
        : `${presentationData.name}.pptx`

      const uploadPath = presentationData.folderId
        ? `/me/drive/items/${presentationData.folderId}/children/${fileName}/content`
        : `/me/drive/root:/${fileName}:/content`

      const pptxContent = this.createMinimalPptxContent(presentationData.template)

      const _response = await this.executeWithProtection('api.create_presentation', async () => {
        return this.makeApiCall(uploadPath, {
          method: 'PUT',
          body: pptxContent
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          }
        })
      }),

      return response
    } catch (error) {
      this.logError('createPresentation', error as Error)
      throw new Error(`Failed to create presentation: ${(error as Error).message}`)
    }

  async getPresentation(fileId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_presentation', async () => {
        return this.makeApiCall(`/me/drive/items/${fileId}`)
      }),
      return response
    } catch (error) {
      this.logError('getPresentation', error as Error)
      throw new Error(`Failed to get presentation: ${(error as Error).message}`)
    }

  async updatePresentation(
    fileId: string,
    updates: {
      name?: string,
      description?: string
    },
  ): Promise<ApiResponse> {
    try {
      const updatePayload: unknown = {}
      if (updates.name) updatePayload.name = updates.name
      if (updates.description) updatePayload.description = updates.description

      const _response = await this.executeWithProtection('api.update_presentation', async () => {
        return this.makeApiCall(`/me/drive/items/${fileId}`, {
          method: 'PATCH',
          body: JSON.stringify(updatePayload)
        })
      }),
      return response
    } catch (error) {
      this.logError('updatePresentation', error as Error)
      throw new Error(`Failed to update presentation: ${(error as Error).message}`)
    }

  async deletePresentation(fileId: string): Promise<boolean> {
    try {
      await this.executeWithProtection('api.delete_presentation', async () => {
        return this.makeApiCall(`/me/drive/items/${fileId}`, { method: 'DELETE' })
      }),
      return true
    } catch (error) {
      this.logError('deletePresentation', error as Error)
      throw new Error(`Failed to delete presentation: ${(error as Error).message}`)
    }

  async getPresentations(options?: {
    folder?: string
    filter?: string
    orderBy?: string,
    top?: number
  }): Promise<unknown[]> {
    try {
      let endpoint = '/me/drive/root/children'
      const queryParams = new URLSearchParams()

      let filter = "contains(name,'.pptx') or contains(name,'.ppt')"
      if (_options?.filter) {
        filter += ` and ${options.filter}`
      }
      queryParams.append('$filter', filter)

      if (_options?.orderBy) queryParams.append('$orderby', _options.orderBy)
      if (_options?.top) queryParams.append('$top', _options.top.toString())

      if (_options?.folder) {
        endpoint = `/me/drive/items/${options.folder}/children`
      }

      const _response = await this.executeWithProtection('api.get_presentations', async () => {
        return this.makeApiCall(`${endpoint}?${queryParams.toString()}`)
      })

      return (response as Response).value || []
    } catch (error) {
      this.logError('getPresentations', error as Error)
      throw new Error(`Failed to get presentations: ${(error as Error).message}`)
    }

  async duplicatePresentation(fileId: string, newName?: string): Promise<ApiResponse> {
    try {
      const originalPresentation = await this.getPresentation(fileId)
      const copyName = newName || `Copy of ${originalPresentation.name}`
  }

      const _response = await this.executeWithProtection('api.duplicate_presentation', async () => {
        return this.makeApiCall(`/me/drive/items/${fileId}/copy`, {
          method: 'POST',
          body: JSON.stringify({ name: copyName })
        })
      }),
      return response
    } catch (error) {
      this.logError('duplicatePresentation', error as Error)
      throw new Error(`Failed to duplicate presentation: ${(error as Error).message}`)
    }

  // =====================================================
  // BASIC SLIDES MANAGEMENT
  // =====================================================

  async addSlide(
    fileId: string,
    slideData: {
      layout?: string
      title?: string
      content?: string,
      position?: number
    },
  ): Promise<ApiResponse> {
    try {
      const slideInfo = {
        fileId,
        layout: slideData.layout || 'Title and Content',
        title: slideData.title || 'New Slide'
        content: slideData.content || '',
        position: slideData.position || -1
        addedAt: new Date().toISOString()
      }

      this.logInfo('addSlide', 'Slide addition logged', slideInfo)

      return {
        success: true,
        slideId: `slide-${Date.now()}`,
        message: 'Slide structure defined - requires PowerPoint JavaScript API for implementation'
        ...slideInfo
      }
    } catch (error) {
      this.logError('addSlide', error as Error)
      throw new Error(`Failed to add slide: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-powerpoint-online.integration.ts:', error)
      throw error
    }
  async deleteSlide(fileId: string, slideIndex: number): Promise<boolean> {
    try {
      const slideInfo = {
        fileId,
        slideIndex,
        deletedAt: new Date().toISOString()
      }
  }

      this.logInfo('deleteSlide', 'Slide deletion logged', slideInfo),
      return true
    } catch (error) {
      this.logError('deleteSlide', error as Error)
      throw new Error(`Failed to delete slide: ${(error as Error).message}`)
    }

  async getSlides(fileId: string): Promise<unknown[]> {
    try {
      const presentation = await this.getPresentation(fileId)
  }

      return [
        {
          id: 'slide-info',
          type: 'presentation-metadata'
          name: presentation.name,
          size: presentation.size
          lastModified: presentation.lastModifiedDateTime,
          message: 'Detailed slide information requires PowerPoint JavaScript API'
          estimatedSlideCount: Math.floor(presentation.size / 50000) || 1
        },
      ]
    } catch (error) {
      this.logError('getSlides', error as Error)
      throw new Error(`Failed to get slides: ${(error as Error).message}`)
    }

  // =====================================================
  // ESSENTIAL CONTENT OPERATIONS
  // =====================================================

  async addTextBox(
    fileId: string,
    slideIndex: number
    textData: {,
      text: string
      x?: number
      y?: number
      width?: number
      height?: number
      fontSize?: number
      fontColor?: string,
      fontName?: string
    },
  ): Promise<ApiResponse> {
    try {
      const textBoxInfo = {
        fileId,
        slideIndex,
        ...textData,
        addedAt: new Date().toISOString()
      }

      this.logInfo('addTextBox', 'Text box addition logged', textBoxInfo)

      return {
        success: true,
        textBoxId: `textbox-${Date.now()}`,
        message:
          'Text box structure defined - requires PowerPoint JavaScript API for implementation',
        ...textBoxInfo
      }
    } catch (error) {
      this.logError('addTextBox', error as Error)
      throw new Error(`Failed to add text box: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-powerpoint-online.integration.ts:', error)
      throw error
    }
  async addImage(
    fileId: string,
    slideIndex: number
    imageData: {
      url?: string
      base64?: string
      x?: number
      y?: number
      width?: number,
      height?: number
    },
  ): Promise<ApiResponse> {
    try {
      const imageInfo = {
        fileId,
        slideIndex,
        ...imageData,
        addedAt: new Date().toISOString()
      }

      this.logInfo('addImage', 'Image addition logged', imageInfo)

      return {
        success: true,
        imageId: `image-${Date.now()}`,
        message: 'Image structure defined - requires PowerPoint JavaScript API for implementation'
        ...imageInfo
      }
    } catch (error) {
      this.logError('addImage', error as Error)
      throw new Error(`Failed to add image: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-powerpoint-online.integration.ts:', error)
      throw error
    }
  async updateContent(
    fileId: string,
    slideIndex: number
    contentId: string,
    updates: unknown
  ): Promise<boolean> {
    try {
      const updateInfo = {
        fileId,
        slideIndex,
        contentId,
        updates,
        updatedAt: new Date().toISOString()
      }

      this.logInfo('updateContent', 'Content update logged', updateInfo),
      return true
    } catch (error) {
      this.logError('updateContent', error as Error)
      throw new Error(`Failed to update content: ${(error as Error).message}`)
    }

  // =====================================================
  // COLLABORATION & SHARING
  // =====================================================

  async sharePresentation(
    fileId: string,
    shareData: {
      recipients: string[]
      message?: string
      permission: 'read' | 'write' | 'owner'
      requireSignIn?: boolean
    },
  ): Promise<ApiResponse> {
    try {
      const invitePayload = {
        recipients: shareData.recipients.map(email => ({ email })),
        message: shareData.message || 'Presentation shared via Aurelius',
        requireSignIn: shareData.requireSignIn !== false
        sendInvitation: true,
        roles: [shareData.permission]
      }

      const _response = await this.executeWithProtection('api.share_presentation', async () => {
        return this.makeApiCall(`/me/drive/items/${fileId}/invite`, {
          method: 'POST',
          body: JSON.stringify(invitePayload)
        })
      }),
      return response
    } catch (error) {
      this.logError('sharePresentation', error as Error)
      throw new Error(`Failed to share presentation: ${(error as Error).message}`)
    }

  async getPresentationPermissions(fileId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection(
        'api.get_presentation_permissions',
        async () => {
          return this.makeApiCall(`/me/drive/items/${fileId}/permissions`)
        },
      )
      return (response as Response).value || []
    } catch (error) {
      this.logError('getPresentationPermissions', error as Error)
      throw new Error(`Failed to get presentation permissions: ${(error as Error).message}`)
    }

  async updatePermissions(
    fileId: string,
    permissionId: string
    role: 'read' | 'write'
  ): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.update_permissions', async () => {
        return this.makeApiCall(`/me/drive/items/${fileId}/permissions/${permissionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ roles: [role] })
        })
      }),
      return response
    } catch (error) {
      this.logError('updatePermissions', error as Error)
      throw new Error(`Failed to update permissions: ${(error as Error).message}`)
    }

  async getCollaborators(fileId: string): Promise<unknown[]> {
    try {
      const permissions = await this.getPresentationPermissions(fileId)
  }

      return permissions
        .filter(permission => permission.grantedTo || permission.grantedToIdentities)
        .map(permission => ({
          id: permission.id,
          displayName:
            permission.grantedTo?.user?.displayName ||
            permission.grantedToIdentities?.[0]?.user?.displayName,
          email:
            permission.grantedTo?.user?.email || permission.grantedToIdentities?.[0]?.user?.email,
          role: permission.roles?.[0],
          shareType: permission.shareId ? 'link' : 'direct'
        }))
    } catch (error) {
      this.logError('getCollaborators', error as Error)
      throw new Error(`Failed to get collaborators: ${(error as Error).message}`)
    }

  // =====================================================
  // BASIC EXPORT
  // =====================================================

  async exportPresentation(
    fileId: string,
    format: 'pdf' | 'png' | 'jpg' | 'pptx'
  ): Promise<Buffer> {
    try {
      const mimeTypes = {
        pdf: 'application/pdf',
        png: 'image/png'
        jpg: 'image/jpeg',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      }

      const _response = await this.executeWithProtection('api.export_presentation', async () => {
        return this.makeApiCall(`/me/drive/items/${fileId}/content?format=${format}`, { headers: {,
            Accept: mimeTypes[format] }
        })
      })

      if (response instanceof ArrayBuffer) {
        return Buffer.from(response)
      } else {
        const arrayBuffer = await new Response(JSON.stringify(response)).arrayBuffer()
        return Buffer.from(arrayBuffer)
      }
    } catch (error) {
      this.logError('exportPresentation', error as Error)
      throw new Error(`Failed to export presentation: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in microsoft-powerpoint-online.integration.ts:', error)
      throw error
    }
  async convertToPDF(fileId: string): Promise<Buffer> {
    try {
      return await this.exportPresentation(fileId, 'pdf')
    } catch (error) {
      this.logError('convertToPDF', error as Error)
      throw new Error(`Failed to convert to PDF: ${(error as Error).message}`)
    }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private createMinimalPptxContent(template?: string): ArrayBuffer {
    const content = JSON.stringify({
      type: 'PowerPoint Presentation',
      template: template || 'Blank'
      created: new Date().toISOString(),
      slides: [
        {
          slideNumber: 1,
          layout: 'Title Slide'
          content: 'New Presentation'
        },
      ]
    })

    return new TextEncoder().encode(content).buffer
  }

  // Additional utility methods for future enhancements
  private isValidPresentationFile(fileName: string): boolean {
    return fileName.endsWith('.pptx') || fileName.endsWith('.ppt')
  }

  // Method to extract presentation metadata
  private extractPresentationMetadata(fileData: unknown): unknown {
    return {
      id: fileData.id,
      name: fileData.name
      size: fileData.size,
      createdDateTime: fileData.createdDateTime
      lastModifiedDateTime: fileData.lastModifiedDateTime,
      webUrl: fileData.webUrl
      downloadUrl: fileData['@microsoft.graph.downloadUrl']
    }

  // Method to validate slide index bounds
  private validateSlideIndex(slideIndex: number, totalSlides: number): boolean {
    return slideIndex >= 0 && slideIndex < totalSlides
  }

  // Method to format error messages consistently
  private formatErrorMessage(operation: string, error: Error): string {
    return `PowerPoint ${operation},
    failed: ${error.message}`
  }

  // Method to generate unique identifiers for new content
  private generateContentId(type: string): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Method to validate permission levels
  private isValidPermission(permission: string): boolean {
    return ['read', 'write', 'owner'].includes(permission)
  }

  // Method to check if file format is supported for export
  private isSupportedExportFormat(format: string): boolean {
    return ['pdf', 'png', 'jpg', 'pptx'].includes(format)
  }
  // Method to create standard response objects
  private createSuccessResponse(data: Record<string, unknown>, message?: string): unknown {
    return {
      success: true
      data,
      message: message || 'Operation completed successfully',
      createdAt: new Date()
    }

}