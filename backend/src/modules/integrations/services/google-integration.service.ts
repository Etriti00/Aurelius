import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/services/cache.service';
import { QueueService } from '../../queue/services/queue.service';
import { EncryptionService } from '../../security/services/encryption.service';
import { BaseIntegrationService } from './base-integration.service';
import { OAuthService } from './oauth.service';
import {
  IntegrationType,
  IntegrationConfig,
  Integration,
  SyncResult,
  IntegrationCapability,
  OAuthProvider,
} from '../interfaces';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GoogleIntegrationService extends BaseIntegrationService {
  protected readonly logger = new Logger(GoogleIntegrationService.name);
  protected readonly integrationType = IntegrationType.GOOGLE;
  protected readonly capabilities: IntegrationCapability[] = [
    IntegrationCapability.EMAIL_SYNC,
    IntegrationCapability.CALENDAR_SYNC,
    IntegrationCapability.FILE_SYNC,
    IntegrationCapability.TASK_SYNC,
  ];

  constructor(
    prisma: PrismaService,
    cacheService: CacheService,
    queueService: QueueService,
    encryptionService: EncryptionService,
    private httpService: HttpService,
    private oauthService: OAuthService,
  ) {
    super(prisma, cacheService, queueService, encryptionService);
  }

  getName(): string {
    return 'Google Workspace';
  }

  getDescription(): string {
    return 'Integrate with Gmail, Google Calendar, Drive, and Tasks';
  }

  async initialize(config: IntegrationConfig): Promise<void> {
    // Validate OAuth tokens
    if (!config.oauth) {
      throw new Error('OAuth configuration required for Google integration');
    }

    // Test API access
    const isValid = await this.oauthService.validateTokens(
      OAuthProvider.GOOGLE,
      config.oauth,
    );

    if (!isValid) {
      throw new Error('Invalid OAuth tokens');
    }
  }

  async testConnection(integration: Integration): Promise<boolean> {
    try {
      // Decrypt tokens
      const tokens = await this.decryptTokens(integration.config.oauth!);

      // Test Gmail API
      const response = await firstValueFrom(
        this.httpService.get('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }),
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error}`);
      return false;
    }
  }

  async sync(integration: Integration, syncType: 'full' | 'incremental'): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      itemsProcessed: 0,
      itemsSynced: 0,
      errors: [],
      syncType,
      startedAt: new Date(),
    };

    try {
      // Decrypt tokens
      if (!integration.config.oauth) {
        throw new Error('OAuth tokens not found in integration config');
      }
      const tokens = await this.decryptTokens(integration.config.oauth);

      // Check if tokens need refresh
      if (tokens.expiresAt && new Date() > new Date(tokens.expiresAt)) {
        const refreshed = await this.oauthService.refreshAccessToken(
          OAuthProvider.GOOGLE,
          tokens.refreshToken!,
        );
        
        // Update integration with new tokens
        await this.updateIntegration(integration.id, {
          oauth: await this.encryptTokens(refreshed),
        });
        
        tokens.accessToken = refreshed.accessToken;
      }

      // Sync based on capabilities
      if (integration.capabilities.includes(IntegrationCapability.EMAIL_SYNC)) {
        const emailResult = await this.syncEmails(integration, tokens.accessToken, syncType);
        result.itemsSynced += emailResult.synced;
        result.errors.push(...emailResult.errors);
      }

      if (integration.capabilities.includes(IntegrationCapability.CALENDAR_SYNC)) {
        const calendarResult = await this.syncCalendar(integration, tokens.accessToken, syncType);
        result.itemsSynced += calendarResult.synced;
        result.errors.push(...calendarResult.errors);
      }

      if (integration.capabilities.includes(IntegrationCapability.TASK_SYNC)) {
        const taskResult = await this.syncTasks(integration, tokens.accessToken, syncType);
        result.itemsSynced += taskResult.synced;
        result.errors.push(...taskResult.errors);
      }

      result.completedAt = new Date();
      return result;
    } catch (error: any) {
      this.logger.error(`Sync failed: ${error.message}`);
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
      result.completedAt = new Date();
      return result;
    }
  }

  /**
   * Sync Gmail emails
   */
  private async syncEmails(
    integration: Integration,
    accessToken: string,
    syncType: 'full' | 'incremental',
  ): Promise<{ synced: number; errors: any[] }> {
    const synced = 0;
    const errors: any[] = [];

    try {
      // Get last sync time for incremental sync
      const lastSync = syncType === 'incremental' 
        ? integration.metadata?.lastEmailSync 
        : null;

      const query = lastSync 
        ? `after:${Math.floor(new Date(lastSync).getTime() / 1000)}`
        : 'is:unread';

      // List messages
      const response = await firstValueFrom(
        this.httpService.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            q: query,
            maxResults: 50,
          },
        }),
      );

      // Process messages
      if (response.data.messages) {
        for (const message of response.data.messages) {
          await this.queueService.addEmailProcessingJob({
            type: 'sync_gmail_message',
            integrationId: integration.id,
            messageId: message.id,
            accessToken,
          });
        }
      }

      // Update last sync time
      const currentSettings = integration.metadata || {};
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          settings: {
            ...currentSettings,
            lastEmailSync: new Date(),
          },
        },
      });

      return { synced: response.data.messages?.length || 0, errors };
    } catch (error: any) {
      this.logger.error(`Email sync failed: ${error.message}`);
      errors.push(`Email sync failed: ${error.message}`);
      return { synced, errors };
    }
  }

  /**
   * Sync Google Calendar
   */
  private async syncCalendar(
    integration: Integration,
    accessToken: string,
    syncType: 'full' | 'incremental',
  ): Promise<{ synced: number; errors: any[] }> {
    const synced = 0;
    const errors: any[] = [];

    try {
      const timeMin = syncType === 'incremental' && integration.metadata?.lastCalendarSync
        ? new Date(integration.metadata.lastCalendarSync).toISOString()
        : new Date().toISOString();

      const timeMax = new Date();
      timeMax.setMonth(timeMax.getMonth() + 3); // 3 months ahead

      // List calendar events
      const response = await firstValueFrom(
        this.httpService.get(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: {
              timeMin,
              timeMax: timeMax.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
              maxResults: 100,
            },
          },
        ),
      );

      // Process events
      if (response.data.items) {
        for (const event of response.data.items) {
          await this.queueService.addIntegrationSyncJob({
            type: 'sync_google_event',
            integrationId: integration.id,
            event,
          });
        }
      }

      // Update last sync time
      const currentSettings = integration.metadata || {};
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          settings: {
            ...currentSettings,
            lastCalendarSync: new Date(),
          },
        },
      });

      return { synced: response.data.items?.length || 0, errors };
    } catch (error: any) {
      this.logger.error(`Calendar sync failed: ${error.message}`);
      errors.push(`Calendar sync failed: ${error.message}`);
      return { synced, errors };
    }
  }

  /**
   * Sync Google Tasks
   */
  private async syncTasks(
    integration: Integration,
    accessToken: string,
    syncType: 'full' | 'incremental',
  ): Promise<{ synced: number; errors: any[] }> {
    const synced = 0;
    const errors: any[] = [];

    try {
      // List task lists
      const listsResponse = await firstValueFrom(
        this.httpService.get('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );

      let totalSynced = 0;

      // Sync tasks from each list
      if (listsResponse.data.items) {
        for (const list of listsResponse.data.items) {
          const tasksResponse = await firstValueFrom(
            this.httpService.get(
              `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: {
                  showCompleted: syncType === 'full',
                  maxResults: 100,
                },
              },
            ),
          );

          if (tasksResponse.data.items) {
            for (const task of tasksResponse.data.items) {
              await this.queueService.addIntegrationSyncJob({
                type: 'sync_google_task',
                integrationId: integration.id,
                task: {
                  ...task,
                  listId: list.id,
                  listTitle: list.title,
                },
              });
            }
            totalSynced += tasksResponse.data.items.length;
          }
        }
      }

      // Update last sync time
      const currentSettings = integration.metadata || {};
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          settings: {
            ...currentSettings,
            lastTaskSync: new Date(),
          },
        },
      });

      return { synced: totalSynced, errors };
    } catch (error: any) {
      this.logger.error(`Task sync failed: ${error.message}`);
      errors.push(`Task sync failed: ${error.message}`);
      return { synced, errors };
    }
  }
}