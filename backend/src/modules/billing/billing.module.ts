import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingService } from './billing.service'
import { BillingController } from './billing.controller'
import { PrismaModule } from '../../prisma/prisma.module'
import { RedisModule } from '../../common/services/redis.module'
import { WebsocketModule } from '../websocket/websocket.module'

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, forwardRef(() => WebsocketModule)],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
