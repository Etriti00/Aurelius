import { Injectable, Logger } from '@nestjs/common';
import { HealthCheck, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { RedisService } from '../../modules/cache/services/redis.service';

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'shutting_down';
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details: Record<string, unknown>;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  errorCount: number;
  details: Record<string, unknown>;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly healthHistory = new Map<string, ComponentHealth[]>();
  private readonly componentStatus = new Map<string, ComponentHealth>();
  private readonly startTime = Date.now();

  constructor(
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly diskHealthIndicator: DiskHealthIndicator,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  /**
   * Perform comprehensive health check
   */
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    try {
      const healthChecks = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkMemory(),
        this.checkDisk(),
        this.checkExternalServices(),
      ]);

      const results = healthChecks.map((result, index) => {
        const componentNames = ['database', 'redis', 'memory', 'disk', 'external'];
        return {
          component: componentNames[index],
          status: result.status,
          value: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason : null,
        };
      });

      const hasErrors = results.some(r => r.status === 'rejected');
      const hasDegraded = results.some(r => r.value?.status === 'degraded');

      let overallStatus: 'ok' | 'error' | 'shutting_down' = 'ok';
      if (hasErrors) {
        overallStatus = 'error';
      } else if (hasDegraded) {
        overallStatus = 'error'; // Treat degraded as error for health check
      }

      const info: Record<string, unknown> = {};
      const error: Record<string, unknown> = {};
      const details: Record<string, unknown> = {};

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          info[result.component] = result.value;
          details[result.component] = result.value;
        } else if (result.error) {
          error[result.component] = {
            message: result.error.message || 'Health check failed',
            timestamp: new Date().toISOString(),
          };
          details[result.component] = error[result.component];
        }
      });

      const healthResult: HealthCheckResult = {
        status: overallStatus,
        info: Object.keys(info).length > 0 ? info : undefined,
        error: Object.keys(error).length > 0 ? error : undefined,
        details,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.configService.get<string>('app.version') || '1.0.0',
        environment: this.configService.get<string>('NODE_ENV') || 'development',
      };

      // Update component status tracking
      this.updateComponentStatus(results);

      if (overallStatus === 'error') {
        this.logger.error('Health check failed', { results: error });
      } else {
        this.logger.debug('Health check completed successfully');
      }

      return healthResult;
    } catch (error) {
      this.logger.error('Health check service failed:', error);
      return {
        status: 'error',
        error: {
          service: {
            message: 'Health check service failure',
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
          },
        },
        details: {
          service: {
            message: 'Health check service failure',
            error: (error as Error).message,
          },
        },
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.configService.get<string>('app.version') || '1.0.0',
        environment: this.configService.get<string>('NODE_ENV') || 'development',
      };
    }
  }

  /**
   * Get component health status
   */
  getComponentHealth(component: string): ComponentHealth | null {
    return this.componentStatus.get(component) || null;
  }

  /**
   * Get all component health statuses
   */
  getAllComponentHealth(): Record<string, ComponentHealth> {
    return Object.fromEntries(this.componentStatus);
  }

  /**
   * Get health history for a component
   */
  getHealthHistory(component: string, limit = 50): ComponentHealth[] {
    const history = this.healthHistory.get(component) || [];
    return history.slice(-limit);
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      // Test more complex query with timeout
      const userCount = await this.prisma.user.count();

      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (responseTime > 1000) {
        status = 'degraded';
      } else if (responseTime > 2000) {
        status = 'unhealthy';
      }

      return {
        status,
        responseTime,
        lastCheck: new Date(),
        errorCount: 0,
        details: {
          userCount,
          connectionStatus: 'connected',
          queryTime: responseTime,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Database health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        errorCount: 1,
        details: {
          error: (error as Error).message,
          connectionStatus: 'failed',
        },
      };
    }
  }

  /**
   * Check Redis connectivity and performance
   */
  private async checkRedis(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Test Redis connectivity with ping
      const testKey = `health-check:${Date.now()}`;
      const testValue = 'ping';

      await this.redis.getClient().set(testKey, testValue, 'EX', 10); // 10 second expiry
      const retrievedValue = await this.redis.getClient().get(testKey);
      await this.redis.getClient().del(testKey);

      const responseTime = Date.now() - startTime;

      if (retrievedValue !== testValue) {
        throw new Error('Redis ping test failed: value mismatch');
      }

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (responseTime > 100) {
        status = 'degraded';
      } else if (responseTime > 500) {
        status = 'unhealthy';
      }

      // Get Redis info
      const redisInfo = await this.redis.getClient().info('memory');
      const memoryInfo = this.parseRedisInfo(redisInfo);

      return {
        status,
        responseTime,
        lastCheck: new Date(),
        errorCount: 0,
        details: {
          connectionStatus: 'connected',
          pingTime: responseTime,
          memoryUsed: memoryInfo.used_memory_human || 'unknown',
          connectedClients: memoryInfo.connected_clients || 'unknown',
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Redis health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        errorCount: 1,
        details: {
          error: (error as Error).message,
          connectionStatus: 'failed',
        },
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      await this.memoryHealthIndicator.checkHeap('memory', 1024 * 1024 * 1024); // 1GB threshold
      const responseTime = Date.now() - startTime;

      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const externalMB = Math.round(memUsage.external / 1024 / 1024);

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      if (heapUsagePercent > 85) {
        status = 'unhealthy';
      } else if (heapUsagePercent > 70) {
        status = 'degraded';
      }

      return {
        status,
        responseTime,
        lastCheck: new Date(),
        errorCount: 0,
        details: {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          external: `${externalMB}MB`,
          heapUsagePercent: Math.round(heapUsagePercent),
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Memory health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        errorCount: 1,
        details: {
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * Check disk usage
   */
  private async checkDisk(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      const diskResult = await this.diskHealthIndicator.checkStorage('disk', {
        path: '/',
        thresholdPercent: 80, // 80% threshold
      });

      const responseTime = Date.now() - startTime;

      // Extract disk usage info
      const diskInfo = diskResult.disk;
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (diskInfo && typeof diskInfo === 'object' && 'status' in diskInfo) {
        if (diskInfo.status === 'down') {
          status = 'unhealthy';
        }
      }

      return {
        status,
        responseTime,
        lastCheck: new Date(),
        errorCount: 0,
        details: diskInfo || { message: 'Disk check completed' },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Disk health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        errorCount: 1,
        details: {
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * Check external services (AI Gateway, etc.)
   */
  private async checkExternalServices(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // For now, just return healthy since we don't have external service checks implemented
      // In a real implementation, this would check:
      // - AI Gateway connectivity
      // - OAuth provider endpoints
      // - Email service
      // - Other critical external dependencies

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        errorCount: 0,
        details: {
          message: 'External services check not implemented',
          services: {
            aiGateway: 'not_checked',
            oauthProviders: 'not_checked',
            emailService: 'not_checked',
          },
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('External services health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        errorCount: 1,
        details: {
          error: (error as Error).message,
        },
      };
    }
  }

  /**
   * Update component status tracking
   */
  private updateComponentStatus(
    results: Array<{ component: string; status: string; value: ComponentHealth | null }>
  ): void {
    results.forEach(result => {
      if (result.value) {
        // Update current status
        this.componentStatus.set(result.component, result.value);

        // Update history
        let history = this.healthHistory.get(result.component) || [];
        history.push(result.value);

        // Keep only last 100 entries
        if (history.length > 100) {
          history = history.slice(-100);
        }

        this.healthHistory.set(result.component, history);
      }
    });
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};

    info.split('\r\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    });

    return result;
  }

  /**
   * Get system uptime in human readable format
   */
  getUptime(): string {
    const uptimeMs = Date.now() - this.startTime;
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
