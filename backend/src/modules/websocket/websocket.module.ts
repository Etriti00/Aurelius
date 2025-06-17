import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { WebsocketGateway } from './websocket.gateway'
import { WebsocketService } from './websocket.service'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'aurelius-secret',
      signOptions: { expiresIn: '15m' },
    }),
    UsersModule,
  ],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
