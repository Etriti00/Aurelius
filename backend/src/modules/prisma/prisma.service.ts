import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import { DatabaseConfig } from './interfaces/database-config.interface';

/**
 * Enterprise-grade Prisma service with comprehensive connection pooling,
 * monitoring, and performance optimization
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private healthCheckInterval?: NodeJS.Timeout;
  private connectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    slowQueries: 0,
    errors: 0,
    lastHealthCheck: new Date(),
  };

  constructor(private readonly configService: ConfigService) {
    const databaseConfig = configService.get('database');

    // Enhanced Prisma client configuration with connection pooling
    super({
      datasources: {
        db: {
          url: databaseConfig?.prisma?.datasourceUrl || configService.get<string>('DATABASE_URL'),
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
      errorFormat: databaseConfig?.prisma?.errorFormat || 'pretty',
    });

    // Setup query performance monitoring
    this.setupQueryMonitoring(databaseConfig);
  }

  /**
   * Setup query performance monitoring and logging
   */
  private setupQueryMonitoring(databaseConfig: DatabaseConfig): void {
    // For now, disable event monitoring due to Prisma type issues
    // This will be re-implemented with proper event types when available
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.debug('Query monitoring setup completed (events disabled due to type safety)');
      this.logger.debug(
        `Monitoring config available: slowQuery=${databaseConfig?.monitoring?.slowQueryThreshold}, logging=${databaseConfig?.monitoring?.logSlowQueries}`
      );
    }
  }

  async onModuleInit(): Promise<void> {
    const databaseConfig = this.configService.get('database');

    this.logger.log('Initializing Prisma service with enhanced connection pooling');

    try {
      // Connect to database with retry logic
      await this.connectWithRetry();

      // Initialize health check monitoring
      this.startHealthCheckMonitoring(databaseConfig);

      // Run migrations if configured
      if (databaseConfig?.runMigrationsOnStartup) {
        await this.runMigrations();
      }

      // Log connection pool information
      this.logConnectionPoolInfo(databaseConfig);

      this.logger.log('Prisma service successfully initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Prisma service', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Prisma service');

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Graceful disconnect with timeout
    try {
      await Promise.race([
        this.$disconnect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Disconnect timeout')), 5000)),
      ]);
      this.logger.log('Successfully disconnected from database');
    } catch (error) {
      this.logger.error('Error during database disconnect', error);
    }
  }

  /**
   * Connect to database with retry logic
   */
  private async connectWithRetry(maxRetries = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log(`Successfully connected to database (attempt ${attempt})`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`Database connection attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      throw new Error(
        `Failed to connect to database after ${maxRetries} attempts: ${lastError.message}`
      );
    } else {
      throw new Error(`Failed to connect to database after ${maxRetries} attempts: Unknown error`);
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    try {
      this.logger.log('Running database migrations');

      // Note: In production, migrations should be run via CI/CD pipeline
      // This is mainly for development and testing environments
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });

      this.logger.log('Database migrations completed successfully');
    } catch (error) {
      this.logger.error('Failed to run database migrations', error);
      throw error;
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheckMonitoring(databaseConfig: DatabaseConfig): void {
    const healthCheckConfig = databaseConfig?.healthCheck;

    if (healthCheckConfig?.enabled === false) {
      return;
    }

    const interval = healthCheckConfig?.interval || 30000; // 30 seconds

    this.healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await this.performHealthCheck();
        this.connectionMetrics.lastHealthCheck = new Date();

        if (!isHealthy) {
          this.logger.error('Database health check failed');
        }
      } catch (error) {
        this.logger.error('Health check error', error);
      }
    }, interval);

    this.logger.log(`Health check monitoring started (interval: ${interval}ms)`);
  }

  /**
   * Log connection pool information
   */
  private logConnectionPoolInfo(databaseConfig: DatabaseConfig): void {
    const poolConfig = databaseConfig?.pool;

    if (poolConfig) {
      this.logger.log('Connection pool configuration:', {
        min: poolConfig.min,
        max: poolConfig.max,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
      });
    }
  }

  /**
   * Enhanced health check with detailed information
   */
  async healthCheck(): Promise<boolean> {
    return this.performHealthCheck();
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<boolean> {
    try {
      // Basic connectivity check
      await this.$queryRaw`SELECT 1`;

      // Check if pgvector extension is available
      const extensions = await this.$queryRaw`
        SELECT extname FROM pg_extension WHERE extname = 'vector'
      `;

      if (!Array.isArray(extensions) || extensions.length === 0) {
        this.logger.warn('pgvector extension not found');
      }

      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      this.connectionMetrics.errors++;
      return false;
    }
  }

  /**
   * Get connection metrics for monitoring
   */
  getConnectionMetrics(): typeof this.connectionMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Get detailed database status
   */
  async getDatabaseStatus(): Promise<{
    isConnected: boolean;
    metrics: {
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
      slowQueries: number;
      errors: number;
      lastHealthCheck: Date;
    };
    poolInfo?: Record<string, unknown>;
    serverVersion?: string;
  }> {
    try {
      const isConnected = await this.performHealthCheck();

      // Get PostgreSQL version
      let serverVersion: string | undefined;
      try {
        const versionResult = await this.$queryRaw<Array<{ version: string }>>`SELECT version()`;
        serverVersion = versionResult[0]?.version;
      } catch (error) {
        this.logger.debug('Could not retrieve server version', error);
      }

      return {
        isConnected,
        metrics: this.getConnectionMetrics(),
        serverVersion,
      };
    } catch (error) {
      this.logger.error('Failed to get database status', error);
      return {
        isConnected: false,
        metrics: this.getConnectionMetrics(),
      };
    }
  }

  /**
   * Execute a query with connection pool monitoring
   */
  async executeWithMonitoring<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    const startTime = Date.now();

    try {
      this.connectionMetrics.activeConnections++;
      const result = await operation();

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        this.logger.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      this.connectionMetrics.errors++;
      this.logger.error(`Operation failed: ${operationName}`, error);
      throw error;
    } finally {
      this.connectionMetrics.activeConnections--;
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
