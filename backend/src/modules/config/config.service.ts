import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // App Configuration
  get appName(): string {
    return this.configService.get<string>('app.name')!;
  }

  get appVersion(): string {
    return this.configService.get<string>('app.version')!;
  }

  get environment(): string {
    return this.configService.get<string>('app.environment')!;
  }

  get port(): number {
    return this.configService.get<number>('app.port')!;
  }

  get frontendUrl(): string {
    return this.configService.get<string>('app.frontendUrl')!;
  }

  get apiPrefix(): string {
    return this.configService.get<string>('app.apiPrefix')!;
  }

  get isDevelopment(): boolean {
    return this.environment === 'development';
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  // Database Configuration
  get databaseUrl(): string {
    return this.configService.get<string>('database.url')!;
  }

  // JWT Configuration
  get jwtAccessSecret(): string {
    return this.configService.get<string>('jwt.accessToken.secret')!;
  }

  get jwtAccessExpiresIn(): string {
    return this.configService.get<string>('jwt.accessToken.expiresIn')!;
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('jwt.refreshToken.secret')!;
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('jwt.refreshToken.expiresIn')!;
  }

  // Redis Configuration
  get redisHost(): string {
    return this.configService.get<string>('redis.host')!;
  }

  get redisPort(): number {
    return this.configService.get<number>('redis.port')!;
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>('redis.password');
  }

  // AI Configuration
  get anthropicApiKey(): string {
    return this.configService.get<string>('ai.anthropic.apiKey')!;
  }

  get anthropicDefaultModel(): string {
    return this.configService.get<string>('ai.anthropic.defaultModel')!;
  }

  get aiCostOptimization(): any {
    return this.configService.get('ai.costOptimization')!;
  }

  // Google OAuth
  get googleClientId(): string {
    return this.configService.get<string>('integrations.google.clientId')!;
  }

  get googleClientSecret(): string {
    return this.configService.get<string>('integrations.google.clientSecret')!;
  }

  get googleRedirectUri(): string {
    return this.configService.get<string>('integrations.google.redirectUri')!;
  }

  // Microsoft OAuth
  get microsoftClientId(): string {
    return this.configService.get<string>('integrations.microsoft.clientId')!;
  }

  get microsoftClientSecret(): string {
    return this.configService.get<string>('integrations.microsoft.clientSecret')!;
  }

  get microsoftRedirectUri(): string {
    return this.configService.get<string>('integrations.microsoft.redirectUri')!;
  }

  // Stripe
  get stripeSecretKey(): string {
    return this.configService.get<string>('integrations.stripe.secretKey')!;
  }

  get stripeWebhookSecret(): string {
    return this.configService.get<string>('integrations.stripe.webhookSecret')!;
  }

  get stripePriceIds(): any {
    return this.configService.get('integrations.stripe.priceIds')!;
  }

  // SendGrid
  get sendgridApiKey(): string {
    return this.configService.get<string>('integrations.sendgrid.apiKey')!;
  }

  get sendgridFromEmail(): string {
    return this.configService.get<string>('integrations.sendgrid.fromEmail')!;
  }

  // Security
  get encryptionKey(): string {
    return this.configService.get<string>('security.encryption.key')!;
  }

  get encryptionAlgorithm(): string {
    return this.configService.get<string>('security.encryption.algorithm')!;
  }

  get bcryptSaltRounds(): number {
    return this.configService.get<number>('security.encryption.saltRounds')!;
  }

  get corsOrigin(): string[] {
    return this.configService.get<string[]>('security.cors.origin')!;
  }

  get rateLimitWindowMs(): number {
    return this.configService.get<number>('security.rateLimit.windowMs')!;
  }

  get rateLimitMaxRequests(): number {
    return this.configService.get<number>('security.rateLimit.maxRequests')!;
  }

  // Features
  get isVoiceEnabled(): boolean {
    return this.configService.get<boolean>('app.features.voice')!;
  }

  get isAdvancedAnalyticsEnabled(): boolean {
    return this.configService.get<boolean>('app.features.advancedAnalytics')!;
  }

  // Generic getter for any configuration
  get<T>(key: string): T {
    return this.configService.get<T>(key)!;
  }

  getOptional<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.configService.get<T>(key);
    return value !== undefined ? value : defaultValue;
  }
}