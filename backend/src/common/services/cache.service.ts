import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createHash } from 'crypto';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  strategy?: 'exact-match' | 'semantic-dedup' | 'content-hash' | 'similarity-threshold' | 'sliding-window' | 'refresh-ahead';
  layers?: CacheLayer[];
  invalidateOn?: string[];
  userData?: {
    userId: string;
    subscription?: { tier: string };
  };
}

type CacheLayer = 'L0_Local' | 'L1_Memory' | 'L2_Redis' | 'L3_Database';

interface CacheEntry {
  data: any;
  timestamp: number;
  hits: number;
  strategy: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly localCache = new Map<string, CacheEntry>(); // L0 Local cache
  private readonly maxLocalCacheSize = 100; // Limit local cache size

  // Cache TTL configurations by pattern
  private readonly cachePatterns = {
    'ai-responses': { 
      ttl: 259200, // 72h
      strategy: 'semantic-dedup',
      layers: ['L1_Memory', 'L2_Redis'],
    },
    'voice-transcripts': {
      ttl: 86400, // 24h
      strategy: 'exact-match',
      layers: ['L1_Memory', 'L2_Redis'],
    },
    'tts-audio': {
      ttl: 604800, // 7d
      strategy: 'content-hash',
      layers: ['L2_Redis'],
    },
    'user-context': { 
      ttl: 86400, // 24h
      strategy: 'sliding-window',
      layers: ['L0_Local', 'L1_Memory'],
    },
    'integration-data': { 
      ttl: 300, // 5m
      strategy: 'refresh-ahead',
      layers: ['L0_Local', 'L1_Memory', 'L2_Redis'],
    },
    'vector-search': { 
      ttl: 172800, // 48h
      strategy: 'similarity-threshold',
      layers: ['L1_Memory', 'L2_Redis'],
    },
  };

  constructor(@Inject(CACHE_MANAGER) private readonly redisCache: Cache) {
    // Cleanup local cache periodically
    setInterval(() => this.cleanupLocalCache(), 300000); // Every 5 minutes
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const pattern = this.detectPattern(key);
    const config = this.getCacheConfig(pattern, options);
    
    // Check all configured layers in order
    for (const layer of config.layers) {
      const result = await this.getFromLayer<T>(key, layer);
      if (result !== null) {
        this.logger.debug(`Cache hit on ${layer} for key: ${key}`);
        
        // Update hit count
        this.incrementHitCount(key, layer);
        
        // Propagate to faster layers if found in slower ones
        if (layer !== 'L0_Local') {
          await this.propagateToFasterLayers(key, result, layer, config.layers);
        }
        
        return result;
      }
    }

    this.logger.debug(`Cache miss for key: ${key}`);
    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const pattern = this.detectPattern(key);
    const config = this.getCacheConfig(pattern, options);
    
    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now(),
      hits: 0,
      strategy: config.strategy,
      metadata: options?.userData,
    };

    // Store in all configured layers
    const promises = config.layers.map(layer => 
      this.setInLayer(key, entry, layer, config.ttl)
    );

    await Promise.all(promises);

