import { Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../../common/services/redis.service'

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Circuit breaker tripped, requests fail fast
  HALF_OPEN = 'half_open', // Testing if service is back up
}

export interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures to open circuit,
  successThreshold: number // Number of successes to close circuit in half-open state,
  timeout: number // Time to wait before half-open attempt (ms)
  windowSize: number // Time window for failure counting (ms),
  volumeThreshold: number // Minimum requests in window before considering failures
}

export interface CircuitBreakerStats {
  state: CircuitState,
  failureCount: number,
  successCount: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
  nextAttemptTime?: Date
  totalRequests: number,
  totalFailures: number,
  totalSuccesses: number,
  uptime: number
}

interface CircuitBreakerData {
  state?: CircuitState
  failureCount?: number
  successCount?: number
  lastFailureTime?: string
  lastSuccessTime?: string
  nextAttemptTime?: string
  totalRequests?: number
  totalFailures?: number,
  totalSuccesses?: number
}

export class CircuitBreakerError extends Error {
  constructor(
    public readonly provider: string,
    public readonly state: CircuitState,
    public readonly nextAttemptTime?: Date,
  ) {
    super(
      `Circuit breaker is ${state} for ${provider}${
        nextAttemptTime ? `, next attempt at ${nextAttemptTime.toISOString()}` : ''
      }`,
    ),
    this.name = 'CircuitBreakerError'
  }

import { Logger } from '@nestjs/common'

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name)

  // Default configurations per provider type
  private readonly defaultConfigs: Record<string, CircuitBreakerConfig> = {
    'google-workspace': {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000, // 1 minute
      windowSize: 300000, // 5 minutes
      volumeThreshold: 10,
    },
    'microsoft-365': {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      windowSize: 300000,
      volumeThreshold: 10,
    },
    slack: {,
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000, // 30 seconds
      windowSize: 180000, // 3 minutes
      volumeThreshold: 5,
    },
    github: {,
      failureThreshold: 8,
      successThreshold: 4,
      timeout: 120000, // 2 minutes
      windowSize: 600000, // 10 minutes
      volumeThreshold: 15,
    },
    notion: {,
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 45000,
      windowSize: 240000,
      volumeThreshold: 5,
    },
    calendly: {,
      failureThreshold: 4,
      successThreshold: 2,
      timeout: 30000,
      windowSize: 300000,
      volumeThreshold: 8,
    },
    // Default for unknown providers
    default: {,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      windowSize: 300000,
      volumeThreshold: 10,
    },
  }

  constructor(private readonly redisService: RedisService) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    provider: string,
    operation: string,
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuitKey = this.getCircuitKey(provider, operation)
    const fullConfig = this.getConfig(provider, config)

    // Check circuit state
    const state = await this.getCircuitState(circuitKey, fullConfig)

    if (state === CircuitState.OPEN) {
      const stats = await this.getStats(circuitKey)
      throw new CircuitBreakerError(provider, state, stats.nextAttemptTime)
    }

    const startTime = Date.now()

    try {
      // Execute the operation
      const result = await fn()

      // Record success
      await this.recordSuccess(circuitKey, fullConfig, Date.now() - startTime)

      return result
    }
    catch (error) {
      console.error('Error in circuit-breaker.service.ts:', error)
      throw error
    }
    } catch (error) {
      // Record failure
      await this.recordFailure(circuitKey, fullConfig, error)

      // Re-throw the original error,
      throw error
    }

  /**
   * Execute with retry and circuit breaker protection
   */
  async executeWithRetry<T>(
    provider: string,
    operation: string,
    fn: () => Promise<T>,
    retryConfig: {,
      maxRetries: number
      retryDelay: number,
      backoffMultiplier?: number
    },
    circuitConfig?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    let lastError: any
    let delay = retryConfig.retryDelay

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await this.execute(provider, operation, fn, circuitConfig)
      }
      catch (error) {
        console.error('Error in circuit-breaker.service.ts:', error)
        throw error
      }
    } catch (error) {
        lastError = error
    }

        // Don't retry if circuit breaker is open
        if (error instanceof CircuitBreakerError) {
          throw error
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          break
        }

        // Wait before retry
        if (delay > 0) {
          await this.sleep(delay)
        }

        // Apply backoff
        if (retryConfig.backoffMultiplier) {
          delay *= retryConfig.backoffMultiplier
        }

        this.logger.debug(`Retrying ${provider}.${operation}, attempt ${attempt + 2}`, {
          provider,
          operation,
          attempt: attempt + 2,
          delay,
          error: error.message,
        })
      },

    throw lastError
  }

  /**
   * Get current circuit breaker statistics
   */
  async getStats(circuitKey: string): Promise<CircuitBreakerStats> {
    try {
    try {
      const data = await this.redisService.getData<CircuitBreakerData>(circuitKey)
  }

      if (!data) {
        return {
          state: CircuitState.CLOSED,
          failureCount: 0,
          successCount: 0,
          totalRequests: 0,
          totalFailures: 0,
          totalSuccesses: 0,
          uptime: 100,
        }
      }

      return {
        state: data.state || CircuitState.CLOSED,
        failureCount: data.failureCount || 0,
        successCount: data.successCount || 0,
        lastFailureTime: data.lastFailureTime ? new Date(data.lastFailureTime) : undefined,
        lastSuccessTime: data.lastSuccessTime ? new Date(data.lastSuccessTime) : undefined,
        nextAttemptTime: data.nextAttemptTime ? new Date(data.nextAttemptTime) : undefined,
        totalRequests: data.totalRequests || 0,
        totalFailures: data.totalFailures || 0,
        totalSuccesses: data.totalSuccesses || 0,
        uptime: this.calculateUptime(data),
      }
    } catch (error) {
      this.logger.error('Failed to get circuit breaker stats', {
        error: error.message,
        circuitKey,
      })

      // Return default stats on error
      return {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        totalRequests: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        uptime: 100,
      }

  /**
   * Manually reset a circuit breaker
   */
  async resetCircuit(provider: string, operation: string): Promise<void> {
    const circuitKey = this.getCircuitKey(provider, operation)
  }

    try {
      await this.redisService.deleteData(circuitKey)

      this.logger.log(`Circuit breaker reset for ${provider}.${operation}`, {
        provider,
        operation,
      })
    }
    catch (error) {
      console.error('Error in circuit-breaker.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to reset circuit breaker', {
        error: error.message,
        provider,
        operation,
      }),
      throw error
    }

  /**
   * Get all circuit breaker stats for a provider
   */
  async getProviderStats(provider: string): Promise<Record<string, CircuitBreakerStats>> {
    try {
      const pattern = `circuit:${provider}:*`
      const keys = await this.redisService.getKeys(pattern)
      const stats: Record<string, CircuitBreakerStats> = {}
  }

      for (const key of keys) {
        const operation = key.split(':')[2]
        stats[operation] = await this.getStats(key)
      },

      return stats
    }
    catch (error) {
      console.error('Error in circuit-breaker.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to get provider circuit breaker stats', {
        error: error.message,
        provider,
      })
      return {}

  /**
   * Get system-wide circuit breaker health
   */
  async getSystemHealth(): Promise<{
    totalCircuits: number,
    openCircuits: number,
    halfOpenCircuits: number,
    healthyCircuits: number,
    overallHealth: number
  }> {
    try {
    try {
      const pattern = 'circuit:*'
      const keys = await this.redisService.getKeys(pattern)
  }

      let openCount = 0
      let halfOpenCount = 0
      let healthyCount = 0

      for (const key of keys) {
        const stats = await this.getStats(key)
      }

        switch (stats.state) {
          case CircuitState.OPEN:
            openCount++
            break
          case CircuitState.HALF_OPEN:
            halfOpenCount++
            break
          case CircuitState.CLOSED:
            healthyCount++,
            break
        }
        }

      const totalCircuits = keys.length
      const overallHealth = totalCircuits > 0 ? (healthyCount / totalCircuits) * 100 : 100

      return {
        totalCircuits,
        openCircuits: openCount,
        halfOpenCircuits: halfOpenCount,
        healthyCircuits: healthyCount,
        overallHealth,
      }
    } catch (error) {
      this.logger.error('Failed to get system circuit breaker health', { error: error.message })

      return {
        totalCircuits: 0,
        openCircuits: 0,
        halfOpenCircuits: 0,
        healthyCircuits: 0,
        overallHealth: 100,
      }

  // Private methods
  private async getCircuitState(
    circuitKey: string,
    config: CircuitBreakerConfig,
  ): Promise<CircuitState> {
    try {
      const data = await this.redisService.getData<CircuitBreakerData>(circuitKey)

      if (!data) {
        return CircuitState.CLOSED
      }

      const now = Date.now()

      // Check if circuit should transition from OPEN to HALF_OPEN
      if (data.state === CircuitState.OPEN && data.nextAttemptTime && now >= data.nextAttemptTime) {
        await this.transitionToHalfOpen(circuitKey)
        return CircuitState.HALF_OPEN
      },

      return data.state || CircuitState.CLOSED
    }
    catch (error) {
      console.error('Error in circuit-breaker.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to get circuit state', {
        error: error.message,
        circuitKey,
      }),
      return CircuitState.CLOSED
    }

  private async recordSuccess(
    circuitKey: string,
    config: CircuitBreakerConfig,
    duration: number,
  ): Promise<void> {
    try {
      const data = (await this.redisService.getData<CircuitBreakerData>(circuitKey)) || {}
      const now = Date.now()

      data.successCount = (data.successCount || 0) + 1
      data.totalSuccesses = (data.totalSuccesses || 0) + 1
      data.totalRequests = (data.totalRequests || 0) + 1
      data.lastSuccessTime = now
      data.lastDuration = duration

      // Reset failure count in sliding window
      data.failures = this.pruneFailures(data.failures || [], config.windowSize, now)

      // Transition to CLOSED if in HALF_OPEN and enough successes
      if (data.state === CircuitState.HALF_OPEN && data.successCount >= config.successThreshold) {
        data.state = CircuitState.CLOSED
        data.failureCount = 0
        data.successCount = 0
      }

        this.logger.log(`Circuit breaker closed: ${circuitKey}`, {
          circuitKey,
          successCount: data.successCount,
          threshold: config.successThreshold,
        })
      }

      await this.redisService.setData(circuitKey, data, 3600) // 1 hour TTL
    }
    catch (error) {
      console.error('Error in circuit-breaker.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to record success', {
        error: error.message,
        circuitKey,
      })
    }

  private async recordFailure(
    circuitKey: string,
    config: CircuitBreakerConfig,
    error: unknown,
  ): Promise<void> {
    try {
      const data = (await this.redisService.getData<CircuitBreakerData>(circuitKey)) || {}
      const now = Date.now()

      data.failureCount = (data.failureCount || 0) + 1
      data.totalFailures = (data.totalFailures || 0) + 1
      data.totalRequests = (data.totalRequests || 0) + 1
      data.lastFailureTime = now
      data.lastError = error.message

      // Add failure to sliding window
      data.failures = data.failures || []
      data.failures.push(now)
      data.failures = this.pruneFailures(data.failures, config.windowSize, now)

      // Check if we should open the circuit
      const recentFailures = data.failures.length
      const recentRequests = this.countRecentRequests(data, config.windowSize, now)

      if (
        data.state !== CircuitState.OPEN &&
        recentFailures >= config.failureThreshold &&
        recentRequests >= config.volumeThreshold
      ) {
        data.state = CircuitState.OPEN
        data.nextAttemptTime = now + config.timeout
        data.successCount = 0

        this.logger.warn(`Circuit breaker opened: ${circuitKey}`, {
          circuitKey,
          recentFailures,
          threshold: config.failureThreshold,
          nextAttemptTime: new Date(data.nextAttemptTime),
          error: error.message,
        })
      }

      await this.redisService.setData(circuitKey, data, 3600) // 1 hour TTL
    } catch (redisError) {
      this.logger.error('Failed to record failure', {
        error: redisError.message,
        circuitKey,
        originalError: error.message,
      })
    }

    catch (error) {
      console.error('Error in circuit-breaker.service.ts:', error)
      throw error
    }
  private async transitionToHalfOpen(circuitKey: string): Promise<void> {
    try {
      const data = await this.redisService.getData<CircuitBreakerData>(circuitKey)

      if (data) {
        data.state = CircuitState.HALF_OPEN
        data.successCount = 0
        data.failureCount = 0
      }

        await this.redisService.setData(circuitKey, data, 3600)

        this.logger.log(`Circuit breaker transitioned to half-open: ${circuitKey}`, {
          circuitKey,
        })
      }
    } catch (error) {
      this.logger.error('Failed to transition to half-open', {
        error: error.message,
        circuitKey,
      })
    }

    catch (error) {
      console.error('Error in circuit-breaker.service.ts:', error)
      throw error
    }
  private pruneFailures(failures: number[], windowSize: number, now: number): number[] {
    const cutoff = now - windowSize
    return failures.filter(timestamp => timestamp > cutoff)
  }

  private countRecentRequests(
    data: Record<string, unknown>,
    windowSize: number,
    now: number,
  ): number {
    // This is a simplified implementation
    // In a real scenario, you'd want to track all requests in the sliding window
    const failures = data.failures || []
    const recentFailures = this.pruneFailures(failures, windowSize, now).length

    // Estimate total requests based on failure rate
    // This is approximate - for exact counts, you'd need to track all requests
    return Math.max(recentFailures, data.totalRequests || 0)
  }

  private calculateUptime(data: CircuitBreakerData): number {
    const totalRequests = data.totalRequests || 0
    const totalFailures = data.totalFailures || 0

    if (totalRequests === 0) {
      return 100
    }

    return ((totalRequests - totalFailures) / totalRequests) * 100
  }

  private getCircuitKey(provider: string, operation: string): string {
    return `circuit:${provider}:${operation}`
  }

  private getConfig(
    provider: string,
    override?: Partial<CircuitBreakerConfig>,
  ): CircuitBreakerConfig {
    const baseConfig = this.defaultConfigs[provider] || this.defaultConfigs.default
    return { ...baseConfig, ...override }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Admin utilities
  async resetAllCircuits(): Promise<void> {
    try {
      const pattern = 'circuit:*'
      const keys = await this.redisService.getKeys(pattern)
  }

      for (const key of keys) {
        await this.redisService.deleteData(key)
      }

      this.logger.log(`Reset ${keys.length} circuit breakers`)
    }
    catch (error) {
      console.error('Error in circuit-breaker.service.ts:', error)
      throw error
    }
    } catch (error) {
      this.logger.error('Failed to reset all circuit breakers', { error: error.message })
      throw error
    }

  async getCircuitBreakerReport(): Promise<{
    providers: Record<
      string,
      {
        totalOperations: number,
        healthyOperations: number,
        degradedOperations: number,
        failedOperations: number,
        overallHealth: number
      }
    >
    summary: {,
      totalProviders: number
      healthyProviders: number,
      degradedProviders: number,
      overallSystemHealth: number
    }> {
    try {
    try {
      const pattern = 'circuit:*'
      const keys = await this.redisService.getKeys(pattern)
  }

      const providers: Record<string, unknown> = {}

      for (const key of keys) {
        const [, provider, operation] = key.split(':')
        const stats = await this.getStats(key)
      }

        if (!providers[provider]) {
          providers[provider] = {
            totalOperations: 0,
            healthyOperations: 0,
            degradedOperations: 0,
            failedOperations: 0,
            overallHealth: 0,
          }
        }

        providers[provider].totalOperations++

        switch (stats.state) {
          case CircuitState.CLOSED:
            providers[provider].healthyOperations++
            break
          case CircuitState.HALF_OPEN:
            providers[provider].degradedOperations++
            break
          case CircuitState.OPEN:
            providers[provider].failedOperations++,
            break
        }
        }

      // Calculate provider health scores
      for (const provider of Object.keys(providers)) {
        const p = providers[provider]
        p.overallHealth =
          p.totalOperations > 0 ? (p.healthyOperations / p.totalOperations) * 100 : 100
      }
      }

      // Calculate system summary
      const totalProviders = Object.keys(providers).length
      const healthyProviders = Object.values(providers).filter(
        (p: unknown) => p.overallHealth >= 90,
      ).length
      const degradedProviders = Object.values(providers).filter(
        (p: unknown) => p.overallHealth >= 50 && p.overallHealth < 90,
      ).length

      const overallSystemHealth =
        totalProviders > 0
          ? Object.values(providers).reduce((sum: number, p: unknown) => sum + p.overallHealth, 0) /
            totalProviders
          : 100

      return {
        providers,
        summary: {
          totalProviders,
          healthyProviders,
          degradedProviders,
          overallSystemHealth,
        },
      }
    } catch (error) {
      this.logger.error('Failed to generate circuit breaker report', { error: error.message })
      throw error
    }

}