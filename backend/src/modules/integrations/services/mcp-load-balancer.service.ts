import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MCPServerConfig,
  MCPServerPriority,
  LoadBalancingStrategy,
  MCPOperationRequest,
  MCPServerMetrics,
  MCPIntegrationEvent,
  MCPEventType,
} from '../interfaces/mcp-server.interface';

interface LoadBalancerConfig {
  defaultStrategy: LoadBalancingStrategy;
  healthCheckWeight: number;
  performanceWeight: number;
  priorityWeight: number;
  failoverThreshold: number;
  autoRebalanceInterval: number;
  connectionDrainTimeout: number;
}

interface ServerLoad {
  serverId: string;
  activeConnections: number;
  queuedRequests: number;
  avgResponseTime: number;
  errorRate: number;
  weight: number;
  lastUpdated: Date;
}

interface FailoverGroup {
  primary: string[];
  secondary: string[];
  emergency: string[];
  lastFailover: Date;
  failoverCount: number;
}

interface LoadBalancingDecision {
  selectedServer: string;
  strategy: LoadBalancingStrategy;
  reason: string;
  alternatives: string[];
  confidence: number; // 0-1 scale
  expectedResponseTime: number;
  metadata: Record<string, unknown>;
}

interface ConsistentHashRing {
  nodes: Map<number, string>;
  virtualNodes: number;
  sortedHashes: number[];
}

@Injectable()
export class MCPLoadBalancerService implements OnModuleInit {
  private readonly logger = new Logger(MCPLoadBalancerService.name);
  private readonly config: LoadBalancerConfig;

  // Load balancing state
  private readonly serverLoads = new Map<string, ServerLoad>();
  private readonly roundRobinCounters = new Map<string, number>();
  private readonly consistentHashRings = new Map<string, ConsistentHashRing>();
  private readonly failoverGroups = new Map<string, FailoverGroup>();
  private readonly stickySessionMap = new Map<string, string>(); // sessionId -> serverId

  // Adaptive learning
  private readonly operationHistory = new Map<
    string,
    {
      serverId: string;
      responseTime: number;
      success: boolean;
      timestamp: Date;
    }[]
  >();
  private readonly serverPerformanceProfiles = new Map<
    string,
    {
      operationPerformance: Map<string, { avgTime: number; successRate: number }>;
      peakHours: number[];
      reliabilityScore: number;
      lastProfileUpdate: Date;
    }
  >();

  // Circuit breaker integration
  private readonly circuitBreakerStates = new Map<
    string,
    {
      state: 'closed' | 'open' | 'half-open';
      failureCount: number;
      lastFailure: Date;
      nextAttempt: Date;
    }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.config = {
      defaultStrategy:
        this.configService.get<LoadBalancingStrategy>('integrations.loadBalancingStrategy') ||
        LoadBalancingStrategy.LEAST_CONNECTIONS,
      healthCheckWeight: this.configService.get<number>('integrations.healthCheckWeight') || 0.3,
      performanceWeight: this.configService.get<number>('integrations.performanceWeight') || 0.4,
      priorityWeight: this.configService.get<number>('integrations.priorityWeight') || 0.3,
      failoverThreshold: this.configService.get<number>('integrations.failoverThreshold') || 0.7,
      autoRebalanceInterval:
        this.configService.get<number>('integrations.autoRebalanceInterval') || 300000, // 5 minutes
      connectionDrainTimeout:
        this.configService.get<number>('integrations.connectionDrainTimeout') || 30000,
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing MCP Load Balancer Service...');

    // Start background tasks
    this.startAutoRebalancing();
    this.startPerformanceProfiling();

    this.logger.log('MCP Load Balancer Service initialized');
  }

