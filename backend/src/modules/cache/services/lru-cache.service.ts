import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

interface CacheOptions {
  max?: number;
  ttl?: number;
}

@Injectable()
export class LRUCacheService {
  private caches = new Map<string, LRUCache<string, any>>();

  /**
   * Create or get a named cache instance
   */
  getCache(name: string, options: CacheOptions = {}): LRUCache<string, any> {
    if (!this.caches.has(name)) {
      const cache = new LRUCache<string, any>({
        max: options.max || 1000,
        ttl: options.ttl || 1000 * 60 * 5, // 5 minutes default
        updateAgeOnGet: true,
        updateAgeOnHas: true,
      });
      this.caches.set(name, cache);
    }
    return this.caches.get(name)!;
  }

  /**
   * Get value from named cache
   */
  get<T>(cacheName: string, key: string): T | undefined {
    const cache = this.getCache(cacheName);
    return cache.get(key) as T | undefined;
  }

  /**
   * Set value in named cache
   */
  set<T>(cacheName: string, key: string, value: T, ttl?: number): void {
    const cache = this.getCache(cacheName);
    cache.set(key, value, { ttl });
  }

  /**
   * Delete value from named cache
   */
  del(cacheName: string, key: string): void {
    const cache = this.getCache(cacheName);
    cache.delete(key);
  }

  /**
   * Clear entire named cache
   */
  clear(cacheName: string): void {
    const cache = this.getCache(cacheName);
    cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(cacheName: string) {
    const cache = this.getCache(cacheName);
    return {
      size: cache.size,
      calculatedSize: cache.calculatedSize,
      maxSize: cache.max,
      // Note: LRU cache v10+ doesn't expose these stats directly
      // These would need to be tracked manually if needed
      disposed: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    cacheName: string,
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    let value = this.get<T>(cacheName, key);

    if (value === undefined) {
      value = await factory();
      this.set(cacheName, key, value, ttl);
    }

    return value;
  }
}
