import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MCPIntegrationEvent,
  MCPEventType,
  MCPServerMetrics,
} from '../interfaces/mcp-server.interface';

interface MonitoringConfig {
  alertThresholds: {
    errorRateThreshold: number;
    responseTimeThreshold: number;
    uptimeThreshold: number;
    connectionThreshold: number;
  };
  metricsRetention: {
    rawMetricsHours: number;
    aggregatedMetricsDays: number;
    alertHistoryDays: number;
  };
  notifications: {
    webhookUrl?: string;
    slackChannel?: string;
    emailRecipients: string[];
    minimumSeverity: 'info' | 'warning' | 'error' | 'critical';
  };
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'warning' | 'error' | 'critical';
  cooldownMinutes: number;
  enabled: boolean;
  tags: string[];
}

interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
}

interface Alert {
  id: string;
  ruleId: string;
  serverId: string;
  severity: 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, unknown>;
}

interface AggregatedMetrics {
  serverId: string;
  timestamp: Date;
  period: 'minute' | 'hour' | 'day';

  // Response time metrics
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Throughput metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  requestsPerSecond: number;

  // Error metrics
  errorRate: number;
  errorTypes: Record<string, number>;

  // Availability metrics
  uptimePercentage: number;
  downtimeSeconds: number;

  // Resource metrics
  avgActiveConnections: number;
  maxActiveConnections: number;
  avgNetworkLatency: number;
}

interface IntegrationHealthScore {
  serverId: string;
  score: number; // 0-100
  factors: {
    availability: number;
    performance: number;
    reliability: number;
    connectivity: number;
  };
  recommendation: string;
  lastUpdated: Date;
}