  /**
   * Select the best server for an operation using intelligent load balancing
   */
  async selectServer(
    availableServers: string[],
    request: MCPOperationRequest,
    strategy?: LoadBalancingStrategy
  ): Promise<LoadBalancingDecision> {
    if (availableServers.length === 0) {
      throw new Error('No available servers for load balancing');
    }

    if (availableServers.length === 1) {
      return {
        selectedServer: availableServers[0],
        strategy: LoadBalancingStrategy.RANDOM,
        reason: 'Only one server available',
        alternatives: [],
        confidence: 1.0,
        expectedResponseTime: this.getExpectedResponseTime(availableServers[0], request.operation),
        metadata: { singleServer: true },
      };
    }

    const balancingStrategy = strategy || this.config.defaultStrategy;

    // Filter servers based on circuit breaker state
    const healthyServers = availableServers.filter(serverId =>
      this.isCircuitBreakerClosed(serverId)
    );

    if (healthyServers.length === 0) {
      // All servers have open circuit breakers, try half-open servers
      const halfOpenServers = availableServers.filter(
        serverId => this.getCircuitBreakerState(serverId) === 'half-open'
      );

      if (halfOpenServers.length > 0) {
        return this.selectFromHalfOpenServers(halfOpenServers, request);
      }

      throw new Error('All servers unavailable due to circuit breaker');
    }

    // Check for sticky session requirement
    if (request.sessionId && this.stickySessionMap.has(request.sessionId)) {
      const stickyServer = this.stickySessionMap.get(request.sessionId);
      if (!stickyServer) {
        throw new Error('Session mapping not found');
      }
      if (healthyServers.includes(stickyServer)) {
        return {
          selectedServer: stickyServer,
          strategy: LoadBalancingStrategy.CONSISTENT_HASH,
          reason: 'Sticky session maintenance',
          alternatives: healthyServers.filter(s => s !== stickyServer),
          confidence: 0.9,
          expectedResponseTime: this.getExpectedResponseTime(stickyServer, request.operation),
          metadata: { stickySession: true, sessionId: request.sessionId },
        };
      }
    }

    // Apply load balancing strategy
    let decision: LoadBalancingDecision;

    switch (balancingStrategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        decision = this.selectRoundRobin(healthyServers, request);
        break;
      case LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
        decision = this.selectWeightedRoundRobin(healthyServers, request);
        break;
      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        decision = this.selectLeastConnections(healthyServers, request);
        break;
      case LoadBalancingStrategy.LEAST_RESPONSE_TIME:
        decision = this.selectLeastResponseTime(healthyServers, request);
        break;
      case LoadBalancingStrategy.PRIORITY_BASED:
        decision = this.selectPriorityBased(healthyServers, request);
        break;
      case LoadBalancingStrategy.CONSISTENT_HASH:
        decision = this.selectConsistentHash(healthyServers, request);
        break;
      case LoadBalancingStrategy.RANDOM:
        decision = this.selectRandom(healthyServers, request);
        break;
      default:
        decision = this.selectIntelligent(healthyServers, request);
    }

    // Set up sticky session if needed
    if (request.sessionId && !this.stickySessionMap.has(request.sessionId)) {
      this.stickySessionMap.set(request.sessionId, decision.selectedServer);
    }

    // Record decision for learning
    this.recordLoadBalancingDecision(decision, request);

    return decision;
  }

  /**
   * Update server load information
   */
  updateServerLoad(serverId: string, metrics: MCPServerMetrics): void {
    const load: ServerLoad = {
      serverId,
      activeConnections: metrics.activeConnections,
      queuedRequests: metrics.waitingRequests,
      avgResponseTime: metrics.responseTime,
      errorRate: metrics.errorRate,
      weight: this.calculateServerWeight(serverId, metrics),
      lastUpdated: new Date(),
    };

    this.serverLoads.set(serverId, load);
    this.updatePerformanceProfile(serverId, metrics);
  }

