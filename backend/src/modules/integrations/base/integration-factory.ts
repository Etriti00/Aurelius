import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BaseIntegration, IntegrationConfig } from './integration.interface'
import { IntegrationError } from '../common/integration.error'

export type SupportedProvider =
  | 'google'
  | 'microsoft'
  | 'slack'
  | 'teams'
  | 'sharepoint'
  | 'onedrive'
  | 'discord'
  | 'zoom'
  | 'jira'
  | 'trello'
  | 'asana'
  | 'linear'
  | 'clickup'
  | 'monday'
  | 'basecamp'
  | 'wrike'
  | 'smartsheet'
  | 'notion'
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'salesforce'
  | 'hubspot'
  | 'pipedrive'
  | 'todoist'
  | 'evernote'
  | 'obsidian'
  | 'onenote'
  | 'stripe'
  | 'quickbooks'
  | 'zendesk'
  | 'zapier'
  | 'calendly'
  | 'paypal'
  | 'xero'
  | 'intercom'
  | 'square'
  | 'calcom'
  | 'freshdesk'
  | 'make'
  | 'microsoft-azure-devops'
  | 'microsoft-dynamics-365'
  | 'microsoft-excel-online'
  | 'microsoft-planner'
  | 'microsoft-power-automate'
  | 'microsoft-powerpoint-online'
  | 'microsoft-todo'
  | 'microsoft-word-online'
  | 'google-keep'
  | 'google-meet'
  | 'google-chat'
  | 'google-forms'
  | 'google-sheets'
  | 'google-docs'
  | 'google-slides'
  | 'google-calendar'
  | 'google-drive'
  | 'google-tasks'
  | 'google-contacts'
  | 'telegram'
  | 'whatsapp-business'
  | 'zoho-crm'
  | 'freshsales'
  | 'copper'
  | 'jenkins'
  | 'circleci'
  | 'vercel'
  | 'netlify'
  | 'roam-research'
  | 'bear'
  | 'plaid'
  | 'apple-calendar'
  | 'google-analytics'
  | 'shopify'
  | 'dropbox'
  | 'twitter'
  | 'linkedin'
  | 'mixpanel'
  | 'docker-hub'
  | 'apple-notes'
  | 'help-scout'
  | 'drift'
  | 'ifttt'
  | 'facebook-pages'
  | 'freshbooks'
  | 'segment'
  | 'instagram-business'
  | 'woocommerce'
  | 'amazon-seller'
  | 'box'
  | 'amplitude'
  | 'buffer'
  | 'hootsuite'
  | 'craft'
  | 'wave'
  | 'livechat'
  | 'n8n'
  | 'ebay'
  | 'datadog'
  | 'aws-s3'
  | 'fantastical'
  | 'anydo-cal'
  | 'workato'
  | 'etsy'
  | 'bigcommerce'
  | 'new-relic'
  | 'icloud-drive'

interface IntegrationModuleMap {
  [key: string]: () => Promise<{ default: new (...args: unknown[]) => BaseIntegration }>
}

@Injectable()
export class IntegrationFactory {
  private readonly logger = new Logger(IntegrationFactory.name)
  private readonly moduleCache = new Map<string, any>()

  constructor(private readonly configService: ConfigService) {}

