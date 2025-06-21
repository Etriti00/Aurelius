import { CacheService } from '../services/cache.service';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

export interface CacheOptions {
  key?: string;
  ttl?: number;
}

/**
 * Cache method decorator
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = (this as any).cacheService as CacheService;
      
      if (!cacheService) {
        throw new Error('CacheService not injected. Make sure to inject it in the constructor.');
      }

      // Generate cache key
      const cacheKey = options.key || 
        cacheService.generateKey(
          `${target.constructor.name}:${propertyName}`,
          ...args
        );

      // Try to get from cache
      const cachedValue = await cacheService.get(cacheKey);
      if (cachedValue !== null && cachedValue !== undefined) {
        return cachedValue;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cacheService.set(cacheKey, result, options.ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache evict decorator
 */
export function CacheEvict(keyPattern: string) {
  return function (
    _target: object,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = (this as any).cacheService as CacheService;
      
      if (!cacheService) {
        throw new Error('CacheService not injected. Make sure to inject it in the constructor.');
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Evict cache
      await cacheService.delByPattern(keyPattern);

      return result;
    };

    return descriptor;
  };
}

/**
 * User cache decorator - caches per user
 */
export function UserCache(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = (this as any).cacheService as CacheService;
      const userId = args[0]?.userId || args[0]?.user?.id || args[0];
      
      if (!cacheService) {
        throw new Error('CacheService not injected.');
      }

      if (!userId) {
        return await originalMethod.apply(this, args);
      }

      // Generate user-specific cache key
      const cacheKey = cacheService.generateKey(
        `user:${userId}:${target.constructor.name}:${propertyName}`,
        ...args.slice(1)
      );

      // Try to get from cache
      const cachedValue = await cacheService.get(cacheKey);
      if (cachedValue !== null && cachedValue !== undefined) {
        return cachedValue;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      await cacheService.set(cacheKey, result, options.ttl);

      return result;
    };

    return descriptor;
  };
}