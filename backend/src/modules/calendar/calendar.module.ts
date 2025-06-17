import { Module } from '@nestjs/common'
import { CalendarService } from './calendar.service'
import { CalendarController } from './calendar.controller'
import { AiGatewayModule } from '../ai-gateway/ai-gateway.module'
import { WebsocketModule } from '../websocket/websocket.module'

@Module({
  imports: [AiGatewayModule, WebsocketModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
