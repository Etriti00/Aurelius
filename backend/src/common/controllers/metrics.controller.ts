import { Controller, Get, Header, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import {
  MetricsService,
  SystemMetrics,
  CounterMetric,
  HistogramMetric,
} from '../services/metrics.service';

@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint() // Exclude from Swagger as it returns plain text
  async getPrometheusMetrics(): Promise<string> {
    return this.metricsService.getPrometheusMetrics();
  }

  @Get('json')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get metrics in JSON format',
    description: 'Retrieve application metrics in JSON format for debugging and monitoring',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    schema: {
      example: {
        counters: [
          {
            name: 'http_requests_total',
            count: 1250,
            labels: { method: 'GET', status: '200' },
            lastUpdated: '2024-12-29T10:30:00.000Z',
          },
        ],
        gauges: [
          {
            name: 'process_memory_usage_bytes',
            value: 104857600,
            labels: {},
            lastUpdated: '2024-12-29T10:30:00.000Z',
          },
        ],
        histograms: [
          {
            name: 'http_request_duration_seconds',
            buckets: { '0.1': 800, '0.25': 1200, '0.5': 1250 },
            count: 1250,
            sum: 156.78,
            average: 0.125,
            labels: { method: 'GET' },
            lastUpdated: '2024-12-29T10:30:00.000Z',
          },
        ],
        system: {
          timestamp: '2024-12-29T10:30:00.000Z',
          cpu: { usage: 0.15, loadAverage: [0.8, 0.9, 1.1] },
          memory: {
            used: 104857600,
            total: 536870912,
            percentage: 19.5,
            heapUsed: 89128960,
            heapTotal: 134217728,
            external: 2097152,
            rss: 167772160,
          },
          process: {
            uptime: 3600,
            pid: 12345,
            version: 'v18.17.0',
            activeHandles: 15,
            activeRequests: 3,
          },
          http: {
            totalRequests: 1250,
            activeConnections: 8,
            requestsPerSecond: 0.35,
            averageResponseTime: 125.4,
          },
        },
        lastUpdated: '2024-12-29T10:30:00.000Z',
      },
    },
  })
  async getJsonMetrics(): Promise<Record<string, unknown>> {
    return this.metricsService.getMetricsSummary();
  }

  @Get('system')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get system metrics',
    description:
      'Retrieve detailed system resource metrics including CPU, memory, and process information',
  })
  @ApiResponse({
    status: 200,
    description: 'System metrics retrieved successfully',
  })
  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.metricsService.getSystemMetrics();
  }

  @Get('http')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get HTTP metrics',
    description: 'Retrieve HTTP request metrics including response times and error rates',
  })
  @ApiResponse({
    status: 200,
    description: 'HTTP metrics retrieved successfully',
    schema: {
      example: {
        totalRequests: 1250,
        requestsByMethod: {
          GET: 850,
          POST: 300,
          PUT: 75,
          DELETE: 25,
        },
        requestsByStatus: {
          '200': 1150,
          '201': 80,
          '400': 15,
          '404': 3,
          '500': 2,
        },
        responseTimePercentiles: {
          p50: 95,
          p90: 180,
          p95: 250,
          p99: 400,
        },
        errorRate: 0.016,
        averageResponseTime: 125.4,
        requestsPerSecond: 0.35,
        lastUpdated: '2024-12-29T10:30:00.000Z',
      },
    },
  })
  async getHttpMetrics(): Promise<Record<string, unknown>> {
    const summary = this.metricsService.getMetricsSummary();
    const systemMetrics = this.metricsService.getSystemMetrics();

    // Extract HTTP-specific metrics from counters and histograms
    const counters = Array.isArray(summary.counters) ? summary.counters : [];

    const httpCounters = counters.filter((counter: CounterMetric) =>
      counter.name.startsWith('http_')
    );

    // Aggregate HTTP metrics
    const requestsByMethod: Record<string, number> = {};
    const requestsByStatus: Record<string, number> = {};
    let totalRequests = 0;
    let totalErrors = 0;

    for (const counter of httpCounters) {
      if (counter.name === 'http_requests_total') {
        totalRequests += counter.count;

        if (counter.labels.method) {
          requestsByMethod[counter.labels.method] =
            (requestsByMethod[counter.labels.method] || 0) + counter.count;
        }

        if (counter.labels.status) {
          requestsByStatus[counter.labels.status] =
            (requestsByStatus[counter.labels.status] || 0) + counter.count;

          // Count errors (4xx and 5xx)
          const status = parseInt(counter.labels.status);
          if (status >= 400) {
            totalErrors += counter.count;
          }
        }
      }
    }

    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      totalRequests,
      requestsByMethod,
      requestsByStatus,
      errorRate: Math.round(errorRate * 1000) / 1000, // Round to 3 decimal places
      averageResponseTime: systemMetrics.http.averageResponseTime,
      requestsPerSecond: systemMetrics.http.requestsPerSecond,
      activeConnections: systemMetrics.http.activeConnections,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('database')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get database metrics',
    description:
      'Retrieve database operation metrics including query performance and connection stats',
  })
  @ApiResponse({
    status: 200,
    description: 'Database metrics retrieved successfully',
  })
  async getDatabaseMetrics(): Promise<Record<string, unknown>> {
    const summary = this.metricsService.getMetricsSummary();

    // Extract database-specific metrics
    const counters = Array.isArray(summary.counters) ? summary.counters : [];
    const histograms = Array.isArray(summary.histograms) ? summary.histograms : [];

    const dbCounters = counters.filter((counter: CounterMetric) => counter.name.startsWith('db_'));

    const dbHistograms = histograms.filter((histogram: HistogramMetric) =>
      histogram.name.startsWith('db_')
    );

    // Aggregate database metrics
    const operationsByType: Record<string, number> = {};
    const operationsByTable: Record<string, number> = {};
    let totalOperations = 0;
    let totalErrors = 0;

    for (const counter of dbCounters) {
      if (counter.name === 'db_operations_total') {
        totalOperations += counter.count;

        if (counter.labels.operation) {
          operationsByType[counter.labels.operation] =
            (operationsByType[counter.labels.operation] || 0) + counter.count;
        }

        if (counter.labels.table) {
          operationsByTable[counter.labels.table] =
            (operationsByTable[counter.labels.table] || 0) + counter.count;
        }

        if (counter.labels.status === 'error') {
          totalErrors += counter.count;
        }
      }
    }

    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

    // Calculate average operation duration
    const durationHistogram = dbHistograms.find(
      (h: HistogramMetric) => h.name === 'db_operation_duration_seconds'
    );

    const averageDuration = durationHistogram?.average
      ? durationHistogram.average * 1000 // Convert to milliseconds
      : 0;

    return {
      totalOperations,
      operationsByType,
      operationsByTable,
      errorRate: Math.round(errorRate * 1000) / 1000,
      averageDurationMs: Math.round(averageDuration * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Get('ai')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get AI operation metrics',
    description: 'Retrieve AI operation metrics including token usage, costs, and response times',
  })
  @ApiResponse({
    status: 200,
    description: 'AI metrics retrieved successfully',
  })
  async getAiMetrics(): Promise<Record<string, unknown>> {
    const summary = this.metricsService.getMetricsSummary();

    // Extract AI-specific metrics
    const counters = Array.isArray(summary.counters) ? summary.counters : [];
    const histograms = Array.isArray(summary.histograms) ? summary.histograms : [];

    const aiCounters = counters.filter((counter: CounterMetric) => counter.name.startsWith('ai_'));

    const aiHistograms = histograms.filter((histogram: HistogramMetric) =>
      histogram.name.startsWith('ai_')
    );

    // Aggregate AI metrics
    const operationsByType: Record<string, number> = {};
    let totalOperations = 0;
    let totalErrors = 0;
    let totalTokens = 0;
    let totalCost = 0;

    for (const counter of aiCounters) {
      if (counter.name === 'ai_operations_total') {
        totalOperations += counter.count;

        if (counter.labels.operation) {
          operationsByType[counter.labels.operation] =
            (operationsByType[counter.labels.operation] || 0) + counter.count;
        }

        if (counter.labels.status === 'error') {
          totalErrors += counter.count;
        }
      }
    }

    // Calculate totals from histograms
    const tokensHistogram = aiHistograms.find((h: HistogramMetric) => h.name === 'ai_tokens_used');
    if (tokensHistogram) {
      totalTokens = tokensHistogram.sum;
    }

    const costHistogram = aiHistograms.find(
      (h: HistogramMetric) => h.name === 'ai_operation_cost_usd'
    );
    if (costHistogram) {
      totalCost = costHistogram.sum;
    }

    const durationHistogram = aiHistograms.find(
      (h: HistogramMetric) => h.name === 'ai_operation_duration_seconds'
    );

    const averageDuration = durationHistogram?.average
      ? durationHistogram.average * 1000 // Convert to milliseconds
      : 0;

    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    const averageTokensPerOperation = totalOperations > 0 ? totalTokens / totalOperations : 0;
    const averageCostPerOperation = totalOperations > 0 ? totalCost / totalOperations : 0;

    return {
      totalOperations,
      operationsByType,
      totalTokens,
      totalCostUsd: Math.round(totalCost * 100) / 100, // Round to cents
      averageTokensPerOperation: Math.round(averageTokensPerOperation),
      averageCostPerOperationUsd: Math.round(averageCostPerOperation * 10000) / 10000, // Round to 4 decimal places
      averageDurationMs: Math.round(averageDuration * 100) / 100,
      errorRate: Math.round(errorRate * 1000) / 1000,
      lastUpdated: new Date().toISOString(),
    };
  }
}