  private readonly integrationModules: IntegrationModuleMap = {
    google: () =>
      import('../google/google-workspace.integration').then(m => ({
        default: m.GoogleWorkspaceIntegration,
      })),
    microsoft: () =>
      import('../microsoft/microsoft-365.integration').then(m => ({
        default: m.MicrosoftIntegration,
      })),
    slack: () => import('../slack/slack.integration').then(m => ({ default: m.SlackIntegration })),
    jira: () => import('../jira/jira.integration').then(m => ({ default: m.JiraIntegration })),
    trello: () =>
      import('../trello/trello.integration').then(m => ({ default: m.TrelloIntegration })),
    asana: () => import('../asana/asana.integration').then(m => ({ default: m.AsanaIntegration })),
    linear: () =>
      import('../linear/linear.integration').then(m => ({ default: m.LinearIntegration })),
    clickup: () =>
      import('../clickup/clickup.integration').then(m => ({ default: m.ClickUpIntegration })),
    monday: () =>
      import('../monday/monday.integration').then(m => ({ default: m.MondayIntegration })),
    basecamp: () =>
      import('../basecamp/basecamp.integration').then(m => ({ default: m.BasecampIntegration })),
    wrike: () => import('../wrike/wrike.integration').then(m => ({ default: m.WrikeIntegration })),
    smartsheet: () =>
      import('../smartsheet/smartsheet.integration').then(m => ({
        default: m.SmartsheetIntegration,
      })),
    notion: () =>
      import('../notion/notion.integration').then(m => ({ default: m.NotionIntegration })),
    github: () =>
      import('../github/github.integration').then(m => ({ default: m.GitHubIntegration })),
    gitlab: () =>
      import('../gitlab/gitlab.integration').then(m => ({ default: m.GitLabIntegration })),
    bitbucket: () =>
      import('../bitbucket/bitbucket.integration').then(m => ({ default: m.BitbucketIntegration })),
    salesforce: () =>
      import('../salesforce/salesforce.integration').then(m => ({
        default: m.SalesforceIntegration,
      })),
    hubspot: () =>
      import('../hubspot/hubspot.integration').then(m => ({ default: m.HubSpotIntegration })),
    pipedrive: () =>
      import('../pipedrive/pipedrive.integration').then(m => ({ default: m.PipedriveIntegration })),
    todoist: () =>
      import('../todoist/todoist.integration').then(m => ({ default: m.TodoistIntegration })),
    evernote: () =>
      import('../evernote/evernote.integration').then(m => ({ default: m.EvernoteIntegration })),
    obsidian: () =>
      import('../obsidian/obsidian.integration').then(m => ({ default: m.ObsidianIntegration })),
    onenote: () =>
      import('../onenote/onenote.integration').then(m => ({ default: m.OneNoteIntegration })),
    stripe: () =>
      import('../stripe/stripe.integration').then(m => ({ default: m.StripeIntegration })),
    quickbooks: () =>
      import('../quickbooks/quickbooks.integration').then(m => ({
        default: m.QuickBooksIntegration,
      })),
    zendesk: () =>
      import('../zendesk/zendesk.integration').then(m => ({ default: m.ZendeskIntegration })),
    zapier: () =>
      import('../zapier/zapier.integration').then(m => ({ default: m.ZapierIntegration })),
    discord: () =>
      import('../discord/discord.integration').then(m => ({ default: m.DiscordIntegration })),
    zoom: () => import('../zoom/zoom.integration').then(m => ({ default: m.ZoomIntegration })),
    calendly: () =>
      import('../calendly/calendly.integration').then(m => ({ default: m.CalendlyIntegration })),
    paypal: () =>
      import('../paypal/paypal.integration').then(m => ({ default: m.PayPalIntegration })),
    xero: () => import('../xero/xero.integration').then(m => ({ default: m.XeroIntegration })),
    intercom: () =>
      import('../intercom/intercom.integration').then(m => ({ default: m.IntercomIntegration })),
    square: () =>
      import('../square/square.integration').then(m => ({ default: m.SquareIntegration })),
    calcom: () =>
      import('../calcom/calcom.integration').then(m => ({ default: m.CalComIntegration })),
    freshdesk: () =>
      import('../freshdesk/freshdesk.integration').then(m => ({ default: m.FreshdeskIntegration })),
    make: () => import('../make/make.integration').then(m => ({ default: m.MakeIntegration })),
    'microsoft-azure-devops': () =>
      import('../microsoft-azure-devops/microsoft-azure-devops.integration').then(m => ({
        default: m.MicrosoftAzureDevOpsIntegration,
      })),
    'microsoft-dynamics-365': () =>
      import('../microsoft-dynamics-365/microsoft-dynamics-365.integration').then(m => ({
        default: m.MicrosoftDynamics365Integration,
      })),
    'microsoft-excel-online': () =>
      import('../microsoft-excel-online/microsoft-excel-online.integration').then(m => ({
        default: m.MicrosoftExcelOnlineIntegration,
      })),
    'microsoft-planner': () =>
      import('../microsoft-planner/microsoft-planner.integration').then(m => ({
        default: m.MicrosoftPlannerIntegration,
      })),
    'microsoft-power-automate': () =>
      import('../microsoft-power-automate/microsoft-power-automate.integration').then(m => ({
        default: m.MicrosoftPowerAutomateIntegration,
      })),
    'microsoft-powerpoint-online': () =>
      import('../microsoft-powerpoint-online/microsoft-powerpoint-online.integration').then(m => ({
        default: m.MicrosoftPowerPointOnlineIntegration,
      })),
    'microsoft-todo': () =>
      import('../microsoft-todo/microsoft-todo.integration').then(m => ({
        default: m.MicrosoftToDoIntegration,
      })),
    'microsoft-word-online': () =>
      import('../microsoft-word-online/microsoft-word-online.integration').then(m => ({
        default: m.MicrosoftWordOnlineIntegration,
      })),
    'google-keep': () =>
      import('../google-keep/google-keep.integration').then(m => ({
        default: m.GoogleKeepIntegration,
      })),
    'google-meet': () =>
      import('../google-meet/google-meet.integration').then(m => ({
        default: m.GoogleMeetIntegration,
      })),
    'google-chat': () =>
      import('../google-chat/google-chat.integration').then(m => ({
        default: m.GoogleChatIntegration,
      })),
    'google-forms': () =>
      import('../google-forms/google-forms.integration').then(m => ({
        default: m.GoogleFormsIntegration,
      })),
    'google-sheets': () =>
      import('../google-sheets/google-sheets.integration').then(m => ({
        default: m.GoogleSheetsIntegration,
      })),
    'google-docs': () =>
      import('../google-docs/google-docs.integration').then(m => ({
        default: m.GoogleDocsIntegration,
      })),
    'google-slides': () =>
      import('../google-slides/google-slides.integration').then(m => ({
        default: m.GoogleSlidesIntegration,
      })),
    'google-calendar': () =>
      import('../google-calendar/google-calendar.integration').then(m => ({
        default: m.GoogleCalendarIntegration,
      })),
    'google-drive': () =>
      import('../google-drive/google-drive.integration').then(m => ({
        default: m.GoogleDriveIntegration,
      })),
    'google-tasks': () =>
      import('../google-tasks/google-tasks.integration').then(m => ({
        default: m.GoogleTasksIntegration,
      })),
    'google-contacts': () =>
      import('../google-contacts/google-contacts.integration').then(m => ({
        default: m.GoogleContactsIntegration,
      })),
    telegram: () =>
      import('../telegram/telegram.integration').then(m => ({ default: m.TelegramIntegration })),
    'whatsapp-business': () =>
      import('../whatsapp-business/whatsapp-business.integration').then(m => ({
        default: m.WhatsAppBusinessIntegration,
      })),
    'zoho-crm': () =>
      import('../zoho-crm/zoho-crm.integration').then(m => ({ default: m.ZohoCRMIntegration })),
    freshsales: () =>
      import('../freshsales/freshsales.integration').then(m => ({
        default: m.FreshsalesIntegration,
      })),
    copper: () =>
      import('../copper/copper.integration').then(m => ({ default: m.CopperIntegration })),
    jenkins: () =>
      import('../jenkins/jenkins.integration').then(m => ({ default: m.JenkinsIntegration })),
    circleci: () =>
      import('../circleci/circleci.integration').then(m => ({ default: m.CircleCIIntegration })),
    vercel: () =>
      import('../vercel/vercel.integration').then(m => ({ default: m.VercelIntegration })),
    netlify: () =>
      import('../netlify/netlify.integration').then(m => ({ default: m.NetlifyIntegration })),
    'roam-research': () =>
      import('../roam-research/roam-research.integration').then(m => ({
        default: m.RoamResearchIntegration,
      })),
    bear: () => import('../bear/bear.integration').then(m => ({ default: m.BearIntegration })),
    plaid: () => import('../plaid/plaid.integration').then(m => ({ default: m.PlaidIntegration })),
    'apple-calendar': () =>
      import('../apple-calendar/apple-calendar.integration').then(m => ({
        default: m.AppleCalendarIntegration,
      })),
    'google-analytics': () =>
      import('../google-analytics/google-analytics.integration').then(m => ({
        default: m.GoogleAnalyticsIntegration,
      })),
    shopify: () =>
      import('../shopify/shopify.integration').then(m => ({ default: m.ShopifyIntegration })),
    dropbox: () =>
      import('../dropbox/dropbox.integration').then(m => ({ default: m.DropboxIntegration })),
    twitter: () =>
      import('../twitter/twitter.integration').then(m => ({ default: m.TwitterIntegration })),
    linkedin: () =>
      import('../linkedin/linkedin.integration').then(m => ({ default: m.LinkedInIntegration })),
    mixpanel: () =>
      import('../mixpanel/mixpanel.integration').then(m => ({ default: m.MixpanelIntegration })),
    'docker-hub': () =>
      import('../docker-hub/docker-hub.integration').then(m => ({
        default: m.DockerHubIntegration,
      })),
    'apple-notes': () =>
      import('../apple-notes/apple-notes.integration').then(m => ({
        default: m.AppleNotesIntegration,
      })),
    'help-scout': () =>
      import('../help-scout/help-scout.integration').then(m => ({
        default: m.HelpScoutIntegration,
      })),
    drift: () => import('../drift/drift.integration').then(m => ({ default: m.DriftIntegration })),
    ifttt: () => import('../ifttt/ifttt.integration').then(m => ({ default: m.IFTTTIntegration })),
    'facebook-pages': () =>
      import('../facebook-pages/facebook-pages.integration').then(m => ({
        default: m.FacebookPagesIntegration,
      })),
    freshbooks: () =>
      import('../freshbooks/freshbooks.integration').then(m => ({
        default: m.FreshBooksIntegration,
      })),
    segment: () =>
      import('../segment/segment.integration').then(m => ({ default: m.SegmentIntegration })),
    'instagram-business': () =>
      import('../instagram-business/instagram-business.integration').then(m => ({
        default: m.InstagramBusinessIntegration,
      })),
    woocommerce: () =>
      import('../woocommerce/woocommerce.integration').then(m => ({
        default: m.WooCommerceIntegration,
      })),
    'amazon-seller': () =>
      import('../amazon-seller/amazon-seller.integration').then(m => ({
        default: m.AmazonSellerIntegration,
      })),
    box: () => import('../box/box.integration').then(m => ({ default: m.BoxIntegration })),
    amplitude: () =>
      import('../amplitude/amplitude.integration').then(m => ({ default: m.AmplitudeIntegration })),
    buffer: () =>
      import('../buffer/buffer.integration').then(m => ({ default: m.BufferIntegration })),
    hootsuite: () =>
      import('../hootsuite/hootsuite.integration').then(m => ({ default: m.HootsuiteIntegration })),
    craft: () => import('../craft/craft.integration').then(m => ({ default: m.CraftIntegration })),
    wave: () => import('../wave/wave.integration').then(m => ({ default: m.WaveIntegration })),
    livechat: () =>
      import('../livechat/livechat.integration').then(m => ({ default: m.LiveChatIntegration })),
    n8n: () => import('../n8n/n8n.integration').then(m => ({ default: m.N8NIntegration })),
    ebay: () => import('../ebay/ebay.integration').then(m => ({ default: m.EBayIntegration })),
    datadog: () =>
      import('../datadog/datadog.integration').then(m => ({ default: m.DataDogIntegration })),
    'aws-s3': () =>
      import('../aws-s3/aws-s3.integration').then(m => ({ default: m.AWSS3Integration })),
    fantastical: () =>
      import('../fantastical/fantastical.integration').then(m => ({
        default: m.FantasticalIntegration,
      })),
    'anydo-cal': () =>
      import('../anydo-cal/anydo-cal.integration').then(m => ({ default: m.AnyDoCalIntegration })),
    workato: () =>
      import('../workato/workato.integration').then(m => ({ default: m.WorkatoIntegration })),
    etsy: () => import('../etsy/etsy.integration').then(m => ({ default: m.EtsyIntegration })),
    bigcommerce: () =>
      import('../bigcommerce/bigcommerce.integration').then(m => ({
        default: m.BigCommerceIntegration,
      })),
    'new-relic': () =>
      import('../new-relic/new-relic.integration').then(m => ({ default: m.NewRelicIntegration })),
    'icloud-drive': () =>
      import('../icloud-drive/icloud-drive.integration').then(m => ({
        default: m.iCloudDriveIntegration,
      })),
  }

