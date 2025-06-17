import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common'
import { Observable, of } from 'rxjs'
import { tap } from 'rxjs/operators'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { Reflector } from '@nestjs/core'

export const CACHE_KEY_METADATA = 'cache_key'
export const CACHE_TTL_METADATA = 'cache_ttl'

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler())

    if (!cacheKey) {
      return next.handle()
    }

    const cacheTTL = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler())
    const request = context.switchToHttp().getRequest()
    const userId = request.user?.id
    const finalCacheKey = this.buildCacheKey(cacheKey, userId, request)

    try {
      const cachedResult = await this.cacheManager.get(finalCacheKey)
      if (cachedResult) {
        return of(JSON.parse(cachedResult as string))
      }
    } catch (error) {
      console.warn('Cache read failed:', error)
    }

    return next.handle().pipe(
      tap(async response => {
        try {
          const ttl = cacheTTL || 300
          await this.cacheManager.set(finalCacheKey, JSON.stringify(response), ttl * 1000)
        } catch (error) {
          console.warn('Cache write failed:', error)
        }
      }),
    )
  }

  private buildCacheKey(
    baseKey: string,
    userId?: string,
    request?: Record<string, unknown>,
  ): string {
    const parts = [baseKey]

    if (userId) {
      parts.push(userId)
    }

    if (request?.query && Object.keys(request.query).length > 0) {
      const queryString = new URLSearchParams(request.query as Record<string, string>).toString()
      parts.push(queryString)
    }

    return parts.join(':')
  }
}
