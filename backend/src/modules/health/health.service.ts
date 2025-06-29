import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabasePoolService } from '../prisma/database-pool.service';
import {
  HealthResponse,
  DetailedMetrics,
  PoolOptimizationResult,
  DatabaseStatus,
} from './interfaces/health.interface';

/**
 * Enhanced health service with comprehensive database pool monitoring
 * Provides detailed health status including connection pool metrics
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly databasePool: DatabasePoolService
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();

    // Database health check with detailed information
    const databaseStart = Date.now();
    const databaseStatus = await this.checkDatabaseWithDetails();
    const databaseResponseTime = Date.now() - databaseStart;

    // Database pool health check
    const poolHealth = await this.databasePool.getPoolHealth();

    const services = {
      database: {
        status: databaseStatus.isConnected ? 'healthy' : 'unhealthy',
        responseTime: databaseResponseTime,
        version: databaseStatus.serverVersion,
        ...(databaseStatus.isConnected ? {} : { error: 'Database connection failed' }),
      },
      connectionPool: {
        status: poolHealth.isHealthy ? 'healthy' : 'warning',
        utilizationPercentage: poolHealth.utilizationPercentage,
        issues: poolHealth.issues,
        recommendations: poolHealth.recommendations,
      },
      // Add other service checks here
    };

    // Determine overall status
    const hasUnhealthyServices = Object.values(services).some(
      service => service.status === 'unhealthy'
    );
    const hasWarnings = Object.values(services).some(service => service.status === 'warning');

    let overallStatus = 'healthy';
    if (hasUnhealthyServices) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp,
      services,
      version: '1.0.0',
      database: {
        connectionPool: this.databasePool.getPoolStatistics(),
        metrics: this.prisma.getConnectionMetrics(),
      },
    };
  }

  /**
   * Comprehensive database health check with detailed information
   */
  private async checkDatabaseWithDetails(): Promise<DatabaseStatus> {
    try {
      const status = await this.prisma.getDatabaseStatus();
      return status;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        isConnected: false,
        metrics: {
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
          slowQueries: 0,
          errors: 0,
          lastHealthCheck: new Date(),
        },
      };
    }
  }

  /**
   * Get detailed system metrics for monitoring
   */
  async getDetailedMetrics(): Promise<DetailedMetrics> {
    try {
      const [databaseStatus, poolStats, connectionMetrics, poolHealth] = await Promise.all([
        this.prisma.getDatabaseStatus(),
        this.databasePool.getPoolStatistics(),
        this.prisma.getConnectionMetrics(),
        this.databasePool.getPoolHealth(),
      ]);

      return {
        database: {
          status: databaseStatus,
          poolStats,
          connectionMetrics,
          poolHealth,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get detailed metrics', error);
      throw error;
    }
  }

  /**
   * Get pool optimization recommendations
   */
  async getPoolOptimizationRecommendations(): Promise<PoolOptimizationResult> {
    try {
      return await this.databasePool.optimizePoolConfiguration();
    } catch (error) {
      this.logger.error('Failed to get pool optimization recommendations', error);
      throw error;
    }
  }
}