  async createIntegration(
    provider: SupportedProvider,
    userId: string,
    accessToken: string,
    refreshToken?: string,
    config?: IntegrationConfig,
  ): Promise<BaseIntegration> {
    try {
      // Check if module is cached
      if (this.moduleCache.has(provider)) {
        const IntegrationClass = this.moduleCache.get(provider)
        return new IntegrationClass(userId, accessToken, refreshToken, config)
      }

      // Dynamically import the integration module
      const moduleLoader = this.integrationModules[provider]
      if (!moduleLoader) {
        throw new IntegrationError(`Unsupported integration provider: ${provider}`)
      }

      const { default: IntegrationClass } = await moduleLoader()

      // Cache the module for future use
      this.moduleCache.set(provider, IntegrationClass)

      // Create and return the integration instance
      const integration = new IntegrationClass(userId, accessToken, refreshToken, config)

      this.logger.debug(`Created ${provider} integration for user ${userId}`)

      return integration
    } catch (error) {
      this.logger.error(`Failed to create ${provider} integration:`, error)
      throw new IntegrationError(
        `Failed to create ${provider} integration: ${(error as Error).message}`,
      )
    }
  }

  getSupportedProviders(): SupportedProvider[] {
    return Object.keys(this.integrationModules) as SupportedProvider[]
  }

