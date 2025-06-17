import { Module } from '@nestjs/common'
import { EmailService } from './email.service'
import { EmailController } from './email.controller'
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module'
import { WebsocketModule } from '../websocket/websocket.module'

@Module({
  imports: [AiGatewayModule, WebsocketModule],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
