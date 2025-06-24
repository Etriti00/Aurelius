import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // PostgreSQL Configuration
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'aurelius',

  // Connection Pool
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
  },

  // SSL Configuration
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
      : false,

  // Prisma Specific
  prisma: {
    logLevel: process.env.PRISMA_LOG_LEVEL || 'warn',
    errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
  },

  // pgvector Configuration
  vectorDimensions: parseInt(process.env.VECTOR_DIMENSIONS || '1536', 10),

  // Migration Settings
  runMigrationsOnStartup: process.env.RUN_MIGRATIONS === 'true',

  // Backup Configuration
  backupEnabled: process.env.DB_BACKUP_ENABLED === 'true',
  backupSchedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // 2 AM daily
}));
