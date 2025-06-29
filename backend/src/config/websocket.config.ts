import { registerAs } from '@nestjs/config';

/**
 * Enterprise-grade WebSocket configuration with scaling and performance optimization
 */
export default registerAs('websocket', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Basic WebSocket Configuration
    port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
    cors: {
      origin: process.env.WEBSOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],

    // Connection Management
    connectionLimits: {
      maxConnections: isProduction ? 10000 : 100,
      maxConnectionsPerIP: isProduction ? 50 : 10,
      connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT || '20000', 10), // 20s
      pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10), // 60s
      pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10), // 25s
    },

    // Authentication Configuration
    authentication: {
      enabled: process.env.WS_AUTH_ENABLED !== 'false',
      tokenExpiry: parseInt(process.env.WS_TOKEN_EXPIRY || '3600000', 10), // 1 hour
      allowAnonymous: process.env.WS_ALLOW_ANONYMOUS === 'true',
      rateLimitEnabled: process.env.WS_RATE_LIMIT_ENABLED !== 'false',
    },

    // Rate Limiting
    rateLimit: {
      maxEventsPerSecond: parseInt(process.env.WS_MAX_EVENTS_PER_SECOND || '10', 10),
      maxEventsPerMinute: parseInt(process.env.WS_MAX_EVENTS_PER_MINUTE || '100', 10),
      windowSizeMs: parseInt(process.env.WS_RATE_WINDOW_MS || '60000', 10), // 1 minute
      burstLimit: parseInt(process.env.WS_BURST_LIMIT || '20', 10),
    },

    // Message Queue Configuration
    messageQueue: {
      enabled: process.env.WS_MESSAGE_QUEUE_ENABLED !== 'false',
      redisUrl: process.env.REDIS_URL,
      queueName: 'websocket_events',
      maxQueueSize: parseInt(process.env.WS_MAX_QUEUE_SIZE || '10000', 10),
      processingBatchSize: parseInt(process.env.WS_PROCESSING_BATCH_SIZE || '100', 10),
      processingInterval: parseInt(process.env.WS_PROCESSING_INTERVAL || '1000', 10), // 1s
    },

    // Horizontal Scaling with Redis Adapter
    redis: {
      enabled: process.env.WS_REDIS_ENABLED === 'true',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_WS_DB || '1', 10),
      keyPrefix: process.env.WS_REDIS_PREFIX || 'aurelius:ws:',

      // Redis Cluster Configuration
      cluster: {
        enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
        nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
        options: {
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
        },
      },
    },

    // Event Broadcasting Configuration
    events: {
      // Event types and their routing patterns
      routing: {
        user: 'user:{userId}',
        room: 'room:{roomId}',
        organization: 'org:{orgId}',
        broadcast: 'broadcast',
        system: 'system',
      },

      // Event filtering and throttling
      throttling: {
        enabled: process.env.WS_EVENT_THROTTLING_ENABLED !== 'false',
        maxEventsPerUser: parseInt(process.env.WS_MAX_EVENTS_PER_USER || '50', 10),
        throttleWindowMs: parseInt(process.env.WS_THROTTLE_WINDOW_MS || '1000', 10), // 1s
      },

      // Event persistence
      persistence: {
        enabled: process.env.WS_EVENT_PERSISTENCE_ENABLED === 'true',
        retentionDays: parseInt(process.env.WS_EVENT_RETENTION_DAYS || '7', 10),
        maxEventsPerUser: parseInt(process.env.WS_MAX_STORED_EVENTS || '1000', 10),
      },
    },

    // Monitoring and Analytics
    monitoring: {
      enabled: process.env.WS_MONITORING_ENABLED !== 'false',
      metricsInterval: parseInt(process.env.WS_METRICS_INTERVAL || '30000', 10), // 30s
      healthCheck: {
        enabled: process.env.WS_HEALTH_CHECK_ENABLED !== 'false',
        interval: parseInt(process.env.WS_HEALTH_CHECK_INTERVAL || '30000', 10), // 30s
        timeout: parseInt(process.env.WS_HEALTH_CHECK_TIMEOUT || '5000', 10), // 5s
      },

      // Performance tracking
      performance: {
        trackLatency: process.env.WS_TRACK_LATENCY !== 'false',
        trackThroughput: process.env.WS_TRACK_THROUGHPUT !== 'false',
        trackErrors: process.env.WS_TRACK_ERRORS !== 'false',
        sampleRate: parseFloat(process.env.WS_PERFORMANCE_SAMPLE_RATE || '0.1'), // 10%
      },
    },

    // Security Configuration
    security: {
      // DDoS Protection
      ddosProtection: {
        enabled: process.env.WS_DDOS_PROTECTION_ENABLED !== 'false',
        maxConnectionsPerIP: parseInt(process.env.WS_MAX_CONN_PER_IP || '10', 10),
        connectionRateLimit: parseInt(process.env.WS_CONN_RATE_LIMIT || '5', 10), // per minute
        banDuration: parseInt(process.env.WS_BAN_DURATION || '300000', 10), // 5 minutes
      },

      // Message validation
      messageValidation: {
        enabled: process.env.WS_MESSAGE_VALIDATION_ENABLED !== 'false',
        maxMessageSize: parseInt(process.env.WS_MAX_MESSAGE_SIZE || '65536', 10), // 64KB
        allowedEvents: process.env.WS_ALLOWED_EVENTS?.split(',') || [],
        sanitizeMessages: process.env.WS_SANITIZE_MESSAGES !== 'false',
      },

      // IP Whitelisting/Blacklisting
      ipFiltering: {
        enabled: process.env.WS_IP_FILTERING_ENABLED === 'true',
        whitelist: process.env.WS_IP_WHITELIST?.split(',') || [],
        blacklist: process.env.WS_IP_BLACKLIST?.split(',') || [],
      },
    },

    // Room Management
    rooms: {
      // Automatic cleanup
      cleanup: {
        enabled: process.env.WS_ROOM_CLEANUP_ENABLED !== 'false',
        emptyRoomTimeout: parseInt(process.env.WS_EMPTY_ROOM_TIMEOUT || '300000', 10), // 5 minutes
        maxRoomsPerUser: parseInt(process.env.WS_MAX_ROOMS_PER_USER || '50', 10),
        cleanupInterval: parseInt(process.env.WS_ROOM_CLEANUP_INTERVAL || '600000', 10), // 10 minutes
      },

      // Room size limits
      limits: {
        maxUsersPerRoom: parseInt(process.env.WS_MAX_USERS_PER_ROOM || '1000', 10),
        maxRoomsTotal: parseInt(process.env.WS_MAX_ROOMS_TOTAL || '10000', 10),
      },
    },

    // Graceful Shutdown
    shutdown: {
      enabled: process.env.WS_GRACEFUL_SHUTDOWN_ENABLED !== 'false',
      timeout: parseInt(process.env.WS_SHUTDOWN_TIMEOUT || '30000', 10), // 30s
      notifyClients: process.env.WS_NOTIFY_CLIENTS_ON_SHUTDOWN !== 'false',
    },

    // Development/Debug Configuration
    debug: {
      enabled: isDevelopment,
      logLevel: process.env.WS_LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      logConnections: process.env.WS_LOG_CONNECTIONS === 'true' || isDevelopment,
      logEvents: process.env.WS_LOG_EVENTS === 'true' || isDevelopment,
      logPerformance: process.env.WS_LOG_PERFORMANCE === 'true',
    },
  };
});
