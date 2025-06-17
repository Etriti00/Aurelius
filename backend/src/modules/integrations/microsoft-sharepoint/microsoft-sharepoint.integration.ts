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

// Using WebhookPayload from base interface

class CustomAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken
  }

export class MicrosoftSharePointIntegration extends BaseIntegration {
  readonly provider = 'microsoft-sharepoint'
  readonly name = 'Microsoft SharePoint'
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
        return this.graphClient.api('/sites').top(1).get()
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: [
          'https://graph.microsoft.com/Sites.Read.All',
          'https://graph.microsoft.com/Sites.ReadWrite.All',
          'https://graph.microsoft.com/Files.ReadWrite.All',
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
      console.error('Error in microsoft-sharepoint.integration.ts:', error)
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
        return this.graphClient.api('/sites').top(1).get()
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
        name: 'Site Management',
        description: 'Access and manage SharePoint sites'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Sites.Read.All']
      },
      {
        name: 'Document Management',
        description: 'Upload, download, and manage documents',
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All']
      },
      {
        name: 'List Management',
        description: 'Access and manage SharePoint lists'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Sites.ReadWrite.All']
      },
      {
        name: 'Pages Management',
        description: 'Access and manage SharePoint pages'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Sites.ReadWrite.All']
      },
      {
        name: 'Search',
        description: 'Search across SharePoint content'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Sites.Read.All']
      },
      {
        name: 'Permissions Management',
        description: 'Manage site and document permissions'
        enabled: true,
        requiredScopes: ['https://graph.microsoft.com/Sites.FullControl.All']
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

      this.logInfo('syncData', 'Starting Microsoft SharePoint sync', { lastSyncTime })

      try {
        const sitesResult = await this.syncSites(lastSyncTime)
        totalProcessed += sitesResult.processed,
        totalSkipped += sitesResult.skipped
      }
    } catch (error) {
        errors.push(`Sites sync failed: ${(error as Error).message}`)
        this.logError('syncSites', error as Error)
      }

      catch (error) {
        console.error('Error in microsoft-sharepoint.integration.ts:', error)
        throw error
      }
      try {
        const documentsResult = await this.syncDocuments(lastSyncTime)
        totalProcessed += documentsResult.processed,
        totalSkipped += documentsResult.skipped
      } catch (error) {
        errors.push(`Documents sync failed: ${(error as Error).message}`)
        this.logError('syncDocuments', error as Error)
      }

      try {
        const listsResult = await this.syncLists(lastSyncTime)
        totalProcessed += listsResult.processed,
        totalSkipped += listsResult.skipped
      } catch (error) {
        errors.push(`Lists sync failed: ${(error as Error).message}`)
        this.logError('syncLists', error as Error)
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
      throw new SyncError('Microsoft SharePoint sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Microsoft SharePoint webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      switch (payload._event) {
        case 'sharepoint.document.created':
        case 'sharepoint.document.updated':
        case 'sharepoint.document.deleted':
          await this.handleDocumentWebhook(payload.data)
          break
        case 'sharepoint.list.item.created':
        case 'sharepoint.list.item.updated':
        case 'sharepoint.list.item.deleted':
          await this.handleListItemWebhook(payload.data)
          break
        case 'sharepoint.site.created':
        case 'sharepoint.site.updated':
          await this.handleSiteWebhook(payload.data)
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
      console.error('Error in microsoft-sharepoint.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    return true
  }

  // Private sync methods
  private async syncSites(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const sites = await this.executeWithProtection('sync.sites', async () => {
        return this.graphClient.api('/sites').get()
      })

      let processed = 0
      let skipped = 0

      for (const site of sites.value || []) {
        try {
          if (lastSyncTime && site.lastModifiedDateTime) {
            const modifiedTime = new Date(site.lastModifiedDateTime)
            if (modifiedTime <= lastSyncTime) {
              skipped++,
              continue
            }
      }
          }

          await this.processSite(site)
          processed++
        }
    } catch (error) {
          this.logError('syncSites', error as Error, { siteId: site.id })
          skipped++
        }

        catch (error) {
          console.error('Error in microsoft-sharepoint.integration.ts:', error)
          throw error
        }
      return { processed, skipped }
    } catch (error) {
      this.logError('syncSites', error as Error),
      throw error
    }

  private async syncDocuments(
    lastSyncTime?: Date,
  ): Promise<{ processed: number; skipped: number }> {
    try {
      const sites = await this.executeWithProtection('sync.documents.sites', async () => {
        return this.graphClient.api('/sites').get()
      })

      let totalProcessed = 0
      let totalSkipped = 0

      for (const site of sites.value || []) {
        try {
          const drives = await this.executeWithProtection(
            `sync.documents.site.${site.id}`,
            async () => {
              return this.graphClient.api(`/sites/${site.id}/drives`).get()
            },
          )
      }

          for (const drive of drives.value || []) {
            try {
              let filter = ''
              if (lastSyncTime) {
                filter = `$filter=lastModifiedDateTime ge ${lastSyncTime.toISOString()}`
              }
          }

              const documents = await this.executeWithProtection(
                `sync.documents.${site.id}.${drive.id}`,
                async () => {
                  return this.graphClient
                    .api(`/sites/${site.id}/drives/${drive.id}/root/children`)
                    .filter(filter)
                    .expand('listItem')
                    .get()
                }
                },
              )

              let processed = 0
              let skipped = 0

              for (const document of documents.value || []) {
                try {
                  await this.processDocument(document, site, drive),
                  processed++
                }
              }
    } catch (error) {
                  this.logError('syncDocuments', error as Error, {
                    siteId: site.id,
                    driveId: drive.id
                    documentId: document.id
                  }),
                  skipped++
                }

              totalProcessed += processed,
              totalSkipped += skipped
            }
    } catch (error) {
              this.logError('syncDocuments', error as Error, { siteId: site.id, driveId: drive.id }),
              totalSkipped++
            }
    } catch (error) {
          this.logError('syncDocuments', error as Error, { siteId: site.id })
        }

