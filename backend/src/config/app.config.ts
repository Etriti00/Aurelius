import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'Aurelius AI',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  // URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  // Security
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  trustProxy: process.env.TRUST_PROXY === 'true',

  // Features
  features: {
    voice: process.env.FEATURE_VOICE_ENABLED !== 'false',
    advancedAnalytics: process.env.FEATURE_ANALYTICS_ENABLED === 'true',
    customIntegrations: process.env.FEATURE_CUSTOM_INTEGRATIONS === 'true',
  },

  // Performance
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '60000', 10),
  uploadLimit: process.env.UPLOAD_LIMIT || '10mb',

  // Monitoring
  sentryDsn: process.env.SENTRY_DSN,
  logLevel: process.env.LOG_LEVEL || 'info',

  // Aurelius Specific
  aiPersona: 'The Wise Advisor',
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@aurelius.ai',
}));
