import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    services: Record<string, boolean>;
    version: string;
  }> {
    const timestamp = new Date().toISOString();

    const services = {
      database: await this.checkDatabase(),
      // Add other service checks here
    };

    const allHealthy = Object.values(services).every(Boolean);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp,
      services,
      version: '1.0.0',
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }
}