  /**
   * Handle server failure and trigger failover
   */
  async handleServerFailure(failedServerId: string, poolName?: string): Promise<string[]> {
    this.logger.warn(`Handling server failure: ${failedServerId}`);

    // Update circuit breaker
    this.recordCircuitBreakerFailure(failedServerId);

    // Get failover group
    const failoverGroup = poolName ? this.failoverGroups.get(poolName) : null;

    let failoverCandidates: string[] = [];

    if (failoverGroup) {
      // Remove failed server from primary and add to emergency
      failoverGroup.primary = failoverGroup.primary.filter(s => s !== failedServerId);

      if (!failoverGroup.emergency.includes(failedServerId)) {
        failoverGroup.emergency.push(failedServerId);
      }

      // Get available servers from secondary tier
      failoverCandidates = failoverGroup.secondary.filter(serverId =>
        this.isCircuitBreakerClosed(serverId)
      );

      // Update failover statistics
      failoverGroup.lastFailover = new Date();
      failoverGroup.failoverCount++;

      this.logger.log(
        `Failover triggered for pool ${poolName}. Available candidates: ${failoverCandidates.length}`
      );
    }

    // Emit failover event
    this.eventEmitter.emit('mcp.integration.event', {
      type: MCPEventType.POOL_FAILOVER_TRIGGERED,
      serverId: failedServerId,
      timestamp: new Date(),
      data: {
        failedServer: failedServerId,
        poolName,
        failoverCandidates,
        failoverGroup: failoverGroup
          ? {
              primaryCount: failoverGroup.primary.length,
              secondaryCount: failoverGroup.secondary.length,
              emergencyCount: failoverGroup.emergency.length,
            }
          : null,
      },
      severity: 'error',
      category: 'failover',
      tags: ['failover', 'server-failure'],
      correlationId: this.generateCorrelationId(),
    } as MCPIntegrationEvent);

    return failoverCandidates;
  }

