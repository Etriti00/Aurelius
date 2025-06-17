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

// Using WebhookPayload from base interface

export class GoogleContactsIntegration extends BaseIntegration {
  readonly provider = 'google-contacts'
  readonly name = 'Google Contacts'
  readonly version = '1.0.0'

  private oauth2Client: OAuth2Client
  private people: unknown

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

    this.people = google.people({ version: 'v1', auth: this.oauth2Client })
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Test authentication by getting user profile
      const _response = await this.executeWithProtection('auth.test', async () => {
        return this.people.people.get({
          resourceName: 'people/me',
          personFields: 'names,emailAddresses'
        })
      })
  }

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        scope: ['https://www.googleapis.com/auth/contacts.readonly']
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
      console.error('Error in google-contacts.integration.ts:', error)
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
        return this.people.people.get({
          resourceName: 'people/me',
          personFields: 'names'
        })
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
            limit: 500,
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
        name: 'Contact Information',
        description: 'Access contact names, emails, and phone numbers',
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/contacts.readonly']
      },
      {
        name: 'Contact Groups',
        description: 'Access contact groups and labels'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/contacts.readonly']
      },
      {
        name: 'Contact Photos',
        description: 'Access contact profile photos'
        enabled: true,
        requiredScopes: ['https://www.googleapis.com/auth/contacts.readonly']
      },
      {
        name: 'Contact Management',
        description: 'Create, update, and delete contacts (with write permissions)',
        enabled: false, // Requires write scope
        requiredScopes: ['https://www.googleapis.com/auth/contacts']
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

      this.logInfo('syncData', 'Starting Google Contacts sync', { lastSyncTime })

      // Sync contacts
      try {
        const contactsResult = await this.syncContacts(lastSyncTime)
        totalProcessed += contactsResult.processed,
        totalSkipped += contactsResult.skipped
      }
    } catch (error) {
        errors.push(`Contacts sync failed: ${(error as Error).message}`)
        this.logError('syncContacts', error as Error)
      }

      catch (error) {
        console.error('Error in google-contacts.integration.ts:', error)
        throw error
      }
      // Sync contact groups
      try {
        const groupsResult = await this.syncContactGroups()
        totalProcessed += groupsResult.processed,
        totalSkipped += groupsResult.skipped
      } catch (error) {
        errors.push(`Contact groups sync failed: ${(error as Error).message}`)
        this.logError('syncContactGroups', error as Error)
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
      throw new SyncError('Google Contacts sync failed: ' + (error as Error).message)
    }

  async getLastSyncTime(): Promise<Date | null> {
    return null
  }

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    try {
      this.logInfo('handleWebhook', 'Processing Google Contacts webhook', {
        event: payload.event,
        timestamp: payload.timestamp
      })
  }

      // Google People API webhooks via Google Cloud Pub/Sub
      // Implement domain-wide webhooks for contact changes
      switch (payload._event) {
        case 'contact.created':
        case 'contact.updated':
        case 'contact.deleted':
          await this.handleContactWebhook(payload.data)
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
      console.error('Error in google-contacts.integration.ts:', error)
      throw error
    }
  validateWebhookSignature(_payload: GenericWebhookPayload, _signature: string): boolean {
    // Google People API doesn't currently support webhooks,
    return true
  }

  // Private sync methods
  private async syncContacts(lastSyncTime?: Date): Promise<{ processed: number; skipped: number }> {
    try {
      const personFields = [
        'names',
        'emailAddresses',
        'phoneNumbers',
        'addresses',
        'organizations',
        'birthdays',
        'photos',
        'urls',
        'metadata',
      ].join(',')

      let pageToken: string | undefined
      let totalProcessed = 0
      let totalSkipped = 0
      const maxPages = 50 // Safety limit

      let pageCount = 0
      do {
        const _response = await this.executeWithProtection('sync.contacts.page', async () => {
          return this.people.people.connections.list({
            resourceName: 'people/me',
            pageSize: 1000
            personFields,
            pageToken,
            sortOrder: 'LAST_MODIFIED_DESCENDING'
          })
        })

        const contacts = response.data.connections || []
        let processed = 0
        let skipped = 0

        for (const contact of contacts) {
          try {
            // Check if contact was modified after last sync
            if (lastSyncTime && contact.metadata?.sources?.[0]?.updateTime) {
              const updateTime = new Date(contact.metadata.sources[0].updateTime)
              if (updateTime <= lastSyncTime) {
                skipped++,
                continue
              }
        }
            }

            await this.processContact(contact)
            processed++
          }
    } catch (error) {
            this.logError('syncContacts', error as Error, { contactId: contact.resourceName })
            skipped++
          }

          catch (error) {
            console.error('Error in google-contacts.integration.ts:', error)
            throw error
          }
        totalProcessed += processed
        totalSkipped += skipped
        pageToken = response.data.nextPageToken
        pageCount++

        this.logInfo('syncContacts', `Processed contacts page ${pageCount}`, {
          processed,
          skipped,
          hasNextPage: !!pageToken
        })
      } while (pageToken && pageCount < maxPages)

      return { processed: totalProcessed, skipped: totalSkipped }
    } catch (error) {
      this.logError('syncContacts', error as Error),
      throw error
    }

  private async syncContactGroups(): Promise<{ processed: number; skipped: number }> {
    try {
      const _response = await this.executeWithProtection('sync.contact_groups', async () => {
        return this.people.contactGroups.list({ pageSize: 1000 })
      })

      const contactGroups = response.data.contactGroups || []
      let processed = 0
      let skipped = 0

      for (const group of contactGroups) {
        try {
          await this.processContactGroup(group)
          processed++
        }
      }
    } catch (error) {
          this.logError('syncContactGroups', error as Error, { groupId: group.resourceName })
          skipped++
        }

      return { processed, skipped }
    } catch (error) {
      this.logError('syncContactGroups', error as Error),
      throw error
    }

    catch (error) {
      console.error('Error in google-contacts.integration.ts:', error)
      throw error
    }
  // Private processing methods
  private async processContact(contact: unknown): Promise<void> {
    const name = contact.names?.[0]?.displayName || 'Unknown'
    const emails = contact.emailAddresses?.map((email: unknown) => email.value) || []
    const phones = contact.phoneNumbers?.map((phone: unknown) => phone.value) || []

    this.logInfo('processContact', `Processing contact: ${name}`, {
      contactId: contact.resourceName,
      emails: emails.length
      phones: phones.length,
      hasPhoto: !!contact.photos?.length
    }),

    // Here you would save the contact to your database
  }

  private async processContactGroup(group: unknown): Promise<void> {
    this.logInfo('processContactGroup', `Processing contact group: ${group.name}`, {
      groupId: group.resourceName,
      memberCount: group.memberCount || 0
      groupType: group.groupType
    }),

    // Here you would save the contact group to your database
  }

  // Private webhook handlers
  private async handleContactWebhook(data: WebhookEvent): Promise<void> {
    this.logInfo('handleContactWebhook', 'Processing contact webhook', data)
  }

  // Public API methods
  async getContact(contactId: string): Promise<ApiResponse> {
    try {
      const personFields = [
        'names',
        'emailAddresses',
        'phoneNumbers',
        'addresses',
        'organizations',
        'birthdays',
        'photos',
        'urls',
        'metadata',
      ].join(',')
  }

      const _response = await this.executeWithProtection('api.get_contact', async () => {
        return this.people.people.get({
          resourceName: contactId
          personFields
        })
      })

      return (response as Response).data
    } catch (error) {
      this.logError('getContact', error as Error)
      throw new Error(`Failed to get contact: ${(error as Error).message}`)
    }

  async searchContacts(query: string, maxResults = 50): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.search_contacts', async () => {
        return this.people.people.searchContacts({
          query,
          pageSize: maxResults,
          readMask: 'names,emailAddresses,phoneNumbers,photos'
        })
      })
  }

      return (response as Response).data.results?.map((result: unknown) => result.person) || []
    } catch (error) {
      this.logError('searchContacts', error as Error)
      throw new Error(`Failed to search contacts: ${(error as Error).message}`)
    }

  async listContacts(
    options: {
      maxResults?: number
      pageToken?: string
      sortOrder?:
        | 'LAST_MODIFIED_ASCENDING'
        | 'LAST_MODIFIED_DESCENDING'
        | 'FIRST_NAME_ASCENDING',
        | 'LAST_NAME_ASCENDING'
    } = {},
  ): Promise<{ contacts: unknown[]; nextPageToken?: string }> {
    try {
      const personFields = [
        'names',
        'emailAddresses',
        'phoneNumbers',
        'addresses',
        'organizations',
        'photos',
        'metadata',
      ].join(',')

      const _response = await this.executeWithProtection('api.list_contacts', async () => {
        return this.people.people.connections.list({
          resourceName: 'people/me',
          pageSize: options.maxResults || 100
          pageToken: options.pageToken
          personFields,
          sortOrder: options.sortOrder || 'LAST_MODIFIED_DESCENDING'
        })
      })

      return {
        contacts: response.data.connections || [],
        nextPageToken: response.data.nextPageToken
      }
    } catch (error) {
      this.logError('listContacts', error as Error)
      throw new Error(`Failed to list contacts: ${(error as Error).message}`)
    }

    catch (error) {
      console.error('Error in google-contacts.integration.ts:', error)
      throw error
    }
  async getContactsByEmail(email: string): Promise<unknown[]> {
    try {
      const searchResults = await this.searchContacts(email)
      return searchResults.filter(contact =>
        contact.emailAddresses?.some(
          (emailAddr: unknown) => emailAddr.value.toLowerCase() === email.toLowerCase()
        ),
      )
    } catch (error) {
      this.logError('getContactsByEmail', error as Error)
      throw new Error(`Failed to get contacts by email: ${(error as Error).message}`)
    }

  async getContactPhoto(contactId: string): Promise<Buffer | null> {
    try {
      const contact = await this.getContact(contactId)
      const photoUrl = contact.photos?.[0]?.url
  }

      if (!photoUrl) {
        return null
      }

      const _response = await this.executeWithProtection('api.get_contact_photo', async () => {
        return fetch(photoUrl)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      this.logError('getContactPhoto', error as Error)
      throw new Error(`Failed to get contact photo: ${(error as Error).message}`)
    }

  async listContactGroups(): Promise<unknown[]> {
    try {
      const _response = await this.executeWithProtection('api.list_contact_groups', async () => {
        return this.people.contactGroups.list({ pageSize: 1000 })
      })
  }

      return (response as Response).data.contactGroups || []
    } catch (error) {
      this.logError('listContactGroups', error as Error)
      throw new Error(`Failed to list contact groups: ${(error as Error).message}`)
    }

  async getContactGroup(groupId: string): Promise<ApiResponse> {
    try {
      const _response = await this.executeWithProtection('api.get_contact_group', async () => {
        return this.people.contactGroups.get({
          resourceName: groupId,
          maxMembers: 1000
        })
      })
  }

      return (response as Response).data
    } catch (error) {
      this.logError('getContactGroup', error as Error)
      throw new Error(`Failed to get contact group: ${(error as Error).message}`)
    }

  async getContactsInGroup(groupId: string): Promise<unknown[]> {
    try {
      const group = await this.getContactGroup(groupId)
      const memberResourceNames = group.memberResourceNames || []
  }

      if (memberResourceNames.length === 0) {
        return []
      }

      const personFields = ['names', 'emailAddresses', 'phoneNumbers', 'photos', 'metadata'].join(
        ',',
      )

      const _response = await this.executeWithProtection('api.get_contacts_in_group', async () => {
        return this.people.people.getBatchGet({
          resourceNames: memberResourceNames
          personFields
        })
      })

      return (
        (response as Response).data.responses?.map((resp: unknown) => resp.person).filter(Boolean) || []
      )
    } catch (error) {
      this.logError('getContactsInGroup', error as Error)
      throw new Error(`Failed to get contacts in group: ${(error as Error).message}`)
    }

  async getFrequentContacts(maxResults = 50): Promise<unknown[]> {
    try {
      // Get contacts sorted by interaction frequency (recent first)
      const { contacts } = await this.listContacts({
        maxResults,
        sortOrder: 'LAST_MODIFIED_DESCENDING'
      })
  }

      // Filter contacts that have recent interaction metadata
      return contacts.filter(contact => {
        const sources = contact.metadata?.sources || []
        return sources.some(
          (source: unknown) =>
            source.type === 'CONTACT' &&
            source.updateTime &&
            new Date(source.updateTime) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days,
        )
      })
    } catch (error) {
      this.logError('getFrequentContacts', error as Error)
      throw new Error(`Failed to get frequent contacts: ${(error as Error).message}`)
    }

  // Helper methods for contact data extraction
  extractContactInfo(contact: unknown): {,
    id: string
    displayName: string,
    emails: string[]
    phones: string[],
    addresses: string[]
    organizations: string[]
    photoUrl?: string,
    lastModified?: Date
  } {
    return {
      id: contact.resourceName,
      displayName: contact.names?.[0]?.displayName || 'Unknown'
      emails: contact.emailAddresses?.map((email: unknown) => email.value) || [],
      phones: contact.phoneNumbers?.map((phone: unknown) => phone.value) || []
      addresses:
        contact.addresses?.map((addr: unknown) => addr.formattedValue).filter(Boolean) || [],
      organizations: contact.organizations?.map((org: unknown) => org.name).filter(Boolean) || []
      photoUrl: contact.photos?.[0]?.url,
      lastModified: contact.metadata?.sources?.[0]?.updateTime
        ? new Date(contact.metadata.sources[0].updateTime)
        : undefined
    }
  }

  async getAllContactsSimplified(): Promise<
    Array<{
      id: string,
      displayName: string
      emails: string[],
      phones: string[]
      photoUrl?: string
    }>
  > {
    try {
      const allContacts: unknown[] = []
      let pageToken: string | undefined

      do {
        const { contacts, nextPageToken } = await this.listContacts({
          maxResults: 1000
          pageToken
        })

        allContacts.push(...contacts)
        pageToken = nextPageToken
      } while (pageToken)

      return allContacts.map(contact => ({
        id: contact.resourceName,
        displayName: contact.names?.[0]?.displayName || 'Unknown'
        emails: contact.emailAddresses?.map((email: unknown) => email.value) || [],
        phones: contact.phoneNumbers?.map((phone: unknown) => phone.value) || []
        photoUrl: contact.photos?.[0]?.url
      }))
    } catch (error) {
      this.logError('getAllContactsSimplified', error as Error)
      throw new Error(`Failed to get all contacts: ${(error as Error).message}`)
    }

}