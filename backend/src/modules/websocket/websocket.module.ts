import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppWebSocketGateway } from './websocket.gateway';
import { WebSocketEventService } from './services/websocket-event.service';
import websocketConfig from '../../config/websocket.config';

@Module({
  imports: [
    ConfigModule.forFeature(websocketConfig),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AppWebSocketGateway, WebSocketEventService],
  exports: [AppWebSocketGateway, WebSocketEventService],
})
export class WebSocketModule {}
