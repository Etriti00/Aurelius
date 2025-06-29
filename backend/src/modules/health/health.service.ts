import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    services: Record<string, { status: string; responseTime?: number; error?: string }>;
    version: string;
  }> {
    const timestamp = new Date().toISOString();

    const databaseStart = Date.now();
    const databaseHealthy = await this.checkDatabase();
    const databaseResponseTime = Date.now() - databaseStart;

    const services = {
      database: {
        status: databaseHealthy ? 'healthy' : 'unhealthy',
        responseTime: databaseResponseTime,
        ...(databaseHealthy ? {} : { error: 'Database connection failed' }),
      },
      // Add other service checks here
    };

    const allHealthy = Object.values(services).every(service => service.status === 'healthy');

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