    this.logger.debug(
      `Cached data in ${config.layers.join(', ')} for key: ${key} (TTL: ${config.ttl}s)`
    );
  }

  async delete(key: string): Promise<void> {
    const allLayers: CacheLayer[] = ['L0_Local', 'L1_Memory', 'L2_Redis'];
    
    const promises = allLayers.map(layer => this.deleteFromLayer(key, layer));
    await Promise.all(promises);

    this.logger.debug(`Deleted cache entry for key: ${key}`);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    this.logger.debug(`Invalidating cache pattern: ${pattern}`);
    
    // Clear local cache entries matching pattern
    for (const [key] of this.localCache) {
      if (key.includes(pattern)) {
        this.localCache.delete(key);
      }
    }

    // For Redis, we'd need to scan and delete matching keys
    // This is a simplified implementation
    try {
      // In a real implementation, you'd use Redis SCAN to find and delete matching keys
      this.logger.debug(`Pattern invalidation completed for: ${pattern}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern ${pattern}`, error);
    }
  }

  async getCacheStats(): Promise<{
    local: { size: number; hits: number };
    redis: { connected: boolean };
    patterns: Record<string, { hits: number; misses: number }>;
  }> {
    const localStats = {
      size: this.localCache.size,
      hits: Array.from(this.localCache.values()).reduce((sum, entry) => sum + entry.hits, 0),
    };

    const redisConnected = await this.testRedisConnection();

    return {
      local: localStats,
      redis: { connected: redisConnected },
      patterns: {}, // Would implement pattern-specific stats
    };
  }

  // Multi-layer cache operations
  private async getFromLayer<T>(key: string, layer: CacheLayer): Promise<T | null> {
    switch (layer) {
      case 'L0_Local': {
        const localEntry = this.localCache.get(key);
        if (localEntry && !this.isExpired(localEntry, 30)) { // 30s TTL for local
          return localEntry.data;
        }
        return null;
      }

      case 'L1_Memory':
      case 'L2_Redis': {
        try {
          const cached = await this.redisCache.get<CacheEntry>(key);
          return cached?.data || null;
        } catch (error) {
          this.logger.warn(`Failed to get from ${layer}`, error);
          return null;
        }
      }

      case 'L3_Database':
        // Database cache would be implemented here
        return null;

      default:
        return null;
    }
  }

  private async setInLayer<T>(
    key: string, 
    entry: CacheEntry, 
    layer: CacheLayer, 
    ttl: number
  ): Promise<void> {
    switch (layer) {
      case 'L0_Local':
        this.setInLocalCache(key, entry);
        break;

      case 'L1_Memory':
      case 'L2_Redis':
        try {
          await this.redisCache.set(key, entry, ttl);
        } catch (error) {
          this.logger.warn(`Failed to set in ${layer}`, error);
        }
        break;

      case 'L3_Database':
        // Database cache implementation
        break;
    }
  }

  private async deleteFromLayer(key: string, layer: CacheLayer): Promise<void> {
    switch (layer) {
      case 'L0_Local':
        this.localCache.delete(key);
        break;

      case 'L1_Memory':
      case 'L2_Redis':
        try {
          await this.redisCache.del(key);
        } catch (error) {
          this.logger.warn(`Failed to delete from ${layer}`, error);
        }
        break;
    }
  }

  private setInLocalCache(key: string, entry: CacheEntry): void {
    // Implement LRU eviction if cache is full
    if (this.localCache.size >= this.maxLocalCacheSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.localCache.delete(oldestKey);
      }
    }

    this.localCache.set(key, entry);
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.localCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private async propagateToFasterLayers<T>(
    key: string,
    value: T,
    foundInLayer: CacheLayer,
    configuredLayers: CacheLayer[]
  ): Promise<void> {
    const layerOrder: CacheLayer[] = ['L0_Local', 'L1_Memory', 'L2_Redis', 'L3_Database'];
    const foundIndex = layerOrder.indexOf(foundInLayer);
    
    const fasterLayers = configuredLayers.filter(layer => 
      layerOrder.indexOf(layer) < foundIndex
    );

    const entry: CacheEntry = {
      data: value,
      timestamp: Date.now(),
      hits: 0,
      strategy: 'propagated',
    };

    const promises = fasterLayers.map(layer => 
      this.setInLayer(key, entry, layer, 3600) // 1 hour TTL for propagated entries
    );

    await Promise.all(promises);
  }

  private incrementHitCount(key: string, layer: CacheLayer): void {
    if (layer === 'L0_Local') {
      const entry = this.localCache.get(key);
      if (entry) {
        entry.hits++;
      }
    }
    // For Redis, we could increment a separate hit counter
  }

  private detectPattern(key: string): string {
    for (const pattern of Object.keys(this.cachePatterns)) {
      if (key.includes(pattern)) {
        return pattern;
      }
    }
    return 'default';
  }

  private getCacheConfig(pattern: string, options?: CacheOptions): {
    ttl: number;
    strategy: string;
    layers: CacheLayer[];
  } {
    const patternConfig = this.cachePatterns[pattern as keyof typeof this.cachePatterns];
    
    return {
      ttl: options?.ttl || patternConfig?.ttl || 3600,
      strategy: options?.strategy || patternConfig?.strategy || 'exact-match',
      layers: options?.layers || patternConfig?.layers || ['L1_Memory', 'L2_Redis'],
    };
  }

  private isExpired(entry: CacheEntry, ttlSeconds: number): boolean {
    return Date.now() - entry.timestamp > ttlSeconds * 1000;
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.localCache) {
      if (this.isExpired(entry, 1800)) { // 30 minutes max for local cache
        this.localCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired local cache entries`);
    }
  }

  private async testRedisConnection(): Promise<boolean> {
    try {
      await this.redisCache.set('health-check', 'ok', 1);
      await this.redisCache.del('health-check');
      return true;
    } catch (error) {
      this.logger.warn('Redis health check failed', error);
      return false;
    }
  }
}

// Decorator for automatic caching
export function SmartCache(options: CacheOptions) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService || this.moduleRef?.get(CacheService);
      
      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      const cacheKey = generateCacheKey(target.constructor.name, propertyName, args);
      
      // Try to get from cache
      const cached = await cacheService.get(cacheKey, options);
      if (cached !== null) {
        return cached;
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      await cacheService.set(cacheKey, result, options);
      
      return result;
    };
  };
}

function generateCacheKey(className: string, methodName: string, args: any[]): string {
  const argsString = JSON.stringify(args);
  const hash = createHash('sha256').update(argsString).digest('hex').substring(0, 16);
  return `${className}:${methodName}:${hash}`;
}