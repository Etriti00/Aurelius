import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
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
import { MCPPoolManagerService } from '../services/mcp-pool-manager.service';
import { MCPMonitoringService } from '../services/mcp-monitoring.service';
import {
  MCPOperationRequest,
  MCPOperationResponse,
  MCPServerConfig,
  MCPServerStatus,
  MCPServerPriority,
} from '../interfaces/mcp-server.interface';

interface ExecuteOperationDto {
  operation: string;
  parameters: Record<string, unknown>;
  context?: Record<string, unknown>;
  serverId?: string;
  poolId?: string;
  timeout?: number;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  consistency?: 'strong' | 'eventual' | 'weak';
  retryConfig?: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };
}

interface RegisterServerDto {
  name: string;
  description: string;
  endpoint: string;
  protocol: 'websocket' | 'http' | 'grpc';
  authentication: {
    type: 'apikey' | 'oauth2' | 'jwt' | 'basic' | 'none';
    credentials: Record<string, string>;
  };
  capabilities: Array<{
    name: string;
    version: string;
    operations: string[];
    inputTypes: string[];
    outputTypes: string[];
  }>;
  supportedOperations: string[];
  performance: {
    maxConcurrentConnections: number;
    averageResponseTime: number;
    rateLimits: {
      requestsPerSecond: number;
      requestsPerMinute: number;
      requestsPerHour: number;
    };
  };
  region: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoint: string;
    expectedResponse?: string;
  };
  tags: string[];
  metadata: Record<string, unknown>;
}

