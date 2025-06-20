import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  // Access Token
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET || 'aurelius-access-secret-change-in-production',
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    algorithm: 'HS256',
  },
  
  // Refresh Token
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || 'aurelius-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'HS256',
  },
  
  // Email Verification Token
  emailToken: {
    secret: process.env.JWT_EMAIL_SECRET || 'aurelius-email-secret-change-in-production',
    expiresIn: process.env.JWT_EMAIL_EXPIRES_IN || '24h',
  },
  
  // Password Reset Token
  resetToken: {
    secret: process.env.JWT_RESET_SECRET || 'aurelius-reset-secret-change-in-production',
    expiresIn: process.env.JWT_RESET_EXPIRES_IN || '1h',
  },
  
  // API Key Configuration
  apiKey: {
    prefix: process.env.API_KEY_PREFIX || 'aur_',
    length: parseInt(process.env.API_KEY_LENGTH || '32', 10),
  },
  
  // Security Options
  issuer: process.env.JWT_ISSUER || 'aurelius.ai',
  audience: process.env.JWT_AUDIENCE || 'aurelius-users',
  
  // Cookie Configuration
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE || '604800000', 10), // 7 days
  },
}));