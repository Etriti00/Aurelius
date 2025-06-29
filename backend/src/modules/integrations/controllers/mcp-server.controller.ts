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
import { MCPPoolManagerService } from '../services/mcp-pool-manager.service';
import { MCPMonitoringService } from '../services/mcp-monitoring.service';
import {
  MCPServerStatus,
  MCPServerPriority,
  LoadBalancingStrategy,
} from '../interfaces/mcp-server.interface';

interface CreatePoolDto {
  name: string;
  description: string;
  servers: string[];
  loadBalancingStrategy: LoadBalancingStrategy;
  configuration: {
    minActiveServers: number;
    maxActiveServers: number;
    healthCheckInterval: number;
    failoverTimeout: number;
    circuitBreakerThreshold: number;
  };
}

interface UpdateServerDto {
  name?: string;
  description?: string;
  status?: MCPServerStatus;
  priority?: MCPServerPriority;
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoint: string;
    expectedResponse?: string;
  };
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface ServerConnectionTestDto {
  endpoint: string;
  protocol: 'websocket' | 'http' | 'grpc';
  authentication: {
    type: 'apikey' | 'oauth2' | 'jwt' | 'basic' | 'none';
    credentials: Record<string, string>;
  };
  timeout?: number;
}

@ApiTags('mcp-servers')
@Controller('integrations/servers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MCPServerController {
  private readonly logger = new Logger(MCPServerController.name);

  constructor(
    private readonly poolManager: MCPPoolManagerService,
    private readonly monitoring: MCPMonitoringService
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all MCP servers',
    description: 'Retrieve a list of all registered MCP servers with filtering options',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MCPServerStatus,
    description: 'Filter by server status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: MCPServerPriority,
    description: 'Filter by server priority',
  })
  @ApiQuery({
    name: 'region',
    required: false,
    type: String,
    description: 'Filter by server region',
  })
  @ApiQuery({
    name: 'tag',
    required: false,
    type: String,
    description: 'Filter by server tag',
  })
  @ApiQuery({
    name: 'capability',
    required: false,
    type: String,
    description: 'Filter by server capability',
  })
  @ApiResponse({
    status: 200,
    description: 'Server list retrieved successfully',
  })
  async listServers(
    @Query('status') status?: MCPServerStatus,
    @Query('priority') priority?: MCPServerPriority,
    @Query('region') region?: string,
    @Query('tag') tag?: string,
    @Query('capability') capability?: string
  ): Promise<Record<string, unknown>[]> {
    // In a real implementation, this would query from the pool manager
    // For now, return mock data with filtering
    const mockServers = [
      {
        id: 'github-mcp-1',
        name: 'GitHub MCP Server #1',
        description: 'Primary GitHub integration server',
        status: MCPServerStatus.ACTIVE,
        priority: MCPServerPriority.HIGH,
        region: 'us-east-1',
        tags: ['github', 'vcs', 'primary'],
        capabilities: ['repository-management', 'issue-tracking'],
        endpoint: 'wss://github-mcp.aurelius.ai',
        protocol: 'websocket',
        healthScore: 95,
        activeConnections: 23,
        lastHealthCheck: new Date(Date.now() - 60000),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'slack-mcp-1',
        name: 'Slack MCP Server #1',
        description: 'Primary Slack integration server',
        status: MCPServerStatus.ACTIVE,
        priority: MCPServerPriority.HIGH,
        region: 'us-west-2',
        tags: ['slack', 'messaging', 'primary'],
        capabilities: ['messaging', 'workspace-management'],
        endpoint: 'https://slack-mcp.aurelius.ai',
        protocol: 'http',
        healthScore: 87,
        activeConnections: 15,
        lastHealthCheck: new Date(Date.now() - 45000),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'notion-mcp-1',
        name: 'Notion MCP Server #1',
        description: 'Primary Notion integration server',
        status: MCPServerStatus.DEGRADED,
        priority: MCPServerPriority.MEDIUM,
        region: 'us-east-1',
        tags: ['notion', 'database', 'knowledge'],
        capabilities: ['database-management', 'content-management'],
        endpoint: 'https://notion-mcp.aurelius.ai',
        protocol: 'http',
        healthScore: 72,
        activeConnections: 8,
        lastHealthCheck: new Date(Date.now() - 120000),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
    ];

    return mockServers.filter(server => {
      if (status && server.status !== status) return false;
      if (priority && server.priority !== priority) return false;
      if (region && server.region !== region) return false;
      if (tag && !server.tags.includes(tag)) return false;
      if (capability && !server.capabilities.includes(capability)) return false;
      return true;
    });
  }

  @Get(':serverId')
  @ApiOperation({
    summary: 'Get MCP server details',
    description: 'Retrieve detailed information about a specific MCP server',
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID of the MCP server',
    example: 'github-mcp-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Server details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  async getServer(@Param('serverId') serverId: string): Promise<Record<string, unknown>> {
    const serverHealth = this.poolManager.getServerHealth(serverId);

    if (!serverHealth) {
      throw new NotFoundException(`Server ${serverId} not found`);
    }

    return serverHealth;
  }

  @Put(':serverId')
  @ApiOperation({
    summary: 'Update MCP server configuration',
    description: 'Update configuration settings for an existing MCP server',
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID of the MCP server',
    example: 'github-mcp-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Server updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  async updateServer(
    @Param('serverId') serverId: string,
    @CurrentUser() user: RequestUser,
    @Body() updateDto: UpdateServerDto
  ): Promise<{ message: string; serverId: string }> {
    // In a real implementation, this would update the server configuration
    this.logger.log(`Updating server ${serverId} by user ${user.id} with data:`, updateDto);

    // Validate server exists
    const serverHealth = this.poolManager.getServerHealth(serverId);
    if (!serverHealth) {
      throw new NotFoundException(`Server ${serverId} not found`);
    }

    // Simulate update
    return {
      message: 'Server updated successfully',
      serverId,
    };
  }

  @Delete(':serverId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove MCP server',
    description: 'Remove an MCP server from the integration system',
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID of the MCP server',
    example: 'github-mcp-1',
  })
  @ApiResponse({
    status: 204,
    description: 'Server removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  async removeServer(
    @Param('serverId') serverId: string,
    @CurrentUser() user: RequestUser
  ): Promise<void> {
    // In a real implementation, this would remove the server
    this.logger.log(`Removing server ${serverId} by user ${user.id}`);

    // Validate server exists
    const serverHealth = this.poolManager.getServerHealth(serverId);
    if (!serverHealth) {
      throw new NotFoundException(`Server ${serverId} not found`);
    }

    // Simulate removal
  }

  @Post(':serverId/test-connection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test server connection',
    description: 'Test connectivity and authentication to an MCP server',
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID of the MCP server',
    example: 'github-mcp-1',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection test completed',
    schema: {
      example: {
        success: true,
        responseTime: 145,
        serverVersion: '1.0.0',
        capabilities: ['repository-management', 'issue-tracking'],
        timestamp: '2024-12-29T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  async testConnection(@Param('serverId') serverId: string): Promise<Record<string, unknown>> {
    // Validate server exists
    const serverHealth = this.poolManager.getServerHealth(serverId);
    if (!serverHealth) {
      throw new NotFoundException(`Server ${serverId} not found`);
    }

    const startTime = Date.now();

    // Simulate connection test
    await this.simulateDelay(100 + Math.random() * 200);

    const responseTime = Date.now() - startTime;
    const success = Math.random() > 0.1; // 90% success rate

    return {
      success,
      responseTime,
      serverVersion: '1.0.0',
      capabilities: ['repository-management', 'issue-tracking'],
      error: success ? undefined : 'Connection timeout',
      timestamp: new Date(),
    };
  }

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test connection to new server',
    description: 'Test connectivity to a server before registration',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection test completed',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid connection parameters',
  })
  async testNewConnection(
    @Body() connectionDto: ServerConnectionTestDto
  ): Promise<Record<string, unknown>> {
    const startTime = Date.now();

    try {
      // Simulate connection test
      await this.simulateDelay(connectionDto.timeout || 5000);

      const responseTime = Date.now() - startTime;
      const success = Math.random() > 0.2; // 80% success rate for new connections

      if (!success) {
        throw new Error('Connection failed: Authentication failed');
      }

      return {
        success: true,
        responseTime,
        endpoint: connectionDto.endpoint,
        protocol: connectionDto.protocol,
        authType: connectionDto.authentication.type,
        serverInfo: {
          version: '1.0.0',
          capabilities: ['basic-operations'],
          supportedProtocols: [connectionDto.protocol],
        },
        recommendations: [
          'Server appears healthy and responsive',
          'Authentication successful',
          'Ready for registration',
        ],
        timestamp: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        responseTime,
        endpoint: connectionDto.endpoint,
        protocol: connectionDto.protocol,
        error: (error as Error).message,
        recommendations: [
          'Check endpoint URL and protocol',
          'Verify authentication credentials',
          'Ensure server is accessible from this network',
        ],
        timestamp: new Date(),
      };
    }
  }

  @Get(':serverId/metrics')
  @ApiOperation({
    summary: 'Get server metrics',
    description: 'Retrieve performance and health metrics for a specific server',
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID of the MCP server',
    example: 'github-mcp-1',
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
    description: 'Server metrics retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  async getServerMetrics(
    @Param('serverId') serverId: string,
    @Query('period') period: 'minute' | 'hour' | 'day' = 'hour',
    @Query('limit') limit = 100
  ): Promise<unknown[]> {
    // Validate server exists
    const serverHealth = this.poolManager.getServerHealth(serverId);
    if (!serverHealth) {
      throw new NotFoundException(`Server ${serverId} not found`);
    }

    return this.monitoring.getAggregatedMetrics(serverId, period, limit);
  }

  @Get(':serverId/operations')
  @ApiOperation({
    summary: 'Get server operations history',
    description: 'Retrieve operation execution history for a specific server',
  })
  @ApiParam({
    name: 'serverId',
    description: 'ID of the MCP server',
    example: 'github-mcp-1',
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
    enum: ['success', 'error', 'timeout', 'retry'],
    description: 'Filter by operation status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of operations to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Operation history retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Server not found',
  })
  async getServerOperations(
    @Param('serverId') serverId: string,
    @Query('operation') operation?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 50
  ): Promise<Record<string, unknown>[]> {
    // Validate server exists
    const serverHealth = this.poolManager.getServerHealth(serverId);
    if (!serverHealth) {
      throw new NotFoundException(`Server ${serverId} not found`);
    }

    // In a real implementation, this would query operation history
    return [
      {
        operationId: 'op-123456789',
        operation: 'github.repo.list',
        status: 'success',
        executionTime: 245,
        totalTime: 260,
        timestamp: new Date(Date.now() - 3600000),
        parameters: { org: 'aurelius-ai' },
        response: { totalRepos: 15, publicRepos: 8 },
      },
      {
        operationId: 'op-987654321',
        operation: 'github.issue.create',
        status: 'success',
        executionTime: 189,
        totalTime: 195,
        timestamp: new Date(Date.now() - 7200000),
        parameters: { repo: 'aurelius-ai/backend', title: 'New feature request' },
        response: { issueId: 42, url: 'https://github.com/aurelius-ai/backend/issues/42' },
      },
    ]
      .filter(op => {
        if (operation && !op.operation.includes(operation)) return false;
        if (status && op.status !== status) return false;
        return true;
      })
      .slice(0, limit);
  }

  @Post('pools')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create server pool',
    description: 'Create a new server pool for load balancing and failover',
  })
  @ApiResponse({
    status: 201,
    description: 'Pool created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid pool configuration',
  })
  async createPool(
    @CurrentUser() user: RequestUser,
    @Body() poolDto: CreatePoolDto
  ): Promise<{ poolName: string; message: string }> {
    // Validate servers exist
    for (const serverId of poolDto.servers) {
      const serverHealth = this.poolManager.getServerHealth(serverId);
      if (!serverHealth) {
        throw new BadRequestException(`Server ${serverId} not found`);
      }
    }

    // Validate configuration
    if (poolDto.configuration.minActiveServers > poolDto.configuration.maxActiveServers) {
      throw new BadRequestException('minActiveServers cannot exceed maxActiveServers');
    }

    if (poolDto.configuration.minActiveServers > poolDto.servers.length) {
      throw new BadRequestException('minActiveServers cannot exceed total servers in pool');
    }

    this.poolManager.createPool(poolDto);

    this.logger.log(`Pool ${poolDto.name} created by user ${user.id}`);

    return {
      poolName: poolDto.name,
      message: 'Pool created successfully',
    };
  }

  @Get('pools/:poolName')
  @ApiOperation({
    summary: 'Get pool details',
    description: 'Retrieve detailed information about a specific server pool',
  })
  @ApiParam({
    name: 'poolName',
    description: 'Name of the server pool',
    example: 'github-pool',
  })
  @ApiResponse({
    status: 200,
    description: 'Pool details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Pool not found',
  })
  async getPool(@Param('poolName') poolName: string): Promise<Record<string, unknown> | null> {
    const poolStats = this.poolManager.getPoolStatistics(poolName);

    if (!poolStats) {
      throw new NotFoundException(`Pool ${poolName} not found`);
    }

    return poolStats;
  }

  @Get('capabilities/available')
  @ApiOperation({
    summary: 'Get available server capabilities',
    description: 'Retrieve all unique capabilities available across registered servers',
  })
  @ApiResponse({
    status: 200,
    description: 'Capabilities retrieved successfully',
  })
  async getAvailableCapabilities(): Promise<Record<string, unknown>> {
    // In a real implementation, this would aggregate from all servers
    return {
      capabilities: [
        {
          name: 'repository-management',
          description: 'Git repository operations',
          operations: ['create', 'read', 'update', 'delete', 'branch', 'merge'],
          servers: ['github-mcp-1', 'gitlab-mcp-1'],
          maturity: 'stable',
        },
        {
          name: 'issue-tracking',
          description: 'Issue and bug tracking',
          operations: ['create', 'read', 'update', 'close', 'comment', 'assign'],
          servers: ['github-mcp-1', 'jira-mcp-1'],
          maturity: 'stable',
        },
        {
          name: 'messaging',
          description: 'Team communication and messaging',
          operations: ['send', 'read', 'update', 'delete', 'react'],
          servers: ['slack-mcp-1', 'teams-mcp-1'],
          maturity: 'stable',
        },
        {
          name: 'database-management',
          description: 'Database and knowledge base operations',
          operations: ['create', 'read', 'update', 'query', 'export'],
          servers: ['notion-mcp-1', 'airtable-mcp-1'],
          maturity: 'beta',
        },
      ],
      totalCapabilities: 4,
      totalServers: 6,
      lastUpdated: new Date(),
    };
  }

  /**
   * Utility methods
   */
  private async simulateDelay(maxMs: number): Promise<void> {
    const delay = Math.random() * maxMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
