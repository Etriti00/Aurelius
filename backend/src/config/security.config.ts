import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // Encryption
  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY || 'change-this-32-character-string!',
    ivLength: parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10),
    tagLength: parseInt(process.env.ENCRYPTION_TAG_LENGTH || '16', 10),
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
    skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS !== 'false',
    methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || [
      'Content-Type',
      'Authorization',
    ],
    exposedHeaders: process.env.CORS_EXPOSED_HEADERS?.split(',') || [],
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10), // 24 hours
  },

  // Helmet Configuration
  helmet: {
    contentSecurityPolicy:
      process.env.HELMET_CSP === 'true'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : false,
    hsts: {
      maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10),
      includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== 'false',
      preload: process.env.HSTS_PRELOAD === 'true',
    },
  },

  // Session Security
  session: {
    secret: process.env.SESSION_SECRET || 'aurelius-session-secret-change-in-production',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.SESSION_SAME_SITE || 'lax',
  },

  // MFA Settings
  mfa: {
    issuer: process.env.MFA_ISSUER || 'Aurelius AI',
    window: parseInt(process.env.MFA_WINDOW || '1', 10),
    backupCodesCount: parseInt(process.env.MFA_BACKUP_CODES || '10', 10),
  },

  // Password Policy
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
    maxAttempts: parseInt(process.env.PASSWORD_MAX_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.PASSWORD_LOCKOUT_DURATION || '900000', 10), // 15 minutes
  },

  // API Security
  api: {
    keyPrefix: process.env.API_KEY_PREFIX || 'aur_',
    keyLength: parseInt(process.env.API_KEY_LENGTH || '32', 10),
    maxActiveKeys: parseInt(process.env.API_MAX_ACTIVE_KEYS || '5', 10),
  },

  // File Upload Security
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'audio/mpeg',
      'audio/wav',
    ],
    scanForViruses: process.env.UPLOAD_SCAN_VIRUSES === 'true',
  },

  // IP Restrictions
  ipRestrictions: {
    enabled: process.env.IP_RESTRICTIONS_ENABLED === 'true',
    whitelist: process.env.IP_WHITELIST?.split(',') || [],
    blacklist: process.env.IP_BLACKLIST?.split(',') || [],
  },
}));