@Injectable()
export class MCPMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MCPMonitoringService.name);
  private readonly config: MonitoringConfig;

  // Data storage
  private readonly rawMetrics = new Map<string, MCPServerMetrics[]>();
  private readonly aggregatedMetrics = new Map<string, AggregatedMetrics[]>();
  private readonly events = new Map<string, MCPIntegrationEvent[]>();
  private readonly alerts = new Map<string, Alert>();
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly healthScores = new Map<string, IntegrationHealthScore>();

  // Alert state tracking
  private readonly alertCooldowns = new Map<string, Date>();
  private readonly activeAlertsByServer = new Map<string, Set<string>>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.config = {
      alertThresholds: {
        errorRateThreshold: this.configService.get<number>('monitoring.errorRateThreshold') || 0.05,
        responseTimeThreshold:
          this.configService.get<number>('monitoring.responseTimeThreshold') || 1000,
        uptimeThreshold: this.configService.get<number>('monitoring.uptimeThreshold') || 0.99,
        connectionThreshold:
          this.configService.get<number>('monitoring.connectionThreshold') || 100,
      },
      metricsRetention: {
        rawMetricsHours: this.configService.get<number>('monitoring.rawMetricsHours') || 24,
        aggregatedMetricsDays:
          this.configService.get<number>('monitoring.aggregatedMetricsDays') || 30,
        alertHistoryDays: this.configService.get<number>('monitoring.alertHistoryDays') || 7,
      },
      notifications: {
        webhookUrl: this.configService.get<string>('monitoring.webhookUrl'),
        slackChannel: this.configService.get<string>('monitoring.slackChannel'),
        emailRecipients: this.configService.get<string[]>('monitoring.emailRecipients') || [],
        minimumSeverity:
          this.configService.get<'info' | 'warning' | 'error' | 'critical'>(
            'monitoring.minimumSeverity'
          ) || 'warning',
      },
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing MCP Monitoring Service...');

    // Initialize default alert rules
    this.initializeDefaultAlertRules();

    this.logger.log('MCP Monitoring Service initialized');
  }

  /**
   * Listen for MCP integration events
   */
  @OnEvent('mcp.integration.event')
  async handleIntegrationEvent(event: MCPIntegrationEvent): Promise<void> {
    try {
      // Store event
      this.storeEvent(event);

      // Process event for alerting
      await this.processEventForAlerting(event);

      // Update health scores based on event
      this.updateHealthScore(event.serverId, event);

      this.logger.debug(`Processed integration event: ${event.type} for server ${event.serverId}`);
    } catch (error) {
      this.logger.error('Error handling integration event:', error);
    }
  }

  /**
   * Record server metrics
   */
  async recordMetrics(metrics: MCPServerMetrics): Promise<void> {
    try {
      // Store raw metrics
      this.storeRawMetrics(metrics);

      // Check for metric-based alerts
      await this.checkMetricAlerts(metrics);

      // Update health score
      this.updateHealthScoreFromMetrics(metrics);

      this.logger.debug(`Recorded metrics for server ${metrics.serverId}`);
    } catch (error) {
      this.logger.error('Error recording metrics:', error);
    }
  }

  /**
   * Get server health score
   */
  getHealthScore(serverId: string): IntegrationHealthScore | null {
    return this.healthScores.get(serverId) || null;
  }

  /**
   * Get all health scores
   */
  getAllHealthScores(): IntegrationHealthScore[] {
    return Array.from(this.healthScores.values());
  }

  /**
   * Get active alerts for a server
   */
  getActiveAlerts(serverId?: string): Alert[] {
    const allAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);

    if (serverId) {
      return allAlerts.filter(alert => alert.serverId === serverId);
    }

    return allAlerts;
  }

  /**
   * Get alert history
   */
  getAlertHistory(serverId?: string, limit = 100): Alert[] {
    const allAlerts = Array.from(this.alerts.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    const filteredAlerts = serverId
      ? allAlerts.filter(alert => alert.serverId === serverId)
      : allAlerts;

    return filteredAlerts.slice(0, limit);
  }

  /**
   * Get aggregated metrics for a server
   */
  getAggregatedMetrics(
    serverId: string,
    period: 'minute' | 'hour' | 'day',
    limit = 100
  ): AggregatedMetrics[] {
    const key = `${serverId}:${period}`;
    const metrics = this.aggregatedMetrics.get(key) || [];

    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  /**
   * Get integration overview
   */
  getIntegrationOverview(): Record<string, unknown> {
    const allHealthScores = this.getAllHealthScores();
    const activeAlerts = this.getActiveAlerts();

    const totalServers = allHealthScores.length;
    const healthyServers = allHealthScores.filter(score => score.score >= 80).length;
    const degradedServers = allHealthScores.filter(
      score => score.score >= 60 && score.score < 80
    ).length;
    const unhealthyServers = allHealthScores.filter(score => score.score < 60).length;

    const alertsBySeverity = {
      critical: activeAlerts.filter(alert => alert.severity === 'critical').length,
      error: activeAlerts.filter(alert => alert.severity === 'error').length,
      warning: activeAlerts.filter(alert => alert.severity === 'warning').length,
    };

    const averageHealthScore =
      totalServers > 0
        ? allHealthScores.reduce((sum, score) => sum + score.score, 0) / totalServers
        : 0;

    return {
      totalServers,
      serverHealth: {
        healthy: healthyServers,
        degraded: degradedServers,
        unhealthy: unhealthyServers,
      },
      averageHealthScore: Math.round(averageHealthScore),
      activeAlerts: alertsBySeverity,
      totalActiveAlerts: activeAlerts.length,
      lastUpdated: new Date(),
    };
  }

  /**
   * Create custom alert rule
   */
  createAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = this.generateAlertRuleId();
    const alertRule: AlertRule = {
      ...rule,
      id: ruleId,
    };

    this.alertRules.set(ruleId, alertRule);
    this.logger.log(`Created alert rule: ${rule.name} (${ruleId})`);

    return ruleId;
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return false;
    }

    Object.assign(rule, updates);
    this.alertRules.set(ruleId, rule);

    this.logger.log(`Updated alert rule: ${rule.name} (${ruleId})`);
    return true;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(ruleId: string): boolean {
    const deleted = this.alertRules.delete(ruleId);
    if (deleted) {
      this.logger.log(`Deleted alert rule: ${ruleId}`);
    }
    return deleted;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    // Remove from active alerts
    const activeAlerts = this.activeAlertsByServer.get(alert.serverId);
    if (activeAlerts) {
      activeAlerts.delete(alertId);
    }

    this.logger.log(`Resolved alert: ${alert.title} (${alertId})`);

    // Emit alert resolved event
    this.eventEmitter.emit('mcp.alert.resolved', alert);

    return true;
  }

  /**
   * Aggregate metrics every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async aggregateMinuteMetrics(): Promise<void> {
    await this.aggregateMetrics('minute');
  }

  /**
   * Aggregate metrics every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourMetrics(): Promise<void> {
    await this.aggregateMetrics('hour');
  }

  /**
   * Aggregate metrics every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDayMetrics(): Promise<void> {
    await this.aggregateMetrics('day');
  }

  /**
   * Clean up old data every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldData(): Promise<void> {
    await this.cleanupExpiredData();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Error Rate',
        description: 'Error rate exceeds threshold',
        condition: {
          metric: 'errorRate',
          operator: 'gt',
          threshold: this.config.alertThresholds.errorRateThreshold,
          duration: 300, // 5 minutes
          aggregation: 'avg',
        },
        severity: 'error',
        cooldownMinutes: 15,
        enabled: true,
        tags: ['error-rate', 'reliability'],
      },
      {
        name: 'High Response Time',
        description: 'Response time exceeds threshold',
        condition: {
          metric: 'responseTime',
          operator: 'gt',
          threshold: this.config.alertThresholds.responseTimeThreshold,
          duration: 300,
          aggregation: 'avg',
        },
        severity: 'warning',
        cooldownMinutes: 10,
        enabled: true,
        tags: ['performance', 'response-time'],
      },
      {
        name: 'Server Unavailable',
        description: 'Server is not responding to health checks',
        condition: {
          metric: 'uptime',
          operator: 'lt',
          threshold: this.config.alertThresholds.uptimeThreshold,
          duration: 60,
          aggregation: 'avg',
        },
        severity: 'critical',
        cooldownMinutes: 5,
        enabled: true,
        tags: ['availability', 'uptime'],
      },
      {
        name: 'High Connection Count',
        description: 'Active connections approaching limit',
        condition: {
          metric: 'activeConnections',
          operator: 'gt',
          threshold: this.config.alertThresholds.connectionThreshold,
          duration: 180,
          aggregation: 'max',
        },
        severity: 'warning',
        cooldownMinutes: 20,
        enabled: true,
        tags: ['connections', 'capacity'],
      },
    ];

    for (const rule of defaultRules) {
      this.createAlertRule(rule);
    }
  }

  /**
   * Store integration event
   */
  private storeEvent(event: MCPIntegrationEvent): void {
    const serverEvents = this.events.get(event.serverId) || [];
    serverEvents.push(event);

    // Keep only recent events (last 1000)
    if (serverEvents.length > 1000) {
      serverEvents.splice(0, serverEvents.length - 1000);
    }

    this.events.set(event.serverId, serverEvents);
  }

  /**
   * Store raw metrics
   */
  private storeRawMetrics(metrics: MCPServerMetrics): void {
    const serverMetrics = this.rawMetrics.get(metrics.serverId) || [];
    serverMetrics.push(metrics);

    // Keep only recent metrics based on retention policy
    const retentionTime =
      Date.now() - this.config.metricsRetention.rawMetricsHours * 60 * 60 * 1000;
    const filteredMetrics = serverMetrics.filter(m => m.timestamp.getTime() > retentionTime);

    this.rawMetrics.set(metrics.serverId, filteredMetrics);
  }

  /**
   * Process event for alerting
   */
  private async processEventForAlerting(event: MCPIntegrationEvent): Promise<void> {
    // Check for specific event-based alerts
    switch (event.type) {
      case MCPEventType.SERVER_DISCONNECTED:
      case MCPEventType.SERVER_HEALTH_CHECK_FAILED:
        await this.createAlert({
          ruleId: 'event-based',
          serverId: event.serverId,
          severity: 'error',
          title: 'Server Connection Issue',
          description: `Server ${event.serverId} has connectivity issues: ${event.type}`,
          metadata: { event: event.data },
        });
        break;

      case MCPEventType.CIRCUIT_BREAKER_OPENED:
        await this.createAlert({
          ruleId: 'event-based',
          serverId: event.serverId,
          severity: 'critical',
          title: 'Circuit Breaker Opened',
          description: `Circuit breaker opened for server ${event.serverId} due to repeated failures`,
          metadata: { event: event.data },
        });
        break;

      case MCPEventType.ERROR_RATE_THRESHOLD_EXCEEDED:
        await this.createAlert({
          ruleId: 'event-based',
          serverId: event.serverId,
          severity: 'error',
          title: 'Error Rate Threshold Exceeded',
          description: `Error rate threshold exceeded for server ${event.serverId}`,
          metadata: { event: event.data },
        });
        break;
    }
  }

  /**
   * Check metric-based alerts
   */
  private async checkMetricAlerts(metrics: MCPServerMetrics): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      const isAlertConditionMet = await this.evaluateAlertCondition(
        metrics.serverId,
        rule.condition
      );

      if (isAlertConditionMet && !this.isInCooldown(ruleId, metrics.serverId)) {
        await this.createAlert({
          ruleId,
          serverId: metrics.serverId,
          severity: rule.severity,
          title: rule.name,
          description: rule.description,
          metadata: { rule, metrics },
        });

        // Set cooldown
        this.setCooldown(ruleId, metrics.serverId, rule.cooldownMinutes);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private async evaluateAlertCondition(
    serverId: string,
    condition: AlertCondition
  ): Promise<boolean> {
    const metrics = this.rawMetrics.get(serverId) || [];

    // Get metrics for the specified duration
    const durationMs = condition.duration * 1000;
    const cutoffTime = Date.now() - durationMs;
    const relevantMetrics = metrics.filter(m => m.timestamp.getTime() > cutoffTime);

    if (relevantMetrics.length === 0) {
      return false;
    }

    // Extract metric values
    const values = relevantMetrics.map(m => this.getMetricValue(m, condition.metric));

    // Apply aggregation
    let aggregatedValue: number;
    switch (condition.aggregation) {
      case 'avg':
        aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'sum':
        aggregatedValue = values.reduce((sum, val) => sum + val, 0);
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      default:
        aggregatedValue = values[values.length - 1]; // Latest value
    }

    // Evaluate condition
    switch (condition.operator) {
      case 'gt':
        return aggregatedValue > condition.threshold;
      case 'gte':
        return aggregatedValue >= condition.threshold;
      case 'lt':
        return aggregatedValue < condition.threshold;
      case 'lte':
        return aggregatedValue <= condition.threshold;
      case 'eq':
        return aggregatedValue === condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metrics: MCPServerMetrics, metricName: string): number {
    switch (metricName) {
      case 'responseTime':
        return metrics.responseTime;
      case 'errorRate':
        return metrics.errorRate;
      case 'throughput':
        return metrics.throughput;
      case 'activeConnections':
        return metrics.activeConnections;
      case 'networkLatency':
        return metrics.networkLatency;
      case 'successRate':
        return metrics.successRate;
      default:
        return 0;
    }
  }

  /**
   * Create alert
   */
  private async createAlert(alertData: {
    ruleId: string;
    serverId: string;
    severity: 'warning' | 'error' | 'critical';
    title: string;
    description: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const alertId = this.generateAlertId();
    const alert: Alert = {
      id: alertId,
      ...alertData,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.set(alertId, alert);

    // Track active alerts by server
    const activeAlerts = this.activeAlertsByServer.get(alertData.serverId) || new Set();
    activeAlerts.add(alertId);
    this.activeAlertsByServer.set(alertData.serverId, activeAlerts);

    this.logger.warn(`Alert created: ${alert.title} for server ${alert.serverId}`);

    // Send notifications
    await this.sendAlertNotification(alert);

    // Emit alert event
    this.eventEmitter.emit('mcp.alert.created', alert);
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: Alert): Promise<void> {
    const severityLevels: Record<string, number> = { warning: 1, error: 2, critical: 3 };
    const minimumLevel = severityLevels[this.config.notifications.minimumSeverity] || 1;
    const alertLevel = severityLevels[alert.severity] || 1;

    if (alertLevel < minimumLevel) {
      return; // Skip notification for low severity alerts
    }

    try {
      // In a real implementation, this would send notifications via:
      // - Webhook
      // - Slack
      // - Email
      // - SMS for critical alerts

      this.logger.log(`Notification sent for alert: ${alert.title} (${alert.severity})`);
    } catch (error) {
      this.logger.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Check if alert is in cooldown
   */
  private isInCooldown(ruleId: string, serverId: string): boolean {
    const key = `${ruleId}:${serverId}`;
    const cooldownEnd = this.alertCooldowns.get(key);
    return cooldownEnd ? cooldownEnd > new Date() : false;
  }

  /**
   * Set alert cooldown
   */
  private setCooldown(ruleId: string, serverId: string, cooldownMinutes: number): void {
    const key = `${ruleId}:${serverId}`;
    const cooldownEnd = new Date(Date.now() + cooldownMinutes * 60 * 1000);
    this.alertCooldowns.set(key, cooldownEnd);
  }

  /**
   * Update health score based on event
   */
  private updateHealthScore(serverId: string, event: MCPIntegrationEvent): void {
    const currentScore = this.healthScores.get(serverId);

    // Simple scoring algorithm - in production this would be more sophisticated
    let scoreAdjustment = 0;

    switch (event.type) {
      case MCPEventType.SERVER_CONNECTED:
      case MCPEventType.SERVER_HEALTH_CHECK_RECOVERED:
      case MCPEventType.CIRCUIT_BREAKER_CLOSED:
        scoreAdjustment = 5;
        break;
      case MCPEventType.SERVER_DISCONNECTED:
      case MCPEventType.SERVER_HEALTH_CHECK_FAILED:
        scoreAdjustment = -10;
        break;
      case MCPEventType.CIRCUIT_BREAKER_OPENED:
        scoreAdjustment = -20;
        break;
      case MCPEventType.OPERATION_FAILED:
        scoreAdjustment = -2;
        break;
      case MCPEventType.OPERATION_COMPLETED:
        scoreAdjustment = 1;
        break;
    }

    if (scoreAdjustment !== 0) {
      const newScore = currentScore
        ? Math.max(0, Math.min(100, currentScore.score + scoreAdjustment))
        : 50; // Default starting score

      this.calculateHealthScore(serverId, newScore);
    }
  }

  /**
   * Update health score from metrics
   */
  private updateHealthScoreFromMetrics(metrics: MCPServerMetrics): void {
    // Calculate score based on metrics
    let score = 100;

    // Response time factor (0-25 points)
    if (metrics.responseTime > 1000) {
      score -= 25;
    } else if (metrics.responseTime > 500) {
      score -= 15;
    } else if (metrics.responseTime > 200) {
      score -= 5;
    }

    // Error rate factor (0-30 points)
    score -= Math.min(30, metrics.errorRate * 600); // 5% error rate = 30 points

    // Throughput factor (0-15 points)
    if (metrics.throughput < 1) {
      score -= 15;
    } else if (metrics.throughput < 5) {
      score -= 10;
    }

    // Success rate factor (0-30 points)
    score -= Math.min(30, (1 - metrics.successRate) * 100);

    this.calculateHealthScore(metrics.serverId, Math.max(0, score));
  }

  /**
   * Calculate comprehensive health score
   */
  private calculateHealthScore(serverId: string, baseScore: number): void {
    const healthScore: IntegrationHealthScore = {
      serverId,
      score: Math.round(baseScore),
      factors: {
        availability: Math.min(100, baseScore + 10), // Adjust based on uptime
        performance: Math.min(100, baseScore), // Based on response times
        reliability: Math.min(100, baseScore - 5), // Based on error rates
        connectivity: Math.min(100, baseScore), // Based on connection health
      },
      recommendation: this.generateRecommendation(baseScore),
      lastUpdated: new Date(),
    };

    this.healthScores.set(serverId, healthScore);
  }

  /**
   * Generate recommendation based on health score
   */
  private generateRecommendation(score: number): string {
    if (score >= 90) {
      return 'Server is performing excellently. Continue monitoring.';
    } else if (score >= 80) {
      return 'Server is performing well. Minor optimizations may be beneficial.';
    } else if (score >= 70) {
      return 'Server performance is acceptable but could be improved.';
    } else if (score >= 60) {
      return 'Server performance is degraded. Investigation recommended.';
    } else {
      return 'Server performance is poor. Immediate attention required.';
    }
  }

  /**
   * Aggregate metrics for specified period
   */
  private async aggregateMetrics(period: 'minute' | 'hour' | 'day'): Promise<void> {
    const periodMs = period === 'minute' ? 60000 : period === 'hour' ? 3600000 : 86400000;
    const now = Date.now();
    const periodStart = now - (now % periodMs);

    for (const [serverId, metrics] of this.rawMetrics) {
      const periodMetrics = metrics.filter(
        m => m.timestamp.getTime() >= periodStart && m.timestamp.getTime() < periodStart + periodMs
      );

      if (periodMetrics.length === 0) continue;

      const aggregated = this.calculateAggregatedMetrics(serverId, period, periodMetrics);
      this.storeAggregatedMetrics(serverId, period, aggregated);
    }
  }

  /**
   * Calculate aggregated metrics
   */
  private calculateAggregatedMetrics(
    serverId: string,
    period: 'minute' | 'hour' | 'day',
    metrics: MCPServerMetrics[]
  ): AggregatedMetrics {
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const successfulRequests = metrics.reduce((sum, m) => sum + m.successfulRequests, 0);
    const failedRequests = metrics.reduce((sum, m) => sum + m.failedRequests, 0);

    return {
      serverId,
      timestamp: new Date(),
      period,
      avgResponseTime: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
      totalRequests,
      successfulRequests,
      failedRequests,
      requestsPerSecond:
        totalRequests / (period === 'minute' ? 60 : period === 'hour' ? 3600 : 86400),
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      errorTypes: {}, // Would be populated from actual error analysis
      uptimePercentage: 0.99, // Would be calculated from actual uptime data
      downtimeSeconds: 0, // Would be calculated from actual downtime data
      avgActiveConnections:
        metrics.reduce((sum, m) => sum + m.activeConnections, 0) / metrics.length,
      maxActiveConnections: Math.max(...metrics.map(m => m.activeConnections)),
      avgNetworkLatency: metrics.reduce((sum, m) => sum + m.networkLatency, 0) / metrics.length,
    };
  }

  /**
   * Store aggregated metrics
   */
  private storeAggregatedMetrics(
    serverId: string,
    period: 'minute' | 'hour' | 'day',
    metrics: AggregatedMetrics
  ): void {
    const key = `${serverId}:${period}`;
    const aggregatedMetrics = this.aggregatedMetrics.get(key) || [];
    aggregatedMetrics.push(metrics);

    // Keep only recent aggregated metrics based on retention policy
    const retentionDays = this.config.metricsRetention.aggregatedMetricsDays;
    const retentionTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const filteredMetrics = aggregatedMetrics.filter(m => m.timestamp.getTime() > retentionTime);

    this.aggregatedMetrics.set(key, filteredMetrics);
  }

  /**
   * Clean up expired data
   */
  private async cleanupExpiredData(): Promise<void> {
    const now = Date.now();

    // Clean up raw metrics
    const rawRetentionTime = now - this.config.metricsRetention.rawMetricsHours * 60 * 60 * 1000;
    for (const [serverId, metrics] of this.rawMetrics) {
      const filteredMetrics = metrics.filter(m => m.timestamp.getTime() > rawRetentionTime);
      this.rawMetrics.set(serverId, filteredMetrics);
    }

    // Clean up alert history
    const alertRetentionTime =
      now - this.config.metricsRetention.alertHistoryDays * 24 * 60 * 60 * 1000;
    for (const [alertId, alert] of this.alerts) {
      if (alert.timestamp.getTime() < alertRetentionTime) {
        this.alerts.delete(alertId);
      }
    }

    // Clean up expired cooldowns
    for (const [key, cooldownEnd] of this.alertCooldowns) {
      if (cooldownEnd < new Date()) {
        this.alertCooldowns.delete(key);
      }
    }

    this.logger.debug('Completed data cleanup');
  }

  /**
   * Utility methods
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertRuleId(): string {
    return `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
