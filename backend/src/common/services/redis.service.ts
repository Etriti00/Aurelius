import { Injectable, Inject, Logger } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import {
  CacheValue,
  CacheOptions,
  CacheKey,
  CalendarEvent,
  EmailThread,
  TaskData,
  IntegrationToken,
} from '../types'

interface SessionData {
  userId: string,
  email: string
  roles: string[]
  metadata?: Record<string, unknown>
}

interface UsageData {
  [action: string]: number,
  total: number
}

interface ConnectionState {
  connected: boolean,
  lastActivity: Date
  rooms: string[]
  metadata?: Record<string, unknown>
}

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name)

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Generic cache operations with proper typing
  private async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheManager.get<string>(key)
      if (!cached) return null

      const parsed = JSON.parse(cached) as CacheValue<T>

      // Check if expired
      if (parsed.metadata.ttl) {
        const expiryTime = parsed.metadata.timestamp + parsed.metadata.ttl * 1000
        if (Date.now() > expiryTime) {
          await this.cacheManager.del(key)
          return null
        }
      }

      return parsed.data
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error)
      return null
    }
  }

  private async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheValue: CacheValue<T> = {,
        data: value,
        metadata: {,
          timestamp: Date.now(),
          ttl: options.ttl,
          version: options.version,
          compressed: options.compress,
        },
      }

      const ttlMs = options.ttl ? options.ttl * 1000 : undefined
      await this.cacheManager.set(key, JSON.stringify(cacheValue), ttlMs)
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error)
      throw error
    }
  }

  private normalizeKey(key: CacheKey): string {
    return typeof key === 'string' ? key : `${key.namespace}:${key.key}`
  }

  // Session management with proper types
  async setSession(sessionId: string, data: SessionData, ttl: number = 86400): Promise<void> {
    await this.set(`session:${sessionId}`, data, { ttl })
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.get<SessionData>(`session:${sessionId}`)
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.cacheManager.del(`session:${sessionId}`)
  }

  // OAuth tokens cache with proper types
  async setOAuthTokens(
    userId: string,
    provider: string,
    tokens: IntegrationToken,
    ttl: number = 3600,
  ): Promise<void> {
    await this.set(`oauth:${userId}:${provider}`, tokens, { ttl })
  }

  async getOAuthTokens(userId: string, provider: string): Promise<IntegrationToken | null> {
    return this.get<IntegrationToken>(`oauth:${userId}:${provider}`)
  }

  async deleteOAuthTokens(userId: string, provider: string): Promise<void> {
    await this.cacheManager.del(`oauth:${userId}:${provider}`)
  }

  // Data cache with proper types
  async setData<T>(key: string, data: T, ttl: number = 300): Promise<void> {
    await this.set(key, data, { ttl })
  }

  async getData<T>(key: string): Promise<T | null> {
    return this.get<T>(key)
  }

  async deleteData(key: string): Promise<void> {
    await this.cacheManager.del(key)
  }

  // Pattern-based deletion with proper implementation
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.getKeysByPattern(pattern)
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cacheManager.del(key)))
        this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`)
      }
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:`, error)
      throw error
    }
  }

  private async getKeysByPattern(pattern: string): Promise<string[]> {
    // NOTE: This implementation requires direct Redis client access
    // Most cache-manager implementations don't expose SCAN
    // In production, you would need to access the underlying Redis client:

    // const store = this.cacheManager.store as any
    // if (store.getClient) {
    //   const client = store.getClient()
    //   const keys: string[] = []
    //   let cursor = '0'
    //
    //   do {
    //     const [nextCursor, matchedKeys] = await client.scan(
    //       cursor,
    //       'MATCH',
    //       pattern,
    //       'COUNT',
    //       100
    //     )
    //     cursor = nextCursor
    //     keys.push(...matchedKeys)
    //   } while (cursor !== '0')
    //
    //   return keys
    // }

    this.logger.warn(
      `Pattern-based key retrieval not implemented for pattern: ${pattern}. ` +
        'Direct Redis client access required for SCAN command.',
    )
    return []
  }

  // Calendar events cache with proper types
  async setCalendarEvents(
    userId: string,
    events: CalendarEvent[],
    ttl: number = 300,
  ): Promise<void> {
    await this.setData(`calendar:${userId}`, events, ttl)
  }

  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    const events = await this.getData<CalendarEvent[]>(`calendar:${userId}`)
    return events || []
  }

  async invalidateCalendarCache(userId: string): Promise<void> {
    await this.deleteData(`calendar:${userId}`)
  }

  // Email cache with proper types
  async setEmailThreads(userId: string, threads: EmailThread[], ttl: number = 300): Promise<void> {
    await this.setData(`emails:${userId}`, threads, ttl)
  }

  async getEmailThreads(userId: string): Promise<EmailThread[]> {
    const threads = await this.getData<EmailThread[]>(`emails:${userId}`)
    return threads || []
  }

  async invalidateEmailCache(userId: string): Promise<void> {
    await this.deleteData(`emails:${userId}`)
  }

  // Task cache with proper types
  async setTasks(userId: string, tasks: TaskData[], ttl: number = 300): Promise<void> {
    await this.setData(`tasks:${userId}`, tasks, ttl)
  }

  async getTasks(userId: string): Promise<TaskData[]> {
    const tasks = await this.getData<TaskData[]>(`tasks:${userId}`)
    return tasks || []
  }

  async invalidateTaskCache(userId: string): Promise<void> {
    await this.deleteData(`tasks:${userId}`)
  }

  // AI computation cache with proper types
  async setAIResult<T>(key: string, result: T, ttl: number = 86400): Promise<void> {
    await this.setData(`ai:${key}`, result, ttl)
  }

  async getAIResult<T>(key: string): Promise<T | null> {
    return this.getData<T>(`ai:${key}`)
  }

  // Usage tracking with proper types
  async incrementUsage(userId: string, action: string, month: string): Promise<number> {
    try {
      const key = `usage:${userId}:${month}`
      let current = await this.getData<UsageData>(key)

      if (!current) {
        current = { total: 0 }
      }

      current[action] = (current[action] || 0) + 1
      current.total = (current.total || 0) + 1

      await this.setData(key, current, 2592000) // 30 days
      return current[action]
    } catch (error) {
      this.logger.error(`Error incrementing usage for ${userId}:${action}:`, error)
      throw error
    }
  }

  async getUsage(userId: string, month: string): Promise<UsageData> {
    const usage = await this.getData<UsageData>(`usage:${userId}:${month}`)
    return usage || { total: 0 }
  }

  // WebSocket connection state with proper types
  async setConnectionState(
    userId: string,
    socketId: string,
    state: ConnectionState,
  ): Promise<void> {
    await this.setData(`ws:${userId}:${socketId}`, state, 3600) // 1 hour
  }

  async getConnectionState(userId: string, socketId: string): Promise<ConnectionState | null> {
    return this.getData<ConnectionState>(`ws:${userId}:${socketId}`)
  }

  async deleteConnectionState(userId: string, socketId: string): Promise<void> {
    await this.deleteData(`ws:${userId}:${socketId}`)
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const testKey = 'health-check'
      const testValue = 'ok'

      await this.cacheManager.set(testKey, testValue, 1000)
      const result = await this.cacheManager.get<string>(testKey)
      await this.cacheManager.del(testKey)

      return result === testValue
    } catch (error) {
      this.logger.error('Redis health check failed:', error)
      return false
    }
  }
}
