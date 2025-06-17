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

interface OneNoteWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface OneNoteTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number,
  scope: string
}

interface OneNoteNotebook {
  id: string,
  self: string
  name: string,
  createdTime: string
  lastModifiedTime: string,
  isDefault: boolean
  userRole: 'Owner' | 'Contributor' | 'Reader',
  isShared: boolean
  sectionsUrl: string,
  sectionGroupsUrl: string
  links: {,
    oneNoteClientUrl: {
      href: string
    }
    oneNoteWebUrl: {,
      href: string
    }
  }
}

interface OneNoteSectionGroup {
  id: string,
  self: string
  name: string,
  createdTime: string
  lastModifiedTime: string,
  sectionsUrl: string
  sectionGroupsUrl: string
  parentNotebook?: {
    id: string,
    name: string
    self: string
  }
  parentSectionGroup?: {
    id: string,
    name: string
    self: string
  }
}

interface OneNoteSection {
  id: string,
  self: string
  name: string,
  createdTime: string
  lastModifiedTime: string,
  isDefault: boolean
  pagesUrl: string
  parentNotebook?: {
    id: string,
    name: string
    self: string
  }
  parentSectionGroup?: {
    id: string,
    name: string
    self: string
  }
}

interface OneNotePage {
  id: string,
  self: string
  title: string,
  createdTime: string
  lastModifiedTime: string,
  level: number
  order: number,
  contentUrl: string
  content?: string
  parentSection?: {
    id: string,
    name: string
    self: string
  }
  links: {,
    oneNoteClientUrl: {
      href: string
    }
    oneNoteWebUrl: {,
      href: string
    }
  }
}

interface OneNoteResource {
  id: string,
  self: string
  content?: string
  contentType: string
}

interface OneNoteOperation {
  id: string,
  status: 'NotStarted' | 'Running' | 'Completed' | 'Failed'
  createdTime: string,
  lastActionTime: string
  resourceLocation?: string
  resourceId?: string
  error?: {
    code: string,
    message: string
    '@api.url': string
  }
}

