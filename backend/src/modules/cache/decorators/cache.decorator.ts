import { CacheService } from '../services/cache.service';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

export interface CacheOptions {
  key?: string;
  ttl?: number;
}

interface CacheableService {
  cacheService?: CacheService;
}

interface UserCacheContext {
  userId?: string;
  user?: { id: string };
}

/**
 * Cache method decorator
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheService = (this as CacheableService).cacheService;

      if (!cacheService) {
        throw new Error('CacheService not injected. Make sure to inject it in the constructor.');
      }

      // Generate cache key
      const cacheKey =
        options.key ||
        cacheService.generateKey(`${target.constructor.name}:${propertyName}`, ...args);

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
  return function (_target: object, _propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheService = (this as CacheableService).cacheService;

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
  return function (target: object, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheService = (this as CacheableService).cacheService;
      const firstArg = args[0] as UserCacheContext | string | undefined;
      const userId =
        typeof firstArg === 'object' && firstArg !== null
          ? firstArg.userId || firstArg.user?.id
          : firstArg;

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
