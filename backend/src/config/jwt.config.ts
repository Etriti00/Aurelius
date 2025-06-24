import { registerAs } from '@nestjs/config';

interface JwtTokenConfig {
  secret: string;
  expiresIn: string;
  algorithm?: string;
}

interface JwtConfigType {
  accessToken: JwtTokenConfig;
  refreshToken: JwtTokenConfig;
  emailToken: JwtTokenConfig;
  resetToken: JwtTokenConfig;
  apiKey: {
    prefix: string;
    length: number;
  };
  issuer: string;
  audience: string;
  cookie: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
}

function validateRequiredEnvVar(varName: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Required environment variable ${varName} is not defined. ` +
        `Please set it in your .env file before starting the application.`
    );
  }
  return value;
}

export default registerAs('jwt', (): JwtConfigType => {
  // Validate all required secrets at startup
  const accessSecret = validateRequiredEnvVar('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
  const refreshSecret = validateRequiredEnvVar(
    'JWT_REFRESH_SECRET',
    process.env.JWT_REFRESH_SECRET
  );
  const emailSecret = validateRequiredEnvVar('JWT_EMAIL_SECRET', process.env.JWT_EMAIL_SECRET);
  const resetSecret = validateRequiredEnvVar('JWT_RESET_SECRET', process.env.JWT_RESET_SECRET);

  // Validate secrets are strong enough (minimum 32 characters)
  const minSecretLength = 32;
  const secrets = [
    { name: 'JWT_ACCESS_SECRET', value: accessSecret },
    { name: 'JWT_REFRESH_SECRET', value: refreshSecret },
    { name: 'JWT_EMAIL_SECRET', value: emailSecret },
    { name: 'JWT_RESET_SECRET', value: resetSecret },
  ];

  for (const { name, value } of secrets) {
    if (value.length < minSecretLength) {
      throw new Error(
        `${name} must be at least ${minSecretLength} characters long for security. ` +
          `Current length: ${value.length}`
      );
    }
  }

  // Ensure all secrets are different
  const uniqueSecrets = new Set(secrets.map(s => s.value));
  if (uniqueSecrets.size !== secrets.length) {
    throw new Error('All JWT secrets must be unique. Please use different values for each secret.');
  }

  return {
    // Access Token
    accessToken: {
      secret: accessSecret,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      algorithm: 'HS256',
    },

    // Refresh Token
    refreshToken: {
      secret: refreshSecret,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      algorithm: 'HS256',
    },

    // Email Verification Token
    emailToken: {
      secret: emailSecret,
      expiresIn: process.env.JWT_EMAIL_EXPIRES_IN || '24h',
    },

    // Password Reset Token
    resetToken: {
      secret: resetSecret,
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
      sameSite: (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'lax',
      maxAge: parseInt(process.env.COOKIE_MAX_AGE || '604800000', 10), // 7 days
    },
  };
});
