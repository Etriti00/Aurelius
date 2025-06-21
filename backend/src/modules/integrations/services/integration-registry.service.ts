import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BaseIntegrationService } from './base-integration.service';
import { IntegrationType, IntegrationMetadata, IntegrationCapability } from '../interfaces';
import { BusinessException } from '../../../common/exceptions';

@Injectable()
export class IntegrationRegistryService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationRegistryService.name);
  private readonly integrations = new Map<IntegrationType, BaseIntegrationService>();
  private readonly metadata = new Map<IntegrationType, IntegrationMetadata>();

  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    await this.registerIntegrations();
  }

  /**
   * Register all available integrations
   */
  private async registerIntegrations(): Promise<void> {
    try {
      // Register Google integration
      await this.registerIntegration(
        IntegrationType.GOOGLE,
        'GoogleIntegrationService',
        {
          type: IntegrationType.GOOGLE,
          name: 'Google Workspace',
          description: 'Integrate with Gmail, Calendar, Drive, and Tasks',
          icon: 'https://cdn.aurelius.ai/integrations/google.svg',
          category: 'productivity',
          capabilities: [
            IntegrationCapability.EMAIL_SYNC,
            IntegrationCapability.CALENDAR_SYNC,
            IntegrationCapability.FILE_SYNC,
            IntegrationCapability.TASK_SYNC,
          ],
          requiredScopes: [
            'gmail.readonly',
            'gmail.send',
            'calendar',
            'drive.readonly',
            'tasks',
          ],
          webhookSupport: true,
          status: 'active',
          configSchema: {
            syncInterval: { type: 'number', default: 30, min: 5, max: 1440 },
            syncEnabled: { type: 'boolean', default: true },
            conflictResolution: { 
              type: 'string', 
              enum: ['local_wins', 'remote_wins', 'newest_wins', 'manual'],
              default: 'remote_wins',
            },
          },
        },
      );

      // Register Microsoft integration
      await this.registerIntegration(
        IntegrationType.MICROSOFT,
        'MicrosoftIntegrationService',
        {
          type: IntegrationType.MICROSOFT,
          name: 'Microsoft 365',
          description: 'Integrate with Outlook, Calendar, OneDrive, and Teams',
          icon: 'https://cdn.aurelius.ai/integrations/microsoft.svg',
          category: 'productivity',
          capabilities: [
            IntegrationCapability.EMAIL_SYNC,
            IntegrationCapability.CALENDAR_SYNC,
            IntegrationCapability.FILE_SYNC,
            IntegrationCapability.TASK_SYNC,
          ],
          requiredScopes: [
            'Mail.Read',
            'Mail.Send',
            'Calendars.ReadWrite',
            'Files.Read.All',
            'Tasks.ReadWrite',
            'Team.ReadBasic.All',
          ],
          webhookSupport: true,
          status: 'active',
          configSchema: {
            syncInterval: { type: 'number', default: 30, min: 5, max: 1440 },
            syncEnabled: { type: 'boolean', default: true },
            conflictResolution: { 
              type: 'string', 
              enum: ['local_wins', 'remote_wins', 'newest_wins', 'manual'],
              default: 'remote_wins',
            },
          },
        },
      );

      // Register Slack integration
      await this.registerIntegration(
        IntegrationType.SLACK,
        'SlackIntegrationService',
        {
          type: IntegrationType.SLACK,
          name: 'Slack',
          description: 'Integrate with Slack for messaging and notifications',
          icon: 'https://cdn.aurelius.ai/integrations/slack.svg',
          category: 'communication',
          capabilities: [
            IntegrationCapability.MESSAGE_SYNC,
            IntegrationCapability.NOTIFICATION_SEND,
            IntegrationCapability.CHANNEL_SYNC,
            IntegrationCapability.USER_SYNC,
          ],
          requiredScopes: [
            'channels:read',
            'chat:write',
            'files:read',
            'users:read',
          ],
          webhookSupport: true,
          status: 'active',
          configSchema: {
            syncInterval: { type: 'number', default: 15, min: 5, max: 60 },
            syncEnabled: { type: 'boolean', default: true },
            notificationChannel: { type: 'string', required: false },
          },
        },
      );

      // Register Jira integration
      await this.registerIntegration(
        IntegrationType.JIRA,
        'JiraIntegrationService',
        {
          type: IntegrationType.JIRA,
          name: 'Jira',
          description: 'Integrate with Jira for issue tracking',
          icon: 'https://cdn.aurelius.ai/integrations/jira.svg',
          category: 'project_management',
          capabilities: [
            IntegrationCapability.ISSUE_SYNC,
            IntegrationCapability.PROJECT_SYNC,
            IntegrationCapability.COMMENT_SYNC,
            IntegrationCapability.ATTACHMENT_SYNC,
          ],
          requiredScopes: [
            'read:jira-work',
            'write:jira-work',
          ],
          webhookSupport: false,
          status: 'active',
          configSchema: {
            syncInterval: { type: 'number', default: 30, min: 5, max: 1440 },
            syncEnabled: { type: 'boolean', default: true },
            projectKeys: { type: 'array', items: 'string', required: false },
            jiraUrl: { type: 'string', required: true },
          },
        },
      );

      this.logger.log(`Registered ${this.integrations.size} integrations`);
    } catch (error: any) {
      this.logger.error(`Failed to register integrations: ${error.message}`);
    }
  }

  /**
   * Register a single integration
   */
  private async registerIntegration(
    type: IntegrationType,
    serviceName: string,
    metadata: IntegrationMetadata,
  ): Promise<void> {
    try {
      const service = await this.moduleRef.get(serviceName, { strict: false });
      if (service && service instanceof BaseIntegrationService) {
        this.integrations.set(type, service);
        this.metadata.set(type, metadata);
        this.logger.log(`Registered integration: ${type}`);
      }
    } catch (error) {
      this.logger.warn(`Integration ${type} not available: ${error}`);
    }
  }

  /**
   * Get integration service
   */
  getIntegration(type: IntegrationType): BaseIntegrationService {
    const integration = this.integrations.get(type);
    if (!integration) {
      throw new BusinessException(
        `Integration ${type} not found`,
        'INTEGRATION_NOT_FOUND',
      );
    }
    return integration;
  }

  /**
   * Get all available integrations
   */
  getAvailableIntegrations(): IntegrationMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Get integration metadata
   */
  getIntegrationMetadata(type: IntegrationType): IntegrationMetadata | null {
    return this.metadata.get(type) || null;
  }

  /**
   * Check if integration is available
   */
  isIntegrationAvailable(type: IntegrationType): boolean {
    return this.integrations.has(type);
  }

  /**
   * Get integrations by category
   */
  getIntegrationsByCategory(category: string): IntegrationMetadata[] {
    return Array.from(this.metadata.values()).filter(
      meta => meta.category === category,
    );
  }

  /**
   * Get integration categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.metadata.forEach(meta => categories.add(meta.category));
    return Array.from(categories);
  }
}