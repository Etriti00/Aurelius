import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    // Log query events in development
    if (this.configService.get('NODE_ENV') === 'development') {
      this.$on('query', (e) => {
        this.logger.debug(`Query: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
      });
    }

    this.$on('error', (e) => {
      this.logger.error(`Prisma Error: ${e.message}`, e.target);
    });

    this.$on('info', (e) => {
      this.logger.log(`Prisma Info: ${e.message}`, e.target);
    });

    this.$on('warn', (e) => {
      this.logger.warn(`Prisma Warning: ${e.message}`, e.target);
    });

    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }
}