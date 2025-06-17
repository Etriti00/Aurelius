import { Module, forwardRef } from '@nestjs/common'
import { AiGatewayService } from './ai-gateway.service'
import { AiGatewayController } from './ai-gateway.controller'
import { UsersModule } from '../users/users.module'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [UsersModule, forwardRef(() => BillingModule)],
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
