import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheckResult } from '../services/health-check.service';
import { MetricsService } from '../services/metrics.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly metricsService: MetricsService
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Comprehensive health check including database, Redis, and system resources',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'healthy', responseTime: 45 },
          redis: { status: 'healthy', responseTime: 12 },
          memory: { status: 'healthy', responseTime: 2 },
          disk: { status: 'healthy', responseTime: 8 },
        },
        details: {
          database: { status: 'healthy', responseTime: 45, userCount: 150 },
          redis: { status: 'healthy', responseTime: 12, connectionStatus: 'connected' },
          memory: { status: 'healthy', responseTime: 2, heapUsed: '45MB' },
          disk: { status: 'healthy', responseTime: 8 },
        },
        timestamp: '2024-12-29T10:30:00.000Z',
        uptime: 3600000,
        version: '1.0.0',
        environment: 'production',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'System is unhealthy',
    schema: {
      example: {
        status: 'error',
        error: {
          database: { message: 'Connection timeout', timestamp: '2024-12-29T10:30:00.000Z' },
        },
        details: {
          database: { message: 'Connection timeout' },
          redis: { status: 'healthy', responseTime: 12 },
        },
        timestamp: '2024-12-29T10:30:00.000Z',
        uptime: 3600000,
        version: '1.0.0',
        environment: 'production',
      },
    },
  })
  async healthCheck(): Promise<HealthCheckResult> {
    const result = await this.healthCheckService.check();

    // Set appropriate HTTP status code based on health
    if (result.status === 'error') {
      // NestJS will automatically set 503 status for health check failures
      throw new Error('Health check failed');
    }

    return result;
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Kubernetes readiness probe - checks if application is ready to receive traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
    schema: {
      example: {
        status: 'ready',
        timestamp: '2024-12-29T10:30:00.000Z',
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  async readinessProbe(): Promise<Record<string, unknown>> {
    try {
      // Check critical dependencies for readiness
      const databaseHealth = this.healthCheckService.getComponentHealth('database');
      const redisHealth = this.healthCheckService.getComponentHealth('redis');

      const checks = {
        database: databaseHealth?.status === 'healthy' ? 'ok' : 'failed',
        redis: redisHealth?.status === 'healthy' ? 'ok' : 'failed',
      };

      const isReady = Object.values(checks).every(status => status === 'ok');

      if (!isReady) {
        throw new Error('Application not ready');
      }

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks,
      };
    } catch (error) {
      throw new Error('Readiness check failed');
    }
  }

  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Kubernetes liveness probe - checks if application is alive and should not be restarted',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      example: {
        status: 'alive',
        timestamp: '2024-12-29T10:30:00.000Z',
        uptime: '1h 30m 45s',
        pid: 12345,
      },
    },
  })
  async livenessProbe(): Promise<Record<string, unknown>> {
    // Simple liveness check - if we can respond, we're alive
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: this.healthCheckService.getUptime(),
      pid: process.pid,
    };
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health information',
    description: 'Comprehensive health information including component history and metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information retrieved successfully',
  })
  async detailedHealth(): Promise<Record<string, unknown>> {
    const healthResult = await this.healthCheckService.check();
    const allComponentHealth = this.healthCheckService.getAllComponentHealth();
    const systemMetrics = this.metricsService.getSystemMetrics();

    return {
      ...healthResult,
      components: allComponentHealth,
      systemMetrics,
      componentHistory: {
        database: this.healthCheckService.getHealthHistory('database', 10),
        redis: this.healthCheckService.getHealthHistory('redis', 10),
        memory: this.healthCheckService.getHealthHistory('memory', 10),
        disk: this.healthCheckService.getHealthHistory('disk', 10),
      },
    };
  }
}
