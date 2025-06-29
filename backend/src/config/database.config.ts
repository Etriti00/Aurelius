import { registerAs } from '@nestjs/config';

/**
 * Enterprise-grade database configuration with comprehensive connection pooling
 * Following PostgreSQL and Prisma best practices for production deployments
 */
export default registerAs('database', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Environment-specific connection pool configuration
  const getPoolConfiguration = () => {
    if (isProduction) {
      return {
        // Production: Optimized for high concurrency
        min: parseInt(process.env.DB_POOL_MIN || '5', 10),
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), // 30s
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10), // 5s
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000', 10), // 10s
        createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '5000', 10), // 5s
        destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000', 10), // 5s
        reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000', 10), // 1s
        createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200', 10), // 200ms
      };
    } else if (isDevelopment) {
      return {
        // Development: Conservative settings for local development
        min: parseInt(process.env.DB_POOL_MIN || '2', 10),
        max: parseInt(process.env.DB_POOL_MAX || '5', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10), // 10s
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10), // 5s
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '5000', 10), // 5s
        createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '3000', 10), // 3s
        destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '3000', 10), // 3s
        reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '2000', 10), // 2s
        createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '500', 10), // 500ms
      };
    } else {
      // Test environment or fallback
      return {
        // Test: Minimal pool for testing
        min: parseInt(process.env.DB_POOL_MIN || '1', 10),
        max: parseInt(process.env.DB_POOL_MAX || '2', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '5000', 10), // 5s
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '3000', 10), // 3s
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '3000', 10), // 3s
        createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '2000', 10), // 2s
        destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '2000', 10), // 2s
        reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '5000', 10), // 5s
        createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '1000', 10), // 1s
      };
    }
  };

  return {
    // PostgreSQL Configuration
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'aurelius',

    // Environment-aware connection pool configuration
    pool: getPoolConfiguration(),

    // Advanced Pool Configuration
    poolAdvanced: {
      // Connection validation
      testOnBorrow: process.env.DB_TEST_ON_BORROW === 'true',
      validateOnCreate: process.env.DB_VALIDATE_ON_CREATE === 'true',

      // Connection lifecycle management
      evictionRunIntervalMillis: parseInt(process.env.DB_EVICTION_RUN_INTERVAL || '30000', 10), // 30s
      numTestsPerRun: parseInt(process.env.DB_NUM_TESTS_PER_RUN || '3', 10),
      softIdleTimeoutMillis: parseInt(process.env.DB_SOFT_IDLE_TIMEOUT || '25000', 10), // 25s

      // Performance optimization
      propagateCreateError: process.env.DB_PROPAGATE_CREATE_ERROR !== 'false',
      maxWaitingClients: parseInt(process.env.DB_MAX_WAITING_CLIENTS || '10', 10),
    },

    // SSL Configuration with enhanced security options
    ssl:
      process.env.DB_SSL === 'true'
        ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
            ca: process.env.DB_SSL_CA, // Certificate Authority
            cert: process.env.DB_SSL_CERT, // Client certificate
            key: process.env.DB_SSL_KEY, // Client private key
            servername: process.env.DB_SSL_SERVERNAME, // Server name for SNI
          }
        : false,

    // Prisma Specific Configuration
    prisma: {
      logLevel: process.env.PRISMA_LOG_LEVEL || (isProduction ? 'warn' : 'info'),
      errorFormat: isProduction ? 'minimal' : 'pretty',

      // Query engine configuration
      engineType: process.env.PRISMA_ENGINE_TYPE || 'library',
      binaryTargets: process.env.PRISMA_BINARY_TARGETS?.split(',') || [],

      // Connection URL with pool parameters
      datasourceUrl: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL}?connection_limit=${
            getPoolConfiguration().max
          }&pool_timeout=${Math.floor(getPoolConfiguration().connectionTimeoutMillis / 1000)}`
        : undefined,

      // Transaction configuration
      transactionOptions: {
        maxWait: parseInt(process.env.PRISMA_TRANSACTION_MAX_WAIT || '5000', 10), // 5s
        timeout: parseInt(process.env.PRISMA_TRANSACTION_TIMEOUT || '10000', 10), // 10s
        isolationLevel: process.env.PRISMA_ISOLATION_LEVEL || 'ReadCommitted',
      },
    },

    // pgvector Configuration for AI embeddings
    vectorDimensions: parseInt(process.env.VECTOR_DIMENSIONS || '1536', 10),
    vectorMetricType: process.env.VECTOR_METRIC_TYPE || 'cosine', // cosine, l2, inner_product
    vectorIndexType: process.env.VECTOR_INDEX_TYPE || 'ivfflat', // ivfflat, hnsw

    // Migration Settings
    runMigrationsOnStartup: process.env.RUN_MIGRATIONS === 'true',
    migrationTimeout: parseInt(process.env.MIGRATION_TIMEOUT || '300000', 10), // 5 minutes

    // Health Check Configuration
    healthCheck: {
      enabled: process.env.DB_HEALTH_CHECK_ENABLED !== 'false',
      interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000', 10), // 30s
      timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5000', 10), // 5s
      retries: parseInt(process.env.DB_HEALTH_CHECK_RETRIES || '3', 10),
    },

    // Performance Monitoring
    monitoring: {
      enabled: process.env.DB_MONITORING_ENABLED !== 'false',
      slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000', 10), // 1s
      logSlowQueries: process.env.DB_LOG_SLOW_QUERIES !== 'false',
      metricsCollection: process.env.DB_METRICS_COLLECTION !== 'false',
    },

    // Backup Configuration
    backup: {
      enabled: process.env.DB_BACKUP_ENABLED === 'true',
      schedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // 2 AM daily
      retention: parseInt(process.env.DB_BACKUP_RETENTION || '7', 10), // 7 days
      compressionEnabled: process.env.DB_BACKUP_COMPRESSION !== 'false',
      encryptionEnabled: process.env.DB_BACKUP_ENCRYPTION === 'true',
    },

    // Read Replica Configuration (for future scaling)
    readReplicas: {
      enabled: process.env.DB_READ_REPLICAS_ENABLED === 'true',
      urls: process.env.DB_READ_REPLICA_URLS?.split(',') || [],
      loadBalancing: process.env.DB_READ_REPLICA_LOAD_BALANCING || 'round_robin', // round_robin, random
      fallbackToMaster: process.env.DB_READ_REPLICA_FALLBACK !== 'false',
    },

    // Environment-specific optimizations
    optimization: {
      enableQueryPlanCache: process.env.DB_QUERY_PLAN_CACHE !== 'false',
      enableStatementCache: process.env.DB_STATEMENT_CACHE !== 'false',
      maxConnections: isProduction
        ? parseInt(process.env.DB_MAX_CONNECTIONS || '100', 10)
        : parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
      sharedPreloadLibraries:
        process.env.DB_SHARED_PRELOAD_LIBRARIES || 'pg_stat_statements,auto_explain',
    },
  };
});
