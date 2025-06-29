import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './services/cache.service';
import { LRUCacheService } from './services/lru-cache.service';
import { RedisService } from './services/redis.service';

@Global()
@Module({
  imports: [
    NestCacheModule.register({
      store: 'memory',
      ttl: 3600, // 1 hour default
      max: 1000, // Maximum number of items in cache
    }),
  ],
  providers: [CacheService, LRUCacheService, RedisService],
  exports: [CacheService, LRUCacheService, RedisService],
})
export class CacheModule {}
