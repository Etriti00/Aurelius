import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as os from 'os';

interface NodeProcess extends NodeJS.Process {
  _getActiveHandles?: () => unknown[];
  _getActiveRequests?: () => unknown[];
}

export interface MetricEntry {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface CounterMetric {
  name: string;
  count: number;
  labels: Record<string, string>;
  lastUpdated: Date;
}

export interface GaugeMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  lastUpdated: Date;
}

export interface HistogramMetric {
  name: string;
  buckets: Record<string, number>;
  count: number;
  sum: number;
  average: number;
  labels: Record<string, string>;
  lastUpdated: Date;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  process: {
    uptime: number;
    pid: number;
    version: string;
    activeHandles: number;
    activeRequests: number;
  };
  http: {
    totalRequests: number;
    activeConnections: number;
    requestsPerSecond: number;
    averageResponseTime: number;
  };
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);

  // Metric storage
  private readonly counters = new Map<string, CounterMetric>();
  private readonly gauges = new Map<string, GaugeMetric>();
  private readonly histograms = new Map<string, HistogramMetric>();
  private readonly responseTimeHistogram = new Map<string, number[]>();

  // HTTP metrics
  private httpRequestCount = 0;
  private httpActiveConnections = 0;
  private httpResponseTimes: number[] = [];
  private httpErrorCount = 0;

  // System metrics
  private systemMetricsInterval: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Metrics Service...');

    // Initialize default metrics
    this.initializeDefaultMetrics();

    // Start system metrics collection
    this.startSystemMetricsCollection();

    this.logger.log('Metrics Service initialized');
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.generateMetricKey(name, labels);
    const existing = this.counters.get(key);

    if (existing) {
      existing.count += value;
      existing.lastUpdated = new Date();
    } else {
      this.counters.set(key, {
        name,
        count: value,
        labels,
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.generateMetricKey(name, labels);

    this.gauges.set(key, {
      name,
      value,
      labels,
      lastUpdated: new Date(),
    });
  }

  /**
   * Record a histogram observation
   */
  observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.generateMetricKey(name, labels);
    const existing = this.histograms.get(key);

    if (existing) {
      existing.count++;
      existing.sum += value;
      existing.average = existing.sum / existing.count;

      // Add to appropriate bucket
      const bucket = this.getBucketForValue(value);
      existing.buckets[bucket] = (existing.buckets[bucket] || 0) + 1;
      existing.lastUpdated = new Date();
    } else {
      const buckets: Record<string, number> = {};
      const bucket = this.getBucketForValue(value);
      buckets[bucket] = 1;

      this.histograms.set(key, {
        name,
        buckets,
        count: 1,
        sum: value,
        average: value,
        labels,
        lastUpdated: new Date(),
      });
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(req: Request, res: Response, responseTime: number): void {
    this.httpRequestCount++;
    this.httpResponseTimes.push(responseTime);

    // Keep only last 1000 response times for calculation
    if (this.httpResponseTimes.length > 1000) {
      this.httpResponseTimes.shift();
    }

    // Increment counters
    this.incrementCounter('http_requests_total', {
      method: req.method,
      status: res.statusCode.toString(),
      route: this.sanitizeRoute(req.route?.path || req.path),
    });

    // Record response time histogram
    this.observeHistogram('http_request_duration_seconds', responseTime / 1000, {
      method: req.method,
      route: this.sanitizeRoute(req.route?.path || req.path),
    });

    // Count errors
    if (res.statusCode >= 400) {
      this.httpErrorCount++;
      this.incrementCounter('http_errors_total', {
        method: req.method,
        status: res.statusCode.toString(),
        route: this.sanitizeRoute(req.route?.path || req.path),
      });
    }
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(
    operation: string,
    duration: number,
    success: boolean,
    table?: string
  ): void {
    this.incrementCounter('db_operations_total', {
      operation,
      status: success ? 'success' : 'error',
      table: table || 'unknown',
    });

    this.observeHistogram('db_operation_duration_seconds', duration / 1000, {
      operation,
      table: table || 'unknown',
    });
  }

  /**
   * Record AI operation metrics
   */
  recordAiOperation(
    operation: string,
    duration: number,
    tokens: number,
    cost: number,
    success: boolean
  ): void {
    this.incrementCounter('ai_operations_total', {
      operation,
      status: success ? 'success' : 'error',
    });

    this.observeHistogram('ai_operation_duration_seconds', duration / 1000, {
      operation,
    });

    this.observeHistogram('ai_tokens_used', tokens, {
      operation,
    });

    this.observeHistogram('ai_operation_cost_usd', cost, {
      operation,
    });
  }

  /**
   * Record background job metrics
   */
  recordBackgroundJob(jobType: string, duration: number, success: boolean): void {
    this.incrementCounter('background_jobs_total', {
      type: jobType,
      status: success ? 'success' : 'error',
    });

    this.observeHistogram('background_job_duration_seconds', duration / 1000, {
      type: jobType,
    });
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Add help and type information
    lines.push('# HELP aurelius_http_requests_total Total number of HTTP requests');
    lines.push('# TYPE aurelius_http_requests_total counter');

    // Export counters
    for (const [, metric] of this.counters) {
      const labelsStr = this.formatLabels(metric.labels);
      lines.push(`aurelius_${metric.name}${labelsStr} ${metric.count}`);
    }

    // Export gauges
    for (const [, metric] of this.gauges) {
      const labelsStr = this.formatLabels(metric.labels);
      lines.push(`aurelius_${metric.name}${labelsStr} ${metric.value}`);
    }

    // Export histograms
    for (const [, metric] of this.histograms) {
      const labelsStr = this.formatLabels(metric.labels);

      // Histogram buckets
      for (const [bucket, count] of Object.entries(metric.buckets)) {
        const bucketLabels = { ...metric.labels, le: bucket };
        const bucketLabelsStr = this.formatLabels(bucketLabels);
        lines.push(`aurelius_${metric.name}_bucket${bucketLabelsStr} ${count}`);
      }

      // Histogram count and sum
      lines.push(`aurelius_${metric.name}_count${labelsStr} ${metric.count}`);
      lines.push(`aurelius_${metric.name}_sum${labelsStr} ${metric.sum}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: new Date(),
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage: process.platform === 'win32' ? [0, 0, 0] : os.loadavg(),
      },
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        version: process.version,
        activeHandles: (process as NodeProcess)._getActiveHandles?.()?.length || 0,
        activeRequests: (process as NodeProcess)._getActiveRequests?.()?.length || 0,
      },
      http: {
        totalRequests: this.httpRequestCount,
        activeConnections: this.httpActiveConnections,
        requestsPerSecond: this.calculateRequestsPerSecond(),
        averageResponseTime: this.calculateAverageResponseTime(),
      },
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): Record<string, unknown> {
    return {
      counters: Array.from(this.counters.values()),
      gauges: Array.from(this.gauges.values()),
      histograms: Array.from(this.histograms.values()).map(h => ({
        ...h,
        average: h.count > 0 ? h.sum / h.count : 0,
      })),
      system: this.getSystemMetrics(),
      lastUpdated: new Date(),
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.responseTimeHistogram.clear();
    this.httpRequestCount = 0;
    this.httpActiveConnections = 0;
    this.httpResponseTimes = [];
    this.httpErrorCount = 0;
  }

  /**
   * Initialize default application metrics
   */
  private initializeDefaultMetrics(): void {
    // System metrics
    this.setGauge('process_start_time_seconds', Date.now() / 1000);
    this.setGauge('nodejs_version_info', 1, { version: process.version });

    // Application info
    this.setGauge('app_info', 1, {
      version: this.configService.get<string>('app.version') || '1.0.0',
      environment: this.configService.get<string>('NODE_ENV') || 'development',
      name: this.configService.get<string>('app.name') || 'aurelius-backend',
    });
  }

  /**
   * Start collecting system metrics periodically
   */
  private startSystemMetricsCollection(): void {
    const interval = this.configService.get<number>('metrics.systemInterval') || 30000; // 30 seconds

    this.systemMetricsInterval = setInterval(() => {
      try {
        const metrics = this.getSystemMetrics();

        // Update gauges
        this.setGauge('process_cpu_usage', metrics.cpu.usage);
        this.setGauge('process_memory_usage_bytes', metrics.memory.used);
        this.setGauge('process_memory_total_bytes', metrics.memory.total);
        this.setGauge('process_memory_usage_percentage', metrics.memory.percentage);
        this.setGauge('process_uptime_seconds', metrics.process.uptime);
        this.setGauge('http_active_connections', metrics.http.activeConnections);
        this.setGauge('http_requests_per_second', metrics.http.requestsPerSecond);
        this.setGauge('http_average_response_time_ms', metrics.http.averageResponseTime);

        if (process.platform !== 'win32') {
          const [load1, load5, load15] = metrics.cpu.loadAverage;
          this.setGauge('system_load_average_1m', load1);
          this.setGauge('system_load_average_5m', load5);
          this.setGauge('system_load_average_15m', load15);
        }
      } catch (error) {
        this.logger.error('Failed to collect system metrics:', error);
      }
    }, interval);
  }

  /**
   * Generate unique key for metric with labels
   */
  private generateMetricKey(name: string, labels: Record<string, string>): string {
    const sortedLabels = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');
    return `${name}{${sortedLabels}}`;
  }

  /**
   * Get histogram bucket for value
   */
  private getBucketForValue(value: number): string {
    const buckets = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100];

    for (const bucket of buckets) {
      if (value <= bucket) {
        return bucket.toString();
      }
    }

    return '+Inf';
  }

  /**
   * Format labels for Prometheus output
   */
  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return '';
    }

    const formatted = Object.entries(labels)
      .map(([key, value]) => `${key}="${value.replace(/"/g, '\\"')}"`)
      .join(',');

    return `{${formatted}}`;
  }

  /**
   * Sanitize route path for metrics
   */
  private sanitizeRoute(path: string): string {
    // Remove parameter values but keep parameter names
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:uuid')
      .replace(/\/[^/]+@[^/]+\.[^/]+/g, '/:email');
  }

  /**
   * Calculate requests per second
   */
  private calculateRequestsPerSecond(): number {
    const uptime = process.uptime();
    return uptime > 0 ? this.httpRequestCount / uptime : 0;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    if (this.httpResponseTimes.length === 0) {
      return 0;
    }

    const sum = this.httpResponseTimes.reduce((a, b) => a + b, 0);
    return sum / this.httpResponseTimes.length;
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
  }
}
