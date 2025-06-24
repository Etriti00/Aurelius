import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly keyPrefix: string;
  private readonly validApiKeys: Map<string, { userId: string; email: string; roles: string[] }>;

  constructor(private readonly configService: ConfigService) {
    this.keyPrefix = this.configService.get<string>('jwt.apiKey.prefix') || 'aur_';

    // In production, this would be loaded from database
    // For now, we'll use environment variables
    this.validApiKeys = new Map();
    this.loadApiKeysFromEnv();
  }

  private loadApiKeysFromEnv(): void {
    // Load API keys from environment variables
    // Format: API_KEY_1=aur_xxx:userId:email:role1,role2
    let index = 1;
    let envKey = `API_KEY_${index}`;

    while (process.env[envKey]) {
      const envValue = process.env[envKey];
      if (!envValue) {
        break;
      }

      const [apiKey, userId, email, roles] = envValue.split(':');
      if (apiKey && userId && email) {
        const hashedKey = this.hashApiKey(apiKey);
        this.validApiKeys.set(hashedKey, {
          userId,
          email,
          roles: roles ? roles.split(',') : ['user'],
        });
      }
      index++;
      envKey = `API_KEY_${index}`;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    // Validate format
    if (!apiKey.startsWith(this.keyPrefix)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Hash the API key for secure comparison
    const hashedKey = this.hashApiKey(apiKey);

    // Look up the API key
    const keyData = this.validApiKeys.get(hashedKey);

    if (!keyData) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach user to request for downstream use
    request.user = {
      id: keyData.userId,
      email: keyData.email,
      roles: keyData.roles,
    };

    return true;
  }

  private extractApiKey(request: Request): string | null {
    // Check Authorization header (preferred)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string') {
      return apiKeyHeader;
    }

    // Check query parameter (least secure, should be avoided in production)
    if (request.query.api_key && typeof request.query.api_key === 'string') {
      return request.query.api_key;
    }

    return null;
  }

  private hashApiKey(apiKey: string): string {
    // Use SHA-256 for consistent hashing
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}

// Simplified API key service for now
@Injectable()
export class ApiKeyService {
  private readonly apiKeys: Map<
    string,
    { name: string; userId: string; createdAt: Date; expiresAt: Date | null }
  > = new Map();

  constructor(private readonly configService: ConfigService) {}

  async generateApiKey(
    userId: string,
    name: string,
    expiresIn?: number
  ): Promise<{ key: string; hashedKey: string }> {
    const keyLength = this.configService.get<number>('jwt.apiKey.length') || 32;
    const prefix = this.configService.get<string>('jwt.apiKey.prefix') || 'aur_';

    // Generate random key
    const randomBytes = crypto.randomBytes(keyLength);
    const key = `${prefix}${randomBytes.toString('hex')}`;

    // Hash for storage
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

    // Calculate expiration date if provided
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // Store in memory (in production, this would be in database)
    this.apiKeys.set(hashedKey, {
      name,
      userId,
      createdAt: new Date(),
      expiresAt,
    });

    return { key, hashedKey };
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    // In production, this would update database
    // For now, we'll just remove from memory
    for (const [hash, data] of this.apiKeys.entries()) {
      if (data.userId === userId && hash.substring(0, 8) === keyId) {
        this.apiKeys.delete(hash);
        break;
      }
    }
  }

  async listApiKeys(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      keyPrefix: string;
      lastUsedAt: Date | null;
      expiresAt: Date | null;
      isActive: boolean;
      createdAt: Date;
      usageCount: number;
    }>
  > {
    const keys = [];

    for (const [hash, data] of this.apiKeys.entries()) {
      if (data.userId === userId) {
        keys.push({
          id: hash.substring(0, 8), // Use first 8 chars as ID
          name: data.name,
          keyPrefix: 'aur_',
          lastUsedAt: null,
          expiresAt: data.expiresAt,
          isActive: true,
          createdAt: data.createdAt,
          usageCount: 0,
        });
      }
    }

    return keys;
  }
}
