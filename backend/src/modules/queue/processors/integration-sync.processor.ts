import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { IntegrationSyncJobData } from '../interfaces/queue-job-data.interface';

@Processor('integrations')
@Injectable()
export class IntegrationSyncProcessor {
  private readonly logger = new Logger(IntegrationSyncProcessor.name);

  @Process('sync')
  async handleSync(job: Job<IntegrationSyncJobData>) {
    const { integrationId, provider, syncType, direction, filters, metadata } = job.data;

    try {
      // TODO: Implement integration sync logic
      this.logger.log(`Syncing integration ${integrationId}`, {
        provider,
        syncType,
        direction,
      });

      // Mark remaining as intentionally unused for TODO implementation
      void filters;
      void metadata;

      return { success: true, syncedAt: new Date() };
    } catch (error) {
      this.logger.error('Failed to sync integration:', error);
      throw error;
    }
  }
}
