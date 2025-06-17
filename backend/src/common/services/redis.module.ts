import { Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { redisStore } from 'cache-manager-redis-store'
import type { RedisClientOptions } from 'redis'
import { RedisService } from './redis.service'

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisConfig: RedisClientOptions = {,
          socket: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
          },
          password: configService.get('REDIS_PASSWORD'),
          database: configService.get('REDIS_DB') || 0,
        }

        return {
          store: redisStore,
          ...redisConfig,
          ttl: 3600, // 1 hour default TTL
        } as Parameters<typeof redisStore>[0]
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  providers: [RedisService],
  exports: [RedisService, CacheModule],
})
export class RedisModule {}