  isProviderSupported(provider: string): provider is SupportedProvider {
    return provider in this.integrationModules
  }

  async validateProvider(provider: SupportedProvider): Promise<boolean> {
    try {
      const moduleLoader = this.integrationModules[provider]
      if (!moduleLoader) {
        return false
      }

      // Try to load the module to validate it exists
      await moduleLoader()
      return true
    } catch (error) {
      this.logger.warn(`Provider ${provider} validation failed:`, error)
      return false
    }
  }

  getProviderConfig(provider: SupportedProvider): IntegrationConfig | null {
    try {
      const configKey = `${provider.toUpperCase().replace('-', '_')}`

      return {
        clientId: this.configService.get<string>(`${configKey}_CLIENT_ID`),
        clientSecret: this.configService.get<string>(`${configKey}_CLIENT_SECRET`),
        redirectUri: this.configService.get<string>(`${configKey}_REDIRECT_URI`),
        scopes: this.configService.get<string>(`${configKey}_SCOPES`)?.split(',') || [],
        webhookUrl: this.configService.get<string>(`${configKey}_WEBHOOK_URL`),
        apiUrl: this.configService.get<string>(`${configKey}_API_URL`),
        version: this.configService.get<string>(`${configKey}_VERSION`) || '1.0',
      }
    } catch (error) {
      this.logger.error(`Failed to get config for ${provider}:`, error)
      return null
    }
  }

  clearModuleCache(): void {
    this.moduleCache.clear()
    this.logger.debug('Integration module cache cleared')
  }

  getModuleCacheSize(): number {
    return this.moduleCache.size
  }
}
