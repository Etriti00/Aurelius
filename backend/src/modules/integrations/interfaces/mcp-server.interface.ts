export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  status: MCPServerStatus;

  // Connection details
  endpoint: string;
  protocol: 'websocket' | 'http' | 'grpc';
  authentication: MCPAuthConfig;

  // Capability matrix
  capabilities: MCPCapability[];
  supportedOperations: string[];

  // Performance characteristics
  performance: {
    maxConcurrentConnections: number;
    averageResponseTime: number; // milliseconds
    rateLimits: {
      requestsPerSecond: number;
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    reliability: {
      uptime: number; // percentage
      errorRate: number; // percentage
      lastOutage?: Date;
    };
  };

  // Geographic and logical grouping
  region: string;
  datacenter?: string;
  priority: MCPServerPriority;

  // Health monitoring
  healthCheck: {
    enabled: boolean;
    interval: number; // milliseconds
    timeout: number; // milliseconds
    endpoint: string;
    expectedResponse?: string;
  };

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export enum MCPServerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  DEGRADED = 'degraded',
  FAILED = 'failed',
  UNKNOWN = 'unknown',
}

export enum MCPServerPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface MCPAuthConfig {
  type: 'apikey' | 'oauth2' | 'jwt' | 'basic' | 'none';
  credentials: Record<string, string>;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface MCPCapability {
  name: string;
  version: string;
  operations: string[];
  inputTypes: string[];
  outputTypes: string[];
  limitations?: Record<string, unknown>;
}

export interface MCPServerMetrics {
  serverId: string;
  timestamp: Date;

  // Performance metrics
  responseTime: number;
  throughput: number; // requests per second
  errorRate: number;
  successRate: number;

  // Resource utilization
  cpuUsage?: number;
  memoryUsage?: number;
  networkLatency: number;

  // Connection metrics
  activeConnections: number;
  connectionPoolSize: number;
  waitingRequests: number;

  // Business metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retryAttempts: number;
}

export interface MCPServerConnectionInfo {
  serverId: string;
  connectionId: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  connectedAt: Date;
  lastActivity: Date;

  // Connection quality
  latency: number;
  stability: number; // 0-1 scale

  // Usage tracking
  totalRequests: number;
  failedRequests: number;
  lastError?: {
    code: string;
    message: string;
    timestamp: Date;
  };
}

export interface MCPServerPool {
  name: string;
  description: string;
  servers: string[]; // server IDs

  // Load balancing strategy
  loadBalancingStrategy: LoadBalancingStrategy;

  // Pool configuration
  configuration: {
    minActiveServers: number;
    maxActiveServers: number;
    healthCheckInterval: number;
    failoverTimeout: number;
    circuitBreakerThreshold: number;
  };

  // Current state
  state: {
    activeServers: string[];
    failedServers: string[];
    maintenanceServers: string[];
    totalCapacity: number;
    currentLoad: number;
  };
}

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  LEAST_RESPONSE_TIME = 'least_response_time',
  RANDOM = 'random',
  CONSISTENT_HASH = 'consistent_hash',
  PRIORITY_BASED = 'priority_based',
}

export interface MCPOperationRequest {
  operationId: string;
  serverId?: string; // Optional: specific server request
  poolId?: string; // Optional: pool-based routing

  // Operation details
  operation: string;
  parameters: Record<string, unknown>;
  context?: Record<string, unknown>;

  // Request configuration
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };

  // Quality of service
  priority: 'critical' | 'high' | 'normal' | 'low';
  consistency: 'strong' | 'eventual' | 'weak';

  // Tracing and monitoring
  traceId: string;
  parentSpanId?: string;
  userId?: string;
  sessionId?: string;
}

export interface MCPOperationResponse {
  operationId: string;
  serverId: string;
  status: 'success' | 'error' | 'timeout' | 'retry';

  // Response data
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  // Performance metrics
  executionTime: number;
  networkTime: number;
  totalTime: number;

  // Metadata
  serverVersion: string;
  responseSize: number;
  cacheHit?: boolean;

  // Tracing
  traceId: string;
  spanId: string;
  timestamp: Date;
}

export interface MCPIntegrationEvent {
  type: MCPEventType;
  serverId: string;
  timestamp: Date;

  // Event-specific data
  data: Record<string, unknown>;

  // Context
  userId?: string;
  operationId?: string;
  correlationId: string;

  // Severity and categorization
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  tags: string[];
}

export enum MCPEventType {
  // Server lifecycle events
  SERVER_CONNECTED = 'server_connected',
  SERVER_DISCONNECTED = 'server_disconnected',
  SERVER_HEALTH_CHECK_FAILED = 'server_health_check_failed',
  SERVER_HEALTH_CHECK_RECOVERED = 'server_health_check_recovered',

  // Performance events
  HIGH_LATENCY_DETECTED = 'high_latency_detected',
  ERROR_RATE_THRESHOLD_EXCEEDED = 'error_rate_threshold_exceeded',
  CAPACITY_THRESHOLD_REACHED = 'capacity_threshold_reached',

  // Pool events
  POOL_FAILOVER_TRIGGERED = 'pool_failover_triggered',
  POOL_REBALANCING_STARTED = 'pool_rebalancing_started',
  POOL_REBALANCING_COMPLETED = 'pool_rebalancing_completed',

  // Circuit breaker events
  CIRCUIT_BREAKER_OPENED = 'circuit_breaker_opened',
  CIRCUIT_BREAKER_HALF_OPEN = 'circuit_breaker_half_open',
  CIRCUIT_BREAKER_CLOSED = 'circuit_breaker_closed',

  // Operation events
  OPERATION_STARTED = 'operation_started',
  OPERATION_COMPLETED = 'operation_completed',
  OPERATION_FAILED = 'operation_failed',
  OPERATION_TIMEOUT = 'operation_timeout',
  OPERATION_RETRIED = 'operation_retried',
}
