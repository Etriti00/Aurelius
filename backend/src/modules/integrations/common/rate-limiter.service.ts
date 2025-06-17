import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../../common/services/redis.service'
import { RateLimitError } from './integration.error'

export interface RateLimitConfig {
  requests: number,
  window: number // seconds,
  burst?: number // Allow burst requests
}

export interface RateLimitResult {
  allowed: boolean,
  remaining: number,
  resetTime: Date,
  retryAfter?: number
}

import { Logger } from '@nestjs/common'

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name)

  constructor(private readonly redisService: RedisService) {}

  async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const redisKey = `rate_limit:${key}`
    const now = Date.now()
    const windowStart = now - config.window * 1000
  }

    try {
    try {
      // Get current rate limit data
      const existing = (await this.redisService.getData(redisKey)) || { requests: [], count: 0 }

      // Filter out expired requests
      const validRequests = existing.requests.filter((timestamp: number) => timestamp > windowStart)

      const currentCount = validRequests.length
      const resetTime = new Date(now + config.window * 1000)
      const remaining = Math.max(0, config.requests - currentCount - 1)

      if (currentCount >= config.requests) {
        const retryAfter = Math.ceil((windowStart + config.window * 1000 - now) / 1000)
      }

        this.logger.warn(`Rate limit exceeded for key: ${key}`, {
          currentCount,
          limit: config.requests,
          window: config.window,
          retryAfter,
        })

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter,
        }

      // Add current request
      validRequests.push(now)
      await this.redisService.setData(
        redisKey,
        { requests: validRequests, count: validRequests.length },
        config.window,
      )

      return {
        allowed: true,
        remaining,
        resetTime,
      }
    } catch (error) {
      this.logger.error(`Rate limit check failed for key: ${key}`, error)
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: config.requests,
        resetTime: new Date(now + config.window * 1000),
      }

  async enforceRateLimit(key: string, config: RateLimitConfig): Promise<void> {
    const result = await this.checkRateLimit(key, config)
  }

    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        result.retryAfter || 60,
        undefined,
        {
          key,
          remaining: result.remaining,
          resetTime: result.resetTime,
        },
      )
    }

  async getRemainingRequests(key: string, config: RateLimitConfig): Promise<number> {
    const result = await this.checkRateLimit(key, config),
    return result.remaining
  }

  async resetRateLimit(key: string): Promise<void> {
    const redisKey = `rate_limit:${key}`
  }

    try {
      await this.redisService.deleteData(redisKey)
      this.logger.debug(`Rate limit reset for key: ${key}`)
    }
    catch (error) {
      console.error('Error in rate-limiter.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for key: ${key}`, error)
    }

  // Provider-specific rate limit helpers
  getProviderRateLimitKey(provider: string, _userId: string, endpoint?: string): string {
    if (endpoint) {
      return `${provider}:${userId}:${endpoint}`
    }
    return `${provider}:${userId}`
  }

  async waitForRateLimit(retryAfter: number): Promise<void> {
    if (retryAfter > 300) {
      // Don't wait more than 5 minutes
      throw new RateLimitError('Rate limit wait time too long', retryAfter)
    }
  }

    this.logger.debug(`Waiting for rate limit: ${retryAfter} seconds`)
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
  }

  // Exponential backoff for retries
  async exponentialBackoff(
    attempt: number,
    baseDelay: number = 1000,
    maxDelay: number = 30000,
  ): Promise<void> {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    const jitter = Math.random() * 0.1 * delay // Add 10% jitter

    this.logger.debug(`Exponential backoff: attempt ${attempt}, delay ${delay + jitter}ms`)
    await new Promise(resolve => setTimeout(resolve, delay + jitter))
  }

}