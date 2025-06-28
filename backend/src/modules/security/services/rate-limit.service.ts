import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../cache/services/cache.service';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests
  message?: string; // Error message
  keyGenerator?: (req: Express.Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until reset
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly defaultConfig: RateLimitConfig;

  constructor(private cacheService: CacheService) {
    this.defaultConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Too many requests, please try again later',
    };
  }

  /**
   * Check rate limit
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig = this.defaultConfig
  ): Promise<RateLimitResult> {
    const limitKey = `ratelimit:${key}`;
    const countKey = `${limitKey}:count`;
    const resetKey = `${limitKey}:reset`;

    try {
      // Get current count and reset time
      const [count, resetTime] = await Promise.all([
        this.cacheService.get<number>(countKey),
        this.cacheService.get<number>(resetKey),
      ]);

      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Check if we need to reset the window
      if (!resetTime || resetTime < windowStart) {
        // Start new window
        const newResetTime = now + config.windowMs;
        await Promise.all([
          this.cacheService.set(countKey, 1, config.windowMs / 1000),
          this.cacheService.set(resetKey, newResetTime, config.windowMs / 1000),
        ]);

        return {
          allowed: true,
          limit: config.max,
          remaining: config.max - 1,
          resetAt: new Date(newResetTime),
        };
      }

      // Check if limit exceeded
      const currentCount = count || 0;
      if (currentCount >= config.max) {
        const retryAfter = Math.ceil((resetTime - now) / 1000);

        return {
          allowed: false,
          limit: config.max,
          remaining: 0,
          resetAt: new Date(resetTime),
          retryAfter,
        };
      }

      // Increment counter
      await this.cacheService.increment(countKey);

      return {
        allowed: true,
        limit: config.max,
        remaining: config.max - currentCount - 1,
        resetAt: new Date(resetTime),
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for key ${key}:`, error);
      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: config.max,
        remaining: config.max,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }
  }

  /**
   * Check API rate limit
   */
  async checkApiLimit(
    userId: string,
    endpoint: string,
    tier: 'PRO' | 'MAX' | 'TEAMS' = 'PRO'
  ): Promise<RateLimitResult> {
    const limits = {
      PRO: { requests: 1000, window: 60 * 60 * 1000 }, // 1000/hour
      MAX: { requests: 3000, window: 60 * 60 * 1000 }, // 3000/hour
      TEAMS: { requests: 5000, window: 60 * 60 * 1000 }, // 5000/hour
    };

    const config: RateLimitConfig = {
      windowMs: limits[tier].window,
      max: limits[tier].requests,
      message: `API rate limit exceeded for ${tier} tier`,
    };

    const key = `api:${userId}:${endpoint}`;
    return this.checkLimit(key, config);
  }

  /**
   * Check auth rate limit
   */
  async checkAuthLimit(
    identifier: string,
    action: 'login' | 'register' | 'reset'
  ): Promise<RateLimitResult> {
    const configs: Record<string, RateLimitConfig> = {
      login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts
        message: 'Too many login attempts, please try again later',
      },
      register: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 attempts
        message: 'Too many registration attempts, please try again later',
      },
      reset: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 attempts
        message: 'Too many password reset attempts, please try again later',
      },
    };

    const key = `auth:${action}:${identifier}`;
    return this.checkLimit(key, configs[action]);
  }

  /**
   * Check AI request rate limit
   */
  async checkAiLimit(
    userId: string,
    subscription: { tier: 'PRO' | 'MAX' | 'TEAMS'; aiActionsRemaining: number }
  ): Promise<RateLimitResult> {
    // Check monthly AI action limit
    if (subscription.aiActionsRemaining <= 0) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetAt: this.getNextMonthStart(),
        retryAfter: this.getSecondsUntilNextMonth(),
      };
    }

    // Also check burst limit to prevent abuse
    const burstConfig: RateLimitConfig = {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 AI requests per minute max
      message: 'AI request rate limit exceeded, please slow down',
    };

    const key = `ai:burst:${userId}`;
    const burstResult = await this.checkLimit(key, burstConfig);

    if (!burstResult.allowed) {
      return burstResult;
    }

    return {
      allowed: true,
      limit: subscription.aiActionsRemaining,
      remaining: subscription.aiActionsRemaining,
      resetAt: this.getNextMonthStart(),
    };
  }

  /**
   * Check file upload rate limit
   */
  async checkUploadLimit(userId: string, fileSize: number): Promise<RateLimitResult> {
    // Check number of uploads
    const uploadCountConfig: RateLimitConfig = {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 uploads per hour
      message: 'Too many file uploads, please try again later',
    };

    const countResult = await this.checkLimit(`upload:count:${userId}`, uploadCountConfig);
    if (!countResult.allowed) {
      return countResult;
    }

    // Check total upload size
    const sizeKey = `upload:size:${userId}`;
    const currentSize = (await this.cacheService.get<number>(sizeKey)) || 0;
    const maxSize = 100 * 1024 * 1024; // 100MB per hour

    if (currentSize + fileSize > maxSize) {
      return {
        allowed: false,
        limit: maxSize,
        remaining: Math.max(0, maxSize - currentSize),
        resetAt: new Date(Date.now() + uploadCountConfig.windowMs),
        retryAfter: Math.ceil(uploadCountConfig.windowMs / 1000),
      };
    }

    // Update size counter
    await this.cacheService.set(sizeKey, currentSize + fileSize, uploadCountConfig.windowMs / 1000);

    return {
      allowed: true,
      limit: maxSize,
      remaining: maxSize - currentSize - fileSize,
      resetAt: new Date(Date.now() + uploadCountConfig.windowMs),
    };
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string): Promise<void> {
    const limitKey = `ratelimit:${key}`;
    await Promise.all([
      this.cacheService.del(`${limitKey}:count`),
      this.cacheService.del(`${limitKey}:reset`),
    ]);
  }

  /**
   * Get rate limit status without incrementing
   */
  async getStatus(
    key: string,
    config: RateLimitConfig = this.defaultConfig
  ): Promise<RateLimitResult> {
    const limitKey = `ratelimit:${key}`;
    const countKey = `${limitKey}:count`;
    const resetKey = `${limitKey}:reset`;

    const [count, resetTime] = await Promise.all([
      this.cacheService.get<number>(countKey),
      this.cacheService.get<number>(resetKey),
    ]);

    const now = Date.now();
    const currentCount = count || 0;

    if (!resetTime || resetTime < now) {
      return {
        allowed: true,
        limit: config.max,
        remaining: config.max,
        resetAt: new Date(now + config.windowMs),
      };
    }

    const remaining = Math.max(0, config.max - currentCount);
    const allowed = remaining > 0;

    return {
      allowed,
      limit: config.max,
      remaining,
      resetAt: new Date(resetTime),
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
    };
  }

  /**
   * Create rate limit headers
   */
  createHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.floor(result.resetAt.getTime() / 1000).toString(),
    };

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Apply dynamic rate limiting based on system load
   */
  async applyDynamicLimit(
    key: string,
    baseConfig: RateLimitConfig,
    loadFactor: number = 1
  ): Promise<RateLimitResult> {
    // Adjust limits based on system load
    const adjustedConfig: RateLimitConfig = {
      ...baseConfig,
      max: Math.floor(baseConfig.max / loadFactor),
    };

    return this.checkLimit(key, adjustedConfig);
  }

  /**
   * Get next month start date
   */
  private getNextMonthStart(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  /**
   * Get seconds until next month
   */
  private getSecondsUntilNextMonth(): number {
    const now = new Date();
    const nextMonth = this.getNextMonthStart();
    return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
  }
}
