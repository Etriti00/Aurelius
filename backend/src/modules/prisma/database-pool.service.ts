import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import {
  PoolOptimizationResult,
  PoolOptimizationConfig,
  PoolOptimizationRecommendations,
} from '../health/interfaces/health.interface';

/**
 * Database connection pool management service
 * Provides enterprise-grade connection pool monitoring and management
 */
@Injectable()
export class DatabasePoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabasePoolService.name);
  private monitoringInterval?: NodeJS.Timeout;
  private poolStats = {
    created: 0,
    destroyed: 0,
    acquired: 0,
    released: 0,
    pending: 0,
    errors: 0,
    maxPoolSize: 0,
    currentPoolSize: 0,
    idleConnections: 0,
    activeConnections: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService
  ) {}

  async onModuleInit(): Promise<void> {
    const databaseConfig = this.configService.get('database');

    if (databaseConfig?.monitoring?.enabled !== false) {
      this.startPoolMonitoring();
    }

    // Initialize pool statistics
    this.poolStats.maxPoolSize = databaseConfig?.pool?.max || 20;

    this.logger.log('Database pool service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.logger.log('Database pool service destroyed');
  }

  /**
   * Start pool monitoring with regular statistics collection
   */
  private startPoolMonitoring(): void {
    const monitoringInterval = 60000; // 1 minute

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectPoolStatistics();
        this.logPoolStatistics();
      } catch (error) {
        this.logger.error('Failed to collect pool statistics', error);
      }
    }, monitoringInterval);

    this.logger.log(`Pool monitoring started (interval: ${monitoringInterval}ms)`);
  }

  /**
   * Collect current pool statistics
   */
  private async collectPoolStatistics(): Promise<void> {
    try {
      // Get current connection metrics from Prisma service
      const prismaMetrics = this.prismaService.getConnectionMetrics();

      // Update pool statistics
      this.poolStats.activeConnections = prismaMetrics.activeConnections;
      this.poolStats.errors = prismaMetrics.errors;

      // Get PostgreSQL connection statistics
      const connectionStats = await this.getPostgreSQLConnectionStats();
      if (connectionStats) {
        this.poolStats.currentPoolSize = connectionStats.totalConnections;
        this.poolStats.idleConnections = connectionStats.idleConnections;
      }
    } catch (error) {
      this.logger.debug('Could not collect all pool statistics', error);
    }
  }

  /**
   * Get PostgreSQL connection statistics
   */
  private async getPostgreSQLConnectionStats(): Promise<{
    totalConnections: number;
    idleConnections: number;
    activeConnections: number;
  } | null> {
    try {
      const result = await this.prismaService.$queryRaw<
        Array<{
          total: number;
          idle: number;
          active: number;
        }>
      >`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE state = 'idle') as idle,
          COUNT(*) FILTER (WHERE state = 'active') as active
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      if (result && result.length > 0) {
        return {
          totalConnections: Number(result[0].total),
          idleConnections: Number(result[0].idle),
          activeConnections: Number(result[0].active),
        };
      }
    } catch (error) {
      this.logger.debug('Could not fetch PostgreSQL connection stats', error);
    }

    return null;
  }

  /**
   * Log pool statistics for monitoring
   */
  private logPoolStatistics(): void {
    const utilizationPercentage =
      (this.poolStats.currentPoolSize / this.poolStats.maxPoolSize) * 100;

    this.logger.log('Database Pool Statistics', {
      maxPoolSize: this.poolStats.maxPoolSize,
      currentPoolSize: this.poolStats.currentPoolSize,
      activeConnections: this.poolStats.activeConnections,
      idleConnections: this.poolStats.idleConnections,
      utilizationPercentage: utilizationPercentage.toFixed(2) + '%',
      totalErrors: this.poolStats.errors,
    });

    // Warn if pool utilization is high
    if (utilizationPercentage > 80) {
      this.logger.warn(`High database pool utilization: ${utilizationPercentage.toFixed(2)}%`);
    }

    // Warn if there are too many errors
    if (this.poolStats.errors > 10) {
      this.logger.warn(`High number of database errors: ${this.poolStats.errors}`);
    }
  }

  /**
   * Get current pool statistics
   */
  getPoolStatistics(): typeof this.poolStats {
    return { ...this.poolStats };
  }

  /**
   * Get pool health status
   */
  async getPoolHealth(): Promise<{
    isHealthy: boolean;
    utilizationPercentage: number;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const utilizationPercentage =
      (this.poolStats.currentPoolSize / this.poolStats.maxPoolSize) * 100;

    // Check for high utilization
    if (utilizationPercentage > 90) {
      issues.push('Pool utilization is critically high (>90%)');
      recommendations.push('Consider increasing max pool size or optimizing query performance');
    } else if (utilizationPercentage > 80) {
      issues.push('Pool utilization is high (>80%)');
      recommendations.push('Monitor connection usage and consider optimization');
    }

    // Check for high error rate
    if (this.poolStats.errors > 20) {
      issues.push('High number of database errors detected');
      recommendations.push('Review database logs and optimize queries');
    }

    // Check if database is responsive
    const isDatabaseHealthy = await this.prismaService.healthCheck();
    if (!isDatabaseHealthy) {
      issues.push('Database health check failed');
      recommendations.push('Check database connectivity and performance');
    }

    const isHealthy = issues.length === 0 && isDatabaseHealthy;

    return {
      isHealthy,
      utilizationPercentage,
      issues,
      recommendations,
    };
  }

  /**
   * Execute a database operation with pool monitoring
   */
  async executeWithPoolMonitoring<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    this.poolStats.acquired++;

    try {
      const result = await this.prismaService.executeWithMonitoring(operation, operationName);
      return result;
    } catch (error) {
      this.poolStats.errors++;
      throw error;
    } finally {
      this.poolStats.released++;

      const duration = Date.now() - startTime;
      if (duration > 5000) {
        // 5 seconds
        this.logger.warn(`Long-running database operation: ${operationName} took ${duration}ms`);
      }
    }
  }

  /**
   * Optimize pool configuration based on current usage patterns
   */
  async optimizePoolConfiguration(): Promise<PoolOptimizationResult> {
    const databaseConfig = this.configService.get('database');
    const currentConfig = databaseConfig?.pool;

    // Analyze usage patterns
    const avgUtilization = (this.poolStats.currentPoolSize / this.poolStats.maxPoolSize) * 100;

    let recommendations: PoolOptimizationRecommendations = {};
    const optimizedConfig: PoolOptimizationConfig = { ...currentConfig };

    // Recommend pool size adjustments
    if (avgUtilization > 85) {
      recommendations = {
        ...recommendations,
        poolSize: 'Consider increasing max pool size for better performance',
      };
      optimizedConfig.max = Math.min(currentConfig.max * 1.5, 50); // Cap at 50
    } else if (avgUtilization < 30) {
      recommendations = {
        ...recommendations,
        poolSize: 'Consider decreasing max pool size to reduce resource usage',
      };
      optimizedConfig.max = Math.max(currentConfig.max * 0.8, 5); // Minimum of 5
    }

    // Recommend timeout adjustments based on error patterns
    if (this.poolStats.errors > 0) {
      recommendations = {
        ...recommendations,
        timeouts: 'Consider increasing timeout values to reduce connection errors',
      };
      optimizedConfig.connectionTimeoutMillis = currentConfig.connectionTimeoutMillis * 1.2;
      optimizedConfig.acquireTimeoutMillis = currentConfig.acquireTimeoutMillis * 1.2;
    }

    return {
      currentConfig,
      recommendations,
      optimizedConfig,
    };
  }

  /**
   * Reset pool statistics (useful for testing or after configuration changes)
   */
  resetPoolStatistics(): void {
    this.poolStats = {
      created: 0,
      destroyed: 0,
      acquired: 0,
      released: 0,
      pending: 0,
      errors: 0,
      maxPoolSize: this.poolStats.maxPoolSize,
      currentPoolSize: 0,
      idleConnections: 0,
      activeConnections: 0,
    };

    this.logger.log('Pool statistics reset');
  }
}