@ApiTags('integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(
    private readonly poolManager: MCPPoolManagerService,
    private readonly monitoring: MCPMonitoringService
  ) {}

  @Post('operations/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute an operation on MCP servers',
    description: 'Execute an operation using intelligent routing and load balancing',
  })
  @ApiResponse({
    status: 200,
    description: 'Operation executed successfully',
    schema: {
      example: {
        operationId: 'op-123456789',
        serverId: 'github-mcp-1',
        status: 'success',
        data: { result: 'Operation completed' },
        executionTime: 245,
        networkTime: 15,
        totalTime: 260,
        serverVersion: '1.0.0',
        responseSize: 1024,
        timestamp: '2024-12-29T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid operation request',
  })
  @ApiResponse({
    status: 503,
    description: 'No available servers for operation',
  })
  async executeOperation(
    @CurrentUser() user: RequestUser,
    @Body() operationDto: ExecuteOperationDto
  ): Promise<MCPOperationResponse> {
    const request: MCPOperationRequest = {
      operationId: this.generateOperationId(),
      serverId: operationDto.serverId,
      poolId: operationDto.poolId,
      operation: operationDto.operation,
      parameters: operationDto.parameters,
      context: operationDto.context,
      timeout: operationDto.timeout,
      retryConfig: operationDto.retryConfig,
      priority: operationDto.priority || 'normal',
      consistency: operationDto.consistency || 'eventual',
      traceId: this.generateTraceId(),
      userId: user.id,
      sessionId: this.generateSessionId(),
    };

    this.logger.log(`Executing operation ${request.operation} for user ${user.id}`);

    try {
      const response = await this.poolManager.executeOperation(request);
      this.logger.log(`Operation ${request.operationId} completed successfully`);
      return response;
    } catch (error) {
      this.logger.error(`Operation ${request.operationId} failed:`, error);
      throw error;
    }
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Get integration system overview',
    description: 'Retrieve comprehensive overview of integration health and performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Integration overview retrieved successfully',
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

  @Get('servers/health')
  @ApiOperation({
    summary: 'Get health status of all servers',
    description: 'Retrieve health scores and status for all registered MCP servers',
  })
  @ApiResponse({
    status: 200,
    description: 'Server health data retrieved successfully',
  })
  async getServersHealth(): Promise<unknown[]> {
    return this.monitoring.getAllHealthScores();
  }

  @Get('servers/:serverId/health')
  @ApiOperation({
    summary: 'Get health status of a specific server',
    description: 'Retrieve detailed health information for a specific MCP server',
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID of the MCP server',
    example: 'github-mcp-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Server health data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  async getServerHealth(
    @Param('serverId') serverId: string
  ): Promise<Record<string, unknown> | null> {
    return this.poolManager.getServerHealth(serverId);
  }

  @Get('pools')
  @ApiOperation({
    summary: 'Get all server pools',
    description: 'Retrieve information about all configured server pools',
  })
  @ApiResponse({
    status: 200,
    description: 'Server pools retrieved successfully',
  })
  async getPools(): Promise<Record<string, unknown>[]> {
    // In a real implementation, this would get from the pool manager
    return [
      {
        name: 'github-pool',
        description: 'GitHub integration server pool',
        totalServers: 3,
        activeServers: 2,
        loadBalancingStrategy: 'least_connections',
        currentLoad: 45,
        totalCapacity: 300,
      },
      {
        name: 'messaging-pool',
        description: 'Messaging integration server pool',
        totalServers: 2,
        activeServers: 2,
        loadBalancingStrategy: 'round_robin',
        currentLoad: 23,
        totalCapacity: 150,
      },
    ];
  }

  @Get('pools/:poolName/statistics')
  @ApiOperation({
    summary: 'Get pool statistics',
    description: 'Retrieve detailed statistics for a specific server pool',
  })
  @ApiParam({
    name: 'poolName',
    description: 'Name of the server pool',
    example: 'github-pool',
  })
  @ApiResponse({
    status: 200,
    description: 'Pool statistics retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pool not found',
  })
  async getPoolStatistics(
    @Param('poolName') poolName: string
  ): Promise<Record<string, unknown> | null> {
    return this.poolManager.getPoolStatistics(poolName);
  }

  @Post('servers/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new MCP server',
    description: 'Register a new MCP server with the integration system',
  })
  @ApiResponse({
    status: 201,
    description: 'Server registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid server configuration',
  })
  async registerServer(
    @CurrentUser() user: RequestUser,
    @Body() serverDto: RegisterServerDto
  ): Promise<{ serverId: string; message: string }> {
    const serverId = this.generateServerId();

    const serverConfig: MCPServerConfig = {
      id: serverId,
      name: serverDto.name,
      description: serverDto.description,
      version: '1.0.0',
      status: MCPServerStatus.INACTIVE, // Will be activated after successful connection
      endpoint: serverDto.endpoint,
      protocol: serverDto.protocol,
      authentication: {
        type: serverDto.authentication.type,
        credentials: serverDto.authentication.credentials,
      },
      capabilities: serverDto.capabilities,
      supportedOperations: serverDto.supportedOperations,
      performance: {
        ...serverDto.performance,
        reliability: {
          uptime: 99.9,
          errorRate: 0.001,
        },
      },
      region: serverDto.region,
      priority:
        serverDto.priority === 'critical'
          ? MCPServerPriority.CRITICAL
          : serverDto.priority === 'high'
            ? MCPServerPriority.HIGH
            : serverDto.priority === 'medium'
              ? MCPServerPriority.MEDIUM
              : MCPServerPriority.LOW,
      healthCheck: serverDto.healthCheck,
      tags: serverDto.tags,
      metadata: {
        ...serverDto.metadata,
        registeredBy: user.id,
        registeredAt: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.poolManager.registerServer(serverConfig);

    this.logger.log(`Server ${serverConfig.name} registered by user ${user.id}`);

    return {
      serverId,
      message: 'Server registered successfully and connection is being established',
    };
  }

  @Get('operations/history')
  @ApiOperation({
    summary: 'Get operation execution history',
    description: 'Retrieve history of executed operations with filtering options',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of operations to return',
    example: 50,
  })
  @ApiQuery({
    name: 'serverId',
    required: false,
    type: String,
    description: 'Filter by server ID',
  })
  @ApiQuery({
    name: 'operation',
    required: false,
    type: String,
    description: 'Filter by operation type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by operation status',
    enum: ['success', 'error', 'timeout', 'retry'],
  })
  @ApiResponse({
    status: 200,
    description: 'Operation history retrieved successfully',
  })
  async getOperationHistory(
    @CurrentUser() user: RequestUser,
    @Query('limit') limit = 50,
    @Query('serverId') serverId?: string,
    @Query('operation') operation?: string,
    @Query('status') status?: string
  ): Promise<Record<string, unknown>[]> {
    // In a real implementation, this would query the operation history
    // For now, return mock data
    return [
      {
        operationId: 'op-123456789',
        operation: 'github.repo.list',
        serverId: 'github-mcp-1',
        status: 'success',
        executionTime: 245,
        totalTime: 260,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        userId: user.id,
      },
      {
        operationId: 'op-987654321',
        operation: 'slack.message.send',
        serverId: 'slack-mcp-1',
        status: 'success',
        executionTime: 150,
        totalTime: 165,
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        userId: user.id,
      },
    ]
      .filter(op => {
        if (serverId && op.serverId !== serverId) return false;
        if (operation && !op.operation.includes(operation)) return false;
        if (status && op.status !== status) return false;
        return true;
      })
      .slice(0, limit);
  }

  @Get('capabilities')
  @ApiOperation({
    summary: 'Get available capabilities',
    description: 'Retrieve all available capabilities across all registered servers',
  })
  @ApiResponse({
    status: 200,
    description: 'Capabilities retrieved successfully',
  })
  async getCapabilities(): Promise<Record<string, unknown>> {
    // In a real implementation, this would aggregate from all servers
    return {
      total: 25,
      categories: {
        'Version Control': {
          operations: ['create', 'read', 'update', 'delete', 'branch', 'merge', 'commit'],
          servers: ['github-mcp-1', 'gitlab-mcp-1'],
        },
        Communication: {
          operations: ['send', 'read', 'update', 'delete', 'channel', 'workspace'],
          servers: ['slack-mcp-1', 'teams-mcp-1'],
        },
        'Knowledge Management': {
          operations: ['create', 'read', 'update', 'query', 'database'],
          servers: ['notion-mcp-1', 'confluence-mcp-1'],
        },
        'Project Management': {
          operations: ['create', 'read', 'update', 'assign', 'track'],
          servers: ['jira-mcp-1', 'trello-mcp-1'],
        },
      },
      lastUpdated: new Date(),
    };
  }

  @Get('metrics/performance')
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Retrieve aggregated performance metrics across all integrations',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    description: 'Time period for metrics',
    enum: ['hour', 'day', 'week', 'month'],
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getPerformanceMetrics(@Query('period') period = 'day'): Promise<Record<string, unknown>> {
    // In a real implementation, this would aggregate from monitoring service
    return {
      period,
      totalOperations: 15420,
      successfulOperations: 14856,
      failedOperations: 564,
      averageResponseTime: 189,
      p95ResponseTime: 456,
      p99ResponseTime: 892,
      errorRate: 0.037,
      throughput: 12.5, // operations per second
      serverUtilization: {
        'github-mcp-1': 0.68,
        'slack-mcp-1': 0.45,
        'notion-mcp-1': 0.32,
      },
      topOperations: [
        { operation: 'github.repo.list', count: 3456 },
        { operation: 'slack.message.send', count: 2890 },
        { operation: 'notion.page.create', count: 1245 },
      ],
      lastUpdated: new Date(),
    };
  }

  /**
   * Utility methods
   */
  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateServerId(): string {
    return `server-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }
}