  /**
   * Setup failover groups for a pool
   */
  setupFailoverGroup(poolName: string, servers: MCPServerConfig[]): void {
    const sortedServers = servers.sort((a, b) => {
      const priorityOrder = {
        [MCPServerPriority.CRITICAL]: 4,
        [MCPServerPriority.HIGH]: 3,
        [MCPServerPriority.MEDIUM]: 2,
        [MCPServerPriority.LOW]: 1,
      };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const totalServers = sortedServers.length;
    const primaryCount = Math.ceil(totalServers * 0.6); // 60% primary
    const secondaryCount = Math.ceil(totalServers * 0.3); // 30% secondary
    // Remaining 10% are emergency

    const failoverGroup: FailoverGroup = {
      primary: sortedServers.slice(0, primaryCount).map(s => s.id),
      secondary: sortedServers.slice(primaryCount, primaryCount + secondaryCount).map(s => s.id),
      emergency: sortedServers.slice(primaryCount + secondaryCount).map(s => s.id),
      lastFailover: new Date(0),
      failoverCount: 0,
    };

    this.failoverGroups.set(poolName, failoverGroup);

    this.logger.log(
      `Failover group setup for ${poolName}: Primary(${failoverGroup.primary.length}), Secondary(${failoverGroup.secondary.length}), Emergency(${failoverGroup.emergency.length})`
    );
  }

  /**
   * Rebalance connections across servers
   */
  async rebalanceConnections(poolName: string, servers: string[]): Promise<void> {
    this.logger.log(`Starting connection rebalancing for pool: ${poolName}`);

    const serverLoads = servers
      .map(serverId => this.serverLoads.get(serverId))
      .filter(Boolean) as ServerLoad[];

    if (serverLoads.length === 0) {
      return;
    }

    // Calculate load distribution
    const totalConnections = serverLoads.reduce((sum, load) => sum + load.activeConnections, 0);
    const avgConnections = totalConnections / serverLoads.length;
    const threshold = avgConnections * 1.5; // 50% above average

    // Find overloaded servers
    const overloadedServers = serverLoads.filter(load => load.activeConnections > threshold);
    const underloadedServers = serverLoads.filter(
      load => load.activeConnections < avgConnections * 0.5
    );

    if (overloadedServers.length === 0) {
      this.logger.debug(`No rebalancing needed for pool ${poolName}`);
      return;
    }

    // Emit rebalancing event
    this.eventEmitter.emit('mcp.integration.event', {
      type: MCPEventType.POOL_REBALANCING_STARTED,
      serverId: '',
      timestamp: new Date(),
      data: {
        poolName,
        totalConnections,
        avgConnections,
        overloadedServers: overloadedServers.map(s => s.serverId),
        underloadedServers: underloadedServers.map(s => s.serverId),
      },
      severity: 'info',
      category: 'rebalancing',
      tags: ['rebalancing', 'load-balancing'],
      correlationId: this.generateCorrelationId(),
    } as MCPIntegrationEvent);

    // In a real implementation, this would:
    // 1. Gradually drain connections from overloaded servers
    // 2. Route new connections to underloaded servers
    // 3. Update weights to reflect new distribution

    // For now, update weights to influence future routing
    for (const load of overloadedServers) {
      const currentWeight = load.weight;
      const newWeight = Math.max(0.1, currentWeight * 0.8); // Reduce weight by 20%
      load.weight = newWeight;
      this.serverLoads.set(load.serverId, load);
    }

    for (const load of underloadedServers) {
      const currentWeight = load.weight;
      const newWeight = Math.min(2.0, currentWeight * 1.2); // Increase weight by 20%
      load.weight = newWeight;
      this.serverLoads.set(load.serverId, load);
    }

    this.logger.log(`Connection rebalancing completed for pool ${poolName}`);

    // Emit completion event
    this.eventEmitter.emit('mcp.integration.event', {
      type: MCPEventType.POOL_REBALANCING_COMPLETED,
      serverId: '',
      timestamp: new Date(),
      data: {
        poolName,
        adjustedServers: [...overloadedServers, ...underloadedServers].map(s => s.serverId),
      },
      severity: 'info',
      category: 'rebalancing',
      tags: ['rebalancing', 'load-balancing'],
      correlationId: this.generateCorrelationId(),
    } as MCPIntegrationEvent);
  }

  /**
   * Get load balancing statistics
   */
  getLoadBalancingStats(poolName?: string): Record<string, unknown> {
    const allLoads = Array.from(this.serverLoads.values());

    if (allLoads.length === 0) {
      return { message: 'No server load data available' };
    }

    const totalConnections = allLoads.reduce((sum, load) => sum + load.activeConnections, 0);
    const avgResponseTime =
      allLoads.reduce((sum, load) => sum + load.avgResponseTime, 0) / allLoads.length;
    const maxConnections = Math.max(...allLoads.map(load => load.activeConnections));
    const minConnections = Math.min(...allLoads.map(load => load.activeConnections));

    const stats = {
      totalServers: allLoads.length,
      totalConnections,
      averageConnectionsPerServer: Math.round(totalConnections / allLoads.length),
      maxConnectionsOnServer: maxConnections,
      minConnectionsOnServer: minConnections,
      connectionDistributionRatio:
        minConnections > 0 ? maxConnections / minConnections : maxConnections,
      averageResponseTime: Math.round(avgResponseTime),
      serverLoads: allLoads.map(load => ({
        serverId: load.serverId,
        activeConnections: load.activeConnections,
        queuedRequests: load.queuedRequests,
        avgResponseTime: load.avgResponseTime,
        errorRate: load.errorRate,
        weight: load.weight,
        lastUpdated: load.lastUpdated,
      })),
      loadBalancingMetrics: {
        roundRobinCounters: Object.fromEntries(this.roundRobinCounters),
        stickySessionCount: this.stickySessionMap.size,
        circuitBreakerStates: Array.from(this.circuitBreakerStates.entries()).map(
          ([serverId, state]) => ({
            serverId,
            state: state.state,
            failureCount: state.failureCount,
            lastFailure: state.lastFailure,
          })
        ),
      },
      lastUpdated: new Date(),
    };

    if (poolName) {
      const failoverGroup = this.failoverGroups.get(poolName);
      if (failoverGroup) {
        (stats as Record<string, unknown>).failoverGroup = {
          primary: failoverGroup.primary,
          secondary: failoverGroup.secondary,
          emergency: failoverGroup.emergency,
          lastFailover: failoverGroup.lastFailover,
          failoverCount: failoverGroup.failoverCount,
        };
      }
    }

    return stats;
  }

  /**
   * Load balancing strategy implementations
   */
  private selectRoundRobin(servers: string[], request: MCPOperationRequest): LoadBalancingDecision {
    const key = servers.sort().join(',');
    const currentIndex = this.roundRobinCounters.get(key) || 0;
    const nextIndex = (currentIndex + 1) % servers.length;
    this.roundRobinCounters.set(key, nextIndex);

    return {
      selectedServer: servers[currentIndex],
      strategy: LoadBalancingStrategy.ROUND_ROBIN,
      reason: `Round-robin selection (index ${currentIndex})`,
      alternatives: servers.filter((_, i) => i !== currentIndex),
      confidence: 0.7,
      expectedResponseTime: this.getExpectedResponseTime(servers[currentIndex], request.operation),
      metadata: { index: currentIndex, totalServers: servers.length },
    };
  }

  private selectWeightedRoundRobin(
    servers: string[],
    request: MCPOperationRequest
  ): LoadBalancingDecision {
    const weightedServers: string[] = [];

    servers.forEach(serverId => {
      const load = this.serverLoads.get(serverId);
      const weight = load?.weight || 1;
      const weightCount = Math.max(1, Math.round(weight * 10));

      for (let i = 0; i < weightCount; i++) {
        weightedServers.push(serverId);
      }
    });

    const key = `weighted:${servers.sort().join(',')}`;
    const currentIndex = this.roundRobinCounters.get(key) || 0;
    const nextIndex = (currentIndex + 1) % weightedServers.length;
    this.roundRobinCounters.set(key, nextIndex);

    const selectedServer = weightedServers[currentIndex];

    return {
      selectedServer,
      strategy: LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN,
      reason: `Weighted round-robin selection based on server weights`,
      alternatives: servers.filter(s => s !== selectedServer),
      confidence: 0.8,
      expectedResponseTime: this.getExpectedResponseTime(selectedServer, request.operation),
      metadata: {
        weights: servers.map(s => ({ serverId: s, weight: this.serverLoads.get(s)?.weight || 1 })),
        weightedPoolSize: weightedServers.length,
      },
    };
  }

  private selectLeastConnections(
    servers: string[],
    request: MCPOperationRequest
  ): LoadBalancingDecision {
    const serverLoads = servers.map(serverId => ({
      serverId,
      load: this.serverLoads.get(serverId),
    }));

    const selectedServer = serverLoads.reduce((least, current) => {
      const leastConnections = least.load?.activeConnections || 0;
      const currentConnections = current.load?.activeConnections || 0;
      return currentConnections < leastConnections ? current : least;
    }).serverId;

    return {
      selectedServer,
      strategy: LoadBalancingStrategy.LEAST_CONNECTIONS,
      reason: `Server with least active connections`,
      alternatives: servers.filter(s => s !== selectedServer),
      confidence: 0.85,
      expectedResponseTime: this.getExpectedResponseTime(selectedServer, request.operation),
      metadata: {
        connectionCounts: serverLoads.map(s => ({
          serverId: s.serverId,
          activeConnections: s.load?.activeConnections || 0,
        })),
      },
    };
  }

  private selectLeastResponseTime(
    servers: string[],
    request: MCPOperationRequest
  ): LoadBalancingDecision {
    const serverResponseTimes = servers.map(serverId => ({
      serverId,
      responseTime: this.getExpectedResponseTime(serverId, request.operation),
    }));

    const selectedServer = serverResponseTimes.reduce((fastest, current) =>
      current.responseTime < fastest.responseTime ? current : fastest
    ).serverId;

    return {
      selectedServer,
      strategy: LoadBalancingStrategy.LEAST_RESPONSE_TIME,
      reason: `Server with fastest expected response time`,
      alternatives: servers.filter(s => s !== selectedServer),
      confidence: 0.9,
      expectedResponseTime: this.getExpectedResponseTime(selectedServer, request.operation),
      metadata: {
        responseTimes: serverResponseTimes,
        operation: request.operation,
      },
    };
  }

  private selectPriorityBased(
    servers: string[],
    request: MCPOperationRequest
  ): LoadBalancingDecision {
    // In a real implementation, this would get server priorities from configuration
    // For now, use performance-based priority
    const serverPriorities = servers.map(serverId => {
      const load = this.serverLoads.get(serverId);
      const responseTime = load?.avgResponseTime || 1000;
      const errorRate = load?.errorRate || 0.1;

      // Calculate priority score (lower is better)
      const priorityScore = responseTime * (1 + errorRate);

      return { serverId, priorityScore };
    });

    const selectedServer = serverPriorities.reduce((highest, current) =>
      current.priorityScore < highest.priorityScore ? current : highest
    ).serverId;

    return {
      selectedServer,
      strategy: LoadBalancingStrategy.PRIORITY_BASED,
      reason: `Server with highest calculated priority`,
      alternatives: servers.filter(s => s !== selectedServer),
      confidence: 0.8,
      expectedResponseTime: this.getExpectedResponseTime(selectedServer, request.operation),
      metadata: {
        priorities: serverPriorities,
      },
    };
  }

  private selectConsistentHash(
    servers: string[],
    request: MCPOperationRequest
  ): LoadBalancingDecision {
    const key = servers.sort().join(',');
    let ring = this.consistentHashRings.get(key);

    if (!ring) {
      ring = this.buildConsistentHashRing(servers);
      this.consistentHashRings.set(key, ring);
    }

    const hash = this.hash(request.traceId || request.operationId);
    const selectedServer = this.getServerFromRing(ring, hash);

    return {
      selectedServer,
      strategy: LoadBalancingStrategy.CONSISTENT_HASH,
      reason: `Consistent hash based on request ID`,
      alternatives: servers.filter(s => s !== selectedServer),
      confidence: 0.95,
      expectedResponseTime: this.getExpectedResponseTime(selectedServer, request.operation),
      metadata: {
        hash,
        traceId: request.traceId,
        operationId: request.operationId,
      },
    };
  }

  private selectRandom(servers: string[], request: MCPOperationRequest): LoadBalancingDecision {
    const randomIndex = Math.floor(Math.random() * servers.length);
    const selectedServer = servers[randomIndex];

    return {
      selectedServer,
      strategy: LoadBalancingStrategy.RANDOM,
      reason: `Random selection`,
      alternatives: servers.filter(s => s !== selectedServer),
      confidence: 0.5,
      expectedResponseTime: this.getExpectedResponseTime(selectedServer, request.operation),
      metadata: { randomIndex, totalServers: servers.length },
    };
  }

  private selectIntelligent(
    servers: string[],
    request: MCPOperationRequest
  ): LoadBalancingDecision {
    // Intelligent selection combines multiple factors
    const serverScores = servers.map(serverId => {
      const load = this.serverLoads.get(serverId);
      const profile = this.serverPerformanceProfiles.get(serverId);

      // Calculate composite score
      let score = 100; // Start with perfect score

      // Factor in current load (0-30 points penalty)
      const loadPenalty = (load?.activeConnections || 0) * 2;
      score -= Math.min(30, loadPenalty);

      // Factor in response time (0-25 points penalty)
      const responseTime = this.getExpectedResponseTime(serverId, request.operation);
      const responseTimePenalty = Math.min(25, responseTime / 50); // 50ms = 1 point
      score -= responseTimePenalty;

      // Factor in error rate (0-25 points penalty)
      const errorRate = load?.errorRate || 0;
      const errorPenalty = errorRate * 250; // 0.1 error rate = 25 points
      score -= Math.min(25, errorPenalty);

      // Factor in operation-specific performance (0-20 points penalty)
      const operationPerf = profile?.operationPerformance.get(request.operation);
      if (operationPerf) {
        const operationPenalty = (1 - operationPerf.successRate) * 20;
        score -= operationPenalty;
      }

      return { serverId, score };
    });

    const selectedServer = serverScores.reduce((best, current) =>
      current.score > best.score ? current : best
    ).serverId;

    return {
      selectedServer,
      strategy: this.config.defaultStrategy,
      reason: `Intelligent selection based on composite scoring`,
      alternatives: servers.filter(s => s !== selectedServer),
      confidence: 0.95,
      expectedResponseTime: this.getExpectedResponseTime(selectedServer, request.operation),
      metadata: {
        scores: serverScores,
        factors: ['load', 'responseTime', 'errorRate', 'operationPerformance'],
      },
    };
  }

  private selectFromHalfOpenServers(
    servers: string[],
    request: MCPOperationRequest
  ): LoadBalancingDecision {
    // When all servers are in circuit breaker state, try one half-open server
    const selectedServer = servers[0]; // Try the first available half-open server

    return {
      selectedServer,
      strategy: LoadBalancingStrategy.RANDOM,
      reason: `Circuit breaker recovery attempt`,
      alternatives: servers.slice(1),
      confidence: 0.3,
      expectedResponseTime: this.getExpectedResponseTime(selectedServer, request.operation),
      metadata: { circuitBreakerRecovery: true },
    };
  }

  /**
   * Helper methods
   */
  private calculateServerWeight(_serverId: string, metrics: MCPServerMetrics): number {
    let weight = 1.0;

    // Adjust based on response time
    if (metrics.responseTime < 100) {
      weight *= 1.5;
    } else if (metrics.responseTime > 500) {
      weight *= 0.5;
    }

    // Adjust based on error rate
    weight *= 1 - metrics.errorRate;

    // Adjust based on current load
    const loadFactor = Math.max(0.1, 1 - metrics.activeConnections / 100);
    weight *= loadFactor;

    return Math.max(0.1, Math.min(2.0, weight));
  }

  private getExpectedResponseTime(serverId: string, operation: string): number {
    const load = this.serverLoads.get(serverId);
    const profile = this.serverPerformanceProfiles.get(serverId);

    // Get operation-specific performance if available
    const operationPerf = profile?.operationPerformance.get(operation);
    if (operationPerf) {
      return operationPerf.avgTime;
    }

    // Fall back to general response time
    return load?.avgResponseTime || 200;
  }

  private updatePerformanceProfile(serverId: string, metrics: MCPServerMetrics): void {
    let profile = this.serverPerformanceProfiles.get(serverId);

    if (!profile) {
      profile = {
        operationPerformance: new Map(),
        peakHours: [],
        reliabilityScore: 1.0,
        lastProfileUpdate: new Date(),
      };
      this.serverPerformanceProfiles.set(serverId, profile);
    }

    // Update reliability score
    profile.reliabilityScore = metrics.successRate;
    profile.lastProfileUpdate = new Date();
  }

  private buildConsistentHashRing(servers: string[]): ConsistentHashRing {
    const virtualNodes = 150; // Number of virtual nodes per server
    const nodes = new Map<number, string>();

    servers.forEach(serverId => {
      for (let i = 0; i < virtualNodes; i++) {
        const hash = this.hash(`${serverId}:${i}`);
        nodes.set(hash, serverId);
      }
    });

    const sortedHashes = Array.from(nodes.keys()).sort((a, b) => a - b);

    return { nodes, virtualNodes, sortedHashes };
  }

  private getServerFromRing(ring: ConsistentHashRing, hash: number): string {
    const { nodes, sortedHashes } = ring;

    // Find the first node >= hash
    let index = sortedHashes.findIndex(h => h >= hash);

    if (index === -1) {
      // Wrap around to the first node
      index = 0;
    }

    const selectedHash = sortedHashes[index];
    const server = nodes.get(selectedHash);
    if (!server) {
      throw new Error('Consistent hash ring node not found');
    }
    return server;
  }

  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private isCircuitBreakerClosed(serverId: string): boolean {
    const state = this.circuitBreakerStates.get(serverId);
    return !state || state.state === 'closed';
  }

  private getCircuitBreakerState(serverId: string): 'closed' | 'open' | 'half-open' {
    const state = this.circuitBreakerStates.get(serverId);
    return state?.state || 'closed';
  }

  private recordCircuitBreakerFailure(serverId: string): void {
    let state = this.circuitBreakerStates.get(serverId);

    if (!state) {
      state = {
        state: 'closed',
        failureCount: 0,
        lastFailure: new Date(),
        nextAttempt: new Date(),
      };
      this.circuitBreakerStates.set(serverId, state);
    }

    state.failureCount++;
    state.lastFailure = new Date();

    if (state.failureCount >= 5) {
      // Threshold
      state.state = 'open';
      state.nextAttempt = new Date(Date.now() + 60000); // 1 minute
    }
  }

  private recordLoadBalancingDecision(
    decision: LoadBalancingDecision,
    request: MCPOperationRequest
  ): void {
    // Record for adaptive learning
    const historyKey = `${request.operation}:${decision.selectedServer}`;
    let history = this.operationHistory.get(historyKey);

    if (!history) {
      history = [];
      this.operationHistory.set(historyKey, history);
    }

    // We'll update this with actual results later
    history.push({
      serverId: decision.selectedServer,
      responseTime: decision.expectedResponseTime,
      success: true, // Will be updated when operation completes
      timestamp: new Date(),
    });

    // Keep only recent history (last 100 operations)
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  private startAutoRebalancing(): void {
    setInterval(() => {
      // Auto-rebalance all pools
      for (const [poolName] of this.failoverGroups) {
        const failoverGroup = this.failoverGroups.get(poolName);
        if (!failoverGroup) continue;
        const allServers = [...failoverGroup.primary, ...failoverGroup.secondary];
        this.rebalanceConnections(poolName, allServers).catch(error => {
          this.logger.error(`Auto-rebalancing failed for pool ${poolName}:`, error);
        });
      }
    }, this.config.autoRebalanceInterval);
  }

  private startPerformanceProfiling(): void {
    setInterval(() => {
      // Update performance profiles based on recent history
      for (const [serverId, profile] of this.serverPerformanceProfiles) {
        const operations = Array.from(profile.operationPerformance.keys());

        for (const operation of operations) {
          const historyKey = `${operation}:${serverId}`;
          const history = this.operationHistory.get(historyKey) || [];

          if (history.length > 0) {
            const recentHistory = history.filter(
              h => h.timestamp.getTime() > Date.now() - 3600000 // Last hour
            );

            if (recentHistory.length > 0) {
              const avgTime =
                recentHistory.reduce((sum, h) => sum + h.responseTime, 0) / recentHistory.length;
              const successRate =
                recentHistory.filter(h => h.success).length / recentHistory.length;

              profile.operationPerformance.set(operation, { avgTime, successRate });
            }
          }
        }
      }
    }, 300000); // Every 5 minutes
  }

  private generateCorrelationId(): string {
    return `lb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
