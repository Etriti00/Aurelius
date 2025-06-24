import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
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
      // Remove query logging to avoid TypeScript issues with events
      this.logger.debug('Prisma connected in development mode');
    }

    // Remove event handlers that cause TypeScript compilation issues
    this.logger.log('Prisma service initialized');

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

  async cleanDatabase(): Promise<void> {
    // Only allow in test environment
    if (this.configService.get('NODE_ENV') !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }

    try {
      // Delete in correct order to respect foreign key constraints
      await this.$transaction([
        this.actionLog.deleteMany(),
        this.usage.deleteMany(),
        this.workflowExecution.deleteMany(),
        this.workflowTrigger.deleteMany(),
        this.workflow.deleteMany(),
        this.calendarEvent.deleteMany(),
        this.emailThread.deleteMany(),
        this.task.deleteMany(),
        this.integration.deleteMany(),
        this.vectorEmbedding.deleteMany(),
        this.notification.deleteMany(),
        this.refreshToken.deleteMany(),
        this.subscription.deleteMany(),
        this.user.deleteMany(),
      ]);
      this.logger.debug('Database cleaned for testing');
    } catch (error) {
      this.logger.error('Failed to clean database', error);
      throw error;
    }
  }
}
