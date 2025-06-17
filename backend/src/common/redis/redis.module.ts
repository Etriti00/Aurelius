import { Global, Module } from '@nestjs/common'
import { CacheModule } from '@nestjs/cache-manager'
import { ConfigModule } from '@nestjs/config'
import { redisConfig } from '../../config/redis.config'
import { RedisService } from '../services/redis.service'

@Global()
@Module({
  imports: [ConfigModule, CacheModule.registerAsync(redisConfig)],
  providers: [RedisService],
  exports: [RedisService, CacheModule],
})
export class RedisModule {}
