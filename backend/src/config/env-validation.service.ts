import { Injectable, Logger } from '@nestjs/common';

interface RequiredEnvVar {
  key: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
}

interface EnvValidationResult {
  isValid: boolean;
  missingRequired: string[];
  invalidValues: string[];
  warnings: string[];
}

@Injectable()
export class EnvValidationService {
  private readonly logger = new Logger(EnvValidationService.name);

  private readonly requiredEnvVars: RequiredEnvVar[] = [
    // Database
    { key: 'DATABASE_URL', description: 'PostgreSQL database connection string', required: true },
    { key: 'REDIS_URL', description: 'Redis connection string', required: true },

    // JWT Authentication
    { key: 'JWT_SECRET', description: 'JWT signing secret', required: true },
    { key: 'JWT_REFRESH_SECRET', description: 'JWT refresh token secret', required: true },

    // NextAuth
    {
      key: 'NEXTAUTH_SECRET',
      description: 'NextAuth.js secret for session encryption',
      required: true,
    },

    // OAuth Providers
    { key: 'AUTH_GOOGLE_ID', description: 'Google OAuth Client ID', required: false },
    { key: 'AUTH_GOOGLE_SECRET', description: 'Google OAuth Client Secret', required: false },
    {
      key: 'AUTH_AZURE_AD_CLIENT_ID',
      description: 'Microsoft Azure AD Client ID',
      required: false,
    },
    {
      key: 'AUTH_AZURE_AD_CLIENT_SECRET',
      description: 'Microsoft Azure AD Client Secret',
      required: false,
    },
    {
      key: 'AUTH_AZURE_AD_TENANT_ID',
      description: 'Microsoft Azure AD Tenant ID',
      required: false,
    },

    // AI Services
    { key: 'ANTHROPIC_API_KEY', description: 'Anthropic Claude API key', required: true },

    // Email
    {
      key: 'SENDGRID_API_KEY',
      description: 'SendGrid API key for email services',
      required: false,
    },

    // Voice
    {
      key: 'ELEVENLABS_API_KEY',
      description: 'ElevenLabs API key for voice synthesis',
      required: false,
    },

    // Billing
    { key: 'STRIPE_SECRET_KEY', description: 'Stripe secret key for billing', required: false },
    { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook secret', required: false },

    // Security
    {
      key: 'ENCRYPTION_KEY',
      description: 'Data encryption key',
      required: true,
      validator: (value: string) => value.length >= 32,
    },
    {
      key: 'ENCRYPTION_SALT',
      description: 'Data encryption salt',
      required: true,
      validator: (value: string) => value.length >= 16,
    },

    // Demo Environment Variables (for development only)
    { key: 'DEMO_USER_EMAIL', description: 'Demo user email for development', required: false },
    {
      key: 'DEMO_USER_PASSWORD',
      description: 'Demo user password for development',
      required: false,
    },
  ];

  validateEnvironment(): EnvValidationResult {
    const result: EnvValidationResult = {
      isValid: true,
      missingRequired: [],
      invalidValues: [],
      warnings: [],
    };

    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar.key];

      if (!value) {
        if (envVar.required) {
          result.missingRequired.push(`${envVar.key}: ${envVar.description}`);
          result.isValid = false;
        } else {
          result.warnings.push(`${envVar.key} not set: ${envVar.description}`);
        }
        continue;
      }

      // Validate value if validator is provided
      if (envVar.validator && !envVar.validator(value)) {
        result.invalidValues.push(`${envVar.key}: Invalid value format`);
        result.isValid = false;
      }
    }

    return result;
  }

  validateAndThrow(): void {
    const result = this.validateEnvironment();

    if (!result.isValid) {
      this.logger.error('Environment validation failed');

      if (result.missingRequired.length > 0) {
        this.logger.error('Missing required environment variables:');
        result.missingRequired.forEach(missing => {
          this.logger.error(`  - ${missing}`);
        });
      }

      if (result.invalidValues.length > 0) {
        this.logger.error('Invalid environment variable values:');
        result.invalidValues.forEach(invalid => {
          this.logger.error(`  - ${invalid}`);
        });
      }

      throw new Error(
        `Environment validation failed. Missing required variables: ${result.missingRequired.length}, ` +
          `Invalid values: ${result.invalidValues.length}`
      );
    }

    if (result.warnings.length > 0) {
      this.logger.warn('Environment validation warnings:');
      result.warnings.forEach(warning => {
        this.logger.warn(`  - ${warning}`);
      });
    }

    this.logger.log('Environment validation passed successfully');
  }

  getRequiredVariables(): string[] {
    return this.requiredEnvVars.filter(envVar => envVar.required).map(envVar => envVar.key);
  }

  getOptionalVariables(): string[] {
    return this.requiredEnvVars.filter(envVar => !envVar.required).map(envVar => envVar.key);
  }

  isDemoEnvironmentConfigured(): boolean {
    return Boolean(process.env.DEMO_USER_EMAIL && process.env.DEMO_USER_PASSWORD);
  }
}
