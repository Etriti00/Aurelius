import { Module } from '@nestjs/common';
import { WebSocketGateway as WSGateway } from './websocket.gateway';

@Module({
  providers: [WSGateway],
  exports: [WSGateway],
})
export class WebSocketModule {}