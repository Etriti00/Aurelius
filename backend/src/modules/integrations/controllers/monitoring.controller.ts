import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequestUser } from '../../../common/interfaces/user.interface';
import { MCPMonitoringService } from '../services/mcp-monitoring.service';

interface CreateAlertRuleDto {
  name: string;
  description: string;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number;
    aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
  };
  severity: 'warning' | 'error' | 'critical';
  cooldownMinutes: number;
  enabled: boolean;
  tags: string[];
}

interface UpdateAlertRuleDto {
  name?: string;
  description?: string;
  condition?: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number;
    aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
  };
  severity?: 'warning' | 'error' | 'critical';
  cooldownMinutes?: number;
  enabled?: boolean;
  tags?: string[];
}

@ApiTags('monitoring')
@Controller('integrations/monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(private readonly monitoring: MCPMonitoringService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get monitoring overview',
    description: 'Retrieve comprehensive monitoring overview with health scores and alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Monitoring overview retrieved successfully',
    schema: {
      example: {
        totalServers: 15,
        serverHealth: {
          healthy: 12,
          degraded: 2,
          unhealthy: 1,
        },
        averageHealthScore: 87,
        activeAlerts: {
          critical: 0,
          error: 1,
          warning: 3,
        },
        totalActiveAlerts: 4,
        lastUpdated: '2024-12-29T10:30:00.000Z',
      },
    },
  })
  async getOverview(): Promise<Record<string, unknown>> {
    return this.monitoring.getIntegrationOverview();
  }

  @Get('health-scores')
  @ApiOperation({
    summary: 'Get all server health scores',
    description: 'Retrieve health scores for all registered servers',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: Number,
    description: 'Filter servers below this health score threshold',
    example: 80,
  })
  @ApiResponse({
    status: 200,
    description: 'Health scores retrieved successfully',
  })
  async getHealthScores(@Query('threshold') threshold?: number): Promise<unknown[]> {
    const healthScores = this.monitoring.getAllHealthScores();

    if (threshold !== undefined) {
      return healthScores.filter(score => score.score < threshold);
    }

    return healthScores;
  }

  @Get('health-scores/:serverId')
  @ApiOperation({
    summary: 'Get server health score',
    description: 'Retrieve detailed health score for a specific server',
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID of the MCP server',
    example: 'github-mcp-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Health score retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  async getServerHealthScore(@Param('serverId') serverId: string): Promise<unknown> {
    const healthScore = this.monitoring.getHealthScore(serverId);

    if (!healthScore) {
      throw new NotFoundException(`Health score for server ${serverId} not found`);
    }

    return healthScore;
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Get alerts',
    description: 'Retrieve active alerts with optional filtering',
  })
  @ApiQuery({
    name: 'serverId',
    required: false,
    type: String,
    description: 'Filter alerts by server ID',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['warning', 'error', 'critical'],
    description: 'Filter alerts by severity level',
  })
  @ApiQuery({
    name: 'resolved',
    required: false,
    type: Boolean,
    description: 'Include resolved alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved successfully',
  })
  async getAlerts(
    @Query('serverId') serverId?: string,
    @Query('severity') severity?: 'warning' | 'error' | 'critical',
    @Query('resolved') includeResolved = false
  ): Promise<unknown[]> {
    let alerts = includeResolved
      ? this.monitoring.getAlertHistory(serverId, 100)
      : this.monitoring.getActiveAlerts(serverId);

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    return alerts;
  }

  @Get('alerts/history')
  @ApiOperation({
    summary: 'Get alert history',
    description: 'Retrieve historical alerts with pagination',
  })
  @ApiQuery({
    name: 'serverId',
    required: false,
    type: String,
    description: 'Filter alerts by server ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of alerts to return',
    example: 50,
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['warning', 'error', 'critical'],
    description: 'Filter alerts by severity level',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert history retrieved successfully',
  })
  async getAlertHistory(
    @Query('serverId') serverId?: string,
    @Query('limit') limit = 100,
    @Query('severity') severity?: 'warning' | 'error' | 'critical'
  ): Promise<unknown[]> {
    let alerts = this.monitoring.getAlertHistory(serverId, limit);

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    return alerts;
  }

  @Post('alerts/:alertId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve alert',
    description: 'Mark an active alert as resolved',
  })
  @ApiParam({
    name: 'alertId',
    description: 'ID of the alert to resolve',
    example: 'alert-123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert resolved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Alert not found',
  })
  async resolveAlert(
    @Param('alertId') alertId: string,
    @CurrentUser() user: RequestUser
  ): Promise<{ message: string; alertId: string }> {
    const resolved = this.monitoring.resolveAlert(alertId);

    if (!resolved) {
      throw new NotFoundException(`Alert ${alertId} not found or already resolved`);
    }

    this.logger.log(`Alert ${alertId} resolved by user ${user.id}`);

    return {
      message: 'Alert resolved successfully',
      alertId,
    };
  }

  @Get('alert-rules')
  @ApiOperation({
    summary: 'Get alert rules',
    description: 'Retrieve all configured alert rules',
  })
  @ApiQuery({
    name: 'enabled',
    required: false,
    type: Boolean,
    description: 'Filter by enabled status',
  })
  @ApiQuery({
    name: 'severity',
    required: false,
    enum: ['warning', 'error', 'critical'],
    description: 'Filter by severity level',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert rules retrieved successfully',
  })
  async getAlertRules(
    @Query('enabled') enabled?: boolean,
    @Query('severity') severity?: 'warning' | 'error' | 'critical'
  ): Promise<Record<string, unknown>[]> {
    // In a real implementation, this would get from the monitoring service
    // For now, return mock data
    const mockRules = [
      {
        id: 'rule-high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds threshold',
        condition: {
          metric: 'errorRate',
          operator: 'gt',
          threshold: 0.05,
          duration: 300,
          aggregation: 'avg',
        },
        severity: 'error',
        cooldownMinutes: 15,
        enabled: true,
        tags: ['error-rate', 'reliability'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'rule-high-response-time',
        name: 'High Response Time',
        description: 'Response time exceeds threshold',
        condition: {
          metric: 'responseTime',
          operator: 'gt',
          threshold: 1000,
          duration: 300,
          aggregation: 'avg',
        },
        severity: 'warning',
        cooldownMinutes: 10,
        enabled: true,
        tags: ['performance', 'response-time'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'rule-server-unavailable',
        name: 'Server Unavailable',
        description: 'Server is not responding to health checks',
        condition: {
          metric: 'uptime',
          operator: 'lt',
          threshold: 0.99,
          duration: 60,
          aggregation: 'avg',
        },
        severity: 'critical',
        cooldownMinutes: 5,
        enabled: true,
        tags: ['availability', 'uptime'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
    ];

    return mockRules.filter(rule => {
      if (enabled !== undefined && rule.enabled !== enabled) return false;
      if (severity && rule.severity !== severity) return false;
      return true;
    });
  }

  @Post('alert-rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create alert rule',
    description: 'Create a new alert rule for monitoring',
  })
  @ApiResponse({
    status: 201,
    description: 'Alert rule created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid alert rule configuration',
  })
  async createAlertRule(
    @CurrentUser() user: RequestUser,
    @Body() ruleDto: CreateAlertRuleDto
  ): Promise<{ ruleId: string; message: string }> {
    // Validate rule configuration
    if (ruleDto.condition.threshold <= 0) {
      throw new BadRequestException('Threshold must be greater than 0');
    }

    if (ruleDto.condition.duration <= 0) {
      throw new BadRequestException('Duration must be greater than 0');
    }

    if (ruleDto.cooldownMinutes < 0) {
      throw new BadRequestException('Cooldown minutes cannot be negative');
    }

    const ruleId = this.monitoring.createAlertRule(ruleDto);

    this.logger.log(`Alert rule ${ruleDto.name} created by user ${user.id}`);

    return {
      ruleId,
      message: 'Alert rule created successfully',
    };
  }

  @Put('alert-rules/:ruleId')
  @ApiOperation({
    summary: 'Update alert rule',
    description: 'Update an existing alert rule configuration',
  })
  @ApiParam({
    name: 'ruleId',
    description: 'ID of the alert rule',
    example: 'rule-123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert rule updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Alert rule not found',
  })
  async updateAlertRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: RequestUser,
    @Body() updateDto: UpdateAlertRuleDto
  ): Promise<{ message: string; ruleId: string }> {
    const updated = this.monitoring.updateAlertRule(ruleId, updateDto);

    if (!updated) {
      throw new NotFoundException(`Alert rule ${ruleId} not found`);
    }

    this.logger.log(`Alert rule ${ruleId} updated by user ${user.id}`);

    return {
      message: 'Alert rule updated successfully',
      ruleId,
    };
  }

  @Delete('alert-rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete alert rule',
    description: 'Delete an existing alert rule',
  })
  @ApiParam({
    name: 'ruleId',
    description: 'ID of the alert rule',
    example: 'rule-123456789',
  })
  @ApiResponse({
    status: 204,
    description: 'Alert rule deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Alert rule not found',
  })
  async deleteAlertRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: RequestUser
  ): Promise<void> {
    const deleted = this.monitoring.deleteAlertRule(ruleId);

    if (!deleted) {
      throw new NotFoundException(`Alert rule ${ruleId} not found`);
    }

    this.logger.log(`Alert rule ${ruleId} deleted by user ${user.id}`);
  }

  @Get('metrics/aggregated')
  @ApiOperation({
    summary: 'Get aggregated metrics',
    description: 'Retrieve aggregated metrics across all servers or for a specific server',
  })
  @ApiQuery({
    name: 'serverId',
    required: false,
    type: String,
    description: 'Filter metrics by server ID',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['minute', 'hour', 'day'],
    description: 'Time period for metrics aggregation',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of data points to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated metrics retrieved successfully',
  })
  async getAggregatedMetrics(
    @Query('serverId') serverId?: string,
    @Query('period') period: 'minute' | 'hour' | 'day' = 'hour',
    @Query('limit') limit = 100
  ): Promise<unknown[]> {
    if (serverId) {
      return this.monitoring.getAggregatedMetrics(serverId, period, limit);
    }

    // Return aggregated metrics across all servers
    // In a real implementation, this would aggregate from all servers
    return [
      {
        timestamp: new Date(Date.now() - 3600000),
        period,
        totalServers: 15,
        avgResponseTime: 189,
        totalRequests: 1420,
        successfulRequests: 1356,
        failedRequests: 64,
        errorRate: 0.045,
        uptimePercentage: 99.2,
      },
      {
        timestamp: new Date(Date.now() - 7200000),
        period,
        totalServers: 15,
        avgResponseTime: 203,
        totalRequests: 1389,
        successfulRequests: 1321,
        failedRequests: 68,
        errorRate: 0.049,
        uptimePercentage: 99.1,
      },
    ];
  }

  @Get('dashboards/system-health')
  @ApiOperation({
    summary: 'Get system health dashboard data',
    description: 'Retrieve comprehensive data for the system health dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'System health dashboard data retrieved successfully',
  })
  async getSystemHealthDashboard(): Promise<Record<string, unknown>> {
    const overview = this.monitoring.getIntegrationOverview();
    const healthScores = this.monitoring.getAllHealthScores();
    const activeAlerts = this.monitoring.getActiveAlerts();

    // Calculate additional dashboard metrics
    const serversByRegion = healthScores.reduce(
      (acc, server) => {
        // In a real implementation, this would get region from server config
        const region = server.serverId.includes('eu') ? 'eu-west-1' : 'us-east-1'; // Mock data based on server ID
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const alertTrends = [
      { date: '2024-12-25', count: 2 },
      { date: '2024-12-26', count: 1 },
      { date: '2024-12-27', count: 3 },
      { date: '2024-12-28', count: 1 },
      { date: '2024-12-29', count: activeAlerts.length },
    ];

    const topOperations = [
      { operation: 'github.repo.list', count: 3456, successRate: 0.98 },
      { operation: 'slack.message.send', count: 2890, successRate: 0.95 },
      { operation: 'notion.page.create', count: 1245, successRate: 0.97 },
      { operation: 'github.issue.create', count: 987, successRate: 0.99 },
      { operation: 'slack.channel.list', count: 876, successRate: 0.94 },
    ];

    return {
      overview,
      healthScores: healthScores.slice(0, 10), // Top 10 for dashboard
      activeAlerts: activeAlerts.slice(0, 5), // Top 5 for dashboard
      serversByRegion,
      alertTrends,
      topOperations,
      performanceMetrics: {
        avgResponseTime: 189,
        p95ResponseTime: 456,
        errorRate: 0.037,
        throughput: 12.5,
        uptimePercentage: 99.2,
      },
      lastUpdated: new Date(),
    };
  }

  @Get('reports/health-summary')
  @ApiOperation({
    summary: 'Get health summary report',
    description: 'Generate a comprehensive health summary report',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Report period',
  })
  @ApiResponse({
    status: 200,
    description: 'Health summary report generated successfully',
  })
  async getHealthSummaryReport(@Query('period') period = 'week'): Promise<Record<string, unknown>> {
    const healthScores = this.monitoring.getAllHealthScores();
    const overview = this.monitoring.getIntegrationOverview();

    // Calculate report metrics
    const averageHealthScore =
      healthScores.length > 0
        ? healthScores.reduce((sum, score) => sum + score.score, 0) / healthScores.length
        : 0;

    const healthDistribution = {
      excellent: healthScores.filter(s => s.score >= 90).length,
      good: healthScores.filter(s => s.score >= 80 && s.score < 90).length,
      fair: healthScores.filter(s => s.score >= 70 && s.score < 80).length,
      poor: healthScores.filter(s => s.score < 70).length,
    };

    const criticalIssues = healthScores
      .filter(s => s.score < 70)
      .map(s => ({
        serverId: s.serverId,
        score: s.score,
        recommendation: s.recommendation,
        lastUpdated: s.lastUpdated,
      }));

    const recommendations = [
      ...criticalIssues.map(issue => `Server ${issue.serverId}: ${issue.recommendation}`),
      healthDistribution.poor > 0
        ? `${healthDistribution.poor} servers require immediate attention`
        : null,
      healthDistribution.fair > 2
        ? 'Consider performance optimization for fair-rated servers'
        : null,
      averageHealthScore < 80 ? 'Overall system health is below recommended threshold' : null,
    ].filter(Boolean);

    return {
      period,
      reportGeneratedAt: new Date(),
      summary: {
        totalServers: healthScores.length,
        averageHealthScore: Math.round(averageHealthScore),
        healthDistribution,
        criticalIssues: criticalIssues.length,
        totalActiveAlerts: overview.totalActiveAlerts,
      },
      healthTrend: [
        { date: '2024-12-22', avgScore: 85 },
        { date: '2024-12-23', avgScore: 87 },
        { date: '2024-12-24', avgScore: 84 },
        { date: '2024-12-25', avgScore: 86 },
        { date: '2024-12-26', avgScore: 88 },
        { date: '2024-12-27', avgScore: 85 },
        { date: '2024-12-28', avgScore: 87 },
        { date: '2024-12-29', avgScore: Math.round(averageHealthScore) },
      ],
      criticalIssues,
      recommendations,
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
    };
  }
}
