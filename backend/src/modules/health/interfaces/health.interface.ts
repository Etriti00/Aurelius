/**
 * Health service interfaces for type safety
 */

export interface HealthServiceInfo {
  status: string;
  responseTime?: number;
  version?: string;
  error?: string;
  utilizationPercentage?: number;
  issues?: string[];
  recommendations?: string[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  services: Record<string, HealthServiceInfo>;
  version: string;
  database?: {
    connectionPool: DatabasePoolStats;
    metrics: DatabaseConnectionMetrics;
  };
}

export interface DatabasePoolStats {
  created: number;
  destroyed: number;
  acquired: number;
  released: number;
  pending: number;
  errors: number;
  maxPoolSize: number;
  currentPoolSize: number;
  idleConnections: number;
  activeConnections: number;
}

export interface DatabaseConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  slowQueries: number;
  errors: number;
  lastHealthCheck: Date;
}

export interface DatabaseStatus {
  isConnected: boolean;
  metrics: DatabaseConnectionMetrics;
  poolInfo?: Record<string, unknown>;
  serverVersion?: string;
}

export interface PoolHealth {
  isHealthy: boolean;
  utilizationPercentage: number;
  issues: string[];
  recommendations: string[];
}

export interface DetailedMetrics {
  database: {
    status: DatabaseStatus;
    poolStats: DatabasePoolStats;
    connectionMetrics: DatabaseConnectionMetrics;
    poolHealth: PoolHealth;
  };
  timestamp: string;
}

export interface PoolOptimizationConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

export interface PoolOptimizationRecommendations {
  poolSize?: string;
  timeouts?: string;
}

export interface PoolOptimizationResult {
  currentConfig: PoolOptimizationConfig;
  recommendations: PoolOptimizationRecommendations;
  optimizedConfig: PoolOptimizationConfig;
}

// Re-export DatabaseConfig from the Prisma module
export { DatabaseConfig } from '../../prisma/interfaces/database-config.interface';
