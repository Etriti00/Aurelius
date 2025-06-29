import { registerAs } from '@nestjs/config';
import { LoadBalancingStrategy, MCPServerPriority } from '../interfaces/mcp-server.interface';

export const integrationsConfig = registerAs('integrations', () => ({
  // Pool Manager Configuration
  maxConcurrentOperations: parseInt(process.env.MCP_MAX_CONCURRENT_OPERATIONS || '1000'),
  defaultTimeout: parseInt(process.env.MCP_DEFAULT_TIMEOUT || '30000'),
  healthCheckInterval: parseInt(process.env.MCP_HEALTH_CHECK_INTERVAL || '30000'),
  metricsCollectionInterval: parseInt(process.env.MCP_METRICS_COLLECTION_INTERVAL || '10000'),
  connectionPoolSize: parseInt(process.env.MCP_CONNECTION_POOL_SIZE || '50'),
  circuitBreakerThreshold: parseInt(process.env.MCP_CIRCUIT_BREAKER_THRESHOLD || '5'),
  retryAttempts: parseInt(process.env.MCP_RETRY_ATTEMPTS || '3'),
  loadBalancingStrategy:
    (process.env.MCP_LOAD_BALANCING_STRATEGY as LoadBalancingStrategy) ||
    LoadBalancingStrategy.LEAST_CONNECTIONS,

  // Monitoring Configuration
  monitoring: {
    errorRateThreshold: parseFloat(process.env.MCP_ERROR_RATE_THRESHOLD || '0.05'),
    responseTimeThreshold: parseInt(process.env.MCP_RESPONSE_TIME_THRESHOLD || '1000'),
    uptimeThreshold: parseFloat(process.env.MCP_UPTIME_THRESHOLD || '0.99'),
    connectionThreshold: parseInt(process.env.MCP_CONNECTION_THRESHOLD || '100'),
    rawMetricsHours: parseInt(process.env.MCP_RAW_METRICS_HOURS || '24'),
    aggregatedMetricsDays: parseInt(process.env.MCP_AGGREGATED_METRICS_DAYS || '30'),
    alertHistoryDays: parseInt(process.env.MCP_ALERT_HISTORY_DAYS || '7'),
    webhookUrl: process.env.MCP_WEBHOOK_URL,
    slackChannel: process.env.MCP_SLACK_CHANNEL,
    emailRecipients: process.env.MCP_EMAIL_RECIPIENTS?.split(',') || [],
    minimumSeverity:
      (process.env.MCP_MINIMUM_SEVERITY as 'info' | 'warning' | 'error' | 'critical') || 'warning',
  },

  // Server configurations (can be overridden by database)
  servers: [
    // Example server configurations
    {
      id: 'github-mcp-1',
      name: 'GitHub MCP Server #1',
      description: 'Primary GitHub integration server',
      version: '1.0.0',
      status: 'active',
      endpoint: process.env.GITHUB_MCP_ENDPOINT || 'wss://github-mcp.aurelius.ai',
      protocol: 'websocket',
      authentication: {
        type: 'oauth2',
        credentials: {
          clientId: process.env.GITHUB_CLIENT_ID || '',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        },
      },
      capabilities: [
        {
          name: 'repository-management',
          version: '1.0',
          operations: ['create', 'read', 'update', 'delete', 'list'],
          inputTypes: ['repository', 'branch', 'commit'],
          outputTypes: ['repository-info', 'commit-info', 'branch-info'],
        },
        {
          name: 'issue-tracking',
          version: '1.0',
          operations: ['create', 'read', 'update', 'close', 'comment'],
          inputTypes: ['issue', 'comment'],
          outputTypes: ['issue-info', 'comment-info'],
        },
      ],
      supportedOperations: [
        'repo.create',
        'repo.list',
        'repo.get',
        'repo.update',
        'repo.delete',
        'issue.create',
        'issue.list',
        'issue.get',
        'issue.update',
        'issue.close',
        'pr.create',
        'pr.list',
        'pr.get',
        'pr.merge',
      ],
      performance: {
        maxConcurrentConnections: 100,
        averageResponseTime: 200,
        rateLimits: {
          requestsPerSecond: 10,
          requestsPerMinute: 500,
          requestsPerHour: 5000,
        },
        reliability: {
          uptime: 99.9,
          errorRate: 0.01,
        },
      },
      region: 'us-east-1',
      priority: MCPServerPriority.HIGH,
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        endpoint: '/health',
        expectedResponse: 'OK',
      },
      tags: ['github', 'vcs', 'primary'],
      metadata: {
        vendor: 'GitHub',
        cost: 'free-tier',
        documentation: 'https://docs.github.com/en/rest',
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    },
    {
      id: 'slack-mcp-1',
      name: 'Slack MCP Server #1',
      description: 'Primary Slack integration server',
      version: '1.0.0',
      status: 'active',
      endpoint: process.env.SLACK_MCP_ENDPOINT || 'https://slack-mcp.aurelius.ai',
      protocol: 'http',
      authentication: {
        type: 'oauth2',
        credentials: {
          clientId: process.env.SLACK_CLIENT_ID || '',
          clientSecret: process.env.SLACK_CLIENT_SECRET || '',
        },
      },
      capabilities: [
        {
          name: 'messaging',
          version: '1.0',
          operations: ['send', 'read', 'update', 'delete'],
          inputTypes: ['message', 'channel', 'user'],
          outputTypes: ['message-info', 'channel-info', 'user-info'],
        },
        {
          name: 'workspace-management',
          version: '1.0',
          operations: ['create', 'read', 'update', 'invite'],
          inputTypes: ['workspace', 'user', 'invitation'],
          outputTypes: ['workspace-info', 'user-info', 'invitation-info'],
        },
      ],
      supportedOperations: [
        'message.send',
        'message.list',
        'message.get',
        'message.update',
        'message.delete',
        'channel.create',
        'channel.list',
        'channel.get',
        'channel.join',
        'channel.leave',
        'user.list',
        'user.get',
        'user.invite',
      ],
      performance: {
        maxConcurrentConnections: 50,
        averageResponseTime: 150,
        rateLimits: {
          requestsPerSecond: 5,
          requestsPerMinute: 200,
          requestsPerHour: 1000,
        },
        reliability: {
          uptime: 99.5,
          errorRate: 0.02,
        },
      },
      region: 'us-west-2',
      priority: MCPServerPriority.HIGH,
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        endpoint: '/api/auth.test',
      },
      tags: ['slack', 'messaging', 'primary'],
      metadata: {
        vendor: 'Slack',
        cost: 'paid-tier',
        documentation: 'https://api.slack.com/',
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    },
    {
      id: 'notion-mcp-1',
      name: 'Notion MCP Server #1',
      description: 'Primary Notion integration server',
      version: '1.0.0',
      status: 'active',
      endpoint: process.env.NOTION_MCP_ENDPOINT || 'https://notion-mcp.aurelius.ai',
      protocol: 'http',
      authentication: {
        type: 'oauth2',
        credentials: {
          clientId: process.env.NOTION_CLIENT_ID || '',
          clientSecret: process.env.NOTION_CLIENT_SECRET || '',
        },
      },
      capabilities: [
        {
          name: 'database-management',
          version: '1.0',
          operations: ['create', 'read', 'update', 'query'],
          inputTypes: ['database', 'page', 'block'],
          outputTypes: ['database-info', 'page-info', 'block-info'],
        },
        {
          name: 'content-management',
          version: '1.0',
          operations: ['create', 'read', 'update', 'delete'],
          inputTypes: ['page', 'block', 'comment'],
          outputTypes: ['page-info', 'block-info', 'comment-info'],
        },
      ],
      supportedOperations: [
        'database.create',
        'database.query',
        'database.get',
        'database.update',
        'page.create',
        'page.get',
        'page.update',
        'page.delete',
        'block.create',
        'block.get',
        'block.update',
        'block.delete',
        'user.list',
        'user.get',
      ],
      performance: {
        maxConcurrentConnections: 25,
        averageResponseTime: 300,
        rateLimits: {
          requestsPerSecond: 3,
          requestsPerMinute: 100,
          requestsPerHour: 1000,
        },
        reliability: {
          uptime: 99.8,
          errorRate: 0.01,
        },
      },
      region: 'us-east-1',
      priority: MCPServerPriority.MEDIUM,
      healthCheck: {
        enabled: true,
        interval: 60000,
        timeout: 10000,
        endpoint: '/v1/users/me',
      },
      tags: ['notion', 'database', 'knowledge'],
      metadata: {
        vendor: 'Notion',
        cost: 'free-tier',
        documentation: 'https://developers.notion.com/',
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    },
  ],

  // Pool configurations
  pools: [
    {
      name: 'github-pool',
      description: 'GitHub integration server pool',
      servers: ['github-mcp-1'],
      loadBalancingStrategy: LoadBalancingStrategy.LEAST_CONNECTIONS,
      configuration: {
        minActiveServers: 1,
        maxActiveServers: 3,
        healthCheckInterval: 30000,
        failoverTimeout: 10000,
        circuitBreakerThreshold: 5,
      },
    },
    {
      name: 'messaging-pool',
      description: 'Messaging integration server pool',
      servers: ['slack-mcp-1'],
      loadBalancingStrategy: LoadBalancingStrategy.ROUND_ROBIN,
      configuration: {
        minActiveServers: 1,
        maxActiveServers: 2,
        healthCheckInterval: 30000,
        failoverTimeout: 15000,
        circuitBreakerThreshold: 3,
      },
    },
    {
      name: 'knowledge-pool',
      description: 'Knowledge management server pool',
      servers: ['notion-mcp-1'],
      loadBalancingStrategy: LoadBalancingStrategy.PRIORITY_BASED,
      configuration: {
        minActiveServers: 1,
        maxActiveServers: 2,
        healthCheckInterval: 60000,
        failoverTimeout: 20000,
        circuitBreakerThreshold: 3,
      },
    },
  ],

  // Redis configuration for scaling
  redis: {
    enabled: process.env.MCP_REDIS_ENABLED === 'true',
    host: process.env.MCP_REDIS_HOST || 'localhost',
    port: parseInt(process.env.MCP_REDIS_PORT || '6379'),
    password: process.env.MCP_REDIS_PASSWORD,
    db: parseInt(process.env.MCP_REDIS_DB || '2'),
    keyPrefix: process.env.MCP_REDIS_KEY_PREFIX || 'aurelius:mcp:',
  },

  // Queue configuration
  queues: {
    operations: {
      concurrency: parseInt(process.env.MCP_OPERATIONS_QUEUE_CONCURRENCY || '10'),
      maxRetries: parseInt(process.env.MCP_OPERATIONS_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.MCP_OPERATIONS_RETRY_DELAY || '2000'),
    },
    monitoring: {
      concurrency: parseInt(process.env.MCP_MONITORING_QUEUE_CONCURRENCY || '5'),
      maxRetries: parseInt(process.env.MCP_MONITORING_MAX_RETRIES || '2'),
      retryDelay: parseInt(process.env.MCP_MONITORING_RETRY_DELAY || '1000'),
    },
  },

  // Feature flags
  features: {
    enableAdvancedMetrics: process.env.MCP_ENABLE_ADVANCED_METRICS === 'true',
    enableDistributedTracing: process.env.MCP_ENABLE_DISTRIBUTED_TRACING === 'true',
    enablePredictiveScaling: process.env.MCP_ENABLE_PREDICTIVE_SCALING === 'true',
    enableAIOptimization: process.env.MCP_ENABLE_AI_OPTIMIZATION === 'true',
    enableCostOptimization: process.env.MCP_ENABLE_COST_OPTIMIZATION === 'true',
  },

  // Security configuration
  security: {
    enableTLS: process.env.MCP_ENABLE_TLS !== 'false',
    certificatePath: process.env.MCP_CERTIFICATE_PATH,
    privateKeyPath: process.env.MCP_PRIVATE_KEY_PATH,
    allowedCiphers: process.env.MCP_ALLOWED_CIPHERS?.split(',') || [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-RSA-AES256-SHA384',
    ],
    minTLSVersion: process.env.MCP_MIN_TLS_VERSION || '1.2',
    maxConnections: parseInt(process.env.MCP_MAX_CONNECTIONS || '1000'),
    rateLimitWindow: parseInt(process.env.MCP_RATE_LIMIT_WINDOW || '60000'),
    rateLimitMax: parseInt(process.env.MCP_RATE_LIMIT_MAX || '100'),
  },
}));
