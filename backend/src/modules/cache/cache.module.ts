import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './services/cache.service';
import { LRUCacheService } from './services/lru-cache.service';
import { RedisService } from './services/redis.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        ttl: 3600, // 1 hour default
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService, LRUCacheService, RedisService],
  exports: [CacheService, LRUCacheService, RedisService],
})
export class CacheModule {}