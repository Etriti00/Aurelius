import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserIntegrations(userId: string): Promise<any[]> {
    return this.prisma.integration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        syncError: true,
        settings: true,
        createdAt: true,
      },
    });
  }

  async getIntegrationStatus(userId: string, provider: string): Promise<any> {
    return this.prisma.integration.findFirst({
      where: { userId, provider },
      select: {
        id: true,
        provider: true,
        status: true,
        lastSyncAt: true,
        syncError: true,
      },
    });
  }

  // Placeholder for integration management methods
  async connectIntegration(userId: string, provider: string, credentials: any): Promise<any> {
    // Implementation will be added when creating specific integrations
    // Parameters are required for interface but not yet implemented
    return { 
      message: `${provider} integration setup initiated`,
      userId: userId,
      hasCredentials: !!credentials
    };
  }

  async disconnectIntegration(userId: string, provider: string): Promise<any> {
    const integration = await this.prisma.integration.findFirst({
      where: { userId, provider },
    });

    if (integration) {
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'PAUSED' },
      });
    }

    return { message: `${provider} integration disconnected` };
  }
}