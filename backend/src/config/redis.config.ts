import { ConfigService } from '@nestjs/config'
import { CacheModuleAsyncOptions } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-store'

export const redisConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  useFactory: async (configService: ConfigService) => {
    const store = await redisStore({
      socket: {
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
      },
      password: configService.get<string>('REDIS_PASSWORD'),
      database: configService.get<number>('REDIS_DB', 0),
    })

    return {
      store: () => store,
      ttl: configService.get<number>('CACHE_TTL', 300),
      max: configService.get<number>('CACHE_MAX_ITEMS', 100),
    }
  },
  inject: [ConfigService],
}
