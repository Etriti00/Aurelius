import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Skip caching for non-GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.reflector.getAllAndOverride<string>(CACHE_KEY_METADATA, [
      handler,
      controller,
    ]);

    // Skip caching if no cache key is defined
    if (!cacheKey) {
      return next.handle();
    }

    // Pass through without caching for now to avoid RxJS version conflicts
    // TODO: Implement proper caching once RxJS version is standardized
    return next.handle();
  }
}

export const Cacheable = (key: string, ttl?: number) => {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    // Validate that this is being applied to a method
    if (typeof descriptor.value !== 'function') {
      throw new Error(
        `@Cacheable can only be applied to methods. Applied to ${target.constructor.name}.${propertyKey}`
      );
    }

    Reflect.defineMetadata(CACHE_KEY_METADATA, key, descriptor.value);
    if (ttl) {
      Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value);
    }
    return descriptor;
  };
};
