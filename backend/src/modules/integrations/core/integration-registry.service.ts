import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface IntegrationMetadata {
  id: string,
  name: string,
  category: string
  subCategory?: string
  description: string,
  authType: 'oauth2' | 'api_key' | 'basic_auth' | 'bearer_token',
  capabilities: string[],
  requiredScopes: string[],
  webhookSupport: boolean,
  webhookEvents: string[],
  rateLimits: {
    requests: number,
    window: number // seconds,
    burst?: number
  },
    documentation: {,
    setupUrl: string
    apiDocsUrl: string,
    webhookDocsUrl?: string
  },
    pricing: {,
    freeTier: boolean
    quotaLimits?: Record<string, number>
  },
    status: 'active' | 'beta' | 'deprecated' | 'coming_soon',
  priority: 'high' | 'medium' | 'low',
  complexity: 'simple' | 'moderate' | 'complex',
  implementationStatus: 'complete' | 'partial' | 'skeleton' | 'planned',
  lastUpdated: string,
  version: string
}

import { Logger } from '@nestjs/common'

@Injectable()
export class IntegrationRegistryService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationRegistryService.name)
  private readonly integrations = new Map<string, IntegrationMetadata>()
  private readonly categorizedIntegrations = new Map<string, string[]>()

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.registerAllIntegrations()
    this.logger.log(`Integration registry initialized with ${this.integrations.size} integrations`)
  }

  private registerAllIntegrations(): void {
    // Google Workspace Suite (12 integrations)
    this.register('google-workspace', {
      id: 'google-workspace',
      name: 'Google Workspace',
      category: 'productivity',
      subCategory: 'email',
      description: 'Gmail, Calendar, Drive, Tasks, and Contacts integration',
      authType: 'oauth2',
      capabilities: ['email', 'calendar', 'files', 'tasks', 'contacts'],
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/tasks',
        'https://www.googleapis.com/auth/contacts',
      ],
      webhookSupport: true,
      webhookEvents: ['message.received', 'calendar.event.created', 'drive.file.updated'],
      rateLimits: { requests: 100, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/workspace/guides/get-started',
        apiDocsUrl: 'https://developers.google.com/workspace',
        webhookDocsUrl: 'https://developers.google.com/workspace/guides/push-notifications',
      },
      pricing: { freeTier: true, quotaLimits: { requests: 1000000 },
      status: 'active',
      priority: 'high',
      complexity: 'complex',
      implementationStatus: 'complete',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-calendar', {
      id: 'google-calendar',
      name: 'Google Calendar',
      category: 'calendar',
      description: 'Standalone Google Calendar integration',
      authType: 'oauth2',
      capabilities: ['calendar', 'events', 'scheduling'],
      requiredScopes: ['https://www.googleapis.com/auth/calendar'],
      webhookSupport: true,
      webhookEvents: ['event.created', 'event.updated', 'event.deleted'],
      rateLimits: { requests: 1000, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/calendar/api/guides/overview',
        apiDocsUrl: 'https://developers.google.com/calendar/api',
        webhookDocsUrl: 'https://developers.google.com/calendar/api/guides/push',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'high',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-drive', {
      id: 'google-drive',
      name: 'Google Drive',
      category: 'storage',
      description: 'Google Drive file management and sharing',
      authType: 'oauth2',
      capabilities: ['files', 'storage', 'sharing'],
      requiredScopes: ['https://www.googleapis.com/auth/drive'],
      webhookSupport: true,
      webhookEvents: ['file.created', 'file.updated', 'file.deleted'],
      rateLimits: { requests: 1000, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/drive/api/guides/about-sdk',
        apiDocsUrl: 'https://developers.google.com/drive/api',
        webhookDocsUrl: 'https://developers.google.com/drive/api/guides/push',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'high',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-tasks', {
      id: 'google-tasks',
      name: 'Google Tasks',
      category: 'productivity',
      subCategory: 'tasks',
      description: 'Google Tasks management',
      authType: 'oauth2',
      capabilities: ['tasks', 'productivity'],
      requiredScopes: ['https://www.googleapis.com/auth/tasks'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 500, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/tasks/get_started',
        apiDocsUrl: 'https://developers.google.com/tasks',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'medium',
      complexity: 'simple',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-contacts', {
      id: 'google-contacts',
      name: 'Google Contacts',
      category: 'productivity',
      subCategory: 'contacts',
      description: 'Google Contacts management',
      authType: 'oauth2',
      capabilities: ['contacts', 'people'],
      requiredScopes: ['https://www.googleapis.com/auth/contacts'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 500, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/people/quickstart',
        apiDocsUrl: 'https://developers.google.com/people',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'medium',
      complexity: 'simple',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-keep', {
      id: 'google-keep',
      name: 'Google Keep',
      category: 'productivity',
      subCategory: 'notes',
      description: 'Google Keep notes integration',
      authType: 'oauth2',
      capabilities: ['notes', 'reminders'],
      requiredScopes: ['https://www.googleapis.com/auth/keep'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 200, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/keep/api',
        apiDocsUrl: 'https://developers.google.com/keep/api',
      },
      pricing: { freeTier: true },
      status: 'beta',
      priority: 'low',
      complexity: 'simple',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-meet', {
      id: 'google-meet',
      name: 'Google Meet',
      category: 'communication',
      subCategory: 'video',
      description: 'Google Meet video conferencing',
      authType: 'oauth2',
      capabilities: ['video', 'meetings'],
      requiredScopes: ['https://www.googleapis.com/auth/meetings'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 100, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/meet/api',
        apiDocsUrl: 'https://developers.google.com/meet/api',
      },
      pricing: { freeTier: true },
      status: 'beta',
      priority: 'medium',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-chat', {
      id: 'google-chat',
      name: 'Google Chat',
      category: 'communication',
      subCategory: 'messaging',
      description: 'Google Chat messaging integration',
      authType: 'oauth2',
      capabilities: ['messaging', 'chat'],
      requiredScopes: ['https://www.googleapis.com/auth/chat.bot'],
      webhookSupport: true,
      webhookEvents: ['message.received', 'space.updated'],
      rateLimits: { requests: 100, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/chat/api',
        apiDocsUrl: 'https://developers.google.com/chat/api',
        webhookDocsUrl: 'https://developers.google.com/chat/api/guides/message-formats/events',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'medium',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-forms', {
      id: 'google-forms',
      name: 'Google Forms',
      category: 'productivity',
      subCategory: 'forms',
      description: 'Google Forms survey and data collection',
      authType: 'oauth2',
      capabilities: ['forms', 'surveys', 'data_collection'],
      requiredScopes: ['https://www.googleapis.com/auth/forms.body'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 100, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/forms/api',
        apiDocsUrl: 'https://developers.google.com/forms/api',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'low',
      complexity: 'simple',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-sheets', {
      id: 'google-sheets',
      name: 'Google Sheets',
      category: 'productivity',
      subCategory: 'spreadsheets',
      description: 'Google Sheets data management',
      authType: 'oauth2',
      capabilities: ['spreadsheets', 'data_analysis'],
      requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 300, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/sheets/api',
        apiDocsUrl: 'https://developers.google.com/sheets/api',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'medium',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-docs', {
      id: 'google-docs',
      name: 'Google Docs',
      category: 'productivity',
      subCategory: 'documents',
      description: 'Google Docs document management',
      authType: 'oauth2',
      capabilities: ['documents', 'collaboration'],
      requiredScopes: ['https://www.googleapis.com/auth/documents'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 300, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/docs/api',
        apiDocsUrl: 'https://developers.google.com/docs/api',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'medium',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('google-slides', {
      id: 'google-slides',
      name: 'Google Slides',
      category: 'productivity',
      subCategory: 'presentations',
      description: 'Google Slides presentation management',
      authType: 'oauth2',
      capabilities: ['presentations', 'collaboration'],
      requiredScopes: ['https://www.googleapis.com/auth/presentations'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 300, window: 60 },
      documentation: {,
        setupUrl: 'https://developers.google.com/slides/api',
        apiDocsUrl: 'https://developers.google.com/slides/api',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'low',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    // Microsoft 365 Suite (13 integrations)
    this.register('microsoft-365', {
      id: 'microsoft-365',
      name: 'Microsoft 365',
      category: 'productivity',
      subCategory: 'email',
      description: 'Outlook, Teams, OneDrive, SharePoint integration',
      authType: 'oauth2',
      capabilities: ['email', 'calendar', 'files', 'collaboration'],
      requiredScopes: [
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/Files.ReadWrite.All',
        'https://graph.microsoft.com/Sites.ReadWrite.All',
      ],
      webhookSupport: true,
      webhookEvents: ['mail.received', 'calendar.event.created', 'file.updated'],
      rateLimits: { requests: 10000, window: 600 },
      documentation: {,
        setupUrl: 'https://docs.microsoft.com/en-us/graph/auth/',
        apiDocsUrl: 'https://docs.microsoft.com/en-us/graph/',
        webhookDocsUrl: 'https://docs.microsoft.com/en-us/graph/webhooks',
      },
      pricing: { freeTier: true, quotaLimits: { requests: 10000 },
      status: 'active',
      priority: 'high',
      complexity: 'complex',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('microsoft-teams', {
      id: 'microsoft-teams',
      name: 'Microsoft Teams',
      category: 'communication',
      subCategory: 'messaging',
      description: 'Microsoft Teams collaboration and messaging',
      authType: 'oauth2',
      capabilities: ['messaging', 'collaboration', 'meetings'],
      requiredScopes: [
        'https://graph.microsoft.com/Chat.ReadWrite',
        'https://graph.microsoft.com/Team.ReadBasic.All',
      ],
      webhookSupport: true,
      webhookEvents: ['message.sent', 'meeting.created'],
      rateLimits: { requests: 10000, window: 600 },
      documentation: {,
        setupUrl: 'https://docs.microsoft.com/en-us/microsoftteams/platform/',
        apiDocsUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview',
        webhookDocsUrl:
          'https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'high',
      complexity: 'complex',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('microsoft-onedrive', {
      id: 'microsoft-onedrive',
      name: 'Microsoft OneDrive',
      category: 'storage',
      description: 'OneDrive file storage and sharing',
      authType: 'oauth2',
      capabilities: ['files', 'storage', 'sharing'],
      requiredScopes: ['https://graph.microsoft.com/Files.ReadWrite.All'],
      webhookSupport: true,
      webhookEvents: ['file.created', 'file.updated'],
      rateLimits: { requests: 10000, window: 600 },
      documentation: {,
        setupUrl: 'https://docs.microsoft.com/en-us/onedrive/developer/',
        apiDocsUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/onedrive',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'high',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('microsoft-sharepoint', {
      id: 'microsoft-sharepoint',
      name: 'Microsoft SharePoint',
      category: 'collaboration',
      description: 'SharePoint document management and collaboration',
      authType: 'oauth2',
      capabilities: ['documents', 'collaboration', 'sites'],
      requiredScopes: ['https://graph.microsoft.com/Sites.ReadWrite.All'],
      webhookSupport: true,
      webhookEvents: ['item.created', 'item.updated'],
      rateLimits: { requests: 10000, window: 600 },
      documentation: {,
        setupUrl: 'https://docs.microsoft.com/en-us/sharepoint/dev/',
        apiDocsUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/sharepoint',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'medium',
      complexity: 'complex',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    // Continue with additional Microsoft integrations...
    this.register('microsoft-planner', {
      id: 'microsoft-planner',
      name: 'Microsoft Planner',
      category: 'project_management',
      description: 'Microsoft Planner task and project management',
      authType: 'oauth2',
      capabilities: ['tasks', 'project_management'],
      requiredScopes: ['https://graph.microsoft.com/Group.ReadWrite.All'],
      webhookSupport: false,
      webhookEvents: [],
      rateLimits: { requests: 10000, window: 600 },
      documentation: {,
        setupUrl: 'https://docs.microsoft.com/en-us/graph/planner-concept-overview',
        apiDocsUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/planner-overview',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'medium',
      complexity: 'moderate',
      implementationStatus: 'skeleton',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    // Communication Platforms (5 integrations)
    this.register('slack', {
      id: 'slack',
      name: 'Slack',
      category: 'communication',
      subCategory: 'messaging',
      description: 'Slack team communication and collaboration',
      authType: 'oauth2',
      capabilities: ['messaging', 'files', 'channels', 'users'],
      requiredScopes: ['channels:read', 'chat:write', 'files:read', 'users:read'],
      webhookSupport: true,
      webhookEvents: ['message', 'channel_created', 'file_shared'],
      rateLimits: { requests: 1, window: 1 },
      documentation: {,
        setupUrl: 'https://api.slack.com/start/overview',
        apiDocsUrl: 'https://api.slack.com/',
        webhookDocsUrl: 'https://api.slack.com/events-api',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'high',
      complexity: 'moderate',
      implementationStatus: 'complete',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('discord', {
      id: 'discord',
      name: 'Discord',
      category: 'communication',
      subCategory: 'messaging',
      description: 'Discord community and gaming communication',
      authType: 'oauth2',
      capabilities: ['messaging', 'voice', 'guilds'],
      requiredScopes: ['bot', 'messages.read', 'messages.write'],
      webhookSupport: true,
      webhookEvents: ['message.create', 'guild.create'],
      rateLimits: { requests: 50, window: 1 },
      documentation: {,
        setupUrl: 'https://discord.com/developers/docs/intro',
        apiDocsUrl: 'https://discord.com/developers/docs/reference',
        webhookDocsUrl: 'https://discord.com/developers/docs/resources/webhook',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'medium',
      complexity: 'moderate',
      implementationStatus: 'planned',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('zoom', {
      id: 'zoom',
      name: 'Zoom',
      category: 'communication',
      subCategory: 'video',
      description: 'Zoom video conferencing and webinars',
      authType: 'oauth2',
      capabilities: ['meetings', 'webinars', 'recordings'],
      requiredScopes: ['meeting:read', 'meeting:write', 'recording:read'],
      webhookSupport: true,
      webhookEvents: ['meeting.started', 'meeting.ended'],
      rateLimits: { requests: 10, window: 1 },
      documentation: {,
        setupUrl: 'https://marketplace.zoom.us/docs/guides',
        apiDocsUrl: 'https://marketplace.zoom.us/docs/api-reference/zoom-api',
        webhookDocsUrl: 'https://marketplace.zoom.us/docs/guides/tools-resources/webhooks',
      },
      pricing: { freeTier: false, quotaLimits: { meetings: 100 },
      status: 'active',
      priority: 'high',
      complexity: 'moderate',
      implementationStatus: 'planned',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    // Calendar & Scheduling (5 integrations)
    this.register('calendly', {
      id: 'calendly',
      name: 'Calendly',
      category: 'calendar',
      subCategory: 'scheduling',
      description: 'Calendly scheduling and appointment booking',
      authType: 'oauth2',
      capabilities: ['scheduling', 'bookings', 'availability'],
      requiredScopes: ['default'],
      webhookSupport: true,
      webhookEvents: ['invitee.created', 'invitee.canceled'],
      rateLimits: { requests: 1000, window: 60 },
      documentation: {,
        setupUrl: 'https://developer.calendly.com/getting-started',
        apiDocsUrl: 'https://developer.calendly.com/api-docs',
        webhookDocsUrl:
          'https://developer.calendly.com/api-docs/ZG9jOjM2MzE2MDM4-webhook-signatures',
      },
      pricing: { freeTier: true, quotaLimits: { requests: 10000 },
      status: 'active',
      priority: 'high',
      complexity: 'moderate',
      implementationStatus: 'planned',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    this.register('cal-com', {
      id: 'cal-com',
      name: 'Cal.com',
      category: 'calendar',
      subCategory: 'scheduling',
      description: 'Cal.com open-source scheduling platform',
      authType: 'api_key',
      capabilities: ['scheduling', 'bookings', 'availability'],
      requiredScopes: [],
      webhookSupport: true,
      webhookEvents: ['booking.created', 'booking.cancelled'],
      rateLimits: { requests: 1000, window: 60 },
      documentation: {,
        setupUrl: 'https://developer.cal.com/api/quickstart',
        apiDocsUrl: 'https://developer.cal.com/api',
        webhookDocsUrl: 'https://developer.cal.com/api/webhooks',
      },
      pricing: { freeTier: true },
      status: 'active',
      priority: 'high',
      complexity: 'simple',
      implementationStatus: 'planned',
      lastUpdated: '2025-06-15',
      version: '1.0.0',
    })

    // Add more integrations following the same pattern...
    // (Continue with Project Management, CRM, Developer Tools, etc.)

    this.buildCategoryIndex()
  }

  private register(id: string, metadata: IntegrationMetadata): void {
    this.integrations.set(id, metadata)
  }

  private buildCategoryIndex(): void {
    this.categorizedIntegrations.clear()

    for (const [id, metadata] of this.integrations) {
      const category = metadata.category
    }

      if (!this.categorizedIntegrations.has(category)) {
        this.categorizedIntegrations.set(category, [])
      }

      this.categorizedIntegrations.get(category)!.push(id)
    }

  // Public API methods
  getIntegration(id: string): IntegrationMetadata | null {
    return this.integrations.get(id) || null
  }

  getAllIntegrations(): IntegrationMetadata[] {
    return Array.from(this.integrations.values())
  }

  getIntegrationsByCategory(category: string): IntegrationMetadata[] {
    const integrationIds = this.categorizedIntegrations.get(category) || []
    return integrationIds.map(id => this.integrations.get(id)!).filter(Boolean)
  }

  getCategories(): string[] {
    return Array.from(this.categorizedIntegrations.keys())
  }

  getIntegrationsByStatus(status: IntegrationMetadata['status']): IntegrationMetadata[] {
    return this.getAllIntegrations().filter(integration => integration.status === status)
  }

  getIntegrationsByPriority(priority: IntegrationMetadata['priority']): IntegrationMetadata[] {
    return this.getAllIntegrations().filter(integration => integration.priority === priority)
  }

  getIntegrationsByImplementationStatus(
    implementationStatus: IntegrationMetadata['implementationStatus'],
  ): IntegrationMetadata[] {
    return this.getAllIntegrations().filter(
      integration => integration.implementationStatus === implementationStatus,
    )
  }

  searchIntegrations(query: string): IntegrationMetadata[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllIntegrations().filter(
      integration =>
        integration.name.toLowerCase().includes(lowerQuery) ||
        integration.description.toLowerCase().includes(lowerQuery) ||
        integration.capabilities.some(cap => cap.toLowerCase().includes(lowerQuery)),
    )
  }

  getIntegrationCapabilities(id: string): string[] {
    const _integration = this.getIntegration(id)
    return integration?.capabilities || []
  }

  isWebhookSupported(id: string): boolean {
    const _integration = this.getIntegration(id)
    return integration?.webhookSupport || false
  }

  getWebhookEvents(id: string): string[] {
    const _integration = this.getIntegration(id)
    return integration?.webhookEvents || []
  }

  getRateLimits(id: string): { requests: number; window: number; burst?: number } | null {
    const _integration = this.getIntegration(id)
    return integration?.rateLimits || null
  }

  // Statistics and reporting
  getRegistryStats(): {
    total: number,
    byCategory: Record<string, number>
    byStatus: Record<string, number>
    byImplementationStatus: Record<string, number>
  } {
    const total = this.integrations.size
    const byCategory: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    const byImplementationStatus: Record<string, number> = {}
  }

    for (const integration of this.getAllIntegrations()) {
      // Count by category
      byCategory[integration.category] = (byCategory[integration.category] || 0) + 1
    }

      // Count by status
      byStatus[integration.status] = (byStatus[integration.status] || 0) + 1

      // Count by implementation status
      byImplementationStatus[integration.implementationStatus] =
        (byImplementationStatus[integration.implementationStatus] || 0) + 1
    }

    return {
      total,
      byCategory,
      byStatus,
      byImplementationStatus,
    }

  // Configuration validation
  validateIntegrationConfig(id: string): boolean {
    const _integration = this.getIntegration(id)
    if (!integration) return false
  }

    // Check if required configuration is available
    const requiredEnvVars = this.getRequiredEnvVars(integration)
    return requiredEnvVars.every(envVar => this.configService.get(envVar))
  }

  private getRequiredEnvVars(integration: IntegrationMetadata): string[] {
    const baseVars = [`${integration.id.toUpperCase().replace('-', '_')}_CLIENT_ID`]

    if (integration.authType === 'oauth2') {
      baseVars.push(`${integration.id.toUpperCase().replace('-', '_')}_CLIENT_SECRET`)
      baseVars.push(`${integration.id.toUpperCase().replace('-', '_')}_REDIRECT_URI`)
    }

    if (integration.authType === 'api_key') {
      baseVars.push(`${integration.id.toUpperCase().replace('-', '_')}_API_KEY`)
    }

    if (integration.webhookSupport) {
      baseVars.push(`${integration.id.toUpperCase().replace('-', '_')}_WEBHOOK_SECRET`)
    },

    return baseVars
  }

  // Development utilities
  generateEnvTemplate(): string {
    const template: string[] = []
  }

    for (const integration of this.getAllIntegrations()) {
      template.push(`# ${integration.name} Configuration`)
    }

      const requiredVars = this.getRequiredEnvVars(integration)
      requiredVars.forEach(envVar => {
        template.push(`${envVar}=`)
      })

      template.push('')
    }

    return template.join('\n')
  }

  exportRegistry(): Record<string, IntegrationMetadata> {
    const registry: Record<string, IntegrationMetadata> = {}
  }

    for (const [id, metadata] of this.integrations) {
      registry[id] = metadata
    },

    return registry
  }

}