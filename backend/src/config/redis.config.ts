import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Connection
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Connection Options
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
  retryStrategy: {
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
  },
  
  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes default
    max: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '120', 10), // 2 minutes
  },
  
  // Cache Namespaces
  namespaces: {
    user: 'user:',
    ai: 'ai:',
    task: 'task:',
    calendar: 'calendar:',
    email: 'email:',
    integration: 'integration:',
    analytics: 'analytics:',
    session: 'session:',
    lock: 'lock:',
  },
  
  // Bull Queue Configuration
  queue: {
    defaultJobOptions: {
      removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE || '10', 10),
      removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL || '5', 10),
      attempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000', 10),
      },
    },
  },
  
  // Redis Cluster (if applicable)
  cluster: process.env.REDIS_CLUSTER === 'true' ? {
    nodes: process.env.REDIS_CLUSTER_NODES?.split(',') || [],
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
    },
  } : null,
}));