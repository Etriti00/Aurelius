import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // App Configuration
  get appName(): string {
    const value = this.configService.get<string>('app.name');
    if (!value) {
      throw new Error('Missing required configuration: app.name');
    }
    return value;
  }

  get appVersion(): string {
    return this.configService.get<string>('app.version') ?? '1.0.0';
  }

  get environment(): string {
    return this.configService.get<string>('app.environment') ?? 'development';
  }

  get port(): number {
    return this.configService.get<number>('app.port') ?? 3001;
  }

  get frontendUrl(): string {
    return this.configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
  }

  get apiPrefix(): string {
    return this.configService.get<string>('app.apiPrefix') ?? 'api/v1';
  }

  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  // Database Configuration
  get databaseUrl(): string {
    const value = this.configService.get<string>('database.url');
    if (!value) {
      throw new Error('Missing required configuration: database.url');
    }
    return value;
  }

  // JWT Configuration
  get jwtAccessSecret(): string {
    const value = this.configService.get<string>('jwt.accessToken.secret');
    if (!value) {
      throw new Error('Missing required configuration: jwt.accessToken.secret');
    }
    return value;
  }

  get jwtAccessExpiresIn(): string {
    return this.configService.get<string>('jwt.accessToken.expiresIn') ?? '15m';
  }

  get jwtRefreshSecret(): string {
    const value = this.configService.get<string>('jwt.refreshToken.secret');
    if (!value) {
      throw new Error('Missing required configuration: jwt.refreshToken.secret');
    }
    return value;
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('jwt.refreshToken.expiresIn') ?? '7d';
  }

  // Redis Configuration
  get redisHost(): string {
    return this.configService.get<string>('redis.host') ?? 'localhost';
  }

  get redisPort(): number {
    return this.configService.get<number>('redis.port') ?? 6379;
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>('redis.password');
  }

  // AI Configuration
  get anthropicApiKey(): string {
    const value = this.configService.get<string>('ai.anthropic.apiKey');
    if (!value) {
      throw new Error('Missing required configuration: ai.anthropic.apiKey');
    }
    return value;
  }

  get anthropicDefaultModel(): string {
    return (
      this.configService.get<string>('ai.anthropic.defaultModel') ?? 'claude-3-sonnet-20240229'
    );
  }

  get aiCostOptimization(): {
    enabled: boolean;
    cacheDurationHours: number;
    batchingEnabled: boolean;
    preemptiveCaching: boolean;
  } {
    return (
      this.configService.get('ai.costOptimization') ?? {
        enabled: true,
        cacheDurationHours: 48,
        batchingEnabled: true,
        preemptiveCaching: false,
      }
    );
  }

  // Google OAuth
  get googleClientId(): string {
    const value = this.configService.get<string>('integrations.google.clientId');
    if (!value) {
      throw new Error('Missing required configuration: integrations.google.clientId');
    }
    return value;
  }

  get googleClientSecret(): string {
    const value = this.configService.get<string>('integrations.google.clientSecret');
    if (!value) {
      throw new Error('Missing required configuration: integrations.google.clientSecret');
    }
    return value;
  }

  get googleRedirectUri(): string {
    const value = this.configService.get<string>('integrations.google.redirectUri');
    if (!value) {
      throw new Error('Missing required configuration: integrations.google.redirectUri');
    }
    return value;
  }

  // Microsoft OAuth
  get microsoftClientId(): string {
    const value = this.configService.get<string>('integrations.microsoft.clientId');
    if (!value) {
      throw new Error('Missing required configuration: integrations.microsoft.clientId');
    }
    return value;
  }

  get microsoftClientSecret(): string {
    const value = this.configService.get<string>('integrations.microsoft.clientSecret');
    if (!value) {
      throw new Error('Missing required configuration: integrations.microsoft.clientSecret');
    }
    return value;
  }

  get microsoftRedirectUri(): string {
    const value = this.configService.get<string>('integrations.microsoft.redirectUri');
    if (!value) {
      throw new Error('Missing required configuration: integrations.microsoft.redirectUri');
    }
    return value;
  }

  // Paddle
  get paddleApiKey(): string {
    const value = this.configService.get<string>('integrations.paddle.apiKey');
    if (!value) {
      throw new Error('Missing required configuration: integrations.paddle.apiKey');
    }
    return value;
  }

  get paddleVendorId(): string {
    const value = this.configService.get<string>('integrations.paddle.vendorId');
    if (!value) {
      throw new Error('Missing required configuration: integrations.paddle.vendorId');
    }
    return value;
  }

  get paddleVendorAuthCode(): string {
    const value = this.configService.get<string>('integrations.paddle.vendorAuthCode');
    if (!value) {
      throw new Error('Missing required configuration: integrations.paddle.vendorAuthCode');
    }
    return value;
  }

  get paddlePublicKey(): string {
    const value = this.configService.get<string>('integrations.paddle.publicKey');
    if (!value) {
      throw new Error('Missing required configuration: integrations.paddle.publicKey');
    }
    return value;
  }

  get paddleWebhookSecret(): string {
    const value = this.configService.get<string>('integrations.paddle.webhookSecret');
    if (!value) {
      throw new Error('Missing required configuration: integrations.paddle.webhookSecret');
    }
    return value;
  }

  get paddleEnvironment(): string {
    return this.configService.get<string>('integrations.paddle.environment') ?? 'sandbox';
  }

  get paddlePriceIds(): { professional: string; team: string; enterprise: string } {
    return (
      this.configService.get('integrations.paddle.priceIds') ?? {
        professional: 'price_default_professional',
        team: 'price_default_team',
        enterprise: 'price_default_enterprise',
      }
    );
  }

  get paddleTrialDays(): number {
    return this.configService.get<number>('integrations.paddle.trialDays') ?? 14;
  }

  // SendGrid
  get sendgridApiKey(): string {
    const value = this.configService.get<string>('integrations.sendgrid.apiKey');
    if (!value) {
      throw new Error('Missing required configuration: integrations.sendgrid.apiKey');
    }
    return value;
  }

  get sendgridFromEmail(): string {
    const value = this.configService.get<string>('integrations.sendgrid.fromEmail');
    if (!value) {
      throw new Error('Missing required configuration: integrations.sendgrid.fromEmail');
    }
    return value;
  }

  // Security
  get encryptionKey(): string {
    const value = this.configService.get<string>('security.encryption.key');
    if (!value) {
      throw new Error('Missing required configuration: security.encryption.key');
    }
    return value;
  }

  get encryptionAlgorithm(): string {
    return this.configService.get<string>('security.encryption.algorithm') ?? 'aes-256-gcm';
  }

  get bcryptSaltRounds(): number {
    return this.configService.get<number>('security.encryption.saltRounds') ?? 12;
  }

  get corsOrigin(): string[] {
    return this.configService.get<string[]>('security.cors.origin') ?? ['http://localhost:3000'];
  }

  get rateLimitWindowMs(): number {
    return this.configService.get<number>('security.rateLimit.windowMs') ?? 60000; // 1 minute
  }

  get rateLimitMaxRequests(): number {
    return this.configService.get<number>('security.rateLimit.maxRequests') ?? 100;
  }

  // Features
  get isVoiceEnabled(): boolean {
    return this.configService.get<boolean>('app.features.voice') ?? false;
  }

  get isAdvancedAnalyticsEnabled(): boolean {
    return this.configService.get<boolean>('app.features.advancedAnalytics') ?? false;
  }

  // Generic getter for any configuration
  get<T>(key: string): T {
    const value = this.configService.get<T>(key);
    if (value === undefined) {
      throw new Error(`Missing required configuration: ${key}`);
    }
    return value;
  }

  getOptional<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.configService.get<T>(key);
    return value !== undefined ? value : defaultValue;
  }
}