export class OneNoteIntegration extends BaseIntegration {
  readonly provider = 'onenote'
  readonly name = 'Microsoft OneNote'
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
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/me/onenote/notebooks', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        scope: [
          'https://graph.microsoft.com/Notes.ReadWrite',
          'https://graph.microsoft.com/Notes.Create',
        ],
        data: response
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }
    }
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
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
            'https://graph.microsoft.com/Notes.ReadWrite https://graph.microsoft.com/Notes.Create'
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: OneNoteTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
        scope: tokenData.scope?.split(' ')
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.DOCUMENTS,
      IntegrationCapability.NOTES,
      IntegrationCapability.COLLABORATION,
      IntegrationCapability.SEARCH,
      IntegrationCapability.WEBHOOKS,
      IntegrationCapability.FILE_STORAGE,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/me/onenote/notebooks', 'GET')
      })

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          notebooksCount: response.value?.length || 0
          apiVersion: 'v1.0',
          permissions: ['Notes.ReadWrite', 'Notes.Create']
        }
      }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        status: 'error',
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }

  async sync(): Promise<SyncResult> {
    try {
      const startTime = new Date()
      let totalProcessed = 0
      let totalErrors = 0
      const errors: string[] = []

      // Sync notebooks
      try {
        const notebookResult = await this.syncNotebooks()
        totalProcessed += notebookResult.processed
        totalErrors += notebookResult.errors
        if (notebookResult.errorMessages) {
          errors.push(...notebookResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Notebook sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync sections
      try {
        const sectionResult = await this.syncSections()
        totalProcessed += sectionResult.processed
        totalErrors += sectionResult.errors
        if (sectionResult.errorMessages) {
          errors.push(...sectionResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Section sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync pages
      try {
        const pageResult = await this.syncPages()
        totalProcessed += pageResult.processed
        totalErrors += pageResult.errors
        if (pageResult.errorMessages) {
          errors.push(...pageResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Page sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      return {
        success: totalErrors === 0,
        timestamp: new Date()
        duration: Date.now() - startTime.getTime(),
        itemsProcessed: totalProcessed
        itemsAdded: totalProcessed - totalErrors,
        itemsUpdated: 0
        itemsDeleted: 0,
        errors: totalErrors
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      this.logError('sync', error as Error)
      throw new SyncError(`OneNote sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const oneNotePayload = payload as OneNoteWebhookPayload

      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload.body || '', payload.headers || {})) {
        throw new Error('Invalid webhook signature')
      }

      switch (oneNotePayload.type) {
        case 'page.created':
        case 'page.updated':
        case 'page.deleted':
          await this.handlePageWebhook(oneNotePayload)
          break
        case 'section.created':
        case 'section.updated':
        case 'section.deleted':
          await this.handleSectionWebhook(oneNotePayload)
          break
        case 'notebook.created':
        case 'notebook.updated':
        case 'notebook.deleted':
          await this.handleNotebookWebhook(oneNotePayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${oneNotePayload.type}`)
      }

      return {
        success: true,
        data: { processed: true },
        message: 'Webhook processed successfully'
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      if (this.refreshTokenValue && this.config) {
        await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({,
            token: this.accessToken
            client_id: this.config.clientId
          })
        })
      }

      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncNotebooks(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.notebooks', async () => {
        return this.makeApiCall('/me/onenote/notebooks', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const notebooks = response.value || []

      for (const notebook of notebooks) {
        try {
          await this.processNotebook(notebook)
          processed++
        } catch (error) {
          errors.push(`Failed to process notebook ${notebook.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Notebook sync failed: ${(error as Error).message}`)
    }
  }

  private async syncSections(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.sections', async () => {
        return this.makeApiCall('/me/onenote/sections', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const sections = response.value || []

      for (const section of sections) {
        try {
          await this.processSection(section)
          processed++
        } catch (error) {
          errors.push(`Failed to process section ${section.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Section sync failed: ${(error as Error).message}`)
    }
  }

  private async syncPages(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.pages', async () => {
        return this.makeApiCall('/me/onenote/pages', 'GET', undefined, { $top: 100 })
      })

      let processed = 0
      const errors: string[] = []

      const pages = response.value || []

      for (const page of pages) {
        try {
          await this.processPage(page)
          processed++
        } catch (error) {
          errors.push(`Failed to process page ${page.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Page sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processNotebook(notebook: any): Promise<void> {
    this.logger.debug(`Processing OneNote notebook: ${notebook.name}`)
    // Process notebook data for Aurelius AI system
  }

  private async processSection(section: any): Promise<void> {
    this.logger.debug(`Processing OneNote section: ${section.name}`)
    // Process section data for Aurelius AI system
  }

  private async processPage(page: any): Promise<void> {
    this.logger.debug(`Processing OneNote page: ${page.title}`)
    // Process page data for Aurelius AI system
  }

  // Private webhook handlers
  private async handleNotebookWebhook(payload: OneNoteWebhookPayload): Promise<void> {
    this.logger.debug(`Handling notebook webhook: ${payload.id}`)
    // Handle notebook webhook processing
  }

  private async handleSectionWebhook(payload: OneNoteWebhookPayload): Promise<void> {
    this.logger.debug(`Handling section webhook: ${payload.id}`)
    // Handle section webhook processing
  }

  private async handlePageWebhook(payload: OneNoteWebhookPayload): Promise<void> {
    this.logger.debug(`Handling page webhook: ${payload.id}`)
    // Handle page webhook processing
  }

  // Helper method for webhook signature verification
  private verifyWebhookSignature(body: string, headers: Record<string, string>): boolean {
    try {
      const signature = headers['x-ms-signature'] || headers['X-MS-Signature']
      if (!signature || !this.config?.webhookSecret) {
        return false
      }

      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(body)
        .digest('hex')

      return signature === `sha256=${expectedSignature}`
    } catch (error) {
      this.logError('verifyWebhookSignature' error as Error)
      return false
    }
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET'
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<any> {
    const url = new URL(`${this.apiBaseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString())
        }
      })
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `OneNote API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getNotebooks(): Promise<OneNoteNotebook[]> {
    try {
      const response = await this.executeWithProtection('api.get_notebooks', async () => {
        return this.makeApiCall('/me/onenote/notebooks', 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getNotebooks', error as Error)
      throw new Error(`Failed to get notebooks: ${(error as Error).message}`)
    }
  }

  async getNotebook(notebookId: string): Promise<OneNoteNotebook> {
    try {
      const response = await this.executeWithProtection('api.get_notebook', async () => {
        return this.makeApiCall(`/me/onenote/notebooks/${notebookId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getNotebook', error as Error)
      throw new Error(`Failed to get notebook: ${(error as Error).message}`)
    }
  }

  async createNotebook(notebookData: { name: string }): Promise<OneNoteNotebook> {
    try {
      const response = await this.executeWithProtection('api.create_notebook', async () => {
        return this.makeApiCall('/me/onenote/notebooks', 'POST', notebookData)
      })

      return response
    } catch (error) {
      this.logError('createNotebook', error as Error)
      throw new Error(`Failed to create notebook: ${(error as Error).message}`)
    }
  }

  async getSections(notebookId?: string): Promise<OneNoteSection[]> {
    try {
      const endpoint = notebookId
        ? `/me/onenote/notebooks/${notebookId}/sections`
        : '/me/onenote/sections'

      const response = await this.executeWithProtection('api.get_sections', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getSections', error as Error)
      throw new Error(`Failed to get sections: ${(error as Error).message}`)
    }
  }

  async getSection(sectionId: string): Promise<OneNoteSection> {
    try {
      const response = await this.executeWithProtection('api.get_section', async () => {
        return this.makeApiCall(`/me/onenote/sections/${sectionId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getSection', error as Error)
      throw new Error(`Failed to get section: ${(error as Error).message}`)
    }
  }

  async createSection(sectionData: { name: string; notebookId: string }): Promise<OneNoteSection> {
    try {
      const response = await this.executeWithProtection('api.create_section', async () => {
        return this.makeApiCall(
          `/me/onenote/notebooks/${sectionData.notebookId}/sections`,
          'POST',
          {
            name: sectionData.name
          },
        )
      })

      return response
    } catch (error) {
      this.logError('createSection', error as Error)
      throw new Error(`Failed to create section: ${(error as Error).message}`)
    }
  }

  async getSectionGroups(notebookId?: string): Promise<OneNoteSectionGroup[]> {
    try {
      const endpoint = notebookId
        ? `/me/onenote/notebooks/${notebookId}/sectionGroups`
        : '/me/onenote/sectionGroups'

      const response = await this.executeWithProtection('api.get_section_groups', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getSectionGroups', error as Error)
      throw new Error(`Failed to get section groups: ${(error as Error).message}`)
    }
  }

  async createSectionGroup(sectionGroupData: {,
    name: string
    notebookId: string
  }): Promise<OneNoteSectionGroup> {
    try {
      const response = await this.executeWithProtection('api.create_section_group', async () => {
        return this.makeApiCall(
          `/me/onenote/notebooks/${sectionGroupData.notebookId}/sectionGroups`,
          'POST',
          {
            name: sectionGroupData.name
          },
        )
      })

      return response
    } catch (error) {
      this.logError('createSectionGroup', error as Error)
      throw new Error(`Failed to create section group: ${(error as Error).message}`)
    }
  }

  async getPages(
    sectionId?: string,
    params?: {
      $top?: number
      $skip?: number
      $orderby?: string
      $filter?: string
      $search?: string
    },
  ): Promise<OneNotePage[]> {
    try {
      const endpoint = sectionId ? `/me/onenote/sections/${sectionId}/pages` : '/me/onenote/pages'

      const response = await this.executeWithProtection('api.get_pages', async () => {
        return this.makeApiCall(endpoint, 'GET', undefined, params)
      })

      return response.value || []
    } catch (error) {
      this.logError('getPages', error as Error)
      throw new Error(`Failed to get pages: ${(error as Error).message}`)
    }
  }

  async getPage(pageId: string): Promise<OneNotePage> {
    try {
      const response = await this.executeWithProtection('api.get_page', async () => {
        return this.makeApiCall(`/me/onenote/pages/${pageId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getPage', error as Error)
      throw new Error(`Failed to get page: ${(error as Error).message}`)
    }
  }

  async getPageContent(pageId: string): Promise<string> {
    try {
      const response = await this.executeWithProtection('api.get_page_content', async () => {
        return this.makeApiCall(`/me/onenote/pages/${pageId}/content`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getPageContent', error as Error)
      throw new Error(`Failed to get page content: ${(error as Error).message}`)
    }
  }

  async createPage(pageData: {,
    sectionId: string
    title: string,
    content: string
  }): Promise<OneNotePage> {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${pageData.title}</title>
          </head>
          <body>
            ${pageData.content}
          </body>
        </html>
      `

      const response = await this.executeWithProtection('api.create_page', async () => {
        const url = `${this.apiBaseUrl}/me/onenote/sections/${pageData.sectionId}/pages`

        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'text/html',
          Accept: 'application/json'
        }

        const fetchResponse = await fetch(url, {
          method: 'POST'
          headers,
          body: htmlContent
        })

        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json().catch(() => ({}))
          throw new Error(
            `OneNote API error: ${fetchResponse.status} ${fetchResponse.statusText} - ${JSON.stringify(errorData)}`,
          )
        }

        return fetchResponse.json()
      })

      return response
    } catch (error) {
      this.logError('createPage', error as Error)
      throw new Error(`Failed to create page: ${(error as Error).message}`)
    }
  }

  async updatePageContent(pageId: string, content: string): Promise<void> {
    try {
      await this.executeWithProtection('api.update_page_content', async () => {
        const url = `${this.apiBaseUrl}/me/onenote/pages/${pageId}/content`

        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }

        const patchData = [
          {
            target: 'body',
            action: 'append'
            content: content
          },
        ]

        const response = await fetch(url, {
          method: 'PATCH'
          headers,
          body: JSON.stringify(patchData)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            `OneNote API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
          )
        }

        return response.status === 204 ? {} : response.json()
      })
    } catch (error) {
      this.logError('updatePageContent', error as Error)
      throw new Error(`Failed to update page content: ${(error as Error).message}`)
    }
  }

  async deletePage(pageId: string): Promise<void> {
    try {
      await this.executeWithProtection('api.delete_page', async () => {
        return this.makeApiCall(`/me/onenote/pages/${pageId}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deletePage', error as Error)
      throw new Error(`Failed to delete page: ${(error as Error).message}`)
    }
  }

  async copyPageToSection(pageId: string, targetSectionId: string): Promise<OneNoteOperation> {
    try {
      const response = await this.executeWithProtection('api.copy_page', async () => {
        return this.makeApiCall(`/me/onenote/pages/${pageId}/copyToSection`, 'POST', {
          id: targetSectionId
        })
      })

      return response
    } catch (error) {
      this.logError('copyPageToSection', error as Error)
      throw new Error(`Failed to copy page: ${(error as Error).message}`)
    }
  }

  async searchPages(
    query: string
    params?: {
      $top?: number
      $skip?: number
    },
  ): Promise<OneNotePage[]> {
    try {
      const searchParams = {
        $search: query
        ...params
      }

      const response = await this.executeWithProtection('api.search_pages', async () => {
        return this.makeApiCall('/me/onenote/pages', 'GET', undefined, searchParams)
      })

      return response.value || []
    } catch (error) {
      this.logError('searchPages', error as Error)
      throw new Error(`Failed to search pages: ${(error as Error).message}`)
    }
  }

  async getResources(pageId: string): Promise<OneNoteResource[]> {
    try {
      const response = await this.executeWithProtection('api.get_resources', async () => {
        return this.makeApiCall(`/me/onenote/pages/${pageId}/resources`, 'GET')
      })

      return response.value || []
    } catch (error) {
      this.logError('getResources', error as Error)
      throw new Error(`Failed to get resources: ${(error as Error).message}`)
    }
  }

  async getResource(pageId: string, resourceId: string): Promise<OneNoteResource> {
    try {
      const response = await this.executeWithProtection('api.get_resource', async () => {
        return this.makeApiCall(`/me/onenote/pages/${pageId}/resources/${resourceId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getResource', error as Error)
      throw new Error(`Failed to get resource: ${(error as Error).message}`)
    }
  }

  async getOperationStatus(operationId: string): Promise<OneNoteOperation> {
    try {
      const response = await this.executeWithProtection('api.get_operation_status', async () => {
        return this.makeApiCall(`/me/onenote/operations/${operationId}`, 'GET')
      })

      return response
    } catch (error) {
      this.logError('getOperationStatus', error as Error)
      throw new Error(`Failed to get operation status: ${(error as Error).message}`)
    }
  }

  async getRecentPages(days: number = 7): Promise<OneNotePage[]> {
    try {
      const since = new Date()
      since.setDate(since.getDate() - days)
      const filter = `lastModifiedTime ge ${since.toISOString()}`

      const response = await this.executeWithProtection('api.get_recent_pages', async () => {
        return this.makeApiCall('/me/onenote/pages', 'GET', undefined, {
          $filter: filter
          $orderby: 'lastModifiedTime desc'
          $top: 50
        })
      })

      return response.value || []
    } catch (error) {
      this.logError('getRecentPages', error as Error)
      throw new Error(`Failed to get recent pages: ${(error as Error).message}`)
    }
  }

  async getPagesByTag(tag: string): Promise<OneNotePage[]> {
    try {
      const response = await this.executeWithProtection('api.get_pages_by_tag', async () => {
        return this.makeApiCall('/me/onenote/pages', 'GET', undefined, {
          $search: `#${tag}`,
          $top: 100
        })
      })

      return response.value || []
    } catch (error) {
      this.logError('getPagesByTag', error as Error)
      throw new Error(`Failed to get pages by tag: ${(error as Error).message}`)
    }
  }
}
