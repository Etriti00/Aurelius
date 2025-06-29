/**
 * Database configuration interfaces for type safety
 */

export interface DatabasePoolConfig {
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

export interface DatabasePoolAdvancedConfig {
  testOnBorrow: boolean;
  validateOnCreate: boolean;
  evictionRunIntervalMillis: number;
  numTestsPerRun: number;
  softIdleTimeoutMillis: number;
  propagateCreateError: boolean;
  maxWaitingClients: number;
}

export interface DatabaseSSLConfig {
  rejectUnauthorized: boolean;
  ca?: string;
  cert?: string;
  key?: string;
  servername?: string;
}

export interface DatabasePrismaConfig {
  logLevel: string;
  errorFormat: string;
  engineType: string;
  binaryTargets: string[];
  datasourceUrl?: string;
  transactionOptions: {
    maxWait: number;
    timeout: number;
    isolationLevel: string;
  };
}

export interface DatabaseHealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
}

export interface DatabaseMonitoringConfig {
  enabled: boolean;
  slowQueryThreshold: number;
  logSlowQueries: boolean;
  metricsCollection: boolean;
}

export interface DatabaseBackupConfig {
  enabled: boolean;
  schedule: string;
  retention: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface DatabaseReadReplicasConfig {
  enabled: boolean;
  urls: string[];
  loadBalancing: string;
  fallbackToMaster: boolean;
}

export interface DatabaseOptimizationConfig {
  enableQueryPlanCache: boolean;
  enableStatementCache: boolean;
  maxConnections: number;
  sharedPreloadLibraries: string;
}

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  pool: DatabasePoolConfig;
  poolAdvanced: DatabasePoolAdvancedConfig;
  ssl: DatabaseSSLConfig | false;
  prisma: DatabasePrismaConfig;
  vectorDimensions: number;
  vectorMetricType: string;
  vectorIndexType: string;
  runMigrationsOnStartup: boolean;
  migrationTimeout: number;
  healthCheck: DatabaseHealthCheckConfig;
  monitoring: DatabaseMonitoringConfig;
  backup: DatabaseBackupConfig;
  readReplicas: DatabaseReadReplicasConfig;
  optimization: DatabaseOptimizationConfig;
}
