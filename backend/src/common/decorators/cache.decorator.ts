import { SetMetadata } from '@nestjs/common'

export const CACHE_KEY_METADATA = 'cache_key'
export const CACHE_TTL_METADATA = 'cache_ttl'

/**
 * Cache decorator to automatically cache method results
 * @param key - Cache key prefix
 * @param ttl - Time to live in seconds (default: 300)
 */
export const Cacheable = (key: string, ttl: number = 300) => {
  return (target: unknown, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyName, descriptor)
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyName, descriptor)
  }
}

/**
 * Cache invalidation decorator
 * @param patterns - Cache key patterns to invalidate
 */
export const CacheEvict = (patterns: string[]) => {
  return SetMetadata('cache_evict', patterns)
}