        catch (error) {
          console.error('Error in microsoft-sharepoint.integration.ts:', error)
          throw error
        }
      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncDocuments', error as Error),
      throw error
    }

  private async syncLists(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const sites = await this.executeWithProtection('sync.lists.sites', async () => {
        return this.graphClient.api('/sites').get()
      })

      let totalProcessed = 0
      let totalSkipped = 0

      for (const site of sites.value || []) {
        try {
          const lists = await this.executeWithProtection(`sync.lists.site.${site.id}`, async () => {
            return this.graphClient.api(`/sites/${site.id}/lists`).get()
          })
      }

          for (const list of lists.value || []) {
            try {
              let filter = ''
              if (lastSyncTime) {
                filter = `$filter=lastModifiedDateTime ge ${lastSyncTime.toISOString()}`
              }
          }

              const items = await this.executeWithProtection(
                `sync.lists.${site.id}.${list.id}`,
                async () => {
                  return this.graphClient
                    .api(`/sites/${site.id}/lists/${list.id}/items`)
                    .filter(filter)
                    .expand('fields')
                    .get()
                }
                },
              )

              let processed = 0
              let skipped = 0

              for (const item of items.value || []) {
                try {
                  await this.processListItem(item, list, site),
                  processed++
                }
              }
    } catch (error) {
                  this.logError('syncLists', error as Error, {
                    siteId: site.id,
                    listId: list.id
                    itemId: item.id
                  }),
                  skipped++
                }

              totalProcessed += processed,
              totalSkipped += skipped
            }
    } catch (error) {
              this.logError('syncLists', error as Error, { siteId: site.id, listId: list.id }),
              totalSkipped++
            }
    } catch (error) {
          this.logError('syncLists', error as Error, { siteId: site.id })
        }

      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncLists', error as Error),
      throw error
    }

  // Private processing methods
  private async processSite(site: unknown): Promise<void> {
    this.logInfo('processSite', `Processing site: ${site.displayName}`, {
      siteId: site.id,
      webUrl: site.webUrl
      lastModified: site.lastModifiedDateTime
    })
  }

  private async processDocument(document: unknown, site: unknown, drive: unknown): Promise<void> {
    this.logInfo('processDocument', `Processing document: ${document.name}`, {
      documentId: document.id,
      siteId: site.id
      driveId: drive.id,
      size: document.size
      lastModified: document.lastModifiedDateTime
    })
  }

  private async processListItem(item: unknown, list: unknown, site: unknown): Promise<void> {
    this.logInfo('processListItem', `Processing list item: ${item.id}`, {
      itemId: item.id,
      listId: list.id
      siteId: site.id,
      lastModified: item.lastModifiedDateTime
    })
  }

  // Private webhook handlers
  private async handleDocumentWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleDocumentWebhook', 'Processing document webhook', data)
  }

  private async handleListItemWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleListItemWebhook', 'Processing list item webhook', data)
  }

  private async handleSiteWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleSiteWebhook', 'Processing site webhook', data)
  }

  // Public API methods
  async listSites(search?: string): Promise<unknown[]> {
    try {
      let query = this.graphClient.api('/sites')
  }

      if (search) {
        query = query.search(search)
      }

      const _response = await this.executeWithProtection('api.list_sites', async () => {
        return query.get()
      })

      return (response as Response).value || []
    }
    } catch (error) {
      this.logError('listSites', error as Error)
      throw new Error(`Failed to list sites: ${(error as Error).message}`)
    }

  async getSite(siteId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_site', async () => {
        return this.graphClient.api(`/sites/${siteId}`).get()
      })
  }

      return response
    }
    } catch (error) {
      this.logError('getSite', error as Error)
      throw new Error(`Failed to get site: ${(error as Error).message}`)
    }

  async getSiteByPath(sitePath: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_site_by_path', async () => {
        return this.graphClient.api(`/sites/root:${sitePath}`).get()
      })
  }

      return response
    }
    } catch (error) {
      this.logError('getSiteByPath', error as Error)
      throw new Error(`Failed to get site by path: ${(error as Error).message}`)
    }

  async listDocumentLibraries(siteId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection(
        'api.list_document_libraries',
        async () => {
          return this.graphClient.api(`/sites/${siteId}/drives`).get()
        },
      )
  }

      return (response as Response).value || []
    }
    } catch (error) {
      this.logError('listDocumentLibraries', error as Error)
      throw new Error(`Failed to list document libraries: ${(error as Error).message}`)
    }

  async uploadDocument(
    siteId: string,
    driveId: string
    fileName: string,
    content: Buffer
    parentPath = '/',
  ): Promise<string> {
    try {
      const _response = await this.executeWithProtection('api.upload_document', async () => {
        return this.graphClient
          .api(`/sites/${siteId}/drives/${driveId}/root:${parentPath}/${fileName}:/content`)
          .put(content)
      })

      return (response as Response).id
    }
    } catch (error) {
      this.logError('uploadDocument', error as Error)
      throw new Error(`Failed to upload document: ${(error as Error).message}`)
    }

  async downloadDocument(siteId: string, driveId: string, itemId: string): Promise<Buffer> {
    try {
      const _response = await this.executeWithProtection('api.download_document', async () => {
        return this.graphClient
          .api(`/sites/${siteId}/drives/${driveId}/items/${itemId}/content`)
          .get()
      })
  }

      return Buffer.from(response)
    }
    } catch (error) {
      this.logError('downloadDocument', error as Error)
      throw new Error(`Failed to download document: ${(error as Error).message}`)
    }

  async listDocuments(siteId: string, driveId: string, parentPath = '/'): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_documents', async () => {
        return this.graphClient
          .api(`/sites/${siteId}/drives/${driveId}/root:${parentPath}:/children`)
          .get()
      })
  }

      return (response as Response).value || []
    }
    } catch (error) {
      this.logError('listDocuments', error as Error)
      throw new Error(`Failed to list documents: ${(error as Error).message}`)
    }

  async deleteDocument(siteId: string, driveId: string, itemId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_document', async () => {
        return this.graphClient.api(`/sites/${siteId}/drives/${driveId}/items/${itemId}`).delete()
      })
    }
    } catch (error) {
      this.logError('deleteDocument', error as Error)
      throw new Error(`Failed to delete document: ${(error as Error).message}`)
    }

  async shareDocument(
    siteId: string,
    driveId: string
    itemId: string,
    recipients: string[]
    message?: string,
    requireSignIn = true,
  ): Promise<void> {
    try {
      const permission = {
        requireSignIn,
        sendInvitation: true,
        roles: ['read']
        recipients: recipients.map(email => ({
          email
        })),
        message
      }

      await this.executeWithProtection('api.share_document', async () => {
        return this.graphClient
          .api(`/sites/${siteId}/drives/${driveId}/items/${itemId}/invite`)
          .post(permission)
      })
    }
    } catch (error) {
      this.logError('shareDocument', error as Error)
      throw new Error(`Failed to share document: ${(error as Error).message}`)
    }

  async listSharePointLists(siteId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_sharepoint_lists', async () => {
        return this.graphClient.api(`/sites/${siteId}/lists`).get()
      })
  }

      return (response as Response).value || []
    }
    } catch (error) {
      this.logError('listSharePointLists', error as Error)
      throw new Error(`Failed to list SharePoint lists: ${(error as Error).message}`)
    }

  async getSharePointList(siteId: string, listId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_sharepoint_list', async () => {
        return this.graphClient.api(`/sites/${siteId}/lists/${listId}`).get()
      })
  }

      return response
    }
    } catch (error) {
      this.logError('getSharePointList', error as Error)
      throw new Error(`Failed to get SharePoint list: ${(error as Error).message}`)
    }

  async listListItems(siteId: string, listId: string, top = 100): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_list_items', async () => {
        return this.graphClient
          .api(`/sites/${siteId}/lists/${listId}/items`)
          .expand('fields')
          .top(top)
          .get()
      })
  }

      return (response as Response).value || []
    }
    } catch (error) {
      this.logError('listListItems', error as Error)
      throw new Error(`Failed to list list items: ${(error as Error).message}`)
    }

  async createListItem(
    siteId: string,
    listId: string
    fields: Record<string, unknown>,
  ): Promise<string> {
    try {
      const _response = await this.executeWithProtection('api.create_list_item', async () => {
        return this.graphClient.api(`/sites/${siteId}/lists/${listId}/items`).post({
          fields
        })
      })

      return (response as Response).id
    }
    } catch (error) {
      this.logError('createListItem', error as Error)
      throw new Error(`Failed to create list item: ${(error as Error).message}`)
    }

  async updateListItem(
    siteId: string,
    listId: string
    itemId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.executeWithProtection('api.update_list_item', async () => {
        return this.graphClient
          .api(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`)
          .patch(fields)
      })
    }
    } catch (error) {
      this.logError('updateListItem', error as Error)
      throw new Error(`Failed to update list item: ${(error as Error).message}`)
    }

  async deleteListItem(siteId: string, listId: string, itemId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_list_item', async () => {
        return this.graphClient.api(`/sites/${siteId}/lists/${listId}/items/${itemId}`).delete()
      })
    }
    } catch (error) {
      this.logError('deleteListItem', error as Error)
      throw new Error(`Failed to delete list item: ${(error as Error).message}`)
    }

  async searchContent(siteId: string, query: string, top = 25): Promise<unknown[]> {
    try {
      const searchRequest = {
        requests: [
          {
            entityTypes: ['driveItem', 'listItem'],
            query: {,
              queryString: `${query} AND path:"https://*/sites/${siteId}"`
            },
            from: 0,
            size: top
          },
        ]
      }
  }

      const _response = await this.executeWithProtection('api.search_content', async () => {
        return this.graphClient.api('/search/query').post(searchRequest)
      })

      return (response as Response).value?.[0]?.hitsContainers?.[0]?.hits || []
    }
    } catch (error) {
      this.logError('searchContent', error as Error)
      throw new Error(`Failed to search content: ${(error as Error).message}`)
    }

  async getDocumentVersions(siteId: string, driveId: string, itemId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_document_versions', async () => {
        return this.graphClient
          .api(`/sites/${siteId}/drives/${driveId}/items/${itemId}/versions`)
          .get()
      })
  }

      return (response as Response).value || []
    }
    } catch (error) {
      this.logError('getDocumentVersions', error as Error)
      throw new Error(`Failed to get document versions: ${(error as Error).message}`)
    }

  async getSitePermissions(siteId: string): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.get_site_permissions', async () => {
        return this.graphClient.api(`/sites/${siteId}/permissions`).get()
      })
  }

      return (response as Response).value || []
    }
    } catch (error) {
      this.logError('getSitePermissions', error as Error)
      throw new Error(`Failed to get site permissions: ${(error as Error).message}`)
    }

}
catch (error) {
  console.error('Error in microsoft-sharepoint.integration.ts:', error)
  throw error
}