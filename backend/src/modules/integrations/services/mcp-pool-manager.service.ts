import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MCPServerConfig,
  MCPServerPool,
  MCPServerStatus,
  MCPServerPriority,
  LoadBalancingStrategy,
  MCPOperationRequest,
  MCPOperationResponse,
  MCPServerMetrics,
  MCPIntegrationEvent,
  MCPEventType,
} from '../interfaces/mcp-server.interface';

interface PoolManagerConfig {
  maxConcurrentOperations: number;
  defaultTimeout: number;
  healthCheckInterval: number;
  metricsCollectionInterval: number;
  connectionPoolSize: number;
  circuitBreakerThreshold: number;
  retryAttempts: number;
  loadBalancingStrategy: LoadBalancingStrategy;
}

interface ServerConnection {
  serverId: string;
  connection: unknown; // WebSocket | HttpClient | GrpcClient
  lastUsed: Date;
  activeRequests: number;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  metrics: MCPServerMetrics;
}

@Injectable()
export class MCPPoolManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MCPPoolManagerService.name);
  private readonly config: PoolManagerConfig;

  // Core data structures
  private readonly servers = new Map<string, MCPServerConfig>();
  private readonly pools = new Map<string, MCPServerPool>();
  private readonly connections = new Map<string, ServerConnection>();
  private readonly serverMetrics = new Map<string, MCPServerMetrics[]>();

  // Load balancing state
  private readonly roundRobinCounters = new Map<string, number>();
  private readonly serverWeights = new Map<string, number>();

  // Circuit breaker state
  private readonly circuitBreakerState = new Map<
    string,
    {
      state: 'closed' | 'open' | 'half-open';
      failureCount: number;
      lastFailureTime: Date;
      nextAttemptTime: Date;
    }
  >();

  // Background tasks
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private poolRebalancingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.config = {
      maxConcurrentOperations:
        this.configService.get<number>('integrations.maxConcurrentOperations') || 1000,
      defaultTimeout: this.configService.get<number>('integrations.defaultTimeout') || 30000,
      healthCheckInterval:
        this.configService.get<number>('integrations.healthCheckInterval') || 30000,
      metricsCollectionInterval:
        this.configService.get<number>('integrations.metricsCollectionInterval') || 10000,
      connectionPoolSize: this.configService.get<number>('integrations.connectionPoolSize') || 50,
      circuitBreakerThreshold:
        this.configService.get<number>('integrations.circuitBreakerThreshold') || 5,
      retryAttempts: this.configService.get<number>('integrations.retryAttempts') || 3,
      loadBalancingStrategy:
        this.configService.get<LoadBalancingStrategy>('integrations.loadBalancingStrategy') ||
        LoadBalancingStrategy.LEAST_CONNECTIONS,
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing MCP Pool Manager...');

    // Load server configurations
    await this.loadServerConfigurations();

    // Initialize connection pools
    await this.initializeConnectionPools();

    // Start background tasks
    this.startHealthChecks();
    this.startMetricsCollection();
    this.startPoolRebalancing();

    this.logger.log(
      `MCP Pool Manager initialized with ${this.servers.size} servers and ${this.pools.size} pools`
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down MCP Pool Manager...');

    // Stop background tasks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }
    if (this.poolRebalancingInterval) {
      clearInterval(this.poolRebalancingInterval);
    }

    // Close all connections
    await this.closeAllConnections();

    this.logger.log('MCP Pool Manager shutdown complete');
  }

  /**
   * Register a new MCP server
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    this.logger.log(`Registering MCP server: ${config.name} (${config.id})`);

    // Validate configuration
    this.validateServerConfig(config);

    // Store configuration
    this.servers.set(config.id, config);

    // Initialize circuit breaker state
    this.circuitBreakerState.set(config.id, {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: new Date(),
      nextAttemptTime: new Date(),
    });

    // Initialize server weight for load balancing
    this.calculateServerWeight(config.id);

    // Establish connection
    try {
      await this.establishConnection(config);
      this.logger.log(`Successfully connected to MCP server: ${config.name}`);

      // Emit server connected event
      this.emitIntegrationEvent({
        type: MCPEventType.SERVER_CONNECTED,
        serverId: config.id,
        timestamp: new Date(),
        data: { serverName: config.name, endpoint: config.endpoint },
        severity: 'info',
        category: 'connection',
        tags: ['mcp-server', 'connection'],
        correlationId: this.generateCorrelationId(),
      });
    } catch (error) {
      this.logger.error(`Failed to connect to MCP server ${config.name}:`, error);
      this.updateServerStatus(config.id, MCPServerStatus.FAILED);
    }
  }

  /**
   * Execute an operation on an MCP server
   */
  async executeOperation(request: MCPOperationRequest): Promise<MCPOperationResponse> {
    const startTime = Date.now();

    try {
      // Select appropriate server
      const serverId = await this.selectServer(request);
      if (!serverId) {
        throw new Error('No available MCP servers for operation');
      }

      // Get server connection
      const connection = this.connections.get(serverId);
      if (!connection) {
        throw new Error(`No connection available for server ${serverId}`);
      }

      // Check circuit breaker
      if (!this.isCircuitBreakerClosed(serverId)) {
        throw new Error(`Circuit breaker open for server ${serverId}`);
      }

      // Execute operation with timeout and retry logic
      const response = await this.executeWithRetry(connection, request);

      // Update metrics
      this.updateOperationMetrics(serverId, response, Date.now() - startTime);

      // Reset circuit breaker on success
      this.resetCircuitBreaker(serverId);

      return response;
    } catch (error) {
      // Handle operation failure
      this.handleOperationFailure(request, error as Error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Create a new server pool
   */
  createPool(poolConfig: Omit<MCPServerPool, 'state'>): void {
    const pool: MCPServerPool = {
      ...poolConfig,
      state: {
        activeServers: [],
        failedServers: [],
        maintenanceServers: [],
        totalCapacity: 0,
        currentLoad: 0,
      },
    };

    this.pools.set(poolConfig.name, pool);
    this.updatePoolState(poolConfig.name);

    this.logger.log(
      `Created MCP server pool: ${poolConfig.name} with ${poolConfig.servers.length} servers`
    );
  }

  /**
   * Get pool statistics
   */
  getPoolStatistics(poolName: string): Record<string, unknown> | null {
    const pool = this.pools.get(poolName);
    if (!pool) {
      return null;
    }

    const serverStats = pool.servers.map(serverId => {
      const server = this.servers.get(serverId);
      const connection = this.connections.get(serverId);
      const metrics = this.getLatestMetrics(serverId);

      return {
        serverId,
        serverName: server?.name,
        status: server?.status,
        activeConnections: connection?.activeRequests || 0,
        healthStatus: connection?.healthStatus,
        responseTime: metrics?.responseTime,
        errorRate: metrics?.errorRate,
      };
    });

    return {
      poolName: pool.name,
      totalServers: pool.servers.length,
      activeServers: pool.state.activeServers.length,
      failedServers: pool.state.failedServers.length,
      maintenanceServers: pool.state.maintenanceServers.length,
      totalCapacity: pool.state.totalCapacity,
      currentLoad: pool.state.currentLoad,
      loadBalancingStrategy: pool.loadBalancingStrategy,
      servers: serverStats,
    };
  }

  /**
   * Get server health status
   */
  getServerHealth(serverId: string): Record<string, unknown> | null {
    const server = this.servers.get(serverId);
    const connection = this.connections.get(serverId);
    const metrics = this.getLatestMetrics(serverId);
    const circuitBreaker = this.circuitBreakerState.get(serverId);

    if (!server) {
      return null;
    }

    return {
      serverId,
      serverName: server.name,
      status: server.status,
      endpoint: server.endpoint,
      protocol: server.protocol,
      region: server.region,
      priority: server.priority,
      connectionStatus: connection?.healthStatus || 'unknown',
      activeRequests: connection?.activeRequests || 0,
      circuitBreakerState: circuitBreaker?.state || 'unknown',
      metrics: metrics
        ? {
            responseTime: metrics.responseTime,
            throughput: metrics.throughput,
            errorRate: metrics.errorRate,
            successRate: metrics.successRate,
            networkLatency: metrics.networkLatency,
          }
        : null,
      lastUpdated: new Date(),
    };
  }

  /**
   * Load server configurations from database or config files
   */
  private async loadServerConfigurations(): Promise<void> {
    // In a real implementation, this would load from database
    // For now, we'll load from configuration
    const serverConfigs = this.configService.get<MCPServerConfig[]>('integrations.servers') || [];

    for (const config of serverConfigs) {
      this.servers.set(config.id, config);
    }

    this.logger.log(`Loaded ${serverConfigs.length} MCP server configurations`);
  }

  /**
   * Initialize connection pools for all servers
   */
  private async initializeConnectionPools(): Promise<void> {
    const connectionPromises = Array.from(this.servers.values()).map(async server => {
      try {
        await this.establishConnection(server);
      } catch (error) {
        this.logger.error(`Failed to establish connection to ${server.name}:`, error);
        this.updateServerStatus(server.id, MCPServerStatus.FAILED);
      }
    });

    await Promise.allSettled(connectionPromises);

    this.logger.log(`Initialized connections to ${this.connections.size} MCP servers`);
  }

  /**
   * Establish connection to an MCP server
   */
  private async establishConnection(server: MCPServerConfig): Promise<void> {
    // Implementation would depend on the protocol
    // This is a simplified mock implementation
    const connection: ServerConnection = {
      serverId: server.id,
      connection: this.createProtocolConnection(server),
      lastUsed: new Date(),
      activeRequests: 0,
      healthStatus: 'healthy',
      metrics: this.createInitialMetrics(server.id),
    };

    this.connections.set(server.id, connection);
    this.updateServerStatus(server.id, MCPServerStatus.ACTIVE);
  }

  /**
   * Create protocol-specific connection
   */
  private createProtocolConnection(server: MCPServerConfig): unknown {
    // This would create actual connections based on protocol
    switch (server.protocol) {
      case 'websocket':
        return { type: 'websocket', endpoint: server.endpoint };
      case 'http':
        return { type: 'http', endpoint: server.endpoint };
      case 'grpc':
        return { type: 'grpc', endpoint: server.endpoint };
      default:
        throw new Error(`Unsupported protocol: ${server.protocol}`);
    }
  }

  /**
   * Select the best server for an operation
   */
  private async selectServer(request: MCPOperationRequest): Promise<string | null> {
    // If specific server requested
    if (request.serverId) {
      const server = this.servers.get(request.serverId);
      if (server && server.status === MCPServerStatus.ACTIVE) {
        return request.serverId;
      }
      return null;
    }

    // If pool-based routing requested
    if (request.poolId) {
      return this.selectServerFromPool(request.poolId, request);
    }

    // Select from all available servers
    return this.selectServerFromAll(request);
  }

  /**
   * Select server from a specific pool
   */
  private selectServerFromPool(poolId: string, request: MCPOperationRequest): string | null {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return null;
    }

    const availableServers = pool.state.activeServers.filter(serverId => {
      const server = this.servers.get(serverId);
      return (
        server &&
        server.status === MCPServerStatus.ACTIVE &&
        this.isCircuitBreakerClosed(serverId) &&
        this.serverSupportsOperation(serverId, request.operation)
      );
    });

    if (availableServers.length === 0) {
      return null;
    }

    return this.applyLoadBalancingStrategy(availableServers, pool.loadBalancingStrategy);
  }

  /**
   * Select server from all available servers
   */
  private selectServerFromAll(request: MCPOperationRequest): string | null {
    const availableServers = Array.from(this.servers.keys()).filter(serverId => {
      const server = this.servers.get(serverId);
      return (
        server &&
        server.status === MCPServerStatus.ACTIVE &&
        this.isCircuitBreakerClosed(serverId) &&
        this.serverSupportsOperation(serverId, request.operation)
      );
    });

    if (availableServers.length === 0) {
      return null;
    }

    return this.applyLoadBalancingStrategy(availableServers, this.config.loadBalancingStrategy);
  }

  /**
   * Apply load balancing strategy to select a server
   */
  private applyLoadBalancingStrategy(servers: string[], strategy: LoadBalancingStrategy): string {
    switch (strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(servers);
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        return this.selectLeastConnections(servers);
      case LoadBalancingStrategy.LEAST_RESPONSE_TIME:
        return this.selectLeastResponseTime(servers);
      case LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
        return this.selectWeightedRoundRobin(servers);
      case LoadBalancingStrategy.PRIORITY_BASED:
        return this.selectPriorityBased(servers);
      case LoadBalancingStrategy.RANDOM:
        return servers[Math.floor(Math.random() * servers.length)];
      default:
        return servers[0];
    }
  }

  /**
   * Round-robin server selection
   */
  private selectRoundRobin(servers: string[]): string {
    const key = servers.join(',');
    const currentIndex = this.roundRobinCounters.get(key) || 0;
    const nextIndex = (currentIndex + 1) % servers.length;
    this.roundRobinCounters.set(key, nextIndex);
    return servers[currentIndex];
  }

  /**
   * Least connections server selection
   */
  private selectLeastConnections(servers: string[]): string {
    return servers.reduce((leastConnected, serverId) => {
      const currentConnections = this.connections.get(serverId)?.activeRequests || 0;
      const leastConnections = this.connections.get(leastConnected)?.activeRequests || 0;
      return currentConnections < leastConnections ? serverId : leastConnected;
    });
  }

  /**
   * Least response time server selection
   */
  private selectLeastResponseTime(servers: string[]): string {
    return servers.reduce((fastest, serverId) => {
      const currentResponseTime = this.getLatestMetrics(serverId)?.responseTime || Infinity;
      const fastestResponseTime = this.getLatestMetrics(fastest)?.responseTime || Infinity;
      return currentResponseTime < fastestResponseTime ? serverId : fastest;
    });
  }

  /**
   * Weighted round-robin server selection
   */
  private selectWeightedRoundRobin(servers: string[]): string {
    // Simplified implementation - would be more complex in reality
    const weightedServers: string[] = [];
    servers.forEach(serverId => {
      const weight = this.serverWeights.get(serverId) || 1;
      for (let i = 0; i < weight; i++) {
        weightedServers.push(serverId);
      }
    });

    return this.selectRoundRobin(weightedServers);
  }

  /**
   * Priority-based server selection
   */
  private selectPriorityBased(servers: string[]): string {
    const serversByPriority = servers.sort((a, b) => {
      const priorityA = this.servers.get(a)?.priority || MCPServerPriority.LOW;
      const priorityB = this.servers.get(b)?.priority || MCPServerPriority.LOW;
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[priorityB] - priorityOrder[priorityA];
    });

    return serversByPriority[0];
  }

  /**
   * Check if server supports a specific operation
   */
  private serverSupportsOperation(serverId: string, operation: string): boolean {
    const server = this.servers.get(serverId);
    return server ? server.supportedOperations.includes(operation) : false;
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry(
    connection: ServerConnection,
    request: MCPOperationRequest
  ): Promise<MCPOperationResponse> {
    const maxRetries = request.retryConfig?.maxRetries || this.config.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Simulate operation execution
        const response = await this.executeActualOperation(connection, request);
        return response;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt, request.retryConfig);
          await this.sleep(delay);

          this.emitIntegrationEvent({
            type: MCPEventType.OPERATION_RETRIED,
            serverId: connection.serverId,
            timestamp: new Date(),
            data: {
              operationId: request.operationId,
              attempt: attempt + 1,
              maxRetries,
              error: lastError.message,
            },
            severity: 'warning',
            category: 'operation',
            tags: ['retry', 'operation'],
            correlationId: request.traceId,
          });
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Execute the actual operation (simplified mock)
   */
  private async executeActualOperation(
    connection: ServerConnection,
    request: MCPOperationRequest
  ): Promise<MCPOperationResponse> {
    const startTime = Date.now();

    // Simulate network delay
    await this.sleep(Math.random() * 100 + 50);

    // Simulate occasional failures
    if (Math.random() < 0.05) {
      // 5% failure rate
      throw new Error('Simulated operation failure');
    }

    const executionTime = Date.now() - startTime;

    return {
      operationId: request.operationId,
      serverId: connection.serverId,
      status: 'success',
      data: { result: 'Operation completed successfully' },
      executionTime,
      networkTime: Math.random() * 20 + 10,
      totalTime: executionTime,
      serverVersion: '1.0.0',
      responseSize: 1024,
      traceId: request.traceId,
      spanId: this.generateSpanId(),
      timestamp: new Date(),
    };
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(
    attempt: number,
    retryConfig?: MCPOperationRequest['retryConfig']
  ): number {
    const initialDelay = retryConfig?.initialDelay || 1000;
    const maxDelay = retryConfig?.maxDelay || 10000;

    if (retryConfig?.backoffStrategy === 'exponential') {
      return Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
    }

    return Math.min(initialDelay * (attempt + 1), maxDelay);
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.servers.keys()).map(async serverId => {
      try {
        const isHealthy = await this.checkServerHealth(serverId);
        this.updateConnectionHealth(serverId, isHealthy ? 'healthy' : 'unhealthy');
      } catch (error) {
        this.logger.error(`Health check failed for server ${serverId}:`, error);
        this.updateConnectionHealth(serverId, 'unhealthy');
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Check individual server health
   */
  private async checkServerHealth(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server || !server.healthCheck.enabled) {
      return true; // Assume healthy if no health check configured
    }

    // Simulate health check
    await this.sleep(Math.random() * 100 + 50);

    // Simulate occasional health check failures
    return Math.random() > 0.02; // 2% failure rate
  }

  /**
   * Update connection health status
   */
  private updateConnectionHealth(serverId: string, healthStatus: 'healthy' | 'unhealthy'): void {
    const connection = this.connections.get(serverId);
    if (connection) {
      const previousHealth = connection.healthStatus;
      connection.healthStatus = healthStatus;

      if (previousHealth !== healthStatus) {
        const eventType =
          healthStatus === 'healthy'
            ? MCPEventType.SERVER_HEALTH_CHECK_RECOVERED
            : MCPEventType.SERVER_HEALTH_CHECK_FAILED;

        this.emitIntegrationEvent({
          type: eventType,
          serverId,
          timestamp: new Date(),
          data: { previousHealth, currentHealth: healthStatus },
          severity: healthStatus === 'healthy' ? 'info' : 'warning',
          category: 'health',
          tags: ['health-check', 'server'],
          correlationId: this.generateCorrelationId(),
        });
      }
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.metricsCollectionInterval);
  }

  /**
   * Collect metrics from all servers
   */
  private async collectMetrics(): Promise<void> {
    for (const [serverId, connection] of this.connections) {
      const metrics = await this.collectServerMetrics(serverId, connection);
      this.storeMetrics(serverId, metrics);
    }
  }

  /**
   * Collect metrics for a specific server
   */
  private async collectServerMetrics(
    serverId: string,
    connection: ServerConnection
  ): Promise<MCPServerMetrics> {
    // In a real implementation, this would collect actual metrics
    return {
      serverId,
      timestamp: new Date(),
      responseTime: Math.random() * 200 + 50,
      throughput: Math.random() * 100 + 10,
      errorRate: Math.random() * 0.05,
      successRate: 0.95 + Math.random() * 0.05,
      networkLatency: Math.random() * 50 + 10,
      activeConnections: connection.activeRequests,
      connectionPoolSize: this.config.connectionPoolSize,
      waitingRequests: Math.floor(Math.random() * 5),
      totalRequests: Math.floor(Math.random() * 1000 + 100),
      successfulRequests: Math.floor(Math.random() * 950 + 90),
      failedRequests: Math.floor(Math.random() * 50 + 5),
      retryAttempts: Math.floor(Math.random() * 10),
    };
  }

  /**
   * Store metrics for a server
   */
  private storeMetrics(serverId: string, metrics: MCPServerMetrics): void {
    const serverMetrics = this.serverMetrics.get(serverId) || [];
    serverMetrics.push(metrics);

    // Keep only the last 100 metrics entries
    if (serverMetrics.length > 100) {
      serverMetrics.splice(0, serverMetrics.length - 100);
    }

    this.serverMetrics.set(serverId, serverMetrics);
  }

  /**
   * Get latest metrics for a server
   */
  private getLatestMetrics(serverId: string): MCPServerMetrics | null {
    const metrics = this.serverMetrics.get(serverId);
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  /**
   * Start pool rebalancing
   */
  private startPoolRebalancing(): void {
    this.poolRebalancingInterval = setInterval(async () => {
      await this.rebalancePools();
    }, 60000); // Every minute
  }

  /**
   * Rebalance all pools
   */
  private async rebalancePools(): Promise<void> {
    for (const [poolName] of this.pools) {
      await this.rebalancePool(poolName);
    }
  }

  /**
   * Rebalance a specific pool
   */
  private async rebalancePool(poolName: string): Promise<void> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      return;
    }

    this.emitIntegrationEvent({
      type: MCPEventType.POOL_REBALANCING_STARTED,
      serverId: '',
      timestamp: new Date(),
      data: { poolName, currentActiveServers: pool.state.activeServers.length },
      severity: 'info',
      category: 'pool',
      tags: ['rebalancing', 'pool'],
      correlationId: this.generateCorrelationId(),
    });

    this.updatePoolState(poolName);

    this.emitIntegrationEvent({
      type: MCPEventType.POOL_REBALANCING_COMPLETED,
      serverId: '',
      timestamp: new Date(),
      data: { poolName, newActiveServers: pool.state.activeServers.length },
      severity: 'info',
      category: 'pool',
      tags: ['rebalancing', 'pool'],
      correlationId: this.generateCorrelationId(),
    });
  }

  /**
   * Update pool state based on current server health
   */
  private updatePoolState(poolName: string): void {
    const pool = this.pools.get(poolName);
    if (!pool) {
      return;
    }

    const activeServers: string[] = [];
    const failedServers: string[] = [];
    const maintenanceServers: string[] = [];
    let totalCapacity = 0;
    let currentLoad = 0;

    for (const serverId of pool.servers) {
      const server = this.servers.get(serverId);
      const connection = this.connections.get(serverId);

      if (!server) continue;

      switch (server.status) {
        case MCPServerStatus.ACTIVE:
          if (connection?.healthStatus === 'healthy') {
            activeServers.push(serverId);
            totalCapacity += server.performance.maxConcurrentConnections;
            currentLoad += connection.activeRequests;
          } else {
            failedServers.push(serverId);
          }
          break;
        case MCPServerStatus.MAINTENANCE:
          maintenanceServers.push(serverId);
          break;
        default:
          failedServers.push(serverId);
      }
    }

    pool.state = {
      activeServers,
      failedServers,
      maintenanceServers,
      totalCapacity,
      currentLoad,
    };
  }

  /**
   * Circuit breaker methods
   */
  private isCircuitBreakerClosed(serverId: string): boolean {
    const state = this.circuitBreakerState.get(serverId);
    return state ? state.state === 'closed' : true;
  }

  private recordCircuitBreakerFailure(serverId: string): void {
    const state = this.circuitBreakerState.get(serverId);
    if (!state) return;

    state.failureCount++;
    state.lastFailureTime = new Date();

    if (state.failureCount >= this.config.circuitBreakerThreshold) {
      state.state = 'open';
      state.nextAttemptTime = new Date(Date.now() + 60000); // 1 minute

      this.emitIntegrationEvent({
        type: MCPEventType.CIRCUIT_BREAKER_OPENED,
        serverId,
        timestamp: new Date(),
        data: { failureCount: state.failureCount, threshold: this.config.circuitBreakerThreshold },
        severity: 'error',
        category: 'circuit-breaker',
        tags: ['circuit-breaker', 'failure'],
        correlationId: this.generateCorrelationId(),
      });
    }
  }

  private resetCircuitBreaker(serverId: string): void {
    const state = this.circuitBreakerState.get(serverId);
    if (state && state.state !== 'closed') {
      state.state = 'closed';
      state.failureCount = 0;

      this.emitIntegrationEvent({
        type: MCPEventType.CIRCUIT_BREAKER_CLOSED,
        serverId,
        timestamp: new Date(),
        data: { message: 'Circuit breaker reset to closed state' },
        severity: 'info',
        category: 'circuit-breaker',
        tags: ['circuit-breaker', 'recovery'],
        correlationId: this.generateCorrelationId(),
      });
    }
  }

  /**
   * Utility methods
   */
  private validateServerConfig(config: MCPServerConfig): void {
    if (!config.id || !config.name || !config.endpoint) {
      throw new Error('Server configuration missing required fields');
    }

    if (!['websocket', 'http', 'grpc'].includes(config.protocol)) {
      throw new Error(`Unsupported protocol: ${config.protocol}`);
    }
  }

  private updateServerStatus(serverId: string, status: MCPServerStatus): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = status;
      server.updatedAt = new Date();
    }
  }

  private calculateServerWeight(serverId: string): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    // Weight based on priority and performance characteristics
    let weight = 1;

    switch (server.priority) {
      case MCPServerPriority.CRITICAL:
        weight = 4;
        break;
      case MCPServerPriority.HIGH:
        weight = 3;
        break;
      case MCPServerPriority.MEDIUM:
        weight = 2;
        break;
      case MCPServerPriority.LOW:
        weight = 1;
        break;
    }

    // Adjust based on performance
    if (server.performance.averageResponseTime < 100) {
      weight *= 1.5;
    } else if (server.performance.averageResponseTime > 500) {
      weight *= 0.5;
    }

    this.serverWeights.set(serverId, Math.max(1, Math.floor(weight)));
  }

  private createInitialMetrics(serverId: string): MCPServerMetrics {
    return {
      serverId,
      timestamp: new Date(),
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      successRate: 1,
      networkLatency: 0,
      activeConnections: 0,
      connectionPoolSize: 0,
      waitingRequests: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retryAttempts: 0,
    };
  }

  private updateOperationMetrics(
    serverId: string,
    response: MCPOperationResponse,
    totalTime: number
  ): void {
    const connection = this.connections.get(serverId);
    if (connection) {
      // Update connection metrics
      connection.lastUsed = new Date();
      connection.metrics.totalRequests++;

      if (response.status === 'success') {
        connection.metrics.successfulRequests++;
      } else {
        connection.metrics.failedRequests++;
      }

      // Update response time (simple moving average)
      connection.metrics.responseTime = (connection.metrics.responseTime + totalTime) / 2;
      connection.metrics.successRate =
        connection.metrics.successfulRequests / connection.metrics.totalRequests;
      connection.metrics.errorRate =
        connection.metrics.failedRequests / connection.metrics.totalRequests;
    }
  }

  private handleOperationFailure(
    request: MCPOperationRequest,
    error: Error,
    executionTime: number
  ): void {
    if (request.serverId) {
      this.recordCircuitBreakerFailure(request.serverId);

      this.emitIntegrationEvent({
        type: MCPEventType.OPERATION_FAILED,
        serverId: request.serverId,
        timestamp: new Date(),
        data: {
          operationId: request.operationId,
          operation: request.operation,
          error: error.message,
          executionTime,
        },
        severity: 'error',
        category: 'operation',
        tags: ['operation', 'failure'],
        correlationId: request.traceId,
        userId: request.userId,
        operationId: request.operationId,
      });
    }
  }

  private emitIntegrationEvent(event: MCPIntegrationEvent): void {
    this.eventEmitter.emit('mcp.integration.event', event);
  }

  private async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map(async serverId => {
      try {
        // In a real implementation, this would properly close the connection
        this.connections.delete(serverId);
        this.updateServerStatus(serverId, MCPServerStatus.INACTIVE);
      } catch (error) {
        this.logger.error(`Error closing connection to server ${serverId}:`, error);
      }
    });

    await Promise.allSettled(closePromises);
  }

  private generateCorrelationId(): string {
    return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
