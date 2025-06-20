import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../modules/cache/services/cache.service';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Skip caching for non-GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Get cache metadata
    const cacheKey = this.reflector.getAllAndOverride<string>(
      CACHE_KEY_METADATA,
      [handler, controller],
    );
    
    const cacheTTL = this.reflector.getAllAndOverride<number>(
      CACHE_TTL_METADATA,
      [handler, controller],
    );

    if (!cacheKey) {
      return next.handle();
    }

    // Generate cache key with user context
    const userId = request.user?.id || 'anonymous';
    const fullCacheKey = this.cacheService.generateKey(
      cacheKey,
      userId,
      request.url,
    );

    // Try to get from cache
    const cachedValue = await this.cacheService.get(fullCacheKey);
    if (cachedValue) {
      return of(cachedValue);
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (data) => {
        await this.cacheService.set(fullCacheKey, data, cacheTTL);
      }),
    );
  }
}

export const Cacheable = (key: string, ttl?: number) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY_METADATA, key, descriptor.value);
    if (ttl) {
      Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value);
    }
    return descriptor;
  };
};