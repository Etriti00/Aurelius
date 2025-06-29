import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface CreateApiKeyDto {
  name: string;
  description?: string;
  scopes?: string[];
  permissions?: Record<string, unknown>;
  rateLimit?: number;
  rateLimitWindow?: number;
  allowedIPs?: string[];
  allowedDomains?: string[];
  requiredHeaders?: Record<string, string>;
  expiresIn?: number; // seconds
  environment?: 'production' | 'staging' | 'development';
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  scopes: string[];
  permissions: Record<string, unknown>;
  isActive: boolean;
  isRevoked: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  rateLimit?: number;
  rateLimitWindow?: number;
  expiresAt?: Date;
  environment: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  apiKey?: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      roles: string[];
    };
    scopes: string[];
    permissions: Record<string, unknown>;
    rateLimit?: number;
    rateLimitWindow?: number;
  };
  error?: string;
  blocked?: boolean;
  blockReason?: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}

@Injectable()
export class EnhancedApiKeyService {
  private readonly logger = new Logger(EnhancedApiKeyService.name);
  private readonly keyPrefix: string;
  private readonly defaultKeyLength: number;
  private readonly defaultRateLimit: number;
  private readonly defaultRateLimitWindow: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.keyPrefix = this.configService.get<string>('jwt.apiKey.prefix') || 'aur_';
    this.defaultKeyLength = this.configService.get<number>('jwt.apiKey.length') || 32;
    this.defaultRateLimit = this.configService.get<number>('api.rateLimit.default') || 1000;
    this.defaultRateLimitWindow = this.configService.get<number>('api.rateLimit.window') || 3600;
  }

  /**
   * Generate a new API key for a user
   */
  async generateApiKey(
    userId: string,
    createDto: CreateApiKeyDto,
    createdBy?: string
  ): Promise<{ key: string; apiKey: ApiKeyInfo }> {
    // Validate input
    await this.validateCreateApiKeyDto(createDto, userId);

    // Generate random key
    const randomBytes = crypto.randomBytes(this.defaultKeyLength);
    const key = `${this.keyPrefix}${randomBytes.toString('hex')}`;
    const keyHash = this.hashApiKey(key);
    const keyPrefix = key.substring(0, 8) + '***';

    // Calculate expiration date if provided
    const expiresAt = createDto.expiresIn
      ? new Date(Date.now() + createDto.expiresIn * 1000)
      : null;

    try {
      const apiKey = await this.prisma.apiKey.create({
        data: {
          userId,
          name: createDto.name,
          description: createDto.description,
          keyHash,
          keyPrefix,
          scopes: createDto.scopes || [],
          permissions: JSON.parse(JSON.stringify(createDto.permissions || {})),
          rateLimit: createDto.rateLimit || this.defaultRateLimit,
          rateLimitWindow: createDto.rateLimitWindow || this.defaultRateLimitWindow,
          allowedIPs: createDto.allowedIPs || [],
          allowedDomains: createDto.allowedDomains || [],
          requiredHeaders: JSON.parse(JSON.stringify(createDto.requiredHeaders || {})),
          expiresAt,
          environment: createDto.environment || 'production',
          tags: createDto.tags || [],
          metadata: JSON.parse(JSON.stringify(createDto.metadata || {})),
          createdBy: createdBy || userId,
        },
        include: {
          user: {
            select: { id: true, email: true, roles: true },
          },
        },
      });

      this.logger.log(`API key created for user ${userId}: ${apiKey.name}`);

      const apiKeyInfo: ApiKeyInfo = {
        id: apiKey.id,
        name: apiKey.name,
        description: apiKey.description || undefined,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        permissions: apiKey.permissions as Record<string, unknown>,
        isActive: apiKey.isActive,
        isRevoked: apiKey.isRevoked,
        usageCount: apiKey.usageCount,
        lastUsedAt: apiKey.lastUsedAt || undefined,
        rateLimit: apiKey.rateLimit || undefined,
        rateLimitWindow: apiKey.rateLimitWindow || undefined,
        expiresAt: apiKey.expiresAt || undefined,
        environment: apiKey.environment,
        tags: apiKey.tags,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      };

      return { key, apiKey: apiKeyInfo };
    } catch (error) {
      this.logger.error(`Failed to create API key for user ${userId}:`, error);
      throw new BadRequestException('Failed to create API key');
    }
  }

  /**
   * Validate an API key and return user information
   */
  async validateApiKey(
    key: string,
    requestInfo: {
      ipAddress?: string;
      userAgent?: string;
      method: string;
      endpoint: string;
      headers?: Record<string, string>;
    }
  ): Promise<ApiKeyValidationResult> {
    if (!key || !key.startsWith(this.keyPrefix)) {
      return { isValid: false, error: 'Invalid API key format' };
    }

    const keyHash = this.hashApiKey(key);

    try {
      const apiKey = await this.prisma.apiKey.findUnique({
        where: { keyHash },
        include: {
          user: {
            select: { id: true, email: true, roles: true },
          },
        },
      });

      if (!apiKey) {
        await this.logUsage(null, null, requestInfo, 401, 'Invalid API key');
        return { isValid: false, error: 'Invalid API key' };
      }

      // Check if key is active
      if (!apiKey.isActive || apiKey.isRevoked) {
        await this.logUsage(
          apiKey.id,
          apiKey.userId,
          requestInfo,
          401,
          'API key inactive or revoked'
        );
        return {
          isValid: false,
          error: apiKey.isRevoked ? 'API key has been revoked' : 'API key is inactive',
          blocked: true,
          blockReason: apiKey.isRevoked ? 'revoked' : 'inactive',
        };
      }

      // Check expiration
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        await this.logUsage(apiKey.id, apiKey.userId, requestInfo, 401, 'API key expired');
        return {
          isValid: false,
          error: 'API key has expired',
          blocked: true,
          blockReason: 'expired',
        };
      }

      // Check IP restrictions
      if (apiKey.allowedIPs.length > 0 && requestInfo.ipAddress) {
        if (!this.isIPAllowed(requestInfo.ipAddress, apiKey.allowedIPs)) {
          await this.logUsage(apiKey.id, apiKey.userId, requestInfo, 403, 'IP not allowed');
          return {
            isValid: false,
            error: 'IP address not allowed',
            blocked: true,
            blockReason: 'ip_restriction',
          };
        }
      }

      // Check domain restrictions
      if (apiKey.allowedDomains.length > 0 && requestInfo.headers?.referer) {
        const refererDomain = this.extractDomain(requestInfo.headers.referer);
        if (!this.isDomainAllowed(refererDomain, apiKey.allowedDomains)) {
          await this.logUsage(apiKey.id, apiKey.userId, requestInfo, 403, 'Domain not allowed');
          return {
            isValid: false,
            error: 'Domain not allowed',
            blocked: true,
            blockReason: 'domain_restriction',
          };
        }
      }

      // Check required headers
      const requiredHeaders = apiKey.requiredHeaders as Record<string, string>;
      if (Object.keys(requiredHeaders).length > 0) {
        for (const [headerName, expectedValue] of Object.entries(requiredHeaders)) {
          const actualValue = requestInfo.headers?.[headerName.toLowerCase()];
          if (actualValue !== expectedValue) {
            await this.logUsage(
              apiKey.id,
              apiKey.userId,
              requestInfo,
              403,
              'Required header missing or invalid'
            );
            return {
              isValid: false,
              error: `Required header ${headerName} missing or invalid`,
              blocked: true,
              blockReason: 'header_restriction',
            };
          }
        }
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(
        apiKey.id,
        requestInfo.ipAddress,
        requestInfo.endpoint,
        apiKey.rateLimit || this.defaultRateLimit,
        apiKey.rateLimitWindow || this.defaultRateLimitWindow
      );

      if (!rateLimitCheck.allowed) {
        await this.logUsage(apiKey.id, apiKey.userId, requestInfo, 429, 'Rate limit exceeded');
        return {
          isValid: false,
          error: 'Rate limit exceeded',
          blocked: true,
          blockReason: 'rate_limit',
        };
      }

      // Update usage statistics
      await this.updateUsageStatistics(apiKey.id, requestInfo);

      // Log successful usage
      await this.logUsage(apiKey.id, apiKey.userId, requestInfo, 200);

      return {
        isValid: true,
        apiKey: {
          id: apiKey.id,
          userId: apiKey.userId,
          user: apiKey.user,
          scopes: apiKey.scopes,
          permissions: apiKey.permissions as Record<string, unknown>,
          rateLimit: apiKey.rateLimit || undefined,
          rateLimitWindow: apiKey.rateLimitWindow || undefined,
        },
      };
    } catch (error) {
      this.logger.error('Error validating API key:', error);
      return { isValid: false, error: 'Internal error validating API key' };
    }
  }

  /**
   * List API keys for a user
   */
  async listApiKeys(userId: string): Promise<ApiKeyInfo[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(apiKey => ({
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description || undefined,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      permissions: apiKey.permissions as Record<string, unknown>,
      isActive: apiKey.isActive,
      isRevoked: apiKey.isRevoked,
      usageCount: apiKey.usageCount,
      lastUsedAt: apiKey.lastUsedAt || undefined,
      rateLimit: apiKey.rateLimit || undefined,
      rateLimitWindow: apiKey.rateLimitWindow || undefined,
      expiresAt: apiKey.expiresAt || undefined,
      environment: apiKey.environment,
      tags: apiKey.tags,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    }));
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(
    userId: string,
    keyId: string,
    reason?: string,
    revokedBy?: string
  ): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    if (apiKey.isRevoked) {
      throw new BadRequestException('API key is already revoked');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: revokedBy || userId,
        revokeReason: reason,
      },
    });

    this.logger.log(`API key revoked: ${apiKey.name} (${keyId}) by user ${revokedBy || userId}`);
  }

  /**
   * Update API key settings
   */
  async updateApiKey(
    userId: string,
    keyId: string,
    updateData: Partial<CreateApiKeyDto>
  ): Promise<ApiKeyInfo> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    if (apiKey.isRevoked) {
      throw new BadRequestException('Cannot update revoked API key');
    }

    const updatedApiKey = await this.prisma.apiKey.update({
      where: { id: keyId },
      data: {
        name: updateData.name,
        description: updateData.description,
        scopes: updateData.scopes,
        permissions: updateData.permissions
          ? JSON.parse(JSON.stringify(updateData.permissions))
          : undefined,
        rateLimit: updateData.rateLimit,
        rateLimitWindow: updateData.rateLimitWindow,
        allowedIPs: updateData.allowedIPs,
        allowedDomains: updateData.allowedDomains,
        requiredHeaders: updateData.requiredHeaders
          ? JSON.parse(JSON.stringify(updateData.requiredHeaders))
          : undefined,
        tags: updateData.tags,
        metadata: updateData.metadata ? JSON.parse(JSON.stringify(updateData.metadata)) : undefined,
      },
    });

    return {
      id: updatedApiKey.id,
      name: updatedApiKey.name,
      description: updatedApiKey.description || undefined,
      keyPrefix: updatedApiKey.keyPrefix,
      scopes: updatedApiKey.scopes,
      permissions: updatedApiKey.permissions as Record<string, unknown>,
      isActive: updatedApiKey.isActive,
      isRevoked: updatedApiKey.isRevoked,
      usageCount: updatedApiKey.usageCount,
      lastUsedAt: updatedApiKey.lastUsedAt || undefined,
      rateLimit: updatedApiKey.rateLimit || undefined,
      rateLimitWindow: updatedApiKey.rateLimitWindow || undefined,
      expiresAt: updatedApiKey.expiresAt || undefined,
      environment: updatedApiKey.environment,
      tags: updatedApiKey.tags,
      createdAt: updatedApiKey.createdAt,
      updatedAt: updatedApiKey.updatedAt,
    };
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStatistics(
    userId: string,
    keyId?: string,
    timeRange?: { from: Date; to: Date }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    blockedRequests: number;
    averageResponseTime: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    dailyUsage: Array<{ date: string; count: number }>;
  }> {
    const whereClause: Record<string, unknown> = { userId };

    if (keyId) {
      whereClause.apiKeyId = keyId;
    }

    if (timeRange) {
      whereClause.timestamp = {
        gte: timeRange.from,
        lte: timeRange.to,
      };
    }

    const [totalRequests, successfulRequests, blockedRequests, usageLogs] = await Promise.all([
      this.prisma.apiKeyUsageLog.count({ where: whereClause }),
      this.prisma.apiKeyUsageLog.count({
        where: {
          ...whereClause,
          statusCode: { gte: 200, lt: 300 },
        },
      }),
      this.prisma.apiKeyUsageLog.count({
        where: {
          ...whereClause,
          blocked: true,
        },
      }),
      this.prisma.apiKeyUsageLog.findMany({
        where: whereClause,
        select: {
          endpoint: true,
          responseTime: true,
          timestamp: true,
        },
      }),
    ]);

    // Calculate average response time
    const responseTimes = usageLogs
      .filter(log => log.responseTime !== null)
      .map(log => log.responseTime as number);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    // Calculate top endpoints
    const endpointCounts = usageLogs.reduce(
      (acc, log) => {
        acc[log.endpoint] = (acc[log.endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    // Calculate daily usage
    const dailyUsage = usageLogs.reduce(
      (acc, log) => {
        const date = log.timestamp.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const dailyUsageArray = Object.entries(dailyUsage)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      totalRequests,
      successfulRequests,
      blockedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      topEndpoints,
      dailyUsage: dailyUsageArray,
    };
  }

  /**
   * Check rate limit for an API key
   */
  private async checkRateLimit(
    apiKeyId: string,
    ipAddress: string | undefined,
    endpoint: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitInfo> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    // Find or create rate limit record
    const rateLimitRecord = await this.prisma.apiKeyRateLimit.findFirst({
      where: {
        apiKeyId,
        ipAddress,
        endpoint,
        windowStart: { gte: windowStart },
      },
    });

    if (!rateLimitRecord) {
      // Create new rate limit window
      await this.prisma.apiKeyRateLimit.create({
        data: {
          apiKeyId,
          ipAddress,
          endpoint,
          requestCount: 1,
          windowStart: now,
          windowEnd: new Date(now.getTime() + windowSeconds * 1000),
        },
      });

      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime: new Date(now.getTime() + windowSeconds * 1000),
      };
    }

    // Check if limit exceeded
    if (rateLimitRecord.requestCount >= limit) {
      const retryAfter = Math.ceil((rateLimitRecord.windowEnd.getTime() - now.getTime()) / 1000);

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime: rateLimitRecord.windowEnd,
        retryAfter: retryAfter > 0 ? retryAfter : undefined,
      };
    }

    // Update request count
    await this.prisma.apiKeyRateLimit.update({
      where: { id: rateLimitRecord.id },
      data: { requestCount: { increment: 1 } },
    });

    return {
      allowed: true,
      limit,
      remaining: limit - rateLimitRecord.requestCount - 1,
      resetTime: rateLimitRecord.windowEnd,
    };
  }

  /**
   * Log API key usage
   */
  private async logUsage(
    apiKeyId: string | null,
    userId: string | null,
    requestInfo: {
      method: string;
      endpoint: string;
      ipAddress?: string;
      userAgent?: string;
      headers?: Record<string, string>;
    },
    statusCode: number,
    errorMessage?: string
  ): Promise<void> {
    if (!apiKeyId || !userId) return;

    try {
      await this.prisma.apiKeyUsageLog.create({
        data: {
          apiKeyId,
          userId,
          method: requestInfo.method,
          endpoint: requestInfo.endpoint,
          ipAddress: requestInfo.ipAddress,
          userAgent: requestInfo.userAgent,
          statusCode,
          blocked: statusCode === 403 || statusCode === 429,
          blockReason: errorMessage,
          requestHeaders: requestInfo.headers || {},
          errorMessage,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log API key usage:', error);
    }
  }

  /**
   * Update usage statistics for an API key
   */
  private async updateUsageStatistics(
    apiKeyId: string,
    requestInfo: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      await this.prisma.apiKey.update({
        where: { id: apiKeyId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
          lastUsedIP: requestInfo.ipAddress,
          lastUsedUserAgent: requestInfo.userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update API key usage statistics:', error);
    }
  }

  /**
   * Helper methods
   */
  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  private isIPAllowed(ipAddress: string, allowedIPs: string[]): boolean {
    return allowedIPs.some(allowedIP => {
      if (allowedIP.includes('/')) {
        // CIDR notation
        return this.isIPInCIDR(ipAddress, allowedIP);
      }
      return ipAddress === allowedIP;
    });
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    // Simple CIDR check implementation
    // In production, use a proper CIDR library
    const [network, prefixLength] = cidr.split('/');
    if (!prefixLength) return ip === network;

    // For now, just do exact match
    return ip === network;
  }

  private isDomainAllowed(domain: string, allowedDomains: string[]): boolean {
    return allowedDomains.some(allowedDomain => {
      if (allowedDomain.startsWith('*.')) {
        // Wildcard subdomain
        const baseDomain = allowedDomain.substring(2);
        return domain === baseDomain || domain.endsWith('.' + baseDomain);
      }
      return domain === allowedDomain;
    });
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  private async validateCreateApiKeyDto(dto: CreateApiKeyDto, userId: string): Promise<void> {
    // Check for duplicate names
    const existingKey = await this.prisma.apiKey.findFirst({
      where: {
        userId,
        name: dto.name,
        isRevoked: false,
      },
    });

    if (existingKey) {
      throw new BadRequestException('API key with this name already exists');
    }

    // Validate rate limits
    if (dto.rateLimit && dto.rateLimit < 1) {
      throw new BadRequestException('Rate limit must be at least 1');
    }

    if (dto.rateLimitWindow && dto.rateLimitWindow < 60) {
      throw new BadRequestException('Rate limit window must be at least 60 seconds');
    }

    // Validate expiration
    if (dto.expiresIn && dto.expiresIn < 3600) {
      throw new BadRequestException('Expiration must be at least 1 hour');
    }
  }
}
